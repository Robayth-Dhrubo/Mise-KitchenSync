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
    cook_time_minutes: number | null
    yield_quantity: number
    yield_unit: string
    is_component: boolean
    category: string | null
    image_url: string | null
    target_food_cost_pct: number
    is_available: boolean
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

export interface RecipeStep {
    id: string
    recipe_id: string
    step_number: number
    instruction: string
    duration_minutes: number | null
    tip: string | null
    created_at: string
}

export interface RecipeComponent {
    id: string
    parent_recipe_id: string
    component_recipe_id: string
    quantity_needed: number
    unit_used: string
    created_at: string
    // Joined data
    component_recipe?: Recipe
}

export interface RecipeWithItems extends Recipe {
    recipe_items: RecipeItem[]
    recipe_steps?: RecipeStep[]
    recipe_components?: RecipeComponent[]
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
        current_stock: number
        name: string
    }
}

// Supplier / Vendor types
export interface Supplier {
    id: string
    user_id: string
    name: string
    email: string | null
    delivery_days: string[] | null
    created_at: string
}

export interface VendorProduct {
    id: string
    user_id: string
    vendor_id: string
    ingredient_id: string
    vendor_sku: string | null
    vendor_price: number
    unit: string
    pack_size: string | null
    is_preferred: boolean
    last_updated: string
    // Scraper fields
    product_url?: string
    scrape_status?: 'pending' | 'success' | 'error' | 'price_spike'
    last_scraped_at?: string
    // Joined data
    supplier?: Supplier
    ingredient?: Ingredient
}

// Shopping list item with vendor info
export interface ShoppingListItem {
    id: string
    user_id: string
    ingredient_id: string
    vendor_id: string | null
    vendor_price: number | null
    quantity_to_order: number
    status: 'pending' | 'ordered' | 'received'
    expected_delivery_date: string | null
    received_date: string | null
    created_at: string
    // Joined data
    ingredient?: Ingredient
    supplier?: Supplier
}

// For the smart order cart (before submission)
export interface SmartOrderCartItem {
    ingredient_id: string
    ingredient_name: string
    vendor_id: string | null
    vendor_name: string | null
    vendor_price: number
    quantity: number
    unit: string
}

