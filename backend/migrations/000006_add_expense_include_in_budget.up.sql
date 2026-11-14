ALTER TABLE expenses ADD COLUMN IF NOT EXISTS include_in_budget boolean NOT NULL DEFAULT true;
