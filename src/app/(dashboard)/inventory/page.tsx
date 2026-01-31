'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Package, AlertTriangle, TrendingDown, Check, RefreshCw } from 'lucide-react'

import { type Ingredient } from '@/lib/types/database'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

export default function InventoryPage() {
    const queryClient = useQueryClient()
    const supabase = createClient()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<number>(0)

    // Fetch ingredients
    const { data: ingredients, isLoading } = useQuery({
        queryKey: ['ingredients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ingredients')
                .select('*')
                .order('current_stock', { ascending: true })
            if (error) throw error
            return data as Ingredient[]
        },
    })

    // Update stock mutation
    const updateStockMutation = useMutation({
        mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
            const { error } = await supabase
                .from('ingredients')
                .update({ current_stock: stock, updated_at: new Date().toISOString() })
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] })
            setEditingId(null)
            toast.success('Inventory state updated')
        },
        onError: (error) => {
            toast.error('Sync failure: ' + error.message)
        },
    })

    const lowStockItems = ingredients?.filter((i) => i.current_stock < 5) || []
    const outOfStockItems = ingredients?.filter((i) => i.current_stock === 0) || []

    const startEditing = (ingredient: Ingredient) => {
        setEditingId(ingredient.id)
        setEditValue(ingredient.current_stock)
    }

    const handleSave = (id: string) => {
        updateStockMutation.mutate({ id, stock: editValue })
    }

    return (
        <div className="space-y-12 relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[140px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] -z-10" />

            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-5xl font-black text-white tracking-tighter italic">Live Inventory.</h1>
                <p className="text-neutral-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Critical Stock Monitoring • Zero Downtime
                </p>
            </div>

            {/* Alert Cards */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className={cn(
                    "glass-card transition-all duration-500",
                    outOfStockItems.length > 0 ? "border-red-500/30" : "border-emerald-500/10"
                )}>
                    <CardContent className="flex items-center gap-6 p-8">
                        <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl",
                            outOfStockItems.length > 0 ? "bg-red-500/10 shadow-red-500/5" : "bg-emerald-500/10 shadow-emerald-500/5"
                        )}>
                            {outOfStockItems.length > 0 ? (
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            ) : (
                                <Check className="w-8 h-8 text-emerald-500" />
                            )}
                        </div>
                        <div>
                            <h3 className={cn(
                                "text-4xl font-black italic",
                                outOfStockItems.length > 0 ? "text-red-500" : "text-emerald-500"
                            )}>
                                {outOfStockItems.length}
                            </h3>
                            <p className="text-neutral-500 font-black uppercase text-[10px] tracking-widest leading-loose">Decommissioned Assets (86&apos;d)</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "glass-card transition-all duration-500",
                    lowStockItems.length > 0 ? "border-yellow-500/30" : "border-emerald-500/10"
                )}>
                    <CardContent className="flex items-center gap-6 p-8">
                        <div className={cn(
                            "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl",
                            lowStockItems.length > 0 ? "bg-yellow-500/10 shadow-yellow-500/5" : "bg-emerald-500/10 shadow-emerald-500/5"
                        )}>
                            {lowStockItems.length > 0 ? (
                                <TrendingDown className="w-8 h-8 text-yellow-500" />
                            ) : (
                                <Check className="w-8 h-8 text-emerald-500" />
                            )}
                        </div>
                        <div>
                            <h3 className={cn(
                                "text-4xl font-black italic",
                                lowStockItems.length > 0 ? "text-yellow-500" : "text-emerald-500"
                            )}>
                                {lowStockItems.length}
                            </h3>
                            <p className="text-neutral-500 font-black uppercase text-[10px] tracking-widest leading-loose">Low Stock Threshold Alerts</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Inventory List */}
            <Card className="glass-card overflow-hidden">
                <CardHeader className="border-b border-white/5 p-8">
                    <CardTitle className="text-xl font-black text-white italic flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-emerald-500" />
                        </div>
                        Central Repository
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <p className="text-xs font-black uppercase tracking-widest text-neutral-600">Recalibrating...</p>
                        </div>
                    ) : !ingredients || ingredients.length === 0 ? (
                        <div className="text-center py-24 px-8">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Package className="w-12 h-12 text-neutral-800" />
                            </div>
                            <h3 className="text-2xl font-black text-white italic mb-2 tracking-tighter">No Assets Found.</h3>
                            <p className="text-neutral-500 mb-8 font-medium">Add materials in the pantry to engage tracking.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {ingredients.map((ingredient) => {
                                const isLow = ingredient.current_stock < 5
                                const isOut = ingredient.current_stock === 0
                                const isEditing = editingId === ingredient.id

                                return (
                                    <div
                                        key={ingredient.id}
                                        className={cn(
                                            "flex flex-col sm:flex-row sm:items-center justify-between p-8 gap-6 transition-colors group",
                                            isOut ? 'bg-red-500/[0.02]' : isLow ? 'bg-yellow-500/[0.02]' : 'hover:bg-white/[0.02]'
                                        )}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={cn(
                                                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105",
                                                isOut ? 'bg-red-500/10' : isLow ? 'bg-yellow-500/10' : 'bg-white/5'
                                            )}>
                                                <Package className={cn(
                                                    "w-7 h-7",
                                                    isOut ? 'text-red-500' : isLow ? 'text-yellow-500' : 'text-neutral-500'
                                                )} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-white italic tracking-tight">{ingredient.name}</h4>
                                                <p className="text-xs font-bold text-neutral-600 uppercase tracking-widest mt-1">
                                                    {ingredient.category || 'General'} Assets • {ingredient.purchase_unit} Units
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 self-end sm:self-auto">
                                            {isEditing ? (
                                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                                    <Input
                                                        type="number"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                                                        className="h-14 w-28 bg-black/40 border-white/10 rounded-xl text-white font-black text-center text-xl focus:border-emerald-500/50"
                                                        autoFocus
                                                    />
                                                    <Button
                                                        onClick={() => handleSave(ingredient.id)}
                                                        disabled={updateStockMutation.isPending}
                                                        className="h-14 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                                                    >
                                                        {updateStockMutation.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Sync'}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => setEditingId(null)}
                                                        className="h-14 px-4 text-neutral-600 font-bold uppercase tracking-widest hover:text-white"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="text-right">
                                                        <span className={cn(
                                                            "text-3xl font-black italic tabular-nums",
                                                            isOut ? 'text-red-500' : isLow ? 'text-yellow-500' : 'text-white'
                                                        )}>
                                                            {ingredient.current_stock}
                                                        </span>
                                                        <span className="text-neutral-600 font-bold uppercase text-[10px] tracking-widest ml-3">Units</span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {isOut && (
                                                            <Badge className="h-6 px-2 bg-red-500/10 text-red-500 border-red-500/20 font-black uppercase text-[9px] tracking-widest rounded-md">86&apos;d</Badge>
                                                        )}
                                                        {isLow && !isOut && (
                                                            <Badge className="h-6 px-2 bg-yellow-500/10 text-yellow-500 border-yellow-500/20 font-black uppercase text-[9px] tracking-widest rounded-md">Low Stock</Badge>
                                                        )}
                                                        <Button
                                                            onClick={() => startEditing(ingredient)}
                                                            className="h-12 px-6 bg-white/5 border border-white/5 rounded-xl text-white font-black uppercase tracking-widest hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            Update
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
