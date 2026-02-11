'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Pencil, Plus, Minus, ChefHat } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrderItem {
    id: string
    recipe_id: string
    quantity: number
    unit_price: number
    course: 'starter' | 'main' | 'dessert'
    notes?: string
    recipe?: { name: string }
}

interface LiveTicketProps {
    orderId: string
    initialItems?: OrderItem[]
}

export default function LiveTicket({ orderId, initialItems = [] }: LiveTicketProps) {
    const [items, setItems] = useState<OrderItem[]>(initialItems)
    const supabase = createClient()

    const fetchItems = async () => {
        const { data } = await supabase
            .from('order_items')
            .select('*, recipe:recipes(name)')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true })
        if (data) setItems(data)
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchItems()
        const channel = supabase
            .channel(`ticket_${orderId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` }, fetchItems)
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [orderId, supabase])

    const updateQuantity = async (itemId: string, current: number, delta: number) => {
        const newQty = current + delta
        if (newQty < 1) return deleteItem(itemId)

        await supabase.from('order_items').update({ quantity: newQty }).eq('id', itemId)
    }

    const deleteItem = async (itemId: string) => {
        if (!confirm('Void this item?')) return
        await supabase.from('order_items').delete().eq('id', itemId)
    }

    const groupedItems = {
        starter: items.filter(i => i.course === 'starter' || !i.course), // Default to first group
        main: items.filter(i => i.course === 'main'),
        dessert: items.filter(i => i.course === 'dessert')
    }

    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)

    if (items.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30">
                <ChefHat className="w-16 h-16 mb-4" />
                <p className="font-black uppercase tracking-[0.2em] text-sm">Ticket Empty</p>
                <p className="text-xs font-medium mt-2">Add items from the menu</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-white/5 border-l border-white/5 relative">
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                {Object.entries(groupedItems).map(([course, courseItems]) => (
                    courseItems.length > 0 && (
                        <div key={course} className="space-y-3">
                            <div className="flex items-center gap-4">
                                <span className="h-px flex-1 bg-white/10" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{course}</span>
                                <span className="h-px flex-1 bg-white/10" />
                            </div>
                            {courseItems.map(item => (
                                <div key={item.id} className="group relative bg-card border border-white/5 rounded-xl p-4 hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="pr-8">
                                            <div className="font-bold text-foreground text-sm uppercase">{item.recipe?.name}</div>
                                            {item.notes && <div className="text-xs text-amber-500 italic mt-1">{item.notes}</div>}
                                        </div>
                                        <div className="text-lg font-black text-foreground tabular-nums">${(item.unit_price * item.quantity).toFixed(2)}</div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 bg-sidebar/40 rounded-lg p-1">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity, -1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <div className="w-8 text-center font-black text-foreground">{item.quantity}</div>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity, 1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteItem(item.id)}
                                                className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ))}
            </div>

            {/* Summary Footer */}
            <div className="p-6 bg-card border-t border-white/10">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Subtotal</span>
                    <span className="text-3xl font-black text-foreground tracking-tighter tabular-nums">${subtotal.toFixed(2)}</span>
                </div>
            </div>
        </div>
    )
}
