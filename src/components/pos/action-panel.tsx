'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Flame, CreditCard, CheckCircle2 } from 'lucide-react'
import { fireOrder } from '@/lib/actions/pos'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ActionPanelProps {
    orderId: string
    status: 'draft' | 'fired' | 'paid'
    onPay: () => void
}

export default function ActionPanel({ orderId, status, onPay }: ActionPanelProps) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleFire = async () => {
        setIsLoading(true)
        try {
            await fireOrder(orderId)
            toast.success('Order fired to kitchen')
            router.refresh()
        } catch (error) {
            toast.error('Failed to fire order')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    if (status === 'fired') {
        return (
            <Button
                size="lg"
                onClick={onPay}
                className="w-full h-20 bg-blue-600 hover:bg-blue-500 text-foreground text-xl font-black uppercase tracking-tighter rounded-2xl shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
            >
                <div className="flex items-center gap-3">
                    <CreditCard className="w-6 h-6" />
                    Pay / Close Ticket
                </div>
            </Button>
        )
    }

    if (status === 'draft') {
        return (
            <Button
                size="lg"
                disabled={isLoading}
                onClick={handleFire}
                className="w-full h-20 bg-primary hover:bg-primary text-foreground text-xl font-black uppercase tracking-tighter rounded-2xl shadow-xl shadow-[#5A4820]/20 active:scale-95 transition-all group"
            >
                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Syncing...
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Flame className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        Fire Order
                    </div>
                )}
            </Button>
        )
    }

    return (
        <Button disabled variant="outline" className="w-full h-20 text-muted-foreground font-bold uppercase tracking-widest bg-card border-white/10">
            Ticket Closed
        </Button>
    )
}
