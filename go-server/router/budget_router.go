package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
)

func BudgetRouter(r *gin.RouterGroup) {
	r.GET("/budgets", handlers.GetBudgets)
	r.POST("/budgets", handlers.CreateBudget)
	r.PUT("/budgets/:budgetId", handlers.UpdateBudget)
	r.DELETE("/budgets/:budgetId", handlers.DeleteBudget)
}
