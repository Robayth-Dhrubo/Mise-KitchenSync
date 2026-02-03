-- =============================================
-- MISE MASTER SEED DATA (FULL 75 ITEMS)
-- WARNING: This script TRUNCATES (Deletes) existing data!
-- Usage: Run this in SQL Editor to populate sample data.
-- =============================================

-- 1. CLEANUP
TRUNCATE TABLE recipe_items, recipes, ingredients CASCADE;

DO $$
DECLARE
  target_user_id uuid;
  test_email text := 'admin@mise.local';
BEGIN
  -- Try to grab the first user from auth.users
  SELECT id INTO target_user_id FROM auth.users LIMIT 1;
  
  -- If no users exist, create a test admin user
  IF target_user_id IS NULL THEN
    target_user_id := gen_random_uuid();
    
    -- Create auth user
    INSERT INTO auth.users (
      id, 
      instance_id,
      email, 
      encrypted_password, 
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      target_user_id,
      '00000000-0000-0000-0000-000000000000',
      test_email,
      crypt('Admin123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      'authenticated',
      'authenticated'
    );
    
    RAISE NOTICE 'Created test admin: admin@mise.local / Admin123!';
  ELSE
    -- Get the email of existing user
    SELECT email INTO test_email FROM auth.users WHERE id = target_user_id;
  END IF;

  -- Create or update profile (UPSERT)
  INSERT INTO public.profiles (id, email, role, restaurant_name)
  VALUES (target_user_id, test_email, 'admin', 'Mise Demo Kitchen')
  ON CONFLICT (id) DO UPDATE SET role = 'admin', restaurant_name = 'Mise Demo Kitchen';

  RAISE NOTICE 'Using user: % as admin', test_email;

  -- ---------------------------------------------------------
  -- INGREDIENTS
  -- ---------------------------------------------------------

  -- PROTEIN
  INSERT INTO ingredients (user_id, name, category, purchase_unit, purchase_price, current_stock, par_level) VALUES
  (target_user_id, 'Beef Tenderloin', 'Butchery', 'Case (50lbs)', 950.00, 10, 3),
  (target_user_id, 'Duck Legs', 'Butchery', 'Case (20lbs)', 140.00, 5, 4),
  (target_user_id, 'Lamb Rack', 'Butchery', 'Pack (10lbs)', 220.00, 8, 4),
  (target_user_id, 'Chicken Whole', 'Butchery', 'Case (10 units)', 110.00, 15, 6),
  (target_user_id, 'Salmon Whole', 'Fish', 'Case (40lbs)', 450.00, 20, 2),
  (target_user_id, 'Sea Bass', 'Fish', 'Case (20lbs)', 320.00, 10, 2),
  (target_user_id, 'Scallops', 'Fish', 'Tin (8lbs)', 240.00, 4, 6),
  (target_user_id, 'Lobster', 'Fish', 'Crate (30lbs)', 450.00, 10, 2),
  (target_user_id, 'Bacon Slab', 'Butchery', 'Slab (10lbs)', 65.00, 5, 5);

  -- DAIRY
  INSERT INTO ingredients (user_id, name, category, purchase_unit, purchase_price, current_stock, par_level) VALUES
  (target_user_id, 'Butter Unsalted', 'Dairy', 'Case (36lbs)', 180.00, 30, 10),
  (target_user_id, 'Heavy Cream', 'Dairy', 'Jug (4L)', 22.00, 10, 12),
  (target_user_id, 'Parmesan Wheel', 'Dairy', 'Wheel (80lbs)', 900.00, 1, 1),
  (target_user_id, 'Goat Cheese', 'Dairy', 'Pack (1kg)', 24.00, 5, 6),
  (target_user_id, 'Eggs Large', 'Dairy', 'Case (15doz)', 45.00, 12, 8);

  -- PRODUCE
  INSERT INTO ingredients (user_id, name, category, purchase_unit, purchase_price, current_stock, par_level) VALUES
  (target_user_id, 'Onions Yellow', 'Produce', 'Bag (50lbs)', 25.00, 40, 5),
  (target_user_id, 'Shallots', 'Produce', 'Bag (10lbs)', 22.00, 8, 4),
  (target_user_id, 'Garlic Peeled', 'Produce', 'Jar (5lbs)', 35.00, 3, 4),
  (target_user_id, 'Potatoes Yukon', 'Produce', 'Box (50lbs)', 40.00, 45, 6),
  (target_user_id, 'Spinach Baby', 'Produce', 'Case (4lbs)', 18.00, 2, 6),
  (target_user_id, 'Mushrooms Mix', 'Produce', 'Box (5lbs)', 45.00, 3, 5),
  (target_user_id, 'Microgreens', 'Produce', 'Clamshell', 12.00, 5, 10),
  (target_user_id, 'Thyme Fresh', 'Produce', 'Bunch', 12.00, 4, 3),
  (target_user_id, 'Lemons', 'Produce', 'Case', 55.00, 1, 2);

  -- PANTRY
  INSERT INTO ingredients (user_id, name, category, purchase_unit, purchase_price, current_stock, par_level) VALUES
  (target_user_id, 'Olive Oil', 'Dry', 'Tin (3L)', 48.00, 6, 8),
  (target_user_id, 'Rice Arborio', 'Dry', 'Bag (5kg)', 32.00, 10, 5),
  (target_user_id, 'Pasta Linguine', 'Dry', 'Case (20lbs)', 40.00, 15, 5),
  (target_user_id, 'Truffle Oil', 'Dry', 'Bottle (250ml)', 35.00, 2, 3),
  (target_user_id, 'Chocolate Dark', 'Pastry', 'Bag (2.5kg)', 45.00, 4, 6),
  (target_user_id, 'Sugar White', 'Pastry', 'Bag (20kg)', 30.00, 10, 4);

  -- ---------------------------------------------------------
  -- RECIPES
  -- ---------------------------------------------------------
  
  INSERT INTO recipes (user_id, name, menu_price, target_food_cost_pct) VALUES
  -- STARTERS
  (target_user_id, 'Beef Carpaccio', 24.00, 30),
  (target_user_id, 'Beef Tartare Classic', 26.00, 30),
  (target_user_id, 'Salmon Tartare', 22.00, 30),
  (target_user_id, 'Scallop Ceviche', 28.00, 25),
  (target_user_id, 'Lobster Bisque', 19.00, 35),
  (target_user_id, 'French Onion Soup', 16.00, 40),
  (target_user_id, 'Goat Cheese Salad', 18.00, 30),
  (target_user_id, 'Caesar Salad', 16.00, 35),
  (target_user_id, 'Mushroom Toast', 19.00, 28),
  (target_user_id, 'Garlic Shrimp', 24.00, 30),
  (target_user_id, 'Spinach Dip', 15.00, 40),
  (target_user_id, 'Tuna Tataki', 26.00, 30),
  (target_user_id, 'Oysters Rockefeller', 32.00, 25),
  (target_user_id, 'Foie Gras Torchon', 38.00, 25),
  (target_user_id, 'Charcuterie Board', 35.00, 40),

  -- MAINS MEAT
  (target_user_id, 'Filet Mignon 6oz', 48.00, 25),
  (target_user_id, 'Filet Mignon 8oz', 62.00, 25),
  (target_user_id, 'Steak Frites', 38.00, 30),
  (target_user_id, 'Ribeye Steak 12oz', 55.00, 30),
  (target_user_id, 'Braised Short Rib', 42.00, 35),
  (target_user_id, 'Duck Confit', 36.00, 35),
  (target_user_id, 'Duck Magret', 40.00, 30),
  (target_user_id, 'Rack of Lamb (Full)', 65.00, 25),
  (target_user_id, 'Rack of Lamb (Half)', 38.00, 25),
  (target_user_id, 'Chicken Supreme', 29.00, 40),
  (target_user_id, 'Roast Chicken (Whole)', 55.00, 40),
  (target_user_id, 'Beef Wellington', 65.00, 20),
  (target_user_id, 'Veal Chop', 58.00, 30),
  (target_user_id, 'Pork Belly Crispy', 32.00, 40),
  (target_user_id, 'Burger Deluxe', 24.00, 35),
  (target_user_id, 'Lamb Shank', 38.00, 35),
  (target_user_id, 'Osso Bucco', 42.00, 35),
  (target_user_id, 'Surf and Turf', 75.00, 25),
  (target_user_id, 'Chicken Pot Pie', 26.00, 50),
  (target_user_id, 'Meatballs & Polenta', 28.00, 45),

  -- MAINS FISH
  (target_user_id, 'Pan Seared Scallops', 44.00, 30),
  (target_user_id, 'Grilled Salmon', 34.00, 35),
  (target_user_id, 'Sea Bass Filet', 42.00, 30),
  (target_user_id, 'Lobster Thermidor', 85.00, 20),
  (target_user_id, 'Lobster Roll', 32.00, 30),
  (target_user_id, 'Fish and Chips', 26.00, 45),
  (target_user_id, 'Seafood Risotto', 38.00, 30),
  (target_user_id, 'Linguine Vongole', 28.00, 35),
  (target_user_id, 'Mussels Mariniere', 24.00, 40),
  (target_user_id, 'Grilled Octopus', 36.00, 30),
  (target_user_id, 'Halibut', 45.00, 30),
  (target_user_id, 'Trout Almondine', 32.00, 35),
  (target_user_id, 'Seafood Tower', 120.00, 25),
  (target_user_id, 'Shrimp Scampi', 34.00, 30),
  (target_user_id, 'Cod Loin', 36.00, 35),

  -- SIDES
  (target_user_id, 'Truffle Fries', 12.00, 60),
  (target_user_id, 'Mashed Potatoes', 10.00, 70),
  (target_user_id, 'Grilled Asparagus', 14.00, 40),
  (target_user_id, 'Sauteed Mushrooms', 12.00, 50),
  (target_user_id, 'Mac and Cheese', 16.00, 55),
  (target_user_id, 'Roasted Carrots', 10.00, 60),
  (target_user_id, 'Creamed Spinach', 12.00, 50),
  (target_user_id, 'Brussels Sprouts', 12.00, 50),
  (target_user_id, 'Onion Rings', 9.00, 70),
  (target_user_id, 'Rice Pilaf', 8.00, 80),

  -- DESSERTS
  (target_user_id, 'Creme Brulee', 14.00, 70),
  (target_user_id, 'Chocolate Mousse', 12.00, 65),
  (target_user_id, 'Cheesecake', 14.00, 60),
  (target_user_id, 'Tiramisu', 14.00, 60),
  (target_user_id, 'Lemon Tart', 12.00, 65),
  (target_user_id, 'Apple Crumble', 12.00, 70),
  (target_user_id, 'Molten Cake', 15.00, 65),
  (target_user_id, 'Ice Cream Trio', 10.00, 70),
  (target_user_id, 'Fruit Plate', 12.00, 50),
  (target_user_id, 'Cheese Board', 24.00, 40),

  -- SAUCES
  (target_user_id, 'Hollandaise Sauce', 5.00, 30),
  (target_user_id, 'Peppercorn Sauce', 4.00, 30),
  (target_user_id, 'Bearnaise', 5.00, 30),
  (target_user_id, 'Red Wine Jus', 4.00, 30),
  (target_user_id, 'Garlic Aioli', 2.00, 80);

  -- ---------------------------------------------------------
  -- RECIPE ITEMS
  -- ---------------------------------------------------------
  
  -- BEEF CARPACCIO
  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.15, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Beef Carpaccio' AND i.name = 'Beef Tenderloin' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.02, 'L' FROM recipes r, ingredients i WHERE r.name = 'Beef Carpaccio' AND i.name = 'Olive Oil' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.05, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Beef Carpaccio' AND i.name = 'Parmesan Wheel' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 1, 'pinch' FROM recipes r, ingredients i WHERE r.name = 'Beef Carpaccio' AND i.name = 'Microgreens' AND r.user_id = target_user_id;

  -- FILET MIGNON 6oz
  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.4, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Filet Mignon 6oz' AND i.name = 'Beef Tenderloin' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.1, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Filet Mignon 6oz' AND i.name = 'Butter Unsalted' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.02, 'bunch' FROM recipes r, ingredients i WHERE r.name = 'Filet Mignon 6oz' AND i.name = 'Thyme Fresh' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.5, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Filet Mignon 6oz' AND i.name = 'Potatoes Yukon' AND r.user_id = target_user_id;

  -- TRUFFLE FRIES
  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.8, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Truffle Fries' AND i.name = 'Potatoes Yukon' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.01, 'L' FROM recipes r, ingredients i WHERE r.name = 'Truffle Fries' AND i.name = 'Truffle Oil' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.1, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Truffle Fries' AND i.name = 'Parmesan Wheel' AND r.user_id = target_user_id;

  -- SCALLOPS
  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.5, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Pan Seared Scallops' AND i.name = 'Scallops' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.1, 'unit' FROM recipes r, ingredients i WHERE r.name = 'Pan Seared Scallops' AND i.name = 'Lemons' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 1, 'pinch' FROM recipes r, ingredients i WHERE r.name = 'Pan Seared Scallops' AND i.name = 'Microgreens' AND r.user_id = target_user_id;

  -- CREME BRULEE
  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.2, 'L' FROM recipes r, ingredients i WHERE r.name = 'Creme Brulee' AND i.name = 'Heavy Cream' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.15, 'doz' FROM recipes r, ingredients i WHERE r.name = 'Creme Brulee' AND i.name = 'Eggs Large' AND r.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.1, 'kg' FROM recipes r, ingredients i WHERE r.name = 'Creme Brulee' AND i.name = 'Sugar White' AND r.user_id = target_user_id;

END $$;


  -- ---------------------------------------------------------
  -- IMAGE POPULATION
  -- ---------------------------------------------------------
  
  DO $$
  DECLARE
    target_user_id uuid;
  BEGIN
    SELECT id INTO target_user_id FROM auth.users LIMIT 1;
    
    -- Specific Premium Images
    UPDATE recipes SET image_url = '/images/beef-wellington.png' WHERE name ILIKE '%Wellington%' AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/images/apple-crumble.png' WHERE name ILIKE '%Crumble%' AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/images/beef-carpaccio.png' WHERE name ILIKE '%Carpaccio%' AND user_id = target_user_id;

    -- Starters
    UPDATE recipes SET image_url = '/assets/menu/starters/beef-carpaccio.png' WHERE name ILIKE 'Beef Carpaccio' AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/assets/menu/starters/beef-tartare.png' WHERE name ILIKE 'Beef Tartare Classic' AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/assets/menu/starters/salmon-tartare.png' WHERE name ILIKE 'Salmon Tartare' AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/assets/menu/starters/scallop-ceviche.png' WHERE name ILIKE 'Scallop Ceviche' AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/assets/menu/starters/lobster-bisque.png' WHERE name ILIKE 'Lobster Bisque' AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/assets/menu/starters/french-onion-soup.png' WHERE name ILIKE 'French Onion Soup' AND user_id = target_user_id;

    -- Mains
    UPDATE recipes SET image_url = '/assets/menu/main.png' WHERE (image_url IS NULL OR image_url = '') AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/assets/menu/main.png' WHERE (name ILIKE 'Filet Mignon%' OR name ILIKE '%Steak%' OR name ILIKE '%Duck%' OR name ILIKE '%Rack of Lamb%') AND user_id = target_user_id;

    -- Desserts
    UPDATE recipes SET image_url = '/assets/menu/dessert.png' WHERE name IN ('Creme Brulee', 'Chocolate Mousse', 'Cheesecake', 'Tiramisu', 'Lemon Tart', 'Molten Cake', 'Ice Cream Trio', 'Fruit Plate', 'Cheese Board') AND user_id = target_user_id;

    -- Categories Fallbacks
    UPDATE recipes SET image_url = '/assets/menu/drink.png' WHERE image_url IS NULL AND (name ILIKE '%Martini%' OR name ILIKE '%Old Fashioned%' OR name ILIKE '%Negroni%' OR name ILIKE '%Wine%') AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/assets/menu/starter.png' WHERE image_url IS NULL AND (name ILIKE '%Salad%' OR name ILIKE '%Toast%' OR name ILIKE '%Shrimp%' OR name ILIKE '%Oysters%' OR name ILIKE '%Board%') AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/assets/menu/main.png' WHERE image_url IS NULL AND (name ILIKE '%Seafood%' OR name ILIKE '%Fish%' OR name ILIKE '%Chicken%' OR name ILIKE '%Burger%' OR name ILIKE '%Lamb%' OR name ILIKE '%Osso%') AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/assets/menu/sauce.png' WHERE (name ILIKE '%Sauce' OR name ILIKE 'Bearnaise' OR name ILIKE 'Red Wine Jus' OR name ILIKE 'Garlic Aioli') AND user_id = target_user_id;
    UPDATE recipes SET image_url = '/assets/menu/main.png' WHERE image_url IS NULL AND user_id = target_user_id;
  END $$;
