import { createAdminClient } from '../src/lib/supabase/admin'

/**
 * scripts/seed-dev.ts
 * 
 * Run with: npm run run-script scripts/seed-dev.ts
 * 
 * This script seeds the local database with development data
 * including a default admin user, locations, and sample recipes.
 */
async function seedDev() {
    console.log('🌱 Starting development seeding...')
    const adminSupabase = createAdminClient()

    // 1. Create/Find Admin User
    console.log('   - Setting up admin user...')
    const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers()
    let ownerId = authUsers?.find(u => u.email === 'admin@mise.local')?.id

    if (!ownerId) {
        const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
            email: 'admin@mise.local',
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: 'Local Admin' }
        })
        if (createError) throw createError
        ownerId = newUser.user.id
    }

    // 2. Ensure Profile
    await adminSupabase.from('profiles').upsert({
        id: ownerId,
        full_name: 'Local Admin',
        role: 'owner',
        restaurant_name: 'The Mise Kitchen'
    })

    // 3. Create Default Locations
    console.log('   - Creating default locations...')
    const sampleLocations = [
        { name: 'T-01', type: 'table', status: 'available' },
        { name: 'T-02', type: 'table', status: 'occupied' },
        { name: 'R-101', type: 'room', status: 'available' }
    ]

    for (const loc of sampleLocations) {
        await adminSupabase.from('locations').upsert({
            ...loc,
            user_id: ownerId
        }, { onConflict: 'name' })
    }

    // 4. Create Sample Recipes
    console.log('   - Seeding sample recipes...')
    const sampleRecipes = [
        {
            user_id: ownerId,
            name: 'The Sovereign Burger',
            description: 'A5 Wagyu beef, black truffle aioli, 24k gold-leafed brioche, aged cheddar.',
            category: 'mains',
            menu_price: 32.00,
            image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
            is_available: true
        },
        {
            user_id: ownerId,
            name: 'Velvet Lobster Risotto',
            description: 'Maine lobster tail, saffron-infused aribio rice, forestry mushroom reduction.',
            category: 'mains',
            menu_price: 45.00,
            image_url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
            is_available: true
        }
    ]

    for (const recipe of sampleRecipes) {
        await adminSupabase.from('recipes').upsert(recipe, { onConflict: 'name' })
    }

    console.log('✅ Seeding complete!')
}

seedDev().catch(err => {
    console.error('❌ Seeding failed:', err)
    process.exit(1)
})
