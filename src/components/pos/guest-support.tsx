'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, User, Home, Key, History, Loader2, ShieldCheck, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function GuestSupport() {
    const [supabase] = useState(() => createClient())
    const [searchQuery, setSearchQuery] = useState('')
    const [orders, setOrders] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchAllOrders = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    recipe:recipes(name)
                ),
                location:locations(name, type)
            `)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            toast.error('Failed to load guest data')
        } else {
            setOrders(data || [])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAllOrders()

        const channel = supabase
            .channel('guest_support_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchAllOrders)
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    const filteredOrders = orders.filter(o =>
        (o.guest_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.table_or_room?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.location?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-12 h-full flex flex-col gap-10 overflow-y-auto custom-scrollbar bg-sidebar/50">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight uppercase leading-none flex items-center gap-4">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                        Guest Support Portal
                    </h1>
                    <p className="text-muted-foreground font-bold uppercase text-[11px] tracking-[0.3em] mt-3">Identity Verification & Access Recovery</p>
                </div>

                <div className="relative group w-96">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="SEARCH NAME OR ROOM..."
                        className="pl-14 h-14 bg-sidebar/40 border-white/5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] placeholder:text-[#333] transition-all focus:border-primary/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredOrders.length === 0 ? (
                    <div className="py-48 flex flex-col items-center justify-center border border-white/5 bg-sidebar/20 rounded-[48px] text-muted-foreground shadow-inner">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                            <User className="w-10 h-10 opacity-20" />
                        </div>
                        <span className="font-black uppercase tracking-[0.3em] text-[10px]">No guest sessions identified</span>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <Card key={order.id} className="glass-card overflow-hidden border-white/5 hover:border-primary/30 transition-all group rounded-[32px] hover:shadow-2xl hover:bg-white/[0.02]">
                            <CardContent className="p-10">
                                <div className="flex items-center gap-10">
                                    {/* Location / Room Info */}
                                    <div className="w-24 h-24 rounded-[32px] bg-sidebar/40 flex flex-col items-center justify-center border border-white/5 shadow-inner shrink-0 scale-95 group-hover:scale-100 transition-transform">
                                        <Home className="w-6 h-6 text-primary mb-2" />
                                        <span className="text-xl font-black text-foreground tracking-tighter leading-none">
                                            {order.table_or_room}
                                        </span>
                                    </div>

                                    {/* Guest Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-4 mb-4">
                                            <h3 className="text-3xl font-black text-foreground uppercase tracking-tighter leading-none group-hover:text-primary transition-colors truncate">
                                                {order.guest_name || 'Anonymous Guest'}
                                            </h3>
                                            <Badge className={cn(
                                                "text-[9px] font-black uppercase tracking-[0.2em] h-7 px-4 border-0 rounded-full",
                                                order.preparation_status === 'delivered' ? "bg-secondary text-muted-foreground" : "bg-primary/10 text-primary animate-pulse"
                                            )}>
                                                {order.preparation_status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-6 text-muted-foreground text-[11px] font-black uppercase tracking-[0.2em]">
                                            <span className="flex items-center gap-2"><History className="w-4 h-4" /> {format(new Date(order.created_at), 'MMM dd, HH:mm')}</span>
                                            <span className="flex items-center gap-2 text-muted-foreground">ID: {order.id.slice(0, 8)}...</span>
                                            <span className="truncate max-w-[300px] text-muted-foreground">
                                                {order.order_items?.map((i: any) => i.recipe?.name).join(' • ')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Support Actions & PIN */}
                                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-[40px] border border-white/5">
                                        <div className="flex flex-col items-center px-6 border-r border-white/10">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                                                <Key className="w-3 h-3" /> SECURITY KEY
                                            </div>
                                            <div className="text-3xl font-black text-primary font-mono tracking-[0.2em]">
                                                {order.tracking_pin || 'EXPD'}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <a
                                                href={`/guest/${order.table_or_room}?pin=${order.tracking_pin}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="h-12 px-6 bg-primary hover:bg-primary text-foreground rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-primary/20"
                                            >
                                                <Zap className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">SYNC SESSION</span>
                                            </a>
                                            <Button
                                                variant="ghost"
                                                className="h-10 text-muted-foreground hover:text-foreground hover:bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(order.tracking_pin || '')
                                                    toast.success('Sequence Copied')
                                                }}
                                                disabled={!order.tracking_pin}
                                            >
                                                Copy PIN
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
