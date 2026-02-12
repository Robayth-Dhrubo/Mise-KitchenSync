import { createClient } from '@supabase/supabase-js'

// Hardcoded Local Config
const SUPABASE_URL = 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

async function debugFOHFetch() {
    console.log('🧪 Debugging FOH Fetch...')

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // 1. Log In as FOH
    console.log('1. Attempting SignIn (fo@mise.local)...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'fo@mise.local',
        password: 'password123'
    })

    if (authError) {
        console.error('❌ SignIn Failed:', authError.message)
        // Try creating if failed? Or just report.
        return
    }
    console.log('✅ SignIn Success. User ID:', authData.user?.id)

    // 2. Perform the FAILING query
    console.log('2. Fetching Active Orders (FOH)...')

    const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, recipe:recipes(name))')
        .neq('preparation_status', 'delivered')
        .neq('preparation_status', 'cancelled')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('❌ Active Orders Fetch FAILED:')
        console.log(JSON.stringify(error, null, 2))
    } else {
        console.log('✅ Active Orders Fetch SUCCESS!')
        console.log(`Found ${data.length} orders`)
    }
}

debugFOHFetch()
