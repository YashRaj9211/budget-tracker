package handlers

import (
	"math/rand"
	"time"
	"fmt"

	"splitwise-go/database"
	"splitwise-go/models"
	"splitwise-go/services"
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

// OTP Handlers

type RequestOTPBody struct {
	Email string `json:"email" binding:"required"`
}

type VerifyOTPBody struct {
	Email string `json:"email" binding:"required"`
	Code  string `json:"code" binding:"required"`
}

func RequestOTP(c *gin.Context) {
	var body RequestOTPBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Check if user exists to determine the email template
	var user models.User
	userExists := true
	if err := database.DB.Where("email = ?", body.Email).First(&user).Error; err != nil {
		userExists = false
	}

	templateName := "otp_email.html"
	subject := "Your Login OTP - Dekhkar"
	
	if !userExists {
		templateName = "signup_verification.html"
		subject = "Verify your email - Dekhkar"
	}

	// Generate a 6-digit OTP
	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	expiresAt := time.Now().Add(10 * time.Minute)

	// Invalidate previous OTPs for this email by deleting them or we can just keep adding (we will delete for simplicity)
	database.DB.Where("email = ?", body.Email).Delete(&models.OTP{})

	otp := models.OTP{
		Email:     body.Email,
		Code:      code,
		ExpiresAt: expiresAt,
	}

	if err := database.DB.Create(&otp).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to create OTP"})
		return
	}

	if err := services.SendOTP(body.Email, code, templateName, subject); err != nil {
		c.JSON(500, gin.H{"error": "Failed to send OTP email"})
		return
	}

	c.JSON(200, gin.H{"message": "OTP sent successfully"})
}

func VerifyOTP(c *gin.Context) {
	var body VerifyOTPBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	var otp models.OTP
	if err := database.DB.Where("email = ? AND code = ?", body.Email, body.Code).First(&otp).Error; err != nil {
		c.JSON(400, gin.H{"error": "Invalid OTP"})
		return
	}

	if time.Now().After(otp.ExpiresAt) {
		c.JSON(400, gin.H{"error": "OTP expired"})
		return
	}

	// OTP is valid. Now find the user or login.
	var user models.User
	if err := database.DB.Where("email = ?", body.Email).First(&user).Error; err != nil {
		// If you want OTP to also sign up a user, you could create a minimal user here, 
		// but since we need a name/username, we might just return a message saying "User not found, please sign up".
		c.JSON(404, gin.H{"error": "User not found. Please sign up first."})
		return
	}

	// Delete the OTP after successful verification
	database.DB.Delete(&otp)

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

