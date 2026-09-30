package main

import (
	"log"
	"splitwise-go/database"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}
	database.Connect()

	// Alter tables to increase ID column length
	queries := []string{
		"ALTER TABLE users ALTER COLUMN id TYPE VARCHAR(50);",
		"ALTER TABLE groups ALTER COLUMN id TYPE VARCHAR(50);",
		"ALTER TABLE friendships ALTER COLUMN id TYPE VARCHAR(50);",
		"ALTER TABLE group_members ALTER COLUMN id TYPE VARCHAR(50);",
		"ALTER TABLE categories ALTER COLUMN id TYPE VARCHAR(50);",
		"ALTER TABLE expenses ALTER COLUMN id TYPE VARCHAR(50);",
		"ALTER TABLE expense_splits ALTER COLUMN id TYPE VARCHAR(50);",
		"ALTER TABLE payments ALTER COLUMN id TYPE VARCHAR(50);",
		"ALTER TABLE budgets ALTER COLUMN id TYPE VARCHAR(50);",
	}

	for _, query := range queries {
		log.Printf("Executing: %s", query)
		if err := database.DB.Exec(query).Error; err != nil {
			// Don't panic, just log (table might not exist yet)
			log.Printf("Error executing query: %v", err)
		} else {
			log.Println("Success")
		}
	}
}
