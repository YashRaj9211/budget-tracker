package handlers

import (
	"splitwise-go/database"
	"splitwise-go/models"
	"splitwise-go/utils"

	"github.com/gin-gonic/gin"
)

type SignUpBody struct {
	Email     string  `json:"email" binding:"required"`
	Name      string  `json:"name" binding:"required"`
	Username  string  `json:"username" binding:"required"`
	Password  string  `json:"password" binding:"required"`
	Phone     *string `json:"phone,omitempty" binding:"omitempty"`
	AvatarURL *string `json:"avatarUrl,omitempty" binding:"omitempty"`
}

type LoginBody struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func CreateUser(c *gin.Context) {
	var body SignUpBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	isExist := models.User{}
	if err := database.DB.Where("email = ?", body.Email).First(&isExist).Error; err == nil {
		c.JSON(400, gin.H{"error": "User already exists"})
		return
	}

	hashedPassword, err := utils.GeneratePasswordHash(body.Password)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	user := models.User{
		Email:     body.Email,
		Name:      body.Name,
		Username:  body.Username,
		Password:  hashedPassword,
		Phone:     body.Phone,
		AvatarURL: body.AvatarURL,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, user)
}

func LoginUser(c *gin.Context) {
	var body LoginBody

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	user := models.User{}
	if err := database.DB.Where("email = ?", body.Email).First(&user).Error; err != nil {
		c.JSON(400, gin.H{"error": "Invalid email or password"})
		return
	}

	if err := utils.ComparePasswordHash(user.Password, body.Password); err != nil {
		c.JSON(400, gin.H{"error": "Invalid email or password"})
		return
	}

	token := utils.GenerateToken(user.ID)
	c.JSON(200, gin.H{
		"user": gin.H{
			"id":        user.ID,
			"email":     user.Email,
			"name":      user.Name,
			"username":  user.Username,
			"phone":     user.Phone,
			"avatarUrl": user.AvatarURL,
		},
		"token": token,
	})
}
