'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Users, Clock, Receipt, History, AlertCircle,
    Calendar, CheckCircle2, ChevronRight, X,
    Loader2, CreditCard, UtensilsCrossed
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Location, POSOrder } from '@/lib/types/pos'
import { format } from 'date-fns'

interface LocationLedgerProps {
    location: Location
    onClose: () => void
    onOpenTerminal: () => void
}

export default function LocationLedger({ location, onClose, onOpenTerminal }: LocationLedgerProps) {
    const [supabase] = useState(() => createClient())
    const [orders, setOrders] = useState<POSOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchData = async () => {
        setIsLoading(true)

        // Fetch active and recent orders
        const { data: orderData } = await supabase
            .from('orders')
            .select('*, order_items(*, recipe(name))')
            .eq('location_id', location.id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (orderData) setOrders(orderData)
        setIsLoading(false)
    }

    useEffect(() => {
        fetchData()

        const channel = supabase
            .channel(`location_ledger_${location.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `location_id=eq.${location.id}`
                },
                fetchData
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'order_items'
                    // We can't easily filter order_items by location_id in the channel filter
                    // so we just refresh on any order_item change for now, or we could 
                    // refine this if it's too noisy.
                },
                fetchData
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [location.id, supabase])



    const activeOrder = orders.find(o => o.preparation_status !== 'completed' && o.preparation_status !== 'cancelled')
    const totalDues = orders
        .filter(o => o.preparation_status !== 'cancelled')
        .reduce((sum, o) => sum + o.total_amount, 0)

    return (
        <div className="absolute inset-y-0 right-0 w-[440px] bg-sidebar/90 backdrop-blur-3xl border-l border-white/10 shadow-4xl z-50 flex flex-col animate-in slide-in-from-right duration-500">
            {/* Header - Minimal & Large */}
            <div className="p-8 pb-4 flex flex-col gap-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                    <Button variant="ghost" size="icon" onClick={onClose} className="w-10 h-10 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn(
                        "uppercase text-[9px] font-black tracking-[0.2em] border-0 px-2 py-0.5 rounded-full",
                        location.status === 'available' ? "bg-primary/20 text-primary" :
                            location.status === 'occupied' ? "bg-amber-500/20 text-amber-500" :
                                "bg-red-500/20 text-red-500"
                    )}>
                        {location.status}
                    </Badge>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                        <Users className="w-3 h-3" /> {location.capacity}
                    </span>
                </div>

                <h1 className="text-5xl font-black text-foreground tracking-tighter uppercase mt-2">
                    {location.name}
                </h1>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{location.type} • ID: {location.id.slice(0, 4)}</p>

                {/* Background Decor */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Quick Stats - Floating Cards */}
            <div className="grid grid-cols-2 gap-4 px-8 py-4">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest z-10">Current Tab</span>
                    <span className="text-2xl font-black text-primary tracking-tighter z-10">${totalDues.toFixed(2)}</span>
                </div>
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest z-10">Status</span>
                    <span className="text-xl font-black text-foreground tracking-tight uppercase z-10">{activeOrder ? 'Active' : 'Idle'}</span>
                </div>
            </div>

            {/* Content - Order History Only */}
            <div className="flex-1 flex flex-col min-h-0 bg-sidebar/20">
                <div className="px-8 pt-6 pb-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Transactions</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orders.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <Receipt className="w-12 h-12 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Activity</p>
                                </div>
                            ) : (
                                orders.map((order) => (
                                    <div key={order.id} className="group p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all cursor-pointer flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge className={cn(
                                                    "h-5 px-2 text-[8px] font-black tracking-widest uppercase border-0 rounded-md",
                                                    order.preparation_status === 'received' ? "bg-blue-500 text-foreground" :
                                                        order.preparation_status === 'preparing' ? "bg-amber-500 text-black" :
                                                            order.preparation_status === 'ready' ? "bg-primary text-foreground" :
                                                                order.preparation_status === 'delivered' ? "bg-secondary text-muted-foreground" :
                                                                    "bg-muted-foreground text-foreground"
                                                )}>
                                                    {order.preparation_status}
                                                </Badge>
                                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                                    {format(new Date(order.created_at), 'HH:mm')}
                                                </span>
                                            </div>
                                            <div className="text-xs font-bold text-muted-foreground">Order #{order.id.slice(0, 5)}</div>
                                        </div>
                                        <div className="text-lg font-black text-foreground">${order.total_amount.toFixed(2)}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions - Floating Grid */}
            <div className="p-6 pt-2">
                <div className="grid grid-cols-5 gap-3">
                    <Button
                        variant="outline"
                        className="col-span-2 h-14 rounded-2xl border-white/10 bg-white/5 text-foreground hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                        Settle
                    </Button>
                    <Button
                        onClick={onOpenTerminal}
                        className="col-span-3 h-14 rounded-2xl bg-gradient-to-r from-[#997F50] to-[#997F50] hover:from-[#C5A059] hover:to-[#997F50] text-foreground text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#5A4820]/20 transition-all gap-2"
                    >
                        Place Order <ChevronRight className="w-4 h-4 opacity-50" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
