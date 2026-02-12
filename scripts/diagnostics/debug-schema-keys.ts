
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugSchema() {
    console.log('🔍 Inspecting Information Schema...')

    // We can query this via RPC if we had one, or generic query? 
    // Supabase client restricts querying system tables directly depending on config.
    // But since we are service_role, we might be able to unless exposed.

    // Better: Try to Call a raw SQL function if possible, or just standard select on profiles limit 1
    // and print keys.

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

    if (data && data.length > 0) {
        console.log('Keys on Profile Row:', Object.keys(data[0]))
    } else {
        console.log('No profiles found or error:', error)
    }

    // Also try simple RPC to run raw SQL if enabled? No, usually not.
}

debugSchema()
