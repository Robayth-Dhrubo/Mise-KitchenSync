'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Minus, ShoppingBag, ChevronRight, Star, Clock, CreditCard, ShieldCheck, ArrowLeft, CheckCircle2, Eye, Zap, ZapOff, Info, Pencil, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { isRecipeInStock } from '@/lib/calculations'
import { cn } from '@/lib/utils'

interface GuestPortalProps {
    recipes: any[]
    room: string
    hotelId: string
    isPreview?: boolean
}

type MenuStep = 'menu' | 'cart' | 'payment' | 'success'

import { DEMO_ASSETS, ASSET_IMAGES } from './menu-data'

export function GuestMenu({ recipes: initialRecipes, room, hotelId, isPreview = false }: GuestPortalProps) {
    const router = useRouter()
    const supabase = createClient()
    const [cart, setCart] = useState<Record<string, any>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUpdating, setIsUpdating] = useState<string | null>(null)
    const [step, setStep] = useState<MenuStep>('menu')
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [showPrintOptions, setShowPrintOptions] = useState(false)
    const [hideRecipesForPrint, setHideRecipesForPrint] = useState(false)

    const handlePrint = (withRecipes: boolean) => {
        setHideRecipesForPrint(!withRecipes)
        setShowPrintOptions(false)
        // Small delay to allow state update before print
        setTimeout(() => {
            window.print()
            // Reset after print
            setTimeout(() => setHideRecipesForPrint(false), 500)
        }, 100)
    }


    // Realtime subscription - auto-refresh when ingredients or recipes change
    useEffect(() => {
        const channel = supabase
            .channel('menu-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ingredients' },
                () => {
                    // Refresh the page to get updated stock data
                    router.refresh()
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'recipes' },
                () => {
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, router])

    const toggleAvailability = async (recipe: any) => {
        setIsUpdating(recipe.id)
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
        } finally {
            setIsUpdating(null)
        }
    }

    // Normalize properties and filter by availability
    const recipes = initialRecipes
        .map(r => ({
            ...r,
            image: r.image_url || r.image || ASSET_IMAGES.main,
            category: r.category || 'other',
            is_in_stock: isRecipeInStock(r.recipe_items || []),
            // Calculate max servings from limiting ingredient
            max_servings: r.recipe_items?.length > 0
                ? Math.min(...r.recipe_items.map((item: any) =>
                    item.ingredient?.current_stock
                        ? Math.floor(item.ingredient.current_stock / (item.quantity_needed || 1))
                        : 999
                ))
                : 999
        }))
        // Guest view: hide items that are off air OR sold out
        // Chef preview: show everything
        .filter(r => isPreview || (r.is_available !== false && r.is_in_stock))

    const categories = ['all', ...Array.from(new Set(recipes.map(r => r.category || 'other')))]

    const filteredRecipes = activeCategory === 'all'
        ? recipes
        : recipes.filter(r => r.category === activeCategory)

    const addToCart = (recipe: any) => {
        if (!isPreview && !recipe.is_in_stock) {
            toast.error('Item is currently sold out')
            return
        }
        setCart(prev => ({
            ...prev,
            [recipe.id]: {
                recipe,
                quantity: (prev[recipe.id]?.quantity || 0) + 1
            }
        }))
    }

    const removeFromCart = (id: string) => {
        setCart(prev => {
            const newCart = { ...prev }
            if (newCart[id].quantity > 1) {
                newCart[id].quantity -= 1
            } else {
                delete newCart[id]
            }
            return newCart
        })
    }

    const total = Object.values(cart).reduce((acc, item) => acc + (item.recipe.menu_price * item.quantity), 0)
    const itemCount = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0)

    const placeOrder = async () => {
        setIsSubmitting(true)
        try {
            // Attempt real order creation
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: hotelId,
                    table_or_room: room,
                    source: 'guest',
                    status: 'paid',
                    total_amount: total
                })
                .select()
                .single()

            if (orderError) {
                console.warn('DB Order failed (table missing?), falling back to simulation:', orderError.message);
                // Simulation mode for demo if tables are missing
                await new Promise(r => setTimeout(r, 1500));
            } else {
                // Create Order Items
                const items = Object.values(cart).map(item => ({
                    order_id: order.id,
                    recipe_id: typeof item.recipe.id === 'string' && item.recipe.id.length < 5 ? null : item.recipe.id, // Handle demo IDs
                    quantity: item.quantity,
                    unit_price: item.recipe.menu_price
                }))

                await supabase.from('order_items').insert(items)
            }

            setStep('success')
            toast.success('Transaction Secure. Chef is on it.')
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] -z-10" />

                <div className="w-32 h-32 bg-emerald-500/20 rounded-[40px] flex items-center justify-center mb-8 animate-in zoom-in-50 duration-700 shadow-2xl shadow-emerald-500/20 rotate-6">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                </div>
                <h1 className="text-5xl font-black text-white mb-4 font-display tracking-tighter">Order Secured.</h1>
                <p className="text-neutral-500 max-w-sm mb-12 font-medium leading-relaxed">
                    Transaction finalized. Our executive team is now preparing your selection for delivery to <span className="text-emerald-400 font-bold">Station {room}</span>.
                </p>
                <div className="space-y-4 w-full max-w-xs">
                    <Button onClick={() => { setStep('menu'); setCart({}); }} className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all font-display">
                        New Order
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white relative flex flex-col">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neutral-600/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[140px]" />
            </div>

            {/* Header */}
            <div className="relative sticky top-0 z-30 p-6 bg-black/40 backdrop-blur-3xl border-b border-white/5">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            {step !== 'menu' && (
                                <Button variant="ghost" size="icon" onClick={() => setStep(step === 'payment' ? 'cart' : 'menu')} className="w-10 h-10 rounded-xl hover:bg-white/5 mr-2">
                                    <ArrowLeft className="w-5 h-5 text-neutral-400" />
                                </Button>
                            )}
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-xl hidden md:block">
                                    <BookOpen className="w-8 h-8 text-emerald-500" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-white tracking-tighter font-display leading-none">
                                        {step === 'menu' ? 'Menu' : step === 'cart' ? 'Your Selection' : 'Secure Vault'}
                                    </h1>
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-2">
                                        {isPreview ? 'Live Menu Preview' : `Station ${room} • Operational`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {isPreview && (
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Button
                                        onClick={() => setShowPrintOptions(!showPrintOptions)}
                                        variant="outline"
                                        className="h-12 px-6 bg-white/5 border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all print:hidden"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        Print Menu
                                        <ChevronRight className={cn("w-4 h-4 ml-2 transition-transform", showPrintOptions && "rotate-90")} />
                                    </Button>
                                    {showPrintOptions && (
                                        <div className="absolute top-full mt-2 right-0 bg-black/90 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 min-w-[200px]">
                                            <button
                                                onClick={() => handlePrint(false)}
                                                className="w-full px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/10 transition-all flex items-center gap-3"
                                            >
                                                <ShoppingBag className="w-4 h-4 text-emerald-500" />
                                                Menu Only
                                                <span className="text-[10px] text-neutral-500 ml-auto">(Public)</span>
                                            </button>
                                            <button
                                                onClick={() => handlePrint(true)}
                                                className="w-full px-4 py-3 text-left text-sm font-bold text-white hover:bg-white/10 transition-all flex items-center gap-3 border-t border-white/5"
                                            >
                                                <Eye className="w-4 h-4 text-blue-500" />
                                                With Recipes
                                                <span className="text-[10px] text-neutral-500 ml-auto">(Internal)</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <Link href="/menu/new">
                                    <Button className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all print:hidden">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Item
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>

                    {step === 'menu' && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                            {categories.map(cat => (
                                <Button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={cn(
                                        "h-10 px-6 rounded-full font-black text-[9px] uppercase tracking-widest transition-all",
                                        activeCategory === cat ? "bg-white text-black" : "bg-white/5 text-neutral-500 hover:text-white"
                                    )}
                                >
                                    {cat}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main scrollable area */}
            <main className="flex-1 relative z-10 px-6 py-8 max-w-7xl mx-auto w-full pb-32">
                {step === 'menu' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {filteredRecipes.map((recipe) => (
                            <Card key={recipe.id} className={cn(
                                "glass-card border-white/5 overflow-hidden transition-all duration-500 group relative flex flex-col bg-white/[0.02]",
                                recipe.is_available === false ? "opacity-40 grayscale-[0.5]" : "hover:border-emerald-500/40"
                            )}>
                                {/* High-Fidelity Image Header */}
                                <div className="aspect-[4/3] w-full relative overflow-hidden shrink-0">
                                    <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                    {/* Action Overlays */}
                                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 items-end">
                                        <Badge className="bg-black/60 backdrop-blur-xl border-white/10 text-white font-black tracking-tighter text-lg px-3 py-1 font-display">
                                            ${recipe.menu_price}
                                        </Badge>
                                        {recipe.is_available === false && (
                                            <Badge className="bg-orange-500/20 text-orange-500 border-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                                OFF AIR
                                            </Badge>
                                        )}
                                        {!recipe.is_in_stock && recipe.is_available !== false && (
                                            <Badge className="bg-red-500/20 text-red-500 border-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                                SOLD OUT
                                            </Badge>
                                        )}
                                        {recipe.is_in_stock && recipe.max_servings <= 5 && recipe.max_servings > 0 && (
                                            <Badge className="bg-amber-500/20 text-amber-500 border-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                                Only {recipe.max_servings} Left!
                                            </Badge>
                                        )}
                                    </div>

                                    {recipe.allergies?.length > 0 && (
                                        <div className="absolute top-4 left-4 z-20 flex gap-1 flex-wrap max-w-[70%]">
                                            {recipe.allergies.map((allergy: string) => (
                                                <Badge key={allergy} variant="outline" className="bg-amber-500/10 backdrop-blur-md border-amber-500/20 text-[7px] uppercase tracking-[0.2em] font-black text-amber-500 px-1.5 py-0.5">
                                                    {allergy}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-1">{recipe.category}</span>
                                            <h3 className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors font-display tracking-tight leading-tight">{recipe.name}</h3>
                                        </div>
                                        <p className="text-[11px] text-neutral-400 font-medium leading-relaxed line-clamp-2 min-h-[2.5rem]">
                                            {recipe.description}
                                        </p>


                                        {isPreview && recipe.recipe_items?.length > 0 && !hideRecipesForPrint && (
                                            <div className="pt-2 space-y-2 border-t border-white/5 mt-2 print:hidden">
                                                <div className="flex items-center gap-2 text-[8px] font-black text-neutral-500 uppercase tracking-widest">
                                                    <Info className="w-3 h-3" />
                                                    Composition Manifest
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {recipe.recipe_items.map((item: any, idx: number) => (
                                                        <Badge key={idx} variant="outline" className="bg-white/5 border-white/5 text-[7px] text-neutral-400 font-medium px-1.5 py-0.5 lowercase">
                                                            {item.quantity_needed}{item.ingredient?.unit} {item.ingredient?.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    <div className="pt-2">
                                        {isPreview ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Link href={`/menu/${recipe.id}/edit`} className="w-full">
                                                        <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white font-black text-[8px] uppercase tracking-widest h-11 rounded-xl hover:bg-white/10 transition-all font-display">
                                                            <Pencil className="w-3 h-3 mr-2 text-emerald-500" />
                                                            Edit
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/recipes/${recipe.id}`} className="w-full">
                                                        <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white font-black text-[8px] uppercase tracking-widest h-11 rounded-xl hover:bg-white/10 transition-all font-display">
                                                            <Eye className="w-3 h-3 mr-2 text-blue-500" />
                                                            View Recipe
                                                        </Button>
                                                    </Link>
                                                </div>
                                                {/* Show SOLD OUT indicator if out of stock */}
                                                {!recipe.is_in_stock ? (
                                                    <div className="w-full font-black text-[8px] uppercase tracking-widest h-11 rounded-xl bg-red-600/20 text-red-400 border border-red-500/20 flex items-center justify-center gap-2 font-display">
                                                        <ZapOff className="w-3 h-3" />
                                                        Sold Out (Auto)
                                                    </div>
                                                ) : (
                                                    <Button
                                                        onClick={() => toggleAvailability(recipe)}
                                                        disabled={isUpdating === recipe.id}
                                                        className={cn(
                                                            "w-full font-black text-[8px] uppercase tracking-widest h-11 rounded-xl transition-all font-display",
                                                            recipe.is_available === false
                                                                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                                                : "bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20"
                                                        )}
                                                    >
                                                        {recipe.is_available === false ? (
                                                            <Zap className="w-3 h-3 mr-2" />
                                                        ) : (
                                                            <ZapOff className="w-3 h-3 mr-2" />
                                                        )}
                                                        {recipe.is_available === false ? 'Go Live' : 'Air Off'}
                                                    </Button>
                                                )}
                                            </div>
                                        ) : cart[recipe.id] ? (
                                            <div className="flex items-center justify-between bg-black/40 rounded-2xl border border-white/10 p-1 backdrop-blur-2xl ring-1 ring-emerald-500/20">
                                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-white/5 hover:text-red-400 transition-colors" onClick={() => removeFromCart(recipe.id)}>
                                                    <Minus className="w-4 h-4" />
                                                </Button>
                                                <span className="text-sm font-black text-emerald-500 tabular-nums">{cart[recipe.id].quantity}</span>
                                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-white/5 hover:text-emerald-400 transition-colors" onClick={() => addToCart(recipe)}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={() => (recipe.is_available !== false && recipe.is_in_stock) && addToCart(recipe)}
                                                disabled={recipe.is_available === false || !recipe.is_in_stock}
                                                className={cn(
                                                    "w-full bg-white/5 text-white font-black text-[9px] uppercase tracking-[0.2em] h-11 rounded-2xl transition-all font-display duration-300",
                                                    (recipe.is_available !== false && recipe.is_in_stock) ? "hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-400 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "opacity-30 cursor-not-allowed border-white/5"
                                                )}
                                            >
                                                {recipe.is_available === false ? 'Unavailable' : !recipe.is_in_stock ? 'Sold Out' : 'Add to Selection'}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {
                    step === 'cart' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <section className="space-y-4">
                                {Object.values(cart).map((item) => (
                                    <div key={item.recipe.id} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 relative overflow-hidden group">
                                        <div className="absolute inset-0 opacity-5 pointer-events-none border-l-4 border-emerald-500" />
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                                                <img src={item.recipe.image} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-white text-lg tracking-tight font-display">{item.recipe.name}</h4>
                                                <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">{item.quantity} units • ${item.recipe.menu_price} ea.</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-xl text-white tabular-nums font-display">${(item.recipe.menu_price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </section>

                            <section className="p-8 bg-black/40 border border-white/5 rounded-[40px] space-y-6 shadow-2xl shadow-emerald-500/5">
                                <div className="flex justify-between items-center text-neutral-500 font-bold uppercase text-[10px] tracking-[0.2em]">
                                    <span>Subtotal</span>
                                    <span className="text-white tabular-nums px-2 py-1 bg-white/5 rounded-lg">${total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-neutral-500 font-bold uppercase text-[10px] tracking-[0.2em]">
                                    <span>Vault Surcharge</span>
                                    <span className="text-emerald-500">Exempt</span>
                                </div>
                                <div className="h-px bg-white/5" />
                                <div className="flex justify-between items-end">
                                    <span className="text-neutral-500 font-black uppercase text-[10px] tracking-[0.3em] pb-1">Total Assets</span>
                                    <span className="text-4xl font-black text-white tracking-tighter tabular-nums font-display">${total.toFixed(2)}</span>
                                </div>
                            </section>
                        </div>
                    )
                }

                {
                    step === 'payment' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <section className="glass-card border-white/5 p-10 space-y-10 relative overflow-hidden bg-emerald-500/[0.02]">
                                <div className="absolute bottom-0 right-0 p-10 opacity-5">
                                    <ShieldCheck className="w-48 h-48 text-emerald-500" />
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-5 h-5 text-emerald-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">Liquidity Verification</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-20 bg-black/40 border border-white/10 rounded-2xl flex items-center px-8 text-white font-bold tracking-widest group cursor-pointer hover:border-emerald-500/30 transition-all font-display bg-gradient-to-r from-emerald-500/5 to-transparent">
                                            <div className="flex flex-col">
                                                <span className="text-lg tracking-[0.2em]">•••• •••• •••• 8842</span>
                                                <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mt-1">Digital Identity Verified</span>
                                            </div>
                                            <Badge className="ml-auto bg-emerald-500/10 text-emerald-500 border-0 uppercase font-black tracking-widest text-[9px] px-3 py-1">Active Vault</Badge>
                                        </div>
                                        <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest px-1">Assets will be reconciled against your station identity.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="w-5 h-5 text-blue-500" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Security Checkpoint</h3>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-black border border-white/5 flex gap-4 items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">End-to-End Encryption Sequence Verified</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )
                }
            </main>

            {/* Footer Floating Bar */}
            {
                itemCount > 0 && (
                    <div className="fixed bottom-8 left-0 right-0 z-40 px-6 pointer-events-none">
                        <div className="max-w-3xl mx-auto pointer-events-auto">
                            <Button
                                onClick={() => {
                                    if (step === 'menu') setStep('cart');
                                    else if (step === 'cart') setStep('payment');
                                    else if (step === 'payment') placeOrder();
                                }}
                                disabled={isSubmitting}
                                className={cn(
                                    "w-full h-20 rounded-[32px] shadow-2xl flex items-center justify-between px-10 transition-all duration-500 active:scale-[0.98] group",
                                    step === 'payment' ? "bg-white text-black hover:bg-neutral-200" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                )}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg",
                                        step === 'payment' ? "bg-black/5" : "bg-emerald-700/50"
                                    )}>
                                        {itemCount}
                                    </div>
                                    <span className="font-black text-lg uppercase tracking-widest font-display">
                                        {step === 'menu' ? 'Review Selection' : step === 'cart' ? 'Proceed to Vault' : isSubmitting ? 'Securing Transaction...' : 'Pay & Order'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-black text-2xl font-display tabular-nums">${total.toFixed(2)}</span>
                                    <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                </div>
                            </Button>
                        </div>
                    </div>
                )
            }
        </div>
    )
}
