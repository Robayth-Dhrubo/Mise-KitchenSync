'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Search, Calculator, CheckCircle2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { type Recipe } from '@/lib/types/database'

interface ServiceLoggerProps {
    recipes: Recipe[]
}

export function ServiceLogger({ recipes }: ServiceLoggerProps) {
    const router = useRouter()
    const supabase = createClient()
    const [searchQuery, setSearchQuery] = useState('')
    const [quantities, setQuantities] = useState<Record<string, number>>({})

    // Filter recipes
    const filteredRecipes = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Handle quantity change
    const handleQuantityChange = (recipeId: string, value: string) => {
        const qty = parseInt(value) || 0
        setQuantities(prev => ({
            ...prev,
            [recipeId]: qty
        }))
    }

    // Calculate totals
    const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0)
    const estimatedRevenue = Object.entries(quantities).reduce((acc, [id, qty]) => {
        const recipe = recipes.find(r => r.id === id)
        return acc + (recipe ? recipe.menu_price * qty : 0)
    }, 0)

    // Submit mutation
    const closeServiceMutation = useMutation({
        mutationFn: async () => {
            const sales = Object.entries(quantities)
                .filter(([_, qty]) => qty > 0)
                .map(([recipeId, qty]) => ({
                    recipe_id: recipeId,
                    quantity: qty
                }))

            if (sales.length === 0) throw new Error('No sales recorded')

            const { error } = await supabase.rpc('deduct_inventory', { sales })
            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Service Closed!', {
                description: `Inventory deducted for ${totalItems} items.`
            })
            setQuantities({})
            router.push('/dashboard')
            router.refresh()
        },
        onError: (error) => {
            toast.error('Failed to close service: ' + error.message)
        }
    })

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center sticky top-0 bg-neutral-950/80 backdrop-blur-xl p-4 -mx-4 z-10 border-b border-neutral-800">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <Input
                        placeholder="Search recipes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-neutral-900 border-neutral-800 focus:border-emerald-500"
                    />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-col items-end mr-4 hidden md:flex">
                        <span className="text-xs text-neutral-400">Est. Revenue</span>
                        <span className="font-bold text-emerald-400">${estimatedRevenue.toLocaleString()}</span>
                    </div>
                    <Button
                        size="lg"
                        className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                        onClick={() => closeServiceMutation.mutate()}
                        disabled={closeServiceMutation.isPending || totalItems === 0}
                    >
                        {closeServiceMutation.isPending ? 'Processing...' : `Close Service (${totalItems})`}
                    </Button>
                </div>
            </div>

            {/* Recipe Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredRecipes.map((recipe) => {
                    const qty = quantities[recipe.id] || 0
                    return (
                        <Card
                            key={recipe.id}
                            className={`
                                overflow-hidden transition-all duration-200 border-neutral-800 bg-neutral-900/50
                                ${qty > 0 ? 'ring-2 ring-emerald-500/50 bg-emerald-950/20' : 'hover:border-neutral-700'}
                            `}
                        >
                            <CardContent className="p-4 flex flex-col h-full justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-white line-clamp-1" title={recipe.name}>{recipe.name}</h3>
                                    <div className="flex justify-between items-center mt-2">
                                        <Badge variant="outline" className="border-neutral-700 text-neutral-400">
                                            ${recipe.menu_price}
                                        </Badge>
                                        {/* Optional: Show stock status or margin here */}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
                                        onClick={() => handleQuantityChange(recipe.id, String(Math.max(0, qty - 1)))}
                                    >
                                        -
                                    </Button>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="h-8 text-center bg-transparent border-none focus-visible:ring-0 p-0 text-lg font-bold text-white shadow-none"
                                        value={qty === 0 ? '' : qty}
                                        placeholder="0"
                                        onChange={(e) => handleQuantityChange(recipe.id, e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800"
                                        onClick={() => handleQuantityChange(recipe.id, String(qty + 1))}
                                    >
                                        +
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
