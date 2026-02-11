-- NUCLEAR SCHEMA FIX
-- 1. Drop the column explicitly to clear any zombie state
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name CASCADE;

-- 2. Add it back clean
ALTER TABLE public.profiles ADD COLUMN full_name text;

-- 3. Force Cache Reload
NOTIFY pgrst, 'reload schema';
