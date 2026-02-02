'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface OrderResult {
    success: boolean
    remaining?: number
    error?: string
    errorCode?: 'SOLD_OUT' | 'UNAVAILABLE' | 'UNKNOWN'
}

export async function submitSafeOrder(
    recipeId: string,
    quantity: number
): Promise<OrderResult> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Not authenticated', errorCode: 'UNKNOWN' }
    }

    try {
        const { data, error } = await supabase.rpc('process_pos_order_safe', {
            p_user_id: user.id,
            p_recipe_id: recipeId,
            p_quantity: quantity,
        })

        if (error) {
            // Parse the error message to determine error type
            if (error.message.includes('SOLD OUT')) {
                return {
                    success: false,
                    error: error.message,
                    errorCode: 'SOLD_OUT',
                }
            }
            if (error.message.includes('UNAVAILABLE')) {
                return {
                    success: false,
                    error: error.message,
                    errorCode: 'UNAVAILABLE',
                }
            }
            return { success: false, error: error.message, errorCode: 'UNKNOWN' }
        }

        revalidatePath('/front-desk')
        revalidatePath('/menu')

        return {
            success: true,
            remaining: data?.remaining,
        }
    } catch (err: any) {
        return { success: false, error: err.message, errorCode: 'UNKNOWN' }
    }
}

// Helper to check availability before showing in UI
export async function checkItemAvailability(recipeId: string): Promise<{
    available: boolean
    maxServings: number
    status: 'available' | 'low_stock' | 'sold_out' | 'off_air'
}> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('view_menu_availability')
        .select('is_available, max_servings, manual_available, smart_available')
        .eq('recipe_id', recipeId)
        .single()

    if (error || !data) {
        return { available: false, maxServings: 0, status: 'sold_out' }
    }

    if (!data.manual_available) {
        return { available: false, maxServings: data.max_servings, status: 'off_air' }
    }
    if (!data.smart_available) {
        return { available: false, maxServings: 0, status: 'sold_out' }
    }
    if (data.max_servings <= 5) {
        return { available: true, maxServings: data.max_servings, status: 'low_stock' }
    }

    return { available: true, maxServings: data.max_servings, status: 'available' }
}
