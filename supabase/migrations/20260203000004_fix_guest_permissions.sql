-- =============================================
-- DEFINITIVE GUEST PERMISSIONS FIX
-- =============================================

-- Ensure orders table has public insert/select permissions
DROP POLICY IF EXISTS "Public and Admin can view orders" ON public.orders;
CREATE POLICY "Public and Admin can view orders" ON public.orders
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public and Admin can insert orders" ON public.orders;
CREATE POLICY "Public and Admin can insert orders" ON public.orders
FOR INSERT WITH CHECK (true);

-- Ensure order_items table has public insert/select permissions
DROP POLICY IF EXISTS "Public and Admin can view order items" ON public.order_items;
CREATE POLICY "Public and Admin can view order items" ON public.order_items
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public and Admin can insert order items" ON public.order_items;
CREATE POLICY "Public and Admin can insert order items" ON public.order_items
FOR INSERT WITH CHECK (true);

-- Ensure guest_name column exists (in case previous migration failed/skipped)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='guest_name') THEN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_name text;
  END IF;
END $$;

-- Ensure tracking_pin column exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='tracking_pin') THEN
    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_pin text;
  END IF;
END $$;
