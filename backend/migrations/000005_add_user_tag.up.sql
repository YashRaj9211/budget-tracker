ALTER TABLE users ADD COLUMN tag varchar(4) NOT NULL DEFAULT '';
DROP INDEX IF EXISTS idx_users_username;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tag ON users (username, tag);
