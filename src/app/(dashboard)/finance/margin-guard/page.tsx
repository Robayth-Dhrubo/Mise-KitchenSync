'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    ShieldAlert,
    ArrowUpRight,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Edit3,
    AlertTriangle,
    RefreshCw,
    ChefHat,
    DollarSign
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MarginAlert {
    id: string
    recipe_id: string
    ingredient_id: string
    old_cost: number
    new_cost: number
    current_menu_price: number
    suggested_price: number
    status: 'pending' | 'applied' | 'ignored'
    created_at: string
    recipe: {
        name: string
        target_food_cost_pct: number
    }
    ingredient: {
        name: string
    }
}

// Skeleton component for loading states
function StatCardSkeleton() {
    return (
        <Card className="bg-zinc-900/40 border-zinc-800/50 backdrop-blur-xl">
            <CardContent className="pt-6">
                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse mb-3" />
                <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
            </CardContent>
        </Card>
    )
}

function AlertCardSkeleton() {
    return (
        <Card className="bg-zinc-900/80 border-zinc-800/50">
            <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[160px]">
                    <div className="p-8 border-r border-zinc-800/50">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-zinc-800 rounded-lg animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <div className="p-8 border-r border-zinc-800/50">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-8 w-16 bg-zinc-800 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <div className="p-8 border-r border-zinc-800/50">
                        <div className="flex justify-between">
                            <div className="space-y-2">
                                <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
                            </div>
                            <div className="space-y-2 text-right">
                                <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse ml-auto" />
                                <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="h-12 w-full bg-zinc-800 rounded animate-pulse mb-3" />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-8 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-8 bg-zinc-800 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function MarginGuardPage() {
    const [alerts, setAlerts] = useState<MarginAlert[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = useMemo(() => createClient(), [])

    // Memoized stats calculations
    const avgMarginImpact = useMemo(() => {
        if (alerts.length === 0) return '0.00'
        return (alerts.reduce((acc, curr) => acc + (curr.new_cost - curr.old_cost), 0) / alerts.length).toFixed(2)
    }, [alerts])

    const fetchAlerts = useCallback(async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('margin_alerts')
            .select(`
                *,
                recipe:recipes(name, target_food_cost_pct),
                ingredient:ingredients(name)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) {
            toast.error('Failed to fetch alerts', { description: error.message })
        } else {
            setAlerts(data as any)
        }
        setIsLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchAlerts()
    }, [fetchAlerts])

    const handleApplyPrice = useCallback(async (alert: MarginAlert) => {
        try {
            // Get user once at the start
            const { data: userData } = await supabase.auth.getUser()
            const userId = userData.user?.id

            // Run all updates in parallel where possible
            const [recipeResult] = await Promise.all([
                supabase
                    .from('recipes')
                    .update({ menu_price: alert.suggested_price })
                    .eq('id', alert.recipe_id)
            ])

            if (recipeResult.error) throw recipeResult.error

            // Log to history and update alert status in parallel
            await Promise.all([
                supabase.from('price_history').insert({
                    user_id: userId,
                    recipe_id: alert.recipe_id,
                    old_price: alert.current_menu_price,
                    new_price: alert.suggested_price,
                    change_type: 'margin_guard'
                }),
                supabase
                    .from('margin_alerts')
                    .update({ status: 'applied' })
                    .eq('id', alert.id)
            ])

            toast.success('Price updated successfully', {
                description: `${alert.recipe.name} is now $${alert.suggested_price}`
            })

            // Optimistic update instead of full refetch
            setAlerts(prev => prev.filter(a => a.id !== alert.id))
        } catch (error: any) {
            toast.error('Failed to apply price', { description: error.message })
        }
    }, [supabase])

    const handleIgnore = useCallback(async (alertId: string) => {
        // Optimistic update
        setAlerts(prev => prev.filter(a => a.id !== alertId))

        const { error } = await supabase
            .from('margin_alerts')
            .update({ status: 'ignored' })
            .eq('id', alertId)

        if (error) {
            toast.error('Failed to ignore alert')
            // Revert on error - refetch
            fetchAlerts()
        } else {
            toast.info('Alert ignored')
        }
    }, [supabase, fetchAlerts])

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                            <ShieldAlert className="w-6 h-6 text-amber-500 animate-pulse" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase font-display">
                            Margin <span className="text-amber-500">Guard</span>
                        </h1>
                    </div>
                    <p className="text-zinc-400 max-w-2xl font-medium">
                        Real-time inflation protection. We detect ingredient price hikes and suggest updates to protect your profit margins.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                        onClick={fetchAlerts}
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isLoading ? (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                ) : (
                    <>
                        <Card className="bg-zinc-900/40 border-zinc-800/50 backdrop-blur-xl">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Active Alerts</p>
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white tabular-nums">{alerts.length}</h3>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900/40 border-zinc-800/50 backdrop-blur-xl">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Avg Margin Impact</p>
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white tabular-nums">{avgMarginImpact}</h3>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900/40 border-zinc-800/50 backdrop-blur-xl">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target Margin</p>
                                    <DollarSign className="w-4 h-4 text-blue-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white tabular-nums">30%</h3>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Alert Stream */}
            <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Live Alert Stream</h2>

                {isLoading ? (
                    <div className="space-y-6">
                        <AlertCardSkeleton />
                        <AlertCardSkeleton />
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-emerald-500/5 rounded-3xl border border-dashed border-emerald-500/20">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mb-4" />
                        <p className="text-emerald-500/60 font-black uppercase tracking-widest text-xs">All Margins Secured</p>
                        <p className="text-emerald-500/40 text-[10px] mt-2 font-bold uppercase">No inflation impact detected</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {alerts.map((alert) => (
                            <AlertCard
                                key={alert.id}
                                alert={alert}
                                onApply={handleApplyPrice}
                                onIgnore={handleIgnore}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// Memoized alert card component
const AlertCard = ({ alert, onApply, onIgnore }: {
    alert: MarginAlert
    onApply: (alert: MarginAlert) => void
    onIgnore: (id: string) => void
}) => {
    const foodCostPct = ((alert.new_cost / alert.current_menu_price) * 100).toFixed(1)
    const isAtRisk = Number(foodCostPct) > alert.recipe.target_food_cost_pct

    return (
        <Card className="bg-zinc-900/80 border-zinc-800/50 shadow-2xl hover:border-amber-500/30 transition-all duration-500 group overflow-hidden">
            <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[160px]">
                    {/* Impact Info */}
                    <div className="p-8 border-r border-zinc-800/50 bg-gradient-to-br from-amber-500/5 to-transparent">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden">
                                <ChefHat className="w-4 h-4 text-zinc-400" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-white leading-none">{alert.recipe.name}</h4>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase">Recipe Impact</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full w-fit">
                                <ArrowUpRight className="w-3 h-3" />
                                {alert.ingredient.name} price hike
                            </div>
                        </div>
                    </div>

                    {/* Margin Metrics */}
                    <div className="p-8 border-r border-zinc-800/50 flex flex-col justify-center gap-6">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Food Cost %</p>
                                <div className={cn(
                                    "text-3xl font-black tabular-nums leading-none",
                                    isAtRisk ? "text-red-500" : "text-amber-500"
                                )}>
                                    {foodCostPct}%
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Limit</p>
                                <div className="text-3xl font-black text-white tabular-nums leading-none">
                                    {alert.recipe.target_food_cost_pct}%
                                </div>
                            </div>
                        </div>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full transition-all duration-1000", isAtRisk ? "bg-red-500" : "bg-amber-500")}
                                style={{ width: `${Math.min(Number(foodCostPct), 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Pricing Strategy */}
                    <div className="p-8 border-r border-zinc-800/50 flex flex-col justify-center bg-zinc-900/40">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Current Price</p>
                                <p className="text-xl font-black text-zinc-400 underline decoration-red-500/50 decoration-2">${alert.current_menu_price}</p>
                            </div>
                            <div className="text-center px-4">
                                <ArrowIcon className="w-5 h-5 text-zinc-700 mx-auto" />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Suggested</p>
                                <p className="text-3xl font-black text-white tabular-nums">${alert.suggested_price}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-8 flex flex-col justify-center gap-3">
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-tighter shadow-lg shadow-emerald-900/20 active:scale-95 transition-all py-6 h-auto text-lg"
                            onClick={() => onApply(alert)}
                        >
                            <CheckCircle2 className="w-5 h-5 mr-3" />
                            Apply Update
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="ghost"
                                className="font-black uppercase tracking-widest text-[10px] text-zinc-500 hover:text-white"
                                onClick={() => onIgnore(alert.id)}
                            >
                                <XCircle className="w-3 h-3 mr-2" />
                                Ignore
                            </Button>
                            <Button
                                variant="ghost"
                                className="font-black uppercase tracking-widest text-[10px] text-zinc-500 hover:text-emerald-400"
                            >
                                <Edit3 className="w-3 h-3 mr-2" />
                                Adjust
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ArrowIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    )
}
