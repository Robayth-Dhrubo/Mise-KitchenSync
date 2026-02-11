-- Force add full_name column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- Notify PostgREST to refresh cache
NOTIFY pgrst, 'reload schema';
