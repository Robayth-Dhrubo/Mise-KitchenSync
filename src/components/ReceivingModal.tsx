'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, X, Check, Loader2 } from 'lucide-react'

interface ReceivingModalProps {
    isOpen: boolean
    onClose: () => void
    orderId: string
    orderItems?: Array<{
        name: string
        quantity: number
        unit: string
    }>
    vendorName?: string
    onSuccess?: () => void
}

export function ReceivingModal({
    isOpen,
    onClose,
    orderId,
    orderItems = [],
    vendorName = 'Vendor',
    onSuccess
}: ReceivingModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    async function handleConfirmReceive() {
        setLoading(true)
        setError(null)

        const supabase = createClient()

        const { data, error: rpcError } = await supabase.rpc('receive_purchase_order', {
            p_order_id: orderId
        })

        if (rpcError) {
            setError(rpcError.message)
            setLoading(false)
            return
        }

        if (data && !data.success) {
            setError(data.error || 'Failed to receive order')
            setLoading(false)
            return
        }

        setSuccess(true)
        setLoading(false)

        // Callback and close after delay
        setTimeout(() => {
            onSuccess?.()
            onClose()
            setSuccess(false)
        }, 1500)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-900/50 rounded-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white">Confirm Receipt</h2>
                            <p className="text-xs text-zinc-400">{vendorName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-emerald-400 mb-2">Items Received!</h3>
                            <p className="text-zinc-400 text-sm">Inventory has been updated successfully.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-zinc-300 mb-6">
                                Confirm receipt of items? <span className="text-emerald-400 font-medium">Inventory will be updated.</span>
                            </p>

                            {/* Order Items Preview */}
                            {orderItems.length > 0 && (
                                <div className="bg-zinc-800 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
                                    <h4 className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wide">
                                        Items to receive
                                    </h4>
                                    <div className="space-y-2">
                                        {orderItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span className="text-zinc-300">{item.name}</span>
                                                <span className="text-emerald-400">{item.quantity} {item.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 px-4 border border-zinc-700 text-zinc-300 rounded-lg font-medium hover:bg-zinc-800 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmReceive}
                                    disabled={loading}
                                    className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 disabled:opacity-50 transition flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Confirm Receipt
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
