package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"splitwise-go/database"
	"splitwise-go/models"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type CreateSalaryInput struct {
	Amount        decimal.Decimal `json:"amount" binding:"required"`
	Currency      string          `json:"currency"`
	EffectiveFrom string          `json:"effectiveFrom" binding:"required"`
	Note          *string         `json:"note"`
}

type UpdateSalaryInput struct {
	Amount        *decimal.Decimal `json:"amount"`
	Currency      *string          `json:"currency"`
	EffectiveFrom *string          `json:"effectiveFrom"`
	Note          *string          `json:"note"`
}

// GetSalaryForMonth calculates the active salary for a given user and month (YYYY-MM).
// Rule: current salary for a month = the entry with the latest effective_from that is
// on or before the last day of that month, ignoring soft-deleted entries.
func GetSalaryForMonth(db *gorm.DB, userID string, monthStr string) (decimal.Decimal, *models.SalaryEntry, error) {
	if strings.TrimSpace(monthStr) == "" {
		monthStr = time.Now().UTC().Format("2006-01")
	}
	t, err := time.Parse("2006-01", strings.TrimSpace(monthStr))
	if err != nil {
		return decimal.Zero, nil, fmt.Errorf("invalid month format, expected YYYY-MM: %w", err)
	}

	// End of month: first of next month minus 1 day
	firstOfNextMonth := time.Date(t.Year(), t.Month()+1, 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := firstOfNextMonth.AddDate(0, 0, -1)

	var entry models.SalaryEntry
	err = db.Where("user_id = ? AND effective_from <= ? AND deleted_at IS NULL", userID, endOfMonth).
		Order("effective_from desc, created_at desc").
		First(&entry).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return decimal.Zero, nil, nil
		}
		return decimal.Zero, nil, err
	}
	return entry.Amount, &entry, nil
}

// GetSalaryHistory returns all salary entries for the user, ordered newest first.
func GetSalaryHistory(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	var entries []models.SalaryEntry
	if err := database.DB.Where("user_id = ? AND deleted_at IS NULL", userId).
		Order("effective_from desc, created_at desc").
		Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch salary history: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, entries)
}

// GetActiveSalary returns the effective salary for a given month (?month=YYYY-MM).
func GetActiveSalary(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	month := c.Query("month")
	if month == "" {
		month = time.Now().UTC().Format("2006-01")
	}

	amount, entry, err := GetSalaryForMonth(database.DB, userId, month)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	currency := "INR"
	if entry != nil && entry.Currency != "" {
		currency = entry.Currency
	}

	c.JSON(http.StatusOK, gin.H{
		"month":    month,
		"amount":   amount,
		"currency": currency,
		"entry":    entry,
	})
}

// CreateSalary adds a new salary entry.
func CreateSalary(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	var input CreateSalaryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Amount.IsNegative() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be greater than or equal to 0"})
		return
	}
	if input.Amount.GreaterThan(maxExpenseAmount) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount is too large"})
		return
	}

	effDate, err := time.Parse("2006-01-02", strings.TrimSpace(input.EffectiveFrom))
	if err != nil {
		effDate, err = time.Parse(time.RFC3339, strings.TrimSpace(input.EffectiveFrom))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid effectiveFrom format, expected YYYY-MM-DD"})
			return
		}
	}
	effDate = time.Date(effDate.Year(), effDate.Month(), effDate.Day(), 0, 0, 0, 0, time.UTC)

	currency := "INR"
	if strings.TrimSpace(input.Currency) != "" {
		currency = strings.TrimSpace(input.Currency)
	}

	var note *string
	if input.Note != nil {
		trimmed := strings.TrimSpace(*input.Note)
		note = &trimmed
	}

	entry := models.SalaryEntry{
		UserID:        userId,
		Amount:        input.Amount,
		Currency:      currency,
		EffectiveFrom: effDate,
		Note:          note,
	}

	if err := database.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create salary entry: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, entry)
}

// UpdateSalary updates an existing salary entry by ID.
func UpdateSalary(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	salaryId := c.Param("id")
	if salaryId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "salary id is required"})
		return
	}

	var entry models.SalaryEntry
	if err := database.DB.Where("id = ? AND user_id = ? AND deleted_at IS NULL", salaryId, userId).First(&entry).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Salary entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	var input UpdateSalaryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Amount != nil {
		if input.Amount.IsNegative() {
			c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be greater than or equal to 0"})
			return
		}
		if input.Amount.GreaterThan(maxExpenseAmount) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "amount is too large"})
			return
		}
		entry.Amount = *input.Amount
	}

	if input.Currency != nil && strings.TrimSpace(*input.Currency) != "" {
		entry.Currency = strings.TrimSpace(*input.Currency)
	}

	if input.EffectiveFrom != nil {
		effDate, err := time.Parse("2006-01-02", strings.TrimSpace(*input.EffectiveFrom))
		if err != nil {
			effDate, err = time.Parse(time.RFC3339, strings.TrimSpace(*input.EffectiveFrom))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid effectiveFrom format, expected YYYY-MM-DD"})
				return
			}
		}
		entry.EffectiveFrom = time.Date(effDate.Year(), effDate.Month(), effDate.Day(), 0, 0, 0, 0, time.UTC)
	}

	if input.Note != nil {
		trimmed := strings.TrimSpace(*input.Note)
		entry.Note = &trimmed
	}

	if err := database.DB.Save(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update salary entry: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, entry)
}

// DeleteSalary performs a soft delete on a salary entry.
func DeleteSalary(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	salaryId := c.Param("id")
	if salaryId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "salary id is required"})
		return
	}

	var entry models.SalaryEntry
	if err := database.DB.Where("id = ? AND user_id = ? AND deleted_at IS NULL", salaryId, userId).First(&entry).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Salary entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	now := time.Now()
	if err := database.DB.Model(&entry).Update("deleted_at", now).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete salary entry: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Salary entry deleted successfully"})
}
