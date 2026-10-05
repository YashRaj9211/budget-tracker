DELETE FROM categories WHERE id IN (
    'cat_food', 'cat_travel', 'cat_entertainment', 'cat_utilities',
    'cat_shopping', 'cat_health', 'cat_rent', 'cat_groceries',
    'cat_bills', 'cat_other'
);
