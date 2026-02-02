import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const QB_API_URL = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connection } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'quickbooks')
        .single()

    if (!connection) {
        return NextResponse.json({ error: 'Not connected to QuickBooks' }, { status: 400 })
    }

    try {
        // Fetch items from QuickBooks
        const itemsResponse = await fetch(
            `${QB_API_URL}/v3/company/${connection.merchant_id}/query?query=SELECT * FROM Item`,
            {
                headers: {
                    'Authorization': `Bearer ${connection.access_token}`,
                    'Accept': 'application/json',
                },
            }
        )

        const itemsData = await itemsResponse.json()

        if (!itemsResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
        }

        const items = itemsData.QueryResponse?.Item || []
        let imported = 0

        for (const item of items) {
            const ingredient = {
                user_id: user.id,
                name: item.Name,
                purchase_price: item.PurchaseCost || item.UnitPrice || 0,
                purchase_unit: 'unit',
                current_stock: item.QtyOnHand || 0,
                conversion_ratio: 1,
                source: 'quickbooks',
                external_id: item.Id,
            }

            const { error } = await supabase
                .from('ingredients')
                .upsert(ingredient, {
                    onConflict: 'user_id,external_id',
                    ignoreDuplicates: false
                })

            if (!error) imported++
        }

        await supabase
            .from('integrations')
            .update({ last_sync: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('provider', 'quickbooks')

        return NextResponse.json({ success: true, itemCount: imported })
    } catch (error) {
        console.error('QuickBooks sync error:', error)
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
    }
}
