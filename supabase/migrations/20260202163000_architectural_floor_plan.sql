-- Architectural Floor Plan Schema Updates

-- 1. Expand 'locations' table with architectural dimensions and metadata
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS width double precision DEFAULT 10, -- Default width %
ADD COLUMN IF NOT EXISTS height double precision DEFAULT 10, -- Default height %
ADD COLUMN IF NOT EXISTS rotation double precision DEFAULT 0, -- Rotation in degrees
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb, -- Extra props like color, label visibility
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false; -- To prevent accidental moves

-- 2. Update the 'type' check constraint to support new architectural elements
-- First, drop the existing constraint (handling potential naming variations)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'locations_type_check'
    ) THEN
        ALTER TABLE public.locations DROP CONSTRAINT locations_type_check;
    END IF;
END $$;

-- Re-add the constraint with expanded types
ALTER TABLE public.locations
ADD CONSTRAINT locations_type_check 
CHECK (type IN (
    'table', 
    'room', 
    'wall', 
    'kitchen', 
    'restroom', 
    'bar', 
    'entrance', 
    'obstacle',
    'service_point'
));

-- 3. Add default dimensions for existing types if needed (optional cleanup)
UPDATE public.locations 
SET width = 10, height = 10 
WHERE width IS NULL;

-- 4. Comment on columns for documentation
COMMENT ON COLUMN public.locations.width IS 'Width of the element in percentage (0-100)';
COMMENT ON COLUMN public.locations.height IS 'Height of the element in percentage (0-100)';
COMMENT ON COLUMN public.locations.rotation IS 'Rotation in degrees (0-360)';
COMMENT ON COLUMN public.locations.metadata IS 'JSONB bag for UI-specific properties (color, icon, dashed_border, etc.)';
