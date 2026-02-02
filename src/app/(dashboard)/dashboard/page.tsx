'use client'

import { useState, useEffect } from 'react'
import {
    Users, AlertCircle, Settings, Monitor, Activity,
    Database, Shield, TrendingUp, ArrowRight, ChefHat,
    AlertTriangle, Package, CheckCircle, Truck, BookOpen,
    BarChart3, Gauge, LayoutDashboard, Store
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

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

export default function DashboardPage() {
    const supabase = createClient()
    const router = useRouter()
    const [userRole, setUserRole] = useState<string | null>(null)
    const [stats, setStats] = useState({
        activeStaff: 0,
        openTickets: 0,
        systemStatus: 'OPERATIONAL'
    })
    const [inventoryAlerts, setInventoryAlerts] = useState<AlertItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [userName, setUserName] = useState<string | null>(null)

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // 1. Fetch User Profile
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role, restaurant_name')
                        .eq('id', user.id)
                        .single()

                    setUserRole(profile?.role || 'foh')
                    setUserName(profile?.restaurant_name || user.email?.split('@')[0])

                    // 2. Fetch Management Stats (API) - Only for Admin/Owner
                    if (['admin', 'owner'].includes(profile?.role || '')) {
                        const [usersRes, ticketsRes] = await Promise.all([
                            fetch('/api/admin/users'),
                            fetch('/api/admin/tickets')
                        ])

                        const usersData = await usersRes.json()
                        const ticketsData = await ticketsRes.json()

                        const activeStaff = usersData.users ? usersData.users.filter((u: any) => u.role !== 'pending' && u.role !== null).length : 0
                        const openTickets = ticketsData.tickets ? ticketsData.tickets.filter((t: any) => t.status === 'open').length : 0

                        setStats(prev => ({
                            ...prev,
                            activeStaff,
                            openTickets
                        }))
                    }

                    // 3. Fetch Inventory Alerts (Direct Supabase)
                    const { data: alerts } = await supabase
                        .from('view_dashboard_alerts')
                        .select('*')
                        .eq('user_id', user.id)

                    setInventoryAlerts(alerts || [])
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAllData()
    }, [supabase])

    const criticalItems = inventoryAlerts.filter(a => a.status === 'CRITICAL')
    const warningItems = inventoryAlerts.filter(a => a.status === 'WARNING')

    const isManagement = ['admin', 'owner'].includes(userRole || '')

    return (
        <div className="space-y-8 pb-12">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[140px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] -z-10" />

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <Gauge className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
                            Command Center
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1 font-medium">
                            {userName ? `Welcome back, ${userName}.` : 'System overview & live metrics.'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/inventory">
                        <Button className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700">
                            <Package className="w-4 h-4 mr-2" />
                            Manage Stock
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Management Cards (Top Row) - Only for Admin/Owner */}
            {isManagement && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Link href="/admin/team" className="group">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-full transition-all hover:bg-zinc-800/50 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10">
                            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors text-zinc-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Team Management</h3>
                            <p className="text-zinc-500 text-sm mb-4">
                                Manage staff accounts, roles, and permissions for your team.
                            </p>
                            <div className="flex items-center text-sm text-emerald-500 font-medium group-hover:translate-x-1 transition-transform">
                                View Team <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/service-desk" className="group">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-full transition-all hover:bg-zinc-800/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
                            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors text-zinc-400">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Service Desk</h3>
                            <p className="text-zinc-500 text-sm mb-4">
                                Review and resolve issues reported by Kitchen and FOH staff.
                            </p>
                            <div className="flex items-center text-sm text-blue-500 font-medium group-hover:translate-x-1 transition-transform">
                                View Tickets <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/settings" className="group">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-full transition-all hover:bg-zinc-800/50 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
                            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors text-zinc-400">
                                <Settings className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Settings</h3>
                            <p className="text-zinc-500 text-sm mb-4">
                                Configure system preferences and application settings.
                            </p>
                            <div className="flex items-center text-sm text-purple-500 font-medium group-hover:translate-x-1 transition-transform">
                                System Config <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </div>
                    </Link>
                </div>
            )}

            {/* Operational Quick Links (Visible to everyone) */}
            <div className="bg-zinc-900/10 border border-white/5 rounded-2xl p-6 flex flex-wrap gap-4 items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mr-2">Jump to:</span>
                {['admin', 'owner', 'chef'].includes(userRole || '') && (
                    <Link href="/kitchen-manager" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-xs font-bold text-zinc-300">
                        <ChefHat className="w-4 h-4 text-emerald-500" /> Kitchen Manager
                    </Link>
                )}
                {['admin', 'owner', 'foh'].includes(userRole || '') && (
                    <Link href="/pos" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-xs font-bold text-zinc-300">
                        <Store className="w-4 h-4 text-emerald-500" /> Front Desk
                    </Link>
                )}
                <Link href="/menu" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-xs font-bold text-zinc-300">
                    <BookOpen className="w-4 h-4 text-emerald-500" /> Menu
                </Link>
                {['admin', 'owner', 'chef'].includes(userRole || '') && (
                    <Link href="/inventory" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-xs font-bold text-zinc-300">
                        <Package className="w-4 h-4 text-emerald-500" /> Inventory
                    </Link>
                )}
            </div>

            {/* Secondary Sections (Health & Inventory) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {isManagement && (
                        <>
                            <Card className="bg-neutral-900/50 border-white/5">
                                <CardHeader>
                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
                                        <Monitor className="w-4 h-4 text-emerald-500" />
                                        System Health
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-neutral-300 flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><Database className="w-4 h-4" /> Database</span>
                                        </div>
                                        <span className="text-emerald-500 text-[10px] font-black">{stats.systemStatus}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-neutral-300 flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><Activity className="w-4 h-4" /> API Gateway</span>
                                        </div>
                                        <span className="text-emerald-500 text-[10px] font-black">ONLINE</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-neutral-300 flex items-center gap-2 text-sm font-bold uppercase tracking-wider"><Shield className="w-4 h-4" /> Auth</span>
                                        </div>
                                        <span className="text-emerald-500 text-[10px] font-black">SECURE</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                    <TrendingUp className="w-4 h-4" />
                                    Live Metrics
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <div className="text-3xl font-black text-white mb-1 tabular-nums">
                                            {isLoading ? '...' : stats.openTickets}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">Open Tickets</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black text-white mb-1 tabular-nums">
                                            {isLoading ? '...' : stats.activeStaff}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">Active Staff</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Inventory Summary */}
                    <Card className={cn(
                        "bg-neutral-900/50 border-white/5 transition-all duration-500",
                        criticalItems.length > 0 && "border-red-500/30 ring-1 ring-red-500/20"
                    )}>
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Inventory Status
                            </CardTitle>
                            {criticalItems.length > 0 && (
                                <Badge variant="outline" className="h-6 bg-red-500/10 text-red-500 border-red-500/20 font-black animate-pulse">
                                    CRITICAL
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div className={cn("text-2xl font-black mb-1 tabular-nums", criticalItems.length > 0 ? "text-red-500" : "text-white")}>
                                        {criticalItems.length}
                                    </div>
                                    <div className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Below Par</div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div className="text-2xl font-black text-yellow-500 mb-1 tabular-nums">
                                        {warningItems.length}
                                    </div>
                                    <div className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">Approaching</div>
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
                                        <Link href="/inventory" className="text-[10px] text-neutral-500 hover:text-white transition-colors block text-center font-bold uppercase tracking-widest">
                                            + {criticalItems.length - 3} more critical items
                                        </Link>
                                    )}
                                </div>
                            )}

                            {criticalItems.length === 0 && (
                                <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    <span className="text-xs text-emerald-400 font-bold">All stock levels are optimal.</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-2xl p-6">
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-6">Quick Actions</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Link href="/menu" className="block p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5 group">
                                <div className="text-emerald-400 text-sm font-black uppercase tracking-widest mb-1 flex items-center">
                                    Menu <ArrowRight className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-[10px] text-neutral-500 font-bold">Edit items & costs</div>
                            </Link>
                            <Link href="/analytics" className="block p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5 group">
                                <div className="text-blue-400 text-sm font-black uppercase tracking-widest mb-1 flex items-center">
                                    Analytics <ArrowRight className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-[10px] text-neutral-500 font-bold">Profit & performance</div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
