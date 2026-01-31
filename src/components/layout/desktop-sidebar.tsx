'use client'

import { NavContent } from '@/components/layout/nav-content'

export function DesktopSidebar() {
    return (
        <aside className="hidden lg:flex lg:w-72 lg:flex-col h-full">
            <NavContent />
        </aside>
    )
}
