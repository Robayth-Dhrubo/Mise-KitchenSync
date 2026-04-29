'use client'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-background">
            <main className="flex-1 min-h-screen overflow-y-auto">
                <div className="p-6 lg:p-8 max-w-[1920px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
