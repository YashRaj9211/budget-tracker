package handlers

import (
	"errors"
	"net/http"
	"strings"

	"splitwise-go/database"
	"splitwise-go/functions"
	"splitwise-go/models"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type CreateGroupBody struct {
	Name          string   `json:"name" binding:"required"`
	Description   *string  `json:"description" binding:"omitempty"`
	SimplifyDebts *bool    `json:"simplifyDebts" binding:"omitempty"`
	ImageURL      *string  `json:"imageUrl" binding:"omitempty"`
	MemberIDs     []string `json:"memberIds" binding:"omitempty"`
}

func CreateGroup(c *gin.Context) {
	userIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdVal.(string)

	var body CreateGroupBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if strings.TrimSpace(body.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	// Initial members must be the creator's accepted friends (no adding people without consent).
	friends, err := acceptedFriendSet(database.DB, userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	memberIDs := make([]string, 0, len(body.MemberIDs))
	seen := map[string]bool{userId: true}
	for _, mID := range body.MemberIDs {
		if mID == "" || seen[mID] {
			continue
		}
		if !friends[mID] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "You can only add accepted friends to a group"})
			return
		}
		seen[mID] = true
		memberIDs = append(memberIDs, mID)
	}

	var simplifyDebts bool
	if body.SimplifyDebts != nil {
		simplifyDebts = *body.SimplifyDebts
	}

	var description *string
	if body.Description != nil {
		trimmed := strings.TrimSpace(*body.Description)
		if trimmed != "" {
			description = &trimmed
		}
	}

	group := models.Group{
		Name:          strings.TrimSpace(body.Name),
		Description:   description,
		SimplifyDebts: simplifyDebts,
		ImageURL:      body.ImageURL,
	}

	// Group + all members are created together, or not at all.
	txErr := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&group).Error; err != nil {
			return err
		}
		// Creator is the first member (ADMIN)
		if err := tx.Create(&models.GroupMember{GroupID: group.ID, UserID: userId, Role: "ADMIN"}).Error; err != nil {
			return err
		}
		for _, mID := range memberIDs {
			if err := tx.Create(&models.GroupMember{GroupID: group.ID, UserID: mID, Role: "MEMBER"}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if txErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group: " + txErr.Error()})
		return
	}

	// Reload with members and their user profiles
	var loadedGroup models.Group
	database.DB.Preload("Members.User").First(&loadedGroup, "id = ?", group.ID)

	c.JSON(http.StatusOK, loadedGroup)
}

func AddGroupMember(c *gin.Context) {
	groupId := c.Param("groupId")
	userId := c.Param("userId") // id of user who needs to be added to the group
	if groupId == "" || userId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "groupId and userId are required"})
		return
	}

	currentUserIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	currentUserId := currentUserIdVal.(string)

	// Check that the requester is a member/admin of the group
	var requesterMember models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, currentUserId).First(&requesterMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only group members can add members"})
		return
	}

	// Check if user to be added is already a member
	var existingMember models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, userId).First(&existingMember).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is already a member of the group"})
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	group := models.Group{}
	if err := database.DB.Where("id = ?", groupId).First(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	// Only accepted friends of the requester can be added (no adding people without consent).
	friends, err := acceptedFriendSet(database.DB, currentUserId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !friends[userId] {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only add accepted friends to a group"})
		return
	}

	newMember := models.GroupMember{GroupID: groupId, UserID: userId, Role: "MEMBER"}
	if err := database.DB.Create(&newMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add group member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group member added successfully"})
}

func GetUserGroups(c *gin.Context) {
	userIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdVal.(string)

	groupsLists := []models.Group{}

	if err := database.DB.
		Preload("Members.User").
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
	if groupId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "groupId is required"})
		return
	}

	currentUserIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	currentUserId := currentUserIdVal.(string)

	var member models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, currentUserId).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You must be a member of this group to view its expenses"})
		return
	}

	group := models.Group{}
	if err := database.DB.Where("id = ?", groupId).First(&group).Error; err != nil {
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
	if groupId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "groupId is required"})
		return
	}

	currentUserIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	currentUserId := currentUserIdVal.(string)

	var member models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, currentUserId).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You must be a member of this group to toggle settings"})
		return
	}

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
	if groupId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "groupId is required"})
		return
	}

	currentUserIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	currentUserId := currentUserIdVal.(string)

	var member models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, currentUserId).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You must be a member of this group to view its members"})
		return
	}

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
	if groupId == "" || userId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "groupId and userId are required"})
		return
	}

	currentUserIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	currentUserId := currentUserIdVal.(string)

	// Requester must be an ADMIN of the group
	var adminMember models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ? AND role = ?", groupId, currentUserId, "ADMIN").First(&adminMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only group admins can remove members"})
		return
	}

	var target models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, userId).First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "That user is not a member of this group"})
		return
	}

	// A group must never be left without an admin.
	if target.Role == "ADMIN" {
		var admins int64
		database.DB.Model(&models.GroupMember{}).Where("group_id = ? AND role = ?", groupId, "ADMIN").Count(&admins)
		if admins <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove the last admin. Make another member an admin first."})
			return
		}
	}

	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, userId).Delete(&models.GroupMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove group member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group member removed successfully"})
}

func LeaveGroup(c *gin.Context) {
	groupId := c.Param("groupId")
	userIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdVal.(string)

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

	var me models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ?", groupId, userId).First(&me).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "You are not a member of this group"})
		return
	}

	// Leave, and if the last admin leaves, hand admin to the longest-standing member.
	promoted := false
	txErr := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("group_id = ? AND user_id = ?", groupId, userId).Delete(&models.GroupMember{}).Error; err != nil {
			return err
		}
		if me.Role != "ADMIN" {
			return nil
		}
		var admins int64
		if err := tx.Model(&models.GroupMember{}).Where("group_id = ? AND role = ?", groupId, "ADMIN").Count(&admins).Error; err != nil {
			return err
		}
		if admins > 0 {
			return nil
		}
		var next models.GroupMember
		err := tx.Where("group_id = ?", groupId).Order("joined_at asc").First(&next).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil // nobody left in the group
		}
		if err != nil {
			return err
		}
		promoted = true
		return tx.Model(&models.GroupMember{}).Where("id = ?", next.ID).Update("role", "ADMIN").Error
	})
	if txErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave group"})
		return
	}

	msg := "Left group successfully"
	if promoted {
		msg += ". Another member was made admin."
	}
	c.JSON(http.StatusOK, gin.H{"message": msg})
}

func DeleteGroup(c *gin.Context) {
	groupId := c.Param("groupId")
	if groupId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "groupId is required"})
		return
	}

	currentUserIdVal, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	currentUserId := currentUserIdVal.(string)

	// Requester must be an ADMIN of the group
	var adminMember models.GroupMember
	if err := database.DB.Where("group_id = ? AND user_id = ? AND role = ?", groupId, currentUserId, "ADMIN").First(&adminMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only group admins can delete the group"})
		return
	}

	// Delete group (cascade deletes members and sets groupId to null on expenses)
	if err := database.DB.Where("id = ?", groupId).Delete(&models.Group{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Group deleted successfully"})
}

// GetSplitOverview returns every group the caller belongs to plus all of those groups'
// expenses in ONE response (instead of one request per group).
func GetSplitOverview(c *gin.Context) {
	userId, ok := requireUserID(c)
	if !ok {
		return
	}

	groups := []models.Group{}
	if err := database.DB.
		Preload("Members.User").
		Joins("JOIN group_members ON group_members.group_id = groups.id").
		Where("group_members.user_id = ?", userId).
		Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	expenses := []models.Expense{}
	groupIDs := make([]string, 0, len(groups))
	for _, g := range groups {
		groupIDs = append(groupIDs, g.ID)
	}

	query := database.DB.Preload("Splits.User").Preload("User")
	if len(groupIDs) > 0 {
		query = query.Where("group_id IN ? OR (group_id IS NULL AND (expenses.user_id = ? OR expenses.id IN (SELECT expense_id FROM expense_splits WHERE user_id = ?)))", groupIDs, userId, userId)
	} else {
		query = query.Where("group_id IS NULL AND (expenses.user_id = ? OR expenses.id IN (SELECT expense_id FROM expense_splits WHERE user_id = ?))", userId, userId)
	}

	if err := query.Order("expense_date desc").Find(&expenses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"groups": groups, "expenses": expenses})
}
