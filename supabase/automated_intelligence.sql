-- =============================================
-- MISE AUTOMATED INTELLIGENCE ENGINE
-- Run this in Supabase SQL Editor
-- =============================================

-- ===========================================
-- PHASE 1: SMART INVENTORY SCHEMA
-- ===========================================

-- Add status column as a generated column
-- Note: PostgreSQL requires we drop and recreate if changing generated expression
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ingredients' AND column_name = 'status'
  ) THEN
    ALTER TABLE ingredients ADD COLUMN status TEXT GENERATED ALWAYS AS (
      CASE 
        WHEN current_stock < par_level THEN 'CRITICAL'
        WHEN current_stock < (par_level * 1.5) THEN 'WARNING'
        ELSE 'OK'
      END
    ) STORED;
  END IF;
END $$;

-- Dashboard Alerts View (powers the red pulse on Dashboard)
CREATE OR REPLACE VIEW view_dashboard_alerts AS
SELECT 
  id,
  user_id,
  name,
  category,
  current_stock,
  par_level,
  CASE 
    WHEN current_stock < par_level THEN 'CRITICAL'
    WHEN current_stock < (par_level * 1.5) THEN 'WARNING'
    ELSE 'OK'
  END as status,
  (par_level - current_stock) as qty_needed,
  purchase_unit
FROM ingredients
WHERE current_stock < par_level
ORDER BY (par_level - current_stock) DESC;

-- ===========================================
-- PHASE 2: BEST PRICE ENGINE (Single Query)
-- Uses DISTINCT ON to avoid N+1 problem
-- ===========================================

CREATE OR REPLACE FUNCTION generate_smart_order(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(order_data) INTO result
  FROM (
    -- Get all low-stock items with their best (cheapest) vendor
    SELECT DISTINCT ON (i.id)
      i.id as ingredient_id,
      i.name as ingredient_name,
      i.category,
      i.current_stock,
      i.par_level,
      (i.par_level - i.current_stock) as qty_needed,
      i.purchase_unit,
      s.id as vendor_id,
      s.name as vendor_name,
      s.email as vendor_email,
      vp.vendor_price as unit_price,
      vp.pack_size,
      ((i.par_level - i.current_stock) * vp.vendor_price) as line_total
    FROM ingredients i
    LEFT JOIN vendor_products vp ON i.id = vp.ingredient_id AND vp.user_id = p_user_id
    LEFT JOIN suppliers s ON vp.vendor_id = s.id
    WHERE i.user_id = p_user_id
      AND i.current_stock < i.par_level
    ORDER BY i.id, vp.vendor_price ASC NULLS LAST  -- Pick cheapest vendor per ingredient
  ) order_data;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to group orders by vendor (for the "Vendor Cards" UI)
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
          'line_total', line_total
        )
      ) as items
    FROM (
      SELECT DISTINCT ON (i.id)
        i.id as ingredient_id,
        i.name as ingredient_name,
        (i.par_level - i.current_stock) as qty_needed,
        i.purchase_unit,
        s.name as vendor_name,
        vp.vendor_price as unit_price,
        ((i.par_level - i.current_stock) * vp.vendor_price) as line_total
      FROM ingredients i
      LEFT JOIN vendor_products vp ON i.id = vp.ingredient_id AND vp.user_id = p_user_id
      LEFT JOIN suppliers s ON vp.vendor_id = s.id
      WHERE i.user_id = p_user_id
        AND i.current_stock < i.par_level
      ORDER BY i.id, vp.vendor_price ASC NULLS LAST
    ) sorted_items
    GROUP BY vendor_name
  ) grouped_vendors;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- PHASE 3: RECURSIVE RECIPE COSTING
-- Uses Recursive CTE for sub-recipes
-- ===========================================

CREATE OR REPLACE FUNCTION calculate_plate_cost(p_recipe_id UUID)
RETURNS NUMERIC AS $$
WITH RECURSIVE recipe_tree AS (
  -- Base Case: Direct ingredients in this recipe
  SELECT 
    ri.recipe_id,
    ri.quantity_needed * (i.purchase_price / NULLIF(i.conversion_ratio, 0)) as cost,
    1 as depth
  FROM recipe_items ri
  JOIN ingredients i ON ri.ingredient_id = i.id
  WHERE ri.recipe_id = p_recipe_id
  
  UNION ALL
  
  -- Recursive Case: Sub-recipes (components like sauces)
  SELECT 
    rc.parent_recipe_id as recipe_id,
    rc.quantity_needed * (
      SELECT COALESCE(SUM(ri2.quantity_needed * (i2.purchase_price / NULLIF(i2.conversion_ratio, 0))), 0)
      FROM recipe_items ri2
      JOIN ingredients i2 ON ri2.ingredient_id = i2.id
      WHERE ri2.recipe_id = rc.component_recipe_id
    ) as cost,
    rt.depth + 1
  FROM recipe_components rc
  JOIN recipe_tree rt ON rt.recipe_id = rc.parent_recipe_id
  WHERE rt.depth < 5  -- Prevent infinite loops (max 5 levels deep)
)
SELECT COALESCE(SUM(cost), 0)::NUMERIC(10,2)
FROM recipe_tree;
$$ LANGUAGE SQL STABLE;

-- Function to get full recipe cost breakdown with margin
CREATE OR REPLACE FUNCTION get_recipe_cost_analysis(p_recipe_id UUID)
RETURNS TABLE(
  recipe_id UUID,
  recipe_name TEXT,
  menu_price NUMERIC,
  total_cost NUMERIC,
  food_cost_pct NUMERIC,
  gross_margin NUMERIC,
  margin_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.menu_price,
    calculate_plate_cost(r.id) as total_cost,
    ROUND((calculate_plate_cost(r.id) / NULLIF(r.menu_price, 0)) * 100, 1) as food_cost_pct,
    ROUND(r.menu_price - calculate_plate_cost(r.id), 2) as gross_margin,
    CASE 
      WHEN (calculate_plate_cost(r.id) / NULLIF(r.menu_price, 0)) * 100 <= 25 THEN 'excellent'
      WHEN (calculate_plate_cost(r.id) / NULLIF(r.menu_price, 0)) * 100 <= 30 THEN 'good'
      WHEN (calculate_plate_cost(r.id) / NULLIF(r.menu_price, 0)) * 100 <= 35 THEN 'warning'
      ELSE 'danger'
    END as margin_status
  FROM recipes r
  WHERE r.id = p_recipe_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- PHASE 4: CLOSING THE LOOP
-- Atomic Transactions for Receiving & POS
-- ===========================================

-- Add order_id column to shopping_list if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_list' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE shopping_list ADD COLUMN order_id UUID;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_list' AND column_name = 'received_at'
  ) THEN
    ALTER TABLE shopping_list ADD COLUMN received_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- RECEIVING FUNCTION (Atomic Transaction)
CREATE OR REPLACE FUNCTION receive_purchase_order(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
  updated_count INTEGER;
  result JSON;
BEGIN
  -- 1. Update Inventory (Atomic Bulk Update)
  WITH updated AS (
    UPDATE ingredients i
    SET current_stock = i.current_stock + sl.quantity_to_order,
        updated_at = NOW()
    FROM shopping_list sl
    WHERE sl.ingredient_id = i.id
      AND sl.id = p_order_id  -- Single item receiving
      AND sl.status = 'ordered'
    RETURNING i.id, i.name, sl.quantity_to_order as qty_received
  )
  SELECT COUNT(*), json_agg(row_to_json(updated)) 
  INTO updated_count, result
  FROM updated;

  -- 2. Mark Order as Received
  UPDATE shopping_list
  SET status = 'received', 
      received_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'items_updated', updated_count,
    'details', result
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BULK RECEIVING (For receiving multiple items at once by vendor)
CREATE OR REPLACE FUNCTION receive_bulk_order(p_user_id UUID, p_item_ids UUID[])
RETURNS JSON AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- 1. Update all ingredient stocks atomically
  WITH updated AS (
    UPDATE ingredients i
    SET current_stock = i.current_stock + sl.quantity_to_order,
        updated_at = NOW()
    FROM shopping_list sl
    WHERE sl.ingredient_id = i.id
      AND sl.id = ANY(p_item_ids)
      AND sl.user_id = p_user_id
      AND sl.status = 'ordered'
    RETURNING i.id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;

  -- 2. Mark all as received
  UPDATE shopping_list
  SET status = 'received',
      received_at = NOW()
  WHERE id = ANY(p_item_ids)
    AND user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'items_received', updated_count
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POS ORDER FUNCTION (Depletes Stock When Dish is Sold)
CREATE OR REPLACE FUNCTION process_pos_order(
  p_user_id UUID,
  p_recipe_id UUID,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSON AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Deduct ingredients based on recipe
  WITH recipe_usage AS (
    SELECT 
      ri.ingredient_id,
      ri.quantity_needed * p_quantity as qty_to_deduct
    FROM recipe_items ri
    WHERE ri.recipe_id = p_recipe_id
  ),
  updated AS (
    UPDATE ingredients i
    SET current_stock = GREATEST(0, i.current_stock - ru.qty_to_deduct),
        updated_at = NOW()
    FROM recipe_usage ru
    WHERE i.id = ru.ingredient_id
      AND i.user_id = p_user_id
    RETURNING i.id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;

  -- Also handle sub-recipes (components)
  WITH component_usage AS (
    SELECT 
      ri.ingredient_id,
      ri.quantity_needed * rc.quantity_needed * p_quantity as qty_to_deduct
    FROM recipe_components rc
    JOIN recipe_items ri ON ri.recipe_id = rc.component_recipe_id
    WHERE rc.parent_recipe_id = p_recipe_id
  )
  UPDATE ingredients i
  SET current_stock = GREATEST(0, i.current_stock - cu.qty_to_deduct),
      updated_at = NOW()
  FROM component_usage cu
  WHERE i.id = cu.ingredient_id
    AND i.user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'recipe_id', p_recipe_id,
    'quantity', p_quantity,
    'ingredients_depleted', updated_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- GRANT PERMISSIONS
-- ===========================================

GRANT EXECUTE ON FUNCTION generate_smart_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_smart_order_grouped(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_plate_cost(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recipe_cost_analysis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION receive_purchase_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION receive_bulk_order(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION process_pos_order(UUID, UUID, INTEGER) TO authenticated;
GRANT SELECT ON view_dashboard_alerts TO authenticated;

-- ===========================================
-- DONE!
-- ===========================================
DO $$ BEGIN RAISE NOTICE '✅ Automated Intelligence Engine Installed!'; END $$;
