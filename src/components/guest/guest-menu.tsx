'use client'
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Minus, ShoppingBag, Clock, ArrowLeft, CheckCircle2, LogOut, ChefHat } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { isRecipeInStock } from '@/lib/calculations'
import { cn } from '@/lib/utils'

import { POSOrder, POSOrderItem } from '@/lib/types/pos'
import { Recipe, RecipeItemWithIngredient } from '@/lib/types/database'

interface ExtendedRecipe extends Recipe {
    image: string
    category: string
    is_in_stock: boolean
    max_servings: number
}

interface GuestPortalProps {
    recipes: Recipe[]
    room: string
    hotelId: string
    locationId?: string
    locationType?: 'table' | 'room'
    isPreview?: boolean
}

type MenuStep = 'menu' | 'cart' | 'payment' | 'success' | 'tracking' | 'receipt'

import { ASSET_IMAGES } from './menu-data'

export function GuestMenu({ recipes: initialRecipes, room, hotelId, locationId, locationType, isPreview = false }: GuestPortalProps) {
    const router = useRouter()
    const supabase = createClient()
    const [cart, setCart] = useState<Record<string, { recipe: ExtendedRecipe; quantity: number }>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [step, setStep] = useState<MenuStep>('menu')
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [activeOrders, setActiveOrders] = useState<POSOrder[]>([])
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [guestName, setGuestName] = useState<string>('')
    const [unlockedPins, setUnlockedPins] = useState<Set<string>>(new Set())
    const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<POSOrder | null>(null)
    const [lastTrackingPin, setLastTrackingPin] = useState<string | null>(null)

    // Handle deep-linking via PIN parameter
    useEffect(() => {
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        const pin = params.get('pin')

        if (pin && pin.length === 4 && activeOrders.length === 0) {
            const syncFromUrl = async () => {
                const { data } = await supabase
                    .from('orders')
                    .select('*, order_items(*, recipe:recipes(name))')
                    .eq('location_id', locationId)
                    .eq('tracking_pin', pin)
                    .neq('preparation_status', 'delivered')
                    .order('created_at', { ascending: false });

                if (data && data.length > 0) {
                    setActiveOrders(data);
                    localStorage.setItem('guest_session_id', data[0].guest_session_id);
                    setSessionId(data[0].guest_session_id);
                    setStep('tracking');
                    toast.success('Sequence Synchronized');
                }
            };
            syncFromUrl();
        }
    }, [locationId, supabase, activeOrders.length])

    // Handle Session and Name initialization
    useEffect(() => {
        if (typeof window === 'undefined') return

        // Handle Session ID
        let id = localStorage.getItem('guest_session_id')
        if (!id) {
            id = crypto.randomUUID()
            localStorage.setItem('guest_session_id', id)
        }
        setSessionId(id)

        // Handle Guest Name
        const name = localStorage.getItem('guest_name')
        if (name) setGuestName(name)

        // Handle Unlocked PINs
        const stored = localStorage.getItem('unlocked_pins')
        if (stored) {
            try {
                setUnlockedPins(new Set(JSON.parse(stored)))
            } catch {
                console.error("Failed to parse unlocked pins")
            }
        }
    }, [])



    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('menu-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => router.refresh())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => router.refresh())
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase, router])

    // Subscription for active orders
    useEffect(() => {
        if (!locationId || isPreview || !sessionId) return

        const fetchOrders = async () => {
            const { data } = await supabase
                .from('orders')
                .select('*, order_items(*, recipe:recipes(name))')
                .eq('location_id', locationId)
                .or(`guest_session_id.eq.${sessionId},tracking_pin.eq.${sessionId}`)
                .neq('preparation_status', 'delivered')
                .neq('preparation_status', 'cancelled')
                .order('created_at', { ascending: false })

            if (data) setActiveOrders(data)
        }

        fetchOrders()

        const channel = supabase
            .channel(`location-orders-${locationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `location_id=eq.${locationId}`
            }, () => {
                fetchOrders();
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [locationId, supabase, isPreview, sessionId])

    const recipes = (initialRecipes
        .map(r => ({
            ...r,
            image: r.image_url || ASSET_IMAGES.main,
            category: r.category || 'other',
            is_in_stock: isRecipeInStock(r.recipe_items || []),
            max_servings: (r.recipe_items && r.recipe_items.length > 0)
                ? Math.min(...r.recipe_items.map((item: RecipeItemWithIngredient) =>
                    item.ingredient?.current_stock
                        ? Math.floor(item.ingredient.current_stock / (item.quantity_needed || 1))
                        : 999
                ))
                : 999
        })) as ExtendedRecipe[]
    ).filter(() => true)

    const categories = ['all', ...Array.from(new Set(recipes.map(r => r.category || 'other')))]



    const addToCart = (recipe: ExtendedRecipe) => {
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
        toast.success(`Added ${recipe.name}`)
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

    const deleteFromCart = (id: string) => {
        setCart(prev => {
            const newCart = { ...prev }
            delete newCart[id]
            return newCart
        })
        toast.success('Item removed')
    }

    const total = Object.values(cart).reduce((acc, item) => acc + (item.recipe.menu_price * item.quantity), 0)
    const itemCount = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0)

    const placeOrder = async () => {
        setIsSubmitting(true)
        try {
            const pin = Math.floor(1000 + Math.random() * 9000).toString()

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: hotelId,
                    location_id: locationId,
                    table_or_room: room,
                    guest_name: guestName,
                    type: locationType === 'room' ? 'room_service' : 'dine_in',
                    source: 'guest',
                    status: 'paid', // Simulating immediate payment
                    preparation_status: 'received',
                    total_amount: total,
                    guest_session_id: sessionId,
                    tracking_pin: pin
                })
                .select()
                .single()

            if (orderError) throw new Error(orderError.message)

            const items = Object.values(cart).map(item => ({
                order_id: order.id,
                recipe_id: typeof item.recipe.id === 'string' && item.recipe.id.length < 5 ? null : item.recipe.id,
                quantity: item.quantity,
                unit_price: item.recipe.menu_price,
                recipe_name: item.recipe.name
            }))

            const { error: itemError } = await supabase.from('order_items').insert(items)
            if (itemError) throw new Error(itemError.message)

            if (locationId) {
                await supabase.from('locations').update({ status: 'occupied' }).eq('id', locationId)
            }

            // Auto-unlock the newly placed order
            setLastTrackingPin(pin)
            const newUnlocked = new Set(unlockedPins)
            newUnlocked.add(pin)
            setUnlockedPins(newUnlocked)
            localStorage.setItem('unlocked_pins', JSON.stringify(Array.from(newUnlocked)))

            // Prepare order object for immediate receipt display
            const orderWithItems = { ...order, order_items: items.map(i => ({ ...i, recipe: { name: i.recipe_name } })) }
            setActiveOrders(prev => [orderWithItems, ...prev])
            setSelectedOrderForReceipt(orderWithItems)
            setStep('success')
            setCart({}) // Clear cart
            toast.success('Order Placed Successfully')
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- Sub-components for Cleaner Render ---

    const HeroSection = () => (
        <div className="relative h-[22vh] min-h-[160px] w-full overflow-hidden">
            <div className="absolute inset-0 z-0">
                <img
                    src={ASSET_IMAGES.hero || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1920&q=80"}
                    alt="Restaurant Ambiance"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 z-10">
                <div className="max-w-7xl mx-auto flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-primary/20 text-foreground border-primary/30 backdrop-blur-md uppercase tracking-widest text-[9px] font-bold px-2 py-0.5">
                                {locationType === 'room' ? 'In-Room Dining' : 'Menu'}
                            </Badge>
                            <Badge variant="secondary" className="bg-primary text-primary-foreground uppercase tracking-widest text-[9px] font-bold px-2 py-0.5">
                                Open
                            </Badge>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-foreground font-display uppercase tracking-tight">
                            Room {room}
                        </h1>
                    </div>
                </div>
            </div>
        </div>
    )

    const TrackingCard = ({ order }: { order: POSOrder }) => (
        <Card className="bg-card/60 border-primary/15 backdrop-blur-md overflow-hidden group hover:border-primary/25 transition-all">
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">Order #{order.id.slice(0, 4)}</p>
                        <Badge className={cn(
                            "text-[9px] font-black tracking-widest uppercase border-0",
                            order.preparation_status === 'received' ? "bg-blue-500/20 text-blue-400" :
                                order.preparation_status === 'preparing' ? "bg-amber-500/20 text-amber-400" :
                                    order.preparation_status === 'ready' ? "bg-primary/20 text-primary animate-pulse" :
                                        "bg-muted text-muted-foreground"
                        )}>
                            {order.preparation_status}
                        </Badge>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold text-foreground">${order.total_amount.toFixed(2)}</span>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    {order.order_items?.map((item: POSOrderItem, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs items-center">
                            <span className="text-foreground/80 font-medium">
                                <span className="text-primary font-bold mr-2">{item.quantity}x</span>
                                {item.recipe?.name || item.recipe_name}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-primary/10 h-1 rounded-full overflow-hidden mb-4">
                    <div className={cn(
                        "h-full transition-all duration-1000 ease-out",
                        order.preparation_status === 'received' ? "w-1/4 bg-blue-500" :
                            order.preparation_status === 'preparing' ? "w-2/4 bg-primary" :
                                order.preparation_status === 'ready' ? "w-full bg-primary" : "w-0"
                    )} />
                </div>

                <Button
                    variant="outline"
                    className="w-full border-primary/15 hover:bg-primary/10 text-[10px] uppercase font-bold tracking-widest h-8"
                    onClick={() => {
                        setSelectedOrderForReceipt(order)
                        setStep('receipt')
                    }}
                >
                    View Receipt
                </Button>
            </CardContent>
        </Card>
    )

    // --- Steps Render Logic ---

    if (step === 'receipt' && selectedOrderForReceipt) {
        // ... (Keep existing receipt logic, simplified for brevity or reused)
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-8">
                <Card className="max-w-md w-full bg-card text-foreground p-0 overflow-hidden font-mono shadow-2xl relative">
                    {/* Receipt Header */}
                    <div className="p-8 text-center border-b border-black/10 border-dashed">
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 bg-sidebar rounded-full flex items-center justify-center">
                                <ChefHat className="text-foreground w-6 h-6" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-1">Mise Kitchen</h2>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">Official Receipt</p>

                        <div className="grid grid-cols-2 gap-4 text-[10px] uppercase font-bold text-muted-foreground">
                            <div className="text-left">
                                <span className="block text-muted-foreground font-normal">Date</span>
                                {new Date(selectedOrderForReceipt.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-right">
                                <span className="block text-muted-foreground font-normal">Order #</span>
                                {selectedOrderForReceipt.id.slice(0, 8)}
                            </div>
                        </div>
                    </div>

                    {/* Receipt Items */}
                    <div className="p-8 bg-background">
                        <div className="space-y-3">
                            {selectedOrderForReceipt.order_items?.map((item: POSOrderItem, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs group">
                                    <div className="flex gap-3">
                                        <span className="font-bold">{item.quantity}x</span>
                                        <span className="uppercase text-[#333]">{item.recipe?.name || item.recipe_name}</span>
                                    </div>
                                    <span className="font-bold">${(item.quantity * item.unit_price).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-black/10 border-dashed space-y-2">
                            <div className="flex justify-between text-base font-black uppercase">
                                <span>Total</span>
                                <span>${selectedOrderForReceipt.total_amount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-sidebar text-foreground flex gap-2">
                        <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest" onClick={() => window.print()}>
                            Print
                        </Button>
                        <Button variant="outline" className="flex-1 border-white/20 text-foreground hover:bg-white/10 font-bold uppercase text-[10px] tracking-widest" onClick={() => setStep('menu')}>
                            Close
                        </Button>
                    </div>
                </Card>
            </div>
        )
    }

    if (step === 'success') {
        // ... (Keep success screen, minor style tweaks)
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
                    <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(120,93,50,0.4)]">
                        <CheckCircle2 className="w-12 h-12 text-foreground" />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black text-foreground font-display uppercase tracking-tight leading-none">
                            Order<br /><span className="text-primary">Confirmed</span>
                        </h1>
                        <p className="text-muted-foreground font-medium">
                            The kitchen has received your order for <span className="text-foreground font-bold">{room}</span>.
                        </p>
                    </div>

                    {(lastTrackingPin || activeOrders[0]?.tracking_pin) && (
                        <div className="bg-card border border-primary/15 p-6 rounded-2xl">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Order PIN</p>
                            <div className="text-5xl font-black text-foreground font-mono tracking-widest">
                                {lastTrackingPin || activeOrders[0].tracking_pin}
                            </div>
                            <p className="text-[10px] text-muted-foreground/50 mt-3">Save this PIN to track your order on any device.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Button onClick={() => setStep('menu')} className="h-12 bg-primary text-foreground hover:bg-primary/90 font-bold uppercase tracking-widest">
                            Back to Menu
                        </Button>
                        <Button onClick={() => setStep('tracking')} variant="outline" className="h-12 border-primary/20 text-foreground hover:bg-primary/10 font-bold uppercase tracking-widest">
                            Track Order
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // MAIN MENU RENDER
    return (
        <div className="min-h-screen bg-background text-foreground pb-32">

            {/* Top Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-primary/10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {step !== 'menu' ? (
                            <Button variant="ghost" size="icon" onClick={() => setStep('menu')} className="hover:bg-primary/10 rounded-full">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                    <ChefHat className="w-5 h-5 text-foreground" />
                                </div>
                                <span className="font-display font-bold text-lg tracking-tight hidden sm:block">Mise.</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {activeOrders.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStep('tracking')}
                                className="bg-primary/10 text-primary hover:bg-primary/20 font-bold uppercase text-[10px] tracking-widest"
                            >
                                <Clock className="w-3 h-3 mr-2" />
                                Tracking ({activeOrders.length})
                            </Button>
                        )}
                        {!isPreview && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    if (confirm('Exit guest session?')) {
                                        localStorage.removeItem('guest_session_id');
                                        router.push('/');
                                    }
                                }}
                                className="hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                            >
                                <LogOut className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Scrollable Content */}
            <main className="pt-16">
                {step === 'menu' && (
                    <>
                        <HeroSection />

                        {/* Sticky Category Header */}
                        <div className="sticky top-16 z-40 bg-background/90 backdrop-blur-md border-b border-primary/10 py-4 overflow-x-auto no-scrollbar">
                            <div className="max-w-7xl mx-auto px-4 flex gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={cn(
                                            "px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all",
                                            activeCategory === cat
                                                ? "bg-primary text-foreground shadow-lg shadow-primary/20"
                                                : "bg-primary/5 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Menu Grid */}
                        <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
                            {/* Category Groups */}
                            {(() => {
                                const sortOrder = ['starters', 'mains', 'desserts', 'drinks', 'other']
                                const categoriesToShow = activeCategory === 'all'
                                    ? Array.from(new Set(recipes.map(r => r.category || 'other'))).sort((a, b) => {
                                        const idxA = sortOrder.indexOf(a)
                                        const idxB = sortOrder.indexOf(b)
                                        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
                                    })
                                    : [activeCategory]

                                return categoriesToShow.map(cat => {
                                    const catRecipes = recipes.filter(r => (r.category || 'other') === cat)
                                    if (catRecipes.length === 0) return null

                                    return (
                                        <div key={cat} className="animate-in fade-in duration-500">
                                            <div className="flex items-center gap-3 mb-4 px-1">
                                                <h2 className="text-lg font-bold font-display text-foreground uppercase tracking-wide">{cat}</h2>
                                                <div className="h-px bg-border flex-1" />
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{catRecipes.length}</span>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                {catRecipes.map(recipe => (
                                                    <div key={recipe.id} className={cn(
                                                        "group bg-card rounded-xl overflow-hidden border border-border/50 hover:border-primary/20 transition-all duration-200",
                                                        !recipe.is_in_stock && "opacity-50"
                                                    )}>
                                                        {/* Image */}
                                                        <div className="relative aspect-[4/3] overflow-hidden">
                                                            <img
                                                                src={recipe.image}
                                                                alt={recipe.name}
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                            />
                                                            {!recipe.is_in_stock && (
                                                                <div className="absolute inset-0 bg-background/60 flex items-center justify-center backdrop-blur-sm">
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sold Out</span>
                                                                </div>
                                                            )}
                                                            <div className="absolute top-2 right-2">
                                                                <span className="bg-background/80 backdrop-blur-sm text-xs font-bold text-foreground px-2 py-1 rounded-md">
                                                                    ${recipe.menu_price.toFixed(0)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Info */}
                                                        <div className="p-3">
                                                            <h3 className="text-sm font-semibold text-foreground leading-tight mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                                                                {recipe.name}
                                                            </h3>
                                                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mb-2.5">
                                                                {recipe.description || "Seasonal ingredients, chef's preparation."}
                                                            </p>
                                                            <button
                                                                onClick={() => addToCart(recipe)}
                                                                disabled={!recipe.is_in_stock}
                                                                className={cn(
                                                                    "w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                                                    recipe.is_in_stock
                                                                        ? "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground active:scale-[0.97]"
                                                                        : "bg-muted text-muted-foreground cursor-not-allowed"
                                                                )}
                                                            >
                                                                {cart[recipe.id] ? (
                                                                    <>
                                                                        <span className="bg-primary text-primary-foreground w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black">{cart[recipe.id].quantity}</span>
                                                                        Added
                                                                    </>
                                                                ) : (
                                                                    <>Add <Plus className="w-3 h-3" /></>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })
                            })()}
                        </div>
                    </>
                )}

                {step === 'tracking' && (
                    <div className="max-w-3xl mx-auto px-4 py-12">
                        <h2 className="text-3xl font-black font-display text-foreground uppercase tracking-tight mb-8">Active Missions</h2>
                        {activeOrders.length > 0 ? (
                            <div className="space-y-6">
                                {activeOrders.map(order => (
                                    <TrackingCard key={order.id} order={order} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 border border-primary/10 rounded-3xl bg-primary/5">
                                <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium">No active orders found.</p>
                                <Button onClick={() => setStep('menu')} variant="link" className="text-primary">Place an order</Button>
                            </div>
                        )}
                    </div>
                )}

                {step === 'cart' && (
                    <div className="max-w-2xl mx-auto px-4 py-12">
                        <h2 className="text-3xl font-black font-display text-foreground uppercase tracking-tight mb-8">Your Selection</h2>

                        {itemCount > 0 ? (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    {Object.values(cart).map((item) => (
                                        <Card key={item.recipe.id} className="bg-primary/5 border-primary/10 overflow-hidden">
                                            <div className="flex gap-4 p-4">
                                                <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden shrink-0">
                                                    <img src={item.recipe.image} alt={item.recipe.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-foreground truncate pr-4">{item.recipe.name}</h4>
                                                        <span className="font-bold text-foreground">${(item.recipe.menu_price * item.quantity).toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center bg-background rounded-lg border border-primary/15">
                                                            <button
                                                                onClick={() => removeFromCart(item.recipe.id)}
                                                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                                            <button
                                                                onClick={() => addToCart(item.recipe)}
                                                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => deleteFromCart(item.recipe.id)}
                                                            className="text-[10px] font-bold uppercase text-muted-foreground/50 hover:text-red-400 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>

                                <div className="space-y-4 pt-6 mt-6 border-t border-primary/15">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span>${total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Taxes & Fees (Est.)</span>
                                        <span>${(total * 0.15).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-black text-foreground pt-4 border-t border-primary/15">
                                        <span>Total</span>
                                        <span>${(total * 1.15).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-8">
                                    <Button
                                        onClick={placeOrder}
                                        disabled={isSubmitting}
                                        className="w-full h-14 bg-primary hover:bg-primary/90 text-foreground font-black uppercase tracking-widest text-lg rounded-xl transition-all shadow-lg hover:shadow-primary/30"
                                    >
                                        {isSubmitting ? 'Confirming...' : 'Place Order'}
                                    </Button>
                                    <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
                                        Secure Transaction • Mise Financial Layer
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                <p className="text-muted-foreground/50 mb-6">Your cart is empty.</p>
                                <Button onClick={() => setStep('menu')} variant="outline" className="border-primary/15 text-foreground">Browse Menu</Button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Sticky Bottom Cart Bar */}
            {step === 'menu' && itemCount > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <button
                        onClick={() => setStep('cart')}
                        className="w-full bg-primary hover:bg-primary/90 text-foreground p-1 rounded-full shadow-[0_10px_40px_rgba(120,93,50,0.3)] transition-all group"
                    >
                        <div className="flex items-center justify-between bg-background/20 rounded-full px-6 py-3">
                            <div className="flex items-center gap-3">
                                <div className="bg-background text-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                                    {itemCount}
                                </div>
                                <span className="font-bold text-sm uppercase tracking-wide opacity-80 group-hover:opacity-100">View Active Order</span>
                            </div>
                            <span className="font-black text-lg group-hover:scale-105 transition-transform">
                                ${total.toFixed(2)}
                            </span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    )
}
