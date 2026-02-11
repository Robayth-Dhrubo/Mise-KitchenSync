
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkPolicies() {
    console.log('Checking RLS Policies...')

    // We can't query pg_catalog directly via PostgREST unless we have a stored procedure or if we use the SQL editor.
    // BUT we can use the 'rpc' method if we have a function, OR we can just try to insert/select as ANON.
    // Actually, inspecting pg_policies via service role might not work if not exposed.

    // Better test: specific RLS check by trying to Select as ANON.
    // Note: This script uses SERVICE ROLE, so it bypasses RLS.
    // To check RLS, we need an ANON client.

    const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Try to fetch active orders as ANON
    const { data, error } = await anonClient
        .from('orders')
        .select('count')
        .limit(1)

    if (error) {
        console.error('❌ ANON Access FAILED (RLS Mock Check):')
        console.log(JSON.stringify(error, null, 2))

        if (error.code === '42501') {
            console.log('Diagnosis: RLS Policy Missing or Denied.')
        }
    } else {
        console.log('✅ ANON Access SUCCESS!')
        console.log('RLS Policies seem permissive (or RLS disabled).')
    }
}

checkPolicies()
