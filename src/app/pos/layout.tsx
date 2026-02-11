import { PosSidebar } from '@/components/pos/pos-sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function PosLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <aside className="hidden lg:block h-full shrink-0">
                <PosSidebar />
            </aside>
            <div className="lg:hidden">
                <MobileNav />
            </div>
            <main className="flex-1 overflow-hidden flex flex-col pt-16 lg:pt-0">
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    {children}
                </div>
            </main>
        </div>
    )
}
