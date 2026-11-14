CREATE TABLE IF NOT EXISTS savings_accounts (
    id              varchar(50)   PRIMARY KEY,
    user_id         varchar(50)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            varchar(100)  NOT NULL,
    kind            varchar(20)   NOT NULL DEFAULT 'OTHER'
                    CHECK (kind IN ('BANK','FD','RD','MUTUAL_FUND','CASH','OTHER')),
    opening_balance decimal(12,2) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
    currency        varchar(10)   NOT NULL DEFAULT 'INR',
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_user ON savings_accounts (user_id);

CREATE TABLE IF NOT EXISTS savings_transactions (
    id          varchar(50)   PRIMARY KEY,
    account_id  varchar(50)   NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
    user_id     varchar(50)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      decimal(12,2) NOT NULL CHECK (amount > 0),
    direction   varchar(10)   NOT NULL CHECK (direction IN ('DEPOSIT','WITHDRAWAL')),
    txn_date    date          NOT NULL,
    note        text,
    created_at  timestamptz   NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_savings_txn_account ON savings_transactions (account_id, txn_date);
