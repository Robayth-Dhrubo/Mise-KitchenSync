
-- Fix Permissions V3 (The Last Hope)
-- Explicitly GRANT and ENABLE permissive RLS for all operational tables

-- 1. Ensure RLS is enabled (idempotent)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create permissive policies for 'authenticated' and 'anon'
-- We use DO block to defensively create policies
DO $$
BEGIN
    -- ORDERS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON "public"."orders" FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- ORDER_ITEMS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON "public"."order_items" FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- RECIPES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON "public"."recipes" FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- LOCATIONS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'locations' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON "public"."locations" FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- INGREDIENTS
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ingredients' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON "public"."ingredients" FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- PROFILES
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Enable all access for all users') THEN
        CREATE POLICY "Enable all access for all users" ON "public"."profiles" FOR ALL USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- 3. Grant Usage and All Privileges
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
