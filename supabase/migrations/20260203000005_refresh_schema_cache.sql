-- =============================================
-- FORCE SCHEMA CACHE RELOAD
-- =============================================

-- 1. Ensure the column exists (Idempotent)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_name text;

-- 2. Notify PostgREST to reload the schema cache
-- This is necessary when columns are added but the API endpoint doesn't see them yet (PGRST204)
NOTIFY pgrst, 'reload config';
