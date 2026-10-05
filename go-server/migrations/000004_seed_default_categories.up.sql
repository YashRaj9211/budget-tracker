INSERT INTO categories (id, name, color, created_at)
VALUES
    ('cat_food', 'Food', '#8ecae6', NOW()),
    ('cat_travel', 'Travel', '#b8b5ff', NOW()),
    ('cat_entertainment', 'Entertainment', '#ffe5a5', NOW()),
    ('cat_utilities', 'Utilities', '#b7e4c7', NOW()),
    ('cat_shopping', 'Shopping', '#ffc8dd', NOW()),
    ('cat_health', 'Health', '#ffb4a2', NOW()),
    ('cat_rent', 'Rent', '#a8dadc', NOW()),
    ('cat_groceries', 'Groceries', '#90e0ef', NOW()),
    ('cat_bills', 'Bills', '#cbd5e1', NOW()),
    ('cat_other', 'Other', '#94a3b8', NOW())
ON CONFLICT (name) DO NOTHING;
