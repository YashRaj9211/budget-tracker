// Command migrate applies or rolls back the versioned SQL migrations.
//
//	go run ./cmd/migrate                      # apply all pending migrations
//	go run ./cmd/migrate -direction down      # roll back the latest migration
package main

import (
	"flag"
	"log"

	"splitwise-go/database"

	"github.com/joho/godotenv"
)

func main() {
	direction := flag.String("direction", "up", "up or down (down rolls back one migration)")
	flag.Parse()

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}
	database.Connect()

	sqlDB, err := database.DB.DB()
	if err != nil {
		log.Fatalf("Failed to get sql.DB: %v", err)
	}
	manager := database.DefaultMigrationManager(sqlDB)

	switch *direction {
	case "up":
		if err := manager.Up(); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
		log.Println("Migrations are up to date.")
	case "down":
		rolledBack, err := manager.Down()
		if err != nil {
			log.Fatalf("Rollback failed: %v", err)
		}
		if !rolledBack {
			log.Println("Nothing to roll back.")
		}
	default:
		log.Fatalf("Unknown -direction %q (use up or down)", *direction)
	}
}
