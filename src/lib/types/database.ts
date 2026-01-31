// Database types for Mise application
// These types reflect the Supabase database schema

export interface Profile {
    id: string
    restaurant_name: string | null
    currency_symbol: string
    role: 'chef' | 'cook' | 'owner'
}

export interface Ingredient {
    id: string
    user_id: string
    name: string
    category: IngredientCategory | null
    purchase_price: number
    purchase_unit: string
    conversion_ratio: number
    current_stock: number
    par_level: number
    updated_at: string
}

export type IngredientCategory =
    | 'Produce'
    | 'Meat'
    | 'Seafood'
    | 'Dairy'
    | 'Dry Goods'
    | 'Oils & Fats'
    | 'Spices'
    | 'Beverages'
    | 'Butchery'
    | 'Fish'
    | 'Dry'
    | 'Pastry'
    | 'Other'

export interface Recipe {
    id: string
    user_id: string
    name: string
    description: string | null
    menu_price: number
    prep_time_minutes: number | null
    target_food_cost_pct: number
    created_at: string
}

export interface RecipeItem {
    id: string
    recipe_id: string
    ingredient_id: string
    quantity_needed: number
    unit_used: string
    // Joined data
    ingredient?: Ingredient
}

export interface RecipeWithItems extends Recipe {
    recipe_items: RecipeItem[]
}

// Form input types
export interface IngredientFormInput {
    name: string
    category: IngredientCategory | null
    purchase_price: number
    purchase_unit: string
    current_stock: number
    par_level: number
}

export interface RecipeFormInput {
    name: string
    description: string | null
    menu_price: number
    prep_time_minutes: number | null
    target_food_cost_pct: number
    items: {
        ingredient_id: string
        quantity_needed: number
        unit_used: string
    }[]
}

// Cost calculation types
export interface CostCalculation {
    total_cost: number
    gross_margin_dollars: number
    food_cost_percentage: number
    is_profitable: boolean
    margin_status: 'excellent' | 'good' | 'warning' | 'danger'
}

export interface RecipeItemWithIngredient {
    quantity_needed: number
    unit_used: string
    ingredient: {
        purchase_price: number
        purchase_unit: string
        conversion_ratio: number
        name: string
    }
}
