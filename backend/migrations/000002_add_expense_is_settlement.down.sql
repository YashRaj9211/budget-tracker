-- 000002_add_expense_is_settlement.down.sql
ALTER TABLE expenses DROP COLUMN IF EXISTS is_settlement;
