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
            <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold text-foreground">No Order History</h3>
                    <p className="text-muted-foreground mt-2">You haven't placed any orders yet.</p>
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
                return <Badge className="bg-primary/10 text-primary border-primary/20">Received</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                    <History className="w-5 h-5 text-muted-foreground" />
                    Order History
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground">Date</TableHead>
                            <TableHead className="text-muted-foreground">Ingredient</TableHead>
                            <TableHead className="text-muted-foreground">Vendor</TableHead>
                            <TableHead className="text-muted-foreground">Qty</TableHead>
                            <TableHead className="text-muted-foreground">Cost</TableHead>
                            <TableHead className="text-muted-foreground">Expected</TableHead>
                            <TableHead className="text-muted-foreground">Status</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => {
                            const cost = order.vendor_price
                                ? order.quantity_to_order * order.vendor_price
                                : (order.quantity_to_order || 0) * (order.ingredients?.purchase_price || 0)

                            return (
                                <TableRow key={order.id} className="border-border hover:bg-secondary/50">
                                    <TableCell className="text-foreground font-medium whitespace-nowrap">
                                        {format(new Date(order.created_at), 'MMM d')}
                                    </TableCell>
                                    <TableCell className="text-foreground">
                                        {order.ingredients?.name || 'Unknown Item'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                            {order.suppliers?.name || 'Direct'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-foreground">
                                        {order.quantity_to_order} {order.ingredients?.purchase_unit}
                                    </TableCell>
                                    <TableCell className="text-foreground">
                                        ${cost.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {order.expected_delivery_date
                                            ? format(new Date(order.expected_delivery_date), 'MMM d')
                                            : <span className="text-muted-foreground">—</span>
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
                                                className="text-primary hover:text-primary hover:bg-primary/10"
                                                onClick={() => markReceivedMutation.mutate(order.id)}
                                                disabled={markReceivedMutation.isPending}
                                            >
                                                <Check className="w-4 h-4 mr-1" />
                                                Receive
                                            </Button>
                                        )}
                                        {order.status === 'received' && order.received_date && (
                                            <span className="text-xs text-muted-foreground">
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

