'use client'

import { useState, useMemo, useEffect, use } from 'react'
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

export default function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()
    const queryClient = useQueryClient()
    const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isLoadingData, setIsLoadingData] = useState(true)

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        reset,
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
            items: [],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items',
    })

    // Fetch existing recipe data
    useEffect(() => {
        async function fetchRecipe() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/login')
                    return
                }

                const { data: recipe, error } = await supabase
                    .from('recipes')
                    .select(`
                        *,
                        recipe_items (
                            ingredient_id,
                            quantity_needed,
                            unit_used
                        )
                    `)
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single()

                if (error) throw error

                reset({
                    name: recipe.name,
                    description: recipe.description || '',
                    menu_price: recipe.menu_price,
                    prep_time_minutes: recipe.prep_time_minutes,
                    target_food_cost_pct: recipe.target_food_cost_pct || 30,
                    image_url: recipe.image_url || '',
                    category: recipe.category || 'main',
                    items: recipe.recipe_items || [],
                })
            } catch (err: any) {
                toast.error('Failed to load dish: ' + err.message)
                router.push('/menu')
            } finally {
                setIsLoadingData(false)
            }
        }
        fetchRecipe()
    }, [id, reset, router, supabase])

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

            const { error: uploadError } = await supabase.storage
                .from('recipes')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('recipes')
                .getPublicUrl(filePath)

            setValue('image_url', publicUrl)
            toast.success('Image updated')
        } catch (error: any) {
            toast.error('Upload failed: ' + error.message)
        } finally {
            setIsUploading(false)
        }
    }

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

    const menuPrice = watch('menu_price')
    const targetFoodCostPct = watch('target_food_cost_pct')
    const items = watch('items')

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

        return calculateRecipeCost(recipeItems, menuPrice || 0, targetFoodCostPct || 30)
    }, [ingredients, items, menuPrice, targetFoodCostPct])

    const saveMutation = useMutation({
        mutationFn: async (data: RecipeFormData) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Update recipe
            const { error: recipeError } = await supabase
                .from('recipes')
                .update({
                    name: data.name,
                    description: data.description,
                    menu_price: data.menu_price,
                    prep_time_minutes: data.prep_time_minutes,
                    target_food_cost_pct: data.target_food_cost_pct,
                    image_url: data.image_url,
                    category: data.category
                })
                .eq('id', id)
                .eq('user_id', user.id)

            if (recipeError) throw recipeError

            // Clear and replace recipe items
            await supabase.from('recipe_items').delete().eq('recipe_id', id)

            const validItems = data.items.filter((item: any) => item.ingredient_id && item.ingredient_id.trim() !== '')

            if (validItems.length > 0) {
                const { error: itemsError } = await supabase.from('recipe_items').insert(
                    validItems.map((item: any) => ({
                        recipe_id: id,
                        ingredient_id: item.ingredient_id,
                        quantity_needed: item.quantity_needed,
                        unit_used: item.unit_used,
                    }))
                )
                if (itemsError) throw itemsError
            }
        },
        onSuccess: () => {
            toast.success('Dish updated successfully')
            router.push('/menu')
            router.refresh()
        },
        onError: (error) => {
            toast.error('Update failed: ' + error.message)
        },
    })

    if (isLoadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-12 relative pb-24">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] -z-10" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-6">
                    <Link href="/menu">
                        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Edit Dish</h1>
                        <p className="text-muted-foreground text-sm">Update your menu item and photo</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))}>
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="glass-card">
                            <CardHeader className="p-8 border-b border-white/5">
                                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <ImageIcon className="w-5 h-5 text-primary" />
                                    </div>
                                    Dish Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="grid md:grid-cols-3 gap-8">
                                    <div className="md:col-span-1 space-y-3">
                                        <Label className="text-xs text-muted-foreground">Dish Photo</Label>
                                        <div className="aspect-square rounded-2xl bg-sidebar/40 border-2 border-dashed border-white/5 flex flex-col items-center justify-center relative overflow-hidden group hover:border-primary/30 transition-all">
                                            {isUploading ? (
                                                <div className="flex flex-col items-center gap-2 text-primary animate-pulse">
                                                    <Loader2 className="w-8 h-8 animate-spin" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Uploading...</span>
                                                </div>
                                            ) : watch('image_url') ? (
                                                <>
                                                    <img src={watch('image_url')} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-sidebar/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
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
                                    </div>

                                    <div className="md:col-span-2 space-y-6">
                                        <div className="space-y-3">
                                            <Label className="text-xs text-muted-foreground">Dish Name</Label>
                                            <Input
                                                {...register('name', { required: 'Dish name is required' })}
                                                className="h-16 bg-sidebar/40 border-white/5 rounded-2xl text-xl font-black text-foreground focus:border-primary/50 transition-all"
                                            />
                                            {errors.name && (
                                                <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest px-1">{errors.name.message}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <Label className="text-xs text-muted-foreground">Menu Price ($)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...register('menu_price', { valueAsNumber: true })}
                                                    className="h-14 bg-sidebar/40 border-white/5 rounded-xl text-lg font-black text-foreground"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-xs text-muted-foreground">Category</Label>
                                                <Select
                                                    value={watch('category')}
                                                    onValueChange={(val) => setValue('category', val)}
                                                >
                                                    <SelectTrigger className="h-14 bg-sidebar/40 border-white/5 rounded-xl text-foreground font-bold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-card border-white/5">
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
                                    <Label className="text-xs text-muted-foreground">Description (Optional)</Label>
                                    <Textarea
                                        {...register('description')}
                                        rows={3}
                                        className="bg-sidebar/40 border-white/5 rounded-2xl text-foreground font-medium focus:border-primary/50 transition-all resize-none"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full h-12 border border-dashed border-white/5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 flex items-center justify-between px-6"
                        >
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Advanced: Ingredient & Cost Tracking</span>
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>

                        {showAdvanced && (
                            <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                                <Card className="glass-card">
                                    <CardHeader className="p-8 border-b border-white/5">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-blue-500" />
                                                </div>
                                                Ingredients
                                            </CardTitle>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => append({ ingredient_id: '', quantity_needed: 0, unit_used: 'g' })}
                                                className="h-10 px-4 text-foreground/40 font-bold uppercase text-[10px] bg-white/5 hover:bg-white/10 rounded-xl"
                                            >
                                                <Plus className="w-3 h-3 mr-2" />
                                                Add Row
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8">
                                        <div className="space-y-4">
                                            {fields.map((field, index) => (
                                                <div key={field.id} className="flex gap-4 items-center">
                                                    <div className="flex-1">
                                                        <Select
                                                            value={items[index]?.ingredient_id || ''}
                                                            onValueChange={(val) => {
                                                                const newItems = [...items]
                                                                newItems[index].ingredient_id = val
                                                                setValue('items', newItems)
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-14 bg-sidebar/40 border-white/5 rounded-xl text-foreground font-bold">
                                                                <SelectValue placeholder="Select ingredient..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-white/5">
                                                                {ingredients?.map((i) => (
                                                                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="w-32">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            {...register(`items.${index}.quantity_needed`, { valueAsNumber: true })}
                                                            className="h-14 bg-sidebar/40 border-white/5 rounded-xl text-center font-black text-foreground"
                                                        />
                                                    </div>
                                                    <div className="w-32">
                                                        <Select
                                                            value={items[index]?.unit_used || 'g'}
                                                            onValueChange={(val) => {
                                                                const newItems = [...items]
                                                                newItems[index].unit_used = val
                                                                setValue('items', newItems)
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-14 bg-sidebar/40 border-white/5 rounded-xl text-foreground font-bold">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-white/5">
                                                                {ALL_UNITS.map((u) => (
                                                                    <SelectItem key={u} value={u}>{u}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => remove(index)}
                                                        className="h-14 w-14 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            <Card className="glass-card">
                                <CardHeader className="p-8 border-b border-white/5">
                                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-3 text-primary">
                                        <TrendingUp className="w-5 h-5" />
                                        Profit Matrix
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8">
                                    {costPreview ? (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Total Plate Cost</span>
                                                <span className="text-foreground font-bold">{formatCurrency(costPreview.total_cost)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-lg font-bold">
                                                <span className="text-muted-foreground">Gross Margin</span>
                                                <span className={getMarginColorClass(costPreview.margin_status)}>{formatPercentage(costPreview.food_cost_percentage)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-sm text-center py-8">Adjust ingredients to see analysis</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Button
                                type="submit"
                                disabled={saveMutation.isPending}
                                className="w-full h-14 bg-primary hover:bg-primary text-foreground font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-95 group font-display"
                            >
                                {saveMutation.isPending ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                                        Finalize Edit
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
