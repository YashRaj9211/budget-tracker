-- 000002_add_expense_is_settlement.up.sql
-- Explicit flag for "settle up" payments (previously guessed from the title).
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_settlement boolean NOT NULL DEFAULT false;

-- Backfill: old settlements were created with a title starting with "Settlement".
UPDATE expenses SET is_settlement = true
WHERE type = 'SPLIT' AND lower(description) LIKE 'settlement%';
