-- Add paid_amount tracking to purchase orders
ALTER TABLE purchase_orders ADD COLUMN paid_amount REAL NOT NULL DEFAULT 0;

-- Add outstanding_balance tracking to suppliers
ALTER TABLE suppliers ADD COLUMN outstanding_balance REAL NOT NULL DEFAULT 0;
