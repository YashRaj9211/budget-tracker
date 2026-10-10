DROP INDEX IF EXISTS idx_user_tag;

-- This might fail if there are duplicate usernames
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username);

ALTER TABLE users DROP COLUMN IF EXISTS tag;
