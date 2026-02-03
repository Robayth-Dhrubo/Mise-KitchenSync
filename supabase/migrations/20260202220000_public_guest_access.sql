-- =============================================
-- GUEST ACCESS & PUBLIC VISIBILITY
-- =============================================

-- 1. Allow public visibility of profiles (minimal info)
-- This is required for the guest portal to identify the "Hotel/Restaurant" owner
drop policy if exists "Guests can view restaurant profiles" on profiles;
create policy "Guests can view restaurant profiles" on profiles for select
using (true);

-- 2. Allow public visibility of ingredients (for composition/allergens)
-- This is required because recipes -> recipe_items -> ingredients join 
-- must succeed for guests to see dish details
drop policy if exists "Guests can view ingredients" on ingredients;
create policy "Guests can view ingredients" on ingredients for select
using (true);

-- 3. Ensure recipes and items are globally viewable (already true, but for clarity)
drop policy if exists "Public recipes view" on recipes;
create policy "Public recipes view" on recipes for select
using (true);

drop policy if exists "Public recipe items view" on recipe_items;
create policy "Public recipe items view" on recipe_items for select
using (true);

-- 4. Ensure orders and order items can be created by guests
drop policy if exists "Public and Admin can view order items" on order_items;
create policy "Public and Admin can view order items" on order_items for select using (true);

drop policy if exists "Public and Admin can insert order items" on order_items;
create policy "Public and Admin can insert order items" on order_items for insert with check (true);
