package main

import (
	"fmt"
	"log"
	"time"

	"splitwise-go/database"
	"splitwise-go/models"
	"splitwise-go/utils"

	"github.com/joho/godotenv"
	"github.com/shopspring/decimal"
)

func generateAvatar(seed string) *string {
	url := fmt.Sprintf("https://api.dicebear.com/7.x/avataaars/svg?seed=%s", seed)
	return &url
}

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	database.Connect()

	fmt.Println("🌱 Starting seed...")

	// 1. Create Users
	passwordHash, err := utils.GeneratePasswordHash("password")
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}

	alice := models.User{
		Name:      "Alice (Demo)",
		Email:     "alice@demo.com",
		Username:  "alice",
		Password:  passwordHash,
		AvatarURL: generateAvatar("Alice"),
	}
	if err := database.DB.Create(&alice).Error; err != nil {
		log.Fatalf("Failed to create Alice: %v", err)
	}

	bob := models.User{
		Name:      "Bob",
		Email:     "bob@demo.com",
		Username:  "bob",
		Password:  passwordHash,
		AvatarURL: generateAvatar("Bob"),
	}
	if err := database.DB.Create(&bob).Error; err != nil {
		log.Fatalf("Failed to create Bob: %v", err)
	}

	charlie := models.User{
		Name:      "Charlie",
		Email:     "charlie@demo.com",
		Username:  "charlie",
		Password:  passwordHash,
		AvatarURL: generateAvatar("Charlie"),
	}
	if err := database.DB.Create(&charlie).Error; err != nil {
		log.Fatalf("Failed to create Charlie: %v", err)
	}

	fmt.Println("✅ Users created: Alice, Bob, Charlie")

	// 2. Create Friendships
	friendshipAB := models.Friendship{
		UserID:   alice.ID,
		FriendID: bob.ID,
		Status:   models.FriendshipStatusAccepted,
	}
	if err := database.DB.Create(&friendshipAB).Error; err != nil {
		log.Printf("Failed to create friendship A-B: %v", err)
	}

	friendshipBA := models.Friendship{
		UserID:   bob.ID,
		FriendID: alice.ID,
		Status:   models.FriendshipStatusAccepted,
	}
	if err := database.DB.Create(&friendshipBA).Error; err != nil {
		log.Printf("Failed to create friendship B-A: %v", err)
	}

	fmt.Println("✅ Friendships established")

	// 3. Create Group
	group := models.Group{
		Name:        "Vegas Trip",
		Description: ptr("Weekend getaway to Las Vegas"),
	}
	if err := database.DB.Create(&group).Error; err != nil {
		log.Fatalf("Failed to create group: %v", err)
	}

	// Group Members
	members := []models.GroupMember{
		{GroupID: group.ID, UserID: alice.ID, Role: models.GroupRoleAdmin},
		{GroupID: group.ID, UserID: bob.ID, Role: models.GroupRoleMember},
		{GroupID: group.ID, UserID: charlie.ID, Role: models.GroupRoleMember},
	}
	if err := database.DB.Create(&members).Error; err != nil {
		log.Fatalf("Failed to create group members: %v", err)
	}

	fmt.Println("✅ Group created: Vegas Trip")

	// 4. Expenses

	// Expense 1: Alice pays for Dinner (Split equally among all 3)
	// Amount: 300. Split: 100 each.
	expense1 := models.Expense{
		Description: "Dinner at Bellagio",
		Amount:      decimal.NewFromInt(300),
		Currency:    "USD",
		Type:        models.ExpenseTypeSplit,
		ExpenseDate: time.Now(),
		UserID:      alice.ID,
		GroupID:     &group.ID,
	}
	if err := database.DB.Create(&expense1).Error; err != nil {
		log.Fatalf("Failed to create expense 1: %v", err)
	}

	splits1 := []models.ExpenseSplit{
		{ExpenseID: expense1.ID, UserID: alice.ID, Amount: decimal.NewFromInt(100), SplitType: models.SplitTypeEqual, IsPaid: true},
		{ExpenseID: expense1.ID, UserID: bob.ID, Amount: decimal.NewFromInt(100), SplitType: models.SplitTypeEqual, IsPaid: false},
		{ExpenseID: expense1.ID, UserID: charlie.ID, Amount: decimal.NewFromInt(100), SplitType: models.SplitTypeEqual, IsPaid: false},
	}
	if err := database.DB.Create(&splits1).Error; err != nil {
		log.Fatalf("Failed to create splits 1: %v", err)
	}

	// Expense 2: Bob pays for Taxi (Split between Bob and Alice)
	// Amount: 50. Split: 25 each.
	expense2 := models.Expense{
		Description: "Uber to Hotel",
		Amount:      decimal.NewFromInt(50),
		Currency:    "USD",
		Type:        models.ExpenseTypeSplit,
		ExpenseDate: time.Now(),
		UserID:      bob.ID,
		GroupID:     &group.ID,
	}
	if err := database.DB.Create(&expense2).Error; err != nil {
		log.Fatalf("Failed to create expense 2: %v", err)
	}

	splits2 := []models.ExpenseSplit{
		{ExpenseID: expense2.ID, UserID: bob.ID, Amount: decimal.NewFromInt(25), SplitType: models.SplitTypeEqual, IsPaid: true},
		{ExpenseID: expense2.ID, UserID: alice.ID, Amount: decimal.NewFromInt(25), SplitType: models.SplitTypeEqual, IsPaid: false},
	}
	if err := database.DB.Create(&splits2).Error; err != nil {
		log.Fatalf("Failed to create splits 2: %v", err)
	}

	// Expense 3: Personal Expense for Alice
	expense3 := models.Expense{
		Description: "Coffee",
		Amount:      decimal.NewFromFloat(5.5),
		Currency:    "USD",
		Type:        models.ExpenseTypePersonal,
		ExpenseDate: time.Now(),
		UserID:      alice.ID,
	}
	if err := database.DB.Create(&expense3).Error; err != nil {
		log.Fatalf("Failed to create expense 3: %v", err)
	}

	fmt.Println("✅ Expenses added")
	fmt.Println("🌱 Seeding completed.")
}

// Helper to create string pointer
func ptr(s string) *string {
	return &s
}
