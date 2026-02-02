'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Send, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent } from '@/components/ui/dialog'

import { type Ingredient, type Supplier, type VendorProduct } from '@/lib/types/database'
import { VendorPriceManager } from '@/components/vendors/vendor-price-manager'

interface SmartOrderListProps {
    ingredients: Ingredient[]
    vendors: Supplier[]
    vendorProducts: VendorProduct[]
    activeOrders: any[]
}

export function SmartOrderList({ ingredients, vendors, vendorProducts, activeOrders }: SmartOrderListProps) {
    const router = useRouter()
    const supabase = createClient()

    // State for vendor price management dialog
    const [managePricesItem, setManagePricesItem] = useState<any | null>(null)

    // 1. Identify items below par (or default threshold of 5)
    const lowStockItems = useMemo(() => {
        return ingredients.filter(i => {
            const effectivePar = i.par_level || 5 // Match the "Red Pulse" threshold from Pantry view
            return i.current_stock < effectivePar
        })
    }, [ingredients])

    // 4. Manually added items (IDs)
    const [addedIds, setAddedIds] = useState<string[]>([])
    // 5. Manually removed items (IDs)
    const [removedIds, setRemovedIds] = useState<string[]>([])
    // 6. Search state for adding items
    const [itemSearch, setItemSearch] = useState('')
    const [isAddOpen, setIsAddOpen] = useState(false)

    // Ref for click-outside detection
    const popupRef = useRef<HTMLDivElement>(null)

    // Click outside to close popup
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsAddOpen(false)
                setItemSearch('')
            }
        }

        if (isAddOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isAddOpen])

    // Compute the final list of items to display
    const visibleItems = useMemo(() => {
        // Start with ingredients that are either low stock OR manually added
        const candidates = ingredients.filter(i => {
            // Check if already ordered
            const isOrdered = activeOrders.some(o =>
                o.ingredient_id === i.id &&
                (o.status === 'ordered' || o.status === 'pending')
            )
            if (isOrdered) return false

            const isLow = (i.par_level || 5) > i.current_stock
            const isAdded = addedIds.includes(i.id)
            return isLow || isAdded
        })

        // Filter out removed items
        return candidates.filter(i => !removedIds.includes(i.id))
    }, [ingredients, addedIds, removedIds, activeOrders])

    // 2. State for order quantities (default to par - stock)
    const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {}
        const initialLow = ingredients.filter(i => (i.par_level || 5) > i.current_stock)
        initialLow.forEach(i => {
            const effectivePar = i.par_level || 5
            initial[i.id] = Math.max(0, effectivePar - i.current_stock)
        })
        return initial
    })

    // 3. State for selected vendor per ingredient
    const [selectedVendors, setSelectedVendors] = useState<Record<string, { vendorId: string; vendorName: string; price: number }>>(() => {
        const initial: Record<string, { vendorId: string; vendorName: string; price: number }> = {}
        // Auto-select the cheapest vendor for each low stock item
        const initialLow = ingredients.filter(i => (i.par_level || 5) > i.current_stock)
        initialLow.forEach(ingredient => {
            const options = vendorProducts.filter(vp => vp.ingredient_id === ingredient.id)
            if (options.length > 0) {
                // Find cheapest
                const cheapest = options.reduce((min, vp) => vp.vendor_price < min.vendor_price ? vp : min, options[0])
                const vendor = vendors.find(v => v.id === cheapest.vendor_id)
                initial[ingredient.id] = {
                    vendorId: cheapest.vendor_id,
                    vendorName: vendor?.name || 'Unknown',
                    price: cheapest.vendor_price
                }
            } else {
                // Use ingredient's default price if no vendor products
                initial[ingredient.id] = {
                    vendorId: '',
                    vendorName: 'Direct',
                    price: ingredient.purchase_price
                }
            }
        })
        return initial
    })

    // Helper to add item with vendor
    const handleAddItem = (ingredientId: string, vendorId?: string, vendorName?: string, vendorPrice?: number) => {
        if (!addedIds.includes(ingredientId)) {
            setAddedIds(prev => [...prev, ingredientId])
            if (removedIds.includes(ingredientId)) {
                setRemovedIds(prev => prev.filter(id => id !== ingredientId))
            }
            const ingredient = ingredients.find(i => i.id === ingredientId)
            if (ingredient) {
                setOrderQuantities(prev => ({
                    ...prev,
                    [ingredientId]: (ingredient.par_level || 5) > ingredient.current_stock
                        ? (ingredient.par_level || 5) - ingredient.current_stock
                        : 1
                }))
                // Set vendor selection
                if (vendorId && vendorName && vendorPrice !== undefined) {
                    setSelectedVendors(prev => ({
                        ...prev,
                        [ingredientId]: { vendorId, vendorName, price: vendorPrice }
                    }))
                } else {
                    // Find cheapest vendor for this ingredient
                    const options = vendorProducts.filter(vp => vp.ingredient_id === ingredientId)
                    if (options.length > 0) {
                        const cheapest = options.reduce((min, vp) => vp.vendor_price < min.vendor_price ? vp : min, options[0])
                        const vendor = vendors.find(v => v.id === cheapest.vendor_id)
                        setSelectedVendors(prev => ({
                            ...prev,
                            [ingredientId]: {
                                vendorId: cheapest.vendor_id,
                                vendorName: vendor?.name || 'Unknown',
                                price: cheapest.vendor_price
                            }
                        }))
                    } else {
                        setSelectedVendors(prev => ({
                            ...prev,
                            [ingredientId]: {
                                vendorId: '',
                                vendorName: 'Direct',
                                price: ingredient.purchase_price
                            }
                        }))
                    }
                }
            }
        }
        setIsAddOpen(false)
        setItemSearch('')
        toast.success('Item added to order')
    }

    const handleRemoveItem = (ingredientId: string) => {
        setRemovedIds(prev => [...prev, ingredientId])
        setOrderQuantities(prev => {
            const next = { ...prev }
            delete next[ingredientId]
            return next
        })
        toast.info('Item removed from order')
    }

    const handleReset = () => {
        setAddedIds([])
        setRemovedIds([])
        // Recalculate defaults
        const initial: Record<string, number> = {}
        lowStockItems.forEach(i => {
            const effectivePar = i.par_level || 5
            initial[i.id] = Math.max(0, effectivePar - i.current_stock)
        })
        setOrderQuantities(initial)
        toast.success('Restored to Smart Suggestions')
    }

    const handleQuantityChange = (id: string, val: string) => {
        setOrderQuantities(prev => ({ ...prev, [id]: parseFloat(val) || 0 }))
    }

    // 3. Mutation to create shopping list items / "Send Order"
    const sendOrderMutation = useMutation({
        mutationFn: async () => {
            // Build items with vendor info
            const itemsToOrder = Object.entries(orderQuantities)
                .filter(([id, qty]) => qty > 0 && visibleItems.find(v => v.id === id))
                .map(([id, qty]) => {
                    const vendorInfo = selectedVendors[id]
                    return {
                        ingredient_id: id,
                        quantity_to_order: qty,
                        vendor_id: vendorInfo?.vendorId || null,
                        vendor_price: vendorInfo?.price || null,
                        status: 'ordered'
                    }
                })

            if (itemsToOrder.length === 0) throw new Error('No items to order')

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Insert into shopping_list with vendor info
            const { error } = await supabase
                .from('shopping_list')
                .insert(itemsToOrder.map(item => ({ ...item, user_id: user.id })))

            if (error) throw error

            return itemsToOrder
        },
        onSuccess: (itemsOrdered) => {
            // Group by vendor for confirmation
            const vendorGroups: Record<string, { name: string; items: typeof itemsOrdered; total: number }> = {}

            itemsOrdered.forEach(item => {
                const vendorInfo = selectedVendors[item.ingredient_id]
                const vendorName = vendorInfo?.vendorName || 'Direct'
                const ingredient = ingredients.find(i => i.id === item.ingredient_id)

                if (!vendorGroups[vendorName]) {
                    vendorGroups[vendorName] = { name: vendorName, items: [], total: 0 }
                }
                vendorGroups[vendorName].items.push(item)
                vendorGroups[vendorName].total += item.quantity_to_order * (item.vendor_price || ingredient?.purchase_price || 0)
            })

            const vendorSummary = Object.values(vendorGroups)
                .map(g => `📦 ${g.name}: ${g.items.length} items ($${g.total.toFixed(2)})`)
                .join('\n')

            toast.success('Orders sent to vendors!', {
                description: vendorSummary,
                duration: 5000
            })

            // Clear the cart
            setAddedIds([])
            setRemovedIds([])
            setOrderQuantities({})
            setSelectedVendors({})

            router.refresh()
        },
        onError: (err) => toast.error(err.message)
    })

    // Compute total cost based on visible items and selected vendors
    const totalCost = visibleItems.reduce((acc, item) => {
        const qty = orderQuantities[item.id] || 0
        const vendorInfo = selectedVendors[item.id]
        const price = vendorInfo?.price || item.purchase_price
        return acc + (qty * price)
    }, 0)

    // Filter ingredients for the add dialog - now with vendor price info
    const searchResults = !itemSearch ? [] : ingredients
        .filter(i =>
            !visibleItems.find(v => v.id === i.id) &&
            i.name.toLowerCase().includes(itemSearch.toLowerCase())
        )
        .slice(0, 8) // Show more results
        .map(ingredient => {
            // Get all vendor options for this ingredient
            const vendorOptions = vendorProducts
                .filter(vp => vp.ingredient_id === ingredient.id)
                .map(vp => {
                    const vendor = vendors.find(v => v.id === vp.vendor_id)
                    return {
                        vendorId: vp.vendor_id,
                        vendorName: vendor?.name || 'Unknown',
                        price: vp.vendor_price,
                        unit: vp.unit,
                        packSize: vp.pack_size
                    }
                })
                .sort((a, b) => a.price - b.price) // Sort by price, cheapest first

            return {
                ...ingredient,
                vendorOptions,
                lowestPrice: vendorOptions.length > 0 ? vendorOptions[0].price : ingredient.purchase_price
            }
        })

    if (visibleItems.length === 0) {
        return (
            <div className="space-y-6">
                {/* Empty State with Add Button */}
                <Card className="bg-neutral-900 border-neutral-800">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                        <h3 className="text-xl font-bold text-white">All Par Levels Met</h3>
                        <p className="text-neutral-400 mt-2 mb-6">You have sufficient stock for all ingredients.</p>

                        <div className="relative">
                            <Button
                                variant="outline"
                                className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
                                onClick={() => setIsAddOpen(!isAddOpen)}
                            >
                                Manually Add Item
                            </Button>

                            {isAddOpen && (
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <div className="p-2 border-b border-neutral-800">
                                        <Input
                                            placeholder="Search ingredients..."
                                            className="h-8 bg-neutral-900 border-none text-xs"
                                            value={itemSearch}
                                            onChange={e => setItemSearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {searchResults.map(i => (
                                            <button
                                                key={i.id}
                                                className="w-full text-left px-4 py-2 text-sm text-neutral-400 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                                                onClick={() => handleAddItem(i.id)}
                                            >
                                                {i.name}
                                            </button>
                                        ))}
                                        {searchResults.length === 0 && (
                                            <div className="p-4 text-xs text-neutral-600 text-center">No items found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Needs Ordering ({visibleItems.length})
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Add Item Popover */}
                            <div className="relative" ref={popupRef}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-neutral-700 hover:bg-neutral-800"
                                    onClick={() => setIsAddOpen(!isAddOpen)}
                                >
                                    + Add Item
                                </Button>
                                {isAddOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-96 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden ring-1 ring-black/50">
                                        <div className="p-3 border-b border-white/5 bg-black/20">
                                            <Input
                                                placeholder="Search products..."
                                                className="h-9 bg-black/40 border-white/10 text-white placeholder:text-neutral-500 focus:border-emerald-500/50"
                                                value={itemSearch}
                                                onChange={e => setItemSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        {vendors.length === 0 && (
                                            <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-500 flex items-center justify-between">
                                                <span>No vendors connected.</span>
                                                <Link href="/vendors" className="underline font-bold hover:text-amber-400">Connect Now</Link>
                                            </div>
                                        )}
                                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {searchResults.map(item => (
                                                <div key={item.id} className="border-b border-white/5 last:border-0">
                                                    {/* Ingredient header */}
                                                    <div className="px-4 py-2 bg-black/20">
                                                        <div className="font-bold text-white">{item.name}</div>
                                                        <div className="text-[10px] uppercase tracking-wider text-neutral-500">{item.category || 'General'}</div>
                                                    </div>

                                                    {/* Vendor options */}
                                                    {item.vendorOptions.length > 0 ? (
                                                        <div className="divide-y divide-white/5">
                                                            {item.vendorOptions.map((vo, idx) => (
                                                                <button
                                                                    key={vo.vendorId}
                                                                    className="w-full text-left px-4 py-2 hover:bg-emerald-500/10 transition-colors flex items-center justify-between group"
                                                                    onClick={() => handleAddItem(item.id, vo.vendorId, vo.vendorName, vo.price)}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        {idx === 0 && (
                                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">
                                                                                Lowest
                                                                            </span>
                                                                        )}
                                                                        <span className="text-sm text-neutral-300 group-hover:text-emerald-400">
                                                                            {vo.vendorName}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className={`font-bold ${idx === 0 ? 'text-emerald-400' : 'text-neutral-400'}`}>
                                                                            ${vo.price.toFixed(2)}
                                                                        </div>
                                                                        <div className="text-[10px] text-neutral-600">
                                                                            /{vo.unit}
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="px-4 py-2 flex items-center justify-between bg-black/10">
                                                            <div className="text-sm text-neutral-500">No prices yet</div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setManagePricesItem(item)
                                                                    }}
                                                                >
                                                                    Manage Prices
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    className="h-7 text-xs"
                                                                    onClick={() => handleAddItem(item.id)}
                                                                >
                                                                    Add Direct ($ {item.purchase_price})
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {searchResults.length === 0 && (
                                                <div className="p-8 text-sm text-neutral-500 text-center">
                                                    {itemSearch ? 'No matching products.' : 'Start typing to search...'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reset Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                className="text-neutral-500 hover:text-white"
                                title="Reset to default suggestions"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>

                            <div className="text-right pl-4 border-l border-neutral-800">
                                <div className="text-xs text-neutral-400">Estimated Cost</div>
                                <div className="text-xl font-bold text-emerald-400">${totalCost.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-neutral-800 hover:bg-transparent">
                                <TableHead className="text-neutral-400">Ingredient</TableHead>
                                <TableHead className="text-neutral-400">Vendor</TableHead>
                                <TableHead className="text-neutral-400">Stock / Par</TableHead>
                                <TableHead className="text-neutral-400 w-[120px]">Order Qty</TableHead>
                                <TableHead className="text-neutral-400 text-right">Unit Price</TableHead>
                                <TableHead className="text-neutral-400 text-right">Line Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleItems.map((item) => {
                                const qty = orderQuantities[item.id] || 0
                                const vendorInfo = selectedVendors[item.id]
                                const unitPrice = vendorInfo?.price || item.purchase_price
                                const lineTotal = qty * unitPrice

                                return (
                                    <TableRow key={item.id} className="border-neutral-800 hover:bg-neutral-800/50 group">
                                        <TableCell className="font-medium text-white">
                                            {item.name}
                                            <div className="text-xs text-neutral-500">{item.purchase_unit}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`text-xs ${vendorInfo?.vendorId ? 'border-emerald-500/30 text-emerald-400' : 'border-neutral-700 text-neutral-500'}`}
                                            >
                                                {vendorInfo?.vendorName || 'Direct'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={item.current_stock < (item.par_level || 5) ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                                                    {item.current_stock}
                                                </span>
                                                <span className="text-neutral-600">/</span>
                                                <span className="text-neutral-300">{item.par_level || 5}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="bg-neutral-950 border-neutral-700 text-white w-20"
                                                value={qty}
                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right text-neutral-400">
                                            ${unitPrice.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-white">
                                            ${lineTotal.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-neutral-600 hover:text-red-500 transition-all"
                                                title="Remove from order"
                                            >
                                                &times;
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button
                    size="lg"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
                    onClick={() => sendOrderMutation.mutate()}
                    disabled={sendOrderMutation.isPending}
                >
                    <Send className="w-4 h-4" />
                    {sendOrderMutation.isPending ? 'Sending...' : 'Send Orders'}
                </Button>
            </div>

            {/* Vendor Price Management Dialog */}
            <Dialog open={!!managePricesItem} onOpenChange={(open) => !open && setManagePricesItem(null)}>
                <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-2xl">
                    {managePricesItem && (
                        <VendorPriceManager
                            ingredient={managePricesItem}
                            vendors={vendors}
                            existingPrices={vendorProducts.filter(vp => vp.ingredient_id === managePricesItem.id)}
                            onUpdate={() => {
                                router.refresh()
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
