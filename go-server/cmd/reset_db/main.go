// Command reset_db DELETES ALL DATA: it rolls back every migration, then re-applies them.
//
//	go run ./cmd/reset_db -yes
package main

import (
	"flag"
	"log"

	"splitwise-go/database"

	"github.com/joho/godotenv"
)

func main() {
	yes := flag.Bool("yes", false, "confirm that you want to delete ALL data")
	flag.Parse()
	if !*yes {
		log.Fatal("reset_db deletes every table. Run again with -yes to confirm.")
	}

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}
	database.Connect()

	sqlDB, err := database.DB.DB()
	if err != nil {
		log.Fatalf("Failed to get sql.DB: %v", err)
	}
	manager := database.DefaultMigrationManager(sqlDB)

	log.Println("Dropping every table and re-applying migrations...")
	if err := manager.ResetAll(); err != nil {
		log.Fatalf("Reset failed: %v", err)
	}
	log.Println("Database reset successfully.")
}
