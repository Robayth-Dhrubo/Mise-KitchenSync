export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface VendorProduct {
    id: string
    vendor_id: string
    ingredient_id: string
    vendor_sku?: string
    vendor_price: number
    unit: string
    pack_size?: string
    is_preferred?: boolean
    last_updated?: string
    supplier?: Supplier
    scrape_status?: string
    product_url?: string
}

export interface Supplier {
    id: string
    name: string
    email?: string
    delivery_days?: string[]
}

export type IngredientCategory = 'produce' | 'meat' | 'seafood' | 'dairy' | 'dry_goods' | 'oils_fats' | 'spices' | 'beverages' | 'other'

export interface Ingredient {
    id: string
    user_id: string
    name: string
    category?: string
    purchase_price: number
    purchase_unit: string
    conversion_ratio?: number
    current_stock?: number
    par_level?: number
    updated_at?: string
}

export type MarginStatus = 'excellent' | 'good' | 'healthy' | 'warning' | 'danger'

export interface CostCalculation {
    id: string
    recipe_id: string
    total_cost: number
    margin: number
    margin_status: MarginStatus
    food_cost_percentage: number
    gross_margin_dollars: number
    is_profitable: boolean
    updated_at: string
}

export interface RecipeItemWithIngredient {
    id: string
    recipe_id: string
    ingredient_id: string
    quantity_needed: number
    unit_used: string
    ingredient: Ingredient
}

export interface Recipe {
    id: string
    name: string
    category?: string
    menu_price: number
    is_available?: boolean
    created_at?: string
    user_id?: string
    description?: string
    image_url?: string
    recipe_items?: RecipeItemWithIngredient[]
    margin_status?: MarginStatus
}