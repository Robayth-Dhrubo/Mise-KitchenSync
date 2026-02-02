'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Clock, ChefHat, Utensils, Timer, Volume2, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface KdsProps {
    initialOrders: any[]
}

const statusConfig = {
    received: {
        border: 'border-blue-500/50',
        bg: 'bg-blue-500/5',
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        button: 'bg-blue-600 hover:bg-blue-500',
        buttonText: 'Start Prep',
        next: 'preparing',
    },
    preparing: {
        border: 'border-amber-500/50',
        bg: 'bg-amber-500/5',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        button: 'bg-amber-600 hover:bg-amber-500',
        buttonText: 'Mark Ready',
        next: 'ready',
    },
    ready: {
        border: 'border-emerald-500/50 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10',
        bg: 'bg-emerald-500/5',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        button: 'bg-emerald-600 hover:bg-emerald-500',
        buttonText: 'Delivered',
        next: 'delivered',
    },
} as const

export function KitchenDisplay({ initialOrders }: KdsProps) {
    const supabase = createClient()
    const [orders, setOrders] = useState(initialOrders)
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active')
    const [historyOrders, setHistoryOrders] = useState<any[]>([])
    const [currentTime, setCurrentTime] = useState(new Date())
    const [exitingOrders, setExitingOrders] = useState<Set<string>>(new Set())
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Clock update
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio('/sounds/ping.mp3')
        audioRef.current.volume = 0.5
    }, [])

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel('kds_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders' },
                async (payload) => {
                    // Play sound on new order
                    if (payload.new.status === 'paid') {
                        audioRef.current?.play().catch(() => { })
                        toast.success('New Order!', { description: `Table ${payload.new.table_or_room || 'Walk-in'}` })
                    }
                    // Refetch to get full order with items
                    await refetchOrders()
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders' },
                async (payload) => {
                    // If update happens, refreshes local state to stay in sync
                    // Ideally we merge payload, but refetch is safer for now
                    await refetchOrders()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    // Load history when tab is switched
    useEffect(() => {
        if (viewMode === 'history') {
            fetchHistory()
        }
    }, [viewMode])

    const fetchHistory = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, order_items(*, recipe:recipes(name))')
            .eq('status', 'paid')
            .eq('preparation_status', 'delivered')
            .order('created_at', { ascending: false })
            .limit(50)

        if (data) setHistoryOrders(data)
    }

    const refetchOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*, order_items(*, recipe:recipes(name))')
            .eq('status', 'paid')
            .neq('preparation_status', 'delivered')
            .order('created_at', { ascending: true })

        if (data) setOrders(data)
    }

    const updateOrderStatus = async (orderId: string, currentStatus: string) => {
        const config = statusConfig[currentStatus as keyof typeof statusConfig]
        if (!config?.next) return

        // OPTIMISTIC UPDATE: Update local state immediately
        const nextStatus = config.next

        let shouldRemove = false
        if (nextStatus === 'delivered') {
            shouldRemove = true
            setExitingOrders(prev => new Set(prev).add(orderId))
            // Wait for animation before removing from DOM
            await new Promise(resolve => setTimeout(resolve, 300))
        }

        // Apply optimistic change
        setOrders(prev => {
            if (shouldRemove) {
                return prev.filter(o => o.id !== orderId)
            }
            return prev.map(o => o.id === orderId ? { ...o, preparation_status: nextStatus } : o)
        })

        // Perform actual DB update
        const { error } = await supabase
            .from('orders')
            .update({ preparation_status: nextStatus })
            .eq('id', orderId)

        if (error) {
            toast.error('Failed to update status')
            // Revert on error (re-fetch)
            refetchOrders()
            // Reset exit state if needed
            setExitingOrders(prev => {
                const next = new Set(prev)
                next.delete(orderId)
                return next
            })
        } else {
            const msg = nextStatus === 'delivered' ? 'Order Delivered!' : `Status: ${nextStatus}`
            toast.success(msg)
            // If delivered, refresh history to show it immediately if user switches
            if (nextStatus === 'delivered') fetchHistory()
        }
    }

    const displayedOrders = viewMode === 'active' ? orders : historyOrders

    // Empty state
    if (orders.length === 0 && viewMode === 'active') {
        return (
            <div className="space-y-6 relative">
                {/* Ambient Background Glows */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[140px] -z-10" />

                {/* Header with View Toggle even when empty */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <ChefHat className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Kitchen Manager</h1>
                            <p className="text-zinc-500 text-sm mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Active Service History
                            </p>
                        </div>
                    </div>
                    <div className="flex bg-zinc-900 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('active')}
                            className={cn("px-4 py-2 rounded-md text-sm font-bold transition-all bg-zinc-800 text-white shadow")}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={cn("px-4 py-2 rounded-md text-sm font-bold transition-all text-zinc-500 hover:text-white")}
                        >
                            Past Orders
                        </button>
                    </div>
                </div>

                <div className="min-h-[50vh] flex flex-col items-center justify-center">
                    <div className="text-center">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                            <ChefHat className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Service is Clear</h2>
                        <p className="text-zinc-500">All caught up. No active orders.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-12 gap-4">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black text-white tracking-tighter font-display uppercase">
                        {viewMode === 'active' ? 'Kitchen manager.' : 'History.'}
                    </h1>
                    <p className="text-neutral-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {viewMode === 'active' ? 'Active Service History' : 'Past Order Archives'}
                    </p>
                </div>
                <p className="text-zinc-500 text-sm">
                    {viewMode === 'active'
                        ? `${orders.length} active order${orders.length !== 1 ? 's' : ''}`
                        : 'Showing last 50 delivered orders'
                    }
                </p>
            </div>

            <div className="flex items-center gap-4">
                {/* View Toggle */}
                <div className="flex bg-zinc-900 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('active')}
                        className={cn("px-4 py-2 rounded-md text-sm font-bold transition-all", viewMode === 'active' ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-white")}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={cn("px-4 py-2 rounded-md text-sm font-bold transition-all", viewMode === 'history' ? "bg-zinc-800 text-white shadow" : "text-zinc-500 hover:text-white")}
                    >
                        History
                    </button>
                </div>

                <div className="flex items-center gap-2 text-zinc-400 bg-zinc-900 px-4 py-2 rounded-lg ml-auto md:ml-0">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-lg">
                        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>

                <button
                    onClick={() => audioRef.current?.play().catch(() => { })}
                    className="p-2 text-zinc-500 hover:text-white transition hidden md:block"
                    title="Test Sound"
                >
                    <Volume2 className="w-5 h-5" />
                </button>
            </div>

            {/* Order Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedOrders.map((order) => {
                    const status = order.preparation_status as string
                    const config = statusConfig[status as keyof typeof statusConfig]
                    const isExiting = exitingOrders.has(order.id)

                    // For history items (delivered), we can use a simpler card style or same style
                    // If status is 'delivered', we need config for it
                    if (status === 'delivered') {
                        return (
                            <div key={order.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 opacity-75 grayscale hover:grayscale-0 transition-all">
                                <div className="flex justify-between mb-4">
                                    <span className="font-mono text-xs text-zinc-500">#{order.id.slice(0, 8)}</span>
                                    <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-xs uppercase font-bold">Delivered</span>
                                </div>
                                <h3 className="text-lg font-bold text-zinc-300 mb-2">
                                    {order.table_or_room ? `Room ${order.table_or_room}` : 'Walk-in'}
                                </h3>
                                <ul className="space-y-2 mb-4">
                                    {order.order_items?.map((item: any) => (
                                        <li key={item.id} className="flex gap-2 text-sm text-zinc-400">
                                            <span className="font-bold text-zinc-300">{item.quantity}x</span>
                                            {item.recipe?.name}
                                        </li>
                                    ))}
                                </ul>
                                <div className="text-xs text-zinc-600 flex items-center gap-2">
                                    <CheckSquare className="w-3 h-3" />
                                    <span>Completed {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                                </div>
                            </div>
                        )
                    }

                    if (!config) return null

                    return (
                        <div
                            key={order.id}
                            className={cn(
                                "bg-zinc-900 border-2 rounded-2xl overflow-hidden flex flex-col transition-all duration-300",
                                config.border,
                                config.bg,
                                isExiting && "opacity-0 scale-95 translate-y-4"
                            )}
                        >
                            {/* Card Header */}
                            <div className="p-5 border-b border-zinc-800">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-mono text-zinc-600">#{order.id.slice(0, 8)}</span>
                                    <span className={cn("text-xs font-bold uppercase px-2.5 py-1 rounded-full border", config.badge)}>
                                        {status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Utensils className="w-5 h-5 text-zinc-500" />
                                        {order.table_or_room ? `Room ${order.table_or_room}` : 'Walk-in'}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                        <Timer className="w-3.5 h-3.5" />
                                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                                    </div>
                                </div>
                            </div>

                            {/* Card Body - Order Items */}
                            <div className="p-5 flex-1">
                                <ul className="space-y-3">
                                    {order.order_items?.map((item: any) => (
                                        <li key={item.id} className="flex items-start gap-3">
                                            <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-white shrink-0">
                                                {item.quantity}
                                            </span>
                                            <span className="text-white font-medium leading-tight pt-1">
                                                {item.recipe?.name || 'Unknown Item'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Card Footer - Action Button */}
                            <div className="p-4 bg-black/30">
                                <button
                                    onClick={() => updateOrderStatus(order.id, status)}
                                    className={cn(
                                        "w-full h-14 rounded-xl text-white font-bold text-lg transition-all active:scale-[0.98]",
                                        config.button
                                    )}
                                >
                                    {config.buttonText}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div >
    )
}
