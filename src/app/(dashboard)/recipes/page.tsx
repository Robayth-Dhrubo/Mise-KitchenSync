import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, Search, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RecipeCard, type RecipeWithCost } from '@/components/recipes/recipe-card'
import { calculateRecipeCost, isRecipeInStock } from '@/lib/calculations'

export default async function RecipesPage() {
    const supabase = await createClient()

    let recipes: any[] = []

    try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
            // Fetch recipes with their items and ingredients
            const { data, error } = await supabase
                .from('recipes')
                .select(`
            *,
            recipe_items (
                quantity_needed,
                unit_used,
                ingredient:ingredients (
                name,
                purchase_price,
                purchase_unit,
                current_stock,
                conversion_ratio
                )
            )
            `)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching recipes:', error)
            } else if (data) {
                recipes = data
            }
        }
    } catch (e) {
        console.warn('Caught auth/db error in Recipes page. Serving empty UI for presentation.', e)
    }

    const recipesWithCost: RecipeWithCost[] = (recipes || []).map((recipe: any) => {
        const costData = calculateRecipeCost(
            recipe.recipe_items.map((item: any) => ({
                quantity_needed: item.quantity_needed,
                unit_used: item.unit_used,
                ingredient: item.ingredient,
            })),
            recipe.menu_price,
            recipe.target_food_cost_pct
        )

        return {
            ...recipe,
            total_cost: costData.total_cost,
            food_cost_pct: costData.food_cost_percentage,
            margin_status: costData.margin_status,
            is_in_stock: isRecipeInStock(recipe.recipe_items.map((item: any) => ({
                quantity_needed: item.quantity_needed,
                unit_used: item.unit_used,
                ingredient: item.ingredient,
            }))),
        }
    })

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 text-primary mb-1">
                        <BookOpen className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Recipe Vault</span>
                    </div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight">Technical Recipes</h1>
                    <p className="text-muted-foreground font-medium">Manage margins, ingredient costs, and prep instructions.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/menu/new">
                        <Button className="h-14 px-8 bg-primary hover:bg-primary text-foreground font-bold rounded-2xl shadow-xl shadow-primary/20 group transition-all">
                            <Plus className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform duration-500" />
                            New Recipe
                        </Button>
                    </Link>
                </div>
            </div>

            {recipesWithCost.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white/5 rounded-[40px] border border-dashed border-white/10 text-center px-6">
                    <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 rotate-12 group-hover:rotate-0 transition-transform">
                        <BookOpen className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">The vault is empty</h2>
                    <p className="text-muted-foreground max-w-sm mb-10 font-medium">
                        Start by adding your first recipe to track costs and optimize your margins.
                    </p>
                    <Link href="/menu/new">
                        <Button variant="outline" className="h-12 border-white/10 hover:bg-white/5 text-foreground font-bold rounded-xl">
                            Register First Recipe <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {recipesWithCost.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            )}
        </div>
    )
}
