package handlers

import (
	"net/http"
	"splitwise-go/websocket"

	"github.com/gin-gonic/gin"
)

func WsHandler(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	websocket.ServeWs(c.Writer, c.Request, userId.(string))
}
