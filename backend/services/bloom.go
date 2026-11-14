package services

import (
	"log"
	"regexp"
	"strings"
	"sync"

	"splitwise-go/database"
	"splitwise-go/models"

	"github.com/bits-and-blooms/bloom/v3"
)

// UserBloomFilter holds every registered (lowercased) username. A negative
// answer is definitive, so most availability checks never touch the database;
// a positive answer may be a false positive and is confirmed against the DB.
var (
	UserBloomFilter *bloom.BloomFilter
	bloomMu         sync.RWMutex
)

var usernameRe = regexp.MustCompile(`^[a-z0-9_]{3,20}$`)

func NormalizeUsername(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// ValidateUsername returns an empty string when valid, otherwise a user-facing reason.
func ValidateUsername(username string) string {
	if !usernameRe.MatchString(username) {
		return "Username must be 3-20 characters: letters, numbers or underscore"
	}
	return ""
}

func InitBloomFilter() {
	// Sized for 1 million usernames at a 1% false positive rate
	f := bloom.NewWithEstimates(1000000, 0.01)

	var usernames []string
	if err := database.DB.Model(&models.User{}).Pluck("username", &usernames).Error; err != nil {
		log.Printf("Failed to load usernames for bloom filter: %v", err)
	}
	for _, u := range usernames {
		f.AddString(NormalizeUsername(u))
	}

	bloomMu.Lock()
	UserBloomFilter = f
	bloomMu.Unlock()

	log.Printf("Bloom filter initialized with %d usernames", len(usernames))
}

// AddUsernameToBloom records a newly registered username.
func AddUsernameToBloom(username string) {
	bloomMu.Lock()
	defer bloomMu.Unlock()
	if UserBloomFilter != nil {
		UserBloomFilter.AddString(NormalizeUsername(username))
	}
}

// IsUsernameTaken reports whether the username is registered. The bloom filter
// answers "definitely free" instantly; only possible hits fall through to the DB.
func IsUsernameTaken(username string) bool {
	username = NormalizeUsername(username)

	bloomMu.RLock()
	f := UserBloomFilter
	definitelyFree := f != nil && !f.TestString(username)
	bloomMu.RUnlock()
	if definitelyFree {
		return false
	}

	var count int64
	database.DB.Model(&models.User{}).Where("LOWER(username) = ?", username).Count(&count)
	return count > 0
}
