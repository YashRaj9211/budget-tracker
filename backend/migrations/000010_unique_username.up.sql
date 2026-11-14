-- Usernames become globally unique (case-insensitive); the #tag suffix is retired.
UPDATE users SET username = LOWER(username) WHERE username <> LOWER(username);

-- Existing duplicates (previously told apart by tag): keep the oldest account's
-- username and rename the rest to username_tag so the unique index can be built.
UPDATE users SET username = username || '_' || tag
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at, id) AS rn
        FROM users
    ) ranked
    WHERE rn > 1
);

DROP INDEX IF EXISTS idx_user_tag;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
