package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)


func GenerateToken(userId string) string {
	claims := jwt.MapClaims{
		"userId": userId,
		"exp":    jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		"iat":    jwt.NewNumericDate(time.Now()),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	//signing token
	tokenSigned, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))

	if err != nil {
		return ""
	}

	return tokenSigned
}
