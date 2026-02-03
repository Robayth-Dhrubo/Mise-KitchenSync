'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Map, Coffee, History, Settings, ChefHat, Calendar, Utensils, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Reservations', href: '/pos/reservations', icon: Calendar },
    { name: 'Floor', href: '/pos', icon: Map },
    { name: 'Place Order', href: '/pos/terminal', icon: Utensils },
    { name: 'IRD', href: '/pos/ird', icon: Coffee },
    { name: 'Ledger', href: '/pos/ledger', icon: History },
]

export function PosSidebar() {
    const pathname = usePathname()

    return (
        <div className="w-24 bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-8 gap-8 shrink-0">
            {/* Brand Logo */}
            <Link href="/dashboard" className="mb-4 flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20 transition-transform active:scale-95">
                    <ChefHat className="w-5 h-5 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Mise</span>
            </Link>

            <div className="flex-1 flex flex-col items-center gap-6 overflow-y-auto no-scrollbar w-full py-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/pos' && pathname.startsWith(item.href) && item.href !== '/dashboard')
                    const Icon = item.icon

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex flex-col items-center gap-2 transition-all p-2 rounded-2xl w-16",
                                isActive ? "text-emerald-500" : "text-neutral-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                                isActive ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/30" : "bg-white/5 group-hover:bg-white/10"
                            )}>
                                <Icon className={cn("w-6 h-6", isActive ? "text-white" : "text-neutral-500 group-hover:text-white")} />
                            </div>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    )
                })}
            </div>

            <div className="mt-auto flex flex-col items-center gap-4 mb-4">
                <Link
                    href="/settings"
                    className="p-3 text-neutral-500 hover:text-white transition-colors rounded-xl hover:bg-white/5"
                    title="Settings"
                >
                    <Settings className="w-6 h-6" />
                </Link>
                <button
                    onClick={async () => {
                        const supabase = createClient()
                        await supabase.auth.signOut()
                        window.location.href = '/login'
                    }}
                    className="p-3 text-neutral-500 hover:text-red-500 transition-colors rounded-xl hover:bg-red-500/10"
                    title="Sign Out"
                >
                    <LogOut className="w-6 h-6" />
                </button>
            </div>
        </div>
    )
}
