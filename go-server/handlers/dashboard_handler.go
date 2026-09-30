package handlers

import (
	"fmt"
	"net/http"
	"splitwise-go/database"
	"splitwise-go/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

func GetExpensesSummary(c *gin.Context) {
	fmt.Println("request context", c.Request.Context())
	userId := c.Param("userId")
	if userId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	// spent on me
	personalExpenses := []models.Expense{}
	result := database.DB.Where("user_id = ? AND type = 'PERSONAL'", userId).Find(&personalExpenses)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// all splits with my userId
	personalSplits := []models.ExpenseSplit{}
	result = database.DB.Where("user_id = ?", userId).Find(&personalSplits)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// I owe others (borrowed)
	splitExpenses := []models.ExpenseSplit{}
	result = database.DB.Where("user_id = ? AND expense_id NOT IN (SELECT id FROM expenses WHERE user_id = ?)", userId, userId).Find(&splitExpenses)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// others own me (lent)
	lentExpenses := []models.ExpenseSplit{}
	result = database.DB.Where("user_id != ? AND expense_id IN (SELECT id FROM expenses WHERE user_id = ?)", userId, userId).Find(&lentExpenses)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// total expenses personalExpense + personalSplits
	totalExpenses := decimal.Zero
	for _, expense := range personalExpenses {
		totalExpenses = totalExpenses.Add(expense.Amount)
	}
	for _, split := range personalSplits {
		totalExpenses = totalExpenses.Add(split.Amount)
	}

	// total borrowed
	totalSplits := decimal.Zero
	for _, split := range splitExpenses {
		totalSplits = totalSplits.Add(split.Amount)
	}

	// total lent
	totalLent := decimal.Zero
	for _, income := range lentExpenses {
		totalLent = totalLent.Add(income.Amount)
	}

	totalPersonalExpense := decimal.Zero
	for _, expense := range personalExpenses {
		totalPersonalExpense = totalPersonalExpense.Add(expense.Amount)
	}
	// total balance
	// totalBalance := totalExpenses.Add(totalSplits).Sub(totalLent)

	c.JSON(http.StatusOK, gin.H{
		"totalExpenses":    totalExpenses,
		"personalExpenses": totalPersonalExpense,
		"totalBorrowed":    totalSplits,
		"totalLent":        totalLent,
	})

}

type PayerInfo struct {
	ID       string `json:"id"`
	Username string `json:"username"`
}

type DailySpendStat struct {
	Date     string    `json:"date"`
	Day      string    `json:"day"` // Mon, Tue, etc
	Personal float64   `json:"personal"`
	Borrowed float64   `json:"borrowed"`
	Lent     float64   `json:"lent"`
	Total    float64   `json:"total"`
	FullDate time.Time `json:"-"`
}

func GetDailySpendOverview(c *gin.Context) {
	userId := c.Param("userId")
	period := c.DefaultQuery("period", "MONTH") // WEEK or MONTH
	if userId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	// Determine date range
	now := time.Now()
	var startDate time.Time
	if period == "WEEK" {
		startDate = now.AddDate(0, 0, -6) // Last 7 days including today
	} else {
		startDate = now.AddDate(0, 0, -29) // Last 30 days including today
	}
	// Normalize to start of day
	startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, startDate.Location())

	// Temp struct to hold decimals during calculation
	type TempStat struct {
		Personal decimal.Decimal
		Borrowed decimal.Decimal
		Lent     decimal.Decimal
		Total    decimal.Decimal
	}
	tempStatsMap := make(map[string]*TempStat)

	// Initialize map for all dates
	for d := startDate; !d.After(now); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		tempStatsMap[dateStr] = &TempStat{
			Personal: decimal.Zero,
			Borrowed: decimal.Zero,
			Lent:     decimal.Zero,
			Total:    decimal.Zero,
		}
	}

	// 1. Personal Expenses
	var personalExpenses []models.Expense
	if err := database.DB.Where("user_id = ? AND type = 'PERSONAL' AND created_at >= ?", userId, startDate).Find(&personalExpenses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, e := range personalExpenses {
		dateStr := e.CreatedAt.Format("2006-01-02")
		if stat, exists := tempStatsMap[dateStr]; exists {
			stat.Personal = stat.Personal.Add(e.Amount)
			stat.Total = stat.Total.Add(e.Amount)
		}
	}

	// 2. Splits (Borrowed & Lent)
	var splits []models.ExpenseSplit
	if err := database.DB.Preload("Expense").
		Joins("JOIN expenses ON expenses.id = expense_splits.expense_id").
		Where("expense_splits.created_at >= ?", startDate).
		Where("expense_splits.user_id = ? OR expenses.user_id = ?", userId, userId).
		Find(&splits).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, s := range splits {
		dateStr := s.CreatedAt.Format("2006-01-02")
		stat, exists := tempStatsMap[dateStr]
		if !exists {
			continue
		}

		// Case A: I borrowed (User is split owner, someone else paid - Expense.UserID != UserID)
		if s.UserID == userId && s.Expense.UserID != userId {
			stat.Borrowed = stat.Borrowed.Add(s.Amount)
			stat.Total = stat.Total.Add(s.Amount) // Borrowed counts as my spending
		}

		// Case B: I lent (User is Payer, split is for someone else)
		if s.Expense.UserID == userId && s.UserID != userId {
			stat.Lent = stat.Lent.Add(s.Amount)
			// Lent money is NOT my spending (it's asset), so don't add to Total
		}

		// Case C: My share in an expense I paid for (Personal Split)
		if s.UserID == userId && s.Expense.UserID == userId {
			stat.Personal = stat.Personal.Add(s.Amount)
			stat.Total = stat.Total.Add(s.Amount)
		}
	}

	// Convert map to sorted slice with Float64 for JSON
	var result []DailySpendStat
	for d := startDate; !d.After(now); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		if temp, ok := tempStatsMap[dateStr]; ok {
			result = append(result, DailySpendStat{
				Date:     d.Format("01/02"),
				Day:      d.Format("Mon"),
				Personal: temp.Personal.InexactFloat64(),
				Borrowed: temp.Borrowed.InexactFloat64(),
				Lent:     temp.Lent.InexactFloat64(),
				Total:    temp.Total.InexactFloat64(),
				FullDate: d,
			})
		}
	}

	c.JSON(http.StatusOK, result)
}

type ExpenseBreakdownItem struct {
	ID          string             `json:"id"`
	Amount      decimal.Decimal    `json:"amount"`
	Description string             `json:"description"`
	Type        models.ExpenseType `json:"type"`
	Tag         string             `json:"tag"` // "PERSONAL", "BORROWED", "MY_SHARES"
	PaidBy      *PayerInfo         `json:"paidBy,omitempty"`
	CreatedAt   time.Time          `json:"createdAt"`
}

func GetDailyExpenseBreakdown(c *gin.Context) {
	userId := c.Param("userId")
	if userId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	var personalExpenses []models.Expense
	if err := database.DB.Where("user_id = ? AND type = 'PERSONAL'", userId).Find(&personalExpenses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var splitExpenses []models.ExpenseSplit
	if err := database.DB.Preload("Expense.User").Where("user_id = ?", userId).Find(&splitExpenses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	expenseBreakdown := make(map[string][]ExpenseBreakdownItem)

	for _, expense := range personalExpenses {
		date := expense.CreatedAt.Format("2006-01-02")
		item := ExpenseBreakdownItem{
			ID:          expense.ID,
			Amount:      expense.Amount,
			Description: expense.Description,
			Type:        expense.Type,
			Tag:         "PERSONAL",
			CreatedAt:   expense.CreatedAt,
		}
		expenseBreakdown[date] = append(expenseBreakdown[date], item)
	}

	for _, split := range splitExpenses {
		date := split.Expense.CreatedAt.Format("2006-01-02")
		tag := "MY_SHARES"
		var paidBy *PayerInfo

		if split.Expense.UserID != userId {
			tag = "BORROWED"
			if split.Expense.User != nil {
				paidBy = &PayerInfo{
					ID:       split.Expense.User.ID,
					Username: split.Expense.User.Username,
				}
			}
		}

		item := ExpenseBreakdownItem{
			ID:          split.ID,
			Amount:      split.Amount,
			Description: split.Expense.Description,
			Type:        split.Expense.Type,
			Tag:         tag,
			PaidBy:      paidBy,
			CreatedAt:   split.Expense.CreatedAt,
		}
		expenseBreakdown[date] = append(expenseBreakdown[date], item)
	}

	c.JSON(http.StatusOK, gin.H{"expenseBreakdown": expenseBreakdown})
}

type FriendBalance struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Username  string          `json:"username"`
	AvatarURL *string         `json:"avatarUrl,omitempty"`
	Amount    decimal.Decimal `json:"amount"`
}

func GetFriendsBalance(c *gin.Context) {
	userId := c.Param("userId")
	if userId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	// Map to keep track of net balance with each friend
	// Positive balance: friend owes user
	// Negative balance: user owes friend
	balances := make(map[string]decimal.Decimal)
	friendInfo := make(map[string]models.User)

	// Case 1: All splits where user is the PAYER (others owe user)
	var lentSplits []models.ExpenseSplit
	if err := database.DB.Preload("User").
		Joins("JOIN expenses ON expenses.id = expense_splits.expense_id").
		Where("expenses.user_id = ? AND expense_splits.user_id != ? AND expense_splits.is_paid = false", userId, userId).
		Find(&lentSplits).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, split := range lentSplits {
		balances[split.UserID] = balances[split.UserID].Add(split.Amount)
		if _, exists := friendInfo[split.UserID]; !exists && split.User != nil {
			friendInfo[split.UserID] = *split.User
		}
	}

	// Case 2: All splits where user is the BORROWER (user owes others)
	var borrowedSplits []models.ExpenseSplit
	if err := database.DB.Preload("Expense.User").
		Where("expense_splits.user_id = ? AND expense_splits.is_paid = false", userId).
		Find(&borrowedSplits).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, split := range borrowedSplits {
		if split.Expense.UserID != userId {
			payerID := split.Expense.UserID
			balances[payerID] = balances[payerID].Sub(split.Amount)
			if _, exists := friendInfo[payerID]; !exists && split.Expense.User != nil {
				friendInfo[payerID] = *split.Expense.User
			}
		}
	}

	// Case 3: All general payments (settle-ups)
	var payments []models.Payment
	if err := database.DB.Preload("Payer").Preload("Receiver").
		Where("(payer_id = ? OR receiver_id = ?) AND expense_id IS NULL", userId, userId).Find(&payments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, payment := range payments {
		if payment.PayerID == userId {
			// I paid them, they owe me back or I owe them less
			balances[payment.ReceiverID] = balances[payment.ReceiverID].Add(payment.Amount)
			if _, exists := friendInfo[payment.ReceiverID]; !exists {
				friendInfo[payment.ReceiverID] = payment.Receiver
			}
		} else {
			// They paid me, I owe them back or they owe me less
			balances[payment.PayerID] = balances[payment.PayerID].Sub(payment.Amount)
			if _, exists := friendInfo[payment.PayerID]; !exists {
				friendInfo[payment.PayerID] = payment.Payer
			}
		}
	}

	youOwe := []FriendBalance{}
	owesYou := []FriendBalance{}

	for friendID, balance := range balances {
		if balance.IsZero() {
			continue
		}

		info := friendInfo[friendID]
		item := FriendBalance{
			ID:        friendID,
			Name:      info.Name,
			Username:  info.Username,
			AvatarURL: info.AvatarURL,
			Amount:    balance.Abs(),
		}

		if balance.IsPositive() {
			owesYou = append(owesYou, item)
		} else {
			youOwe = append(youOwe, item)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"youOwe":  youOwe,
		"owesYou": owesYou,
	})
}
