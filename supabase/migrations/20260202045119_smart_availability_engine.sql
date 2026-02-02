-- Smart Availability Engine
-- Combines manual `is_available` toggle with inventory-based detection

-- 1. View: Calculate Real-Time Availability
-- Finds the "Limiting Ingredient" for every recipe
-- Respects manual override: if is_available is manually set to false, dish is OFF AIR
CREATE OR REPLACE VIEW view_menu_availability AS
SELECT 
  r.id as recipe_id,
  r.user_id,
  r.name,
  r.description,
  r.menu_price,
  r.image_url,
  r.category,
  r.is_available as manual_available,
  -- Math: Floor(Stock / Needed) gives max portions
  -- COALESCE handles recipes with no ingredients
  COALESCE(MIN(FLOOR(i.current_stock / NULLIF(ri.quantity_needed, 0))), 999) as max_servings,
  -- Smart flag: if max_servings <= 0, it is Sold Out
  CASE 
    WHEN COALESCE(MIN(FLOOR(i.current_stock / NULLIF(ri.quantity_needed, 0))), 999) <= 0 THEN false 
    ELSE true 
  END as smart_available,
  -- Final availability: Must pass BOTH manual AND smart checks
  CASE 
    WHEN r.is_available = false THEN false  -- Manual override (OFF AIR)
    WHEN COALESCE(MIN(FLOOR(i.current_stock / NULLIF(ri.quantity_needed, 0))), 999) <= 0 THEN false  -- Auto (SOLD OUT)
    ELSE true 
  END as is_available
FROM recipes r
LEFT JOIN recipe_items ri ON r.id = ri.recipe_id
LEFT JOIN ingredients i ON ri.ingredient_id = i.id
GROUP BY r.id, r.user_id, r.name, r.description, r.menu_price, r.image_url, r.category, r.is_available;

-- 2. Function: Safe Order Processing
-- Blocks the order if stock dropped to 0 while the user was looking at the menu
CREATE OR REPLACE FUNCTION process_pos_order_safe(
  p_user_id UUID,
  p_recipe_id UUID,
  p_quantity INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_max INTEGER;
  v_available BOOLEAN;
BEGIN
  -- Check stock first
  SELECT max_servings, is_available INTO v_max, v_available 
  FROM view_menu_availability 
  WHERE recipe_id = p_recipe_id;
  
  -- Check if manually turned off
  IF v_available = false THEN
    RAISE EXCEPTION 'UNAVAILABLE: This item is currently not available.';
  END IF;
  
  -- Check if enough stock
  IF v_max < p_quantity THEN
    RAISE EXCEPTION 'SOLD OUT: Only % servings available.', v_max;
  END IF;

  -- Deduct inventory for each ingredient in the recipe
  UPDATE ingredients i
  SET current_stock = current_stock - (ri.quantity_needed * p_quantity)
  FROM recipe_items ri
  WHERE ri.recipe_id = p_recipe_id
    AND ri.ingredient_id = i.id
    AND i.user_id = p_user_id;

  RETURN json_build_object('success', true, 'remaining', v_max - p_quantity);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
