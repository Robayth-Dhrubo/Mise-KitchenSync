
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local manually to avoid dependencies
const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1)
        }
        env[key] = value
    }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log('Checking orders table schema...')

    // Check if column exists by trying to select it
    const { data, error } = await supabase
        .from('orders')
        .select('preparation_status')
        .limit(1)

    if (error) {
        console.error('❌ Error accessing preparation_status column:', error.message)
        console.log('Attempting to check if orders table exists at all...')
        const { error: tableError } = await supabase.from('orders').select('id').limit(1)
        if (tableError) {
            console.error('❌ Orders table might not exist:', tableError.message)
        }
        return
    }

    console.log('✅ Column `preparation_status` exists.')

    // Check count of active orders
    const { count, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid')
        .neq('preparation_status', 'delivered')

    console.log(`Current active orders: ${count}`)

    if (count === 0) {
        console.log('Creating test order...')

        // Get a user ID (first user found) from recipes
        const { data: recipes } = await supabase.from('recipes').select('id, user_id').limit(1)
        const recipeId = recipes?.[0]?.id
        const userId = recipes?.[0]?.user_id

        if (!userId) {
            console.error('❌ Could not find any user to assign the order to.')
            return
        }

        const { data: order, error: insertError } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                status: 'paid',
                preparation_status: 'received',
                table_or_room: 'Test-101',
                total_amount: 25.00
            })
            .select()
            .single()

        if (insertError) {
            console.error('❌ Failed to insert test order:', insertError.message)
        } else {
            console.log('✅ Inserted test order:', order.id)

            if (recipeId) {
                const { error: itemError } = await supabase
                    .from('order_items')
                    .insert({
                        order_id: order.id,
                        recipe_id: recipeId,
                        quantity: 2,
                        unit_price: 12.50
                    })

                if (itemError) console.error('Failed to insert order item:', itemError.message)
                else console.log('✅ Inserted order items.')
            }
        }
    } else {
        console.log('Orders exist, UI should be showing them.')
    }
}

main().catch(console.error)
