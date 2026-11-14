package handlers

import (
	"net/http"
	"splitwise-go/database"
	"splitwise-go/models"
	"splitwise-go/utils"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type CreateBudgetInput struct {
	ID             string          `json:"id"`
	Amount         decimal.Decimal `json:"amount" binding:"required"`
	Period         string          `json:"period"`
	StartDate      string          `json:"startDate" binding:"required"`
	EndDate        string          `json:"endDate" binding:"required"`
	CategoryID     *string         `json:"categoryId"`
	AlertThreshold int             `json:"alertThreshold"`
}

type UpdateBudgetInput struct {
	Amount         *decimal.Decimal `json:"amount"`
	Period         *string          `json:"period"`
	StartDate      *string          `json:"startDate"`
	EndDate        *string          `json:"endDate"`
	CategoryID     *string          `json:"categoryId"`
	AlertThreshold *int             `json:"alertThreshold"`
}

func GetBudgets(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	var budgets []models.Budget
	if err := database.DB.Where("user_id = ?", userId).Order("start_date desc").Find(&budgets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch budgets: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, budgets)
}

func CreateBudget(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	var input CreateBudgetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !input.Amount.GreaterThan(decimal.Zero) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be greater than 0"})
		return
	}

	start, err := time.Parse("2006-01-02", input.StartDate)
	if err != nil {
		// Try RFC3339 fallback
		start, err = time.Parse(time.RFC3339, input.StartDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid startDate format, expected YYYY-MM-DD"})
			return
		}
	}

	end, err := time.Parse("2006-01-02", input.EndDate)
	if err != nil {
		end, err = time.Parse(time.RFC3339, input.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid endDate format, expected YYYY-MM-DD"})
			return
		}
	}

	budgetId := input.ID
	if budgetId == "" {
		budgetId = utils.GenerateUUID("")
	}

	period := models.BudgetPeriodMonthly
	if input.Period != "" {
		period = models.BudgetPeriod(input.Period)
	}

	budget := models.Budget{
		ID:         budgetId,
		UserID:     userId,
		CategoryID: input.CategoryID,
		Amount:     input.Amount,
		Period:     period,
		StartDate:  start,
		EndDate:    end,
	}

	// Upsert: If the budget with this ID already exists, update it
	var existing models.Budget
	if err := database.DB.Where("id = ? AND user_id = ?", budgetId, userId).First(&existing).Error; err == nil {
		existing.Amount = budget.Amount
		existing.StartDate = budget.StartDate
		existing.EndDate = budget.EndDate
		existing.CategoryID = budget.CategoryID
		existing.Period = budget.Period
		if err := database.DB.Save(&existing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update existing budget: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, existing)
		return
	}

	if err := database.DB.Create(&budget).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create budget: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, budget)
}

func UpdateBudget(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	budgetId := c.Param("budgetId")
	if budgetId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "budgetId is required"})
		return
	}

	var budget models.Budget
	if err := database.DB.Where("id = ? AND user_id = ?", budgetId, userId).First(&budget).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Budget not found"})
		return
	}

	var input UpdateBudgetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Amount != nil {
		if !input.Amount.GreaterThan(decimal.Zero) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "amount must be greater than 0"})
			return
		}
		budget.Amount = *input.Amount
	}

	if input.StartDate != nil {
		start, err := time.Parse("2006-01-02", *input.StartDate)
		if err != nil {
			start, err = time.Parse(time.RFC3339, *input.StartDate)
		}
		if err == nil {
			budget.StartDate = start
		}
	}

	if input.EndDate != nil {
		end, err := time.Parse("2006-01-02", *input.EndDate)
		if err != nil {
			end, err = time.Parse(time.RFC3339, *input.EndDate)
		}
		if err == nil {
			budget.EndDate = end
		}
	}

	if input.CategoryID != nil {
		budget.CategoryID = input.CategoryID
	}

	if input.Period != nil {
		budget.Period = models.BudgetPeriod(*input.Period)
	}

	if err := database.DB.Save(&budget).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update budget: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, budget)
}

func DeleteBudget(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	budgetId := c.Param("budgetId")
	if budgetId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "budgetId is required"})
		return
	}

	res := database.DB.Where("id = ? AND user_id = ?", budgetId, userId).Delete(&models.Budget{})
	if res.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete budget: " + res.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Budget deleted successfully"})
}
