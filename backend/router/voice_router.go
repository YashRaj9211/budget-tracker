package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
)

func VoiceRouter(r *gin.RouterGroup) {
	r.POST("/voice/parse", handlers.ParseVoiceTransactions)
}
