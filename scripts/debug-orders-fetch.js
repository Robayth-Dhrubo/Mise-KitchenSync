
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
    console.log('Testing Dashboard Orders Query...')

    const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, recipe:recipes(name))')
        .neq('preparation_status', 'delivered')
        .neq('preparation_status', 'cancelled')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('❌ Fetch FAILED:')
        console.log(JSON.stringify(error, null, 2))
    } else {
        console.log('✅ Fetch SUCCESS!')
        console.log(`Found ${data.length} active orders`)
        if (data.length > 0) {
            console.log('Sample Order:', JSON.stringify(data[0], null, 2))
        }
    }
}

test()
