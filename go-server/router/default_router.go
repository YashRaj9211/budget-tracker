package router

import (
	"splitwise-go/handlers"
	"splitwise-go/mcp"
	"splitwise-go/middleware"

	"github.com/gin-gonic/gin"
)

func DefaultRouter(r *gin.RouterGroup) {
	//public routes
	public := r.Group("/api/_public/v1")
	AuthRouter(public)

	//private routes
	private := r.Group("/api/_private/v1")
	private.Use(middleware.AuthMiddleware())

	mcp.SetupMCPServer(private)
	private.GET("/ws", handlers.WsHandler)

	ExpenseRouter(private)
	DashboardRouter(private)
	GroupRouter(private)
	FriendshipRouter(private)
	BudgetRouter(private)
}
