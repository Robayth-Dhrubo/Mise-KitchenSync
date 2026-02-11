'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    Users, AlertCircle, Settings, Monitor, Activity,
    Database, Shield, TrendingUp, ArrowRight, ChefHat,
    BarChart3, Gauge, Store, ShieldAlert,
    CheckCircle2, XCircle, RefreshCw, Package,
    CheckCircle, UtensilsCrossed,
    LayoutGrid, BedDouble, Receipt
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ReportsDashboard } from '@/components/reports/reports-dashboard'
import { FohDashboard } from '@/components/dashboard/foh-dashboard'
import { isRecipeInStock } from '@/lib/calculations'
import dynamic from 'next/dynamic'

// Lazy load POS components to avoid bloating the initial bundle
const FloorMap = dynamic(() => import('@/components/pos/floor-map'), { ssr: false })
const IrdDashboard = dynamic(() => import('@/components/pos/ird-dashboard'), { ssr: false })
const LedgerPage = dynamic(() => import('@/app/pos/ledger/page'), { ssr: false })

type DashboardTab = 'overview' | 'floor' | 'ird' | 'ledger'

interface AlertItem {
    id: string
    name: string
    category: string
    current_stock: number
    par_level: number
    status: string
    qty_needed: number
    purchase_unit: string
}

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

// Skeleton components for loading states
function StatSkeleton() {
    return <div className="h-8 w-12 bg-secondary rounded animate-pulse" />
}

function CardSkeleton() {
    return (
        <div className="bg-card/50 border border-border rounded-2xl p-6 animate-pulse">
            <div className="h-4 w-24 bg-secondary rounded mb-4" />
            <div className="h-6 w-32 bg-secondary rounded mb-2" />
            <div className="h-4 w-48 bg-secondary rounded" />
        </div>
    )
}

export default function DashboardPage() {
    const supabase = useMemo(() => createClient(), [])
    const [userRole, setUserRole] = useState<string | null>(null)
    const [stats, setStats] = useState({
        activeStaff: 0,
        openTickets: 0,
        systemStatus: 'OPERATIONAL'
    })
    const [inventoryAlerts, setInventoryAlerts] = useState<AlertItem[]>([])
    const [marginAlerts, setMarginAlerts] = useState<MarginAlert[]>([])
    const [salesLogs, setSalesLogs] = useState<any[]>([])
    const [recipes, setRecipes] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [userName, setUserName] = useState<string | null>(null)
    const [activeOrders, setActiveOrders] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview')

    // FOH Specific State
    const [fohStats, setFohStats] = useState({
        occupiedTables: 0,
        totalReservations: 0,
        serverCount: 0
    })
    const [soldOutItems, setSoldOutItems] = useState<any[]>([])

    // Memoized derived data
    const criticalItems = useMemo(() => inventoryAlerts.filter(a => a.status === 'CRITICAL'), [inventoryAlerts])
    const warningItems = useMemo(() => inventoryAlerts.filter(a => a.status === 'WARNING'), [inventoryAlerts])
    const isManagement = useMemo(() => ['admin', 'owner'].includes(userRole || ''), [userRole])
    const isOperations = useMemo(() => ['admin', 'owner', 'chef'].includes(userRole || ''), [userRole])

    // Optimized data fetching with parallel requests
    useEffect(() => {
        const controller = new AbortController()

        const fetchAllData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                console.log('[Dashboard] Auth Check:', {
                    user_id: user?.id,
                    role: user?.role,
                    aud: user?.aud,
                    email: user?.email,
                    configUrl: (supabase as any).supabaseUrl
                });

                if (!user) {
                    console.error('[Dashboard] No active user found')
                    // return // Don't return yet, let it redirect or fail explicit
                }

                if (!user) return

                // Fetch profile first to determine role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, restaurant_name')
                    .eq('id', user.id)
                    .single()

                const role = profile?.role || 'foh'
                setUserRole(role)
                setUserName(profile?.restaurant_name || user.email?.split('@')[0])

                // Prepare all parallel fetches based on role
                const fetchPromises: Promise<any>[] = [
                    // Always fetch inventory alerts
                    supabase
                        .from('view_dashboard_alerts')
                        .select('*') as unknown as Promise<any>
                ]

                // Filter inventory alerts if not operational staff
                if (!['admin', 'owner', 'chef', 'foh'].includes(role)) {
                    fetchPromises[0] = (fetchPromises[0] as any).eq('user_id', user.id)
                }

                // Add management-only fetches
                if (['admin', 'owner'].includes(role)) {
                    fetchPromises.push(
                        fetch('/api/admin/users', { signal: controller.signal }),
                        fetch('/api/admin/tickets', { signal: controller.signal })
                    )
                }

                // Add operations & staff fetches (margin alerts, sales, recipes)
                if (['admin', 'owner', 'chef', 'foh'].includes(role)) {
                    let marginQuery = supabase
                        .from('margin_alerts')
                        .select(`*, recipe:recipes(name, target_food_cost_pct), ingredient:ingredients(name)`)
                        .eq('status', 'pending')

                    let salesQuery = supabase
                        .from('sales_logs')
                        .select(`*, recipe:recipes(id, name, menu_price)`)

                    let recipesQuery = supabase
                        .from('recipes')
                        .select(`id, name, menu_price, recipe_items(quantity_needed, unit_used, ingredient:ingredients(id, name))`)

                    // Only filter if not staff
                    if (!['admin', 'owner', 'chef', 'foh'].includes(role)) {
                        marginQuery = marginQuery.eq('user_id', user.id)
                        salesQuery = salesQuery.eq('user_id', user.id)
                        recipesQuery = recipesQuery.eq('user_id', user.id)
                    }

                    fetchPromises.push(
                        marginQuery.order('created_at', { ascending: false }) as unknown as Promise<any>,
                        salesQuery.order('sale_date', { ascending: true }) as unknown as Promise<any>,
                        recipesQuery as unknown as Promise<any>
                    )
                }

                // Fetch 86'd Items Candidates for all operational roles
                if (['foh', 'admin', 'owner', 'chef'].includes(role || '')) {
                    fetchPromises.push(
                        supabase.from('recipes').select('id, name, is_available, image_url, recipe_items(quantity_needed, unit_used, ingredient:ingredients(current_stock, conversion_ratio))') as unknown as Promise<any>
                    )
                }

                // Add role-specific FOH metrics
                if (role === 'foh') {
                    const today = new Date().toISOString().split('T')[0]
                    fetchPromises.push(
                        // Occupied Tables - Removed restrictive user_id filter for staff
                        supabase.from('locations').select('*', { count: 'exact', head: true }).eq('status', 'occupied') as unknown as Promise<any>,
                        // Today's Reservations
                        supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('reservation_date', today) as unknown as Promise<any>,
                        // Active Orders for live feed
                        supabase.from('orders').select('*, location:locations(*), order_items(*, recipe:recipes(name))').neq('preparation_status', 'delivered').neq('preparation_status', 'cancelled').order('created_at', { ascending: false }) as unknown as Promise<any>
                    )
                }

                const results = await Promise.allSettled(fetchPromises)

                // Process inventory alerts (always first)
                const inventoryResult = results[0]
                if (inventoryResult.status === 'fulfilled' && inventoryResult.value?.data) {
                    setInventoryAlerts(inventoryResult.value.data)
                }

                let resultIndex = 1

                // Process management data
                if (['admin', 'owner'].includes(role)) {
                    const usersResult = results[resultIndex]
                    const ticketsResult = results[resultIndex + 1]

                    if (usersResult.status === 'fulfilled') {
                        const usersData = await usersResult.value.json()
                        const activeStaff = usersData.users?.filter((u: any) => u.role !== 'pending' && u.role !== null).length || 0
                        setStats(prev => ({ ...prev, activeStaff }))
                    }

                    if (ticketsResult.status === 'fulfilled') {
                        const ticketsData = await ticketsResult.value.json()
                        const openTickets = ticketsData.tickets?.filter((t: any) => t.status === 'open').length || 0
                        setStats(prev => ({ ...prev, openTickets }))
                    }

                    resultIndex += 2
                }

                // Process operations data
                if (['admin', 'owner', 'chef', 'foh'].includes(role)) {
                    const marginResult = results[resultIndex]
                    const salesResult = results[resultIndex + 1]
                    const recipesResult = results[resultIndex + 2]

                    if (marginResult?.status === 'fulfilled' && marginResult.value?.data) {
                        setMarginAlerts(marginResult.value.data)
                    }
                    if (salesResult?.status === 'fulfilled' && salesResult.value?.data) {
                        setSalesLogs(salesResult.value.data)
                    }
                    if (recipesResult?.status === 'fulfilled' && recipesResult.value?.data) {
                        setRecipes(recipesResult.value.data)
                    }
                    resultIndex += 3
                }

                // Process 86'd items (soldOutItems) - Shared for all operational roles
                if (['foh', 'admin', 'owner', 'chef'].includes(role || '')) {
                    const soldOutResult = results[resultIndex]
                    if (soldOutResult?.status === 'fulfilled' && Array.isArray((soldOutResult as any).value?.data)) {
                        // Logic for filtering sold out items is handled below via manual find, 
                        // but we MUST increment the index to keep subsequent FOH reads aligned.
                    }
                    resultIndex += 1
                }
                if (role === 'foh') {
                    const occupiedResult = results[resultIndex]
                    const reservationsResult = results[resultIndex + 1]
                    const ordersResult = results[resultIndex + 2]

                    if (occupiedResult?.status === 'fulfilled') {
                        // @ts-ignore
                        setFohStats(prev => ({ ...prev, occupiedTables: occupiedResult.value.count || 0 }))
                    }
                    if (reservationsResult?.status === 'fulfilled') {
                        // @ts-ignore
                        setFohStats(prev => ({ ...prev, totalReservations: reservationsResult.value.count || 0 }))
                    }
                    if (ordersResult.status === 'rejected' || (ordersResult.status === 'fulfilled' && ordersResult.value.error)) {
                        const error = ordersResult.status === 'rejected' ? ordersResult.reason : ordersResult.value.error;
                        console.error('[Dashboard] Active Orders Fetch Failed:', error);
                        console.error('Error Details:', {
                            message: error?.message,
                            details: error?.details,
                            hint: error?.hint,
                            code: error?.code
                        });
                    } else if (ordersResult.status === 'fulfilled' && ordersResult.value.data) {
                        console.log('[Dashboard] Active Orders Fetched:', ordersResult.value.data)
                        setActiveOrders(ordersResult.value.data)
                    }
                }

                // Process 86'd items (soldOutItems) - Shared for all operational roles
                const soldOutItemsResult = results.find(r =>
                    r.status === 'fulfilled' &&
                    Array.isArray((r as any).value?.data) &&
                    (r as any).value.data.length > 0 &&
                    (r as any).value.data[0].hasOwnProperty('is_available')
                ) as any

                if (soldOutItemsResult?.value?.data) {
                    const allRecipes = soldOutItemsResult.value.data
                    const unavailable = allRecipes.filter((r: any) => {
                        const manuallyOff = r.is_available === false
                        const outOfStock = !isRecipeInStock(r.recipe_items || [])
                        return manuallyOff || outOfStock
                    })
                    setSoldOutItems(unavailable)
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error('Failed to fetch dashboard data:', error)
                }
            } finally {
                setIsLoading(false)
            }
        }

        fetchAllData()

        // Real-time subscription for 86'd items and availability
        const channel = supabase
            .channel('dashboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, fetchAllData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, fetchAllData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, fetchAllData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, fetchAllData)
            .subscribe()

        return () => {
            controller.abort()
            supabase.removeChannel(channel)
        }
    }, [supabase])

    // Memoized handlers
    const handleApplyPrice = useCallback(async (alert: MarginAlert) => {
        try {
            const { error: recipeError } = await supabase
                .from('recipes')
                .update({ menu_price: alert.suggested_price })
                .eq('id', alert.recipe_id)

            if (recipeError) throw recipeError

            const { data: userData } = await supabase.auth.getUser()
            await supabase.from('price_history').insert({
                user_id: userData.user?.id,
                recipe_id: alert.recipe_id,
                old_price: alert.current_menu_price,
                new_price: alert.suggested_price,
                change_type: 'margin_guard'
            })

            await supabase
                .from('margin_alerts')
                .update({ status: 'applied' })
                .eq('id', alert.id)

            toast.success('Price updated', { description: `${alert.recipe.name} is now $${alert.suggested_price}` })
            setMarginAlerts(prev => prev.filter(a => a.id !== alert.id))
        } catch (error: any) {
            toast.error('Failed to apply price', { description: error.message })
        }
    }, [supabase])

    const handleIgnore = useCallback(async (alertId: string) => {
        const { error } = await supabase
            .from('margin_alerts')
            .update({ status: 'ignored' })
            .eq('id', alertId)

        if (error) {
            toast.error('Failed to ignore alert')
        } else {
            setMarginAlerts(prev => prev.filter(a => a.id !== alertId))
            toast.info('Alert ignored')
        }
    }, [supabase])

    const dashboardTabs = [
        { id: 'overview' as DashboardTab, label: 'Overview', icon: Gauge },
        { id: 'floor' as DashboardTab, label: 'Floor Map', icon: LayoutGrid },
        { id: 'ird' as DashboardTab, label: 'Room Service', icon: BedDouble },
        { id: 'ledger' as DashboardTab, label: 'Ledger', icon: Receipt },
    ]

    return (
        <>
            {/* Dashboard Tab Bar */}
            <div className="flex items-center gap-1 mb-6 p-1 bg-card/30 rounded-xl border border-border/50 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {dashboardTabs.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0",
                                activeTab === tab.id
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Floor Map Tab */}
            {activeTab === 'floor' && (
                <div className="-mx-6 lg:-mx-8 -mb-6 lg:-mb-8" style={{ height: 'calc(100vh - 140px)' }}>
                    <FloorMap />
                </div>
            )}

            {/* Room Service Tab */}
            {activeTab === 'ird' && (
                <div className="-mx-6 lg:-mx-8 -mb-6 lg:-mb-8" style={{ height: 'calc(100vh - 140px)' }}>
                    <IrdDashboard />
                </div>
            )}

            {/* Ledger Tab */}
            {activeTab === 'ledger' && (
                <div className="-mx-6 lg:-mx-8 -mb-6 lg:-mb-8" style={{ height: 'calc(100vh - 140px)' }}>
                    <LedgerPage />
                </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    {userRole === 'foh' ? (
                        <FohDashboard
                            userName={userName}
                            stats={fohStats}
                            activeOrders={activeOrders}
                            salesLogs={salesLogs}
                            soldOutItems={soldOutItems}
                        />
                    ) : (
                        <div className="space-y-8 pb-12">
                            {/* Ambient Background Glows */}
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] -z-10" />
                            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] -z-10" />

                            {/* Header */}
                            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-xl">
                                        <Gauge className="w-8 h-8 text-primary" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">
                                            Command Center
                                        </h1>
                                        <p className="text-muted-foreground text-sm mt-1 font-medium">
                                            {isLoading ? 'Loading...' : userName ? `Welcome back, ${userName}.` : 'System overview & live metrics.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href="/inventory">
                                        <Button className="bg-secondary hover:bg-muted text-foreground border border-border">
                                            <Package className="w-4 h-4 mr-2" />
                                            Manage Stock
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Management Cards - Admin/Owner Only */}
                            {isManagement && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                    {isLoading ? (
                                        <>
                                            <CardSkeleton />
                                            <CardSkeleton />
                                            <CardSkeleton />
                                        </>
                                    ) : (
                                        <>
                                            <Link href="/admin/team" className="group">
                                                <div className="bg-card/50 border border-border rounded-2xl p-6 h-full transition-all hover:bg-secondary/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
                                                    <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-foreground transition-colors text-muted-foreground">
                                                        <Users className="w-6 h-6" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-foreground mb-2">Team Management</h3>
                                                    <p className="text-muted-foreground text-sm mb-4">
                                                        Manage staff accounts, roles, and permissions.
                                                    </p>
                                                    <div className="flex items-center text-sm text-primary font-medium group-hover:translate-x-1 transition-transform">
                                                        {stats.activeStaff} Active <ArrowRight className="w-4 h-4 ml-1" />
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link href="/service-desk" className="group">
                                                <div className="bg-card/50 border border-border rounded-2xl p-6 h-full transition-all hover:bg-secondary/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
                                                    <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-foreground transition-colors text-muted-foreground">
                                                        <AlertCircle className="w-6 h-6" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-foreground mb-2">Service Desk</h3>
                                                    <p className="text-muted-foreground text-sm mb-4">
                                                        Review and resolve staff issues.
                                                    </p>
                                                    <div className="flex items-center text-sm text-blue-500 font-medium group-hover:translate-x-1 transition-transform">
                                                        {stats.openTickets} Open <ArrowRight className="w-4 h-4 ml-1" />
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link href="/settings" className="group">
                                                <div className="bg-card/50 border border-border rounded-2xl p-6 h-full transition-all hover:bg-secondary/50 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
                                                    <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-foreground transition-colors text-muted-foreground">
                                                        <Settings className="w-6 h-6" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-foreground mb-2">Settings</h3>
                                                    <p className="text-muted-foreground text-sm mb-4">
                                                        Configure system preferences.
                                                    </p>
                                                    <div className="flex items-center text-sm text-purple-500 font-medium group-hover:translate-x-1 transition-transform">
                                                        System Config <ArrowRight className="w-4 h-4 ml-1" />
                                                    </div>
                                                </div>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Quick Links */}
                            <div className="bg-card/10 border border-white/5 rounded-2xl p-6 flex flex-wrap gap-4 items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2">Jump to:</span>
                                {isOperations && (
                                    <Link href="/kitchen-manager" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-xs font-bold text-foreground">
                                        <ChefHat className="w-4 h-4 text-primary" /> Kitchen
                                    </Link>
                                )}
                                {isOperations && (
                                    <Link href="/inventory" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-xs font-bold text-foreground">
                                        <Package className="w-4 h-4 text-primary" /> Inventory
                                    </Link>
                                )}
                            </div>

                            {/* Main Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-6">
                                    {/* System Health - Management Only */}
                                    {isManagement && (
                                        <Card className="bg-card/50 border-white/5">
                                            <CardHeader>
                                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                    <Monitor className="w-4 h-4 text-primary" />
                                                    System Health
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {[
                                                    { icon: Database, label: 'Database', status: stats.systemStatus },
                                                    { icon: Activity, label: 'API Gateway', status: 'ONLINE' },
                                                    { icon: Shield, label: 'Auth', status: 'SECURE' }
                                                ].map(({ icon: Icon, label, status }) => (
                                                    <div key={label} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                            <span className="text-foreground flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                                                                <Icon className="w-4 h-4" /> {label}
                                                            </span>
                                                        </div>
                                                        <span className="text-primary text-[10px] font-black">{status}</span>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Live Metrics - Management Only */}
                                    {isManagement && (
                                        <div className="bg-card/30 border border-border/50 rounded-2xl p-6">
                                            <div className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                                <TrendingUp className="w-4 h-4" />
                                                Live Metrics
                                            </div>
                                            <div className="grid grid-cols-2 gap-8">
                                                <div>
                                                    <div className="text-3xl font-black text-foreground mb-1 tabular-nums">
                                                        {isLoading ? <StatSkeleton /> : stats.openTickets}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Open Tickets</div>
                                                </div>
                                                <div>
                                                    <div className="text-3xl font-black text-foreground mb-1 tabular-nums">
                                                        {isLoading ? <StatSkeleton /> : stats.activeStaff}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Active Staff</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Margin Guard - Operations */}
                                    {isOperations && (
                                        <div className="space-y-4">
                                            <Link href="/finance/margin-guard" className="block group">
                                                <div className={cn(
                                                    "bg-card/50 border rounded-2xl p-6 transition-all duration-500",
                                                    marginAlerts.length > 0
                                                        ? "border-amber-500/50 hover:bg-amber-500/5 hover:border-amber-500 shadow-lg shadow-amber-500/10"
                                                        : "border-border/50 hover:border-border hover:bg-secondary/30"
                                                )}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                                                            Margin Guard
                                                        </div>
                                                        {marginAlerts.length > 0 && (
                                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse">
                                                                {marginAlerts.length} RISK{marginAlerts.length > 1 ? 'S' : ''}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h4 className="text-lg font-bold text-foreground mb-1">
                                                        {marginAlerts.length > 0 ? "Inflation Impact Detected" : "Margins Secured"}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground font-medium group-hover:text-muted-foreground transition-colors">
                                                        {marginAlerts.length > 0
                                                            ? `${marginAlerts.length} ingredient price hike${marginAlerts.length > 1 ? 's' : ''} affecting margins.`
                                                            : "All recipes within target food cost."
                                                        }
                                                    </p>
                                                </div>
                                            </Link>

                                            {/* Margin Alerts List */}
                                            {marginAlerts.length > 0 && (
                                                <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-700">
                                                    <div className="flex items-center justify-between px-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Alerts</span>
                                                        <RefreshCw className={cn("w-3 h-3 text-muted-foreground", isLoading && "animate-spin")} />
                                                    </div>
                                                    {marginAlerts.slice(0, 3).map((alert) => {
                                                        const foodCostPct = ((alert.new_cost / alert.current_menu_price) * 100).toFixed(1)
                                                        return (
                                                            <div key={alert.id} className="bg-card/80 border border-border/50 rounded-xl p-4 hover:border-amber-500/30 transition-all">
                                                                <div className="flex items-start justify-between gap-4 mb-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center border border-border">
                                                                            <ChefHat className="w-3 h-3 text-muted-foreground" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-bold text-foreground leading-none">{alert.recipe.name}</p>
                                                                            <p className="text-[10px] text-amber-500 font-bold uppercase mt-0.5">{alert.ingredient.name} hike</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Food Cost</p>
                                                                        <p className="text-sm font-black text-red-500 tabular-nums">{foodCostPct}%</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        className="flex-1 bg-primary hover:bg-primary text-[10px] h-8 font-black uppercase tracking-tight text-foreground"
                                                                        onClick={() => handleApplyPrice(alert)}
                                                                    >
                                                                        Apply ${alert.suggested_price}
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="px-2 h-8 text-muted-foreground hover:text-foreground"
                                                                        onClick={() => handleIgnore(alert.id)}
                                                                    >
                                                                        <XCircle className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                    {marginAlerts.length > 3 && (
                                                        <Link href="/finance/margin-guard" className="block text-center py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                                                            + {marginAlerts.length - 3} more alerts
                                                        </Link>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Financial Analytics */}
                                    {isOperations && !isLoading && (
                                        <div className="pt-8 border-t border-white/5">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <BarChart3 className="w-5 h-5 text-primary" />
                                                </div>
                                                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Financial Analytics</h2>
                                            </div>
                                            <ReportsDashboard salesLogs={salesLogs} recipes={recipes} />
                                        </div>
                                    )}
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                    {/* Inventory Status */}
                                    <Card className={cn(
                                        "bg-card/50 border-white/5 transition-all duration-500",
                                        criticalItems.length > 0 && "border-red-500/30 ring-1 ring-red-500/20"
                                    )}>
                                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                <Package className="w-4 h-4" />
                                                Inventory Status
                                            </CardTitle>
                                            {criticalItems.length > 0 && (
                                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 animate-pulse">
                                                    CRITICAL
                                                </Badge>
                                            )}
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                                    <div className={cn("text-2xl font-black mb-1 tabular-nums", criticalItems.length > 0 ? "text-red-500" : "text-foreground")}>
                                                        {isLoading ? <StatSkeleton /> : criticalItems.length}
                                                    </div>
                                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Below Par</div>
                                                </div>
                                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                                    <div className="text-2xl font-black text-yellow-500 mb-1 tabular-nums">
                                                        {isLoading ? <StatSkeleton /> : warningItems.length}
                                                    </div>
                                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Approaching</div>
                                                </div>
                                            </div>

                                            {criticalItems.length > 0 && (
                                                <div className="space-y-2 mt-4">
                                                    {criticalItems.slice(0, 3).map(item => (
                                                        <div key={item.id} className="flex items-center justify-between p-2 bg-red-500/5 rounded-lg border border-red-500/10 text-xs">
                                                            <span className="text-red-200 font-bold">{item.name}</span>
                                                            <span className="text-red-500 font-black uppercase">Refill: {item.qty_needed} {item.purchase_unit}</span>
                                                        </div>
                                                    ))}
                                                    {criticalItems.length > 3 && (
                                                        <Link href="/inventory" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors block text-center font-bold uppercase tracking-widest">
                                                            + {criticalItems.length - 3} more critical items
                                                        </Link>
                                                    )}
                                                </div>
                                            )}

                                            {criticalItems.length === 0 && !isLoading && (
                                                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                                    <CheckCircle className="w-5 h-5 text-primary" />
                                                    <span className="text-xs text-primary font-bold">All stock levels are optimal.</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Quick Actions */}
                                    <div className="bg-card/30 border border-border/50 rounded-2xl p-6">
                                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">Quick Actions</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <Link href="/kitchen-manager" className="block p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5 group">
                                                <div className="text-primary text-sm font-black uppercase tracking-widest mb-1 flex items-center">
                                                    Kitchen <ArrowRight className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-bold">Manage orders & menu</div>
                                            </Link>
                                        </div>
                                    </div>

                                    {/* 86'd Board - Unified Visibility */}
                                    {(isOperations || userRole === 'chef') && (
                                        <Card className={cn(
                                            "bg-card/50 border-white/5 transition-all duration-500 overflow-hidden",
                                            soldOutItems.length > 0 && "border-red-500/20 ring-1 ring-red-500/10"
                                        )}>
                                            <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                                        <UtensilsCrossed className={cn("w-4 h-4", soldOutItems.length > 0 ? "text-red-500" : "text-primary")} />
                                                        86'd Board
                                                    </CardTitle>
                                                    <Badge variant="outline" className={cn(
                                                        "font-mono text-[9px] border-white/10",
                                                        soldOutItems.length > 0 ? "text-red-500" : "text-primary"
                                                    )}>
                                                        {soldOutItems.length} ITEMS
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                {isLoading ? (
                                                    <div className="p-8 space-y-4">
                                                        {Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
                                                    </div>
                                                ) : soldOutItems.length === 0 ? (
                                                    <div className="p-8 text-center">
                                                        <CheckCircle2 className="w-8 h-8 text-primary/20 mx-auto mb-2" />
                                                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest italic">All Dishes Available</p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto no-scrollbar">
                                                        {soldOutItems.map((item) => (
                                                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-secondary border border-white/10 grayscale opacity-40">
                                                                        {item.image_url ? (
                                                                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center">
                                                                                <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[11px] font-bold text-muted-foreground line-through decoration-red-500/50">{item.name}</div>
                                                                        <div className="text-[8px] font-black uppercase tracking-widest text-red-500 mt-0.5">
                                                                            {!item.is_available ? 'Off Air' : 'Sold Out'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Badge variant="outline" className="border-red-500/20 text-red-500 bg-red-500/5 font-black text-[8px] px-1.5 py-0.5">86</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    )
}

function Badge({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'outline' }) {
    return (
        <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center justify-center",
            variant === 'outline' ? "border" : "bg-primary text-primary-foreground",
            className
        )}>
            {children}
        </span>
    )
}
