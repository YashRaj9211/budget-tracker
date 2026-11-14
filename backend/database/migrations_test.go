package database_test

import (
	"strings"
	"testing"
	"time"

	"splitwise-go/database"
	"splitwise-go/migrations"
	"splitwise-go/models"
	"splitwise-go/testutil"

	"github.com/shopspring/decimal"
)

// The migrations must produce tables the Go models can really read and write. This inserts
// one row into every table through the models (the check the first migration attempt failed).
func TestMigrationsMatchModels(t *testing.T) {
	db := testutil.NewDB(t, true)

	u1 := models.User{Email: "a@x.com", Name: "A", Username: "a", Password: "x"}
	u2 := models.User{Email: "b@x.com", Name: "B", Username: "b", Password: "x"}
	if err := db.Create(&u1).Error; err != nil {
		t.Fatalf("users: %v", err)
	}
	if err := db.Create(&u2).Error; err != nil {
		t.Fatalf("users: %v", err)
	}

	g := models.Group{Name: "G"}
	if err := db.Create(&g).Error; err != nil {
		t.Fatalf("groups: %v", err)
	}
	if err := db.Create(&models.GroupMember{GroupID: g.ID, UserID: u1.ID, Role: "ADMIN"}).Error; err != nil {
		t.Fatalf("group_members: %v", err)
	}
	if err := db.Create(&models.Friendship{UserID: u1.ID, FriendID: u2.ID, Status: "ACCEPTED"}).Error; err != nil {
		t.Fatalf("friendships: %v", err)
	}
	cat := models.Category{Name: "CustomCat"}
	if err := db.Create(&cat).Error; err != nil {
		t.Fatalf("categories: %v", err)
	}

	exp := models.Expense{
		Amount: decimal.NewFromInt(100), Description: "dinner", Type: models.ExpenseTypeSplit,
		UserID: u1.ID, GroupID: &g.ID, CategoryID: &cat.ID, IsSettlement: true,
		Splits: []models.ExpenseSplit{{UserID: u2.ID, Amount: decimal.NewFromInt(100), SplitType: models.SplitTypeEqual}},
	}
	if err := db.Create(&exp).Error; err != nil {
		t.Fatalf("expenses/expense_splits: %v", err)
	}

	var got models.Expense
	if err := db.Preload("Splits").First(&got, "id = ?", exp.ID).Error; err != nil {
		t.Fatalf("read expense: %v", err)
	}
	if !got.IsSettlement || len(got.Splits) != 1 || got.IncludeInBudget == nil || !*got.IncludeInBudget {
		t.Fatalf("round trip lost data: %+v", got)
	}

	desc := "cash"
	if err := db.Create(&models.Payment{Amount: decimal.NewFromInt(5), Description: &desc, PayerID: u1.ID, ReceiverID: u2.ID}).Error; err != nil {
		t.Fatalf("payments: %v", err)
	}
	now := time.Now()
	if err := db.Create(&models.Budget{UserID: u1.ID, Amount: decimal.NewFromInt(1000), Period: "MONTHLY", StartDate: now, EndDate: now.AddDate(0, 1, 0)}).Error; err != nil {
		t.Fatalf("budgets: %v", err)
	}

	sal := models.SalaryEntry{
		UserID:        u1.ID,
		Amount:        decimal.NewFromInt(50000),
		EffectiveFrom: now,
		Currency:      "INR",
	}
	if err := db.Create(&sal).Error; err != nil {
		t.Fatalf("salary_entries: %v", err)
	}

	acc := models.SavingsAccount{
		UserID:         u1.ID,
		Name:           "HDFC Savings",
		Kind:           models.SavingsAccountKindBank,
		OpeningBalance: decimal.NewFromInt(10000),
		Currency:       "INR",
	}
	if err := db.Create(&acc).Error; err != nil {
		t.Fatalf("savings_accounts: %v", err)
	}

	savTxn := models.SavingsTransaction{
		AccountID: acc.ID,
		UserID:    u1.ID,
		Amount:    decimal.NewFromInt(2500),
		Direction: models.SavingsTxnDirectionDeposit,
		TxnDate:   now,
	}
	if err := db.Create(&savTxn).Error; err != nil {
		t.Fatalf("savings_transactions: %v", err)
	}
}

func TestMigrationsUpDownAreRepeatable(t *testing.T) {
	db := testutil.NewDB(t, false)
	sqlDB, _ := db.DB()
	m := database.DefaultMigrationManager(sqlDB)

	if err := m.Up(); err != nil {
		t.Fatal(err)
	}
	if err := m.Up(); err != nil { // second run must be a no-op
		t.Fatalf("second Up: %v", err)
	}
	if err := m.DownAll(); err != nil {
		t.Fatalf("DownAll: %v", err)
	}
	var tables int64
	db.Raw("SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('users','expenses','groups')").Scan(&tables)
	if tables != 0 {
		t.Fatalf("DownAll left %d tables behind", tables)
	}
	if err := m.Up(); err != nil {
		t.Fatalf("Up after DownAll: %v", err)
	}
}

// Regression: a database built before migrations existed has data but no schema_migrations rows.
// reset_db must still wipe it (it used to do nothing, so the old data survived).
func TestResetAllWipesUntrackedDatabase(t *testing.T) {
	db := testutil.NewDB(t, true) // tables exist and are recorded
	if err := db.Create(&models.User{Email: "old@x.com", Name: "Old", Username: "old", Password: "x"}).Error; err != nil {
		t.Fatal(err)
	}
	db.Exec("DELETE FROM " + database.SchemaMigrationsTable) // pretend nothing was ever recorded

	sqlDB, _ := db.DB()
	if err := database.DefaultMigrationManager(sqlDB).ResetAll(); err != nil {
		t.Fatalf("ResetAll: %v", err)
	}
	var users int64
	db.Model(&models.User{}).Count(&users)
	if users != 0 {
		t.Fatalf("old data survived the reset: %d users", users)
	}
	entries, _ := migrations.SQLFS.ReadDir(".")
	var expectedMigrations int64
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".up.sql") {
			expectedMigrations++
		}
	}
	var recorded int64
	db.Raw("SELECT count(*) FROM " + database.SchemaMigrationsTable).Scan(&recorded)
	if recorded != expectedMigrations {
		t.Fatalf("want %d recorded migrations after reset, got %d", expectedMigrations, recorded)
	}
}
