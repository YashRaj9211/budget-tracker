package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Small + fast model. Override with NVIDIA_MODEL in .env if needed.
const defaultVoiceModel = "nvidia/nemotron-3.5-bolt-e4b"
const nvidiaChatURL = "https://integrate.api.nvidia.com/v1/chat/completions"

// One shared client so TCP/TLS connections are reused (faster repeat calls).
var voiceHTTPClient = &http.Client{Timeout: 15 * time.Second}

type voiceParseRequest struct {
	Text       string   `json:"text" binding:"required"`
	Categories []string `json:"categories"`
	Accounts   []string `json:"accounts"`
	Today      string   `json:"today"` // YYYY-MM-DD from the user's device
}

type voiceTransaction struct {
	Type        string  `json:"type"`
	Amount      float64 `json:"amount"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Account     string  `json:"account"`
	Date        string  `json:"date"`
}

// ParseVoiceTransactions turns a spoken sentence into one or more transactions.
// POST /api/_private/v1/voice/parse
func ParseVoiceTransactions(c *gin.Context) {
	if _, ok := requireUserID(c); !ok {
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 32<<10)
	var req voiceParseRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Text) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "text is required"})
		return
	}
	if r := []rune(req.Text); len(r) > 1000 {
		req.Text = string(r[:1000])
	}
	if len(req.Categories) > 50 {
		req.Categories = req.Categories[:50]
	}
	if len(req.Accounts) > 50 {
		req.Accounts = req.Accounts[:50]
	}
	if _, err := time.Parse("2006-01-02", req.Today); err != nil {
		req.Today = ""
	}

	apiKey := os.Getenv("NVIDIA_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NVIDIA_API_KEY is not set on the server"})
		return
	}
	model := os.Getenv("NVIDIA_MODEL")
	if model == "" {
		model = defaultVoiceModel
	}
	if req.Today == "" {
		req.Today = time.Now().Format("2006-01-02")
	}
	if len(req.Categories) == 0 {
		req.Categories = []string{"Food", "Travel", "Shopping", "Bills", "Other"}
	}
	if len(req.Accounts) == 0 {
		req.Accounts = []string{"Cash", "GPay", "Card"}
	}

	payload := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": voiceSystemPrompt(req)},
			{"role": "user", "content": req.Text},
		},
		"temperature": 0,
		"max_tokens":  600,
		"stream":      false,
		// Thinking OFF = much faster replies.
		"chat_template_kwargs": map[string]any{"enable_thinking": false},
	}
	body, _ := json.Marshal(payload)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	httpReq, _ := http.NewRequestWithContext(ctx, http.MethodPost, nvidiaChatURL, bytes.NewReader(body))
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	resp, err := voiceHTTPClient.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI service unreachable"})
		return
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[voice] NVIDIA error %d: %s\n", resp.StatusCode, string(raw))
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI service error"})
		return
	}

	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || len(out.Choices) == 0 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Bad AI response"})
		return
	}

	txs, err := extractTransactions(out.Choices[0].Message.Content)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Could not understand the transactions"})
		return
	}

	// Clean up: drop zero amounts, fill defaults.
	clean := make([]voiceTransaction, 0, len(txs))
	for _, t := range txs {
		if t.Amount <= 0 {
			continue
		}
		if t.Type != "income" {
			t.Type = "expense"
		}
		if t.Date == "" {
			t.Date = req.Today
		}
		if t.Category == "" {
			t.Category = "Other"
		}
		if t.Account == "" {
			t.Account = req.Accounts[0]
		}
		if strings.TrimSpace(t.Description) == "" {
			t.Description = t.Category
		}
		clean = append(clean, t)
	}

	c.JSON(http.StatusOK, gin.H{"transactions": clean})
}

func voiceSystemPrompt(req voiceParseRequest) string {
	return fmt.Sprintf(`You extract personal finance transactions (India, rupees) from speech.
Input may be English, Hindi or Hinglish and may contain MANY transactions. Make one item per amount.
Today is %s. Resolve "yesterday"/"kal"/"parso" relative to today.
Categories (pick the closest, else "Other"): %s
Accounts (pick if mentioned, else "%s"): %s
Return ONLY a JSON array, no markdown, no extra text. Each item:
{"type":"expense"|"income","amount":number,"description":"short title","category":string,"account":string,"date":"YYYY-MM-DD"}
Example input: "20rs snacks 400 for dinner and 10 rs travel"
Example output: [{"type":"expense","amount":20,"description":"Snacks","category":"Food","account":"Cash","date":"%s"},{"type":"expense","amount":400,"description":"Dinner","category":"Food","account":"Cash","date":"%s"},{"type":"expense","amount":10,"description":"Travel","category":"Travel","account":"Cash","date":"%s"}]`,
		req.Today, strings.Join(req.Categories, ", "), req.Accounts[0], strings.Join(req.Accounts, ", "),
		req.Today, req.Today, req.Today)
}

// extractTransactions finds the JSON array in the model reply (it sometimes adds text or ``` fences).
func extractTransactions(content string) ([]voiceTransaction, error) {
	content = strings.TrimSpace(content)
	// Strip any <think>...</think> block just in case.
	if i := strings.Index(content, "</think>"); i >= 0 {
		content = content[i+len("</think>"):]
	}
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]")
	if start >= 0 && end > start {
		var arr []voiceTransaction
		if err := json.Unmarshal([]byte(content[start:end+1]), &arr); err == nil {
			return arr, nil
		}
	}
	// Fallback: model returned a single object or {"transactions":[...]}
	start = strings.Index(content, "{")
	end = strings.LastIndex(content, "}")
	if start >= 0 && end > start {
		obj := content[start : end+1]
		var wrapped struct {
			Transactions []voiceTransaction `json:"transactions"`
		}
		if err := json.Unmarshal([]byte(obj), &wrapped); err == nil && len(wrapped.Transactions) > 0 {
			return wrapped.Transactions, nil
		}
		var one voiceTransaction
		if err := json.Unmarshal([]byte(obj), &one); err == nil {
			return []voiceTransaction{one}, nil
		}
	}
	return nil, fmt.Errorf("no JSON found")
}
