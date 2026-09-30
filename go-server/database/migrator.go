package database

import (
	"database/sql"
	"fmt"
	"io/fs"
	"log"
	"os"
	"sort"
	"strings"

	"splitwise-go/migrations"
)

// SchemaMigrationsTable records which versioned migrations have been applied.
const SchemaMigrationsTable = "schema_migrations"

// MigrationManager applies the embedded *.up.sql / *.down.sql files in order.
type MigrationManager struct {
	db *sql.DB
	fs fs.ReadDirFS
}

// NewMigrationManager builds a manager that reads from any fs (the embedded SQL in production,
// a temp dir or fstest.MapFS in tests).
func NewMigrationManager(db *sql.DB, files fs.ReadDirFS) *MigrationManager {
	return &MigrationManager{db: db, fs: files}
}

// DefaultMigrationManager uses the SQL files embedded in the migrations package.
func DefaultMigrationManager(db *sql.DB) *MigrationManager {
	return NewMigrationManager(db, migrations.SQLFS)
}

func (m *MigrationManager) ensureTable() error {
	_, err := m.db.Exec(fmt.Sprintf(`
		CREATE TABLE IF NOT EXISTS %s (
			version VARCHAR(100) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`, SchemaMigrationsTable))
	return err
}

// applied returns the applied versions, sorted oldest to newest.
func (m *MigrationManager) applied() ([]string, error) {
	rows, err := m.db.Query(fmt.Sprintf("SELECT version FROM %s ORDER BY version ASC", SchemaMigrationsTable))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var versions []string
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		versions = append(versions, v)
	}
	return versions, rows.Err()
}

func (m *MigrationManager) upFiles() ([]string, error) {
	entries, err := m.fs.ReadDir(".")
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".up.sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)
	return files, nil
}

// exec runs one migration file and records (or removes) its version in a single transaction.
func (m *MigrationManager) exec(sqlText, recordSQL, version string) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	if _, err := tx.Exec(sqlText); err != nil {
		_ = tx.Rollback()
		return err
	}
	if _, err := tx.Exec(recordSQL, version); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

// Up applies every pending migration.
func (m *MigrationManager) Up() error {
	if err := m.ensureTable(); err != nil {
		return fmt.Errorf("create %s: %w", SchemaMigrationsTable, err)
	}
	done, err := m.applied()
	if err != nil {
		return err
	}
	doneSet := make(map[string]bool, len(done))
	for _, v := range done {
		doneSet[v] = true
	}

	files, err := m.upFiles()
	if err != nil {
		return err
	}
	for _, name := range files {
		version := strings.TrimSuffix(name, ".up.sql")
		if doneSet[version] {
			continue
		}
		content, err := fs.ReadFile(m.fs, name)
		if err != nil {
			return err
		}
		log.Printf("Applying migration %s", version)
		record := fmt.Sprintf("INSERT INTO %s (version) VALUES ($1)", SchemaMigrationsTable)
		if err := m.exec(string(content), record, version); err != nil {
			return fmt.Errorf("migration %s failed: %w", version, err)
		}
	}
	return nil
}

// Down rolls back the most recently applied migration. It reports whether one was rolled back.
func (m *MigrationManager) Down() (bool, error) {
	if err := m.ensureTable(); err != nil {
		return false, err
	}
	done, err := m.applied()
	if err != nil {
		return false, err
	}
	if len(done) == 0 {
		return false, nil
	}
	latest := done[len(done)-1]
	content, err := fs.ReadFile(m.fs, latest+".down.sql")
	if err != nil {
		return false, fmt.Errorf("down file for %s not found: %w", latest, err)
	}
	log.Printf("Rolling back migration %s", latest)
	record := fmt.Sprintf("DELETE FROM %s WHERE version = $1", SchemaMigrationsTable)
	if err := m.exec(string(content), record, latest); err != nil {
		return false, fmt.Errorf("rollback %s failed: %w", latest, err)
	}
	return true, nil
}

// DownAll rolls back every applied migration, newest first (used by reset_db).
func (m *MigrationManager) DownAll() error {
	for {
		rolledBack, err := m.Down()
		if err != nil {
			return err
		}
		if !rolledBack {
			return nil
		}
	}
}

// ResetAll wipes the schema and rebuilds it (used by reset_db).
//
// Unlike DownAll it does not trust the schema_migrations table: a database that was built
// before migrations existed (for example with AutoMigrate) has tables but no recorded
// versions, so DownAll would do nothing and the old data would survive. Every *.down.sql
// file is therefore run, newest first; they all use IF EXISTS, so running them is safe.
func (m *MigrationManager) ResetAll() error {
	if err := m.ensureTable(); err != nil {
		return err
	}
	files, err := fs.Glob(m.fs, "*.down.sql")
	if err != nil {
		return err
	}
	sort.Sort(sort.Reverse(sort.StringSlice(files)))
	for _, name := range files {
		content, err := fs.ReadFile(m.fs, name)
		if err != nil {
			return err
		}
		log.Printf("Running %s", name)
		if _, err := m.db.Exec(string(content)); err != nil {
			return fmt.Errorf("%s failed: %w", name, err)
		}
	}
	if _, err := m.db.Exec(fmt.Sprintf("DELETE FROM %s", SchemaMigrationsTable)); err != nil {
		return err
	}
	return m.Up()
}

// MigrateOnStartIfEnabled applies pending migrations when AUTO_MIGRATE=true. It lets a hosted
// deploy (for example Render) update the schema itself; leave it unset to run
// `go run ./cmd/migrate` by hand instead.
func MigrateOnStartIfEnabled() {
	if os.Getenv("AUTO_MIGRATE") != "true" {
		return
	}
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("AUTO_MIGRATE: ", err)
	}
	if err := DefaultMigrationManager(sqlDB).Up(); err != nil {
		log.Fatal("AUTO_MIGRATE: ", err)
	}
	log.Println("AUTO_MIGRATE: schema is up to date")
}
