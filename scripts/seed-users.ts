
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local', override: true })

console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Key Present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('Key Start:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 5))

// Use direct client to bypass any app-level caching issues
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedUsers() {
    console.log('⚡️ Seeding Standard Users (Direct Client)...')

    const users = [
        {
            email: 'admin@mise.local',
            password: 'password123',
            role: 'owner',
            full_name: 'Owner Admin',
            restaurant_name: 'Mise Demo Kitchen'
        },
        {
            email: 'chef@mise.local',
            password: 'password123',
            role: 'chef',
            full_name: 'Executive Chef',
            restaurant_name: 'Mise Demo Kitchen'
        },
        {
            email: 'fo@mise.local',
            password: 'password123',
            role: 'front_office',
            full_name: 'Front Desk',
            restaurant_name: 'Mise Demo Kitchen'
        }
    ]

    for (const u of users) {
        console.log(`Processing ${u.email}...`)

        // 1. Check User Loop
        const { data: listData } = await supabase.auth.admin.listUsers()
        const existing = listData.users.find(eu => eu.email === u.email)

        let userId: string | null = null

        if (existing) {
            console.log(`- User exists: ${existing.id}`)
            userId = existing.id
            await supabase.auth.admin.updateUserById(userId, { password: u.password, email_confirm: true })
        } else {
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true
            })
            if (createError) {
                console.error(`- Failed to create auth user: ${createError.message}`)
                continue
            }
            if (newUser.user) {
                console.log(`- Created new user: ${newUser.user.id}`)
                userId = newUser.user.id
            }
        }

        if (userId) {
            // 2. Explicit Update (Minimal)
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    full_name: u.full_name
                })
                .eq('id', userId)

            if (updateError) {
                console.error(`- Update failed: ${updateError.message}`)
                // Try Insert if update failed (though unlikely given we found the user)
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        email: u.email,
                        role: u.role,
                        full_name: u.full_name,
                        restaurant_name: u.restaurant_name
                    })

                if (insertError) {
                    console.error(`- Insert failed: ${insertError.message}`)
                } else {
                    console.log(`- Inserted profile: ${u.role}`)
                }
            } else {
                console.log(`- Profile updated: ${u.role}`)
            }
        }
    }
    console.log('✅ Seeding Complete.')
}

seedUsers()
