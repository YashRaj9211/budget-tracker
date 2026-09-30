package handlers

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"splitwise-go/database"

	"github.com/gin-gonic/gin"
)

// MonthStat is one bar in the monthly trend chart. All numbers are for the signed-in user.
type MonthStat struct {
	Month    string  `json:"month"`    // "2026-09"
	Label    string  `json:"label"`    // "Sep"
	Personal float64 `json:"personal"` // things I paid for myself
	Shared   float64 `json:"shared"`   // my share of split expenses
	Lent     float64 `json:"lent"`     // other people's shares of what I paid
	Income   float64 `json:"income"`
	Spent    float64 `json:"spent"` // personal + shared
}

type CategoryStat struct {
	CategoryID string  `json:"categoryId"`
	Name       string  `json:"name"`
	Color      string  `json:"color"`
	Amount     float64 `json:"amount"`
}

type GroupStat struct {
	GroupID string  `json:"groupId"`
	Name    string  `json:"name"`
	Amount  float64 `json:"amount"` // my share of the group's expenses
	Total   float64 `json:"total"`  // everything spent in the group
}

type monthRow struct {
	Month  string
	Amount float64
}

// GetAnalytics returns chart-ready numbers for the last N months (default 6, max 12).
//
// "Spent" means: expenses I paid for myself (PERSONAL) + my share of SPLIT expenses.
// Settle-up payments are never counted as spending.
func GetAnalytics(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	months := 6
	if v := c.Query("months"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 12 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "months must be between 1 and 12"})
			return
		}
		months = n
	}

	now := time.Now().UTC()
	thisMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	start := thisMonth.AddDate(0, -(months - 1), 0)
	db := database.DB

	// Stat 1..4: one query each, grouped by month.
	monthly := func(query string, args ...any) (map[string]float64, error) {
		var rows []monthRow
		if err := db.Raw(query, args...).Scan(&rows).Error; err != nil {
			return nil, err
		}
		out := make(map[string]float64, len(rows))
		for _, r := range rows {
			out[r.Month] = r.Amount
		}
		return out, nil
	}

	personal, err := monthly(`
		SELECT to_char(expense_date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS amount
		FROM expenses
		WHERE user_id = ? AND type = 'PERSONAL' AND deleted_at IS NULL AND expense_date >= ?
		GROUP BY 1`, userID, start)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	income, err := monthly(`
		SELECT to_char(expense_date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0) AS amount
		FROM expenses
		WHERE user_id = ? AND type = 'INCOME' AND deleted_at IS NULL AND expense_date >= ?
		GROUP BY 1`, userID, start)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	shared, err := monthly(`
		SELECT to_char(e.expense_date, 'YYYY-MM') AS month, COALESCE(SUM(s.amount), 0) AS amount
		FROM expense_splits s JOIN expenses e ON e.id = s.expense_id
		WHERE s.user_id = ? AND e.is_settlement = false AND e.deleted_at IS NULL AND e.expense_date >= ?
		GROUP BY 1`, userID, start)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	lent, err := monthly(`
		SELECT to_char(e.expense_date, 'YYYY-MM') AS month, COALESCE(SUM(s.amount), 0) AS amount
		FROM expense_splits s JOIN expenses e ON e.id = s.expense_id
		WHERE e.user_id = ? AND s.user_id <> ? AND e.is_settlement = false AND e.deleted_at IS NULL AND e.expense_date >= ?
		GROUP BY 1`, userID, userID, start)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Build one entry per month, including months with no data (so the chart has no gaps).
	trend := make([]MonthStat, 0, months)
	for i := 0; i < months; i++ {
		m := start.AddDate(0, i, 0)
		key := m.Format("2006-01")
		ms := MonthStat{
			Month:    key,
			Label:    m.Format("Jan"),
			Personal: round2(personal[key]),
			Shared:   round2(shared[key]),
			Lent:     round2(lent[key]),
			Income:   round2(income[key]),
		}
		ms.Spent = round2(ms.Personal + ms.Shared)
		trend = append(trend, ms)
	}

	// Spending by category over the whole window: personal expenses + my shares of split ones.
	var cats []CategoryStat
	if err := db.Raw(`
		SELECT COALESCE(c.id, '') AS category_id,
		       COALESCE(c.name, 'Uncategorised') AS name,
		       COALESCE(c.color, '') AS color,
		       SUM(x.amount) AS amount
		FROM (
			SELECT category_id, amount FROM expenses
			WHERE user_id = ? AND type = 'PERSONAL' AND deleted_at IS NULL AND expense_date >= ?
			UNION ALL
			SELECT e.category_id, s.amount
			FROM expense_splits s JOIN expenses e ON e.id = s.expense_id
			WHERE s.user_id = ? AND e.is_settlement = false AND e.deleted_at IS NULL AND e.expense_date >= ?
		) x
		LEFT JOIN categories c ON c.id = x.category_id
		GROUP BY 1, 2, 3
		ORDER BY amount DESC`, userID, start, userID, start).Scan(&cats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range cats {
		cats[i].Amount = round2(cats[i].Amount)
	}
	if cats == nil {
		cats = []CategoryStat{}
	}

	// Spending by group (only groups I belong to).
	var groups []GroupStat
	if err := db.Raw(`
		SELECT g.id AS group_id, g.name AS name,
		       COALESCE(SUM(CASE WHEN s.user_id = ? THEN s.amount ELSE 0 END), 0) AS amount,
		       COALESCE(SUM(s.amount), 0) AS total
		FROM groups g
		JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
		JOIN expenses e ON e.group_id = g.id AND e.is_settlement = false AND e.deleted_at IS NULL AND e.expense_date >= ?
		JOIN expense_splits s ON s.expense_id = e.id
		GROUP BY g.id, g.name
		ORDER BY amount DESC`, userID, userID, start).Scan(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for i := range groups {
		groups[i].Amount = round2(groups[i].Amount)
		groups[i].Total = round2(groups[i].Total)
	}
	sort.SliceStable(groups, func(i, j int) bool { return groups[i].Amount > groups[j].Amount })
	if groups == nil {
		groups = []GroupStat{}
	}

	// Quick comparison for the headline cards.
	cur := trend[len(trend)-1]
	var prev MonthStat
	if len(trend) > 1 {
		prev = trend[len(trend)-2]
	}

	c.JSON(http.StatusOK, gin.H{
		"months":     months,
		"trend":      trend,
		"categories": cats,
		"groups":     groups,
		"comparison": gin.H{
			"thisMonth":     cur.Spent,
			"lastMonth":     prev.Spent,
			"changePercent": percentChange(cur.Spent, prev.Spent),
		},
	})
}

func round2(v float64) float64 {
	if v < 0 {
		return -float64(int64(-v*100+0.5)) / 100
	}
	return float64(int64(v*100+0.5)) / 100
}

// percentChange returns null-safe % change; 0 when there is nothing to compare with.
func percentChange(cur, prev float64) float64 {
	if prev <= 0 {
		return 0
	}
	return round2((cur - prev) / prev * 100)
}
