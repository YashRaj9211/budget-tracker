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

	// Drop tables in reverse order of dependencies to avoid FK errors
	fmt.Println("Dropping tables...")

	// We use the models to drop tables
	tables := []interface{}{
		&models.Payment{},
		&models.ExpenseSplit{},
		&models.Expense{},
		&models.GroupMember{},
		&models.Budget{},
		&models.Friendship{},
		&models.Category{},
		&models.Group{},
		&models.User{},
	}

	for _, table := range tables {
		if err := database.DB.Migrator().DropTable(table); err != nil {
			log.Printf("Failed to drop table for %T: %v\n", table, err)
		} else {
			fmt.Printf("Dropped table for %T\n", table)
		}
	}

	fmt.Println("Recreating tables...")
	// AutoMigrate will create tables, missing foreign keys, constraints, columns and indexes
	if err := database.DB.AutoMigrate(
		&models.User{},
		&models.Group{},
		&models.Category{},
		&models.Friendship{},
		&models.GroupMember{},
		&models.Budget{},
		&models.Expense{},
		&models.ExpenseSplit{},
		&models.Payment{},
	); err != nil {
		log.Fatalf("Failed to migrate tables: %v", err)
	}

	fmt.Println("Database reset (dropped & migrated) successfully.")
}
