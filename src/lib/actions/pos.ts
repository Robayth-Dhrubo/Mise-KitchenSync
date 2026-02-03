'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function fireOrder(orderId: string) {
    const supabase = await createClient()

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 2. Get Order Items to deduct inventory
    const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('recipe_id, quantity')
        .eq('order_id', orderId)

    if (itemsError || !items) throw new Error('Failed to fetch order items')

    // 3. Deduct Inventory
    // We format the payload as expected by the existing RPC function
    const salesPayload = items.map(item => ({
        recipe_id: item.recipe_id,
        quantity: item.quantity
    }))

    const { error: rpcError } = await supabase.rpc('deduct_inventory', {
        sales: salesPayload
    })

    if (rpcError) {
        console.error('Inventory Sync Failed:', rpcError)
        throw new Error('Inventory deduction failed')
    }

    // 4. Update Order Status
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            status: 'fired',
            fired_at: new Date().toISOString()
        })
        .eq('id', orderId)

    if (updateError) throw updateError

    revalidatePath('/pos/floor')
    revalidatePath('/pos/ird')
    revalidatePath(`/pos/terminal/${orderId}`)

    return { success: true }
}

export async function createOrder(locationId: string, orderType: 'dine_in' | 'ird', guestName?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data, error } = await supabase
        .from('orders')
        .insert({
            location_id: locationId,
            order_type: orderType,
            status: 'draft',
            user_id: user.id,
            guest_name: guestName || 'Walk-in',
            source: 'staff',
            total_amount: 0
        })
        .select()
        .single()

    if (error) throw error
    revalidatePath('/pos/floor')
    return data
}

export async function addOrderItem(orderId: string, recipeId: string, price: number) {
    const supabase = await createClient()

    // Check if item exists to increment quantity? Or just add new row?
    // Let's add new row or increment if we want grouping. 
    // LiveTicket groups by course, but DB might have separate rows. 
    // Usually better to have unique rows for notes? Or group by recipe_id?
    // Let's simplified: check if exists without notes, increment.

    const { data: existing } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .eq('recipe_id', recipeId)
        .is('notes', null) // Only strict match
        .maybeSingle()

    if (existing) {
        await supabase
            .from('order_items')
            .update({ quantity: existing.quantity + 1 })
            .eq('id', existing.id)
    } else {
        await supabase
            .from('order_items')
            .insert({
                order_id: orderId,
                recipe_id: recipeId,
                quantity: 1,
                unit_price: price
            })
    }

    revalidatePath(`/pos/terminal/${orderId}`)
}

export async function getOrCreateDraftOrder(locationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Check for existing active draft
    const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('location_id', locationId)
        .eq('status', 'draft')
        .maybeSingle()

    if (existing) return existing

    // Create new
    return createOrder(locationId, 'dine_in')
}
