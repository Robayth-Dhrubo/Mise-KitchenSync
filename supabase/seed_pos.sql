-- =============================================
-- MISE POS SEED DATA (2,000 ORDERS)
-- Simulates customer activity over the last 30 days
-- =============================================

DO $$
DECLARE
  target_user_id uuid;
  current_order_id uuid;
  starter_id uuid;
  main_id uuid;
  dessert_id uuid;
  i int;
  random_days_ago int;
  order_date timestamp;
BEGIN
  -- 1. Setup
  SELECT id INTO target_user_id FROM auth.users LIMIT 1;
  IF target_user_id IS NULL THEN RAISE EXCEPTION 'No users found!'; END IF;

  -- Boost stock so the 2000 orders don't hit -5000 immediately (optional but better)
  UPDATE ingredients SET current_stock = current_stock + 1000 WHERE user_id = target_user_id;

  -- 2. Generation Loop
  FOR i IN 1..2000 LOOP
    -- Random date in last 30 days
    random_days_ago := floor(random() * 30);
    order_date := now() - (random_days_ago || ' days')::interval - (floor(random() * 24) || ' hours')::interval;

    -- Create Order
    INSERT INTO public.orders (user_id, table_number, status, created_at)
    VALUES (target_user_id, floor(random() * 40 + 1)::text, 'paid', order_date)
    RETURNING id INTO current_order_id;

    -- Select 1 Starter (assuming names 1-15 are starters)
    SELECT id INTO starter_id FROM recipes 
    WHERE user_id = target_user_id AND menu_price BETWEEN 15 AND 35 
    ORDER BY random() LIMIT 1;

    -- Select 1 Main (assuming names 16-50 are mains)
    SELECT id INTO main_id FROM recipes 
    WHERE user_id = target_user_id AND menu_price >= 35 
    ORDER BY random() LIMIT 1;

    -- Select 1 Dessert (assuming 61-70 are desserts)
    SELECT id INTO dessert_id FROM recipes 
    WHERE user_id = target_user_id AND menu_price BETWEEN 10 AND 15 
    ORDER BY random() LIMIT 1;

    -- Insert Order Items & Sales Logs (Historical)
    -- Item 1: Starter
    IF starter_id IS NOT NULL THEN
      INSERT INTO order_items (order_id, recipe_id, quantity, unit_price) 
      SELECT current_order_id, starter_id, 1, menu_price FROM recipes WHERE id = starter_id;
      
      INSERT INTO sales_logs (user_id, recipe_id, quantity_sold, sale_date, created_at)
      VALUES (target_user_id, starter_id, 1, order_date::date, order_date);
    END IF;

    -- Item 2: Main
    IF main_id IS NOT NULL THEN
      INSERT INTO order_items (order_id, recipe_id, quantity, unit_price) 
      SELECT current_order_id, main_id, 1, menu_price FROM recipes WHERE id = main_id;

      INSERT INTO sales_logs (user_id, recipe_id, quantity_sold, sale_date, created_at)
      VALUES (target_user_id, main_id, 1, order_date::date, order_date);
    END IF;

    -- Item 3: Dessert
    IF dessert_id IS NOT NULL THEN
      INSERT INTO order_items (order_id, recipe_id, quantity, unit_price) 
      SELECT current_order_id, dessert_id, 1, menu_price FROM recipes WHERE id = dessert_id;

      INSERT INTO sales_logs (user_id, recipe_id, quantity_sold, sale_date, created_at)
      VALUES (target_user_id, dessert_id, 1, order_date::date, order_date);
    END IF;

    -- Update Order Total
    UPDATE orders SET total_amount = (SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = current_order_id)
    WHERE id = current_order_id;

  END LOOP;

  -- 3. Final Inventory Sync (Bulk)
  -- Deduct inventory for all sales generated in this script
  UPDATE ingredients i
  SET current_stock = i.current_stock - sub.total_needed
  FROM (
    SELECT ri.ingredient_id, SUM(ri.quantity_needed * sl.quantity_sold) as total_needed
    FROM sales_logs sl
    JOIN recipe_items ri ON sl.recipe_id = ri.recipe_id
    WHERE sl.user_id = target_user_id
    GROUP BY ri.ingredient_id
  ) sub
  WHERE i.id = sub.ingredient_id AND i.user_id = target_user_id;

  RAISE NOTICE 'Seeded 2,000 orders and updated inventory levels successfully.';
END $$;
