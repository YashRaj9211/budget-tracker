package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
)

func SavingsRouter(r *gin.RouterGroup) {
	r.GET("/savings-accounts", handlers.GetSavingsAccounts)
	r.POST("/savings-accounts", handlers.CreateSavingsAccount)
	r.GET("/savings-accounts/:id", handlers.GetSavingsAccount)
	r.PUT("/savings-accounts/:id", handlers.UpdateSavingsAccount)
	r.DELETE("/savings-accounts/:id", handlers.DeleteSavingsAccount)

	r.GET("/savings-accounts/:id/transactions", handlers.GetSavingsTransactions)
	r.POST("/savings-accounts/:id/transactions", handlers.CreateSavingsTransaction)
	r.DELETE("/savings-accounts/:id/transactions/:txnId", handlers.DeleteSavingsTransaction)
}
