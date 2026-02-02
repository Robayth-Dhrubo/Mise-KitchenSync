'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { NavContent } from '@/components/layout/nav-content'

export function MobileNav() {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800 z-50 flex items-center px-4">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                        <Menu className="w-6 h-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 bg-neutral-900 border-neutral-800">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <NavContent onNavigate={() => setOpen(false)} />
                </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-2 ml-4">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <ChefHat className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white tracking-wide">Mise</span>
            </Link>
        </header>
    )
}
