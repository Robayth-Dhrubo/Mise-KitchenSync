
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

async function testSignup() {
    console.log('🧪 Testing SignUp Flow...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const email = `test_${Date.now()}@example.com`

    const { data, error } = await supabase.auth.signUp({
        email,
        password: 'password123'
    })

    if (error) {
        console.error('❌ SignUp Failed:', error)
    } else {
        console.log('✅ SignUp Success:', data.user?.id)

        // Now Try Login
        console.log('Login attempt with new user...')
        const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password: 'password123'
        })
        if (loginError) console.error('❌ Login Failed:', loginError)
        else console.log('✅ Login Success!')
    }
}

testSignup()
