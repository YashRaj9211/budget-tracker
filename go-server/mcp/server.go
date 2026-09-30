package mcp

import (
	"os"

	"github.com/gin-gonic/gin"
	"github.com/mark3labs/mcp-go/server"
)

var (
	McpServer *server.MCPServer
	SseServer *server.SSEServer
)

func SetupMCPServer(r *gin.RouterGroup) {
	// Initialize MCP Server
	McpServer = server.NewMCPServer("divvit-mcp", "1.0.0")

	// Register tools
	RegisterTools(McpServer)

	// In a real app, this should be the full external URL to the /mcp/message endpoint
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		port := os.Getenv("PORT")
		if port == "" {
			port = "3001"
		}
		baseURL = "http://localhost:" + port
	}

	// Create SSE Server linking to the message endpoint
	SseServer = server.NewSSEServer(McpServer, server.WithBaseURL(baseURL+"/api/_private/v1/mcp"))

	// We create a subgroup for MCP
	mcpGroup := r.Group("/mcp")
	{
		mcpGroup.GET("/sse", gin.WrapH(SseServer.SSEHandler()))
		mcpGroup.POST("/message", gin.WrapH(SseServer.MessageHandler()))
	}
}
