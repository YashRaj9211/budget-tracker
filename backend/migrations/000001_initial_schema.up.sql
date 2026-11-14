-- 000001_initial_schema.up.sql
-- Baseline schema. It matches exactly what GORM AutoMigrate created before versioned
-- migrations existed, and every statement is IF NOT EXISTS, so running it on an existing
-- database changes nothing.

CREATE TABLE IF NOT EXISTS users (
    id varchar(50) NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    phone varchar(20),
    avatar_url text,
    created_at timestamptz,
    updated_at timestamptz,
    deleted_at timestamptz,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username);

CREATE TABLE IF NOT EXISTS groups (
    id varchar(50) NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    simplify_debts boolean DEFAULT false,
    created_at timestamptz,
    updated_at timestamptz,
    deleted_at timestamptz,
    CONSTRAINT groups_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups (deleted_at);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups (name);

CREATE TABLE IF NOT EXISTS categories (
    id varchar(50) NOT NULL,
    name text NOT NULL,
    icon text,
    color text,
    created_at timestamptz,
    deleted_at timestamptz,
    CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories (name);

CREATE TABLE IF NOT EXISTS friendships (
    id varchar(50) NOT NULL,
    user_id varchar(50) NOT NULL,
    friend_id varchar(50) NOT NULL,
    status varchar(20) DEFAULT 'PENDING',
    created_at timestamptz,
    updated_at timestamptz,
    CONSTRAINT friendships_pkey PRIMARY KEY (id),
    CONSTRAINT fk_users_friendships_initiated FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_users_friendships_received FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships (friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_friend ON friendships (user_id, friend_id);

CREATE TABLE IF NOT EXISTS group_members (
    id varchar(50) NOT NULL,
    group_id varchar(50) NOT NULL,
    user_id varchar(50) NOT NULL,
    role varchar(20) DEFAULT 'MEMBER',
    joined_at timestamptz,
    CONSTRAINT group_members_pkey PRIMARY KEY (id),
    CONSTRAINT fk_groups_members FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_users_group_members FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_user ON group_members (group_id, user_id);

CREATE TABLE IF NOT EXISTS expenses (
    id varchar(50) NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'INR',
    description text NOT NULL,
    note text,
    type varchar(20) NOT NULL,
    expense_date timestamptz NOT NULL,
    created_at timestamptz,
    updated_at timestamptz,
    deleted_at timestamptz,
    user_id varchar(50) NOT NULL,
    category_id varchar(50),
    group_id varchar(50),
    CONSTRAINT expenses_pkey PRIMARY KEY (id),
    CONSTRAINT fk_users_expenses FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_categories_expenses FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_groups_expenses FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses (deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses (expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses (group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses (type);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);

CREATE TABLE IF NOT EXISTS expense_splits (
    id varchar(50) NOT NULL,
    expense_id varchar(50) NOT NULL,
    user_id varchar(50) NOT NULL,
    amount numeric(12,2) NOT NULL,
    split_type varchar(20) NOT NULL,
    percentage numeric(5,2),
    is_paid boolean DEFAULT false,
    created_at timestamptz,
    updated_at timestamptz,
    CONSTRAINT expense_splits_pkey PRIMARY KEY (id),
    CONSTRAINT fk_expenses_splits FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    CONSTRAINT fk_users_splits FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits (expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_is_paid ON expense_splits (is_paid);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_user ON expense_splits (expense_id, user_id);

CREATE TABLE IF NOT EXISTS payments (
    id varchar(50) NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'USD',
    description text,
    payment_date timestamptz,
    created_at timestamptz,
    deleted_at timestamptz,
    payer_id varchar(50) NOT NULL,
    receiver_id varchar(50) NOT NULL,
    expense_id varchar(50),
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT fk_users_payments_made FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_users_payments_received FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_expenses_payments FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments (deleted_at);
CREATE INDEX IF NOT EXISTS idx_payments_expense_id ON payments (expense_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments (payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_receiver_id ON payments (receiver_id);

CREATE TABLE IF NOT EXISTS budgets (
    id varchar(50) NOT NULL,
    user_id text NOT NULL,
    category_id text,
    amount numeric(12,2) NOT NULL,
    period varchar(20) NOT NULL,
    start_date timestamptz NOT NULL,
    end_date timestamptz NOT NULL,
    created_at timestamptz,
    updated_at timestamptz,
    deleted_at timestamptz,
    CONSTRAINT budgets_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_budget_dates ON budgets (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets (category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON budgets (deleted_at);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets (user_id);
