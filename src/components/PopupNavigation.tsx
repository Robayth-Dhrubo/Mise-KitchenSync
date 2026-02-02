'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, BookOpen, UtensilsCrossed, Package, BarChart3, Settings, MessageSquare, ChefHat, LogOut, Menu, Scan, Calendar, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/menu', label: 'Menu', icon: BookOpen },
    { href: '/kitchen-manager', label: 'Kitchen Manager', icon: ChefHat },
    { href: '/weekly-schedule', label: 'Weekly Schedule', icon: Calendar },
    { href: '/inventory', label: 'Inventory & Orders', icon: Package },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings },
]

export function PopupNavigation() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [open, setOpen] = useState(false)

    const isAuthPage = pathname === '/login' || pathname === '/signup'
    const isLandingPage = pathname === '/'
    const isDashboardPage = pathname.startsWith('/dashboard') ||
        pathname.startsWith('/menu') ||
        pathname.startsWith('/kitchen-manager') ||
        pathname.startsWith('/weekly-schedule') ||
        pathname.startsWith('/inventory') ||
        pathname.startsWith('/analytics') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/pos') ||
        pathname.startsWith('/recipes') ||
        pathname.startsWith('/admin')
    if (isAuthPage || isLandingPage || isDashboardPage) return null

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) {
            toast.error('Error signing out', { description: error.message })
        } else {
            toast.success('Signed out successfully')
            router.push('/login')
        }
    }

    return (
        <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-md">
            <div className="flex h-16 items-center px-6 justify-between">
                {/* Logo (Visible on all sizes, refined positioning) */}
                <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
                    <ChefHat className="h-5 w-5 text-emerald-500" />
                    <span className="text-lg font-bold tracking-wide text-white font-display">Mise</span>
                </Link>

                {/* Mobile Menu Trigger (Swapped to right side) */}
                <div className="lg:hidden">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72 border-l-neutral-800 bg-neutral-900 p-0 text-neutral-100 border-l">
                            <SheetHeader className="h-16 flex items-center border-b border-neutral-800 px-6">
                                <SheetTitle className="flex items-center gap-2 text-neutral-100">
                                    <ChefHat className="h-6 w-6 text-emerald-500" />
                                    <span className="text-xl font-bold tracking-tight">Mise</span>
                                </SheetTitle>
                            </SheetHeader>

                            <div className="flex flex-col h-[calc(100vh-64px)] justify-between">
                                <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
                                    {navItems.map((item) => {
                                        const Icon = item.icon
                                        const isActive = pathname === item.href

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                                    isActive
                                                        ? "bg-neutral-800 text-white"
                                                        : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {item.label}
                                            </Link>
                                        )
                                    })}
                                </nav>

                                <div className="p-4 border-t border-neutral-800">
                                    <div className="mb-4 rounded-lg bg-neutral-800/50 p-4">
                                        <p className="text-xs font-medium text-neutral-400">Service Status</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-xs text-emerald-500">Online</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSignOut}
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-1 mx-6">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden lg:inline">{item.label}</span>
                                <span className="lg:hidden sr-only">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* Desktop Right Side (Sign Out) */}
                <div className="hidden lg:flex items-center gap-4">
                    <button
                        onClick={handleSignOut}
                        className="text-neutral-400 hover:text-white transition-colors p-2"
                        title="Sign Out"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
    )
}
