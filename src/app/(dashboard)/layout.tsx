import { MobileNav } from '@/components/layout/mobile-nav'
import { DesktopSidebar } from '@/components/layout/desktop-sidebar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-black overflow-x-hidden">
            {/* Desktop Sidebar */}
            <div className="fixed inset-y-0 z-50">
                <DesktopSidebar />
            </div>

            {/* Mobile Header */}
            <MobileNav />

            {/* Main Content */}
            <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen relative">
                <div className="p-6 md:p-12 max-w-[1600px] mx-auto animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    )
}
