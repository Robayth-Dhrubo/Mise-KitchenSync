import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TOAST_API_URL = 'https://ws-api.toasttab.com'

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
        .eq('provider', 'toast')
        .single()

    if (!connection) {
        return NextResponse.json({ error: 'Not connected to Toast' }, { status: 400 })
    }

    try {
        // Fetch menus from Toast
        const menusResponse = await fetch(`${TOAST_API_URL}/menus/v2/menus`, {
            headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Toast-Restaurant-External-ID': connection.merchant_id || '',
            },
        })

        const menusData = await menusResponse.json()

        if (!menusResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 })
        }

        let imported = 0

        // Process menu items
        for (const menu of menusData) {
            for (const group of menu.groups || []) {
                for (const item of group.items || []) {
                    const ingredient = {
                        user_id: user.id,
                        name: item.name,
                        purchase_price: (item.price || 0) / 100,
                        purchase_unit: 'unit',
                        current_stock: 0,
                        conversion_ratio: 1,
                        source: 'toast',
                        external_id: item.guid,
                    }

                    const { error } = await supabase
                        .from('ingredients')
                        .upsert(ingredient, {
                            onConflict: 'user_id,external_id',
                            ignoreDuplicates: false
                        })

                    if (!error) imported++
                }
            }
        }

        await supabase
            .from('integrations')
            .update({ last_sync: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('provider', 'toast')

        return NextResponse.json({ success: true, itemCount: imported })
    } catch (error) {
        console.error('Toast sync error:', error)
        return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
    }
}
