'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChefHat, BookOpen, Utensils } from 'lucide-react'
import { KitchenDisplay } from './kitchen-display'
import { GuestMenu } from '@/components/guest/guest-menu'

interface KitchenHubProps {
    initialOrders: any[]
    recipes: any[]
    userId: string
}

export function KitchenHub({ initialOrders, recipes, userId }: KitchenHubProps) {
    const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header with Tab Navigation */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <ChefHat className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter uppercase font-display">
                            Kitchen
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {activeTab === 'orders' ? 'Order Management' : 'Menu Management'}
                        </p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-zinc-900 rounded-xl p-1.5">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'orders'
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                                : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                        )}
                    >
                        <Utensils className="w-4 h-4" />
                        Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('menu')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'menu'
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                                : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                        )}
                    >
                        <BookOpen className="w-4 h-4" />
                        Menu
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'orders' ? (
                    <KitchenDisplay initialOrders={initialOrders} />
                ) : (
                    <div className="relative min-h-full -m-6">
                        <GuestMenu
                            recipes={recipes}
                            room="ADMIN"
                            hotelId={userId}
                            isPreview={true}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
