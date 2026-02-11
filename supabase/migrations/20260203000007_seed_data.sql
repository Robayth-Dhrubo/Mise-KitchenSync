-- =============================================
-- SEED DATA FOR LOCAL DEVELOPMENT (ROBUST)
-- =============================================

DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- 1. Ensure schema supports full_name (fix for broken migration)
    ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS full_name text;

    -- 2. Get existing user or create new one
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'admin@mise.local',
            '$2a$10$wLwU..your.hashed.password.here', -- Dummy hash
            now(),
            now(),
            now()
        );
    END IF;

    -- 2. Ensure profile exists
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (v_user_id, 'Admin User', 'owner')
    ON CONFLICT (id) DO NOTHING;

    -- 3. Create the specific location '11215'
    INSERT INTO public.locations (name, user_id, type, status)
    VALUES ('11215', v_user_id, 'room', 'occupied')
    ON CONFLICT DO NOTHING;

    -- 4. Create sample recipes
    INSERT INTO public.recipes (user_id, name, description, category, menu_price, image_url, is_available)
    VALUES 
    (v_user_id, 'Truffle Burger', 'Wagyu beef patty, black truffle aioli, brioche bun.', 'mains', 28.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', true),
    (v_user_id, 'Lobster Risotto', 'Maine lobster, saffron, forestry mushrooms.', 'mains', 42.00, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80', true),
    (v_user_id, 'Caesar Salad', 'Romaine hearts, parmesan crisp, white anchovy.', 'starters', 16.00, 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80', true),
    (v_user_id, 'Tiramisu', 'Mascarpone, espresso soaked ladyfingers.', 'desserts', 14.00, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80', true)
    ON CONFLICT DO NOTHING;

    -- 5. Force schema cache reload just in case
    NOTIFY pgrst, 'reload config';

END $$;
