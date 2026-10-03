package handlers

import (
	"errors"
	"net/http"
	"splitwise-go/database"
	"splitwise-go/models"
	"splitwise-go/websocket"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func CreateExpense(c *gin.Context) {
	userIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdVal.(string)

	var input models.Expense
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// In Splitwise, user_id on the Expense represents the PAYER.
	// The payer defaults to the caller; someone else may be the payer only inside a
	// group where both are members (checked in authorizeExpense).
	sanitizeExpenseInput(&input)
	if input.UserID == "" {
		input.UserID = userId
	}

	// Validates amounts/splits. PERSONAL and INCOME expenses never keep splits, which
	// prevents the dashboard counting them twice.
	if herr := validateExpenseShape(&input); herr != nil {
		respondError(c, herr)
		return
	}
	if herr := authorizeExpense(database.DB, userId, &input); herr != nil {
		respondError(c, herr)
		return
	}

	// Default date if not provided
	if input.ExpenseDate.IsZero() {
		input.ExpenseDate = time.Now()
	}

	// Use Transaction for atomicity
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Create expense and its splits (GORM handles nested creation)
		if err := tx.Create(&input).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expense: " + err.Error()})
		return
	}

	// Reload the expense with associations to return full object
	var createdExpense models.Expense
	if err := database.DB.
		Preload("Splits.User").
		Preload("Category"). // Future-ready: Category support
		Preload("Group").
		First(&createdExpense, "id = ?", input.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load created expense: " + err.Error()})
		return
	}

	// Broadcast to relevant users
	userIDs := make(map[string]bool)
	userIDs[createdExpense.UserID] = true
	userIDs[userId] = true
	for _, s := range createdExpense.Splits {
		userIDs[s.UserID] = true
	}
	if createdExpense.GroupID != nil {
		var gMembers []string
		database.DB.Model(&models.GroupMember{}).Where("group_id = ?", *createdExpense.GroupID).Pluck("user_id", &gMembers)
		for _, mid := range gMembers {
			userIDs[mid] = true
		}
	}

	// Include accepted friends of the creator so both sides always get the update
	var friendRows []struct {
		UserID string
	}
	database.DB.Raw(`
    	SELECT u.id as user_id FROM friendships f
    	JOIN users u ON u.id = f.friend_id
    	WHERE f.user_id = ? AND f.status = 'ACCEPTED'
    	UNION
    	SELECT u.id as user_id FROM friendships f
    	JOIN users u ON u.id = f.user_id
    	WHERE f.friend_id = ? AND f.status = 'ACCEPTED'
	`, createdExpense.UserID, createdExpense.UserID).Scan(&friendRows)

	for _, f := range friendRows {
		userIDs[f.UserID] = true
	}

	var targets []string
	for id := range userIDs {
		targets = append(targets, id)
	}
	websocket.AppHub.BroadcastToUsers(targets, []byte(`{"event":"REFETCH_EXPENSES"}`))

	c.JSON(http.StatusCreated, createdExpense)
}

func SettleExpense(c *gin.Context) {
	splitId := c.Param("splitId")
	userIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdVal.(string)
	if splitId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "splitId is required"})
		return
	}

	var expenseSplit models.ExpenseSplit
	if err := database.DB.Where("id = ? AND user_id = ?", splitId, userId).First(&expenseSplit).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Split not found (you can only settle your own share)"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to settle expense"})
		return
	}

	if err := database.DB.Model(&expenseSplit).Update("is_paid", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update split"})
		return
	}

	var exp models.Expense
	if err := database.DB.Where("id = ?", expenseSplit.ExpenseID).First(&exp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find expense"})
		return
	}

	// Collect creator + settler + both their friends
	userIDs := make(map[string]bool)
	userIDs[userId] = true
	userIDs[exp.UserID] = true

	var friendRows []struct{ UserID string }
	database.DB.Raw(`
		SELECT u.id as user_id FROM friendships f
		JOIN users u ON u.id = f.friend_id
		WHERE f.user_id IN (?, ?) AND f.status = 'ACCEPTED'
		UNION
		SELECT u.id as user_id FROM friendships f
		JOIN users u ON u.id = f.user_id
		WHERE f.friend_id IN (?, ?) AND f.status = 'ACCEPTED'
	`, exp.UserID, userId, exp.UserID, userId).Scan(&friendRows)

	for _, f := range friendRows {
		userIDs[f.UserID] = true
	}

	var targets []string
	for id := range userIDs {
		targets = append(targets, id)
	}
	websocket.AppHub.BroadcastToUsers(targets, []byte(`{"event":"REFETCH_EXPENSES"}`))

	c.JSON(http.StatusOK, gin.H{"message": "Expense settled successfully", "split": expenseSplit})
}

func GetUserExpenses(c *gin.Context) {
	userIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdVal.(string)

	var expenses []models.Expense

	result := database.DB.
		Omit("User").
		Omit("Splits.expenseId").
		Omit("Splits.expense").
		Omit("Splits.User.phone").
		Omit("Splits.User.createdAt").
		Omit("Splits.User.updatedAt").
		Preload("Splits.User").
		Preload("Splits").
		Joins("LEFT JOIN expense_splits ON expense_splits.expense_id = expenses.id").
		Where("expenses.user_id = ? OR expense_splits.user_id = ?", userId, userId).
		Group("expenses.id"). // Deduplicate because of join
		Order("expenses.expense_date desc").
		Find(&expenses)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, expenses)
}

func DeleteExpense(c *gin.Context) {
	expenseId := c.Param("expenseId")
	if expenseId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expenseId is required"})
		return
	}

	currentUserIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	currentUserId := currentUserIdVal.(string)

	// Load before deleting so we can notify relevant users
	var expense models.Expense
	if err := database.DB.Preload("Splits").Where("id = ?", expenseId).First(&expense).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	allowed, err := canModifyExpense(database.DB, currentUserId, &expense)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !allowed {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to delete this expense"})
		return
	}

	if err := database.DB.Where("id = ?", expenseId).Delete(&models.Expense{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense: " + err.Error()})
		return
	}

	// Notify creator + split users + group members + friends
	userIDs := make(map[string]bool)
	userIDs[expense.UserID] = true
	userIDs[currentUserId] = true
	for _, s := range expense.Splits {
		userIDs[s.UserID] = true
	}
	if expense.GroupID != nil {
		var gMembers []string
		database.DB.Model(&models.GroupMember{}).Where("group_id = ?", *expense.GroupID).Pluck("user_id", &gMembers)
		for _, mid := range gMembers {
			userIDs[mid] = true
		}
	}

	var friendRows []struct{ UserID string }
	database.DB.Raw(`
		SELECT u.id as user_id FROM friendships f
		JOIN users u ON u.id = f.friend_id
		WHERE f.user_id = ? AND f.status = 'ACCEPTED'
		UNION
		SELECT u.id as user_id FROM friendships f
		JOIN users u ON u.id = f.user_id
		WHERE f.friend_id = ? AND f.status = 'ACCEPTED'
	`, expense.UserID, expense.UserID).Scan(&friendRows)

	for _, f := range friendRows {
		userIDs[f.UserID] = true
	}

	var targets []string
	for id := range userIDs {
		targets = append(targets, id)
	}
	websocket.AppHub.BroadcastToUsers(targets, []byte(`{"event":"REFETCH_EXPENSES"}`))

	c.JSON(http.StatusOK, gin.H{"message": "Expense deleted successfully"})
}

func UpdateExpense(c *gin.Context) {
	expenseId := c.Param("expenseId")
	if expenseId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expenseId is required"})
		return
	}

	currentUserIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	currentUserId := currentUserIdVal.(string)

	var input models.Expense
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingExpense models.Expense
	if err := database.DB.Preload("Splits").First(&existingExpense, "id = ?", expenseId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	allowed, permErr := canModifyExpense(database.DB, currentUserId, &existingExpense)
	if permErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": permErr.Error()})
		return
	}
	if !allowed {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update this expense"})
		return
	}

	// Validate the NEW state the same way as creation. The payer stays the same unless
	// a new (authorized) payer is provided.
	sanitizeExpenseInput(&input)
	if input.UserID == "" {
		input.UserID = existingExpense.UserID
	}
	if herr := validateExpenseShape(&input); herr != nil {
		respondError(c, herr)
		return
	}
	if herr := authorizeExpense(database.DB, currentUserId, &input); herr != nil {
		respondError(c, herr)
		return
	}

	// Transaction for atomicity
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Update primary fields
		existingExpense.Amount = input.Amount
		existingExpense.Description = input.Description
		existingExpense.Note = input.Note
		existingExpense.Type = input.Type
		if !input.ExpenseDate.IsZero() {
			existingExpense.ExpenseDate = input.ExpenseDate
		}
		existingExpense.CategoryID = input.CategoryID
		existingExpense.GroupID = input.GroupID
		existingExpense.UserID = input.UserID // already authorized above

		// Delete ALL existing splits for this expense
		if err := tx.Where("expense_id = ?", expenseId).Delete(&models.ExpenseSplit{}).Error; err != nil {
			return err
		}

		// If PERSONAL, splits stay empty. If SPLIT, we replace with incoming splits.
		if existingExpense.Type != "PERSONAL" && len(input.Splits) > 0 {
			for i := range input.Splits {
				input.Splits[i].ExpenseID = expenseId
				input.Splits[i].ID = "" // Ensure BeforeCreate generates new IDs
			}
			if err := tx.Create(&input.Splits).Error; err != nil {
				return err
			}
			existingExpense.Splits = input.Splits
		} else {
			existingExpense.Splits = nil
		}

		// Save top-level expense fields
		if err := tx.Save(&existingExpense).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expense: " + err.Error()})
		return
	}

	// Reload the updated expense with all details
	var updatedExpense models.Expense
	if err := database.DB.
		Preload("Splits.User").
		Preload("Category").
		Preload("Group").
		First(&updatedExpense, "id = ?", expenseId).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated expense: " + err.Error()})
		return
	}

	// Notify all users who were/are relevant to this expense
	userIDs := make(map[string]bool)
	userIDs[updatedExpense.UserID] = true
	userIDs[currentUserId] = true
	for _, s := range updatedExpense.Splits {
		userIDs[s.UserID] = true
	}
	if updatedExpense.GroupID != nil {
		var gMembers []string
		database.DB.Model(&models.GroupMember{}).Where("group_id = ?", *updatedExpense.GroupID).Pluck("user_id", &gMembers)
		for _, mid := range gMembers {
			userIDs[mid] = true
		}
	}

	// Also notify userIDs that were in the OLD version if they were removed
	for _, s := range existingExpense.Splits {
		userIDs[s.UserID] = true
	}

	var friendRows []struct{ UserID string }
	database.DB.Raw(`
    	SELECT u.id as user_id FROM friendships f
    	JOIN users u ON u.id = f.friend_id
    	WHERE f.user_id = ? AND f.status = 'ACCEPTED'
    	UNION
    	SELECT u.id as user_id FROM friendships f
    	JOIN users u ON u.id = f.user_id
    	WHERE f.friend_id = ? AND f.status = 'ACCEPTED'
	`, updatedExpense.UserID, updatedExpense.UserID).Scan(&friendRows)

	for _, f := range friendRows {
		userIDs[f.UserID] = true
	}

	var targets []string
	for id := range userIDs {
		targets = append(targets, id)
	}
	websocket.AppHub.BroadcastToUsers(targets, []byte(`{"event":"REFETCH_EXPENSES"}`))

	c.JSON(http.StatusOK, updatedExpense)
}
