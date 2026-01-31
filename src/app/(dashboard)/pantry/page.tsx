'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Filter, Trash2, Pencil, Package } from 'lucide-react'

import {
    type Ingredient,
    type IngredientCategory,
} from '@/lib/types/database'
import { formatCurrency, ALL_UNITS } from '@/lib/calculations'
import { IngredientForm } from '@/components/forms/ingredient-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const CATEGORIES: IngredientCategory[] = [
    'Produce',
    'Meat',
    'Seafood',
    'Dairy',
    'Dry Goods',
    'Oils & Fats',
    'Spices',
    'Beverages',
    'Other',
]

export default function PantryPage() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')

    const queryClient = useQueryClient()
    const supabase = createClient()

    // Fetch ingredients
    const { data: ingredients, isLoading } = useQuery({
        queryKey: ['ingredients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ingredients')
                .select('*')
                .order('name')
            if (error) throw error
            return data as Ingredient[]
        },
    })

    // Add ingredient mutation
    const addMutation = useMutation({
        mutationFn: async (ingredient: Omit<Ingredient, 'id' | 'user_id' | 'updated_at'>) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('ingredients')
                .insert({ ...ingredient, user_id: user.id })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] })
            setIsAddDialogOpen(false)
            toast.success('Ingredient added successfully')
        },
        onError: (error) => {
            toast.error('Failed to add ingredient: ' + error.message)
        },
    })

    // Update ingredient mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Ingredient> & { id: string }) => {
            const { error } = await supabase
                .from('ingredients')
                .update(updates)
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] })
            setEditingIngredient(null)
            toast.success('Ingredient updated successfully')
        },
        onError: (error) => {
            toast.error('Failed to update ingredient: ' + error.message)
        },
    })

    // Delete ingredient mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('ingredients')
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] })
            setDeletingId(null)
            toast.success('Ingredient deleted successfully')
        },
        onError: (error) => {
            toast.error('Failed to delete ingredient: ' + error.message)
        },
    })

    // Filter ingredients
    const filteredIngredients = ingredients?.filter((ingredient) => {
        const matchesSearch = ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = categoryFilter === 'all' || ingredient.category === categoryFilter
        return matchesSearch && matchesCategory
    }) || []

    return (
        <div className="space-y-12 relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[140px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] -z-10" />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black text-white tracking-tighter italic">Pantry Assets.</h1>
                    <p className="text-neutral-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Ingredient Ledger • Real-time Sync
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
                            <Plus className="w-5 h-5 mr-3" />
                            New Material +
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-neutral-900/90 border-white/5 backdrop-blur-3xl rounded-[40px] p-8">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black text-white italic tracking-tighter mb-4">Register Asset.</DialogTitle>
                        </DialogHeader>
                        <IngredientForm
                            onSubmit={(data) => addMutation.mutate(data)}
                            isLoading={addMutation.isPending}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <Card className="glass-card p-2">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-hover:text-emerald-500 transition-colors" />
                            <Input
                                placeholder="SEARCH LEDGER..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 pl-12 bg-black/40 border-white/5 rounded-2xl text-white font-bold placeholder:text-neutral-800 focus:border-emerald-500/50 transition-all"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-14 w-full sm:w-64 bg-black/40 border-white/5 rounded-2xl text-neutral-400 font-bold uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-neutral-600" />
                                    <SelectValue placeholder="CATEGORY" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-900/90 border-white/5 backdrop-blur-3xl rounded-2xl">
                                <SelectItem value="all" className="font-bold uppercase py-3">All Categories</SelectItem>
                                {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat} className="font-bold uppercase py-3">{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Ingredients Table */}
            <Card className="glass-card overflow-hidden">
                <CardHeader className="border-b border-white/5 p-8">
                    <CardTitle className="text-xl font-black text-white italic flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-emerald-500" />
                        </div>
                        Active Inventory ({filteredIngredients.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <p className="text-xs font-black uppercase tracking-widest text-neutral-600">Syncing Data...</p>
                        </div>
                    ) : filteredIngredients.length === 0 ? (
                        <div className="text-center py-24 px-8">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Package className="w-12 h-12 text-neutral-800" />
                            </div>
                            <h3 className="text-2xl font-black text-white italic mb-2 tracking-tighter">Pantry Empty.</h3>
                            <p className="text-neutral-500 mb-8 font-medium">Your digital ledger is currently blank.</p>
                            <Button
                                onClick={() => setIsAddDialogOpen(true)}
                                className="h-14 px-8 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest hover:bg-white/10"
                            >
                                <Plus className="w-5 h-5 mr-3" />
                                Add Material
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-white/[0.02]">
                                    <TableRow className="border-b border-white/5 hover:bg-transparent h-16">
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 pl-8">Material</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Classification</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Unit Cost</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Logic</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Live Stock</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 text-right pr-8">Control</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredIngredients.map((ingredient) => (
                                        <TableRow key={ingredient.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                                            <TableCell className="font-bold text-lg text-white pl-8 py-6">{ingredient.name}</TableCell>
                                            <TableCell>
                                                {ingredient.category && (
                                                    <Badge className="bg-white/5 border-white/10 text-neutral-400 font-bold uppercase text-[9px] tracking-widest h-6 rounded-lg px-2">
                                                        {ingredient.category}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-emerald-500 font-black italic">
                                                {formatCurrency(ingredient.purchase_price)}
                                            </TableCell>
                                            <TableCell className="text-neutral-500 font-bold uppercase text-[10px] tracking-widest">per {ingredient.purchase_unit}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        ingredient.current_stock < 5 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500/20'
                                                    )} />
                                                    <span className={cn(
                                                        "font-black text-lg tracking-tighter",
                                                        ingredient.current_stock < 5 ? 'text-red-500' : 'text-neutral-300'
                                                    )}>
                                                        {ingredient.current_stock}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setEditingIngredient(ingredient)}
                                                        className="h-10 w-10 text-neutral-500 hover:text-white hover:bg-white/10 rounded-xl"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeletingId(ingredient.id)}
                                                        className="h-10 w-10 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editingIngredient} onOpenChange={(open) => !open && setEditingIngredient(null)}>
                <DialogContent className="bg-neutral-900/90 border-white/5 backdrop-blur-3xl rounded-[40px] p-8">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black text-white italic tracking-tighter mb-4">Modify Asset.</DialogTitle>
                    </DialogHeader>
                    {editingIngredient && (
                        <IngredientForm
                            initialData={editingIngredient}
                            onSubmit={(data) => updateMutation.mutate({ id: editingIngredient.id, ...data })}
                            isLoading={updateMutation.isPending}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent className="bg-neutral-900 border-white/5 backdrop-blur-3xl rounded-[40px] p-8">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center">
                            <Trash2 className="w-8 h-8 text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <AlertDialogTitle className="text-3xl font-black text-white italic tracking-tighter">Decommission Asset?</AlertDialogTitle>
                            <AlertDialogDescription className="text-neutral-500 font-medium">
                                This material will be purged from all recipes and ledgers. This action is irreversible.
                            </AlertDialogDescription>
                        </div>
                        <div className="flex gap-4 w-full pt-4">
                            <AlertDialogCancel className="flex-1 h-14 rounded-2xl bg-white/5 border-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10">
                                Abort
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                                className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest shadow-xl shadow-red-500/20"
                            >
                                Confirm
                            </AlertDialogAction>
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
