ALTER TABLE savings_accounts ADD COLUMN IF NOT EXISTS opening_date date;
UPDATE savings_accounts SET opening_date = created_at::date WHERE opening_date IS NULL;
ALTER TABLE savings_accounts ALTER COLUMN opening_date SET DEFAULT CURRENT_DATE;
ALTER TABLE savings_accounts ALTER COLUMN opening_date SET NOT NULL;
