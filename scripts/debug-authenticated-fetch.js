
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Hardcoded Local Config (matching my browser patch)
const SUPABASE_URL = 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

async function debugAuthenticatedFetch() {
    console.log('🧪 Debugging Authenticated Fetch...')

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // 1. Log In
    console.log('1. Attempting SignIn (chef@mise.local)...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'chef@mise.local',
        password: 'password123'
    })

    if (authError) {
        console.error('❌ SignIn Failed:', authError)
        return
    }
    console.log('✅ SignIn Success. User ID:', authData.user?.id)

    // 2. Perform the FAILING query
    console.log('2. Fetching Active Orders (Authenticated)...')

    // Config: Dashboard usually queries:
    // .from('orders')
    // .select('*, order_items(*, recipe:recipes(name))')
    // .neq('preparation_status', 'delivered')
    // .neq('preparation_status', 'cancelled')
    // .order('created_at', { ascending: false })

    const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, recipe:recipes(name))')
        .neq('preparation_status', 'delivered')
        .neq('preparation_status', 'cancelled')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('❌ Active Orders Fetch FAILED:')
        console.log('Full Error Object:', JSON.stringify(error, null, 2))
        console.log('Error Message:', error.message)
        console.log('Error Details:', error.details)
        console.log('Error Hint:', error.hint)
        console.log('Error Code:', error.code)
    } else {
        console.log('✅ Active Orders Fetch SUCCESS!')
        console.log(`Found ${data.length} orders`)
        if (data.length > 0) {
            console.log('Sample Order ID:', data[0].id)
        } else {
            console.log('No active orders found (but query succeeded).')
        }
    }
}

debugAuthenticatedFetch()
