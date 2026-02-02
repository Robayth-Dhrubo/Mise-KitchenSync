import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// "The Oracle" - Predictive Inventory
// Logic:
// 1. Get sales from last 30 days
// 2. Break down sales into ingredient usage
// 3. Calculate Daily Average Usage (DAU)
// 4. Set Par Level = DAU * 3 (3 days of safety stock)

export async function GET() {
    try {
        const supabase = await createClient()

        // 1. Get date 30 days ago
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // 2. Fetch Sales Logs
        const { data: sales, error: salesError } = await supabase
            .from('sales_logs')
            .select(`
                quantity_sold,
                recipe:recipes (
                    id,
                    recipe_items (
                        quantity_needed,
                        ingredient_id
                    )
                )
            `)
            .gte('sale_date', thirtyDaysAgo.toISOString())

        if (salesError) throw salesError

        // 3. Aggregate Usage per Ingredient
        const ingredientUsage: Record<string, number> = {}

        sales?.forEach((log: any) => {
            const recipe = log.recipe
            if (recipe && recipe.recipe_items) {
                recipe.recipe_items.forEach((item: any) => {
                    const totalQtyUsed = item.quantity_needed * log.quantity_sold
                    if (!ingredientUsage[item.ingredient_id]) {
                        ingredientUsage[item.ingredient_id] = 0
                    }
                    ingredientUsage[item.ingredient_id] += totalQtyUsed
                })
            }
        })

        // 4. Calculate New Par Levels
        const updates = []
        for (const [ingredientId, totalUsage] of Object.entries(ingredientUsage)) {
            const dailyAverage = totalUsage / 30
            // Safety Stock = 3 days of usage
            const newParLevel = Math.ceil(dailyAverage * 3)

            updates.push({
                id: ingredientId,
                par_level: newParLevel
            })

            // Update Database
            await supabase
                .from('ingredients')
                .update({ par_level: newParLevel })
                .eq('id', ingredientId)
        }

        return NextResponse.json({
            success: true,
            message: `Oracle updated par levels for ${updates.length} ingredients`,
            updates
        })

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
