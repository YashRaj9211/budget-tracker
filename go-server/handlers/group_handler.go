package handlers

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"splitwise-go/database"
	"splitwise-go/functions"
	"splitwise-go/models"
	
	"github.com/shopspring/decimal"
)

type CreateGroupBody struct {
	Name          string  `json:"name" binding:"required"`
	Description   string  `json:"description" binding:"required"`
	SimplifyDebts *bool   `json:"simplifyDebts" binding:"required"`
	ImageURL      *string `json:"imageUrl" binding:"omitempty"`
}

func CreateGroup(c *gin.Context) {
	userId := c.Param("userId")
	if userId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	var body CreateGroupBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group := models.Group{
		Name:          body.Name,
		Description:   &body.Description,
		SimplifyDebts: *body.SimplifyDebts,
		ImageURL:      body.ImageURL,
	}

	if err := database.DB.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Make creator the first member automatically
	member := models.GroupMember{
		GroupID: group.ID,
		UserID:  userId,
		Role:    "ADMIN",
	}
	database.DB.Create(&member)

	c.JSON(http.StatusOK, group)
}

func AddGroupMember(c *gin.Context) {
	groupId := c.Param("groupId")
	userId := c.Param("userId") //id od user who need to be added to the group
	
	//check if user is already a member of the group
	groupMember := models.GroupMember{}
	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, userId).Find(&groupMember).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User is already a member of the group"})
		return
	}

	group := models.Group{}
	if err := database.DB.Where("id = ?", groupId).Find(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	group.Members = append(group.Members, models.GroupMember{GroupID: groupId, UserID: 	userId})

	if err := database.DB.Save(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add group member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group member added successfully"})
}

func GetUserGroups(c *gin.Context) {
	userId := c.Param("userId")

	groupsLists := []models.Group{}

	if err := database.DB.
		Joins("JOIN group_members ON group_members.group_id = groups.id").
		Where("group_members.user_id = ?", userId).
		Find(&groupsLists).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Groups not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"groups": groupsLists})
}

func GetGroupExpenses(c *gin.Context) {
	groupId := c.Param("groupId")

	group := models.Group{}
	if err := database.DB.Where("id = ?", groupId).Find(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	var expensesLists []models.Expense // Use var to ensure slice type

	query := database.DB.
		Preload("Splits.User").
		Preload("Splits").
		Preload("User"). // Preload Payer
		Where("group_id = ?", groupId).
		Order("expense_date desc")

	if err := query.Find(&expensesLists).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expenses not found"})
		return
	}

	if group.SimplifyDebts {
		functions.SimplifyDebts(&expensesLists)
	}

	c.JSON(http.StatusOK, expensesLists) // Return expenses list directly to match common API patterns
}

func ToggleGroupSimplify(c *gin.Context) {
	groupId := c.Param("groupId")

	group := models.Group{}
	if err := database.DB.Where("id = ?", groupId).Find(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	group.SimplifyDebts = !group.SimplifyDebts

	if err := database.DB.Save(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group simplified debts toggle updated successfully"})
}

func GetGroupMembers(c *gin.Context) {
	groupId := c.Param("groupId")

	group := models.Group{}
	if err := database.DB.Preload("Members").Preload("Members.User").Where("id = ?", groupId).First(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	c.JSON(http.StatusOK, group.Members)
}

func RemoveGroupMember(c *gin.Context) {
	groupId := c.Param("groupId")
	userId := c.Param("userId")

	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, userId).Delete(&models.GroupMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove group member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group member removed successfully"})
}

func LeaveGroup(c *gin.Context) {
	groupId := c.Param("groupId")
	userId := c.Param("userId")

	// Calculate net balance for this user strictly within this group
	var lentSplits []models.ExpenseSplit
	if err := database.DB.
		Joins("JOIN expenses ON expenses.id = expense_splits.expense_id").
		Where("expenses.group_id = ? AND expenses.user_id = ? AND expense_splits.user_id != ? AND expense_splits.is_paid = false", groupId, userId, userId).
		Find(&lentSplits).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var borrowedSplits []models.ExpenseSplit
	if err := database.DB.
		Joins("JOIN expenses ON expenses.id = expense_splits.expense_id").
		Where("expenses.group_id = ? AND expense_splits.user_id = ? AND expense_splits.is_paid = false AND expenses.user_id != ?", groupId, userId, userId).
		Find(&borrowedSplits).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	netBalance := decimal.Zero
	for _, split := range lentSplits {
		netBalance = netBalance.Add(split.Amount)
	}
	for _, split := range borrowedSplits {
		netBalance = netBalance.Sub(split.Amount)
	}

	if !netBalance.IsZero() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot leave group with unsettled debts. Net balance within group must be 0."})
		return
	}

	// Delete group member
	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, userId).Delete(&models.GroupMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Left group successfully"})
}
