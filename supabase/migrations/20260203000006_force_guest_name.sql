-- =============================================
-- FORCE COLUMN RESET
-- =============================================

-- 1. Drop the column explicitly to force a schema change event
ALTER TABLE public.orders DROP COLUMN IF EXISTS guest_name;

-- 2. Add it back immediately
ALTER TABLE public.orders ADD COLUMN guest_name text;

-- 3. Force reload again (just to be double sure)
NOTIFY pgrst, 'reload config';
