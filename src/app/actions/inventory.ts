'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Receive a single order item - updates inventory atomically
 */
export async function receivePurchaseOrder(orderId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase.rpc('receive_purchase_order', {
        p_order_id: orderId
    })

    if (error) {
        console.error('Receive order error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/orders')
    revalidatePath('/pantry')
    revalidatePath('/dashboard')

    return data
}

/**
 * Receive multiple order items at once - atomic bulk update
 */
export async function receiveBulkOrder(itemIds: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase.rpc('receive_bulk_order', {
        p_user_id: user.id,
        p_item_ids: itemIds
    })

    if (error) {
        console.error('Bulk receive error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/orders')
    revalidatePath('/pantry')
    revalidatePath('/dashboard')

    return data
}

/**
 * Get dashboard alerts (critical stock items)
 */
export async function getDashboardAlerts() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return []
    }

    const { data, error } = await supabase
        .from('view_dashboard_alerts')
        .select('*')
        .eq('user_id', user.id)

    if (error) {
        console.error('Dashboard alerts error:', error)
        return []
    }

    return data || []
}

/**
 * Generate smart order grouped by vendor
 */
export async function generateSmartOrder() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase.rpc('generate_smart_order_grouped', {
        p_user_id: user.id
    })

    if (error) {
        console.error('Smart order error:', error)
        return { success: false, error: error.message, data: null }
    }

    return { success: true, data }
}

/**
 * Get recipe cost analysis with margin status
 */
export async function getRecipeCostAnalysis(recipeId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_recipe_cost_analysis', {
        p_recipe_id: recipeId
    })

    if (error) {
        console.error('Recipe cost error:', error)
        return null
    }

    return data?.[0] || null
}
