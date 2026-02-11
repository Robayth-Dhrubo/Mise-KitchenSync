'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

import {
    LayoutDashboard,
    ChefHat,
    UtensilsCrossed,
    Package,
    BarChart3,
    CalendarRange,
    Settings,
    LogOut,
    ShieldCheck,
    DollarSign,
    Puzzle,
    Headset,
    type LucideIcon,
} from 'lucide-react'

interface NavItem {
    href: string
    label: string
    icon: LucideIcon
    roles?: string[]
    accent?: string
}

const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/recipes', label: 'Recipes', icon: ChefHat },
    { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { href: '/inventory', label: 'Inventory', icon: Package },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/weekly-schedule', label: 'Schedule', icon: CalendarRange },
    { href: '/finance/margin-guard', label: 'Margin Guard', icon: DollarSign, accent: 'finance' },
    { href: '/integrations', label: 'Integrations', icon: Puzzle, roles: ['admin', 'manager'] },
    { href: '/service-desk', label: 'Service Desk', icon: Headset },
    { href: '/settings', label: 'Settings', icon: Settings },
]

export function NavContent({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [userRole, setUserRole] = useState<string>('staff')

    useEffect(() => {
        const fetchRole = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
                if (profile?.role) setUserRole(profile.role)
            }
        }
        fetchRole()
    }, [supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const filteredItems = navItems.filter(item => {
        if (!item.roles) return true
        return item.roles.includes(userRole)
    })

    return (
        <div className="h-full flex flex-col bg-sidebar text-primary-foreground">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-border">
                <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onNavigate}>
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                        <ChefHat className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="font-display font-bold text-lg tracking-tight text-primary-foreground">Mise.</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {filteredItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                                'flex items-center gap-4 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300',
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'text-muted-foreground hover:text-primary-foreground hover:bg-card'
                            )}
                        >
                            <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                            {item.label}
                        </Link>
                    )
                })}

                {/* Admin Link */}
                {(userRole === 'admin' || userRole === 'manager') && (
                    <>
                        <Separator className="my-3 bg-secondary" />
                        <Link
                            href="/admin/team"
                            onClick={onNavigate}
                            className={cn(
                                'flex items-center gap-4 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300',
                                pathname?.startsWith('/admin')
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'text-muted-foreground hover:text-primary-foreground hover:bg-card'
                            )}
                        >
                            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                            Admin
                        </Link>
                    </>
                )}
            </nav>

            {/* Footer */}
            <div className="px-3 pb-4 space-y-2">
                <Separator className="mb-3 bg-secondary" />
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-4 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-primary-foreground hover:bg-card transition-all duration-300 w-full"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </div>
    )
}
