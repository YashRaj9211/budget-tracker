package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"splitwise-go/database"
	"splitwise-go/models"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type CreateSavingsAccountInput struct {
	Name           string                    `json:"name" binding:"required"`
	Kind           models.SavingsAccountKind `json:"kind"`
	OpeningBalance *decimal.Decimal          `json:"openingBalance"`
	OpeningDate    *string                   `json:"openingDate"`
	Currency       string                    `json:"currency"`
}

type UpdateSavingsAccountInput struct {
	Name           *string                    `json:"name"`
	Kind           *models.SavingsAccountKind `json:"kind"`
	OpeningBalance *decimal.Decimal           `json:"openingBalance"`
	OpeningDate    *string                    `json:"openingDate"`
	Currency       *string                    `json:"currency"`
}

// parseDateOnly parses YYYY-MM-DD into a UTC midnight time.
func parseDateOnly(raw string) (time.Time, error) {
	t, err := time.Parse("2006-01-02", strings.TrimSpace(raw))
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC), nil
}

type CreateSavingsTransactionInput struct {
	Amount    decimal.Decimal            `json:"amount" binding:"required"`
	Direction models.SavingsTxnDirection `json:"direction" binding:"required"`
	TxnDate   string                     `json:"txnDate" binding:"required"`
	Note      *string                    `json:"note"`
}

func validSavingsAccountKind(k models.SavingsAccountKind) bool {
	switch k {
	case models.SavingsAccountKindBank, models.SavingsAccountKindFD, models.SavingsAccountKindRD,
		models.SavingsAccountKindMutualFund, models.SavingsAccountKindCash, models.SavingsAccountKindOther:
		return true
	}
	return false
}

// CalculateAccountBalance computes: opening_balance + sum(DEPOSIT) - sum(WITHDRAWAL)
// ignoring soft-deleted transactions.
func CalculateAccountBalance(db *gorm.DB, accountID string, openingBalance decimal.Decimal) (decimal.Decimal, error) {
	type DirectionSum struct {
		Direction string
		Total     decimal.Decimal
	}
	var sums []DirectionSum
	err := db.Model(&models.SavingsTransaction{}).
		Select("direction, COALESCE(SUM(amount), 0) as total").
		Where("account_id = ? AND deleted_at IS NULL", accountID).
		Group("direction").
		Scan(&sums).Error
	if err != nil {
		return decimal.Zero, err
	}

	bal := openingBalance
	for _, s := range sums {
		switch models.SavingsTxnDirection(strings.ToUpper(s.Direction)) {
		case models.SavingsTxnDirectionDeposit:
			bal = bal.Add(s.Total)
		case models.SavingsTxnDirectionWithdrawal:
			bal = bal.Sub(s.Total)
		}
	}
	return bal, nil
}

// GetTotalSavings returns the sum of balances across all active savings accounts for a user.
func GetTotalSavings(db *gorm.DB, userID string) (decimal.Decimal, error) {
	var accounts []models.SavingsAccount
	if err := db.Where("user_id = ? AND deleted_at IS NULL", userID).Find(&accounts).Error; err != nil {
		return decimal.Zero, err
	}

	total := decimal.Zero
	for _, a := range accounts {
		bal, err := CalculateAccountBalance(db, a.ID, a.OpeningBalance)
		if err != nil {
			return decimal.Zero, err
		}
		total = total.Add(bal)
	}
	return total, nil
}

// GetSavingsAccounts lists all accounts for the user, each with its calculated balance.
func GetSavingsAccounts(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	var accounts []models.SavingsAccount
	if err := database.DB.Where("user_id = ? AND deleted_at IS NULL", userId).
		Order("created_at asc").
		Find(&accounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch savings accounts: " + err.Error()})
		return
	}

	for i := range accounts {
		bal, err := CalculateAccountBalance(database.DB, accounts[i].ID, accounts[i].OpeningBalance)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate balance: " + err.Error()})
			return
		}
		accounts[i].Balance = &bal
	}

	c.JSON(http.StatusOK, accounts)
}

// GetSavingsAccount fetches a single savings account with its calculated balance.
func GetSavingsAccount(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var account models.SavingsAccount
	if err := database.DB.Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userId).First(&account).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Savings account not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	bal, err := CalculateAccountBalance(database.DB, account.ID, account.OpeningBalance)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate balance: " + err.Error()})
		return
	}
	account.Balance = &bal

	c.JSON(http.StatusOK, account)
}

// CreateSavingsAccount creates a new savings account.
func CreateSavingsAccount(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	var input CreateSavingsAccountInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	openingBalance := decimal.Zero
	if input.OpeningBalance != nil {
		if input.OpeningBalance.IsNegative() {
			c.JSON(http.StatusBadRequest, gin.H{"error": "openingBalance must be greater than or equal to 0"})
			return
		}
		if input.OpeningBalance.GreaterThan(maxExpenseAmount) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "openingBalance is too large"})
			return
		}
		openingBalance = *input.OpeningBalance
	}

	kind := models.SavingsAccountKindOther
	if input.Kind != "" {
		upperKind := models.SavingsAccountKind(strings.ToUpper(string(input.Kind)))
		if !validSavingsAccountKind(upperKind) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid kind, must be BANK, FD, RD, MUTUAL_FUND, CASH, or OTHER"})
			return
		}
		kind = upperKind
	}

	currency := "INR"
	if strings.TrimSpace(input.Currency) != "" {
		currency = strings.TrimSpace(input.Currency)
	}

	openingDate := todayUTC()
	if input.OpeningDate != nil && strings.TrimSpace(*input.OpeningDate) != "" {
		d, err := parseDateOnly(*input.OpeningDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid openingDate, expected YYYY-MM-DD"})
			return
		}
		openingDate = d
	}

	account := models.SavingsAccount{
		UserID:         userId,
		Name:           name,
		Kind:           kind,
		OpeningBalance: openingBalance,
		OpeningDate:    openingDate,
		Currency:       currency,
	}

	if err := database.DB.Create(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create savings account: " + err.Error()})
		return
	}

	bal := account.OpeningBalance
	account.Balance = &bal

	c.JSON(http.StatusCreated, account)
}

// UpdateSavingsAccount edits an existing savings account.
func UpdateSavingsAccount(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var account models.SavingsAccount
	if err := database.DB.Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userId).First(&account).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Savings account not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	var input UpdateSavingsAccountInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name != nil {
		name := strings.TrimSpace(*input.Name)
		if name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "name cannot be empty"})
			return
		}
		account.Name = name
	}

	if input.OpeningBalance != nil {
		if input.OpeningBalance.IsNegative() {
			c.JSON(http.StatusBadRequest, gin.H{"error": "openingBalance must be greater than or equal to 0"})
			return
		}
		if input.OpeningBalance.GreaterThan(maxExpenseAmount) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "openingBalance is too large"})
			return
		}
		account.OpeningBalance = *input.OpeningBalance
	}

	if input.Kind != nil {
		upperKind := models.SavingsAccountKind(strings.ToUpper(string(*input.Kind)))
		if !validSavingsAccountKind(upperKind) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid kind, must be BANK, FD, RD, MUTUAL_FUND, CASH, or OTHER"})
			return
		}
		account.Kind = upperKind
	}

	if input.OpeningDate != nil {
		d, err := parseDateOnly(*input.OpeningDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid openingDate, expected YYYY-MM-DD"})
			return
		}
		account.OpeningDate = d
	}

	if input.Currency != nil && strings.TrimSpace(*input.Currency) != "" {
		account.Currency = strings.TrimSpace(*input.Currency)
	}

	if err := database.DB.Save(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update savings account: " + err.Error()})
		return
	}

	bal, err := CalculateAccountBalance(database.DB, account.ID, account.OpeningBalance)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate balance: " + err.Error()})
		return
	}
	account.Balance = &bal

	c.JSON(http.StatusOK, account)
}

// DeleteSavingsAccount soft-deletes an account and its transactions.
func DeleteSavingsAccount(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	id := c.Param("id")
	var account models.SavingsAccount
	if err := database.DB.Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userId).First(&account).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Savings account not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	now := time.Now()
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&account).Update("deleted_at", now).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.SavingsTransaction{}).
			Where("account_id = ? AND deleted_at IS NULL", id).
			Update("deleted_at", now).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete savings account: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Savings account deleted successfully"})
}

// GetSavingsTransactions lists transactions for an account, newest first.
func GetSavingsTransactions(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	accountId := c.Param("id")
	var account models.SavingsAccount
	if err := database.DB.Where("id = ? AND user_id = ? AND deleted_at IS NULL", accountId, userId).First(&account).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Savings account not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	var txns []models.SavingsTransaction
	if err := database.DB.Where("account_id = ? AND user_id = ? AND deleted_at IS NULL", accountId, userId).
		Order("txn_date desc, created_at desc").
		Find(&txns).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, txns)
}

// CreateSavingsTransaction records a deposit or withdrawal for an account.
func CreateSavingsTransaction(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	accountId := c.Param("id")
	var account models.SavingsAccount
	if err := database.DB.Where("id = ? AND user_id = ? AND deleted_at IS NULL", accountId, userId).First(&account).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Savings account not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	var input CreateSavingsTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !input.Amount.GreaterThan(decimal.Zero) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be greater than 0"})
		return
	}
	if input.Amount.GreaterThan(maxExpenseAmount) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount is too large"})
		return
	}

	dirUpper := models.SavingsTxnDirection(strings.ToUpper(string(input.Direction)))
	if dirUpper != models.SavingsTxnDirectionDeposit && dirUpper != models.SavingsTxnDirectionWithdrawal {
		c.JSON(http.StatusBadRequest, gin.H{"error": "direction must be DEPOSIT or WITHDRAWAL"})
		return
	}

	txnDate, err := time.Parse("2006-01-02", strings.TrimSpace(input.TxnDate))
	if err != nil {
		txnDate, err = time.Parse(time.RFC3339, strings.TrimSpace(input.TxnDate))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid txnDate format, expected YYYY-MM-DD"})
			return
		}
	}
	txnDate = time.Date(txnDate.Year(), txnDate.Month(), txnDate.Day(), 0, 0, 0, 0, time.UTC)

	var note *string
	if input.Note != nil {
		trimmed := strings.TrimSpace(*input.Note)
		note = &trimmed
	}

	if dirUpper == models.SavingsTxnDirectionWithdrawal {
		balance, err := CalculateAccountBalance(database.DB, account.ID, account.OpeningBalance)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate balance: " + err.Error()})
			return
		}
		if input.Amount.GreaterThan(balance) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "withdrawal exceeds current balance of " + balance.StringFixed(2)})
			return
		}
	}

	txn := models.SavingsTransaction{
		AccountID: accountId,
		UserID:    userId,
		Amount:    input.Amount,
		Direction: dirUpper,
		TxnDate:   txnDate,
		Note:      note,
	}

	if err := database.DB.Create(&txn).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, txn)
}

// DeleteSavingsTransaction soft-deletes a savings transaction.
func DeleteSavingsTransaction(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	accountId := c.Param("id")
	txnId := c.Param("txnId")

	var txn models.SavingsTransaction
	if err := database.DB.Where("id = ? AND account_id = ? AND user_id = ? AND deleted_at IS NULL", txnId, accountId, userId).First(&txn).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	now := time.Now()
	if err := database.DB.Model(&txn).Update("deleted_at", now).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete transaction: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaction deleted successfully"})
}
