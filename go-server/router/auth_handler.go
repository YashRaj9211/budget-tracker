package router

import (
	"splitwise-go/handlers"
	"github.com/gin-gonic/gin"
)

func AuthRouter(r *gin.RouterGroup) {
	r.POST("/users/signup", handlers.CreateUser)
	r.POST("/users/login", handlers.LoginUser)
}
