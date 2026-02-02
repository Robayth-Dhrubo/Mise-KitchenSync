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
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-neutral-900/50 border border-white/10 rounded-3xl p-8 text-center space-y-6 backdrop-blur-xl">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-10 h-10 text-yellow-500" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">Access Pending</h1>
                    <p className="text-neutral-400">
                        Your account has been created, but requires administrator approval before you can access the system.
                    </p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 text-sm text-neutral-300">
                    <p>Please contact your manager or IT administrator to approve your account.</p>
                </div>

                <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full border-white/10 text-white hover:bg-white/5 hover:text-white"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </div>
    )
}
