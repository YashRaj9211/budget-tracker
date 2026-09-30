package router

import (
	"splitwise-go/handlers"
	"github.com/gin-gonic/gin"
)

func FriendshipRouter(r *gin.RouterGroup) {
	r.POST("/friendships/send", handlers.SendFriendshipRequest)
	r.POST("/friendships/accept/:friendId", handlers.AcceptFriendship)
	r.POST("/friendships/reject/:friendId", handlers.RejectFriendship)
	r.GET("/friendships", handlers.GetFriendships)
	r.GET("/friends", handlers.GetFriends)
}
