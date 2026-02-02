import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SQUARE_API_URL = process.env.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the Square connection
    const { data: connection, error: connError } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'square')
        .single()

    if (connError || !connection) {
        return NextResponse.json({ error: 'Not connected to Square' }, { status: 400 })
    }

    try {
        // Fetch catalog items from Square
        const catalogResponse = await fetch(`${SQUARE_API_URL}/v2/catalog/list?types=ITEM`, {
            headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Square-Version': '2024-01-18',
                'Content-Type': 'application/json',
            },
        })

        const catalogData = await catalogResponse.json()

        if (!catalogResponse.ok) {
            console.error('Square API error:', catalogData)
            return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 })
        }

        const items = catalogData.objects || []
        let imported = 0

        // Convert Square items to Mise ingredients
        for (const item of items) {
            if (item.type !== 'ITEM') continue

            const itemData = item.item_data
            const variation = itemData.variations?.[0]?.item_variation_data
            const price = variation?.price_money?.amount || 0

            const ingredient = {
                user_id: user.id,
                name: itemData.name,
                purchase_price: price / 100, // Square stores in cents
                purchase_unit: 'unit',
                current_stock: 0,
                conversion_ratio: 1,
                source: 'square',
                external_id: item.id,
            }

            // Upsert to avoid duplicates
            const { error: insertError } = await supabase
                .from('ingredients')
                .upsert(ingredient, {
                    onConflict: 'user_id,external_id',
                    ignoreDuplicates: false
                })

            if (!insertError) imported++
        }

        // Update last sync time
        await supabase
            .from('integrations')
            .update({ last_sync: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('provider', 'square')

        return NextResponse.json({
            success: true,
            itemCount: imported,
            total: items.length
        })
    } catch (error) {
        console.error('Square sync error:', error)
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
    }
}
