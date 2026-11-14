package handlers

import (
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

// MonthCategorySpend represents category-wise spending with budgeted and excluded components.
type MonthCategorySpend struct {
	CategoryID string          `json:"categoryId"`
	Name       string          `json:"name"`
	Color      string          `json:"color"`
	Amount     decimal.Decimal `json:"amount"`
	Budgeted   decimal.Decimal `json:"budgeted"`
	Excluded   decimal.Decimal `json:"excluded"`
}

// FinanceSummaryResponse represents the financial breakdown for a specific month.
type FinanceSummaryResponse struct {
	Month         string               `json:"month"`
	Salary        decimal.Decimal      `json:"salary"`
	OtherIncome   decimal.Decimal      `json:"otherIncome"`
	TotalIncome   decimal.Decimal      `json:"totalIncome"`
	TotalSpent    decimal.Decimal      `json:"totalSpent"`
	BudgetSpent   decimal.Decimal      `json:"budgetSpent"`
	ExcludedSpent decimal.Decimal      `json:"excludedSpent"`
	Left          decimal.Decimal      `json:"left"`
	SavingsTotal  decimal.Decimal      `json:"savingsTotal"`
	Categories    []MonthCategorySpend `json:"categories"`
}

// ComputeFinanceSummary calculates the summary numbers for a given user and month.
// Note on time zones (ISSUES.md #27): Date boundaries are evaluated in UTC, matching
// analytics_handler.go.
func ComputeFinanceSummary(db *gorm.DB, userID string, monthStr string) (*FinanceSummaryResponse, error) {
	if strings.TrimSpace(monthStr) == "" {
		monthStr = time.Now().UTC().Format("2006-01")
	}
	t, err := time.Parse("2006-01", strings.TrimSpace(monthStr))
	if err != nil {
		return nil, fmt.Errorf("invalid month format, expected YYYY-MM: %w", err)
	}

	monthStart := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
	monthEnd := time.Date(t.Year(), t.Month()+1, 1, 0, 0, 0, 0, time.UTC)

	// 1. Salary in effect for that month (Step 2 rule: latest effective_from on or before end of month)
	salary, _, err := GetSalaryForMonth(db, userID, monthStr)
	if err != nil {
		return nil, fmt.Errorf("failed to get salary: %w", err)
	}

	// 2. Other income: sum of INCOME expenses in the month
	var otherIncome decimal.Decimal
	if err := db.Model(&models.Expense{}).
		Where("user_id = ? AND type = ? AND deleted_at IS NULL AND expense_date >= ? AND expense_date < ?",
			userID, models.ExpenseTypeIncome, monthStart, monthEnd).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&otherIncome).Error; err != nil {
		return nil, fmt.Errorf("failed to calculate other income: %w", err)
	}

	// 3. Total income = salary + otherIncome
	totalIncome := salary.Add(otherIncome)

	// 4. Total spent: all PERSONAL expenses in the month (both included and excluded)
	var totalSpent decimal.Decimal
	if err := db.Model(&models.Expense{}).
		Where("user_id = ? AND type = ? AND deleted_at IS NULL AND expense_date >= ? AND expense_date < ?",
			userID, models.ExpenseTypePersonal, monthStart, monthEnd).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalSpent).Error; err != nil {
		return nil, fmt.Errorf("failed to calculate total spent: %w", err)
	}

	// 5. Budget spent: PERSONAL expenses where include_in_budget is true (or default/null)
	var budgetSpent decimal.Decimal
	if err := db.Model(&models.Expense{}).
		Where("user_id = ? AND type = ? AND (include_in_budget = true OR include_in_budget IS NULL) AND deleted_at IS NULL AND expense_date >= ? AND expense_date < ?",
			userID, models.ExpenseTypePersonal, monthStart, monthEnd).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&budgetSpent).Error; err != nil {
		return nil, fmt.Errorf("failed to calculate budget spent: %w", err)
	}

	// 6. Excluded spent = totalSpent - budgetSpent
	excludedSpent := totalSpent.Sub(budgetSpent)

	// 7. Left = totalIncome - totalSpent
	left := totalIncome.Sub(totalSpent)

	// 8. Total savings: sum of balances across all active savings accounts (all time, not per month)
	savingsTotal, err := GetTotalSavings(db, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate savings total: %w", err)
	}

	// 9. Category breakdown for that month (with budgeted and excluded portions)
	type catRow struct {
		CategoryID *string
		Name       *string
		Color      *string
		Amount     decimal.Decimal
		InBudget   *bool
	}
	var rawCats []catRow
	if err := db.Table("expenses").
		Select("expenses.category_id, categories.name, categories.color, expenses.amount, expenses.include_in_budget as in_budget").
		Joins("LEFT JOIN categories ON categories.id = expenses.category_id").
		Where("expenses.user_id = ? AND expenses.type = ? AND expenses.deleted_at IS NULL AND expenses.expense_date >= ? AND expenses.expense_date < ?",
			userID, models.ExpenseTypePersonal, monthStart, monthEnd).
		Find(&rawCats).Error; err != nil {
		return nil, fmt.Errorf("failed to calculate category breakdown: %w", err)
	}

	catMap := make(map[string]*MonthCategorySpend)
	var catOrder []string
	for _, r := range rawCats {
		catID := ""
		if r.CategoryID != nil {
			catID = *r.CategoryID
		}
		name := "Uncategorised"
		if r.Name != nil && strings.TrimSpace(*r.Name) != "" {
			name = *r.Name
		}
		color := ""
		if r.Color != nil {
			color = *r.Color
		}

		key := catID
		if key == "" {
			key = name
		}

		entry, exists := catMap[key]
		if !exists {
			entry = &MonthCategorySpend{
				CategoryID: catID,
				Name:       name,
				Color:      color,
				Amount:     decimal.Zero,
				Budgeted:   decimal.Zero,
				Excluded:   decimal.Zero,
			}
			catMap[key] = entry
			catOrder = append(catOrder, key)
		}

		entry.Amount = entry.Amount.Add(r.Amount)
		if r.InBudget == nil || *r.InBudget {
			entry.Budgeted = entry.Budgeted.Add(r.Amount)
		} else {
			entry.Excluded = entry.Excluded.Add(r.Amount)
		}
	}

	categories := make([]MonthCategorySpend, 0, len(catOrder))
	for _, key := range catOrder {
		categories = append(categories, *catMap[key])
	}

	return &FinanceSummaryResponse{
		Month:         t.Format("2006-01"),
		Salary:        salary,
		OtherIncome:   otherIncome,
		TotalIncome:   totalIncome,
		TotalSpent:    totalSpent,
		BudgetSpent:   budgetSpent,
		ExcludedSpent: excludedSpent,
		Left:          left,
		SavingsTotal:  savingsTotal,
		Categories:    categories,
	}, nil
}

// GetFinanceSummary returns a read-only monthly summary for the authenticated user.
func GetFinanceSummary(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	monthStr := c.Query("month")
	summary, err := ComputeFinanceSummary(database.DB, userID, monthStr)
	if err != nil {
		if strings.Contains(err.Error(), "invalid month format") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate finance summary: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}
