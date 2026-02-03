'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, UtensilsCrossed, Calendar, ArrowRight, MapPin, ChefHat, Plus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface FohDashboardProps {
    userName: string | null
    stats: {
        occupiedTables: number
        totalReservations: number
        serverCount: number
    }
    soldOutItems: any[]
}

export function FohDashboard({ userName, stats, soldOutItems }: FohDashboardProps) {
    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <ChefHat className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
                            Front of House
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1 font-medium">
                            {userName ? `Welcome back, ${userName}.` : 'Service Overview'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/pos/terminal">
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wide">
                            <Plus className="w-4 h-4 mr-2" />
                            New Order
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Occupancy Stat */}
                <Card className="bg-neutral-900/50 border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Current Occupancy
                        </CardTitle>
                        <Users className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white tabular-nums mb-1">
                            {stats.occupiedTables}
                        </div>
                        <p className="text-xs text-neutral-500 font-bold">Active Tables</p>
                    </CardContent>
                </Card>

                {/* Reservations Stat */}
                <Card className="bg-neutral-900/50 border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Reservations
                        </CardTitle>
                        <Calendar className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-white tabular-nums mb-1">
                            {stats.totalReservations}
                        </div>
                        <p className="text-xs text-neutral-500 font-bold">Expected Today</p>
                    </CardContent>
                </Card>

                {/* 86'd Quick Count */}
                <Card className={cn(
                    "bg-neutral-900/50 border-white/5",
                    soldOutItems.length > 0 && "border-red-500/20 bg-red-500/5"
                )}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em]",
                            soldOutItems.length > 0 ? "text-red-500" : "text-neutral-500"
                        )}>
                            86'd Items
                        </CardTitle>
                        <UtensilsCrossed className={cn("w-4 h-4", soldOutItems.length > 0 ? "text-red-500" : "text-neutral-500")} />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-black tabular-nums mb-1", soldOutItems.length > 0 ? "text-red-500" : "text-white")}>
                            {soldOutItems.length}
                        </div>
                        <p className={cn("text-xs font-bold", soldOutItems.length > 0 ? "text-red-400" : "text-neutral-500")}>
                            Unavailable Items
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 86'd Items List - Prominent for Servers */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            86'd Board
                        </h2>
                        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                            DO NOT SELL
                        </span>
                    </div>

                    <Card className="bg-neutral-900/50 border-white/5 h-full min-h-[300px]">
                        <CardContent className="p-0">
                            {soldOutItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[300px] text-neutral-600 gap-4">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <ChefHat className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black uppercase tracking-widest text-xs mb-1 text-emerald-500">All Clear</p>
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
                                                        <UtensilsCrossed className="w-5 h-5 text-neutral-600" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-white text-sm line-through decoration-red-500/50 decoration-2">{item.name}</p>
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
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">
                        Floor Access
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link href="/pos" className="contents">
                            <Card className="bg-neutral-900/50 border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group cursor-pointer">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4 h-[200px]">
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-800 group-hover:bg-emerald-500 transition-colors flex items-center justify-center">
                                        <MapPin className="w-8 h-8 text-zinc-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white uppercase tracking-wide mb-1 group-hover:text-emerald-500 transition-colors">Floor Map</h3>
                                        <p className="text-xs text-neutral-500 font-medium">View tables & statuses</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/pos/reservations" className="contents">
                            <Card className="bg-neutral-900/50 border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group cursor-pointer">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4 h-[200px]">
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-800 group-hover:bg-blue-500 transition-colors flex items-center justify-center">
                                        <Calendar className="w-8 h-8 text-zinc-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white uppercase tracking-wide mb-1 group-hover:text-blue-500 transition-colors">Reservations</h3>
                                        <p className="text-xs text-neutral-500 font-medium">Manage bookings</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
