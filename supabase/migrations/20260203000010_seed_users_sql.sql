-- Robust User Seeding (Handles existing emails)
DO $$
DECLARE
    -- Standard Users
    v_admin_email text := 'admin@mise.local';
    v_chef_email text := 'chef@mise.local';
    v_fo_email text := 'fo@mise.local';
    
    v_uid uuid;
    pass_hash text := crypt('password123', gen_salt('bf'));
BEGIN

    -- 1. ADMIN
    -- Check if exists by email
    SELECT id INTO v_uid FROM auth.users WHERE email = v_admin_email;
    
    IF v_uid IS NOT NULL THEN
        -- Update existing
        UPDATE auth.users SET encrypted_password = pass_hash, email_confirmed_at = now() WHERE id = v_uid;
    ELSE
        -- Create new
        v_uid := '38c6148a-9d26-4482-9abf-3b1fa8e67634'; -- Preferred ID
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_admin_email, pass_hash, now(), now(), now());
    END IF;

    -- Upsert Profile
    INSERT INTO public.profiles (id, email, full_name, role, restaurant_name)
    VALUES (v_uid, v_admin_email, 'Owner Admin', 'owner', 'Mise Demo Kitchen')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'owner';


    -- 2. CHEF
    SELECT id INTO v_uid FROM auth.users WHERE email = v_chef_email;
    
    IF v_uid IS NOT NULL THEN
        UPDATE auth.users SET encrypted_password = pass_hash, email_confirmed_at = now() WHERE id = v_uid;
    ELSE
        v_uid := '096664d5-d78a-4458-847e-d04667cc5486';
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_chef_email, pass_hash, now(), now(), now());
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, restaurant_name)
    VALUES (v_uid, v_chef_email, 'Executive Chef', 'chef', 'Mise Demo Kitchen')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'chef';


    -- 3. FRONT OFFICE
    SELECT id INTO v_uid FROM auth.users WHERE email = v_fo_email;
    
    IF v_uid IS NOT NULL THEN
        UPDATE auth.users SET encrypted_password = pass_hash, email_confirmed_at = now() WHERE id = v_uid;
    ELSE
        v_uid := 'a756486a-a8f5-421a-a46c-e8b7a8061eba';
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_fo_email, pass_hash, now(), now(), now());
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, restaurant_name)
    VALUES (v_uid, v_fo_email, 'Front Desk', 'front_office', 'Mise Demo Kitchen')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'front_office';

END $$;
