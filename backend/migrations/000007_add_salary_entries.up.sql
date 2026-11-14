CREATE TABLE IF NOT EXISTS salary_entries (
    id             varchar(50)   PRIMARY KEY,
    user_id        varchar(50)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount         decimal(12,2) NOT NULL CHECK (amount >= 0),
    currency       varchar(10)   NOT NULL DEFAULT 'INR',
    effective_from date          NOT NULL,
    note           text,
    created_at     timestamptz   NOT NULL DEFAULT now(),
    updated_at     timestamptz   NOT NULL DEFAULT now(),
    deleted_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_salary_user_from ON salary_entries (user_id, effective_from);
