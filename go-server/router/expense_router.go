package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
	// "splitwise-go/middleware"
)

func ExpenseRouter(r *gin.RouterGroup) {
	// r.Use(middleware.AuthMiddleware())
	r.POST("/expenses/user/:userId", handlers.CreateExpense)
	r.GET("/expenses/user/:userId", handlers.GetUserExpenses)
	r.PUT("/expenses/:expenseId", handlers.UpdateExpense)
	r.PUT("/expenses/settle/:splitId/:userId", handlers.SettleExpense)
	r.DELETE("/expenses/:expenseId", handlers.DeleteExpense)
}
