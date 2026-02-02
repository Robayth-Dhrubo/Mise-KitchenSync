'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useForm, useFieldArray } from 'react-hook-form'
import {
    Plus,
    Trash2,
    ChefHat,
    TrendingUp,
    DollarSign,
    Percent,
    AlertTriangle,
    ArrowLeft,
    Save,
    Package,
    ChevronDown,
    ChevronUp,
    Camera,
    Image as ImageIcon,
    Loader2,
} from 'lucide-react'

import {
    calculateRecipeCost,
    formatCurrency,
    formatPercentage,
    getMarginColorClass,
    ALL_UNITS,
} from '@/lib/calculations'
import { type Ingredient } from '@/lib/types/database'
import { IngredientForm } from '@/components/forms/ingredient-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface RecipeFormData {
    name: string
    description: string
    menu_price: number
    prep_time_minutes: number | null
    target_food_cost_pct: number
    image_url: string
    category: string
    items: { ingredient_id: string; quantity_needed: number; unit_used: string }[]
}

export default function NewRecipePage() {
    const router = useRouter()
    const supabase = createClient()
    const queryClient = useQueryClient()
    const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${Math.random()}.${fileExt}`
            const filePath = `dish-images/${fileName}`

            // Try to upload
            const { error: uploadError } = await supabase.storage
                .from('recipes')
                .upload(filePath, file)

            if (uploadError) {
                // If bucket doesn't exist, this might fail. In a real app we'd ensure bucket exists.
                throw uploadError
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('recipes')
                .getPublicUrl(filePath)

            setValue('image_url', publicUrl)
            toast.success('Image uploaded successfully')
        } catch (error: any) {
            console.error('Error uploading image:', error)
            toast.error('Upload failed: ' + error.message)
        } finally {
            setIsUploading(false)
        }
    }

    // Add ingredient mutation
    const addIngredientMutation = useMutation({
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
            setIsAddIngredientOpen(false)
            toast.success('Material registered successfully')
        },
        onError: (error) => {
            toast.error('Registration failed: ' + error.message)
        },
    })

    // Fetch ingredients for the dropdown
    const { data: ingredients } = useQuery({
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

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors },
    } = useForm<RecipeFormData>({
        defaultValues: {
            name: '',
            description: '',
            menu_price: 0,
            prep_time_minutes: null,
            target_food_cost_pct: 30,
            image_url: '',
            category: 'main',
            items: [{ ingredient_id: '', quantity_needed: 0, unit_used: 'g' }],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items',
    })

    // Watch form values for live cost calculation
    const menuPrice = watch('menu_price')
    const targetFoodCostPct = watch('target_food_cost_pct')
    const items = watch('items')

    // Calculate live cost preview
    const costPreview = useMemo(() => {
        if (!ingredients || !items) return null

        const recipeItems = items
            .filter((item) => item.ingredient_id && item.quantity_needed > 0)
            .map((item) => {
                const ingredient = ingredients.find((i) => i.id === item.ingredient_id)
                return ingredient
                    ? {
                        quantity_needed: item.quantity_needed,
                        unit_used: item.unit_used,
                        ingredient: {
                            purchase_price: ingredient.purchase_price,
                            purchase_unit: ingredient.purchase_unit,
                            conversion_ratio: ingredient.conversion_ratio,
                            name: ingredient.name,
                        },
                    }
                    : null
            })
            .filter(Boolean) as any[]

        if (recipeItems.length === 0) return null

        return calculateRecipeCost(recipeItems, menuPrice || 0, targetFoodCostPct || 30)
    }, [ingredients, items, menuPrice, targetFoodCostPct])

    // Save recipe mutation
    const saveMutation = useMutation({
        mutationFn: async (data: RecipeFormData) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: recipe, error: recipeError } = await supabase
                .from('recipes')
                .insert({
                    user_id: user.id,
                    name: data.name,
                    description: data.description,
                    menu_price: data.menu_price,
                    prep_time_minutes: data.prep_time_minutes,
                    target_food_cost_pct: data.target_food_cost_pct,
                    image_url: data.image_url,
                    category: data.category
                })
                .select()
                .single()

            if (recipeError) throw recipeError

            const validItems = data.items.filter((item: any) => item.ingredient_id && item.ingredient_id.trim() !== '')

            if (validItems.length > 0) {
                const { error: itemsError } = await supabase.from('recipe_items').insert(
                    validItems.map((item: any) => ({
                        recipe_id: recipe.id,
                        ingredient_id: item.ingredient_id,
                        quantity_needed: item.quantity_needed,
                        unit_used: item.unit_used,
                    }))
                )

                if (itemsError) throw itemsError
            }

            return recipe
        },
        onSuccess: () => {
            toast.success('Dish synchronized with vault')
            router.push('/menu')
        },
        onError: (error) => {
            toast.error('Sync failed: ' + error.message)
        },
    })

    const onSubmit = (data: RecipeFormData) => {
        saveMutation.mutate(data)
    }

    return (
        <div className="space-y-12 relative pb-24">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[140px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] -z-10" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-6">
                    <Link href="/menu">
                        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Add New Dish</h1>
                        <p className="text-neutral-500 text-sm">
                            Create a menu item and upload a photo for your guests
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="glass-card">
                            <CardHeader className="p-8 border-b border-white/5">
                                <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <ImageIcon className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    Dish Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid md:grid-cols-3 gap-8">
                                    <div className="md:col-span-1 space-y-3">
                                        <Label className="text-xs text-neutral-500">Dish Photo</Label>
                                        <div className="aspect-square rounded-2xl bg-black/40 border-2 border-dashed border-white/5 flex flex-col items-center justify-center relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                                            {isUploading ? (
                                                <div className="flex flex-col items-center gap-2 text-emerald-500 animate-pulse">
                                                    <Loader2 className="w-8 h-8 animate-spin" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Uploading...</span>
                                                </div>
                                            ) : watch('image_url') ? (
                                                <>
                                                    <img src={watch('image_url')} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setValue('image_url', '')}
                                                            className="text-red-500 hover:text-red-400 font-bold uppercase text-[10px]"
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-neutral-600">
                                                    <Camera className="w-8 h-8" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Click to Upload</span>
                                                </div>
                                            )}
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </div>
                                        {watch('image_url') && (
                                            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest text-center">Image Uploaded</p>
                                        )}
                                    </div>

                                    <div className="md:col-span-2 space-y-6">
                                        <div className="space-y-3">
                                            <Label className="text-xs text-neutral-500">Dish Name</Label>
                                            <Input
                                                {...register('name', { required: 'Dish name is required' })}
                                                placeholder="e.g. Chicken Parmesan"
                                                className="h-16 bg-black/40 border-white/5 rounded-2xl text-xl font-black text-white placeholder:text-neutral-800 focus:border-emerald-500/50 transition-all"
                                            />
                                            {errors.name && (
                                                <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest px-1">{errors.name.message}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <Label className="text-xs text-neutral-500">Menu Price ($)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...register('menu_price', { valueAsNumber: true })}
                                                    className="h-14 bg-black/40 border-white/5 rounded-xl text-lg font-black text-white"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs text-neutral-500">Category</Label>
                                                <Select
                                                    value={watch('category')}
                                                    onValueChange={(val) => setValue('category', val)}
                                                >
                                                    <SelectTrigger className="h-14 bg-black/40 border-white/5 rounded-xl text-white font-bold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-neutral-900 border-white/5">
                                                        <SelectItem value="starter">Starter</SelectItem>
                                                        <SelectItem value="main">Main Course</SelectItem>
                                                        <SelectItem value="side">Side Dish</SelectItem>
                                                        <SelectItem value="dessert">Dessert</SelectItem>
                                                        <SelectItem value="drink">Drink</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs text-neutral-500">Description (Optional)</Label>
                                    <Textarea
                                        {...register('description')}
                                        placeholder="Briefly describe this dish for your guests..."
                                        rows={3}
                                        className="bg-black/40 border-white/5 rounded-2xl text-white font-medium placeholder:text-neutral-800 focus:border-emerald-500/50 transition-all resize-none"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full h-12 border border-dashed border-white/5 rounded-xl text-neutral-500 hover:text-white hover:bg-white/5 flex items-center justify-between px-6"
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Advanced: Ingredient & Cost Tracking</span>
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>

                        {showAdvanced && (
                            <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label className="text-xs text-neutral-500">Prep Time (min)</Label>
                                        <Input
                                            type="number"
                                            {...register('prep_time_minutes', { valueAsNumber: true })}
                                            className="h-14 bg-black/40 border-white/5 rounded-xl text-lg font-black text-white"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-xs text-neutral-500">Target Food Cost (%)</Label>
                                        <Input
                                            type="number"
                                            {...register('target_food_cost_pct', { valueAsNumber: true })}
                                            className="h-14 bg-black/40 border-white/5 rounded-xl text-lg font-black text-white"
                                        />
                                    </div>
                                </div>

                                <Card className="glass-card">
                                    <CardHeader className="p-8 border-b border-white/5">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-blue-500" />
                                                </div>
                                                Ingredients
                                            </CardTitle>
                                            <div className="flex gap-2">
                                                <Dialog open={isAddIngredientOpen} onOpenChange={setIsAddIngredientOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className="h-10 px-4 text-emerald-500 font-bold uppercase text-[10px] bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl"
                                                        >
                                                            <Plus className="w-3 h-3 mr-2" />
                                                            Add New Ingredient
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="bg-neutral-900 border-white/5 backdrop-blur-3xl rounded-[40px] p-8">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-xl font-bold text-white mb-4">Add Ingredient</DialogTitle>
                                                        </DialogHeader>
                                                        <IngredientForm
                                                            onSubmit={(data) => addIngredientMutation.mutate(data)}
                                                            isLoading={addIngredientMutation.isPending}
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    onClick={() => append({ ingredient_id: '', quantity_needed: 0, unit_used: 'g' })}
                                                    className="h-10 px-4 text-white/40 font-bold uppercase text-[10px] bg-white/5 hover:bg-white/10 rounded-xl"
                                                >
                                                    <Plus className="w-3 h-3 mr-2" />
                                                    Add Row
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        {(!ingredients || ingredients.length === 0) ? (
                                            <div className="text-center py-24">
                                                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                                    <AlertTriangle className="w-12 h-12 text-yellow-500/20" />
                                                </div>
                                                <p className="text-neutral-500 text-sm">No ingredients yet</p>
                                                <Link href="/pantry">
                                                    <Button variant="link" className="text-emerald-500 font-bold mt-2">
                                                        Add Ingredients First
                                                    </Button>
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {fields.map((field, index) => (
                                                    <div key={field.id} className="flex gap-4 items-center animate-in fade-in slide-in-from-left-4 duration-300">
                                                        <div className="flex-1">
                                                            <Select
                                                                value={items[index]?.ingredient_id || ''}
                                                                onValueChange={(value) => {
                                                                    const currentItems = [...items]
                                                                    currentItems[index] = { ...currentItems[index], ingredient_id: value }
                                                                    setValue('items', currentItems)
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-14 bg-black/40 border-white/5 rounded-xl text-white font-bold px-6">
                                                                    <SelectValue placeholder="Select ingredient..." />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-neutral-900/90 border-white/5 backdrop-blur-3xl rounded-xl">
                                                                    {ingredients.map((ingredient) => (
                                                                        <SelectItem key={ingredient.id} value={ingredient.id} className="font-bold uppercase py-3">
                                                                            {ingredient.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="w-32">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder="QTY"
                                                                {...register(`items.${index}.quantity_needed`, { valueAsNumber: true })}
                                                                className="h-14 bg-black/40 border-white/5 rounded-xl text-center font-black text-lg text-white"
                                                            />
                                                        </div>

                                                        <div className="w-32">
                                                            <Select
                                                                value={items[index]?.unit_used || 'g'}
                                                                onValueChange={(value) => {
                                                                    const currentItems = [...items]
                                                                    currentItems[index] = { ...currentItems[index], unit_used: value }
                                                                    setValue('items', currentItems)
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-14 bg-black/40 border-white/5 rounded-xl text-white font-bold px-6">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-neutral-900/90 border-white/5 backdrop-blur-3xl rounded-xl">
                                                                    {ALL_UNITS.map((unit) => (
                                                                        <SelectItem key={unit} value={unit} className="font-bold uppercase py-3">{unit}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => remove(index)}
                                                            disabled={fields.length === 1}
                                                            className="h-14 w-14 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            <Card className={cn(
                                "glass-card overflow-hidden transition-all duration-700",
                                costPreview?.is_profitable ? "border-emerald-500/20" : costPreview ? "border-red-500/20" : ""
                            )}>
                                <CardHeader className="p-8 border-b border-white/5">
                                    <CardTitle className="text-lg font-semibold text-white flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center",
                                            costPreview ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-white/20"
                                        )}>
                                            <TrendingUp className="w-5 h-5" />
                                        </div>
                                        Cost Preview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8">
                                    {!costPreview ? (
                                        <div className="text-center py-12">
                                            <DollarSign className="w-12 h-12 text-white/5 mx-auto mb-6" />
                                            <p className="text-neutral-500 text-sm">
                                                Add ingredients to see cost calculations
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-neutral-500">Total Cost</span>
                                                    <span className="text-xl font-bold text-white tabular-nums">
                                                        {formatCurrency(costPreview.total_cost)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-neutral-500">Profit</span>
                                                    <span className={cn(
                                                        "text-xl font-bold tabular-nums",
                                                        getMarginColorClass(costPreview.margin_status)
                                                    )}>
                                                        {formatCurrency(costPreview.gross_margin_dollars)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="pt-8 border-t border-white/5 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 flex items-center gap-2">
                                                        <Percent className="w-3 h-3" /> Food Cost %
                                                    </span>
                                                    <span className={cn(
                                                        "text-2xl font-bold tabular-nums",
                                                        getMarginColorClass(costPreview.margin_status)
                                                    )}>
                                                        {formatPercentage(costPreview.food_cost_percentage)}
                                                    </span>
                                                </div>

                                                {!costPreview.is_profitable ? (
                                                    <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 shadow-2xl shadow-red-500/10 animate-pulse">
                                                        <div className="flex items-center gap-3 text-red-500 mb-2">
                                                            <AlertTriangle className="w-5 h-5" />
                                                            <span className="text-xs font-bold uppercase">OVER BUDGET</span>
                                                        </div>
                                                        <p className="text-xs text-red-500/80">
                                                            Target {targetFoodCostPct}% exceeded. Consider adjusting ingredients or price.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                                                        <div className="flex items-center gap-3 text-emerald-500">
                                                            <TrendingUp className="w-5 h-5" />
                                                            <span className="text-xs font-bold uppercase">ON TARGET</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Button
                                type="submit"
                                disabled={saveMutation.isPending}
                                className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg rounded-xl transition-all shadow-lg active:scale-95 group"
                            >
                                {saveMutation.isPending ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Creating Dish...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        Create Dish
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
