'use client'

import { useState, useMemo } from 'react'
import { Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type Recipe } from '@/lib/types/database'
import { isRecipeInStock } from '@/lib/calculations'

interface SpeedMenuProps {
    recipes: any[]
    onItemSelect: (recipe: any) => void
}

export default function SpeedMenu({ recipes, onItemSelect }: SpeedMenuProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [category, setCategory] = useState<'All' | 'Starters' | 'Mains' | 'Desserts'>('All')

    const categorize = (recipe: Recipe) => {
        // Simple categorization logic based on price for demo
        if (recipe.menu_price < 20) return 'Starters'
        if (recipe.menu_price < 40) return 'Starters'
        return 'Mains'
    }

    const filteredRecipes = useMemo(() => recipes.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = category === 'All' || categorize(r) === category
        return matchesSearch && matchesCategory
    }), [recipes, searchQuery, category])

    return (
        <div className="flex flex-col h-full overflow-hidden bg-card border-r border-white/10">
            {/* Search Header */}
            <div className="p-6 border-b border-white/10 space-y-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                    <Input
                        placeholder="SEARCH MENU..."
                        className="h-14 pl-12 bg-sidebar/40 border-white/10 rounded-xl text-lg font-bold text-foreground placeholder:text-muted-foreground focus:border-blue-500/50"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['All', 'Starters', 'Mains'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat as any)}
                            className={cn(
                                "flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                category === cat
                                    ? "bg-white text-black shadow-lg"
                                    : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredRecipes.map((recipe) => {
                        const inStock = isRecipeInStock(recipe.recipe_items || [])
                        const isAvailable = recipe.is_available !== false && inStock

                        return (
                            <button
                                key={recipe.id}
                                disabled={!isAvailable}
                                onClick={() => onItemSelect(recipe)}
                                className={cn(
                                    "relative p-4 rounded-2xl text-left transition-all border group",
                                    !isAvailable
                                        ? "bg-card/50 border-white/5 opacity-50 cursor-not-allowed"
                                        : "bg-white/5 border-white/5 hover:bg-blue-600 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-900/20 active:scale-95"
                                )}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={cn(
                                        "text-xs font-black uppercase tracking-wider opacity-60",
                                        !isAvailable ? "text-muted-foreground" : "text-muted-foreground group-hover:text-blue-200"
                                    )}>
                                        {categorize(recipe)}
                                    </span>
                                    <span className={cn(
                                        "font-black text-lg tabular-nums",
                                        !isAvailable ? "text-muted-foreground" : "text-foreground"
                                    )}>
                                        ${recipe.menu_price}
                                    </span>
                                </div>
                                <h3 className={cn(
                                    "font-black text-sm uppercase leading-tight tracking-tight mb-2",
                                    !isAvailable ? "text-muted-foreground" : "text-foreground"
                                )}>
                                    {recipe.name}
                                </h3>
                                {!inStock && (
                                    <Badge className="bg-red-500/20 text-red-500 border-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm absolute bottom-4 right-4">
                                        Sold Out
                                    </Badge>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-sidebar/20">
                <Button variant="ghost" className="w-full h-12 border-2 border-dashed border-white/10 text-muted-foreground hover:text-foreground hover:border-white/30 uppercase font-black text-xs tracking-widest gap-2">
                    <Plus className="w-4 h-4" /> Custom Item
                </Button>
            </div>
        </div>
    )
}
