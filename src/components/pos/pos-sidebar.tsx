'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    ChefHat,
    LayoutGrid,
    BedDouble,
    Receipt,
    type LucideIcon,
} from 'lucide-react'

interface PosNavItem {
    href: string
    label: string
    icon: LucideIcon
}

const posNavItems: PosNavItem[] = [
    { href: '/pos', label: 'Floor Map', icon: LayoutGrid },
    { href: '/pos/ird', label: 'Room Service', icon: BedDouble },
    { href: '/pos/ledger', label: 'Ledger', icon: Receipt },
]

export function PosSidebar() {
    const pathname = usePathname()

    return (
        <div className="w-20 h-full bg-sidebar flex flex-col items-center py-6 gap-6 border-r border-border">
            {/* Logo */}
            <Link href="/dashboard" className="group">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                    <ChefHat className="w-6 h-6 text-primary-foreground" />
                </div>
            </Link>

            {/* Divider */}
            <div className="w-8 h-px bg-secondary" />

            {/* Nav Items */}
            <nav className="flex flex-col items-center gap-4 flex-1">
                {posNavItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all duration-300 group',
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                    : 'text-muted-foreground hover:text-primary-foreground hover:bg-card'
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
