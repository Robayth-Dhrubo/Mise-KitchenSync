'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Calendar, Clock, Search, Plus, Users,
    CheckCircle2, XCircle, UtensilsCrossed, ArrowRight, Table
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Reservation, Location, Recipe } from '@/lib/types/pos'

export default function ReservationsView() {
    const [supabase] = useState(() => createClient())
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [recipes, setRecipes] = useState<Recipe[]>([])
    const [recipeIngredients, setRecipeIngredients] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming')
    const [searchQuery, setSearchQuery] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedRecipes, setSelectedRecipes] = useState<{ id: string, name: string, quantity: number }[]>([])
    const [menuSearch, setMenuSearch] = useState('')

    // New Reservation State
    const [newRes, setNewRes] = useState({
        guest_name: '',
        guest_count: 2,
        reservation_time: '',
        location_id: '',
        notes: ''
    })

    const fetchData = useCallback(async () => {
        // setIsLoading(true)

        // Fetch Reservations
        let query = supabase
            .from('reservations')
            .select('*, location:locations(*)')
            .order('reservation_time', { ascending: filter === 'upcoming' })

        if (filter === 'upcoming') {
            query = query.gte('reservation_time', new Date().toISOString())
        } else if (filter === 'past') {
            query = query.lt('reservation_time', new Date().toISOString())
        }

        const { data: resData } = await query

        if (resData) {
            // Client-side filter for 'cancelled' status if needed, or refine query
            // Assuming 'cancelled' is a status, we might want to fetch all and filter in memory or refine the query further
            let filtered = resData as Reservation[]
            if (filter === 'cancelled') {
                filtered = filtered.filter(r => r.status === 'cancelled')
            } else {
                filtered = filtered.filter(r => r.status !== 'cancelled')
            }
            setReservations(filtered)
        }

        // Fetch Locations for Selector
        const { data: locData } = await supabase
            .from('locations')
            .select('*')
            .neq('type', 'wall')
            .neq('type', 'obstacle')
            .order('name')

        if (locData) setLocations(locData)

        // Fetch Recipes for Mini Menu
        const { data: recipeData } = await supabase
            .from('recipes')
            .select('*')
            .eq('is_available', true)
            .order('name')

        if (recipeData) setRecipes(recipeData)

        // Fetch Recipe Ingredients for Forecast
        const { data: ingData } = await supabase
            .from('recipe_items')
            .select('*, ingredient:ingredients(id, name, purchase_unit)')

        if (ingData) setRecipeIngredients(ingData)

        setIsLoading(false)
    }, [supabase, filter])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchData()
    }, [fetchData])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error('Authentication error')
            setIsSubmitting(false)
            return
        }

        if (!newRes.location_id) {
            toast.error('Please select a table')
            setIsSubmitting(false)
            return
        }

        // Append pre-orders to notes
        let finalNotes = newRes.notes
        if (selectedRecipes.length > 0) {
            const preOrderText = `Pre-orders: ${selectedRecipes.map(r => `${r.quantity}x ${r.name}`).join(', ')}`
            finalNotes = finalNotes ? `${finalNotes}\n${preOrderText}` : preOrderText
        }

        const { error } = await supabase
            .from('reservations')
            .insert({
                ...newRes,
                notes: finalNotes,
                user_id: user.id,
                status: 'confirmed'
            })

        if (error) {
            console.error(error)
            toast.error('Failed to create reservation')
        } else {
            toast.success('Reservation confirmed')
            setIsCreateOpen(false)
            setNewRes({
                guest_name: '',
                guest_count: 2,
                reservation_time: '',
                location_id: '',
                notes: ''
            })
            setSelectedRecipes([])
            fetchData()
        }
        setIsSubmitting(false)
    }

    const updateStatus = async (id: string, status: 'seated' | 'cancelled') => {
        const { error } = await supabase
            .from('reservations')
            .update({ status })
            .eq('id', id)

        if (error) {
            toast.error('Update failed')
        } else {
            toast.success(`Reservation ${status}`)
            fetchData()
        }
    }

    const filteredReservations = reservations.filter(r =>
        r.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location?.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-sidebar/20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-4 lg:px-8 pt-4 lg:pt-8 mb-4 lg:mb-6">
                <div>
                    <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">Reservations</h1>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Manage Bookings & Seating</p>
                </div>
                <div className="flex items-center gap-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="h-12 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-foreground font-black uppercase tracking-widest gap-2 shadow-lg shadow-amber-900/20">
                                <UtensilsCrossed className="w-4 h-4" /> Chef Prep
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-white/10 sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight">Kitchen Prep Report</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 pt-4">
                                <Tabs defaultValue="prep" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 bg-secondary">
                                        <TabsTrigger value="prep">Prep List</TabsTrigger>
                                        <TabsTrigger value="inventory">Inventory Forecast</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="prep" className="space-y-4 pt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                                                <span className="text-3xl font-black text-foreground">{reservations.filter(r => new Date(r.reservation_time) > new Date()).length}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Bookings</span>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center">
                                                <span className="text-3xl font-black text-foreground">
                                                    {reservations
                                                        .filter(r => new Date(r.reservation_time) > new Date())
                                                        .reduce((sum, r) => sum + r.guest_count, 0)}
                                                </span>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Expected Covers</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-white/10 pb-2">Pre-order Details</h3>
                                            {(() => {
                                                const preOrderDetails: Record<string, { count: number, who: string[] }> = {}
                                                reservations
                                                    .filter(r => new Date(r.reservation_time) > new Date())
                                                    .forEach(r => {
                                                        if (!r.notes) return
                                                        const match = r.notes.match(/Pre-orders: (.*)/)
                                                        if (match && match[1]) {
                                                            const items = match[1].split(', ')
                                                            items.forEach(item => {
                                                                const parts = item.trim().split('x ')
                                                                const qty = parseInt(parts[0]) || 1
                                                                const name = parts[1] || item.trim()

                                                                if (!preOrderDetails[name]) {
                                                                    preOrderDetails[name] = { count: 0, who: [] }
                                                                }
                                                                preOrderDetails[name].count += qty
                                                                preOrderDetails[name].who.push(`${r.guest_name} (T${r.location?.name || '?'})`)
                                                            })
                                                        }
                                                    })

                                                const items = Object.entries(preOrderDetails).sort((a, b) => b[1].count - a[1].count)

                                                if (items.length === 0) return <div className="text-muted-foreground text-sm italic">No active pre-orders.</div>

                                                return (
                                                    <div className="space-y-2">
                                                        {items.map(([name, data]) => (
                                                            <div key={name} className="flex flex-col p-3 rounded-xl bg-white/5 border border-white/5">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-sm font-bold text-foreground uppercase">{name}</span>
                                                                    <Badge className="bg-primary/20 text-primary border-0 text-xs font-black h-6">{data.count}</Badge>
                                                                </div>
                                                                <div className="text-[10px] text-muted-foreground border-t border-white/5 pt-2 mt-1">
                                                                    <span className="uppercase font-bold text-muted-foreground">For: </span>
                                                                    {data.who.slice(0, 3).join(', ')}
                                                                    {data.who.length > 3 && ` +${data.who.length - 3} more`}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="inventory" className="space-y-4 pt-4">
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-white/10 pb-2">Estimated Stock Needed</h3>
                                            {(() => {
                                                const inventoryNeeds: Record<string, { qty: number, unit: string }> = {}

                                                // 1. Calculate Total Recipes Needed
                                                const recipeNeeds: Record<string, number> = {}
                                                reservations
                                                    .filter(r => new Date(r.reservation_time) > new Date())
                                                    .forEach(r => {
                                                        if (!r.notes) return
                                                        const match = r.notes.match(/Pre-orders: (.*)/)
                                                        if (match && match[1]) {
                                                            const items = match[1].split(', ')
                                                            items.forEach(item => {
                                                                const parts = item.trim().split('x ')
                                                                const qty = parseInt(parts[0]) || 1
                                                                const name = parts[1] || item.trim()
                                                                recipeNeeds[name] = (recipeNeeds[name] || 0) + qty
                                                            })
                                                        }
                                                    })

                                                // 2. Map to Ingredients
                                                Object.entries(recipeNeeds).forEach(([recipeName, count]) => {
                                                    const recipe = recipes.find(r => r.name.toLowerCase() === recipeName.toLowerCase())
                                                    if (recipe) {
                                                        const ingredients = recipeIngredients.filter(ri => ri.recipe_id === recipe.id)
                                                        ingredients.forEach(ri => {
                                                            const ingName = ri.ingredient?.name || 'Unknown'
                                                            const totalQty = ri.quantity_needed * count
                                                            // Naive unit aggregation
                                                            if (!inventoryNeeds[ingName]) {
                                                                inventoryNeeds[ingName] = { qty: 0, unit: ri.unit_used }
                                                            }
                                                            inventoryNeeds[ingName].qty += totalQty
                                                        })
                                                    }
                                                })

                                                const sorted = Object.entries(inventoryNeeds).sort((a, b) => b[1].qty - a[1].qty)

                                                if (sorted.length === 0) return <div className="text-muted-foreground text-sm italic">No inventory data available. Ensure recipes are linked to ingredients.</div>

                                                return (
                                                    <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                                                        {sorted.map(([name, data]) => (
                                                            <div key={name} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                                                                <span className="text-sm font-bold text-gray-300 group-hover:text-foreground capitalize">{name}</span>
                                                                <span className="font-mono text-primary text-xs font-bold bg-[#5A4820]/20 px-2 py-1 rounded">
                                                                    {data.qty.toFixed(1)} {data.unit}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-12 px-6 rounded-xl bg-primary hover:bg-primary text-foreground font-black uppercase tracking-widest gap-2 shadow-lg shadow-[#5A4820]/20">
                                <Plus className="w-4 h-4" /> New Reservation
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-white/10 sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight">Create Reservation</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Guest Name</label>
                                    <Input
                                        required
                                        className="bg-white/5 border-white/10 text-foreground font-bold"
                                        placeholder="e.g. John Doe"
                                        value={newRes.guest_name}
                                        onChange={e => setNewRes({ ...newRes, guest_name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date & Time</label>
                                        <Input
                                            required
                                            type="datetime-local"
                                            className="bg-white/5 border-white/10 text-foreground font-bold [color-scheme:dark]"
                                            value={newRes.reservation_time}
                                            onChange={e => setNewRes({ ...newRes, reservation_time: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Party Size</label>
                                        <Input
                                            required
                                            type="number"
                                            min="1"
                                            className="bg-white/5 border-white/10 text-foreground font-bold"
                                            value={newRes.guest_count}
                                            onChange={e => setNewRes({ ...newRes, guest_count: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Table Assignment</label>
                                    <Select
                                        value={newRes.location_id}
                                        onValueChange={val => setNewRes({ ...newRes, location_id: val })}
                                    >
                                        <SelectTrigger className="bg-white/5 border-white/10 text-foreground font-bold h-10">
                                            <SelectValue placeholder="Select Table" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-white/10 text-foreground">
                                            {locations.map(loc => (
                                                <SelectItem key={loc.id} value={loc.id} className="focus:bg-white/10 focus:text-foreground">
                                                    {loc.name} ({loc.type}) - Cap: {loc.capacity}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dietary / Food Requests</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground font-bold outline-none focus:border-primary transition-colors resize-none h-20"
                                        placeholder="e.g. Allergies, special occasions, pre-orders..."
                                        value={newRes.notes}
                                        onChange={e => setNewRes({ ...newRes, notes: e.target.value })}
                                    />
                                </div>

                                {/* Mini Menu / Quiz Add */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pre-order Menu Items</label>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                            <Input
                                                className="h-8 pl-8 bg-sidebar/40 border-white/10 text-[10px] font-bold text-foreground placeholder:text-muted-foreground rounded-lg"
                                                placeholder="QUICK ADD DISH..."
                                                value={menuSearch}
                                                onChange={e => setMenuSearch(e.target.value)}
                                            />
                                        </div>

                                        {/* Recipe Results */}
                                        {menuSearch && (
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                                {recipes.filter(r => r.name.toLowerCase().includes(menuSearch.toLowerCase())).map(recipe => (
                                                    <button
                                                        type="button"
                                                        key={recipe.id}
                                                        onClick={() => {
                                                            setSelectedRecipes(prev => {
                                                                const existing = prev.find(p => p.id === recipe.id)
                                                                if (existing) {
                                                                    return prev.map(p => p.id === recipe.id ? { ...p, quantity: p.quantity + 1 } : p)
                                                                }
                                                                return [...prev, { id: recipe.id, name: recipe.name, quantity: 1 }]
                                                            })
                                                            setMenuSearch('')
                                                        }}
                                                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/10 text-left transition-colors group"
                                                    >
                                                        <span className="text-[10px] font-bold text-foreground uppercase">{recipe.name}</span>
                                                        <Plus className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Selected Items */}
                                        {selectedRecipes.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                                {selectedRecipes.map(item => (
                                                    <Badge key={item.id} variant="secondary" className="bg-primary/20 text-primary border-0 text-[9px] font-black uppercase gap-2 pl-2 pr-1 h-6">
                                                        {item.quantity}x {item.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedRecipes(prev => prev.filter(p => p.id !== item.id))}
                                                            className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                                                        >
                                                            <XCircle className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button disabled={isSubmitting} type="submit" className="w-full h-12 bg-white text-black hover:bg-secondary font-black uppercase tracking-widest mt-2">{isSubmitting ? 'Saving...' : 'Confirm Booking'}</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-8 px-4 lg:px-8 pb-4 lg:pb-8">
                {/* Sidebar Filters */}
                <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0 overflow-y-auto custom-scrollbar lg:pr-2">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            className="bg-white/5 border-white/5 pl-9 text-foreground placeholder:text-muted-foreground font-bold h-12 rounded-xl"
                            placeholder="SEARCH GUESTS..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {(['upcoming', 'past', 'cancelled'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "h-12 px-4 rounded-xl flex items-center justify-between transition-all",
                                filter === f ? "bg-white text-black shadow-lg" : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                            )}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest">{f}</span>
                            {filter === f && <ArrowRight className="w-4 h-4" />}
                        </button>
                    ))}
                </div>

                {/* Main List */}
                <div className="flex-1 bg-white/[0.02] rounded-3xl border border-white/5 p-6 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
                    ) : filteredReservations.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <Calendar className="w-16 h-16 mb-4 stroke-1" />
                            <p className="font-black uppercase tracking-widest text-xs">No reservations found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredReservations.map(res => (
                                <div key={res.id} className="group p-5 rounded-2xl bg-sidebar/40 border border-white/5 hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-white/5 border border-white/10 text-muted-foreground">
                                            <span className="text-xl font-black text-foreground">{format(new Date(res.reservation_time), 'dd')}</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest">{format(new Date(res.reservation_time), 'MMM')}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-foreground uppercase tracking-tight">{res.guest_name}</h3>
                                            <div className="flex items-center gap-4 mt-1">
                                                <Badge variant="outline" className="border-white/10 text-muted-foreground text-[9px] font-black uppercase tracking-widest gap-1.5 h-6">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(res.reservation_time), 'HH:mm')}
                                                </Badge>
                                                <Badge variant="outline" className="border-white/10 text-muted-foreground text-[9px] font-black uppercase tracking-widest gap-1.5 h-6">
                                                    <Users className="w-3 h-3" />
                                                    {res.guest_count} Guests
                                                </Badge>
                                                <Badge variant="outline" className="border-white/10 text-muted-foreground text-[9px] font-black uppercase tracking-widest gap-1.5 h-6">
                                                    <Table className="w-3 h-3" />
                                                    {res.location?.name || 'Unassigned'}
                                                </Badge>
                                            </div>
                                            {res.notes && (
                                                <div className="mt-3 text-xs text-muted-foreground bg-white/5 p-2 rounded-lg border border-white/5 flex items-start gap-2">
                                                    <UtensilsCrossed className="w-3 h-3 mt-0.5 text-primary" />
                                                    <span className="italic">&quot;{res.notes}&quot;</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Badge className={cn(
                                            "uppercase text-[9px] font-black tracking-widest h-8 px-3 mr-4",
                                            res.status === 'confirmed' ? "bg-primary/10 text-primary" :
                                                res.status === 'seated' ? "bg-amber-500/10 text-amber-500" :
                                                    "bg-red-500/10 text-red-500"
                                        )}>
                                            {res.status}
                                        </Badge>

                                        {res.status === 'confirmed' && (
                                            <>
                                                <Button
                                                    size="icon"
                                                    onClick={() => updateStatus(res.id, 'seated')}
                                                    className="w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-foreground transition-colors"
                                                    title="Mark Seated"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    onClick={() => updateStatus(res.id, 'cancelled')}
                                                    className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-foreground transition-colors"
                                                    title="Cancel Reservation"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
