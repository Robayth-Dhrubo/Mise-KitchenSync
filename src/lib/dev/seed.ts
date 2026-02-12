import { createAdminClient } from '@/lib/supabase/admin'

export async function seedDevForRoom(adminSupabase: ReturnType<typeof createAdminClient>, room: string) {
    // Find an owner (profile) in the DB
    const { data: users } = await adminSupabase.from('profiles').select('id').limit(1)
    let ownerId = users?.[0]?.id

    // If no owner found, attempt to create a local admin user
    if (!ownerId) {
        // Try to find existing auth user
        try {
            const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers()
            const existingAdmin = authUsers?.find((u: any) => u.email === 'admin@mise.local')
            if (existingAdmin) ownerId = existingAdmin.id
        } catch {
            // ignore and attempt to create
        }

        if (!ownerId) {
            try {
                const { data: newUser } = await adminSupabase.auth.admin.createUser({
                    email: 'admin@mise.local',
                    password: 'password123',
                    email_confirm: true,
                    user_metadata: { full_name: 'Local Admin' }
                } as any)
                ownerId = newUser?.user?.id
            } catch (err) {
                console.error('Failed to create local admin user', err)
            }
        }

        if (ownerId) {
            await adminSupabase.from('profiles').upsert({ id: ownerId, full_name: 'Local Admin', role: 'owner' }, { onConflict: 'id' }).select()
        }
    }

    if (!ownerId) return null

    // Create location if missing
    const { data: newLoc } = await adminSupabase
        .from('locations')
        .insert({
            name: room,
            user_id: ownerId,
            type: room.toLowerCase().includes('table') || room.startsWith('T-') ? 'table' : 'room',
            status: 'available'
        })
        .select()
        .single()

    const location = newLoc || null

    // Seed sample recipes for the owner (idempotent insert is fine for dev)
    if (location) {
        try {
            await adminSupabase.from('recipes').insert([
                {
                    user_id: ownerId,
                    name: 'The Sovereign Burger',
                    description: 'A5 Wagyu beef, black truffle aioli, 24k gold-leafed brioche, aged cheddar.',
                    category: 'Mains',
                    menu_price: 32.0,
                    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
                    is_available: true
                },
                {
                    user_id: ownerId,
                    name: 'Velvet Lobster Risotto',
                    description: 'Maine lobster tail, saffron-infused aribio rice, forestry mushroom reduction.',
                    category: 'Mains',
                    menu_price: 45.0,
                    image_url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
                    is_available: true
                },
                {
                    user_id: ownerId,
                    name: 'Obsidian Caesar',
                    description: 'Charred romaine hearts, squid ink dressing, parmesan crisp, white anchovy.',
                    category: 'Starters',
                    menu_price: 18.0, // Assuming a price based on other items
                    image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', // Placeholder image
                    is_available: true
                }
            ])
        } catch (err) {
            // ignore seed errors
            console.error('Seeding recipes failed', err)
        }
    }

    return location
}

export default seedDevForRoom
