package handlers

import (
	"log"
	"net/http"
	"splitwise-go/database"
	"splitwise-go/models"
	"splitwise-go/services"
	"splitwise-go/websocket"

	"github.com/gin-gonic/gin"
)

type SendFriendshipRequestBody struct {
	Email string `json:"email" binding:"required"`
}

func SendFriendshipRequest(c *gin.Context) {
	var body SendFriendshipRequestBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	targetUser := models.User{}
	if err := database.DB.Where("email = ?", body.Email).First(&targetUser).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User with this email not found"})
		return
	}

	currentUserId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	targetUserId := targetUser.ID

	if targetUserId == currentUserId.(string) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot add yourself as a friend"})
		return
	}

	var count int64
	database.DB.Model(&models.Friendship{}).Where(
		"(user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
		targetUserId, currentUserId, currentUserId, targetUserId,
	).Count(&count)

	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Friendship request already exists or you are already friends"})
		return
	}

	// Storing as: UserID = Receiver, FriendID = Sender
	friendship := models.Friendship{
		UserID:   targetUserId,
		FriendID: currentUserId.(string),
		Status:   models.FriendshipStatusPending,
	}

	if err := database.DB.Create(&friendship).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create friendship"})
		return
	}

	// Notify the receiver they have a new friend request
	websocket.AppHub.BroadcastToUsers(
		[]string{targetUserId},
		[]byte(`{"event":"FRIEND_REQUEST_RECEIVED"}`),
	)

	// Send email notification to target user
	var sender models.User
	if err := database.DB.Where("id = ?", currentUserId.(string)).First(&sender).Error; err == nil {
		go func(toEmail, toName, senderName, senderEmail string) {
			if err := services.SendFriendRequestEmail(toEmail, toName, senderName, senderEmail); err != nil {
				log.Printf("Failed to send friend request email to %s: %v", toEmail, err)
			}
		}(targetUser.Email, targetUser.Name, sender.Name, sender.Email)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Friendship request sent successfully"})
}

func GetFriendships(c *gin.Context) {
	userId, _ := c.Get("userId")

	var friendships []models.Friendship
	if err := database.DB.
		Preload("User").
		Preload("Friend").
		Where("user_id = ? OR friend_id = ?", userId, userId).
		Find(&friendships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch friendships"})
		return
	}

	c.JSON(http.StatusOK, friendships)
}

// FriendResult is the normalized shape returned by GetFriends.
type FriendResult struct {
	ID       string `json:"id"`
	UserID   string `json:"user_id"` // Keep for backwards compatibility
	Name     string `json:"name"`
	Username string `json:"username"`
}

// GetFriends returns only ACCEPTED friends of the current user,
// correctly handling both directions of the single-row friendship model.
// Convention: UserID = Receiver, FriendID = Sender
//
// Case 1: I am the Receiver (user_id = me) → friend is in friend_id
// Case 2: I am the Sender   (friend_id = me) → friend is in user_id
func GetFriends(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var result []FriendResult

	if err := database.DB.Raw(`
		SELECT u.id as id, u.id as user_id, u.name, u.username
		FROM friendships f
		JOIN users u ON u.id = f.friend_id
		WHERE f.user_id = ? AND f.status = 'ACCEPTED'

		UNION

		SELECT u.id as id, u.id as user_id, u.name, u.username
		FROM friendships f
		JOIN users u ON u.id = f.user_id
		WHERE f.friend_id = ? AND f.status = 'ACCEPTED'
	`, userId, userId).Scan(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch friends"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func AcceptFriendship(c *gin.Context) {
	currentUserId, _ := c.Get("userId")
	targetFriendId := c.Param("friendId") // ID of the User who sent the request (Sender = FriendID)

	var friendship models.Friendship
	// Convention: UserID = Receiver (me), FriendID = Sender (them)
	if err := database.DB.Where(
		"user_id = ? AND friend_id = ? AND status = ?",
		currentUserId, targetFriendId, models.FriendshipStatusPending,
	).First(&friendship).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Friendship request not found"})
		return
	}

	friendship.Status = models.FriendshipStatusAccepted
	if err := database.DB.Save(&friendship).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept friendship"})
		return
	}

	// Notify both users — sender knows their request was accepted,
	// receiver (me) gets a refetch so the friend appears in their list too
	websocket.AppHub.BroadcastToUsers(
		[]string{currentUserId.(string), targetFriendId},
		[]byte(`{"event":"FRIEND_REQUEST_ACCEPTED"}`),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Friendship accepted successfully"})
}

func RejectFriendship(c *gin.Context) {
	currentUserId, _ := c.Get("userId")
	targetFriendId := c.Param("friendId") // ID of the User who sent the request (Sender = FriendID)

	// Convention: UserID = Receiver (me), FriendID = Sender (them)
	result := database.DB.Where(
		"user_id = ? AND friend_id = ? AND status = ?",
		currentUserId, targetFriendId, models.FriendshipStatusPending,
	).Delete(&models.Friendship{})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject friendship"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Friendship request not found"})
		return
	}

	// Notify the sender their request was rejected so they can update their UI
	websocket.AppHub.BroadcastToUsers(
		[]string{targetFriendId},
		[]byte(`{"event":"FRIEND_REQUEST_REJECTED"}`),
	)

	c.JSON(http.StatusOK, gin.H{"message": "Friendship request rejected"})
}