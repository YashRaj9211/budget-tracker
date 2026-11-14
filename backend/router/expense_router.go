package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
	// "splitwise-go/middleware"
)

func ExpenseRouter(r *gin.RouterGroup) {
	// r.Use(middleware.AuthMiddleware())
	r.GET("/categories", handlers.GetCategories)
	r.POST("/expenses", handlers.CreateExpense)
	r.GET("/expenses", handlers.GetUserExpenses)
	r.PUT("/expenses/:expenseId", handlers.UpdateExpense)
	r.PUT("/expenses/settle/:splitId", handlers.SettleExpense)
	r.DELETE("/expenses/:expenseId", handlers.DeleteExpense)
}
