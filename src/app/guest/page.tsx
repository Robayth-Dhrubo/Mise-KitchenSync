'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function GuestLoginPage() {
    const [guestName, setGuestName] = useState('')
    const [roomNumber, setRoomNumber] = useState('')
    const router = useRouter()

    const handleEnter = (e: React.FormEvent) => {
        e.preventDefault()
        if (guestName.trim() && roomNumber.trim()) {
            try {
                localStorage.setItem('guest_name', guestName.trim())
            } catch {
                // ignore localStorage errors
            }
            router.push(`/guest/${roomNumber.trim()}`)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-sm w-full space-y-12">
                <div className="text-center space-y-5">
                    <div className="mx-auto w-14 h-14 bg-muted border border-border rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-foreground tracking-tight">Guest Portal</h1>
                        <p className="text-muted-foreground font-medium text-sm">Browse our curated menu and place your order.</p>
                    </div>
                </div>

                <form onSubmit={handleEnter} className="space-y-5">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-0.5">Your Name</label>
                            <Input id="name" placeholder="How shall we address you?"
                                className="h-14 text-base bg-white border-border rounded-xl text-center text-foreground font-medium placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 transition-all"
                                value={guestName} onChange={(e) => setGuestName(e.target.value)} autoFocus />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-0.5">Room or Table</label>
                            <Input id="room" placeholder="e.g. Room 201, Table 5"
                                className="h-14 text-base bg-white border-border rounded-xl text-center text-foreground font-medium placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 transition-all"
                                value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
                        </div>
                    </div>
                    <Button type="submit"
                        className="w-full h-14 bg-primary text-primary-foreground font-semibold text-base rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-sm flex items-center justify-center gap-2.5 group"
                        disabled={!roomNumber.trim() || !guestName.trim()}>
                        View Menu
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                </form>

                <div className="flex flex-col items-center gap-3">
                    <div className="h-px w-10 bg-secondary" />
                    <Link href="/" className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.25em]">Powered by Mise</Link>
                </div>
            </div>
        </div>
    )
}
