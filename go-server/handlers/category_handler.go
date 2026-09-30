package handlers

import (
	"net/http"

	"splitwise-go/database"
	"splitwise-go/models"

	"github.com/gin-gonic/gin"
)

// GetCategories lists every category (they are shared by all users), sorted by name.
func GetCategories(c *gin.Context) {
	if _, ok := requireUserID(c); !ok {
		return
	}
	categories := []models.Category{}
	if err := database.DB.Order("name ASC").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categories)
}
