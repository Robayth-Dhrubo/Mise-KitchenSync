import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ChefHat, Clock, DollarSign, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercentage, getMarginColorClass, getMarginBgClass } from '@/lib/calculations'
import { RecipeCard } from '@/components/recipes/recipe-card'

interface RecipeWithCost {
    id: string
    name: string
    description: string | null
    menu_price: number
    prep_time_minutes: number | null
    target_food_cost_pct: number
    created_at: string
    total_cost: number
    food_cost_pct: number
    margin_status: 'excellent' | 'good' | 'warning' | 'danger'
}

import { cn } from '@/lib/utils'

export default async function MenuPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Fetch recipes with their items and calculate costs
    const { data: recipes } = await supabase
        .from('recipes')
        .select(`
      *,
      recipe_items (
        quantity_needed,
        unit_used,
        ingredient:ingredients (
          purchase_price,
          purchase_unit,
          conversion_ratio,
          name
        )
      )
    `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    // Calculate costs for each recipe
    const recipesWithCost: RecipeWithCost[] = (recipes || []).map((recipe) => {
        const totalCost = recipe.recipe_items.reduce((sum: number, item: any) => {
            if (!item.ingredient) return sum
            const costPerUnit = item.ingredient.purchase_price / item.ingredient.conversion_ratio
            return sum + costPerUnit * item.quantity_needed
        }, 0)

        const foodCostPct = recipe.menu_price > 0 ? (totalCost / recipe.menu_price) * 100 : 0

        let marginStatus: RecipeWithCost['margin_status']
        if (foodCostPct <= 25) marginStatus = 'excellent'
        else if (foodCostPct <= 30) marginStatus = 'good'
        else if (foodCostPct <= 35) marginStatus = 'warning'
        else marginStatus = 'danger'

        return {
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            menu_price: recipe.menu_price,
            prep_time_minutes: recipe.prep_time_minutes,
            target_food_cost_pct: recipe.target_food_cost_pct,
            created_at: recipe.created_at,
            total_cost: Math.round(totalCost * 100) / 100,
            food_cost_pct: Math.round(foodCostPct * 10) / 10,
            margin_status: marginStatus,
        }
    })

    return (
        <div className="space-y-12 relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] -z-10" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black text-white tracking-tighter italic">Menu Studio.</h1>
                    <p className="text-neutral-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Algorithmically Costed • High Margin Assets
                    </p>
                </div>
                <Link href="/menu/new">
                    <Button className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
                        <Plus className="w-5 h-5 mr-3" />
                        Create Asset +
                    </Button>
                </Link>
            </div>

            {/* Recipes Grid */}
            {recipesWithCost.length === 0 ? (
                <Card className="glass-card border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent overflow-hidden">
                    <CardContent className="flex flex-col items-center text-center py-24 relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] -z-10" />

                        <div className="w-24 h-24 rounded-[32px] bg-blue-600 flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/40 rotate-6 group">
                            <ChefHat className="w-12 h-12 text-white group-hover:rotate-12 transition-transform" />
                        </div>
                        <h2 className="text-4xl font-black text-white italic mb-4 tracking-tighter">Kitchen Vault Empty.</h2>
                        <p className="text-neutral-500 max-w-sm mb-12 font-medium leading-relaxed">
                            Start designing your high-performance menu. We compute exact food cost percentages in real-time.
                        </p>
                        <Link href="/menu/new">
                            <Button className="h-16 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all">
                                Initialize Recipe
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {recipesWithCost.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            )}
        </div>
    )
}
