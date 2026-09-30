package middleware

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("x-token")
		if token == "" {
			// Also accept the standard "Authorization: Bearer <token>" header (Bruno, Swagger, curl).
			if h := c.GetHeader("Authorization"); strings.HasPrefix(h, "Bearer ") {
				token = strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
			}
		}
		if token == "" {
			token = c.Query("token")
		}

		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		verified, err := jwt.Parse(token, func(token *jwt.Token) (any, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil {
			if errors.Is(err, jwt.ErrTokenExpired) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			}
			c.Abort()
			return
		}

		if !verified.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		userId := verified.Claims.(jwt.MapClaims)["userId"].(string)
		c.Set("userId", userId)
		c.Next()
	}
}
