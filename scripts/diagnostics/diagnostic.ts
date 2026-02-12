
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load .env.local if present
dotenv.config({ path: '.env.local', override: true })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

async function main() {
    console.log('Supabase diagnostic — checking env and connectivity')

    if (!supabaseUrl) {
        console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) in .env.local')
        process.exit(2)
    }
    if (!supabaseKey) {
        console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
        process.exit(2)
    }

    console.log('Using Supabase URL:', supabaseUrl)
    console.log('Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon/client')

    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        console.log('Attempting simple select from `profiles`...')
        const { data, error } = await supabase.from('profiles').select('id,email,role').limit(1)

        if (error) {
            console.error('❌ Supabase query error:', error.message || error)
            console.error('Full error object:', JSON.stringify(error, null, 2))
            process.exit(3)
        }

        console.log('✅ Query succeeded. Sample rows (if any):', data)
        process.exit(0)
    } catch (err) {
        console.error('❌ Unexpected error while querying Supabase:', err)
        process.exit(4)
    }
}

main()
