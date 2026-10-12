package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
)

func FinanceOverviewRouter(r *gin.RouterGroup) {
	r.GET("/finance/overview", handlers.GetFinanceOverview)
}
