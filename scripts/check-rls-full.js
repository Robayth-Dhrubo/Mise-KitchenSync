
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkFullQuery() {
    console.log('Checking Full Query RLS...')

    // Exact query from dashboard
    const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, recipe:recipes(name))')
        .neq('preparation_status', 'delivered')
        .neq('preparation_status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)

    if (error) {
        console.error('❌ Full Query FAILED:')
        console.log(JSON.stringify(error, null, 2))
    } else {
        console.log('✅ Full Query SUCCESS!')
        console.log(`Matched ${data.length} orders`)
    }
}

checkFullQuery()
