-- +migrate Up
-- 000001_initial_schema.up.sql
-- Create core tables for budget-tracker

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);

CREATE TABLE IF NOT EXISTS groups (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    simplify_debts BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups (name);
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups (deleted_at);

CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    icon TEXT,
    color VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories (deleted_at);

CREATE TABLE IF NOT EXISTS friendships (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT idx_user_friend UNIQUE (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships (user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships (friend_id);

CREATE TABLE IF NOT EXISTS group_members (
    id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT idx_group_user UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);

CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(50) PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    description TEXT NOT NULL,
    note TEXT,
    type VARCHAR(20) NOT NULL,
    expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR(50) REFERENCES categories(id) ON DELETE SET NULL,
    group_id VARCHAR(50) REFERENCES groups(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses (group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses (type);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses (deleted_at);

CREATE TABLE IF NOT EXISTS expense_splits (
    id VARCHAR(50) PRIMARY KEY,
    expense_id VARCHAR(50) NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    split_type VARCHAR(20) NOT NULL,
    percentage DECIMAL(5, 2),
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    CONSTRAINT idx_expense_user UNIQUE (expense_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits (expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits (user_id);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payer_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expense_id VARCHAR(50) REFERENCES expenses(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'COMPLETED',
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments (payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_receiver_id ON payments (receiver_id);
CREATE INDEX IF NOT EXISTS idx_payments_expense_id ON payments (expense_id);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments (deleted_at);

CREATE TABLE IF NOT EXISTS budgets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    total_limit DECIMAL(12, 2) NOT NULL,
    alert_threshold INT DEFAULT 80,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets (user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_start_date ON budgets (start_date);
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON budgets (deleted_at);
