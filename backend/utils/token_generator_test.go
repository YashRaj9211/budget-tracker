package utils

import (
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestGenerateToken(t *testing.T) {
	secret := "test-secret-key-1234567890"
	os.Setenv("JWT_SECRET", secret)
	defer os.Unsetenv("JWT_SECRET")

	userId := "user-abc-123"
	tokenStr := GenerateToken(userId)
	if tokenStr == "" {
		t.Fatal("expected non-empty token")
	}

	parsed, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil || !parsed.Valid {
		t.Fatalf("failed to parse generated token: %v", err)
	}

	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		t.Fatal("expected MapClaims")
	}

	if claims["userId"] != userId {
		t.Errorf("expected userId %s, got %v", userId, claims["userId"])
	}

	expFloat, ok := claims["exp"].(float64)
	if !ok {
		t.Fatal("expected exp claim")
	}

	expTime := time.Unix(int64(expFloat), 0)
	// Expiration should be roughly 30 days in the future (at least 29 days)
	minExp := time.Now().Add(29 * 24 * time.Hour)
	if expTime.Before(minExp) {
		t.Errorf("expected expiration at least 29 days out, got %v", expTime)
	}
}

func TestExpiredTokenParsingWithOption(t *testing.T) {
	secret := "test-secret"
	claims := jwt.MapClaims{
		"userId": "user-expired",
		"exp":    jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)), // 1 hour ago
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	parser := jwt.NewParser(jwt.WithoutClaimsValidation())
	var parsedClaims jwt.MapClaims
	parsed, err := parser.ParseWithClaims(tokenStr, &parsedClaims, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil || !parsed.Valid {
		t.Fatalf("expected valid token with WithoutClaimsValidation: %v", err)
	}
	if parsedClaims["userId"] != "user-expired" {
		t.Fatalf("expected user-expired, got %v", parsedClaims["userId"])
	}
}
