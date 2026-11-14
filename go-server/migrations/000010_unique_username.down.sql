DROP INDEX IF EXISTS idx_users_username_lower;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tag ON users (username, tag);
