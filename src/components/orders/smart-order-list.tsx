'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Send, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { type Ingredient } from '@/lib/types/database'

interface SmartOrderListProps {
    ingredients: Ingredient[]
}

export function SmartOrderList({ ingredients }: SmartOrderListProps) {
    const router = useRouter()
    const supabase = createClient()

    // 1. Identify items below par
    const lowStockItems = useMemo(() => {
        return ingredients.filter(i => (i.par_level || 0) > 0 && i.current_stock < (i.par_level || 0))
    }, [ingredients])

    // 2. State for order quantities (default to par - stock)
    const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {}
        lowStockItems.forEach(i => {
            initial[i.id] = (i.par_level || 0) - i.current_stock
        })
        return initial
    })

    const handleQuantityChange = (id: string, val: string) => {
        setOrderQuantities(prev => ({ ...prev, [id]: parseFloat(val) || 0 }))
    }

    // 3. Mutation to create shopping list items / "Send Order"
    const sendOrderMutation = useMutation({
        mutationFn: async () => {
            const itemsToOrder = Object.entries(orderQuantities)
                .filter(([_, qty]) => qty > 0)
                .map(([id, qty]) => ({
                    ingredient_id: id,
                    quantity_to_order: qty,
                    status: 'ordered' // Direct to ordered for this MVP
                }))

            if (itemsToOrder.length === 0) throw new Error('No items to order')

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Insert into shopping_list
            const { error } = await supabase
                .from('shopping_list')
                .insert(itemsToOrder.map(item => ({ ...item, user_id: user.id })))

            if (error) throw error

            // Optional: We could also update stock immediately if "Receiving" logic existed,
            // but for now we just log the order.
        },
        onSuccess: () => {
            toast.success('Order sent successfully!', {
                description: 'Vendors have been notified (simulated).'
            })
            // Reset quantities or redirect?
            // Usually we'd show a "Pending Orders" list, but for MVP we simply refresh.
            router.refresh()
        },
        onError: (err) => toast.error(err.message)
    })

    if (lowStockItems.length === 0) {
        return (
            <Card className="bg-neutral-900 border-neutral-800">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                    <h3 className="text-xl font-bold text-white">All Par Levels Met</h3>
                    <p className="text-neutral-400 mt-2">You have sufficient stock for all ingredients.</p>
                </CardContent>
            </Card>
        )
    }

    const totalCost = lowStockItems.reduce((acc, item) => {
        const qty = orderQuantities[item.id] || 0
        return acc + (qty * item.purchase_price) // Assuming price is per unit? Actually purchase_price is usually per purchase_unit.
        // If purchase_price is "Price per Case" and we order in "Cases" (implied if we deduct by unit_used but par is in...?)
        // Wait, unit tracking is complex. 
        // Assumption for MVP: par_level, current_stock, and purchase_unit are all aligned (e.g. stock is 5 (cases), price is $50/case).
    }, 0)

    return (
        <div className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Needs Ordering ({lowStockItems.length})
                            </CardTitle>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-neutral-400">Estimated Cost</div>
                            <div className="text-xl font-bold text-emerald-400">${totalCost.toLocaleString()}</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                <TableHead className="text-neutral-400">Ingredient</TableHead>
                                <TableHead className="text-neutral-400">Stock / Par</TableHead>
                                <TableHead className="text-neutral-400">Category</TableHead>
                                <TableHead className="text-neutral-400 w-[150px]">Order Qty</TableHead>
                                <TableHead className="text-neutral-400 text-right">Est. Cost</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lowStockItems.map((item) => {
                                const qty = orderQuantities[item.id] || 0
                                return (
                                    <TableRow key={item.id} className="border-neutral-800 hover:bg-neutral-800/50">
                                        <TableCell className="font-medium text-white">
                                            {item.name}
                                            <div className="text-xs text-neutral-500">{item.purchase_unit}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-red-400 font-bold">{item.current_stock}</span>
                                                <span className="text-neutral-600">/</span>
                                                <span className="text-neutral-300">{item.par_level}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-neutral-400">{item.category || '-'}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="bg-neutral-950 border-neutral-700 text-white w-24"
                                                value={qty}
                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-neutral-300">
                                            ${(qty * item.purchase_price).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                    onClick={() => sendOrderMutation.mutate()}
                    disabled={sendOrderMutation.isPending}
                >
                    <Send className="w-4 h-4" />
                    {sendOrderMutation.isPending ? 'Sending...' : 'Send Orders'}
                </Button>
            </div>
        </div>
    )
}
