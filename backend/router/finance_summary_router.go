package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
)

func FinanceSummaryRouter(r *gin.RouterGroup) {
	r.GET("/finance-summary", handlers.GetFinanceSummary)
}
