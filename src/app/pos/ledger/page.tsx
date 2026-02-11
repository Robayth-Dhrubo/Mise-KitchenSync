'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { History, Search, Download, ExternalLink, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface Order {
    id: string
    table_or_room: string
    status: string
    total_amount: number
    created_at: string
    type: string
    order_items: any[]
}

export default function LedgerPage() {
    const [supabase] = useState(() => createClient())
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const fetchOrders = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*, recipe:recipes(name))')
                .order('created_at', { ascending: false })

            if (data) setOrders(data)
            setIsLoading(false)
        }

        fetchOrders()
    }, [supabase])

    const filteredOrders = orders.filter(o =>
        o.table_or_room?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase())
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
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight uppercase leading-none">Ledger Manifest</h1>
                    <p className="text-muted-foreground font-bold uppercase text-[11px] tracking-[0.3em] mt-3">Transaction History & Economic Archive</p>
                </div>
                <div className="relative group w-80">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="IDENTIFY TRANSACTION..."
                        className="pl-14 h-14 bg-sidebar/40 border-white/5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] placeholder:text-[#333] transition-all focus:border-primary/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-6">
                {filteredOrders.length === 0 ? (
                    <div className="py-48 flex flex-col items-center justify-center border border-white/5 bg-sidebar/20 rounded-[48px] text-muted-foreground shadow-inner">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                            <History className="w-10 h-10 opacity-20" />
                        </div>
                        <span className="font-black uppercase tracking-[0.3em] text-[10px]">No historical data found</span>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <Card key={order.id} className="glass-card overflow-hidden border-white/5 hover:border-primary/30 transition-all group rounded-[32px] hover:shadow-2xl hover:bg-white/[0.02]">
                            <CardContent className="p-10">
                                <div className="flex items-center gap-10">
                                    <div className="w-20 h-20 rounded-[24px] bg-sidebar/40 flex flex-col items-center justify-center border border-white/5 shadow-inner">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-2">
                                            {format(new Date(order.created_at), 'MMM')}
                                        </span>
                                        <span className="text-3xl font-black text-foreground leading-none tracking-tighter">
                                            {format(new Date(order.created_at), 'dd')}
                                        </span>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-3">
                                            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-none group-hover:text-primary transition-colors">
                                                {order.table_or_room || 'Direct Sale'}
                                            </h3>
                                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] h-7 px-4 bg-white/5 border-white/10 text-muted-foreground rounded-full">
                                                {order.type.replace('_', ' ')}
                                            </Badge>
                                            <Badge className={cn(
                                                "text-[9px] font-black uppercase tracking-[0.2em] h-7 px-4 border-0 rounded-full",
                                                order.status === 'paid' ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"
                                            )}>
                                                {order.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-6 text-muted-foreground text-[11px] font-black uppercase tracking-[0.2em]">
                                            <span className="flex items-center gap-2"><History className="w-4 h-4" /> {format(new Date(order.created_at), 'HH:mm')}</span>
                                            <span className="truncate max-w-[400px] text-muted-foreground">
                                                {order.order_items?.map(i => i.recipe?.name).join(' • ')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-4xl font-black text-foreground tracking-tighter tabular-nums mb-3">
                                            ${order.total_amount.toFixed(2)}
                                        </div>
                                        <div className="flex items-center justify-end gap-3">
                                            <button className="w-10 h-10 rounded-xl bg-white/5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center active:scale-90">
                                                <Download className="w-5 h-5" />
                                            </button>
                                            <button className="w-10 h-10 rounded-xl bg-white/5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center active:scale-90">
                                                <ExternalLink className="w-5 h-5" />
                                            </button>
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
