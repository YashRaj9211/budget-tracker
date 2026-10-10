package services

import (
	"fmt"
	"log"
	"strings"

	"splitwise-go/database"
	"splitwise-go/models"

	"github.com/bits-and-blooms/bloom/v3"
)

var UserBloomFilter *bloom.BloomFilter

func InitBloomFilter() {
	// Initialize for 1 million items with 1% false positive rate
	UserBloomFilter = bloom.NewWithEstimates(1000000, 0.01)

	var users []models.User
	// Load all existing users from database
	if err := database.DB.Select("username", "tag").Find(&users).Error; err != nil {
		log.Printf("Failed to load users for bloom filter: %v", err)
		return
	}

	for _, u := range users {
		identifier := fmt.Sprintf("%s#%s", strings.ToLower(u.Username), u.Tag)
		UserBloomFilter.AddString(identifier)
	}

	log.Printf("Bloom filter initialized with %d users", len(users))
}
