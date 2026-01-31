'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckSquare, ChefHat, Utensils, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface KdsProps {
    initialOrders: any[]
}

const statusColors: any = {
    received: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    preparing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const statusOrder = ['received', 'preparing', 'ready', 'delivered']

export function KitchenDisplay({ initialOrders }: KdsProps) {
    const supabase = createClient()
    const [orders, setOrders] = useState(initialOrders)

    useEffect(() => {
        // Realtime subscription for orders
        const channel = supabase
            .channel('kds_orders')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                async (payload) => {
                    // Refetch all active orders on any change for simplicity/consistency
                    const { data } = await supabase
                        .from('orders')
                        .select('*, order_items(*, recipe:recipes(name))')
                        .eq('status', 'paid')
                        .neq('preparation_status', 'delivered')
                        .order('created_at', { ascending: true })

                    if (data) setOrders(data)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    const updateStatus = async (orderId: string, currentStatus: string) => {
        const nextIndex = statusOrder.indexOf(currentStatus) + 1
        const nextStatus = statusOrder[nextIndex]

        if (!nextStatus) return

        const { error } = await supabase
            .from('orders')
            .update({ preparation_status: nextStatus })
            .eq('id', orderId)

        if (error) {
            toast.error('Failed to update status')
        } else {
            toast.success(`Order ${nextStatus}!`)
        }
    }

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-neutral-800 rounded-3xl">
                <ChefHat className="w-16 h-16 text-neutral-700 mb-4" />
                <h3 className="text-xl font-bold text-white">Kitchen is Clear</h3>
                <p className="text-neutral-500">No active orders at the moment.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order) => (
                <Card
                    key={order.id}
                    className={`bg-neutral-900 border-neutral-800 flex flex-col h-full shadow-2xl transition-all duration-300 ${order.preparation_status === 'ready' ? 'ring-2 ring-emerald-500/30' : ''}`}
                >
                    <CardHeader className="p-4 border-b border-neutral-800">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-mono text-neutral-500">#{order.id.slice(0, 8)}</span>
                            <Badge className={statusColors[order.preparation_status]}>
                                {order.preparation_status.toUpperCase()}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-white text-xl flex items-center gap-2">
                                <Utensils className="w-5 h-5 text-emerald-500" />
                                {order.table_or_room ? `Room ${order.table_or_room}` : 'Walk-in'}
                            </CardTitle>
                            <div className="flex items-center gap-1 text-xs text-neutral-400">
                                <Timer className="w-3 h-3" />
                                {formatDistanceToNow(new Date(order.created_at))}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 flex-1">
                        <ul className="space-y-3">
                            {order.order_items?.map((item: any) => (
                                <li key={item.id} className="flex justify-between items-start">
                                    <div className="flex items-start gap-2">
                                        <div className="mt-1 w-5 h-5 rounded bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-white">
                                            {item.quantity}
                                        </div>
                                        <span className="text-sm font-medium text-white leading-tight">
                                            {item.recipe?.name}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>

                    <CardFooter className="p-4 bg-neutral-950 border-t border-neutral-800">
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12"
                            onClick={() => updateStatus(order.id, order.preparation_status)}
                        >
                            {order.preparation_status === 'received' && 'Start Preparation'}
                            {order.preparation_status === 'preparing' && 'Mark as Ready'}
                            {order.preparation_status === 'ready' && 'Mark as Delivered'}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
