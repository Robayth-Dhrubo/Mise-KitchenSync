-- =============================================
-- AUTO-PRICING & GEO-DISCOVERY ENGINE
-- Run this in Supabase SQL Editor
-- =============================================

-- ===========================================
-- MODULE 1: AUTO-PRICING SCHEMA
-- ===========================================

-- Update vendor_products for web scraping
ALTER TABLE vendor_products ADD COLUMN IF NOT EXISTS product_url TEXT;
ALTER TABLE vendor_products ADD COLUMN IF NOT EXISTS scraper_selector TEXT DEFAULT '.price';
ALTER TABLE vendor_products ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE vendor_products ADD COLUMN IF NOT EXISTS scrape_status TEXT DEFAULT 'pending';
ALTER TABLE vendor_products ADD COLUMN IF NOT EXISTS previous_price DECIMAL(10,2);
ALTER TABLE vendor_products ADD COLUMN IF NOT EXISTS scrape_error_message TEXT;

-- Constraint for scrape_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_products_scrape_status_check'
  ) THEN
    ALTER TABLE vendor_products ADD CONSTRAINT vendor_products_scrape_status_check 
      CHECK (scrape_status IN ('pending', 'success', 'error', 'price_spike', 'manual'));
  END IF;
END $$;

-- ===========================================
-- MODULE 2: GEO-DISCOVERY SCHEMA
-- ===========================================

-- Update profiles for restaurant location
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS restaurant_lat DECIMAL(10,7);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS restaurant_lng DECIMAL(10,7);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS restaurant_address TEXT;

-- Update suppliers for auto-discovery
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS distance_km DECIMAL(5,2);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website TEXT;

-- Create unique index on google_place_id (allows NULL but unique when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_google_place_id 
  ON suppliers(google_place_id) 
  WHERE google_place_id IS NOT NULL;

-- Vendor Blacklist Table (banned auto-discovered vendors)
CREATE TABLE IF NOT EXISTS vendor_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_place_id TEXT NOT NULL,
  vendor_name TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, google_place_id)
);

-- Enable RLS
ALTER TABLE vendor_blacklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blacklist
DROP POLICY IF EXISTS "Users can view own blacklist" ON vendor_blacklist;
DROP POLICY IF EXISTS "Users can insert own blacklist" ON vendor_blacklist;
DROP POLICY IF EXISTS "Users can delete own blacklist" ON vendor_blacklist;

CREATE POLICY "Users can view own blacklist" ON vendor_blacklist 
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own blacklist" ON vendor_blacklist 
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own blacklist" ON vendor_blacklist 
  FOR DELETE USING (user_id = auth.uid());

-- ===========================================
-- MODULE 3: UPDATED SMART ORDER FUNCTION
-- Now includes auto-discovered approved vendors
-- ===========================================

CREATE OR REPLACE FUNCTION generate_smart_order_grouped(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(vendor_name, items) INTO result
  FROM (
    SELECT 
      COALESCE(vendor_name, 'No Vendor') as vendor_name,
      json_agg(
        json_build_object(
          'ingredient_id', ingredient_id,
          'ingredient_name', ingredient_name,
          'qty_needed', qty_needed,
          'unit', purchase_unit,
          'unit_price', unit_price,
          'line_total', line_total,
          'source', vendor_source,
          'scrape_status', scrape_status
        )
      ) as items
    FROM (
      SELECT DISTINCT ON (i.id)
        i.id as ingredient_id,
        i.name as ingredient_name,
        (i.par_level - i.current_stock) as qty_needed,
        i.purchase_unit,
        s.name as vendor_name,
        s.source as vendor_source,
        vp.vendor_price as unit_price,
        vp.scrape_status,
        ((i.par_level - i.current_stock) * vp.vendor_price) as line_total
      FROM ingredients i
      LEFT JOIN vendor_products vp ON i.id = vp.ingredient_id AND vp.user_id = p_user_id
      LEFT JOIN suppliers s ON vp.vendor_id = s.id
      WHERE i.user_id = p_user_id
        AND i.current_stock < i.par_level
        -- Include manual vendors OR approved auto-discovered with successful scrapes
        AND (
          s.source = 'manual' 
          OR (s.source = 'auto_discovered' AND s.is_approved = TRUE)
          OR s.id IS NULL  -- No vendor assigned yet
        )
      ORDER BY i.id, vp.vendor_price ASC NULLS LAST
    ) sorted_items
    GROUP BY vendor_name
  ) grouped_vendors;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- PRICE UPDATE FUNCTION (Called by Scraper)
-- ===========================================

CREATE OR REPLACE FUNCTION update_scraped_price(
  p_vendor_product_id UUID,
  p_new_price DECIMAL(10,2)
)
RETURNS JSON AS $$
DECLARE
  current_record RECORD;
  price_change_pct DECIMAL;
  new_status TEXT;
BEGIN
  -- Get current price
  SELECT vendor_price, scrape_status INTO current_record
  FROM vendor_products
  WHERE id = p_vendor_product_id;
  
  IF current_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Product not found');
  END IF;
  
  -- Calculate price change percentage
  IF current_record.vendor_price > 0 THEN
    price_change_pct := ABS((p_new_price - current_record.vendor_price) / current_record.vendor_price) * 100;
  ELSE
    price_change_pct := 0;
  END IF;
  
  -- Determine status based on price change
  IF price_change_pct > 50 THEN
    new_status := 'price_spike';  -- Flag for review
  ELSE
    new_status := 'success';
  END IF;
  
  -- Update the record
  UPDATE vendor_products
  SET 
    previous_price = vendor_price,
    vendor_price = CASE WHEN price_change_pct <= 50 THEN p_new_price ELSE vendor_price END,
    scrape_status = new_status,
    last_scraped_at = NOW(),
    scrape_error_message = CASE WHEN price_change_pct > 50 
      THEN 'Price spike detected: ' || price_change_pct::TEXT || '% change'
      ELSE NULL END
  WHERE id = p_vendor_product_id;
  
  RETURN json_build_object(
    'success', true,
    'status', new_status,
    'old_price', current_record.vendor_price,
    'new_price', p_new_price,
    'change_pct', price_change_pct,
    'auto_updated', price_change_pct <= 50
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- MARK SCRAPE ERROR FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION mark_scrape_error(
  p_vendor_product_id UUID,
  p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE vendor_products
  SET 
    scrape_status = 'error',
    scrape_error_message = p_error_message,
    last_scraped_at = NOW()
  WHERE id = p_vendor_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- VIEW: Vendors needing scraping
-- ===========================================

CREATE OR REPLACE VIEW view_vendors_to_scrape AS
SELECT 
  vp.id,
  vp.product_url,
  vp.scraper_selector,
  vp.vendor_price as current_price,
  vp.last_scraped_at,
  i.name as ingredient_name,
  s.name as vendor_name
FROM vendor_products vp
JOIN ingredients i ON vp.ingredient_id = i.id
JOIN suppliers s ON vp.vendor_id = s.id
WHERE vp.product_url IS NOT NULL
  AND (
    vp.last_scraped_at IS NULL 
    OR vp.last_scraped_at < NOW() - INTERVAL '24 hours'
  );

-- ===========================================
-- VIEW: Discovered vendors pending approval
-- ===========================================

CREATE OR REPLACE VIEW view_discovered_vendors AS
SELECT 
  s.id,
  s.user_id,
  s.name,
  s.email,
  s.address,
  s.phone,
  s.website,
  s.rating,
  s.distance_km,
  s.google_place_id,
  s.is_approved,
  s.created_at
FROM suppliers s
WHERE s.source = 'auto_discovered'
ORDER BY s.distance_km ASC NULLS LAST;

-- ===========================================
-- GRANTS
-- ===========================================

GRANT EXECUTE ON FUNCTION update_scraped_price(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_scrape_error(UUID, TEXT) TO authenticated;
GRANT SELECT ON view_vendors_to_scrape TO authenticated;
GRANT SELECT ON view_discovered_vendors TO authenticated;

-- ===========================================
-- DONE
-- ===========================================
DO $$ BEGIN RAISE NOTICE '✅ Auto-Pricing & Geo-Discovery Engine Installed!'; END $$;
