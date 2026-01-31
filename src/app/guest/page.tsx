'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Hotel, Star, ArrowRight } from 'lucide-react'

export default function GuestLoginPage() {
    const [roomNumber, setRoomNumber] = useState('')
    const router = useRouter()

    const handleEnter = (e: React.FormEvent) => {
        e.preventDefault()
        if (roomNumber.trim()) {
            router.push(`/guest/${roomNumber}`)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />

            <div className="max-w-md w-full space-y-12 relative">
                <div className="text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center shadow-2xl backdrop-blur-xl rotate-3">
                        <Hotel className="w-8 h-8 text-white transition-transform group-hover:rotate-12" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-white tracking-tighter leading-tight italic font-display">Digital Menu.</h1>
                        <p className="text-neutral-500 font-medium text-lg tracking-tight">Curated dining at your station.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <form onSubmit={handleEnter} className="space-y-6">
                        <div className="relative group">
                            <Input
                                id="room"
                                placeholder="ROOM / TABLE"
                                className="h-24 text-5xl font-black bg-neutral-950 border-white/5 rounded-[32px] text-center focus:border-emerald-500/50 transition-all placeholder:text-white/20 tracking-[0.1em] shadow-2xl shadow-emerald-500/5 text-white font-display"
                                value={roomNumber}
                                onChange={(e) => setRoomNumber(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-[32px] transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-3 group italic font-display"
                            disabled={!roomNumber.trim()}
                        >
                            INVOKE MENU
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </form>

                    <div className="flex flex-col items-center gap-4">
                        <div className="h-px w-12 bg-neutral-800" />
                        <div className="flex justify-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
                            <span className="flex items-center gap-2 italic uppercase">MISE OPERATING SYSTEM • BUILD v4.0.2</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
