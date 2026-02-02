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
    Users,
    AlertCircle,
    Calendar,
    Link2,
    Store,
    Gauge,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ReportIssueDialog } from '@/components/layout/report-issue-dialog'

// Main navigation
const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'owner', 'chef', 'foh'], group: 'main' },
    { href: '/admin/team', label: 'Team & IAM', icon: Users, roles: ['admin', 'owner'], group: 'main' },
    { href: '/service-desk', label: 'Service Desk', icon: AlertCircle, roles: ['admin', 'owner'], group: 'main' },

    // Operations Group
    { href: '/pos', label: 'Front Desk', icon: Store, roles: ['foh', 'admin', 'owner'], group: 'operations' },
    { href: '/menu', label: 'Menu', icon: BookOpen, roles: ['chef', 'foh', 'admin', 'owner'], group: 'operations' },
    { href: '/kitchen-manager', label: 'Kitchen Manager', icon: ChefHat, roles: ['chef', 'admin', 'owner'], group: 'operations' },
    { href: '/weekly-schedule', label: 'Weekly Schedule', icon: Calendar, roles: ['chef', 'admin', 'owner'], group: 'operations' },
    { href: '/inventory', label: 'Inventory & Orders', icon: Package, roles: ['chef', 'admin', 'owner'], group: 'operations' },
    { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['chef', 'admin', 'owner'], group: 'operations' },

    // Settings Group
    { href: '/settings', label: 'Settings', icon: Settings, roles: ['chef', 'admin', 'owner'], group: 'settings' },
]

export function NavContent({ onNavigate, hideLogo = false }: { onNavigate?: () => void; hideLogo?: boolean }) {
    const pathname = usePathname()
    const router = useRouter()
    const [userRole, setUserRole] = useState<'chef' | 'foh' | 'admin' | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const getProfile = async () => {
            try {
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
                    }
                }
            } catch (error) {
                console.error('Error fetching profile:', error)
            } finally {
                setIsLoading(false)
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
        if (!userRole) return false
        // Show item if user's role is in the allowed roles list
        return item.roles.includes(userRole)
    })

    return (
        <div className="flex flex-col h-full bg-black/20 backdrop-blur-xl border-r border-white/5">
            {/* Logo */}
            {!hideLogo && (
                <div className="p-6">
                    <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                            <ChefHat className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-wide">Mise</h1>
                        </div>
                    </Link>
                </div>
            )}

            {/* No Toggle anymore - consistent view based on role */}

            <div className="px-6">
                <Separator className="bg-white/5" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-6 space-y-6 overflow-y-auto min-h-0">
                {isLoading ? (
                    <div className="space-y-4 animate-pulse">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-10 bg-white/5 rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Main Group (Platform) */}
                        {filteredItems.some(i => i.group === 'main') && (
                            <div className="space-y-1">
                                <p className="px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Platform</p>
                                {filteredItems.filter(i => i.group === 'main').map((item) => {
                                    const Icon = item.icon
                                    const isActive = pathname === item.href ||
                                        (item.href !== '/dashboard' && pathname.startsWith(item.href))

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onNavigate}
                                            className={cn(
                                                'flex items-center gap-4 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300',
                                                isActive
                                                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20'
                                                    : 'text-neutral-500 hover:text-white hover:bg-white/5'
                                            )}
                                        >
                                            <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-neutral-500")} />
                                            {item.label}
                                        </Link>
                                    )
                                })}
                            </div>
                        )}

                        {/* Operations Group */}
                        {filteredItems.some(i => i.group === 'operations') && (
                            <div className="space-y-1 pt-2">
                                <p className="px-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Operations</p>
                                {filteredItems.filter(i => i.group === 'operations').map((item) => {
                                    const Icon = item.icon
                                    const isActive = pathname === item.href || pathname.startsWith(item.href)

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onNavigate}
                                            className={cn(
                                                'flex items-center gap-4 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300',
                                                isActive
                                                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20'
                                                    : 'text-neutral-500 hover:text-white hover:bg-white/5'
                                            )}
                                        >
                                            <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-neutral-500")} />
                                            {item.label}
                                        </Link>
                                    )
                                })}
                            </div>
                        )}

                        {/* Settings Group (No Header as requested) */}
                        {filteredItems.some(i => i.group === 'settings') && (
                            <div className="space-y-1 pt-2">
                                {filteredItems.filter(i => i.group === 'settings').map((item) => {
                                    const Icon = item.icon
                                    const isActive = pathname === item.href

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onNavigate}
                                            className={cn(
                                                'flex items-center gap-4 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300',
                                                isActive
                                                    ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20'
                                                    : 'text-neutral-500 hover:text-white hover:bg-white/5'
                                            )}
                                        >
                                            <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-neutral-500")} />
                                            {item.label}
                                        </Link>
                                    )
                                })}
                            </div>
                        )}

                        {/* Contact (Report Issue) - Only for Chef/FOH. Admin/Owner uses Service Desk link above. */}
                        {!['admin', 'owner'].includes(userRole || '') && (
                            <ReportIssueDialog>
                                <button className="w-full flex items-center gap-4 px-4 py-2 rounded-xl text-sm font-bold text-neutral-500 hover:text-emerald-400 hover:bg-white/5 transition-all duration-300">
                                    <AlertCircle className="w-5 h-5" />
                                    Reported Issues
                                </button>
                            </ReportIssueDialog>
                        )}
                    </>
                )}
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
