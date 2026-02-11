'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Package, ShoppingCart, Store, Plus, Minus, Search,
    AlertTriangle, CheckCircle, Send, Truck, MapPin,
    ChevronRight, Filter, RefreshCw, Globe, ThumbsUp, ThumbsDown, Trash2, Sparkles, Scan
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { discoverLocalVendors, approveDiscoveredVendor, banDiscoveredVendor, deleteVendor, updateRestaurantLocation } from '@/app/actions/vendor-discovery'
import { VendorPriceManager } from '@/components/vendors/vendor-price-manager'
import { VendorProduct, Supplier } from '@/lib/types/database'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { InvoiceScanner } from '@/components/procurement/invoice-scanner'

// Types
interface Ingredient {
    id: string
    name: string
    category: string
    current_stock: number
    par_level: number
    purchase_unit: string
    purchase_price: number
    status?: string
}

interface OrderItem {
    ingredient_id: string
    ingredient_name: string
    qty_needed: number
    unit: string
    unit_price: number | null
    line_total: number | null
    source?: string
}

interface Vendor {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    source: string
    is_approved: boolean
    rating: number | null
    distance_km: number | null
    google_place_id?: string
}

type Tab = 'inventory' | 'orders' | 'vendors' | 'history' | 'scanner'

export default function ProcurementPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // Memoize supabase client
    const supabase = useMemo(() => createClient(), [])

    // Derived state from URL, default to 'inventory'
    const activeTab = (searchParams.get('tab') as Tab) || 'inventory'

    const updateTab = useCallback((tab: Tab) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, [searchParams, router, pathname])

    const [loading, setLoading] = useState(true)
    const [isDiscovering, setIsDiscovering] = useState(false)
    const [isOracleRunning, setIsOracleRunning] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [locationError, setLocationError] = useState(false)

    const handleRunOracle = async () => {
        setIsOracleRunning(true)
        try {
            const res = await fetch('/api/cron/oracle')
            const data = await res.json()
            if (data.success) {
                const count = data.updates ? data.updates.length : 'several'
                toast.success('The Oracle has spoken', {
                    description: `Analyzed usage history and updated par levels for ${count} items based on daily average usage.`
                })
                await fetchAllData()
            } else {
                toast.error('Oracle Error', { description: data.error })
            }
        } catch (error) {
            toast.error('Failed to contact Oracle')
        } finally {
            setIsOracleRunning(false)
        }
    }

    // Data
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [orders, setOrders] = useState<Record<string, OrderItem[]>>({})
    const [sentOrders, setSentOrders] = useState<Array<{ id: string, vendor: string, items: OrderItem[], total: number, date: string }>>([])
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [vendorProducts, setVendorProducts] = useState<VendorProduct[]>([])

    // UI State
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
    const [isCreatingIngredient, setIsCreatingIngredient] = useState(false)
    const [newIngredient, setNewIngredient] = useState({
        name: '',
        category: 'Other',
        par_level: 0,
        purchase_unit: 'unit',
        purchase_price: 0
    })
    const [manualOrderVendor, setManualOrderVendor] = useState<string | null>(null)
    const [manualOrderIngredientId, setManualOrderIngredientId] = useState<string>('')



    // Smart Search State
    const [isSmartSearchOpen, setIsSmartSearchOpen] = useState(false)
    const [smartSearchQuery, setSmartSearchQuery] = useState('')

    // Stats
    const [criticalCount, setCriticalCount] = useState(0)
    const [orderTotal, setOrderTotal] = useState(0)
    const [vendorCount, setVendorCount] = useState(0)

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'status', direction: 'asc' })

    // Helper: Get Best Vendor
    const handleApproveOrder = (vendorName: string, items: OrderItem[]) => {
        const total = items.reduce((sum, item) => sum + (item.line_total || 0), 0)
        const newPO = {
            id: `PO-${Math.floor(Math.random() * 10000)}`,
            vendor: vendorName,
            items,
            total,
            date: new Date().toLocaleDateString()
        }

        // Add to history
        setSentOrders(prev => [newPO, ...prev])

        // Remove from drafts
        setOrders(prev => {
            const next = { ...prev }
            delete next[vendorName]
            return next
        })

        // Switch to history tab to show confirmation
        updateTab('history')
    }

    const getPreferredVendor = useCallback((ingredientId: string) => {
        const products = vendorProducts.filter(vp => vp.ingredient_id === ingredientId)
        if (products.length === 0) return null
        // Prefer 'is_preferred', then lowest price
        return products.sort((a, b) => {
            if (a.is_preferred && !b.is_preferred) return -1
            if (!a.is_preferred && b.is_preferred) return 1
            return a.vendor_price - b.vendor_price
        })[0]
    }, [vendorProducts])

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const handleDeleteIngredient = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this item?')) return

        const supabase = createClient()
        const { error } = await supabase.from('ingredients').delete().eq('id', id)

        if (error) {
            alert('Failed to delete: ' + error.message)
        } else {
            fetchAllData()
        }
    }

    const handleEditIngredient = (e: React.MouseEvent, ingredient: Ingredient) => {
        e.stopPropagation()
        setNewIngredient({
            name: ingredient.name,
            category: ingredient.category || 'Other',
            par_level: ingredient.par_level,
            purchase_unit: ingredient.purchase_unit,
            purchase_price: ingredient.purchase_price
        })
        setSelectedIngredient(ingredient) // Use this to track ID
        setIsCreatingIngredient(true) // Reuse modal
    }

    useEffect(() => {
        fetchAllData()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchAllData() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        try {
            // Fetch all data in parallel
            // Fetch all data in parallel
            // First check profile role
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            const hasAuthority = ['admin', 'owner', 'chef'].includes(profile?.role || '')

            // Base queries
            let ingredientsQuery = supabase.from('ingredients').select('*').order('name')
            let vendorsQuery = supabase.from('suppliers').select('*').order('name')
            let vendorProductsQuery = supabase.from('vendor_products').select('*, ingredient:ingredients(name, purchase_unit)')

            // Apply user_id filter ONLY if not admin
            if (!hasAuthority) {
                ingredientsQuery = ingredientsQuery.eq('user_id', user.id)
                vendorsQuery = vendorsQuery.eq('user_id', user.id)
                vendorProductsQuery = vendorProductsQuery.eq('user_id', user.id)
            }

            const [ingredientsRes, ordersRes, vendorsRes, vendorProductsRes] = await Promise.all([
                ingredientsQuery,
                supabase.rpc('generate_smart_order_grouped', { p_user_id: user.id }), // RPC might need update or param ignore?
                vendorsQuery,
                vendorProductsQuery
            ])

            // Process ingredients
            const items = ingredientsRes.data || []
            setIngredients(items)
            setCriticalCount(items.filter(i => i.current_stock < i.par_level * 0.3).length)

            // Process orders
            const orderData = ordersRes.data || {}
            setOrders(orderData)
            const total = Object.values(orderData).flat().reduce((sum: number, item: any) => sum + (item.line_total || 0), 0)
            setOrderTotal(total)

            // Process vendors
            setVendors(vendorsRes.data || [])
            setVendorProducts(vendorProductsRes.data || [])

            // Only count active vendors for the badge
            setVendorCount(vendorsRes.data?.filter((v: Vendor) => v.is_approved !== false).length || 0)

        } catch (e: any) {
            console.error('Fetch error:', e)
        } finally {
            setLoading(false)
        }
    }

    const handleDiscover = async () => {
        setIsDiscovering(true)
        setLocationError(false)
        try {
            const result = await discoverLocalVendors()

            if (result.success) {
                alert(result.message)
                await fetchAllData()
            } else if (result.error === 'MISSING_LOCATION') {
                setLocationError(true)
                // Try to auto-set location if on browser
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(async (position) => {
                        const { latitude, longitude } = position.coords;
                        await updateRestaurantLocation(latitude, longitude, 'Auto-detected');
                        // Retry discovery
                        const retry = await discoverLocalVendors();
                        if (retry.success) {
                            setLocationError(false)
                            await fetchAllData()
                        } else {
                            alert("Could not discover vendors even after setting location. Please check Settings.")
                        }
                    }, (err) => {
                        alert("Please enable location services or set your restaurant address in Settings to use discovery.")
                    });
                } else {
                    alert("Location not set. Please go to Settings to set your restaurant address.")
                }
            } else {
                console.error(result.error)
                alert('Discovery failed: ' + result.error)
            }
        } catch (error: any) {
            console.error(error)
        } finally {
            setIsDiscovering(false)
        }
    }

    const handleApprove = async (id: string) => {
        const result = await approveDiscoveredVendor(id)
        if (result.success) {
            fetchAllData()
        }
    }

    const handleBan = async (id: string) => {
        const result = await banDiscoveredVendor(id) // This actually bans/deletes
        if (result.success) {
            fetchAllData()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this vendor?')) return;
        const result = await deleteVendor(id);
        if (result.success) {
            fetchAllData()
        } else {
            console.error('Full Delete Error:', result.error)
            alert('Failed to delete: ' + result.error)
        }
    }

    const handlePurge = async () => {
        if (!confirm('⚠️ DANGER: This will delete ALL vendors and unlink all shopping list items. This cannot be undone.\n\nType "DELETE" to confirm.')) return;

        // Simple confirmation for now (since prompt() might be annoying or blocked, just double confirm)
        if (!confirm('Are you ABSOLUTELY sure? This will wipe your vendor database.')) return;

        setLoading(true)
        const { resetVendors } = await import('@/app/actions/vendor-discovery')
        const result = await resetVendors()
        if (result.success) {
            alert('All vendors have been purged.')
            fetchAllData()
        } else {
            alert('Failed to purge: ' + result.error)
        }
        setLoading(false)
    }

    const handleAddSmartItem = (vendorId: string, ingredientId: string, price: number, unit: string) => {
        const vendor = vendors.find(v => v.id === vendorId)
        if (!vendor) return

        const ingredient = ingredients.find(i => i.id === ingredientId)
        const name = ingredient?.name || 'Unknown Item'

        setOrders(prev => {
            const vendorName = vendor.name
            const existingItems = prev[vendorName] || []

            // Check if already exists
            const existingIndex = existingItems.findIndex(i => i.ingredient_id === ingredientId)
            if (existingIndex >= 0) {
                // Increment
                const updatedItems = [...existingItems]
                updatedItems[existingIndex] = {
                    ...updatedItems[existingIndex],
                    qty_needed: updatedItems[existingIndex].qty_needed + 1,
                    line_total: (updatedItems[existingIndex].qty_needed + 1) * price
                }
                return { ...prev, [vendorName]: updatedItems }
            } else {
                // Add new
                const newItem: OrderItem = {
                    ingredient_id: ingredientId,
                    ingredient_name: name,
                    qty_needed: 1,
                    unit: unit,
                    unit_price: price,
                    line_total: price,
                    source: 'manual_smart'
                }
                return { ...prev, [vendorName]: [...existingItems, newItem] }
            }
        })

        setIsSmartSearchOpen(false)
        setSmartSearchQuery('')
    }

    const handleUpdateOrderQuantity = (vendorName: string, ingredientId: string, change: number) => {
        setOrders(prev => {
            const vendorItems = prev[vendorName] || []
            const updatedItems = vendorItems.map(item => {
                if (item.ingredient_id === ingredientId) {
                    const newQty = Math.max(0, item.qty_needed + change)
                    const newTotal = item.unit_price ? newQty * item.unit_price : null
                    return { ...item, qty_needed: newQty, line_total: newTotal }
                }
                return item
            }).filter(item => item.qty_needed > 0) // Remove if 0

            if (updatedItems.length === 0) {
                const newOrders = { ...prev }
                delete newOrders[vendorName]
                return newOrders
            }

            return { ...prev, [vendorName]: updatedItems }
        })
    }

    const handleRemoveOrderItem = (vendorName: string, ingredientId: string) => {
        setOrders(prev => {
            const vendorItems = prev[vendorName] || []
            const updatedItems = vendorItems.filter(item => item.ingredient_id !== ingredientId)

            if (updatedItems.length === 0) {
                const newOrders = { ...prev }
                delete newOrders[vendorName]
                return newOrders
            }

            return { ...prev, [vendorName]: updatedItems }
        })
    }

    const handleAddManualOrderItem = () => {
        if (!manualOrderVendor || !manualOrderIngredientId) return

        const ingredient = ingredients.find(i => i.id === manualOrderIngredientId)
        if (!ingredient) return

        setOrders(prev => {
            const vendor = manualOrderVendor
            const existingItems = prev[vendor] || []

            // Check if already exists
            const existingIndex = existingItems.findIndex(i => i.ingredient_id === ingredient.id)
            if (existingIndex >= 0) {
                // Increment
                const updatedItems = [...existingItems]
                updatedItems[existingIndex] = {
                    ...updatedItems[existingIndex],
                    qty_needed: updatedItems[existingIndex].qty_needed + 1,
                    line_total: (updatedItems[existingIndex].qty_needed + 1) * (updatedItems[existingIndex].unit_price || 0)
                }
                return { ...prev, [vendor]: updatedItems }
            } else {
                // Add new
                const newItem: OrderItem = {
                    ingredient_id: ingredient.id,
                    ingredient_name: ingredient.name,
                    qty_needed: 1,
                    unit: ingredient.purchase_unit,
                    unit_price: ingredient.purchase_price,
                    line_total: ingredient.purchase_price,
                    source: 'manual'
                }
                return { ...prev, [vendor]: [...existingItems, newItem] }
            }
        })

        setManualOrderVendor(null)
        setManualOrderIngredientId('')
    }

    const handleCreateIngredient = async () => {
        if (!newIngredient.name) return

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        if (selectedIngredient) {
            // Update mode
            const { error } = await supabase.from('ingredients').update({
                name: newIngredient.name,
                category: newIngredient.category,
                par_level: newIngredient.par_level,
                purchase_unit: newIngredient.purchase_unit,
                purchase_price: newIngredient.purchase_price,
            }).eq('id', selectedIngredient.id)

            if (error) {
                alert('Failed to update item: ' + error.message)
            } else {
                setIsCreatingIngredient(false)
                setSelectedIngredient(null)
                resetNewIngredient()
                fetchAllData()
            }
        } else {
            // Create mode
            const { error } = await supabase.from('ingredients').insert({
                user_id: user.id,
                name: newIngredient.name,
                category: newIngredient.category,
                par_level: newIngredient.par_level,
                purchase_unit: newIngredient.purchase_unit,
                purchase_price: newIngredient.purchase_price,
                current_stock: 0
            })

            if (error) {
                alert('Failed to create item: ' + error.message)
            } else {
                setIsCreatingIngredient(false)
                resetNewIngredient()
                fetchAllData()
            }
        }
    }

    const resetNewIngredient = () => {
        setNewIngredient({
            name: '',
            category: 'Other',
            par_level: 0,
            purchase_unit: 'unit',
            purchase_price: 0
        })
    }

    // Effect to recalc total when orders change
    useEffect(() => {
        const total = Object.values(orders).flat().reduce((sum: number, item: any) => sum + (item.line_total || 0), 0)
        setOrderTotal(total)
    }, [orders])

    // Memoized filtered data based on search
    const filteredIngredients = useMemo(() =>
        ingredients.filter(i =>
            i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.category.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [ingredients, searchQuery]
    )

    const filteredVendors = useMemo(() =>
        vendors.filter(v =>
            v.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [vendors, searchQuery]
    )

    // Group vendors - memoized
    const activeVendors = useMemo(() => filteredVendors.filter(v => v.is_approved), [filteredVendors])
    const discoveredVendors = useMemo(() => filteredVendors.filter(v => !v.is_approved && v.source === 'auto_discovered'), [filteredVendors])

    return (
        <div className="min-h-screen bg-sidebar text-foreground">
            {/* Header */}
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-8 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Package className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-foreground tracking-tight">Inventory & Orders</h1>
                                <p className="text-muted-foreground text-sm mt-1">Manage stock, suppliers, and purchase orders</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchAllData}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition"
                        >
                            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2">
                        <TabButton
                            active={activeTab === 'inventory'}
                            onClick={() => updateTab('inventory')}
                            icon={<Package className="w-4 h-4" />}
                            label="Inventory"
                            badge={criticalCount > 0 ? criticalCount : undefined}
                            badgeColor="red"
                        />
                        <TabButton
                            active={activeTab === 'orders'}
                            onClick={() => updateTab('orders')}
                            icon={<ShoppingCart className="w-4 h-4" />}
                            label="Smart Order"
                            badge={orderTotal > 0 ? `$${orderTotal.toFixed(0)}` : undefined}
                            badgeColor="emerald"
                        />
                        <TabButton
                            active={activeTab === 'vendors'}
                            onClick={() => updateTab('vendors')}
                            icon={<Store className="w-4 h-4" />}
                            label="Vendors"
                            badge={vendorCount}
                            badgeColor="blue"
                        />
                        <TabButton
                            active={activeTab === 'history'}
                            onClick={() => updateTab('history')}
                            icon={<CheckCircle className="w-4 h-4" />}
                            label="Order History"
                            badge={sentOrders.length > 0 ? sentOrders.length : undefined}
                            badgeColor="zinc"
                        />
                        <TabButton
                            active={activeTab === 'scanner'}
                            onClick={() => updateTab('scanner')}
                            icon={<Scan className="w-4 h-4" />}
                            label="Scanner"
                            badgeColor="blue"
                        />
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* SCANNER TAB */}
                        {activeTab === 'scanner' && (
                            <div className="max-w-4xl mx-auto">
                                <InvoiceScanner onInvoiceProcessed={fetchAllData} />
                            </div>
                        )}

                        {/* INVENTORY TAB */}
                        {activeTab === 'inventory' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-1 bg-primary rounded-full" />
                                        <h2 className="text-lg font-semibold">Inventory Management</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleRunOracle}
                                            disabled={isOracleRunning}
                                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg shadow-purple-900/20 disabled:opacity-50"
                                        >
                                            <Sparkles className={cn("w-4 h-4", isOracleRunning && "animate-spin")} />
                                            {isOracleRunning ? 'Consulting Oracle...' : 'Run Oracle'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                resetNewIngredient()
                                                setIsCreatingIngredient(true)
                                            }}
                                            className="flex items-center gap-2 bg-primary hover:bg-primary text-foreground px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg shadow-[#5A4820]/20"
                                        >
                                            <Plus className="w-4 h-4" />
                                            New Item
                                        </button>
                                    </div>
                                </div>

                                {filteredIngredients.length === 0 ? (
                                    <EmptyState icon={Package} message="No ingredients found" />
                                ) : (
                                    <div className="rounded-xl border border-border bg-card/50 overflow-hidden backdrop-blur-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm min-w-[800px]">
                                                <thead>
                                                    <tr className="border-b border-border bg-card/50 text-muted-foreground">
                                                        <th className="px-6 py-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('name')}>
                                                            <div className="flex items-center gap-1">
                                                                Item Name
                                                                {sortConfig.key === 'name' && (
                                                                    <span className="text-primary text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4 font-medium">Preferred Vendor</th>
                                                        <th className="px-6 py-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('category')}>
                                                            <div className="flex items-center gap-1">
                                                                Category
                                                                {sortConfig.key === 'category' && (
                                                                    <span className="text-primary text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4 font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('status')}>
                                                            <div className="flex items-center gap-1">
                                                                Status
                                                                {sortConfig.key === 'status' && (
                                                                    <span className="text-primary text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4 font-medium w-1/4 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('current_stock')}>
                                                            <div className="flex items-center gap-1">
                                                                Stock Level
                                                                {sortConfig.key === 'current_stock' && (
                                                                    <span className="text-primary text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('purchase_price')}>
                                                            <div className="flex items-center justify-end gap-1">
                                                                Est. Price
                                                                {sortConfig.key === 'purchase_price' && (
                                                                    <span className="text-primary text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th className="px-6 py-4 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#333]">
                                                    {filteredIngredients
                                                        .sort((a, b) => {
                                                            // Custom sort for Status (derived from stock pct)
                                                            if (sortConfig.key === 'status') {
                                                                const getRatio = (i: Ingredient) => i.par_level > 0 ? (i.current_stock / i.par_level) : 1
                                                                const aRatio = getRatio(a)
                                                                const bRatio = getRatio(b)
                                                                // Lower ratio = Higher Urgency. Ascending sort should show Critical first?
                                                                // Usually Ascending = 0 -> 1. So lowest ratio (critical) comes first.
                                                                const comparison = aRatio - bRatio
                                                                return sortConfig.direction === 'asc' ? comparison : -comparison
                                                            }

                                                            const aVal = a[sortConfig.key as keyof Ingredient]
                                                            const bVal = b[sortConfig.key as keyof Ingredient]
                                                            if (aVal === bVal) return 0
                                                            if (aVal === null || aVal === undefined) return 1
                                                            if (bVal === null || bVal === undefined) return -1
                                                            const comparison = aVal > bVal ? 1 : -1
                                                            return sortConfig.direction === 'asc' ? comparison : -comparison
                                                        })
                                                        .map(item => {
                                                            const stockPct = (item.current_stock / item.par_level) * 100
                                                            const isCritical = stockPct < 30
                                                            const isWarning = stockPct >= 30 && stockPct < 60
                                                            const vendor = getPreferredVendor(item.id)

                                                            return (
                                                                <tr
                                                                    key={item.id}
                                                                    className="group hover:bg-secondary/50 transition-colors"
                                                                >
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-medium text-foreground">
                                                                            {item.name}
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {item.purchase_unit}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {vendor ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-2 h-2 rounded-full bg-primary" title="Auto-Matched" />
                                                                                <span className="text-foreground">{vendor.supplier?.name || 'Unknown'}</span>
                                                                                {vendor.is_preferred && (
                                                                                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30">Pref</span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-muted-foreground text-xs">No vendor linked</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">
                                                                            {item.category}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {isCritical ? (
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                                                                                <AlertTriangle className="w-3 h-3" />
                                                                                Critical
                                                                            </span>
                                                                        ) : isWarning ? (
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                                                                Low
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                                                                Healthy
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={cn(
                                                                                        "h-full rounded-full transition-all duration-500",
                                                                                        isCritical ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-primary"
                                                                                    )}
                                                                                    style={{ width: `${Math.min(stockPct, 100)}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className="text-xs font-mono text-muted-foreground w-16 text-right">
                                                                                {item.current_stock} / {item.par_level}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="font-mono text-foreground">
                                                                            ${item.purchase_price?.toFixed(2) || '0.00'}
                                                                        </div>
                                                                        {vendor?.scrape_status === 'success' && (
                                                                            <div className="text-[10px] text-primary flex items-center justify-end gap-1 mt-0.5">
                                                                                <Globe className="w-3 h-3" />
                                                                                Live Price
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={(e) => handleEditIngredient(e, item)}
                                                                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
                                                                                title="Edit Item"
                                                                            >
                                                                                <Pencil className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => handleDeleteIngredient(e, item.id)}
                                                                                className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-900/20 rounded-lg transition"
                                                                                title="Delete Item"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ORDERS TAB */}
                        {activeTab === 'orders' && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-1 bg-primary rounded-full" />
                                        <h2 className="text-lg font-semibold">Draft Purchase Orders</h2>
                                    </div>
                                    <button
                                        onClick={() => setIsSmartSearchOpen(true)}
                                        className="flex items-center gap-2 bg-primary hover:bg-primary text-foreground px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg shadow-[#5A4820]/20"
                                    >
                                        <Search className="w-4 h-4" />
                                        Find Products
                                    </button>
                                </div>

                                {Object.keys(orders).length === 0 ? (
                                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-12 text-center">
                                        <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                                        <h3 className="text-xl font-bold text-primary mb-2">All Clear!</h3>
                                        <p className="text-muted-foreground max-w-sm mx-auto">
                                            Your smart order list is empty. You're fully stocked or haven't started your procurement run yet.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-8 xl:grid-cols-2">
                                        {Object.entries(orders).map(([vendor, items]) => (
                                            <div
                                                key={vendor}
                                                className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl relative"
                                            >
                                                {/* Invoice Header */}
                                                <div className="p-6 border-b border-border flex items-start justify-between bg-card/50">
                                                    <div>
                                                        <h3 className="font-bold text-2xl tracking-tight text-foreground">{vendor}</h3>
                                                        <p className="text-sm text-muted-foreground font-mono mt-1">DRAFT-PO-{Math.floor(Math.random() * 10000)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-xs uppercase font-bold tracking-wider text-muted-foreground">Status</span>
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 mt-1">
                                                            Draft
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Invoice Body (Table) */}
                                                <div className="p-0 bg-sidebar/20 min-h-[200px]">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-secondary/50 border-b border-border text-muted-foreground">
                                                            <tr>
                                                                <th className="px-6 py-3 font-semibold w-24">Qty</th>
                                                                <th className="px-6 py-3 font-semibold">Description</th>
                                                                <th className="px-6 py-3 font-semibold text-right">Price</th>
                                                                <th className="px-6 py-3 font-semibold text-right">Total</th>
                                                                <th className="px-6 py-3 w-10"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[#333]/50">
                                                            {items.sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name)).map((item) => (
                                                                <tr key={item.ingredient_id} className="group hover:bg-secondary/50 transition-colors">
                                                                    <td className="px-6 py-3">
                                                                        <div className="flex items-center border border-border rounded overflow-hidden w-fit bg-card shadow-sm">
                                                                            <button
                                                                                onClick={() => handleUpdateOrderQuantity(vendor, item.ingredient_id, -1)}
                                                                                className="px-2 py-1 hover:bg-secondary text-muted-foreground transition"
                                                                            >
                                                                                -
                                                                            </button>
                                                                            <span className="px-2 font-mono font-medium text-foreground min-w-[1.5rem] text-center">{item.qty_needed}</span>
                                                                            <button
                                                                                onClick={() => handleUpdateOrderQuantity(vendor, item.ingredient_id, 1)}
                                                                                className="px-2 py-1 hover:bg-secondary text-muted-foreground transition"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-3">
                                                                        <div className="font-medium text-foreground">{item.ingredient_name}</div>
                                                                        <div className="text-xs text-muted-foreground">{item.unit}</div>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                                                                        ${item.unit_price?.toFixed(2) || '—'}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right tabular-nums font-semibold text-foreground">
                                                                        ${item.line_total?.toFixed(2) || '—'}
                                                                    </td>
                                                                    <td className="px-6 py-3 text-right">
                                                                        <button
                                                                            onClick={() => handleRemoveOrderItem(vendor, item.ingredient_id)}
                                                                            className="text-muted-foreground hover:text-red-400 transition-colors"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Invoice Footer */}
                                                <div className="bg-card/50 p-6 border-t border-border flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setManualOrderVendor(vendor)}
                                                            className="text-xs font-semibold text-primary hover:text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            Add Line Item
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total</p>
                                                            <p className="text-2xl font-bold text-foreground">
                                                                ${items.reduce((s, i) => s + (i.line_total || 0), 0).toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleApproveOrder(vendor, items)}
                                                            className="bg-primary hover:bg-primary text-foreground px-6 py-3 rounded-lg font-semibold shadow-lg shadow-[#5A4820]/20 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                                                        >
                                                            Approve & Send
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Grand Total Footer */}
                                {orderTotal > 0 && (
                                    <div className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-6 shadow-2xl shadow-[#5A4820]/20">
                                        <div>
                                            <h3 className="text-lg font-semibold text-foreground">Grand Total Estimate</h3>
                                            <p className="text-muted-foreground text-sm">Across {Object.keys(orders).length} vendors</p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="text-4xl font-bold text-foreground tracking-tight">${orderTotal.toFixed(2)}</span>
                                            <button className="bg-primary hover:bg-primary text-foreground px-8 py-3 rounded-lg font-bold text-lg shadow-lg shadow-[#5A4820]/50 transition-all hover:scale-105">
                                                Send All Orders
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VENDORS TAB */}
                        {activeTab === 'vendors' && (
                            <div className="space-y-8">
                                {/* Header Section */}
                                <div className="flex items-center justify-between border-b border-border pb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-foreground tracking-tight">Supply Network</h2>
                                        <p className="text-muted-foreground text-sm mt-1">Manage your supplier relationships and discover new sources.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handlePurge}
                                            className="px-4 py-2 bg-card border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/50 rounded-lg text-sm font-medium transition-colors"
                                            title="Reset Network"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={handleDiscover}
                                            disabled={isDiscovering}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-foreground px-5 py-2 rounded-lg text-sm font-medium shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
                                        >
                                            <Globe className={cn("w-4 h-4", isDiscovering && "animate-spin")} />
                                            {isDiscovering ? 'Scouting Area...' : 'Discover Suppliers'}
                                        </button>
                                    </div>
                                </div>

                                {locationError && (
                                    <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-xl flex items-center gap-4">
                                        <div className="p-2 bg-red-500/10 rounded-full">
                                            <AlertTriangle className="w-6 h-6 text-red-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-foreground font-medium">Location Services Disabled</h4>
                                            <p className="text-sm text-red-300">We can't find nearby vendors without your location. Please check your browser settings.</p>
                                        </div>
                                    </div>
                                )}

                                {/* DISCOVERED (Pending) SECTION */}
                                {discoveredVendors.length > 0 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                                New Opportunities
                                            </div>
                                            <div className="h-px bg-secondary flex-grow" />
                                        </div>

                                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                            {discoveredVendors.map(vendor => (
                                                <div
                                                    key={vendor.id}
                                                    className="group relative overflow-hidden rounded-xl border border-blue-500/30 bg-card/80 p-1 backdrop-blur-sm transition-all hover:border-blue-400/50"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                    <div className="p-5 h-full flex flex-col">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <h3 className="font-bold text-lg text-foreground group-hover:text-blue-200 transition-colors">{vendor.name}</h3>
                                                                <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {vendor.distance_km}km Away
                                                                </p>
                                                            </div>
                                                            {vendor.rating && (
                                                                <div className="bg-yellow-500/10 text-yellow-500 text-xs font-bold px-2 py-1 rounded border border-yellow-500/20">
                                                                    ★ {vendor.rating}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-grow">
                                                            {vendor.address && (
                                                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{vendor.address}</p>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/50">
                                                            <button
                                                                onClick={() => handleBan(vendor.id)}
                                                                className="py-2 text-xs font-medium text-muted-foreground hover:text-red-400 transition-colors"
                                                            >
                                                                Ignore
                                                            </button>
                                                            <button
                                                                onClick={() => handleApprove(vendor.id)}
                                                                className="py-2 text-xs font-bold text-foreground bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                                                            >
                                                                Connect
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ACTIVE NETWORK SECTION */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                                            Active Partners
                                        </div>
                                        <div className="h-px bg-secondary flex-grow" />
                                    </div>

                                    {activeVendors.length === 0 ? (
                                        <EmptyState icon={Store} message="Your network is empty. Start by discovering local suppliers." />
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {activeVendors.map(vendor => (
                                                <div
                                                    key={vendor.id}
                                                    className="group bg-card border border-border rounded-xl p-5 hover:border-border transition-all hover:shadow-xl relative overflow-hidden"
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-xl font-bold text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors">
                                                                {vendor.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-foreground text-lg">{vendor.name}</h3>
                                                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-primary tracking-wide">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                    Verified
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDelete(vendor.id)
                                                            }}
                                                            className="text-muted-foreground hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2 text-sm text-muted-foreground pl-16">
                                                        {vendor.email || vendor.phone ? (
                                                            <>
                                                                {vendor.email && <p className="truncate hover:text-foreground transition-colors">{vendor.email}</p>}
                                                                {vendor.phone && <p className="hover:text-foreground transition-colors">{vendor.phone}</p>}
                                                            </>
                                                        ) : (
                                                            <p className="text-muted-foreground">No contact info available</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Reuse Ingredient Creation Modal */}
                                {isCreatingIngredient && (
                                    <div
                                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sidebar/80 backdrop-blur-sm animate-in fade-in"
                                        onClick={() => setIsCreatingIngredient(false)}
                                    >
                                        <div
                                            className="w-full max-w-md bg-card border border-border rounded-xl p-6 relative animate-in zoom-in-95 duration-200 shadow-2xl"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <h3 className="text-xl font-bold mb-6 text-foreground">{selectedIngredient ? 'Edit Item' : 'New Item'}</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Item Name</label>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-sidebar border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                                                        placeholder="e.g. Kosher Salt"
                                                        value={newIngredient.name}
                                                        onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                                                        <select
                                                            className="w-full bg-sidebar border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-primary outline-none transition"
                                                            value={newIngredient.category}
                                                            onChange={e => setNewIngredient({ ...newIngredient, category: e.target.value })}
                                                        >
                                                            <option>Produce</option>
                                                            <option>Meat</option>
                                                            <option>Dairy</option>
                                                            <option>Dry Goods</option>
                                                            <option>Other</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Unit</label>
                                                        <input
                                                            type="text"
                                                            className="w-full bg-sidebar border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-primary outline-none transition"
                                                            placeholder="e.g. lbs"
                                                            value={newIngredient.purchase_unit}
                                                            onChange={e => setNewIngredient({ ...newIngredient, purchase_unit: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Par Level</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-sidebar border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-primary outline-none transition"
                                                            value={newIngredient.par_level}
                                                            onChange={e => setNewIngredient({ ...newIngredient, par_level: parseFloat(e.target.value) })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Est. Price ($)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-sidebar border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-primary outline-none transition"
                                                            value={newIngredient.purchase_price}
                                                            onChange={e => setNewIngredient({ ...newIngredient, purchase_price: parseFloat(e.target.value) })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                                                    <button
                                                        onClick={() => setIsCreatingIngredient(false)}
                                                        className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm font-medium transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleCreateIngredient}
                                                        className="px-6 py-2 bg-primary hover:bg-primary text-foreground rounded-lg text-sm font-bold shadow-lg shadow-[#5A4820]/20 transition-all hover:scale-105"
                                                    >
                                                        {selectedIngredient ? 'Update' : 'Create'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* HISTORY TAB */}
                        {activeTab === 'history' && (
                            <div className="space-y-8">
                                <h2 className="text-lg font-semibold text-foreground">Order History</h2>
                                {sentOrders.length === 0 ? (
                                    <EmptyState icon={CheckCircle} message="No sent orders yet" />
                                ) : (
                                    <div className="grid gap-6">
                                        {sentOrders.map((po) => (
                                            <div key={po.id} className="bg-card/50 border border-border rounded-xl p-6 opacity-75 hover:opacity-100 transition-opacity">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h3 className="font-bold text-foreground text-lg">{po.vendor}</h3>
                                                        <p className="text-sm text-muted-foreground">{po.id} • {po.date}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xl font-bold text-foreground">${po.total.toFixed(2)}</span>
                                                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 uppercase tracking-wide">
                                                            Sent
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 pl-4 border-l-2 border-border">
                                                    {po.items.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">{item.qty_needed}x {item.ingredient_name}</span>
                                                            <span className="text-muted-foreground tabular-nums">${item.line_total?.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Manual Order Modal */}
                {manualOrderVendor && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sidebar/80 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setManualOrderVendor(null)}
                    >
                        <div
                            className="w-full max-w-sm bg-card border border-border rounded-xl p-6 relative animate-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold mb-4">Add to {manualOrderVendor} Order</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Select Ingredient</label>
                                    <select
                                        className="w-full bg-sidebar border border-border rounded-lg px-3 py-2 focus:border-primary outline-none"
                                        value={manualOrderIngredientId}
                                        onChange={e => setManualOrderIngredientId(e.target.value)}
                                    >
                                        <option value="">-- Choose Item --</option>
                                        {ingredients.map(ing => (
                                            <option key={ing.id} value={ing.id}>
                                                {ing.name} ({ing.purchase_unit})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setManualOrderVendor(null)}
                                        className="px-4 py-2 text-muted-foreground hover:text-foreground"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddManualOrderItem}
                                        disabled={!manualOrderIngredientId}
                                        className="px-4 py-2 bg-primary hover:bg-primary disabled:opacity-50 text-foreground rounded-lg font-medium"
                                    >
                                        Add to Order
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// Tab Button Component
function TabButton({
    active, onClick, icon, label, badge, badgeColor = 'zinc'
}: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
    badge?: string | number
    badgeColor?: 'red' | 'emerald' | 'blue' | 'zinc'
}) {
    const badgeColors = {
        red: 'bg-red-500 text-foreground',
        emerald: 'bg-primary text-foreground',
        blue: 'bg-blue-500 text-foreground',
        zinc: 'bg-muted-foreground text-foreground',
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                active
                    ? "bg-primary text-foreground shadow-lg shadow-primary/20"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
        >
            {icon}
            {label}
            {badge !== undefined && (
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", badgeColors[badgeColor])}>
                    {badge}
                </span>
            )}
        </button>
    )
}

// Empty State Component
function EmptyState({ icon: Icon, message }: { icon: any, message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Icon className="w-12 h-12 mb-4" />
            <p>{message}</p>
        </div>
    )
}
