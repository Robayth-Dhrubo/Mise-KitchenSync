import { createAdminClient } from '@/lib/supabase/admin'
import { supabaseConfig } from '@/lib/supabase/config'
import { GuestMenu } from '@/components/guest/guest-menu'
import seedDevForRoom from '@/lib/dev/seed'

export default async function GuestPage({ params }: { params: Promise<{ room: string }> }) {
    const adminSupabase = createAdminClient()
    const { room } = await params

    // 1. Fetch the location details for this "room" (could be a table or a room)
    const { data: locations, error: locError } = await adminSupabase
        .from('locations')
        .select('id, type, user_id')
        .eq('name', room)
        .limit(1)

    let location = locations?.[0]

    // AUTO-PROVISION: If room doesn't exist, optionally create it for local development
    // RESTRICTED: Only allowed in development environment AND on localhost to prevent leaks
    const isLocalhost = supabaseConfig.url.includes('127.0.0.1') || supabaseConfig.url.includes('localhost')
    const shouldAutoProvision = process.env.NODE_ENV === 'development' && isLocalhost

    if (!location && !locError && shouldAutoProvision) {
        try {
            const seeded = await seedDevForRoom(adminSupabase, room)
            if (seeded) location = seeded
        } catch (err) {
            console.error('Auto-provisioning failed:', err)
        }
    }

    if (locError || !location) {
        console.error('Error fetching location:', locError?.message)
        // Temporary Debug UI instead of 404
        return (
            <div className="min-h-screen bg-sidebar text-foreground p-10 font-mono">
                <h1 className="text-red-500 text-xl font-bold mb-4">404 - Room Not Found (Debug Mode)</h1>
                <p className="mb-2">Room: {room}</p>
                <p className="mb-2">Admin Client Status: {adminSupabase ? 'Active' : 'Missing'}</p>
                <p className="mb-4">Location Error: {locError?.message || 'None (Just empty)'}</p>
                <div className="p-4 bg-white/10 rounded">
                    <p>Auto-provisioning failed.</p>
                </div>
            </div>
        )
    }

    // 2. Fetch recipes (trying the location owner first, falling back to the main restaurant owner if empty)
    let recipesResponse = await adminSupabase
        .from('recipes')
        .select(`
            *,
            recipe_items (
                quantity_needed,
                unit_used,
                ingredient:ingredients (
                    name,
                    purchase_price,
                    purchase_unit,
                    current_stock,
                    conversion_ratio
                )
            )
        `)
        .eq('user_id', location.user_id)
        .order('menu_price', { ascending: false })

    // Seeding of sample recipes is handled by the dev seed helper when auto-provisioning is active

    // FALLBACK: If the location owner has no recipes, fetch from the main restaurant owner
    if (!recipesResponse.data || recipesResponse.data.length === 0) {
        recipesResponse = await adminSupabase
            .from('recipes')
            .select(`
                *,
                recipe_items (
                    quantity_needed,
                    unit_used,
                    ingredient:ingredients (
                        name,
                        purchase_price,
                        purchase_unit,
                        current_stock,
                        conversion_ratio
                    )
                )
            `)
            .limit(100) // Fetch from whoever has them for this demo
            .order('menu_price', { ascending: false })
    }

    const recipes = recipesResponse.data || []

    return (
        <GuestMenu
            recipes={recipes || []}
            room={room}
            hotelId={location.user_id}
            locationId={location.id}
            locationType={location.type as any}
        />
    )
}
