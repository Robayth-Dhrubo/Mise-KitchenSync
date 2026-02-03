-- 1. Upgrade Orders Table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'dine_in', -- 'dine_in' or 'ird' (In-Room Dining)
ADD COLUMN IF NOT EXISTS location_id TEXT, -- Table Number ('T-5') or Room Number ('R-205')
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft', -- 'draft' (Blue), 'fired' (Green), 'paid' (Gray)
ADD COLUMN IF NOT EXISTS guest_name TEXT, -- For Room Service
ADD COLUMN IF NOT EXISTS fired_at TIMESTAMPTZ;

-- 2. Upgrade Order Items
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS course TEXT DEFAULT 'main', -- 'starter', 'main', 'dessert'
ADD COLUMN IF NOT EXISTS notes TEXT; -- Special requests
