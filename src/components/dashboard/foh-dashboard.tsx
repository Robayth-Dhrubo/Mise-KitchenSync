'use client'

import { useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, UtensilsCrossed, Calendar, ArrowRight, MapPin, ChefHat, Plus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import LocationLedger from '@/components/pos/location-ledger'
import { cn } from '@/lib/utils'

interface FohDashboardProps {
    userName: string | null
    stats: {
        occupiedTables: number
        totalReservations: number
        serverCount: number
    }
    soldOutItems: any[]
    activeOrders: any[]
    salesLogs: any[]
}

export function FohDashboard({ userName, stats, soldOutItems, activeOrders, salesLogs }: FohDashboardProps) {
    const [selectedLocation, setSelectedLocation] = useState<any>(null)

    return (
        <div className="space-y-8 pb-12 relative">
            {/* Ledger Overlay */}
            {selectedLocation && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-300"
                        onClick={() => setSelectedLocation(null)}
                    />
                    <div className="fixed inset-y-0 right-0 z-50 h-screen">
                        <LocationLedger
                            location={selectedLocation}
                            onClose={() => setSelectedLocation(null)}
                            onOpenTerminal={() => window.location.href = '/pos/terminal'}
                        />
                    </div>
                </>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <ChefHat className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">
                            Front of House
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1 font-medium">
                            {userName ? `Welcome back, ${userName}.` : 'Service Overview'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/pos/terminal">
                        <Button className="bg-primary hover:bg-primary text-foreground font-black uppercase tracking-wide">
                            <Plus className="w-4 h-4 mr-2" />
                            New Order
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Occupancy Stat */}
                <Card className="bg-card/50 border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            Current Occupancy
                        </CardTitle>
                        <Users className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-foreground tabular-nums mb-1">
                            {stats.occupiedTables}
                        </div>
                        <p className="text-xs text-muted-foreground font-bold">Active Tables</p>
                    </CardContent>
                </Card>

                {/* Reservations Stat */}
                <Card className="bg-card/50 border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            Reservations
                        </CardTitle>
                        <Calendar className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-foreground tabular-nums mb-1">
                            {stats.totalReservations}
                        </div>
                        <p className="text-xs text-muted-foreground font-bold">Expected Today</p>
                    </CardContent>
                </Card>

                {/* 86'd Quick Count */}
                <Card className={cn(
                    "bg-card/50 border-white/5",
                    soldOutItems.length > 0 && "border-red-500/20 bg-red-500/5"
                )}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em]",
                            soldOutItems.length > 0 ? "text-red-500" : "text-muted-foreground"
                        )}>
                            86'd Items
                        </CardTitle>
                        <UtensilsCrossed className={cn("w-4 h-4", soldOutItems.length > 0 ? "text-red-500" : "text-muted-foreground")} />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-black tabular-nums mb-1", soldOutItems.length > 0 ? "text-red-500" : "text-foreground")}>
                            {soldOutItems.length}
                        </div>
                        <p className={cn("text-xs font-bold", soldOutItems.length > 0 ? "text-red-400" : "text-muted-foreground")}>
                            Unavailable Items
                        </p>
                    </CardContent>
                </Card>

                {/* Live Orders Pulse */}
                <Card className="bg-card/50 border-white/5 md:col-span-3">
                    <CardHeader className="pb-2 border-b border-white/5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-primary animate-pulse" />
                                Active Orders ({activeOrders.length})
                            </span>
                            <Link href="/pos/ledger" className="text-primary hover:text-primary transition-colors">
                                View Ledger
                            </Link>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {activeOrders.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest italic">
                                No active orders
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                {activeOrders.slice(0, 6).map((order) => (
                                    <div
                                        key={order.id}
                                        className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 cursor-pointer hover:bg-white/10 hover:border-primary/20 transition-all group relative overflow-hidden"
                                        onClick={() => order.location && setSelectedLocation(order.location)}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className="text-foreground font-black text-sm uppercase flex items-center gap-2">
                                                {order.location?.name || (order.location_id ? `Room ${order.location_id.slice(0, 4)}` : 'Takeaway')}
                                                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-primary" />
                                            </span>
                                            <Badge className={cn(
                                                "text-[8px] font-black tracking-widest uppercase",
                                                order.preparation_status === 'received' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                    order.preparation_status === 'preparing' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                        order.preparation_status === 'ready' ? "bg-primary/10 text-primary border-primary/20" :
                                                            "bg-secondary text-muted-foreground"
                                            )} variant="outline">
                                                {order.preparation_status}
                                            </Badge>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground space-y-1">
                                            {order.order_items?.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between">
                                                    <span>{item.quantity}x {item.recipe?.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 86'd Items List - Prominent for Servers */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            86'd Board
                        </h2>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            DO NOT SELL
                        </span>
                    </div>

                    <Card className="bg-card/50 border-white/5 h-full min-h-[300px]">
                        <CardContent className="p-0">
                            {soldOutItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-4">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                        <ChefHat className="w-8 h-8 text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black uppercase tracking-widest text-xs mb-1 text-primary">All Clear</p>
                                        <p className="text-xs">Full menu available for service.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {soldOutItems.map((item) => (
                                        <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-4">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover grayscale opacity-50" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                                        <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-foreground text-sm line-through decoration-red-500/50 decoration-2">{item.name}</p>
                                                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide">
                                                        {!item.is_available ? 'DISABLED' : 'OUT OF STOCK'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="border-red-500/20 text-red-500 bg-red-500/10 font-mono text-[10px]">
                                                86
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Navigation / Floor Pulse */}
                <div className="space-y-4">
                    <h2 className="text-lg font-black text-foreground uppercase tracking-tight">
                        Floor Access
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link href="/dashboard" className="contents">
                            <Card className="bg-card/50 border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4 h-[200px]">
                                    <div className="w-16 h-16 rounded-2xl bg-secondary group-hover:bg-primary transition-colors flex items-center justify-center">
                                        <MapPin className="w-8 h-8 text-muted-foreground group-hover:text-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-foreground uppercase tracking-wide mb-1 group-hover:text-primary transition-colors">Floor Map</h3>
                                        <p className="text-xs text-muted-foreground font-medium">View tables & statuses</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/dashboard" className="contents">
                            <Card className="bg-card/50 border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group cursor-pointer">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4 h-[200px]">
                                    <div className="w-16 h-16 rounded-2xl bg-secondary group-hover:bg-blue-500 transition-colors flex items-center justify-center">
                                        <Calendar className="w-8 h-8 text-muted-foreground group-hover:text-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-foreground uppercase tracking-wide mb-1 group-hover:text-blue-500 transition-colors">Reservations</h3>
                                        <p className="text-xs text-muted-foreground font-medium">Manage bookings</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* Financial Summary - NEW for FOH */}
                <div className="space-y-4">
                    <h2 className="text-lg font-black text-foreground uppercase tracking-tight">
                        Financial Summary
                    </h2>
                    <Card className="bg-card/50 border-white/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Today's Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-black text-primary mb-2 tabular-nums">
                                ${salesLogs.reduce((acc, log) => acc + (log.recipe?.menu_price * log.quantity_sold || 0), 0).toFixed(2)}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                <ArrowRight className="w-3 h-3 text-primary" />
                                From {salesLogs.length} transactions
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
