'use client'

import { ShieldAlert, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ApprovalPendingPage() {
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-10">
                <div className="text-center space-y-6">
                    <div className="mx-auto w-14 h-14 bg-muted border border-border rounded-2xl flex items-center justify-center">
                        <ShieldAlert className="w-7 h-7 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Access Pending</h1>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.3em]">Awaiting Approval</p>
                    </div>
                </div>

                <div className="bg-white border border-border rounded-2xl p-6 space-y-5 shadow-sm">
                    <p className="text-muted-foreground text-sm leading-relaxed text-center">
                        Your account has been created, but requires administrator approval before you can access the system.
                    </p>
                    <div className="h-px bg-secondary" />
                    <p className="text-muted-foreground text-xs text-center">
                        Please contact your manager to approve your account.
                    </p>
                    <Button
                        onClick={handleLogout}
                        className="w-full h-11 bg-muted hover:bg-secondary text-foreground font-medium text-sm border border-border rounded-xl transition-all"
                    >
                        <LogOut className="w-3.5 h-3.5 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    )
}
