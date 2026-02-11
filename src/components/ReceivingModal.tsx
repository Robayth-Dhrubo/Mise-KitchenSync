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
                className="absolute inset-0 bg-sidebar/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card border border-border rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#5A4820]/50 rounded-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-foreground">Confirm Receipt</h2>
                            <p className="text-xs text-muted-foreground">{vendorName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-[#5A4820]/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-primary mb-2">Items Received!</h3>
                            <p className="text-muted-foreground text-sm">Inventory has been updated successfully.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-foreground mb-6">
                                Confirm receipt of items? <span className="text-primary font-medium">Inventory will be updated.</span>
                            </p>

                            {/* Order Items Preview */}
                            {orderItems.length > 0 && (
                                <div className="bg-secondary rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
                                    <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                                        Items to receive
                                    </h4>
                                    <div className="space-y-2">
                                        {orderItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span className="text-foreground">{item.name}</span>
                                                <span className="text-primary">{item.quantity} {item.unit}</span>
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
                                    className="flex-1 py-3 px-4 border border-border text-foreground rounded-lg font-medium hover:bg-secondary transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmReceive}
                                    disabled={loading}
                                    className="flex-1 py-3 px-4 bg-primary text-foreground rounded-lg font-medium hover:bg-primary disabled:opacity-50 transition flex items-center justify-center gap-2"
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
