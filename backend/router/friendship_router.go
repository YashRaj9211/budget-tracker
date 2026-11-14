package router

import (
	"github.com/gin-gonic/gin"
	"splitwise-go/handlers"
)

func FriendshipRouter(r *gin.RouterGroup) {
	r.POST("/friendships/send", handlers.SendFriendshipRequest)
	r.POST("/friendships/accept/:friendId", handlers.AcceptFriendship)
	r.POST("/friendships/reject/:friendId", handlers.RejectFriendship)
	r.GET("/friendships", handlers.GetFriendships)
	r.GET("/friends", handlers.GetFriends)
}
