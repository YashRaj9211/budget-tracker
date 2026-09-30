package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
)

func DashboardRoutes(r *gin.RouterGroup) {
	r.GET("/dashboard/:userId", handlers.GetExpensesSummary)
	r.GET("/dashboard/:userId/expenses", handlers.GetDailyExpenseBreakdown)
	r.GET("/dashboard/:userId/friends", handlers.GetFriendsBalance)
	r.GET("/dashboard/graph/:userId", handlers.GetDailySpendOverview)
}
