'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendOrder(items: any[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    // Prepare items for shopping_list table
    // Assumption: we need to insert them with status 'ordered'

    // Note: The prompt asks to "insert into shopping_list table with status = 'ordered'". 
    // It doesn't specify if we should group them by purchase_order or just dump them in shopping_list.
    // Given the "RPC: receive_purchase_order", there might be a Purchase Order flow, but 
    // I will strictly follow "insert into shopping_list table with status = 'ordered'".

    const validItems = items.map(item => ({
        user_id: user.id,
        ingredient_id: item.ingredient_id,
        quantity: item.qty_needed,
        unit: item.purchase_unit,
        status: 'ordered',
        vendor_id: item.vendor_id || null // if available
    }))

    const { error } = await supabase
        .from('shopping_list')
        .insert(validItems)

    if (error) {
        console.error('Failed to send order:', error)
        throw new Error('Failed to send order')
    }

    revalidatePath('/smart-order')
    return { success: true }
}
