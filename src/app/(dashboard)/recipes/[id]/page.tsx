import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChefHat, ChevronLeft, DollarSign, TrendingUp, TrendingDown, Minus, Clock, Users } from 'lucide-react'
import { notFound } from 'next/navigation'

interface RecipeIngredient {
    id: string
    quantity_needed: number
    unit_used: string
    ingredient: any
}

interface RecipeStep {
    id: string
    step_number: number
    instruction: string
    duration_minutes: number | null
    tip: string | null
}

interface Recipe {
    id: string
    name: string
    description: string | null
    menu_price: number
    prep_time_minutes: number | null
    cook_time_minutes: number | null
    category: string | null
    yield_quantity: number | null
    yield_unit: string | null
    target_food_cost_pct: number
}

interface CostAnalysis {
    recipe_id: string
    recipe_name: string
    menu_price: number
    total_cost: number
    food_cost_pct: number
    gross_margin: number
    margin_status: string
}

export default async function RecipeDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch recipe
    const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single()

    if (recipeError || !recipe) {
        notFound()
    }

    // Fetch recipe items with ingredients
    const { data: recipeItems } = await supabase
        .from('recipe_items')
        .select(`
      id,
      quantity_needed,
      unit_used,
      ingredient:ingredients(id, name, purchase_price, purchase_unit)
    `)
        .eq('recipe_id', id)

    // Fetch recipe steps
    const { data: recipeSteps } = await supabase
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', id)
        .order('step_number', { ascending: true })

    // Get live cost analysis
    const { data: costAnalysis } = await supabase.rpc('get_recipe_cost_analysis', {
        p_recipe_id: id
    })

    const analysis: CostAnalysis | null = costAnalysis?.[0] || null

    // Determine margin badge color
    function getMarginBadge(marginStatus: string) {
        switch (marginStatus) {
            case 'excellent':
                return { bg: 'bg-emerald-900/50', text: 'text-emerald-400', border: 'border-emerald-600', icon: TrendingUp }
            case 'good':
                return { bg: 'bg-blue-900/50', text: 'text-blue-400', border: 'border-blue-600', icon: TrendingUp }
            case 'warning':
                return { bg: 'bg-yellow-900/50', text: 'text-yellow-400', border: 'border-yellow-600', icon: Minus }
            case 'danger':
                return { bg: 'bg-red-900/50', text: 'text-red-400', border: 'border-red-600', icon: TrendingDown }
            default:
                return { bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-600', icon: Minus }
        }
    }

    const marginBadge = analysis ? getMarginBadge(analysis.margin_status) : null
    const MarginIcon = marginBadge?.icon || Minus

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/menu" className="text-zinc-400 hover:text-white transition">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <ChefHat className="w-7 h-7 text-emerald-500" />
                        <h1 className="text-xl font-bold">Recipe Bible</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Hero Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div>
                            {recipe.category && (
                                <span className="text-xs font-medium text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded mb-3 inline-block">
                                    {recipe.category}
                                </span>
                            )}
                            <h1 className="text-3xl font-bold mb-2">{recipe.name}</h1>
                            {recipe.description && (
                                <p className="text-zinc-400 max-w-lg">{recipe.description}</p>
                            )}

                            {/* Prep/Cook Time */}
                            <div className="flex items-center gap-4 mt-4 text-sm text-zinc-400">
                                {recipe.prep_time_minutes && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>Prep: {recipe.prep_time_minutes}min</span>
                                    </div>
                                )}
                                {recipe.cook_time_minutes && (
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>Cook: {recipe.cook_time_minutes}min</span>
                                    </div>
                                )}
                                {recipe.yield_quantity && (
                                    <div className="flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        <span>Yields: {recipe.yield_quantity} {recipe.yield_unit || 'portion'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Price & Margin Card */}
                        <div className="flex-shrink-0">
                            <div className="text-center mb-4">
                                <span className="text-sm text-zinc-400">Menu Price</span>
                                <div className="flex items-center justify-center gap-1">
                                    <DollarSign className="w-6 h-6 text-emerald-500" />
                                    <span className="text-4xl font-bold">{recipe.menu_price.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Live Margin Badge */}
                            {analysis && marginBadge && (
                                <div className={`${marginBadge.bg} ${marginBadge.border} border rounded-xl p-4 text-center`}>
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <MarginIcon className={`w-5 h-5 ${marginBadge.text}`} />
                                        <span className={`font-semibold ${marginBadge.text} capitalize`}>
                                            {analysis.margin_status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-zinc-400 block">Food Cost</span>
                                            <span className={`font-bold ${marginBadge.text}`}>
                                                {analysis.food_cost_pct}%
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-zinc-400 block">Gross Margin</span>
                                            <span className={`font-bold ${marginBadge.text}`}>
                                                ${analysis.gross_margin.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-zinc-700">
                                        <span className="text-xs text-zinc-400">Plate Cost</span>
                                        <span className={`font-bold ${marginBadge.text} ml-2`}>
                                            ${analysis.total_cost.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Ingredients */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-400 text-sm">
                                📦
                            </span>
                            Ingredients
                        </h2>

                        {recipeItems && recipeItems.length > 0 ? (
                            <div className="space-y-3">
                                {recipeItems.map((item: RecipeIngredient) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
                                    >
                                        <div>
                                            <span className="font-medium">{item.ingredient?.name || 'Unknown'}</span>
                                            <span className="text-zinc-400 ml-2 text-sm">
                                                {item.quantity_needed} {item.unit_used}
                                            </span>
                                        </div>
                                        {item.ingredient?.purchase_price && (
                                            <span className="text-emerald-400 text-sm">
                                                ${((item.quantity_needed * item.ingredient.purchase_price) / 10).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-zinc-500 text-center py-8">No ingredients added yet</p>
                        )}
                    </div>

                    {/* Cooking Steps */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-400 text-sm">
                                🍳
                            </span>
                            Cooking Steps
                        </h2>

                        {recipeSteps && recipeSteps.length > 0 ? (
                            <div className="space-y-4">
                                {recipeSteps.map((step: RecipeStep) => (
                                    <div
                                        key={step.id}
                                        className="relative pl-8"
                                    >
                                        <div className="absolute left-0 top-0 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">
                                            {step.step_number}
                                        </div>
                                        <div className="bg-zinc-800 rounded-lg p-4">
                                            <p className="text-zinc-200">{step.instruction}</p>
                                            {step.duration_minutes && (
                                                <div className="flex items-center gap-1 mt-2 text-xs text-zinc-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{step.duration_minutes} min</span>
                                                </div>
                                            )}
                                            {step.tip && (
                                                <div className="mt-2 text-xs text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded">
                                                    💡 {step.tip}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-zinc-500 text-center py-8">No cooking steps added yet</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
