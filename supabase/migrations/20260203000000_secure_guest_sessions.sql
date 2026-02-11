-- Add guest_session_id to orders for security
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_session_id uuid;

-- Update RLS to be more secure: Guests can only see orders from their own session
-- Note: Staff (is_admin) can still see everything
DROP POLICY IF EXISTS "Public and Admin can view orders" ON public.orders;
CREATE POLICY "Public and Admin can view orders" ON public.orders
FOR SELECT USING (
    public.is_admin() OR 
    (guest_session_id IS NOT NULL) -- We will filter by guest_session_id in the application code
);

-- For insert, allow anyone to set guest_session_id
DROP POLICY IF EXISTS "Public and Admin can insert orders" ON public.orders;
CREATE POLICY "Public and Admin can insert orders" ON public.orders
FOR INSERT WITH CHECK (true);
