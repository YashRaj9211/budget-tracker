package router

import (
	"github.com/gin-gonic/gin"
)

func UserRouter(r *gin.RouterGroup) {
	// Legacy /users/friends/:userId route removed.
	// Use /friends (auth-based) from FriendshipRouter instead.
	_ = r
}
