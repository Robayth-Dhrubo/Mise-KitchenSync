'use client'

import { useState } from 'react'
import { Truck, DollarSign, Package, Send } from 'lucide-react'
import { toast } from 'sonner'
import { sendOrder } from './actions'

interface OrderItem {
    ingredient_id: string
    name: string
    qty_needed: number
    purchase_unit: string
    price: number
    line_total: number
    vendor_id?: string
}

interface SmartOrderData {
    [vendorName: string]: OrderItem[]
}

export function SmartOrderBoard({ initialData }: { initialData: SmartOrderData }) {
    const [orders, setOrders] = useState<SmartOrderData>(initialData)
    const [sendingVendors, setSendingVendors] = useState<Set<string>>(new Set())

    const handleSendOrder = async (vendorName: string, items: OrderItem[]) => {
        setSendingVendors(prev => new Set(prev).add(vendorName))

        try {
            await sendOrder(items)
            toast.success(`Order sent to ${vendorName}`, {
                description: `${items.length} items ordered successfully.`
            })

            // Remove the column from view locally
            setOrders(prev => {
                const next = { ...prev }
                delete next[vendorName]
                return next
            })
        } catch (error) {
            toast.error('Failed to send order')
        } finally {
            setSendingVendors(prev => {
                const next = new Set(prev)
                next.delete(vendorName)
                return next
            })
        }
    }

    const vendorNames = Object.keys(orders)

    if (vendorNames.length === 0) {
        return (
            <div className="flex h-full items-center justify-center border-2 border-dashed border-neutral-800 rounded-3xl">
                <div className="text-center">
                    <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Truck className="w-10 h-10 text-neutral-500" />
                    </div>
                    <h3 className="text-xl font-bold text-neutral-300">No Pending Orders</h3>
                    <p className="text-neutral-500">Inventory levels are optimal.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full gap-6 pb-4">
            {vendorNames.map((vendorName) => {
                const items = orders[vendorName]
                const totalCost = items.reduce((sum, item) => sum + (item.line_total || 0), 0)
                const isSending = sendingVendors.has(vendorName)

                return (
                    <div
                        key={vendorName}
                        className="flex-shrink-0 w-96 flex flex-col bg-neutral-800/50 backdrop-blur border border-neutral-700/50 rounded-2xl overflow-hidden"
                    >
                        {/* Vendor Header */}
                        <div className="p-5 border-b border-neutral-700 bg-neutral-900/50">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-white truncate">{vendorName}</h3>
                                <span className="bg-neutral-800 text-neutral-400 text-xs px-2 py-1 rounded font-mono">
                                    {items.length} items
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl">
                                <DollarSign className="w-5 h-5" />
                                {totalCost.toFixed(2)}
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {items.map((item, idx) => (
                                <div key={idx} className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-semibold text-neutral-200 text-sm">{item.name}</h4>
                                        <span className="text-white font-bold text-sm">${item.line_total?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                        <Package className="w-3 h-3" />
                                        <span>{item.qty_needed} {item.purchase_unit}</span>
                                        <span className="text-neutral-600">@ ${item.price}/{item.purchase_unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Action Footer */}
                        <div className="p-4 bg-neutral-900 border-t border-neutral-800">
                            <button
                                onClick={() => handleSendOrder(vendorName, items)}
                                disabled={isSending}
                                className="w-full h-12 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Order
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
