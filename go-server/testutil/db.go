// Package testutil provides helpers for tests that need a real PostgreSQL database.
package testutil

import (
	"crypto/rand"
	"encoding/hex"
	"net/url"
	"os"
	"strings"
	"testing"

	"splitwise-go/database"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// NewDB connects to TEST_DATABASE_URL, creates a throw-away schema, applies every migration
// inside it and points database.DB at it. The schema is dropped when the test ends, so tests
// never touch existing data. The test is skipped when TEST_DATABASE_URL is not set.
func NewDB(t *testing.T, applyMigrations bool) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping database tests")
	}

	admin := open(t, dsn)

	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		t.Fatal(err)
	}
	schema := "t_" + hex.EncodeToString(b)
	if err := admin.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}

	db := open(t, withSearchPath(t, dsn, schema))

	prev := database.DB
	database.DB = db
	t.Cleanup(func() {
		database.DB = prev
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
		_ = admin.Exec("DROP SCHEMA " + schema + " CASCADE").Error
		if sqlDB, err := admin.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	if applyMigrations {
		sqlDB, err := db.DB()
		if err != nil {
			t.Fatal(err)
		}
		if err := database.DefaultMigrationManager(sqlDB).Up(); err != nil {
			t.Fatalf("apply migrations: %v", err)
		}
	}
	return db
}

func open(t *testing.T, dsn string) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(postgres.New(postgres.Config{DSN: dsn, PreferSimpleProtocol: true}),
		&gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	return db
}

func withSearchPath(t *testing.T, dsn, schema string) string {
	t.Helper()
	if strings.Contains(dsn, "://") {
		u, err := url.Parse(dsn)
		if err != nil {
			t.Fatal(err)
		}
		q := u.Query()
		q.Set("search_path", schema)
		u.RawQuery = q.Encode()
		return u.String()
	}
	return dsn + " search_path=" + schema
}
