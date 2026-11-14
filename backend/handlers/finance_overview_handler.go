package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"splitwise-go/database"
	"splitwise-go/models"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// maxOverviewHistoryMonths caps how far back the overview looks for cumulative overspend.
const maxOverviewHistoryMonths = 240

// OverviewAccountBalance is one savings account's balance at a point in time.
type OverviewAccountBalance struct {
	AccountID string          `json:"accountId"`
	Name      string          `json:"name"`
	Kind      string          `json:"kind"`
	Balance   decimal.Decimal `json:"balance"`
}

// OverviewMonth holds the numbers for one calendar month.
type OverviewMonth struct {
	Month           string                   `json:"month"`
	Salary          decimal.Decimal          `json:"salary"`
	OtherIncome     decimal.Decimal          `json:"otherIncome"`
	TotalIncome     decimal.Decimal          `json:"totalIncome"`
	TotalSpent      decimal.Decimal          `json:"totalSpent"`
	BudgetSpent     decimal.Decimal          `json:"budgetSpent"`
	ExcludedSpent   decimal.Decimal          `json:"excludedSpent"`
	Left            decimal.Decimal          `json:"left"`
	BudgetLimit     decimal.Decimal          `json:"budgetLimit"`
	HasBudget       bool                     `json:"hasBudget"`
	BudgetLeft      decimal.Decimal          `json:"budgetLeft"`
	Overspent       bool                     `json:"overspent"`
	OverspentBy     decimal.Decimal          `json:"overspentBy"`
	OverspendTotal  decimal.Decimal          `json:"overspendTotal"`
	SavingsEnd      decimal.Decimal          `json:"savingsEnd"`
	NetSavingsFlow  decimal.Decimal          `json:"netSavingsFlow"`
	AdjustedSavings decimal.Decimal          `json:"adjustedSavings"`
	Accounts        []OverviewAccountBalance `json:"accounts"`
}

// FinanceOverviewSummary is the headline numbers for the end month.
type FinanceOverviewSummary struct {
	Month           string          `json:"month"`
	SavingsTotal    decimal.Decimal `json:"savingsTotal"`
	OverspendTotal  decimal.Decimal `json:"overspendTotal"`
	AdjustedSavings decimal.Decimal `json:"adjustedSavings"`
	OverspentMonths int             `json:"overspentMonths"`
}

// FinanceOverviewResponse is returned by GET /finance/overview.
type FinanceOverviewResponse struct {
	To       string                   `json:"to"`
	Months   []OverviewMonth          `json:"months"`
	Accounts []OverviewAccountBalance `json:"accounts"`
	Summary  FinanceOverviewSummary   `json:"summary"`
}

type overviewExpenseRow struct {
	ExpenseDate     time.Time
	Type            string
	Amount          decimal.Decimal
	IncludeInBudget *bool
}

type overviewTxnRow struct {
	AccountID string
	Direction string
	Amount    decimal.Decimal
	TxnDate   time.Time
}

type overviewMonthAgg struct {
	otherIncome decimal.Decimal
	totalSpent  decimal.Decimal
	budgetSpent decimal.Decimal
	budgetLimit decimal.Decimal
	hasBudget   bool
}

func todayUTC() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
}

func monthStartUTC(t time.Time) time.Time {
	t = t.UTC()
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
}

func dateOnlyUTC(t time.Time) time.Time {
	t = t.UTC()
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

// daysBetween counts whole days between two UTC-midnight times.
func daysBetween(a, b time.Time) int64 {
	return int64(b.Sub(a).Hours()/24 + 0.5)
}

// ComputeFinanceOverview builds month-by-month savings, income, spending and overspend numbers.
//
// Overspend rule: a month is overspent when budget-counted spending is above the
// prorated budget limit for that month. The overspent amount is deducted cumulatively
// from total savings, so adjustedSavings = savings - overspendTotal.
func ComputeFinanceOverview(db *gorm.DB, userID string, monthStr string, windowMonths int) (*FinanceOverviewResponse, error) {
	if strings.TrimSpace(monthStr) == "" {
		monthStr = time.Now().UTC().Format("2006-01")
	}
	parsed, err := time.Parse("2006-01", strings.TrimSpace(monthStr))
	if err != nil {
		return nil, fmt.Errorf("invalid month format, expected YYYY-MM: %w", err)
	}
	to := monthStartUTC(parsed)
	nextAfterTo := to.AddDate(0, 1, 0)

	// Load raw rows once; aggregate in Go.
	var expRows []overviewExpenseRow
	if err := db.Table("expenses").
		Select("expense_date, type, amount, include_in_budget").
		Where("user_id = ? AND deleted_at IS NULL AND expense_date < ?", userID, nextAfterTo).
		Find(&expRows).Error; err != nil {
		return nil, fmt.Errorf("failed to load expenses: %w", err)
	}

	var txnRows []overviewTxnRow
	if err := db.Table("savings_transactions").
		Select("account_id, direction, amount, txn_date").
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Find(&txnRows).Error; err != nil {
		return nil, fmt.Errorf("failed to load savings transactions: %w", err)
	}

	var accounts []models.SavingsAccount
	if err := db.Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("created_at asc").
		Find(&accounts).Error; err != nil {
		return nil, fmt.Errorf("failed to load savings accounts: %w", err)
	}

	var budgets []models.Budget
	if err := db.Where("user_id = ? AND deleted_at IS NULL", userID).
		Find(&budgets).Error; err != nil {
		return nil, fmt.Errorf("failed to load budgets: %w", err)
	}

	// Decide the first month to include (earliest data, capped).
	start := to
	consider := func(t time.Time) {
		if m := monthStartUTC(t); m.Before(start) {
			start = m
		}
	}
	for _, e := range expRows {
		consider(e.ExpenseDate)
	}
	for _, t := range txnRows {
		consider(t.TxnDate)
	}
	for _, a := range accounts {
		consider(a.OpeningDate)
	}
	for _, b := range budgets {
		consider(b.StartDate)
	}
	if floor := to.AddDate(0, -(maxOverviewHistoryMonths - 1), 0); start.Before(floor) {
		start = floor
	}

	var keys []time.Time
	for m := start; !m.After(to); m = m.AddDate(0, 1, 0) {
		keys = append(keys, m)
	}

	aggs := make(map[string]*overviewMonthAgg, len(keys))
	for _, k := range keys {
		aggs[k.Format("2006-01")] = &overviewMonthAgg{}
	}

	// Income and spending per month.
	for _, e := range expRows {
		agg, ok := aggs[e.ExpenseDate.UTC().Format("2006-01")]
		if !ok {
			continue
		}
		switch e.Type {
		case string(models.ExpenseTypeIncome):
			agg.otherIncome = agg.otherIncome.Add(e.Amount)
		case string(models.ExpenseTypePersonal):
			agg.totalSpent = agg.totalSpent.Add(e.Amount)
			if e.IncludeInBudget == nil || *e.IncludeInBudget {
				agg.budgetSpent = agg.budgetSpent.Add(e.Amount)
			}
		}
	}

	// Prorated budget limit per month (budget amount x overlap days / budget days).
	for _, k := range keys {
		monthStart := k
		monthEnd := k.AddDate(0, 1, 0)
		agg := aggs[k.Format("2006-01")]
		for _, b := range budgets {
			bStart := dateOnlyUTC(b.StartDate)
			bEnd := dateOnlyUTC(b.EndDate).AddDate(0, 0, 1)
			totalDays := daysBetween(bStart, bEnd)
			if totalDays <= 0 {
				continue
			}
			overlapStart, overlapEnd := bStart, bEnd
			if monthStart.After(overlapStart) {
				overlapStart = monthStart
			}
			if monthEnd.Before(overlapEnd) {
				overlapEnd = monthEnd
			}
			overlapDays := daysBetween(overlapStart, overlapEnd)
			if overlapDays <= 0 {
				continue
			}
			share := b.Amount.Mul(decimal.NewFromInt(overlapDays)).Div(decimal.NewFromInt(totalDays))
			agg.budgetLimit = agg.budgetLimit.Add(share.Round(2))
			agg.hasBudget = true
		}
	}

	// Build the per-month rows, walking forward so overspend accumulates.
	allMonths := make([]OverviewMonth, 0, len(keys))
	cumulativeOverspend := decimal.Zero
	overspentMonths := 0

	for _, k := range keys {
		key := k.Format("2006-01")
		agg := aggs[key]
		monthEnd := k.AddDate(0, 1, 0)

		overspent := agg.hasBudget && agg.budgetSpent.GreaterThan(agg.budgetLimit)
		overspentBy := decimal.Zero
		if overspent {
			overspentBy = agg.budgetSpent.Sub(agg.budgetLimit)
			cumulativeOverspend = cumulativeOverspend.Add(overspentBy)
			overspentMonths++
		}

		var monthAccounts []OverviewAccountBalance
		savingsEnd := decimal.Zero
		netFlow := decimal.Zero
		for _, a := range accounts {
			if !dateOnlyUTC(a.OpeningDate).Before(monthEnd) {
				continue // account not opened yet at month end
			}
			bal := a.OpeningBalance
			for _, t := range txnRows {
				if t.AccountID != a.ID || !t.TxnDate.Before(monthEnd) {
					continue
				}
				switch models.SavingsTxnDirection(strings.ToUpper(t.Direction)) {
				case models.SavingsTxnDirectionDeposit:
					bal = bal.Add(t.Amount)
				case models.SavingsTxnDirectionWithdrawal:
					bal = bal.Sub(t.Amount)
				}
				if !t.TxnDate.Before(k) {
					if models.SavingsTxnDirection(strings.ToUpper(t.Direction)) == models.SavingsTxnDirectionDeposit {
						netFlow = netFlow.Add(t.Amount)
					} else {
						netFlow = netFlow.Sub(t.Amount)
					}
				}
			}
			savingsEnd = savingsEnd.Add(bal)
			monthAccounts = append(monthAccounts, OverviewAccountBalance{
				AccountID: a.ID,
				Name:      a.Name,
				Kind:      string(a.Kind),
				Balance:   bal,
			})
		}

		salary, _, err := GetSalaryForMonth(db, userID, key)
		if err != nil {
			return nil, fmt.Errorf("failed to get salary: %w", err)
		}
		totalIncome := salary.Add(agg.otherIncome)
		excludedSpent := agg.totalSpent.Sub(agg.budgetSpent)
		left := totalIncome.Sub(agg.totalSpent)

		allMonths = append(allMonths, OverviewMonth{
			Month:           key,
			Salary:          salary,
			OtherIncome:     agg.otherIncome,
			TotalIncome:     totalIncome,
			TotalSpent:      agg.totalSpent,
			BudgetSpent:     agg.budgetSpent,
			ExcludedSpent:   excludedSpent,
			Left:            left,
			BudgetLimit:     agg.budgetLimit,
			HasBudget:       agg.hasBudget,
			BudgetLeft:      agg.budgetLimit.Sub(agg.budgetSpent),
			Overspent:       overspent,
			OverspentBy:     overspentBy,
			OverspendTotal:  cumulativeOverspend,
			SavingsEnd:      savingsEnd,
			NetSavingsFlow:  netFlow,
			AdjustedSavings: savingsEnd.Sub(cumulativeOverspend),
			Accounts:        monthAccounts,
		})
	}

	// Current balances (all-time, same rule as GetTotalSavings).
	currentBalances := make([]OverviewAccountBalance, 0, len(accounts))
	savingsTotal := decimal.Zero
	for _, a := range accounts {
		bal := a.OpeningBalance
		for _, t := range txnRows {
			if t.AccountID != a.ID {
				continue
			}
			if models.SavingsTxnDirection(strings.ToUpper(t.Direction)) == models.SavingsTxnDirectionDeposit {
				bal = bal.Add(t.Amount)
			} else {
				bal = bal.Sub(t.Amount)
			}
		}
		savingsTotal = savingsTotal.Add(bal)
		currentBalances = append(currentBalances, OverviewAccountBalance{
			AccountID: a.ID,
			Name:      a.Name,
			Kind:      string(a.Kind),
			Balance:   bal,
		})
	}

	// Return only the requested window of months.
	if windowMonths < 1 {
		windowMonths = 1
	}
	if windowMonths > len(allMonths) {
		windowMonths = len(allMonths)
	}
	window := allMonths[len(allMonths)-windowMonths:]

	return &FinanceOverviewResponse{
		To:       to.Format("2006-01"),
		Months:   window,
		Accounts: currentBalances,
		Summary: FinanceOverviewSummary{
			Month:           to.Format("2006-01"),
			SavingsTotal:    savingsTotal,
			OverspendTotal:  cumulativeOverspend,
			AdjustedSavings: savingsTotal.Sub(cumulativeOverspend),
			OverspentMonths: overspentMonths,
		},
	}, nil
}

// GetFinanceOverview returns monthly savings, income, spending and overspend for the user.
// Query: month=YYYY-MM (end month, default current), months=1..24 (window size, default 6).
func GetFinanceOverview(c *gin.Context) {
	userID, ok := requireUserID(c)
	if !ok {
		return
	}

	windowMonths := 6
	if raw := strings.TrimSpace(c.Query("months")); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 24 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "months must be between 1 and 24"})
			return
		}
		windowMonths = n
	}

	resp, err := ComputeFinanceOverview(database.DB, userID, c.Query("month"), windowMonths)
	if err != nil {
		if strings.Contains(err.Error(), "invalid month format") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate finance overview: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
