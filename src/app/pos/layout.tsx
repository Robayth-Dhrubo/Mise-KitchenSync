'use client'

export default function PosLayout({
    children,
}: {
    children: React.ReactNode
}) {

    return (
        <div className="flex h-screen bg-background overflow-hidden relative">
            <main className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    {children}
                </div>
            </main>
        </div>
    )
}
