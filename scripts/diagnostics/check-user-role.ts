import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to bypass RLS for checking

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRoles() {
    console.log('--- Checking User Roles ---')

    // Get all users (from auth - limited access via admin API usually, but here we check profiles)
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, role')

    if (error) {
        console.error('Error fetching profiles:', error)
        return
    }

    console.log('Found Profiles:', profiles.length)
    profiles.forEach(p => {
        console.log(`User: ${p.email} | Role: ${p.role || 'NONE'}`)
    })
}

checkRoles()
