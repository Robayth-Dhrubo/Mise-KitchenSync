-- Add location_id to orders table to link with locations (Room/Table)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id);

-- Index for existing column
CREATE INDEX IF NOT EXISTS idx_orders_location_id ON public.orders(location_id);

-- Grant permissions if needed (though usually inherited)
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
