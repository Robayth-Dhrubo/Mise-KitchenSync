'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { History, PackageCheck, Truck, Check } from 'lucide-react'
import { toast } from 'sonner'

interface OrderHistoryItem {
    id: string
    quantity_to_order: number
    status: string
    created_at: string
    vendor_price: number | null
    expected_delivery_date: string | null
    received_date: string | null
    ingredients: {
        name: string
        purchase_unit: string
        purchase_price: number
    } | null
    suppliers: {
        name: string
    } | null
}

interface OrderHistoryProps {
    orders: OrderHistoryItem[]
}

export function OrderHistory({ orders }: OrderHistoryProps) {
    const supabase = createClient()

    const markReceivedMutation = useMutation({
        mutationFn: async (orderId: string) => {
            const { error } = await supabase
                .from('shopping_list')
                .update({
                    status: 'received',
                    received_date: new Date().toISOString().split('T')[0]
                })
                .eq('id', orderId)

            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Order marked as received!')
            // Refresh page to update list
            window.location.reload()
        },
        onError: (err) => toast.error(err.message)
    })

    if (orders.length === 0) {
        return (
            <Card className="bg-neutral-900 border-neutral-800">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="w-12 h-12 text-neutral-700 mb-4" />
                    <h3 className="text-xl font-bold text-white">No Order History</h3>
                    <p className="text-neutral-500 mt-2">You haven't placed any orders yet.</p>
                </CardContent>
            </Card>
        )
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>
            case 'ordered':
                return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Ordered</Badge>
            case 'received':
                return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Received</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-neutral-400" />
                    Order History
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-neutral-800 hover:bg-transparent">
                            <TableHead className="text-neutral-400">Date</TableHead>
                            <TableHead className="text-neutral-400">Ingredient</TableHead>
                            <TableHead className="text-neutral-400">Vendor</TableHead>
                            <TableHead className="text-neutral-400">Qty</TableHead>
                            <TableHead className="text-neutral-400">Cost</TableHead>
                            <TableHead className="text-neutral-400">Expected</TableHead>
                            <TableHead className="text-neutral-400">Status</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => {
                            const cost = order.vendor_price
                                ? order.quantity_to_order * order.vendor_price
                                : (order.quantity_to_order || 0) * (order.ingredients?.purchase_price || 0)

                            return (
                                <TableRow key={order.id} className="border-neutral-800 hover:bg-neutral-800/50">
                                    <TableCell className="text-neutral-300 font-medium whitespace-nowrap">
                                        {format(new Date(order.created_at), 'MMM d')}
                                    </TableCell>
                                    <TableCell className="text-white">
                                        {order.ingredients?.name || 'Unknown Item'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs border-neutral-700 text-neutral-400">
                                            {order.suppliers?.name || 'Direct'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-neutral-300">
                                        {order.quantity_to_order} {order.ingredients?.purchase_unit}
                                    </TableCell>
                                    <TableCell className="text-neutral-300">
                                        ${cost.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-neutral-400 text-sm">
                                        {order.expected_delivery_date
                                            ? format(new Date(order.expected_delivery_date), 'MMM d')
                                            : <span className="text-neutral-600">—</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(order.status)}
                                    </TableCell>
                                    <TableCell>
                                        {order.status === 'ordered' && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                onClick={() => markReceivedMutation.mutate(order.id)}
                                                disabled={markReceivedMutation.isPending}
                                            >
                                                <Check className="w-4 h-4 mr-1" />
                                                Receive
                                            </Button>
                                        )}
                                        {order.status === 'received' && order.received_date && (
                                            <span className="text-xs text-neutral-500">
                                                {format(new Date(order.received_date), 'MMM d')}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

