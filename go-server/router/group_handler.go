package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
)

func GroupRouter(r *gin.RouterGroup) {
	r.POST("/groups/user/:userId", handlers.CreateGroup)
	r.GET("/groups/user/:userId", handlers.GetUserGroups)
	r.GET("/groups/:groupId", handlers.GetGroupExpenses)
	r.PUT("/groups/:groupId/toggle-simplify", handlers.ToggleGroupSimplify)
	r.GET("/groups/:groupId/members", handlers.GetGroupMembers)
	r.POST("/groups/:groupId/members/:userId", handlers.AddGroupMember)
	r.DELETE("/groups/:groupId/members/:userId", handlers.RemoveGroupMember)
	r.DELETE("/groups/:groupId/leave/:userId", handlers.LeaveGroup)
}
