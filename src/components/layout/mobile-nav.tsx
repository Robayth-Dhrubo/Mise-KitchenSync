'use client'

import { Menu, ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { NavContent } from '@/components/layout/nav-content'

export function MobileNav() {
    return (
        <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800 z-50 flex items-center px-4">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                        <Menu className="w-6 h-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 bg-neutral-900 border-neutral-800">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <NavContent onNavigate={() => { }} />
                </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 ml-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center">
                    <ChefHat className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">Mise</span>
            </div>
        </header>
    )
}
