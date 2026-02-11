-- Deep Clean for Corrupted Users (Valid Dependency Order)

-- 1. Reservations (References Locations & Users)
DELETE FROM public.reservations
WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local'))
   OR location_id IN (
        SELECT id FROM public.locations 
        WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local'))
   );

-- 2. Orders (References Locations)
-- Only delete orders attached to locations owned by these users
DELETE FROM public.orders
WHERE location_id IN (
    SELECT id FROM public.locations 
    WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local'))
);

-- 3. Recipe Items (References Recipes AND Ingredients)
DELETE FROM public.recipe_items
WHERE recipe_id IN (
    SELECT id FROM public.recipes 
    WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local'))
)
OR ingredient_id IN (
    SELECT id FROM public.ingredients 
    WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local'))
);

-- 4. Sales Logs
DELETE FROM public.sales_logs
WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local'));

-- 5. Recipes
DELETE FROM public.recipes
WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local'));

-- 6. Ingredients
DELETE FROM public.ingredients
WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local'));

-- 7. Locations
DELETE FROM public.locations
WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local'));

-- 8. Profiles
DELETE FROM public.profiles
WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local');

-- 9. Auth Users
DELETE FROM auth.users 
WHERE email IN ('chef@mise.local', 'admin@mise.local', 'fo@mise.local');

