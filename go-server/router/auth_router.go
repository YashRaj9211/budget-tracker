package router

import (
	"github.com/gin-gonic/gin"
	"splitwise-go/handlers"
)

func AuthRouter(r *gin.RouterGroup) {
	r.POST("/users/signup", handlers.CreateUser)
	r.POST("/users/login", handlers.LoginUser)
	r.POST("/users/request-otp", handlers.RequestOTP)
	r.POST("/users/verify-otp", handlers.VerifyOTP)
}
