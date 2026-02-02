'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Search, Plus, Minus, CreditCard, ChevronRight, ShoppingCart, Zap, ListOrdered, Utensils } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { type Recipe } from '@/lib/types/database'
import { isRecipeInStock } from '@/lib/calculations'
import { cn } from '@/lib/utils'

interface PosProps {
    recipes: any[]
}

export default function PosSystem({ recipes }: PosProps) {
    const router = useRouter()
    const supabase = createClient()
    const [view, setView] = useState<'new' | 'bills'>('new')
    const [searchQuery, setSearchQuery] = useState('')
    const [category, setCategory] = useState<'All' | 'Starters' | 'Mains' | 'Desserts'>('All')
    const [cart, setCart] = useState<Record<string, { recipe: Recipe, quantity: number }>>({})
    const [liveOrders, setLiveOrders] = useState<any[]>([])

    // 1. Fetch live bills for FOH
    useEffect(() => {
        const fetchOrders = async () => {
            const { data } = await supabase
                .from('orders')
                .select('*, order_items(*, recipe:recipes(name))')
                .order('created_at', { ascending: false })
                .limit(20)
            if (data) setLiveOrders(data)
        }

        fetchOrders()

        const channel = supabase
            .channel('foh_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    const categorize = (recipe: Recipe) => {
        if (recipe.menu_price < 20) return 'Starters'
        if (recipe.menu_price < 40) return 'Starters'
        return 'Mains'
    }

    const filteredRecipes = recipes.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = category === 'All' || categorize(r) === category
        return matchesSearch && matchesCategory
    })

    const addToCart = (recipe: any) => {
        const inStock = isRecipeInStock(recipe.recipe_items || [])
        if (!recipe.is_available) {
            toast.error('Asset currently deactivated')
            return
        }
        if (!inStock) {
            toast.error('Item is out of stock')
            return
        }
        setCart(prev => ({
            ...prev,
            [recipe.id]: { recipe, quantity: (prev[recipe.id]?.quantity || 0) + 1 }
        }))
    }

    const toggleAvailability = async (recipe: Recipe) => {
        try {
            const { error } = await supabase
                .from('recipes')
                .update({ is_available: !recipe.is_available })
                .eq('id', recipe.id)

            if (error) throw error

            toast.success(recipe.is_available ? 'Dish deactivated' : 'Dish reactivated')
            router.refresh()
        } catch (error) {
            console.error('Error updating availability:', error)
            toast.error('Sync failed')
        }
    }

    const removeFromCart = (id: string) => {
        setCart(prev => {
            const newCart = { ...prev }
            if (newCart[id].quantity > 1) newCart[id].quantity -= 1
            else delete newCart[id]
            return newCart
        })
    }

    const subtotal = Object.values(cart).reduce((acc, item) => acc + (item.recipe.menu_price * item.quantity), 0)

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not logged in')

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({ user_id: user.id, status: 'paid', total_amount: subtotal, source: 'staff' })
                .select().single()

            if (orderError) throw orderError

            const items = Object.values(cart).map(item => ({
                order_id: order.id, recipe_id: item.recipe.id, quantity: item.quantity, unit_price: item.recipe.menu_price
            }))
            await supabase.from('order_items').insert(items)

            await supabase.rpc('deduct_inventory', {
                sales: Object.values(cart).map(i => ({ recipe_id: i.recipe.id, quantity: i.quantity }))
            })
        },
        onSuccess: () => {
            toast.success('Transaction finalized and synchronized')
            setCart({})
            router.refresh()
        },
        onError: (err) => toast.error('Transaction failed: ' + err.message)
    })

    return (
        <div className="flex flex-col h-[calc(100vh-280px)] gap-8">
            <div className="flex gap-4">
                <Button
                    variant="ghost"
                    onClick={() => setView('new')}
                    className={cn(
                        "h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all gap-3 border border-white/5",
                        view === 'new' ? "bg-white/10 text-white shadow-xl shadow-white/5" : "text-neutral-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Zap className={cn("w-4 h-4", view === 'new' ? "text-blue-500" : "")} /> New Terminal Entry
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setView('bills')}
                    className={cn(
                        "h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all gap-3 border border-white/5",
                        view === 'bills' ? "bg-white/10 text-white shadow-xl shadow-white/5" : "text-neutral-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <ListOrdered className={cn("w-4 h-4", view === 'bills' ? "text-purple-500" : "")} /> Ledger History
                </Button>
            </div>

            {view === 'new' ? (
                <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden">
                    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="IDENTIFY ASSET..."
                                className="h-16 pl-14 bg-black/40 border-white/5 rounded-2xl text-lg font-black text-white placeholder:text-neutral-800 focus:border-blue-500/50 transition-all shadow-inner"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredRecipes.map((recipe) => {
                                const inStock = isRecipeInStock(recipe.recipe_items || [])
                                const isAvailable = recipe.is_available !== false && inStock

                                return (
                                    <div
                                        key={recipe.id}
                                        className={cn(
                                            "glass-card p-6 text-left transition-all relative overflow-hidden flex flex-col justify-between h-full",
                                            !isAvailable ? "opacity-40 border-red-500/20" : "hover:border-blue-500/30 group cursor-pointer shadow-xl shadow-black/20"
                                        )}
                                        onClick={() => isAvailable && addToCart(recipe)}
                                    >
                                        {!isAvailable && (
                                            <div className="absolute inset-0 bg-red-500/5 z-0 pointer-events-none" />
                                        )}
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <Badge className={cn(
                                                    "h-7 px-3 font-black uppercase text-[8px] tracking-widest border-0 rounded-lg",
                                                    recipe.is_available ? "bg-white/5 text-neutral-500" : "bg-red-500/20 text-red-500"
                                                )}>
                                                    {recipe.is_available ? categorize(recipe) : 'OFF AIR'}
                                                </Badge>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={cn(
                                                        "font-black tracking-tighter tabular-nums text-lg",
                                                        isAvailable ? "text-blue-500" : "text-neutral-600"
                                                    )}>${recipe.menu_price}</span>
                                                    {!inStock && (
                                                        <Badge className="bg-yellow-500/20 text-yellow-500 border-0 text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded-sm">
                                                            SOLD OUT
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <h3 className="font-black text-white text-lg leading-tight tracking-tight uppercase group-hover:translate-x-1 transition-transform mb-4">{recipe.name}</h3>
                                        </div>

                                        <div className="relative z-10 mt-auto pt-4 border-t border-white/5 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAvailability(recipe);
                                                }}
                                                className={cn(
                                                    "flex-1 h-8 rounded-lg text-[8px] font-black uppercase tracking-widest",
                                                    recipe.is_available ? "text-neutral-600 hover:text-red-500 hover:bg-red-500/10" : "text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                )}
                                            >
                                                {recipe.is_available ? 'Disable' : 'Enable'}
                                            </Button>
                                            {isAvailable && (
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div >

                    <Card className="w-full lg:w-[450px] glass-card flex flex-col overflow-hidden border-white/10 shadow-2xl">
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-xl font-black text-white flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <ShoppingCart className="w-5 h-5 text-blue-500" />
                                </div>
                                Active Transaction
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                            {Object.values(cart).length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-neutral-600 opacity-20 py-24">
                                    <ShoppingCart className="w-20 h-20 mb-6" />
                                    <span className="font-black uppercase tracking-[0.2em] text-xs">Terminal Standby</span>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.values(cart).map(item => (
                                        <div key={item.recipe.id} className="flex items-center justify-between group">
                                            <div className="space-y-1">
                                                <div className="text-sm font-black text-white uppercase tracking-tight group-hover:text-blue-500 transition-colors">
                                                    {item.recipe.name}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => removeFromCart(item.recipe.id)}
                                                        className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-neutral-500 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="text-[10px] font-black text-neutral-600 uppercase tracking-widest tabular-nums">Unit x {item.quantity}</span>
                                                    <button
                                                        onClick={() => addToCart(item.recipe)}
                                                        className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-neutral-500 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="text-xl font-black text-white tracking-tighter tabular-nums">
                                                ${(item.recipe.menu_price * item.quantity).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        <div className="p-8 bg-black/40 border-t border-white/10 space-y-8 backdrop-blur-2xl">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Market Value Total</div>
                                    <div className="text-2xl font-black text-white tracking-tighter uppercase">Cumulative bill</div>
                                </div>
                                <div className="text-5xl font-black text-blue-500 tracking-tighter tabular-nums leading-none">
                                    ${subtotal.toFixed(2)}
                                </div>
                            </div>
                            <Button
                                className="w-full h-20 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl tracking-tighter rounded-[32px] transition-all shadow-2xl shadow-blue-500/20 active:scale-95 group"
                                disabled={Object.keys(cart).length === 0 || checkoutMutation.isPending}
                                onClick={() => checkoutMutation.mutate()}
                            >
                                {checkoutMutation.isPending ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        SYNCING...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        PROCESS TRANSACTION
                                    </div>
                                )}
                            </Button>
                        </div>
                    </Card>
                </div >
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 overflow-y-auto pr-2 custom-scrollbar pb-24">
                    {liveOrders.map(order => (
                        <Card key={order.id} className="glass-card overflow-hidden group hover:border-purple-500/30 transition-all">
                            <CardHeader className="p-6 border-b border-white/5 flex flex-row items-center justify-between space-y-0">
                                <span className="text-[10px] font-black font-mono text-neutral-700 tracking-widest">ID_{order.id.slice(0, 8).toUpperCase()}</span>
                                <Badge className={cn(
                                    "px-3 h-6 border-0 text-[8px] font-black uppercase tracking-widest rounded-lg",
                                    order.source === 'guest' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                )}>
                                    {order.source}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Target Entity</div>
                                        <h4 className="text-xl font-black text-white tracking-tighter uppercase">{order.table_or_room ? `Room ${order.table_or_room}` : 'Staff Auth'}</h4>
                                    </div>
                                    <div className="text-2xl font-black text-emerald-500 tracking-tighter tabular-nums">${order.total_amount}</div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-[10px] font-black text-neutral-700 uppercase tracking-widest">Ledger Manifest</div>
                                    {order.order_items?.map((item: any) => (
                                        <div key={item.id} className="text-xs font-bold text-neutral-400 flex justify-between uppercase tracking-tight">
                                            <span className="truncate flex-1 pr-4">{item.recipe?.name}</span>
                                            <span className="text-neutral-600 tabular-nums">X{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <div className="p-6 bg-black/40 text-center border-t border-white/5 group-hover:bg-purple-500/5 transition-all">
                                <span className="text-[10px] text-neutral-600 group-hover:text-purple-500 uppercase font-black tracking-[0.2em] transition-colors">
                                    ENTRY STATUS: {order.status}
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div >
    )
}
