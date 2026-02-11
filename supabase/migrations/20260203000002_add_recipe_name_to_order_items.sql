-- Add recipe_name to order_items for receipt permanence
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS recipe_name text;

-- Update existing order_items with current recipe names as a fallback
UPDATE public.order_items oi
SET recipe_name = r.name
FROM public.recipes r
WHERE oi.recipe_id = r.id
AND oi.recipe_name IS NULL;

-- Ensure guests can view order items for their sessions
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
CREATE POLICY "Public can view order items" ON public.order_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
        AND (
            o.guest_session_id IS NOT NULL OR 
            public.is_admin()
        )
    )
);
