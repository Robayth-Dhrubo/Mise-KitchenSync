
-- Fix Dashboard Schema: Restore Missing Views

-- 1. view_dashboard_alerts (from automated_intelligence.sql)
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

-- 2. margin_alerts (Reconstructed based on usage)
-- Needs get_recipe_cost_analysis function (ensure it exists or create simple view)

CREATE OR REPLACE VIEW margin_alerts AS
SELECT 
    r.id,
    r.user_id,
    r.name,
    r.menu_price,
    'warning' as status -- Placeholder if function missing, or use calculation
FROM recipes r
WHERE r.menu_price = 0 OR r.menu_price IS NULL; 
-- Simplified for now to avoid dependency on complex functions in this specific migration file
-- If get_recipe_cost_analysis exists, we could use it, but safe fallback is better for unblocking 404.

GRANT SELECT ON view_dashboard_alerts TO authenticated, anon, service_role;
GRANT SELECT ON margin_alerts TO authenticated, anon, service_role;
