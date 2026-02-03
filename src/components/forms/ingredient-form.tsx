'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { type Ingredient, type IngredientCategory } from '@/lib/types/database'
import { ALL_UNITS } from '@/lib/calculations'

const CATEGORIES: IngredientCategory[] = [
    'produce',
    'meat',
    'seafood',
    'dairy',
    'dry_goods',
    'oils_fats',
    'spices',
    'beverages',
    'other',
]

interface IngredientFormProps {
    initialData?: Ingredient
    onSubmit: (data: Omit<Ingredient, 'id' | 'user_id' | 'updated_at'>) => void
    isLoading: boolean
}

export function IngredientForm({
    initialData,
    onSubmit,
    isLoading,
}: IngredientFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        category: initialData?.category as IngredientCategory | undefined,
        purchase_price: initialData?.purchase_price || 0,
        purchase_unit: initialData?.purchase_unit || 'kg',
        conversion_ratio: initialData?.conversion_ratio || 1,
        current_stock: initialData?.current_stock || 0,
        par_level: initialData?.par_level || 0,
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 ml-1">Asset Identity</Label>
                <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="IDENTIFY MATERIAL..."
                    required
                    className="h-14 bg-black/40 border-white/5 rounded-2xl text-white font-bold placeholder:text-neutral-800 focus:border-emerald-500/50 transition-all shadow-inner"
                />
            </div>

            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 ml-1">Asset Classification</Label>
                <Select
                    value={formData.category || ''}
                    onValueChange={(value) => setFormData({ ...formData, category: value as IngredientCategory })}
                >
                    <SelectTrigger className="h-14 bg-black/40 border-white/5 rounded-2xl text-white font-bold tracking-widest uppercase focus:border-emerald-500/50">
                        <SelectValue placeholder="SELECT CATEGORY..." />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900/90 border-white/5 backdrop-blur-3xl rounded-2xl">
                        {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat} className="font-bold uppercase py-3">{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 ml-1">Acquisition Price ($)</Label>
                    <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                        required
                        className="h-14 bg-black/40 border-white/5 rounded-2xl text-white font-bold focus:border-emerald-500/50 transition-all shadow-inner tabular-nums"
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 ml-1">Acquisition Unit</Label>
                    <Select
                        value={formData.purchase_unit}
                        onValueChange={(value) => setFormData({ ...formData, purchase_unit: value })}
                    >
                        <SelectTrigger className="h-14 bg-black/40 border-white/5 rounded-2xl text-white font-bold tracking-widest uppercase focus:border-emerald-500/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-900/90 border-white/5 backdrop-blur-3xl rounded-2xl">
                            {ALL_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit} className="font-bold uppercase py-3">{unit}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 ml-1">Current Reserve</Label>
                    <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        value={formData.current_stock}
                        onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                        className="h-14 bg-black/40 border-white/5 rounded-2xl text-white font-bold focus:border-emerald-500/50 transition-all shadow-inner tabular-nums"
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 ml-1">PAR Level</Label>
                    <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        value={formData.par_level}
                        onChange={(e) => setFormData({ ...formData, par_level: parseFloat(e.target.value) || 0 })}
                        className="h-14 bg-black/40 border-white/5 rounded-2xl text-white font-bold focus:border-emerald-500/50 transition-all shadow-inner tabular-nums"
                    />
                </div>
            </div>

            <Button
                type="submit"
                disabled={isLoading || !formData.name}
                className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg tracking-tighter rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 mt-4"
            >
                {isLoading ? (
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        SYNCHRONIZING...
                    </div>
                ) : initialData ? (
                    'UPDATE MATERIAL LOG'
                ) : (
                    'REGISTER MATERIAL'
                )}
            </Button>
        </form>
    )
}
