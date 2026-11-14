package migrations

import "embed"

// SQLFS holds the versioned *.up.sql / *.down.sql files.
//
//go:embed *.sql
var SQLFS embed.FS
