package router

import (
	"splitwise-go/handlers"

	"github.com/gin-gonic/gin"
)

func GroupRouter(r *gin.RouterGroup) {
	r.POST("/groups", handlers.CreateGroup)
	r.GET("/groups", handlers.GetUserGroups)
	r.GET("/split/overview", handlers.GetSplitOverview)
	r.GET("/groups/:groupId", handlers.GetGroupExpenses)
	r.DELETE("/groups/:groupId", handlers.DeleteGroup)
	r.PUT("/groups/:groupId/toggle-simplify", handlers.ToggleGroupSimplify)
	r.GET("/groups/:groupId/members", handlers.GetGroupMembers)
	r.POST("/groups/:groupId/members/:userId", handlers.AddGroupMember)
	r.DELETE("/groups/:groupId/members/:userId", handlers.RemoveGroupMember)
	r.DELETE("/groups/:groupId/leave", handlers.LeaveGroup)
}
