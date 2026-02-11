'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SmartOrderList } from "./smart-order-list"
import { OrderHistory } from "./order-history"
import { Ingredient, Supplier, VendorProduct } from "@/lib/types/database"

interface SmartOrderTabsProps {
    ingredients: Ingredient[]
    history: any[]
    vendors: Supplier[]
    vendorProducts: VendorProduct[]
}

export function SmartOrderTabs({ ingredients, history, vendors, vendorProducts }: SmartOrderTabsProps) {
    return (
        <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-card border border-white/5">
                <TabsTrigger
                    value="new"
                    className="data-[state=active]:bg-primary data-[state=active]:text-foreground uppercase font-bold tracking-widest"
                >
                    New Order
                </TabsTrigger>
                <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-primary data-[state=active]:text-foreground uppercase font-bold tracking-widest"
                >
                    Order History
                </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-0">
                <SmartOrderList
                    ingredients={ingredients}
                    vendors={vendors}
                    vendorProducts={vendorProducts}
                    activeOrders={history}
                />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
                <OrderHistory orders={history} />
            </TabsContent>
        </Tabs>
    )
}

