package main

import (
	"context"
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"

	"splitwise-go/database"
	"splitwise-go/middleware"
	"splitwise-go/router"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	ginadapter "github.com/awslabs/aws-lambda-go-api-proxy/gin"
	"github.com/gin-gonic/gin"
)

var ginLambda *ginadapter.GinLambda

func init() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize Router
	r := gin.Default()

	// Enable CORS
	r.Use(middleware.CORSMiddleware())

	// Connect Database
	database.Connect()

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	// Adapter for Lambda
	ginLambda = ginadapter.New(r)
}

// Handler is the entry point for AWS Lambda
func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return ginLambda.ProxyWithContext(ctx, req)
}

func main() {
	// If running locally (not in Lambda), start the server
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	if os.Getenv("ENV") == "local" {
		r := gin.Default()

		// Enable CORS
		r.Use(middleware.CORSMiddleware())

		// Re-register routes for local (cleaner way is to extract setupRouter function)
		database.Connect()
		go func() {
			for {
				time.Sleep(time.Duration(50+rand.Intn(11)) * time.Second)
				http.Get("https://divvit.onrender.com/ping")
			}
		}()

		r.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "pong"})
		})

		router.DefaultRouter(&r.RouterGroup)

		port := os.Getenv("PORT")
		if port == "" {
			port = "3001"
		}

		log.Printf("Listening on port %s", port)
		r.Run(":" + port)
	} else {
		// Start Lambda
		lambda.Start(Handler)
	}
}
