-- Fix Permissions for profiles table
GRANT ALL ON TABLE public.profiles TO postgres;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO anon;

-- Explicitly grant on the new column (redundant but safe)
-- (Postgres doesn't need column specific if table granted, but helps clarify intent)

-- Force Cache Reload
NOTIFY pgrst, 'reload schema';
