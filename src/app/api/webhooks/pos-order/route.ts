import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POS Order Webhook
 * 
 * When a dish is sold via POS, this endpoint depletes the ingredient stock.
 * 
 * POST /api/webhooks/front-desk-order
 * Body: { menu_item_id: string, qty: number, api_key?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { menu_item_id, qty = 1, api_key, user_id } = body

        // Validate required fields
        if (!menu_item_id) {
            return NextResponse.json(
                { success: false, error: 'menu_item_id is required' },
                { status: 400 }
            )
        }

        if (!user_id) {
            return NextResponse.json(
                { success: false, error: 'user_id is required' },
                { status: 400 }
            )
        }

        // Check for API key in header first, then body
        const headerKey = request.headers.get('x-api-key')
        const providedKey = headerKey || api_key
        const secretKey = process.env.POS_API_KEY

        if (!secretKey) {
            console.warn('POS_API_KEY not configured on server')
            return NextResponse.json(
                { success: false, error: 'Server configuration error' },
                { status: 503 }
            )
        }

        if (providedKey !== secretKey) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Invalid API Key' },
                { status: 401 }
            )
        }

        const supabase = await createClient()

        // Call the atomic POS order function
        const { data, error } = await supabase.rpc('process_pos_order', {
            p_user_id: user_id,
            p_recipe_id: menu_item_id,
            p_quantity: qty
        })

        if (error) {
            console.error('POS order error:', error)
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('POS webhook error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * Health check
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        endpoint: 'pos-order',
        description: 'POST with { menu_item_id, qty, user_id } to deplete stock when dishes are sold'
    })
}
