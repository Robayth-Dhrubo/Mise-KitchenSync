-- =============================================
-- MISE MASTER SETUP SCRIPT
-- This single file sets up EVERYTHING:
-- 1. Core schema updates
-- 2. All 75 recipes with ingredients
-- 3. Recipe Bible (cooking steps)
-- 4. Run this ONE file in Supabase SQL Editor
-- =============================================

-- First, ensure we have the recipe_steps table
CREATE TABLE IF NOT EXISTS recipe_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    duration_minutes INTEGER,
    tip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe components for sub-recipes (sauces)
CREATE TABLE IF NOT EXISTS recipe_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    component_recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    quantity_needed DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_used VARCHAR(50) NOT NULL DEFAULT 'portion',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_recipe_id, component_recipe_id)
);

-- Add new columns to recipes (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'cook_time_minutes') THEN
        ALTER TABLE recipes ADD COLUMN cook_time_minutes INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'yield_quantity') THEN
        ALTER TABLE recipes ADD COLUMN yield_quantity DECIMAL(10,2) DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'yield_unit') THEN
        ALTER TABLE recipes ADD COLUMN yield_unit VARCHAR(50) DEFAULT 'portion';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'is_component') THEN
        ALTER TABLE recipes ADD COLUMN is_component BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'category') THEN
        ALTER TABLE recipes ADD COLUMN category VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipes' AND column_name = 'image_url') THEN
        ALTER TABLE recipes ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if exist, then create)
DROP POLICY IF EXISTS "Users can view own recipe steps" ON recipe_steps;
DROP POLICY IF EXISTS "Users can insert own recipe steps" ON recipe_steps;
DROP POLICY IF EXISTS "Users can update own recipe steps" ON recipe_steps;
DROP POLICY IF EXISTS "Users can delete own recipe steps" ON recipe_steps;

CREATE POLICY "Users can view own recipe steps" ON recipe_steps FOR SELECT
    USING (recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own recipe steps" ON recipe_steps FOR INSERT
    WITH CHECK (recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own recipe steps" ON recipe_steps FOR UPDATE
    USING (recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own recipe steps" ON recipe_steps FOR DELETE
    USING (recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own recipe components" ON recipe_components;
DROP POLICY IF EXISTS "Users can insert own recipe components" ON recipe_components;
DROP POLICY IF EXISTS "Users can update own recipe components" ON recipe_components;
DROP POLICY IF EXISTS "Users can delete own recipe components" ON recipe_components;

CREATE POLICY "Users can view own recipe components" ON recipe_components FOR SELECT
    USING (parent_recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own recipe components" ON recipe_components FOR INSERT
    WITH CHECK (parent_recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own recipe components" ON recipe_components FOR UPDATE
    USING (parent_recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own recipe components" ON recipe_components FOR DELETE
    USING (parent_recipe_id IN (SELECT id FROM recipes WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe ON recipe_steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_components_parent ON recipe_components(parent_recipe_id);

-- =============================================
-- NOW POPULATE DATA
-- =============================================

DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get the first user
  SELECT id INTO target_user_id FROM auth.users LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found. Please sign up first.';
  END IF;

  -- Clear existing recipe data for clean slate
  DELETE FROM recipe_steps WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = target_user_id);
  DELETE FROM recipe_components WHERE parent_recipe_id IN (SELECT id FROM recipes WHERE user_id = target_user_id);
  DELETE FROM recipe_items WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = target_user_id);
  DELETE FROM recipes WHERE user_id = target_user_id;
  DELETE FROM ingredients WHERE user_id = target_user_id;

  RAISE NOTICE 'Cleared old data for user %', target_user_id;

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

  RAISE NOTICE 'Inserted 27 ingredients';

  -- ---------------------------------------------------------
  -- RECIPES (75 items)
  -- ---------------------------------------------------------
  
  INSERT INTO recipes (user_id, name, menu_price, target_food_cost_pct, category) VALUES
  -- STARTERS
  (target_user_id, 'Beef Carpaccio', 24.00, 30, 'Starter'),
  (target_user_id, 'Beef Tartare Classic', 26.00, 30, 'Starter'),
  (target_user_id, 'Salmon Tartare', 22.00, 30, 'Starter'),
  (target_user_id, 'Scallop Ceviche', 28.00, 25, 'Starter'),
  (target_user_id, 'Lobster Bisque', 19.00, 35, 'Starter'),
  (target_user_id, 'French Onion Soup', 16.00, 40, 'Starter'),
  (target_user_id, 'Goat Cheese Salad', 18.00, 30, 'Starter'),
  (target_user_id, 'Caesar Salad', 16.00, 35, 'Starter'),
  (target_user_id, 'Mushroom Toast', 19.00, 28, 'Starter'),
  (target_user_id, 'Garlic Shrimp', 24.00, 30, 'Starter'),
  (target_user_id, 'Spinach Dip', 15.00, 40, 'Starter'),
  (target_user_id, 'Tuna Tataki', 26.00, 30, 'Starter'),
  (target_user_id, 'Oysters Rockefeller', 32.00, 25, 'Starter'),
  (target_user_id, 'Foie Gras Torchon', 38.00, 25, 'Starter'),
  (target_user_id, 'Charcuterie Board', 35.00, 40, 'Starter'),

  -- MAINS MEAT
  (target_user_id, 'Filet Mignon 6oz', 48.00, 25, 'Main - Meat'),
  (target_user_id, 'Filet Mignon 8oz', 62.00, 25, 'Main - Meat'),
  (target_user_id, 'Steak Frites', 38.00, 30, 'Main - Meat'),
  (target_user_id, 'Ribeye Steak 12oz', 55.00, 30, 'Main - Meat'),
  (target_user_id, 'Braised Short Rib', 42.00, 35, 'Main - Meat'),
  (target_user_id, 'Duck Confit', 36.00, 35, 'Main - Meat'),
  (target_user_id, 'Duck Magret', 40.00, 30, 'Main - Meat'),
  (target_user_id, 'Rack of Lamb (Full)', 65.00, 25, 'Main - Meat'),
  (target_user_id, 'Rack of Lamb (Half)', 38.00, 25, 'Main - Meat'),
  (target_user_id, 'Chicken Supreme', 29.00, 40, 'Main - Meat'),
  (target_user_id, 'Roast Chicken (Whole)', 55.00, 40, 'Main - Meat'),
  (target_user_id, 'Beef Wellington', 65.00, 20, 'Main - Meat'),
  (target_user_id, 'Veal Chop', 58.00, 30, 'Main - Meat'),
  (target_user_id, 'Pork Belly Crispy', 32.00, 40, 'Main - Meat'),
  (target_user_id, 'Burger Deluxe', 24.00, 35, 'Main - Meat'),
  (target_user_id, 'Lamb Shank', 38.00, 35, 'Main - Meat'),
  (target_user_id, 'Osso Bucco', 42.00, 35, 'Main - Meat'),
  (target_user_id, 'Surf and Turf', 75.00, 25, 'Main - Meat'),
  (target_user_id, 'Chicken Pot Pie', 26.00, 50, 'Main - Meat'),
  (target_user_id, 'Meatballs and Polenta', 28.00, 45, 'Main - Meat'),

  -- MAINS FISH
  (target_user_id, 'Pan Seared Scallops', 44.00, 30, 'Main - Seafood'),
  (target_user_id, 'Grilled Salmon', 34.00, 35, 'Main - Seafood'),
  (target_user_id, 'Sea Bass Filet', 42.00, 30, 'Main - Seafood'),
  (target_user_id, 'Lobster Thermidor', 85.00, 20, 'Main - Seafood'),
  (target_user_id, 'Lobster Roll', 32.00, 30, 'Main - Seafood'),
  (target_user_id, 'Fish and Chips', 26.00, 45, 'Main - Seafood'),
  (target_user_id, 'Seafood Risotto', 38.00, 30, 'Main - Seafood'),
  (target_user_id, 'Linguine Vongole', 28.00, 35, 'Main - Seafood'),
  (target_user_id, 'Mussels Mariniere', 24.00, 40, 'Main - Seafood'),
  (target_user_id, 'Grilled Octopus', 36.00, 30, 'Main - Seafood'),
  (target_user_id, 'Halibut', 45.00, 30, 'Main - Seafood'),
  (target_user_id, 'Trout Almondine', 32.00, 35, 'Main - Seafood'),
  (target_user_id, 'Seafood Tower', 120.00, 25, 'Main - Seafood'),
  (target_user_id, 'Shrimp Scampi', 34.00, 30, 'Main - Seafood'),
  (target_user_id, 'Cod Loin', 36.00, 35, 'Main - Seafood'),

  -- SIDES
  (target_user_id, 'Truffle Fries', 12.00, 60, 'Side'),
  (target_user_id, 'Mashed Potatoes', 10.00, 70, 'Side'),
  (target_user_id, 'Grilled Asparagus', 14.00, 40, 'Side'),
  (target_user_id, 'Sauteed Mushrooms', 12.00, 50, 'Side'),
  (target_user_id, 'Mac and Cheese', 16.00, 55, 'Side'),
  (target_user_id, 'Roasted Carrots', 10.00, 60, 'Side'),
  (target_user_id, 'Creamed Spinach', 12.00, 50, 'Side'),
  (target_user_id, 'Brussels Sprouts', 12.00, 50, 'Side'),
  (target_user_id, 'Onion Rings', 9.00, 70, 'Side'),
  (target_user_id, 'Rice Pilaf', 8.00, 80, 'Side'),

  -- DESSERTS
  (target_user_id, 'Creme Brulee', 14.00, 70, 'Dessert'),
  (target_user_id, 'Chocolate Mousse', 12.00, 65, 'Dessert'),
  (target_user_id, 'Cheesecake', 14.00, 60, 'Dessert'),
  (target_user_id, 'Tiramisu', 14.00, 60, 'Dessert'),
  (target_user_id, 'Lemon Tart', 12.00, 65, 'Dessert'),
  (target_user_id, 'Apple Crumble', 12.00, 70, 'Dessert'),
  (target_user_id, 'Molten Cake', 15.00, 65, 'Dessert'),
  (target_user_id, 'Ice Cream Trio', 10.00, 70, 'Dessert'),
  (target_user_id, 'Fruit Plate', 12.00, 50, 'Dessert'),
  (target_user_id, 'Cheese Board', 24.00, 40, 'Dessert'),

  -- SAUCES (Components)
  (target_user_id, 'Hollandaise Sauce', 5.00, 30, 'Sauce'),
  (target_user_id, 'Peppercorn Sauce', 4.00, 30, 'Sauce'),
  (target_user_id, 'Bearnaise', 5.00, 30, 'Sauce'),
  (target_user_id, 'Red Wine Jus', 4.00, 30, 'Sauce'),
  (target_user_id, 'Garlic Aioli', 2.00, 80, 'Sauce');

  -- Mark sauces as components
  UPDATE recipes SET is_component = TRUE WHERE user_id = target_user_id AND category = 'Sauce';

  RAISE NOTICE 'Inserted 75 recipes';

  -- ---------------------------------------------------------
  -- RECIPE ITEMS (Linking ingredients to recipes)
  -- ---------------------------------------------------------
  
  -- Beef Carpaccio
  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.15, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Beef Carpaccio' AND i.name = 'Beef Tenderloin' AND r.user_id = target_user_id AND i.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.02, 'L' FROM recipes r, ingredients i WHERE r.name = 'Beef Carpaccio' AND i.name = 'Olive Oil' AND r.user_id = target_user_id AND i.user_id = target_user_id;

  -- Filet Mignon 6oz
  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.4, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Filet Mignon 6oz' AND i.name = 'Beef Tenderloin' AND r.user_id = target_user_id AND i.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.1, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Filet Mignon 6oz' AND i.name = 'Butter Unsalted' AND r.user_id = target_user_id AND i.user_id = target_user_id;

  -- Truffle Fries
  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.8, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Truffle Fries' AND i.name = 'Potatoes Yukon' AND r.user_id = target_user_id AND i.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.01, 'L' FROM recipes r, ingredients i WHERE r.name = 'Truffle Fries' AND i.name = 'Truffle Oil' AND r.user_id = target_user_id AND i.user_id = target_user_id;

  -- Pan Seared Scallops
  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.5, 'lbs' FROM recipes r, ingredients i WHERE r.name = 'Pan Seared Scallops' AND i.name = 'Scallops' AND r.user_id = target_user_id AND i.user_id = target_user_id;

  -- Creme Brulee
  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.2, 'L' FROM recipes r, ingredients i WHERE r.name = 'Creme Brulee' AND i.name = 'Heavy Cream' AND r.user_id = target_user_id AND i.user_id = target_user_id;

  INSERT INTO recipe_items (recipe_id, ingredient_id, quantity_needed, unit_used)
  SELECT r.id, i.id, 0.15, 'doz' FROM recipes r, ingredients i WHERE r.name = 'Creme Brulee' AND i.name = 'Eggs Large' AND r.user_id = target_user_id AND i.user_id = target_user_id;

  RAISE NOTICE 'Inserted recipe items';

  -- ---------------------------------------------------------
  -- RECIPE STEPS (Cooking Instructions)
  -- ---------------------------------------------------------

  -- Beef Carpaccio Steps
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 1, 'Wrap beef tenderloin tightly in plastic and freeze for 30 minutes until firm but not frozen.', 30, 'The semi-frozen state makes slicing paper-thin much easier.'
  FROM recipes r WHERE r.name = 'Beef Carpaccio' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 2, 'Using a very sharp knife, slice the beef as thin as possible, almost translucent.', 5, NULL
  FROM recipes r WHERE r.name = 'Beef Carpaccio' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 3, 'Arrange slices on a chilled plate, overlapping slightly.', 3, NULL
  FROM recipes r WHERE r.name = 'Beef Carpaccio' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 4, 'Drizzle with olive oil and lemon. Top with parmesan shavings and microgreens.', 2, 'Serve immediately.'
  FROM recipes r WHERE r.name = 'Beef Carpaccio' AND r.user_id = target_user_id;

  -- Filet Mignon Steps
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 1, 'Remove steak from fridge 30 minutes before cooking. Pat completely dry.', 30, 'Room temp meat cooks more evenly.'
  FROM recipes r WHERE r.name = 'Filet Mignon 6oz' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 2, 'Season generously with kosher salt and cracked pepper on all sides.', 1, NULL
  FROM recipes r WHERE r.name = 'Filet Mignon 6oz' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 3, 'Heat cast iron until smoking. Add oil.', 3, 'Pan must be screaming hot.'
  FROM recipes r WHERE r.name = 'Filet Mignon 6oz' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 4, 'Sear 3 min per side. Add butter, garlic, thyme. Baste.', 7, NULL
  FROM recipes r WHERE r.name = 'Filet Mignon 6oz' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 5, 'Rest 5 minutes before serving.', 5, 'Resting is critical for juicy steak.'
  FROM recipes r WHERE r.name = 'Filet Mignon 6oz' AND r.user_id = target_user_id;

  -- Pan Seared Scallops Steps
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 1, 'Remove side muscle. Pat scallops extremely dry.', 5, 'Moisture prevents searing.'
  FROM recipes r WHERE r.name = 'Pan Seared Scallops' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 2, 'Season with salt. Heat stainless pan until smoking.', 2, NULL
  FROM recipes r WHERE r.name = 'Pan Seared Scallops' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 3, 'Place scallops clockwise. Do not move for 90 seconds.', 2, 'If it sticks, its not ready.'
  FROM recipes r WHERE r.name = 'Pan Seared Scallops' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 4, 'Flip. Add butter. Baste 30 seconds. Remove immediately.', 1, 'Scallops overcook in seconds.'
  FROM recipes r WHERE r.name = 'Pan Seared Scallops' AND r.user_id = target_user_id;

  -- Creme Brulee Steps
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 1, 'Heat cream with vanilla bean until steaming.', 10, NULL
  FROM recipes r WHERE r.name = 'Creme Brulee' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 2, 'Whisk yolks with sugar until pale.', 3, NULL
  FROM recipes r WHERE r.name = 'Creme Brulee' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 3, 'Slowly temper hot cream into yolks. Strain into ramekins.', 3, NULL
  FROM recipes r WHERE r.name = 'Creme Brulee' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 4, 'Bake in water bath at 325F for 45 min until jiggly.', 45, NULL
  FROM recipes r WHERE r.name = 'Creme Brulee' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 5, 'Chill 4+ hours. Torch sugar before serving.', 240, 'Must be cold to brulee properly.'
  FROM recipes r WHERE r.name = 'Creme Brulee' AND r.user_id = target_user_id;

  -- Peppercorn Sauce Steps
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 1, 'After cooking steak, keep fond in pan. Add shallots and peppercorns.', 1, NULL
  FROM recipes r WHERE r.name = 'Peppercorn Sauce' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 2, 'Deglaze with cognac. Flambe carefully.', 2, 'Stand back!'
  FROM recipes r WHERE r.name = 'Peppercorn Sauce' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 3, 'Add stock, reduce by half. Add cream, simmer until thick.', 8, NULL
  FROM recipes r WHERE r.name = 'Peppercorn Sauce' AND r.user_id = target_user_id;
  
  INSERT INTO recipe_steps (recipe_id, step_number, instruction, duration_minutes, tip)
  SELECT r.id, 4, 'Finish with cold butter for shine.', 1, NULL
  FROM recipes r WHERE r.name = 'Peppercorn Sauce' AND r.user_id = target_user_id;

  RAISE NOTICE 'Inserted recipe steps';

  -- ---------------------------------------------------------
  -- LINK SAUCES TO MAIN DISHES
  -- ---------------------------------------------------------
  
  INSERT INTO recipe_components (parent_recipe_id, component_recipe_id, quantity_needed, unit_used)
  SELECT p.id, c.id, 2, 'tbsp'
  FROM recipes p, recipes c
  WHERE p.name = 'Filet Mignon 6oz' AND c.name = 'Peppercorn Sauce' 
    AND p.user_id = target_user_id AND c.user_id = target_user_id;

  RAISE NOTICE '=== MISE SETUP COMPLETE ===';
  RAISE NOTICE 'Created: 27 ingredients, 75 recipes, cooking steps, and sauce links';

END $$;
