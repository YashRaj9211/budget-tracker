package main

import (
	"fmt"
	"log"

	"splitwise-go/database"
	"splitwise-go/models"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	database.Connect()

	fmt.Println("Migrating tables...")

	tables := []any{
		&models.User{},
		&models.Group{},
		&models.Category{},
		&models.Friendship{},
		&models.GroupMember{},
		&models.Budget{},
		&models.Expense{},
		&models.ExpenseSplit{},
		&models.Payment{},
	}

	for _, table := range tables {
		if err := database.DB.Migrator().AutoMigrate(table); err != nil {
			log.Printf("Failed to migrate table for %T: %v\n", table, err)
		} else {
			fmt.Printf("Migrated table for %T\n", table)
		}
	}

	fmt.Println("Database migration completed successfully.")
}
