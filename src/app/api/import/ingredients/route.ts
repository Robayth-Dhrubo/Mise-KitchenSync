import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ingredients } = await request.json()

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return NextResponse.json({ error: 'No ingredients provided' }, { status: 400 })
    }

    // Validate and prepare data
    const validIngredients = ingredients
        .filter(item => item.name && item.purchase_price > 0)
        .map(item => ({
            user_id: user.id,
            name: String(item.name).trim(),
            purchase_price: parseFloat(item.purchase_price) || 0,
            purchase_unit: String(item.purchase_unit || 'unit').trim(),
            current_stock: parseFloat(item.current_stock) || 0,
            conversion_ratio: parseFloat(item.conversion_ratio) || 1,
        }))

    if (validIngredients.length === 0) {
        return NextResponse.json({ error: 'No valid ingredients to import' }, { status: 400 })
    }

    // Insert in batches to avoid timeout
    const batchSize = 100
    let imported = 0
    let failed = 0

    for (let i = 0; i < validIngredients.length; i += batchSize) {
        const batch = validIngredients.slice(i, i + batchSize)
        const { data, error } = await supabase
            .from('ingredients')
            .insert(batch)
            .select()

        if (error) {
            console.error('Batch insert error:', error)
            failed += batch.length
        } else {
            imported += data?.length || 0
        }
    }

    return NextResponse.json({
        success: true,
        imported,
        failed,
        total: validIngredients.length,
    })
}
