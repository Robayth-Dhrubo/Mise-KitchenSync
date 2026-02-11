import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { GuestMenu } from '@/components/guest/guest-menu'

export default async function GuestPage({ params }: { params: Promise<{ room: string }> }) {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const { room } = await params

    // 1. Fetch the location details for this "room" (could be a table or a room)
    const { data: locations, error: locError } = await adminSupabase
        .from('locations')
        .select('id, type, user_id')
        .eq('name', room)
        .limit(1)

    let location = locations?.[0]

    // AUTO-PROVISION: If room doesn't exist, create it for the primary owner
    // RESTRICTED: Only allowed in development environment
    if (!location && !locError && process.env.NODE_ENV === 'development') {
        // Get the first user (main restaurant owner) to assign the location to
        const { data: users } = await adminSupabase.from('profiles').select('id').limit(1)
        let ownerId = users?.[0]?.id

        // AUTO-SEED: If no owner exists (fresh local DB) & we are effectively in dev/preview, create one
        if (!ownerId) {
            console.log('⚡️ Auto-seeding local admin user...')

            // 1. Try to find existing admin user (in case previously created but profile missing)
            const { data: { users: authUsers }, error: listError } = await adminSupabase.auth.admin.listUsers()
            const existingAdmin = authUsers?.find(u => u.email === 'admin@mise.local')

            if (existingAdmin) {
                ownerId = existingAdmin.id
                console.log('Found existing admin:', ownerId)
            } else {
                // 2. Create if not exists
                const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
                    email: 'admin@mise.local',
                    password: 'password123',
                    email_confirm: true,
                    user_metadata: { full_name: 'Local Admin' }
                })
                if (newUser?.user) {
                    ownerId = newUser.user.id
                    console.log('Created new admin:', ownerId)
                } else if (createError) {
                    console.error('Failed to create admin:', createError)
                }
            }

            // 3. Ensure profile exists
            if (ownerId) {
                await adminSupabase.from('profiles').upsert({
                    id: ownerId,
                    full_name: 'Local Admin',
                    role: 'owner'
                }, { onConflict: 'id' }).select()
            }
        }

        if (ownerId) {
            const { data: newLoc, error: createError } = await adminSupabase
                .from('locations')
                .insert({
                    name: room,
                    user_id: ownerId,
                    type: room.toLowerCase().includes('table') || room.startsWith('T-') ? 'table' : 'room',
                    status: 'available'
                })
                .select()
                .single()

            if (newLoc) {
                // Assign newLoc to location so the rest of the script works
                location = newLoc
            } else if (createError) {
                console.error('Provisioning Error:', createError)
                // Let it fall through to the 404 block below
            }
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

    // AUTO-SEED RECIPES: If no recipes found, create sample ones for this owner
    // RESTRICTED: Only allowed in development environment
    if ((!recipesResponse.data || recipesResponse.data.length === 0) && process.env.NODE_ENV === 'development') {
        console.log('🔓 Unlocking the Vault: Seeding sample recipes...')
        await adminSupabase.from('recipes').insert([
            {
                user_id: location.user_id,
                name: 'The Sovereign Burger',
                description: 'A5 Wagyu beef, black truffle aioli, 24k gold-leafed brioche, aged cheddar.',
                category: 'mains',
                menu_price: 32.00,
                image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
                is_available: true
            },
            {
                user_id: location.user_id,
                name: 'Velvet Lobster Risotto',
                description: 'Maine lobster tail, saffron-infused aribio rice, forestry mushroom reduction.',
                category: 'mains',
                menu_price: 45.00,
                image_url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
                is_available: true
            },
            {
                user_id: location.user_id,
                name: 'Obsidian Caesar',
                description: 'Charred romaine hearts, squid ink dressing, parmesan crisp, white anchovy.',
                category: 'starters',
                menu_price: 18.00,
                image_url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80',
                is_available: true
            },
            {
                user_id: location.user_id,
                name: 'Midnight Tiramisu',
                description: 'Espresso-soaked ladyfingers, mascarpone cream, dark chocolate shavings.',
                category: 'desserts',
                menu_price: 16.00,
                image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80',
                is_available: true
            }
        ])

        // Re-fetch ensuring we get the new data
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
            .eq('user_id', location.user_id)
            .order('menu_price', { ascending: false })
    }

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
