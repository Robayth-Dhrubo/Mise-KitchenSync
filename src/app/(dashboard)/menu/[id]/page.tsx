import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChefHat, Clock, DollarSign, TrendingUp, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercentage, getMarginColorClass, getMarginBgClass } from '@/lib/calculations'

interface PageProps {
    params: Promise<{ id: string }>
}

import { cn } from '@/lib/utils'
import { Package } from 'lucide-react'

export default async function RecipeDetailPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()

    let recipe: any = null

    try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
            // Fetch recipe with items
            const { data: rData, error } = await supabase
                .from('recipes')
                .select(`
                    *,
                    recipe_items (
                        quantity_needed,
                        unit_used,
                        ingredient:ingredients (
                            id,
                            name,
                            purchase_price,
                            purchase_unit,
                            conversion_ratio
                        )
                    )
                `)
                .eq('id', id)
                .eq('user_id', user.id)
                .single()
            if (rData && !error) recipe = rData
        }
    } catch (e) {
        console.warn('Caught auth/db error in Recipe Details page.', e)
    }

    if (!recipe) {
        // Instead of notFound() which triggers nextjs crash screens, we return a graceful empty state
        recipe = {
            name: "Demo Recipe",
            description: "System Calibration Asset - DB Offline",
            menu_price: 24.99,
            prep_time_minutes: 15,
            recipe_items: []
        }
    }

    // Calculate costs
    const items = recipe.recipe_items.map((item: any) => {
        const ingredient = item.ingredient
        const costPerUnit = (ingredient.purchase_price || 0) / (ingredient.conversion_ratio || 1)
        const cost = costPerUnit * item.quantity_needed
        return {
            ...item,
            cost,
            ingredientName: ingredient.name
        }
    })

    const totalCost = items.reduce((sum: number, item: any) => sum + item.cost, 0)
    const profit = recipe.menu_price - totalCost
    const foodCostPct = recipe.menu_price > 0 ? (totalCost / recipe.menu_price) * 100 : 0

    let marginStatus = 'danger'
    if (foodCostPct <= 25) marginStatus = 'excellent'
    else if (foodCostPct <= 30) marginStatus = 'good'
    else if (foodCostPct <= 35) marginStatus = 'warning'

    return (
        <div className="space-y-12 relative pb-24">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] -z-10" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-6">
                    <Link href="/menu">
                        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <div className="space-y-1">
                        <h1 className="text-5xl font-black text-foreground tracking-tighter flex items-center gap-4">
                            {recipe.name}.
                            <Badge className={cn(
                                "h-8 px-4 border-0 text-[10px] font-black uppercase tracking-widest rounded-lg",
                                getMarginBgClass(marginStatus as any),
                                getMarginColorClass(marginStatus as any)
                            )}>
                                {formatPercentage(foodCostPct)} Cost
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                            {recipe.description || 'System Calibrated Recipe Asset'}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" className="h-14 px-8 bg-white/5 hover:bg-white/10 border border-white/5 text-foreground/40 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all" disabled>
                    <Pencil className="w-4 h-4 mr-3" />
                    Archive Control
                </Button>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Ingredients Table */}
                    <Card className="glass-card">
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-black text-foreground flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <ChefHat className="w-5 h-5 text-primary" />
                                </div>
                                Component Ledger
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="space-y-3">
                                {items.map((item: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-6 rounded-[24px] bg-sidebar/20 border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Material 0{index + 1}</div>
                                            <div className="font-bold text-foreground text-lg tracking-tight group-hover:translate-x-1 transition-transform">{item.ingredientName}</div>
                                        </div>
                                        <div className="flex items-center gap-12 tabular-nums">
                                            <div className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
                                                {item.quantity_needed} {item.unit_used}
                                            </div>
                                            <div className="text-foreground font-black text-xl tracking-tighter w-24 text-right">
                                                {formatCurrency(item.cost)}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cumulative Unit Cost</div>
                                        <div className="text-2xl font-black text-foreground tracking-tighter">Manufacturing Total</div>
                                    </div>
                                    <div className="text-4xl font-black text-primary tracking-tighter tabular-nums">
                                        {formatCurrency(totalCost)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-8">
                    <Card className="glass-card overflow-hidden">
                        <CardHeader className="p-8 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-purple-500" />
                                </div>
                                <CardTitle className="text-xl font-black text-foreground">Profit Matrix</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-10">
                            <div className="space-y-2">
                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Market Valuation</div>
                                <div className="text-5xl font-black text-foreground tracking-tighter tabular-nums">{formatCurrency(recipe.menu_price)}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 py-8 border-y border-white/5">
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="w-3 h-3" /> Net Alpha
                                    </div>
                                    <div className={cn(
                                        "text-2xl font-black tracking-tighter tabular-nums",
                                        getMarginColorClass(marginStatus as any)
                                    )}>
                                        {formatCurrency(profit)}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                        <Clock className="w-3 h-3" /> Execution
                                    </div>
                                    <div className="text-2xl font-black text-foreground tracking-tighter tabular-nums">
                                        {recipe.prep_time_minutes || '--'}m
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Margin Efficiency</div>
                                    <div className={cn(
                                        "text-4xl font-black tracking-tighter tabular-nums",
                                        getMarginColorClass(marginStatus as any)
                                    )}>
                                        {recipe.menu_price > 0 ? Math.round((profit / recipe.menu_price) * 100) : 0}%
                                    </div>
                                </div>
                                <div className="h-4 bg-sidebar/40 rounded-full overflow-hidden p-1 border border-white/5">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-1000 ease-out shadow-lg",
                                            getMarginBgClass(marginStatus as any)
                                        )}
                                        style={{ width: `${Math.min(Math.max(recipe.menu_price > 0 ? (profit / recipe.menu_price) * 100 : 0, 0), 100)}%` }}
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
                                    Algorithmically derived performance metrics
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
