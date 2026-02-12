'use client'
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Search, Plus, Minus, CreditCard, ChevronLeft,
    ShoppingCart, Zap, Utensils,
    MapPin, Loader2, Trash2, Clock,
    Info, Pencil, Eye, ZapOff
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useMutation } from '@tanstack/react-query'
import { Recipe, RecipeItemWithIngredient } from '@/lib/types/database'
import { Location } from '@/lib/types/pos'

const categorize = (recipe: Recipe) => {
    if (typeof recipe.category === 'object' && recipe.category !== null) {
        return recipe.category.name || 'Main'
    }
    return (recipe.category as string) || 'Main'
}

const isRecipeInStock = (recipeItems: RecipeItemWithIngredient[]) => {
    return recipeItems.every((item) => {
        if (!item.ingredient) return true
        const currentStock = item.ingredient.current_stock ?? 0
        const ratio = item.ingredient.conversion_ratio ?? 1
        const needed = item.quantity_needed ?? item.quantity ?? 0
        return (currentStock * ratio) >= needed
    })
}

export default function PosSystem({ recipes: initialRecipes = [], initialLocation = null }: { recipes?: Recipe[], initialLocation?: Location | null }) {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    // const queryClient = useQueryClient()
    const [cart, setCart] = useState<Record<string, { recipe: Recipe, quantity: number }>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [category, setCategory] = useState<string>('All')
    const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'room_service'>('dine_in')
    const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
    const [location, setLocation] = useState<Location | null>(initialLocation)
    const [manualLocation, setManualLocation] = useState('')
    const [showMobileCart, setShowMobileCart] = useState(false)
    const [isPreorder, setIsPreorder] = useState(false)
    const [scheduledTime, setScheduledTime] = useState('')

    // Sync props to state
    useEffect(() => {
        if (initialRecipes?.length > 0) {
            setRecipes(initialRecipes)
        }
        if (initialLocation) {
            setLocation(initialLocation)
            setOrderType(initialLocation.type === 'room' ? 'room_service' : 'dine_in')
        }
    }, [initialRecipes, initialLocation])

    // Fetch initial data - removed internal fetch to use props from server component

    // Real-time subscription for recipe updates
    useEffect(() => {
        const recipeSubscription = supabase
            .channel('pos-recipe-updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'recipes' },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        setRecipes(current =>
                            current.map(recipe =>
                                recipe.id === payload.new.id
                                    ? { ...recipe, ...payload.new } as Recipe
                                    : recipe
                            )
                        )
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(recipeSubscription)
        }
    }, [supabase])



    const filteredRecipes = recipes.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = category === 'All' || categorize(r) === category
        return matchesSearch && matchesCategory
    })

    const addToCart = (recipe: Recipe) => {
        setCart(prev => ({
            ...prev,
            [recipe.id]: {
                recipe,
                quantity: (prev[recipe.id]?.quantity || 0) + 1
            }
        }))
    }

    const removeFromCart = (recipeId: string) => {
        setCart(prev => {
            const current = prev[recipeId]
            if (!current) return prev
            if (current.quantity === 1) {
                const { [recipeId]: _removed, ...rest } = prev
                return rest
            }
            return {
                ...prev,
                [recipeId]: { ...current, quantity: current.quantity - 1 }
            }
        })
    }

    const deleteFromCart = (recipeId: string) => {
        setCart(prev => {
            const { [recipeId]: _removed, ...rest } = prev
            return rest
        })
    }

    const subtotal = Object.values(cart).reduce((sum, item) => sum + (item.recipe.menu_price * item.quantity), 0)



    const toggleAvailability = async (recipe: Recipe) => {
        const newStatus = !recipe.is_available
        // Optimistic update
        setRecipes(current =>
            current.map(r =>
                r.id === recipe.id
                    ? { ...r, is_available: newStatus }
                    : r
            )
        )

        try {
            const { error } = await supabase.rpc('update_recipe_availability', {
                p_is_available: newStatus,
                p_recipe_id: recipe.id
            })

            if (error) throw error

            router.refresh()
            const action = newStatus ? "put on air" : "taken off air"
            toast.success(`Dish ${action}`)
        } catch (error) {
            // Revert on error
            setRecipes(current =>
                current.map(r =>
                    r.id === recipe.id
                        ? { ...r, is_available: !newStatus }
                        : r
                )
            )
            toast.error('Failed to update availability: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
    }

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            if (!Object.keys(cart).length) return

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not logged in')

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: user.id,
                    status: 'paid',
                    total_amount: subtotal,
                    source: 'staff',
                    type: orderType,
                    location_id: location?.id,
                    table_or_room: location?.name || manualLocation || 'Direct Sale',
                    preparation_status: isPreorder ? 'pending' : (orderType === 'room_service' ? 'received' : 'ready'),
                    is_preorder: isPreorder,
                    scheduled_for: isPreorder ? scheduledTime : null
                })
                .select().single()

            if (orderError) throw orderError

            // Update location status if it was occupied
            if (location) {
                await supabase
                    .from('locations')
                    .update({ status: 'occupied' })
                    .eq('id', location.id)
            }

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
            // router.push('/pos/ledger') // Stay on terminal
        },
        onError: (err) => toast.error('Transaction failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    })

    return (
        <div className="flex flex-col h-full gap-4 sm:gap-8 min-h-0 p-4 sm:p-8">
            {/* Header / Selection Bar */}
            <div className="flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4 sm:gap-6">
                    <Button
                        variant="ghost"
                        // onClick={() => router.push('/pos')} // Assuming this navigates back
                        className="w-12 h-12 rounded-2xl bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none mb-1">
                            {location ? location.name : 'New Order'}
                        </h1>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            Authorized Staff Entry
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => setShowMobileCart(!showMobileCart)}
                        className={cn(
                            "lg:hidden h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all gap-3 shrink-0 border-0",
                            showMobileCart
                                ? "bg-white/10 text-foreground"
                                : Object.keys(cart).length > 0
                                    ? "bg-primary text-foreground shadow-lg shadow-primary/20 animate-pulse"
                                    : "bg-primary/10 text-primary"
                        )}
                    >
                        <ShoppingCart className="w-4 h-4" />
                        <span>VIEW TICKET ({Object.keys(cart).length})</span>
                    </Button>
                </div>
            </div>

            {/* Main Terminal View */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 sm:gap-8 overflow-hidden relative">
                <div className={cn(
                    "flex-1 flex flex-col gap-4 sm:gap-6 min-w-0 overflow-hidden transition-all duration-500",
                    showMobileCart ? "hidden lg:flex" : "flex"
                )}>
                    {/* Unified Search and Categories Row */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0 items-start sm:items-center">
                        <div className="relative group flex-1 w-full sm:w-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="IDENTIFY ASSET..."
                                className="h-11 pl-11 bg-sidebar/40 border-white/5 rounded-2xl text-sm font-black text-foreground placeholder:text-[#333] focus:border-primary/50 transition-all shadow-inner w-full"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex bg-sidebar/20 p-1 rounded-2xl border border-white/5 items-center gap-1 overflow-x-auto no-scrollbar max-w-full sm:max-w-none">
                            {(['All', 'Starters', 'Mains', 'Desserts'] as const).map((cat) => (
                                <Button
                                    key={cat}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCategory(cat)}
                                    className={cn(
                                        "h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap",
                                        category === cat
                                            ? "bg-primary text-foreground shadow-lg shadow-primary/20"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {cat}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Recipe Grid */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                            {filteredRecipes.map((recipe) => {
                                const inStock = isRecipeInStock(recipe.recipe_items || [])
                                const isAvailable = recipe.is_available !== false && inStock

                                const maxServings = (recipe.recipe_items && recipe.recipe_items.length > 0)
                                    ? Math.min(...recipe.recipe_items.map((item) =>
                                        item.ingredient?.current_stock
                                            ? Math.floor(item.ingredient.current_stock / (item.quantity_needed || 1))
                                            : 999
                                    ))
                                    : 999

                                return (
                                    <div
                                        key={recipe.id}
                                        className={cn(
                                            "glass-card border-white/5 overflow-hidden transition-all duration-500 group relative flex flex-col bg-white/[0.02] h-auto rounded-[40px]",
                                            !isAvailable ? "opacity-40 grayscale-[0.5]" : "hover:border-primary/40 cursor-pointer shadow-lg hover:shadow-primary/10"
                                        )}
                                        onClick={() => isAvailable && addToCart(recipe)}
                                    >
                                        {/* High-Fidelity Image Header */}
                                        <div className="aspect-[4/3] w-full relative overflow-hidden shrink-0">
                                            {recipe.image_url ? (
                                                <img
                                                    src={recipe.image_url}
                                                    alt={recipe.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#2A2A2A] to-black flex items-center justify-center">
                                                    <Utensils className="w-12 h-12 text-foreground/5" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                            {/* Action Overlays */}
                                            <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 items-end">
                                                <Badge className="bg-sidebar/60 backdrop-blur-xl border-white/10 text-foreground font-black tracking-tighter text-lg px-3 py-1 font-display">
                                                    ${recipe.menu_price}
                                                </Badge>
                                                {!isAvailable && (
                                                    <Badge className="bg-orange-500/20 text-orange-500 border-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                                        OFF AIR
                                                    </Badge>
                                                )}
                                                {!inStock && isAvailable && (
                                                    <Badge className="bg-red-500/20 text-red-500 border-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                                        SOLD OUT
                                                    </Badge>
                                                )}
                                                {inStock && maxServings <= 5 && maxServings > 0 && (
                                                    <Badge className="bg-amber-500/20 text-amber-500 border-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                                        Only {maxServings} Left!
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="absolute top-4 left-4 z-20 flex gap-1 flex-wrap max-w-[70%]">
                                                <Badge variant="outline" className="bg-amber-500/10 backdrop-blur-md border-amber-500/20 text-[7px] uppercase tracking-[0.2em] font-black text-amber-500 px-1.5 py-0.5">
                                                    {categorize(recipe)}
                                                </Badge>
                                            </div>
                                        </div>

                                        <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-1">{categorize(recipe)}</span>
                                                    <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors font-display tracking-tight leading-tight">{recipe.name}</h3>
                                                </div>

                                                {/* Composition Manifest */}
                                                {(recipe.recipe_items?.length ?? 0) > 0 && (
                                                    <div className="pt-2 space-y-2 border-t border-white/5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <div className="flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                                                            <Info className="w-3 h-3" />
                                                            Composition Manifest
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {recipe.recipe_items?.map((item, idx) => (
                                                                <Badge key={idx} variant="outline" className="bg-white/5 border-white/5 text-[7px] text-muted-foreground font-medium px-1.5 py-0.5 lowercase">
                                                                    {item.quantity_needed}{item.unit_used} {item.ingredient?.name}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-2">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex gap-2">
                                                        <Link href={`/menu/${recipe.id}/edit`} className="flex-1" onClick={e => e.stopPropagation()}>
                                                            <Button variant="outline" size="sm" className="w-full h-11 bg-white/5 border-white/10 text-foreground text-[8px] font-black uppercase tracking-widest hover:bg-white/10 rounded-xl">
                                                                <Pencil className="w-3 h-3 mr-2 text-primary" />
                                                                Edit
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/recipes/${recipe.id}`} className="flex-1" onClick={e => e.stopPropagation()}>
                                                            <Button variant="outline" size="sm" className="w-full h-11 bg-white/5 border-white/10 text-foreground text-[8px] font-black uppercase tracking-widest hover:bg-white/10 rounded-xl">
                                                                <Eye className="w-3 h-3 mr-2 text-blue-500" />
                                                                View Recipe
                                                            </Button>
                                                        </Link>
                                                    </div>

                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleAvailability(recipe);
                                                        }}
                                                        className={cn(
                                                            "w-full font-black text-[8px] uppercase tracking-widest h-11 rounded-xl transition-all font-display",
                                                            !recipe.is_available
                                                                ? "bg-primary hover:bg-primary text-foreground"
                                                                : "bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-foreground border border-red-500/20"
                                                        )}
                                                    >
                                                        {!recipe.is_available ? (
                                                            <Zap className="w-3 h-3 mr-2" />
                                                        ) : (
                                                            <ZapOff className="w-3 h-3 mr-2" />
                                                        )}
                                                        {!recipe.is_available ? 'Air On' : 'Air Off'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <Card className={cn(
                    "w-full lg:w-[420px] xl:w-[480px] h-full glass-card flex flex-col overflow-hidden border-white/10 shadow-2xl rounded-[40px] shrink-0 transition-all duration-500 min-h-0",
                    showMobileCart ? "flex" : "hidden lg:flex"
                )}>
                    <CardHeader className="p-6 sm:p-8 border-b border-white/5 shrink-0 space-y-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl font-black text-foreground flex items-center gap-5">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <ShoppingCart className="w-6 h-6 text-primary" />
                                </div>
                                Live Ticket
                            </CardTitle>
                            <Button
                                variant="ghost"
                                onClick={() => setShowMobileCart(false)}
                                className="lg:hidden w-10 h-10 rounded-xl bg-white/5 text-muted-foreground hover:text-foreground"
                            >
                                <ChevronLeft className="w-5 h-5 rotate-180" />
                            </Button>
                        </div>

                        {/* Redesigned Order Type Selector Consolidated in Sidebar */}
                        <div className="flex bg-sidebar/40 p-1 rounded-2xl border border-white/5 items-center gap-1 w-full box-border">
                            {(['dine_in', 'room_service', 'takeaway'] as const).map((type) => (
                                <Button
                                    key={type}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setOrderType(type)}
                                    className={cn(
                                        "flex-1 h-9 px-2 rounded-xl font-black uppercase text-[8px] tracking-[0.1em] transition-all",
                                        orderType === type ? "bg-primary text-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {type.replace('_', ' ')}
                                </Button>
                            ))}
                        </div>

                        {/* Contextual Input Moved to Sidebar Header */}
                        {!location && (
                            <div className="group relative">
                                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                                <div className="relative flex items-center gap-3 bg-sidebar/60 backdrop-blur-md p-3 rounded-2xl border border-white/5 group-focus-within:border-primary/30 transition-all duration-300">
                                    <MapPin className={cn(
                                        "w-4 h-4 transition-colors duration-300",
                                        manualLocation ? "text-primary" : "text-muted-foreground"
                                    )} />
                                    <Input
                                        placeholder={`SPECIFY ${orderType === 'room_service' ? 'ROOM' : 'TABLE'}...`}
                                        value={manualLocation}
                                        onChange={(e) => setManualLocation(e.target.value.toUpperCase())}
                                        className="bg-transparent border-0 focus-visible:ring-0 text-[11px] font-black uppercase tracking-[0.2em] p-0 h-auto text-foreground placeholder:text-muted-foreground focus:placeholder:text-muted-foreground transition-all"
                                    />
                                    {manualLocation && (
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all",
                                    isPreorder
                                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                        : "bg-white/5 border-white/5 text-muted-foreground"
                                )}>
                                    <Clock className="w-3 h-3" />
                                </div>
                                <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Schedule Pre-order</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsPreorder(!isPreorder)}
                                className={cn(
                                    "h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                    isPreorder ? "bg-amber-500 text-black hover:bg-amber-400" : "bg-white/5 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {isPreorder ? 'Active' : 'Enable'}
                            </Button>
                        </div>

                        {isPreorder && (
                            <div className="px-2 pb-2 animate-in slide-in-from-top-2 duration-300">
                                <input
                                    type="datetime-local"
                                    className="w-full h-11 bg-sidebar/40 border border-white/10 rounded-xl px-4 text-[10px] font-bold text-foreground outline-none focus:border-amber-500/50 transition-all [color-scheme:dark]"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                />
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 p-6 sm:p-8 overflow-y-auto custom-scrollbar">
                        {Object.values(cart).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-10">
                                <ShoppingCart className="w-24 h-24 mb-6" />
                                <span className="font-black uppercase tracking-[0.3em] text-[10px]">Ready to Order</span>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.values(cart).map(item => (
                                    <div key={item.recipe.id} className="flex items-center justify-between group animate-in slide-in-from-right-4 duration-500 bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="text-lg font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                                                    {item.recipe.name}
                                                </div>
                                                <button
                                                    onClick={() => deleteFromCart(item.recipe.id)}
                                                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remove from cart"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 bg-sidebar/40 p-1 rounded-xl border border-white/5">
                                                    <button
                                                        onClick={() => removeFromCart(item.recipe.id)}
                                                        className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest tabular-nums min-w-[3ch] text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => addToCart(item.recipe)}
                                                        className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="text-xl font-black text-foreground tracking-tighter tabular-nums">
                                                    ${(item.recipe.menu_price * item.quantity).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                    <div className="p-6 sm:p-8 bg-sidebar/40 border-t border-white/10 space-y-6 sm:space-y-8 backdrop-blur-3xl shrink-0">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <div className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em]">Gross Value Assessment</div>
                                <div className="text-2xl font-black text-foreground tracking-tighter uppercase leading-none">Total Due</div>
                            </div>
                            <div className="text-5xl font-black text-primary tracking-tighter tabular-nums leading-none">
                                ${subtotal.toFixed(2)}
                            </div>
                        </div>
                        <Button
                            className="w-full h-20 bg-primary hover:bg-primary text-foreground font-black text-xl tracking-tighter rounded-[32px] transition-all shadow-2xl shadow-primary/20 active:scale-[0.98] group relative overflow-hidden"
                            disabled={Object.keys(cart).length === 0 || checkoutMutation.isPending}
                            onClick={() => checkoutMutation.mutate()}
                        >
                            {checkoutMutation.isPending ? (
                                <div className="flex items-center gap-4">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    SYNCHRONIZING...
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <CreditCard className="w-6 h-6 group-hover:scale-110 transition-transform duration-500" />
                                    <span>FINALIZE FOR {(location?.name || manualLocation || 'New Order').toUpperCase()}</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </Card>
            </div >
        </div >
    )
}
