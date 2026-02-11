
import { createClient } from '@supabase/supabase-js'

// HOTFIX: Local Config
const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

async function reseedClean() {
    console.log('🧹 Starting Clean Reseed...')
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    const users = [
        { email: 'chef@mise.local', password: 'password123', role: 'chef', name: 'Executive Chef' },
        { email: 'admin@mise.local', password: 'password123', role: 'admin', name: 'Owner Admin' },
        { email: 'fo@mise.local', password: 'password123', role: 'foh', name: 'Front Desk' }
    ]

    for (const u of users) {
        // 1. Find existing
        const { data: { users: existing } } = await supabase.auth.admin.listUsers()
        const match = existing.find(e => e.email === u.email)

        if (match) {
            console.log(`- Deleting existing ${u.email}...`)
            const { error: delErr } = await supabase.auth.admin.deleteUser(match.id)
            if (delErr) console.error('Delete Error:', delErr)
        }

        // 2. Create Fresh
        console.log(`- Creating ${u.email}...`)
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
            email: u.email,
            password: u.password,
            email_confirm: true
        })

        if (createError) {
            console.error('Create Error:', createError)
            continue
        }

        // 3. Update Profile
        if (authData.user) {
            console.log(`- Updating Profile for ${u.email}...`)
            const { error: profError } = await supabase
                .from('profiles')
                .update({
                    role: u.role,
                    full_name: u.name,
                    restaurant_name: 'Mise Demo Kitchen'
                })
                .eq('id', authData.user.id)

            if (profError) console.error('Profile Error:', profError)
            else console.log('✅ Success')
        }
    }
}

reseedClean()
