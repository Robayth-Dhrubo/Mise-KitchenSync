-- Add guest_name to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_name text;

-- Update RLS to allow guest access with Name + PIN verification if needed
-- For now, we keep the previous PIN/Session based access but ensure name is stored for staff visibility
COMMENT ON COLUMN public.orders.guest_name IS 'Name of the guest who placed the order';
