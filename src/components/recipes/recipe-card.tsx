'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    Clock,
    DollarSign,
    TrendingUp,
    Trash2,
    Loader2
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { formatCurrency, formatPercentage, getMarginColorClass, getMarginBgClass } from '@/lib/calculations'
import { cn } from '@/lib/utils'

export interface RecipeWithCost {
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

interface RecipeCardProps {
    recipe: RecipeWithCost
}

export function RecipeCard({ recipe }: RecipeCardProps) {
    const router = useRouter()
    const supabase = createClient()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('recipes')
                .delete()
                .eq('id', recipe.id)

            if (error) throw error

            toast.success('Asset decommissioned')
            router.refresh()
        } catch (error) {
            console.error('Error deleting recipe:', error)
            toast.error('Failed to decommission asset')
            setIsDeleting(false)
        }
    }

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    return (
        <Link href={`/menu/${recipe.id}`}>
            <Card className="glass-card hover:border-emerald-500/30 transition-all duration-500 cursor-pointer h-full group relative overflow-hidden flex flex-col hover:-translate-y-2">
                {/* Visual Accent */}
                <div className={cn(
                    "absolute top-0 left-0 w-full h-1",
                    recipe.margin_status === 'excellent' ? "bg-emerald-500" :
                        recipe.margin_status === 'good' ? "bg-blue-500" :
                            recipe.margin_status === 'warning' ? "bg-yellow-500" : "bg-red-500"
                )} />

                <CardHeader className="p-8 pb-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <CardTitle className="text-2xl font-black text-white italic group-hover:text-emerald-400 transition-colors pr-8 leading-tight font-display">
                            {recipe.name}
                        </CardTitle>
                        <Badge
                            className={cn(
                                "h-7 px-3 font-black uppercase text-[10px] tracking-widest border-0 rounded-lg",
                                getMarginBgClass(recipe.margin_status).replace('bg-', 'bg-').replace('/10', '/20'),
                                getMarginColorClass(recipe.margin_status)
                            )}
                        >
                            {formatPercentage(recipe.food_cost_pct)}
                        </Badge>
                    </div>
                    {recipe.description && (
                        <p className="text-sm text-neutral-500 font-medium line-clamp-2 leading-relaxed">
                            {recipe.description}
                        </p>
                    )}

                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleDeleteClick}>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-neutral-900 border-white/5 backdrop-blur-3xl rounded-[40px] p-8">
                                <div className="flex flex-col items-center text-center space-y-6">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
                                        <Trash2 className="w-8 h-8 text-red-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <AlertDialogTitle className="text-3xl font-black text-white italic tracking-tighter">Decommission Asset?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-neutral-500 font-medium">
                                            This action is irreversible. "{recipe.name}" will be purged from the vault.
                                        </AlertDialogDescription>
                                    </div>
                                    <div className="flex gap-4 w-full pt-4">
                                        <AlertDialogCancel className="flex-1 h-14 rounded-2xl bg-white/5 border-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10">
                                            Abort
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest shadow-xl shadow-red-500/20"
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
                                        </AlertDialogAction>
                                    </div>
                                </div>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardHeader>

                <CardContent className="p-8 pt-4 mt-auto">
                    <div className="grid grid-cols-3 gap-6 py-6 border-y border-white/5">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> Price
                            </span>
                            <p className="font-black text-lg text-white tabular-nums">{formatCurrency(recipe.menu_price)}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Cost
                            </span>
                            <p className="font-black text-lg text-neutral-400 tabular-nums">{formatCurrency(recipe.total_cost)}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Prep
                            </span>
                            <p className="font-black text-lg text-neutral-400">
                                {recipe.prep_time_minutes ? `${recipe.prep_time_minutes}m` : '--'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Net Margin</span>
                        <span className={cn(
                            "text-xl font-black italic tabular-nums",
                            getMarginColorClass(recipe.margin_status)
                        )}>
                            {formatCurrency(recipe.menu_price - recipe.total_cost)}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
