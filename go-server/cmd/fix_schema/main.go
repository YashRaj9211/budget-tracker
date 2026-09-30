// Command fix_schema is deprecated. Schema changes now live in go-server/migrations/*.sql
// and are applied with `go run ./cmd/migrate`. This command just does the same thing.
package main

import (
	"log"

	"splitwise-go/database"

	"github.com/joho/godotenv"
)

func main() {
	log.Println("cmd/fix_schema is deprecated; running versioned migrations (same as cmd/migrate).")
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}
	database.Connect()

	sqlDB, err := database.DB.DB()
	if err != nil {
		log.Fatalf("Failed to get sql.DB: %v", err)
	}
	if err := database.DefaultMigrationManager(sqlDB).Up(); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
	log.Println("Migrations are up to date.")
}
