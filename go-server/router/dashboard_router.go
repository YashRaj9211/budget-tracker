package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
)

func DashboardRouter(r *gin.RouterGroup) {
	r.GET("/dashboard", handlers.GetExpensesSummary)
	r.GET("/dashboard/expenses", handlers.GetDailyExpenseBreakdown)
	r.GET("/dashboard/friends", handlers.GetFriendsBalance)
	r.GET("/dashboard/graph", handlers.GetDailySpendOverview)
	r.GET("/dashboard/analytics", handlers.GetAnalytics)
}
