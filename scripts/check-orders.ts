
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkOrders() {
    console.log('Checking orders...')

    const { data: allOrders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching orders:', error)
        return
    }

    console.log(`Found ${allOrders.length} total orders.`)

    const activeOrders = allOrders.filter(o =>
        o.preparation_status !== 'delivered' &&
        o.preparation_status !== 'cancelled'
    )

    console.log(`Found ${activeOrders.length} "active" orders (not delivered/cancelled).`)

    activeOrders.forEach(o => {
        console.log(`- Order ${o.id}: Type=${o.type}, Status=${o.status}, PrepStatus=${o.preparation_status}, Table=${o.table_or_room}`)
    })

    // Check specifically for room service active orders
    const irdOrders = allOrders.filter(o => o.type === 'room_service' && o.status !== 'cancelled')
    console.log(`Found ${irdOrders.length} IRD orders (not cancelled).`)
    irdOrders.forEach(o => {
        console.log(`  [IRD] Order ${o.id}: Status=${o.status}, PrepStatus=${o.preparation_status}`)
    })
}

checkOrders()
