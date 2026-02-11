'use client'

import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, ChefHat } from 'lucide-react'
import { NavContent } from './nav-content'
import { useState } from 'react'

export function MobileNav() {
    const [open, setOpen] = useState(false)

    return (
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="border border-white/20 bg-white/5 text-white hover:bg-primary hover:text-primary-foreground h-10 w-10 transition-colors">
                            <Menu className="w-6 h-6" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-72 bg-sidebar border-border">
                        <SheetHeader className="sr-only">
                            <SheetTitle>Navigation</SheetTitle>
                        </SheetHeader>
                        <NavContent onNavigate={() => setOpen(false)} />
                    </SheetContent>
                </Sheet>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                        <ChefHat className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-display font-bold text-base tracking-tight text-primary-foreground">Mise.</span>
                </div>
            </div>
        </div>
    )
}
