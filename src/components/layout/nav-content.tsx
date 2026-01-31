'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard,
    UtensilsCrossed,
    BookOpen,
    Package,
    Settings,
    LogOut,
    ChefHat,
    Zap,
    ShoppingCart,
    BarChart3,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, role: 'chef' },
    { href: '/pos', label: 'Front Desk POS', icon: Zap, role: 'foh' },
    { href: '/kitchen', label: 'Kitchen KDS', icon: ChefHat, role: 'chef' },
    { href: '/pantry', label: 'Pantry Stock', icon: UtensilsCrossed, role: 'chef' },
    { href: '/menu', label: 'Global Menu', icon: BookOpen, role: 'chef' },
    { href: '/smart-order', label: 'Procurement', icon: ShoppingCart, role: 'chef' },
    { href: '/reports', label: 'Business AI', icon: BarChart3, role: 'chef' },
    { href: '/settings', label: 'Settings', icon: Settings, role: 'chef' },
]

export function NavContent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()
    const router = useRouter()
    const [userRole, setUserRole] = useState<'chef' | 'foh' | null>(null)
    const [viewMode, setViewMode] = useState<'foh' | 'chef'>('chef')

    useEffect(() => {
        const getProfile = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setUserRole(profile.role as any)
                    setViewMode(profile.role === 'foh' ? 'foh' : 'chef')
                }
            }
        }
        getProfile()
    }, [])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const filteredItems = navItems.filter(item => {
        if (viewMode === 'chef') return true // Chef sees everything
        return item.role === 'foh' // FOH sees only designated items
    })

    return (
        <div className="flex flex-col h-full bg-black/20 backdrop-blur-xl border-r border-white/5">
            {/* Logo */}
            <div className="p-8">
                <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onNavigate}>
                    <div className="w-12 h-12 bg-emerald-600 rounded-[14px] flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:rotate-6 transition-transform">
                        <ChefHat className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter italic">Mise</h1>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Kitchen OS</p>
                    </div>
                </Link>
            </div>

            {userRole === 'chef' && (
                <div className="px-6 mb-6">
                    <div className="bg-white/5 p-1 rounded-2xl border border-white/5 flex gap-1">
                        <button
                            onClick={() => setViewMode('foh')}
                            className={cn(
                                "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                                viewMode === 'foh' ? "bg-emerald-600 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                            )}
                        >
                            FOH
                        </button>
                        <button
                            onClick={() => setViewMode('chef')}
                            className={cn(
                                "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                                viewMode === 'chef' ? "bg-emerald-600 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                            )}
                        >
                            Chef
                        </button>
                    </div>
                </div>
            )}

            <div className="px-6">
                <Separator className="bg-white/5" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-6 space-y-2">
                {filteredItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                                'flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300',
                                isActive
                                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20'
                                    : 'text-neutral-500 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-neutral-500")} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Logout */}
            <div className="p-6 border-t border-white/5">
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start gap-4 h-14 rounded-2xl text-neutral-500 hover:text-red-400 hover:bg-red-500/10 font-bold"
                >
                    <LogOut className="w-5 h-5" />
                    Sign out
                </Button>
            </div>
        </div>
    )
}
