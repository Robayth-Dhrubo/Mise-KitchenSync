-- MISE - ADMINISTRATIVE AUTHORITY MIGRATION
-- This migration ensures that Admins and Owners have absolute authority over system data.

-- 1. Create a secure helper to check for administrative roles
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
declare
  is_auth_admin boolean;
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'owner', 'chef', 'foh', 'fo')
  );
end;
$$;

-- 2. Update update_recipe_availability to enforce authority
create or replace function public.update_recipe_availability(
  p_is_available boolean,
  p_recipe_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  -- Robust check: Only admins, owners, or chefs can toggle availability
  if not public.is_admin() then
    raise exception 'Unauthorized: Insufficient privileges to toggle availability. Your current role does not have management authority.';
  end if;

  update public.recipes
  set is_available = p_is_available
  where id = p_recipe_id;
end;
$$;

-- 3. Enhance RLS Policies for Omnipotence
-- We use DO blocks to safely drop and recreate policies only if tables exist

DO $$ 
BEGIN
    -- profiles
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        drop policy if exists "Admins can view all profiles" on profiles;
        create policy "Admins can view all profiles" on profiles for select
        using (auth.uid() = id or public.is_admin());
    END IF;

    -- ingredients
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ingredients') THEN
        drop policy if exists "Admins can manage all ingredients" on ingredients;
        create policy "Admins can manage all ingredients" on ingredients for all
        using (auth.uid() = user_id or public.is_admin())
        with check (auth.uid() = user_id or public.is_admin());
    END IF;

    -- recipes
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes') THEN
        drop policy if exists "Admins can manage all recipes" on recipes;
        -- Public read
        create policy "Public recipes view" on recipes for select using (true);
        -- Admin management
        create policy "Admins can manage recipes" on recipes for all
        using (auth.uid() = user_id or public.is_admin())
        with check (auth.uid() = user_id or public.is_admin());
    END IF;

    -- recipe_items
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipe_items') THEN
        drop policy if exists "Admins can manage all recipe items" on recipe_items;
        -- Public read
        create policy "Public recipe items view" on recipe_items for select using (true);
        -- Admin management
        create policy "Admins can manage recipe items" on recipe_items for all
        using (
          exists (select 1 from recipes where recipes.id = recipe_items.recipe_id and (recipes.user_id = auth.uid() or public.is_admin()))
        )
        with check (
          exists (select 1 from recipes where recipes.id = recipe_items.recipe_id and (recipes.user_id = auth.uid() or public.is_admin()))
        );
    END IF;

    -- sales_logs
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales_logs') THEN
        drop policy if exists "Admins can view all sales" on sales_logs;
        create policy "Admins can view all sales" on sales_logs for select
        using (auth.uid() = user_id or public.is_admin());
    END IF;

    -- locations
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'locations') THEN
        drop policy if exists "Admins can manage all locations" on locations;
        drop policy if exists "Public can view locations" on locations;
        -- Public read for guests and all staff
        create policy "Public can view locations" on locations for select using (true);
        -- Admin management
        create policy "Admins can manage locations" on locations for all
        using (auth.uid() = user_id or public.is_admin());
    END IF;

    -- reservations
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reservations') THEN
        drop policy if exists "Admins can manage all reservations" on reservations;
        create policy "Admins can manage all reservations" on reservations for all
        using (auth.uid() = user_id or public.is_admin());
    END IF;

    -- orders
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
        drop policy if exists "Admins can manage all orders" on orders;
        -- Public and admin can view/insert
        create policy "Public and Admin can view orders" on orders for select using (true);
        create policy "Public and Admin can insert orders" on orders for insert with check (true);
        -- Administrative management
        create policy "Admins can manage orders" on orders for update
        using (auth.uid() = user_id or public.is_admin());
        create policy "Admins can delete orders" on orders for delete
        using (auth.uid() = user_id or public.is_admin());
    END IF;

    -- suppliers
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers') THEN
        drop policy if exists "Admins can manage all suppliers" on suppliers;
        create policy "Admins can manage all suppliers" on suppliers for all
        using (auth.uid() = user_id or public.is_admin())
        with check (auth.uid() = user_id or public.is_admin());
    END IF;

    -- vendor_products
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vendor_products') THEN
        drop policy if exists "Admins can manage all vendor products" on vendor_products;
        create policy "Admins can manage all vendor products" on vendor_products for all
        using (auth.uid() = user_id or public.is_admin())
        with check (auth.uid() = user_id or public.is_admin());
    END IF;

    -- shopping_list
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shopping_list') THEN
        drop policy if exists "Admins can manage all shopping list items" on shopping_list;
        create policy "Admins can manage all shopping list items" on shopping_list for all
        using (auth.uid() = user_id or public.is_admin())
        with check (auth.uid() = user_id or public.is_admin());
    END IF;
END $$;
