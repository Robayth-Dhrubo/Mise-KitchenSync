'use client'

import { NavContent } from '@/components/layout/nav-content'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-background">
            {/* Left Sidebar - Always visible on lg+ screens */}
            <aside className="hidden lg:block fixed left-0 top-0 w-64 h-screen z-50">
                <NavContent />
            </aside>

            {/* Mobile Navigation */}
            <MobileNav />

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen overflow-y-auto">
                <div className="p-6 lg:p-8 max-w-[1920px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
