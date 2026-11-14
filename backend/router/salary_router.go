package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
)

func SalaryRouter(r *gin.RouterGroup) {
	r.GET("/salary", handlers.GetSalaryHistory)
	r.GET("/salary/active", handlers.GetActiveSalary)
	r.POST("/salary", handlers.CreateSalary)
	r.PUT("/salary/:id", handlers.UpdateSalary)
	r.DELETE("/salary/:id", handlers.DeleteSalary)
}
