import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function introspect() {
    // 1. Check if 'location_id' exists in 'orders'
    console.log('Checking orders columns...')
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching orders:', error)
    } else if (orders.length > 0) {
        console.log('Orders Columns:', Object.keys(orders[0]))
    } else {
        // If empty, insert a dummy one to check columns? 
        // Or just rely on the fact that allow * select should return keys if data existed.
        // Better: use rpc to get columns if possible, but simpler is just to insert one and see return.
        console.log('Orders table empty, attempting insert to discover columns...')
        const { data: newOrder, error: insertError } = await supabase
            .from('orders')
            .insert({ type: 'dine_in', status: 'pending', total_amount: 0 }) // Minimal fields
            .select() // This returns all columns

        if (newOrder) {
            console.log('Orders Columns (from insert):', Object.keys(newOrder[0]))
            // Cleanup
            await supabase.from('orders').delete().eq('id', newOrder[0].id)
        } else {
            console.error('Insert failed:', insertError)
        }
    }

    // 2. Check views
    console.log('Checking view_dashboard_alerts...')
    const { error: viewError } = await supabase.from('view_dashboard_alerts').select('count').limit(1)
    if (viewError) console.error('view_dashboard_alerts check:', viewError)
    else console.log('view_dashboard_alerts exists.')
}

introspect()
