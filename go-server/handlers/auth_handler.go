package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"splitwise-go/database"
	"splitwise-go/models"
	"splitwise-go/services"
	"splitwise-go/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type SignUpBody struct {
	Email     string  `json:"email" binding:"required"`
	Name      string  `json:"name" binding:"required"`
	Username  string  `json:"username" binding:"required"`
	Password  string  `json:"password" binding:"required"`
	Phone     *string `json:"phone,omitempty" binding:"omitempty"`
	AvatarURL *string `json:"avatarUrl,omitempty" binding:"omitempty"`
	Code      string  `json:"code" binding:"required"`
}

type RequestSignupOTPBody struct {
	Email    string `json:"email" binding:"required"`
	Username string `json:"username" binding:"required"`
}

func RequestSignupOTP(c *gin.Context) {
	var body RequestSignupOTPBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Email and username are required"})
		return
	}

	trimmedEmail := strings.TrimSpace(strings.ToLower(body.Email))
	trimmedUsername := strings.TrimSpace(strings.ToLower(body.Username))

	if trimmedEmail == "" || !strings.Contains(trimmedEmail, "@") {
		c.JSON(400, gin.H{"error": "Please provide a valid email address"})
		return
	}

	if trimmedUsername == "" {
		c.JSON(400, gin.H{"error": "Please provide a valid username"})
		return
	}

	// 1. Check if email already registered
	var existingUser models.User
	if err := database.DB.Where("LOWER(email) = ?", trimmedEmail).First(&existingUser).Error; err == nil {
		c.JSON(400, gin.H{"error": "An account with this email already exists. Please sign in."})
		return
	}

	// 2. Check if username is already taken
	if err := database.DB.Where("LOWER(username) = ?", trimmedUsername).First(&existingUser).Error; err == nil {
		c.JSON(400, gin.H{"error": "This username is already taken. Please choose another."})
		return
	}

	// 3. Generate a 6-digit OTP
	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	expiresAt := time.Now().Add(10 * time.Minute)

	// Invalidate previous OTPs for this email by deleting them
	database.DB.Where("LOWER(email) = ?", trimmedEmail).Delete(&models.OTP{})

	otp := models.OTP{
		Email:     trimmedEmail,
		Code:      code,
		ExpiresAt: expiresAt,
	}

	if err := database.DB.Create(&otp).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to create verification OTP"})
		return
	}

	// 4. Send email with signup_verification.html template
	if err := services.SendOTP(trimmedEmail, code, "signup_verification.html", "Your access code for Divvit Budget"); err != nil {
		c.JSON(500, gin.H{"error": "Failed to send verification email. Please check your email address."})
		return
	}

	c.JSON(200, gin.H{"message": "Verification OTP sent successfully"})
}

func CreateUser(c *gin.Context) {
	var body SignUpBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	trimmedEmail := strings.TrimSpace(strings.ToLower(body.Email))
	trimmedUsername := strings.TrimSpace(strings.ToLower(body.Username))
	trimmedCode := strings.TrimSpace(body.Code)

	if trimmedCode == "" {
		c.JSON(400, gin.H{"error": "Verification code is required"})
		return
	}

	// Verify OTP
	var otp models.OTP
	if err := database.DB.Where("LOWER(email) = ? AND code = ?", trimmedEmail, trimmedCode).First(&otp).Error; err != nil {
		c.JSON(400, gin.H{"error": "Invalid verification code. Please check your email and try again."})
		return
	}

	if time.Now().After(otp.ExpiresAt) {
		c.JSON(400, gin.H{"error": "Verification code has expired. Please request a new code."})
		return
	}

	// Check if user already exists
	var isExist models.User
	if err := database.DB.Where("LOWER(email) = ?", trimmedEmail).First(&isExist).Error; err == nil {
		c.JSON(400, gin.H{"error": "An account with this email already exists"})
		return
	}

	if err := database.DB.Where("LOWER(username) = ?", trimmedUsername).First(&isExist).Error; err == nil {
		c.JSON(400, gin.H{"error": "Username is already taken"})
		return
	}

	if len(body.Password) < 6 {
		c.JSON(400, gin.H{"error": "Password must be at least 6 characters"})
		return
	}

	hashedPassword, err := utils.GeneratePasswordHash(body.Password)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	user := models.User{
		Email:     trimmedEmail,
		Name:      strings.TrimSpace(body.Name),
		Username:  trimmedUsername,
		Password:  hashedPassword,
		Phone:     body.Phone,
		AvatarURL: body.AvatarURL,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Delete used OTP
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

type LoginBody struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func LoginUser(c *gin.Context) {
	var body LoginBody

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	trimmedEmail := strings.TrimSpace(strings.ToLower(body.Email))

	user := models.User{}
	if err := database.DB.Where("LOWER(email) = ?", trimmedEmail).First(&user).Error; err != nil {
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

	trimmedEmail := strings.TrimSpace(strings.ToLower(body.Email))

	// Check if user exists
	var user models.User
	if err := database.DB.Where("LOWER(email) = ?", trimmedEmail).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "No account found with this email. Please sign up first."})
		return
	}

	templateName := "otp_email.html"
	subject := "Your access code for Divvit Budget"

	// Generate a 6-digit OTP
	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	expiresAt := time.Now().Add(10 * time.Minute)

	// Invalidate previous OTPs for this email by deleting them
	database.DB.Where("LOWER(email) = ?", trimmedEmail).Delete(&models.OTP{})

	otp := models.OTP{
		Email:     trimmedEmail,
		Code:      code,
		ExpiresAt: expiresAt,
	}

	if err := database.DB.Create(&otp).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to create OTP"})
		return
	}

	if err := services.SendOTP(trimmedEmail, code, templateName, subject); err != nil {
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

	trimmedEmail := strings.TrimSpace(strings.ToLower(body.Email))
	trimmedCode := strings.TrimSpace(body.Code)

	var otp models.OTP
	if err := database.DB.Where("LOWER(email) = ? AND code = ?", trimmedEmail, trimmedCode).First(&otp).Error; err != nil {
		c.JSON(400, gin.H{"error": "Invalid OTP"})
		return
	}

	if time.Now().After(otp.ExpiresAt) {
		c.JSON(400, gin.H{"error": "OTP expired"})
		return
	}

	// OTP is valid. Find user
	var user models.User
	if err := database.DB.Where("LOWER(email) = ?", trimmedEmail).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "User account not found. Please sign up."})
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

type RefreshTokenBody struct {
	Token string `json:"token"`
}

// RefreshToken allows clients with a valid or recently expired (within 30 days) JWT to seamlessly renew their session.
func RefreshToken(c *gin.Context) {
	var body RefreshTokenBody
	_ = c.ShouldBindJSON(&body)

	tokenStr := body.Token
	if tokenStr == "" {
		tokenStr = c.GetHeader("x-token")
	}
	if tokenStr == "" {
		if h := c.GetHeader("Authorization"); strings.HasPrefix(h, "Bearer ") {
			tokenStr = strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
		}
	}

	if tokenStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required for refresh"})
		return
	}

	parser := jwt.NewParser(jwt.WithoutClaimsValidation())
	var claims jwt.MapClaims
	parsed, err := parser.ParseWithClaims(tokenStr, &claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	if err != nil || !parsed.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token signature"})
		return
	}

	userIdVal, ok := claims["userId"]
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		return
	}
	userId, ok := userIdVal.(string)
	if !ok || userId == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid userId in token"})
		return
	}

	// Allow refresh up to 30 days after expiration
	if expVal, ok := claims["exp"]; ok {
		if expFloat, ok := expVal.(float64); ok {
			expTime := time.Unix(int64(expFloat), 0)
			if time.Since(expTime) > 30*24*time.Hour {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Session expired beyond renewal window"})
				return
			}
		}
	}

	// Verify user still exists in DB
	var user models.User
	if err := database.DB.Where("id = ?", userId).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User account no longer exists"})
		return
	}

	// Issue a fresh 30-day token
	newToken := utils.GenerateToken(user.ID)
	c.JSON(http.StatusOK, gin.H{
		"token": newToken,
		"user": gin.H{
			"id":        user.ID,
			"email":     user.Email,
			"name":      user.Name,
			"username":  user.Username,
			"phone":     user.Phone,
			"avatarUrl": user.AvatarURL,
		},
	})
}

