
import { createClient } from '@supabase/supabase-js'

// Hardcoded Local Config (matching my browser patch)
const SUPABASE_URL = 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

async function testBrowserFlow() {
    console.log('🧪 Testing Browser Login Flow...')

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // 1. Log In
    console.log('1. Attempting SignIn...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'chef@mise.local',
        password: 'password123'
    })

    if (authError) {
        console.error('❌ SignIn Failed:', authError)
        return
    }
    console.log('✅ SignIn Success. User ID:', authData.user?.id)

    // 2. Fetch Profile (Simulating the page.tsx logic)
    console.log('2. Fetching Profile...')
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', authData.user?.id)
        .single()

    if (profileError) {
        console.error('❌ Profile Fetch Failed:', profileError)
        console.error('Details:', JSON.stringify(profileError, null, 2))
    } else {
        console.log('✅ Profile Fetch Success:', profile)
    }
}

testBrowserFlow()
