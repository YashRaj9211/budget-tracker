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

	// Auto-seed defaults if table is empty
	if len(categories) == 0 {
		defaults := []struct{ name, color string }{
			{"Food", "#8ecae6"},
			{"Travel", "#b8b5ff"},
			{"Entertainment", "#ffe5a5"},
			{"Utilities", "#b7e4c7"},
			{"Shopping", "#ffc8dd"},
			{"Health", "#ffb4a2"},
			{"Rent", "#a8dadc"},
			{"Groceries", "#90e0ef"},
			{"Bills", "#cbd5e1"},
			{"Other", "#94a3b8"},
		}
		for _, d := range defaults {
			cat := models.Category{
				Name:  d.name,
				Color: &d.color,
			}
			database.DB.Where("name = ?", d.name).FirstOrCreate(&cat)
		}
		database.DB.Order("name ASC").Find(&categories)
	}

	c.JSON(http.StatusOK, categories)
}
