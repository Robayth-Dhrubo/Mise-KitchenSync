-- =============================================
-- SCRIPT: PURGE ALL VENDOR DATA (FIXED)
-- DATA DELETION WARNING: This will remove ALL vendors and associated pricing!
-- Run this in the Supabase SQL Editor
-- =============================================

DO $$
BEGIN

    -- 1. Unlink Shopping List Items
    -- We keep the items so you don't lose your order list, but remove the vendor assignment.
    UPDATE public.shopping_list 
    SET vendor_id = NULL;

    RAISE NOTICE 'Unlinked items from shopping_list.';

    -- 2. Delete Vendor Products
    -- This removes the link between ingredients and vendors.
    DELETE FROM public.vendor_products;

    RAISE NOTICE 'Deleted all vendor_products.';

    -- 3. Delete Vendor Blacklist
    -- Clears any "Ignored" vendors from discovery.
    DELETE FROM public.vendor_blacklist;

    RAISE NOTICE 'Deleted vendor_blacklist.';

    -- 4. Delete Suppliers (The Vendors)
    -- Finally, remove the actual vendor records.
    DELETE FROM public.suppliers;

    RAISE NOTICE 'Deleted all suppliers.';

END $$;

-- Verify Deletion (This runs outside the block)
SELECT count(*) as vendors_remaining FROM public.suppliers;
