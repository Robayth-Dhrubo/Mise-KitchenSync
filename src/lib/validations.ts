import { z } from 'zod'

export const ingredientSchema = z.object({
    name: z.string().min(1, 'Ingredient name is required'),
    category: z.string().nullable(),
    purchase_price: z.coerce.number().positive('Price must be greater than 0'),
    purchase_unit: z.string().min(1, 'Unit is required'),
    current_stock: z.coerce.number().min(0, 'Stock cannot be negative'),
})

export type IngredientSchemaType = z.infer<typeof ingredientSchema>

export const recipeSchema = z.object({
    name: z.string().min(1, 'Recipe name is required'),
    description: z.string().nullable().optional(),
    menu_price: z.coerce.number().positive('Menu price must be greater than 0'),
    prep_time_minutes: z.coerce.number().int().positive().optional().nullable(),
    target_food_cost_pct: z.coerce.number().min(1).max(100).default(30),
    items: z.array(z.object({
        ingredient_id: z.string().min(1, 'Please select an ingredient'),
        quantity_needed: z.coerce.number().positive('Quantity must be greater than 0'),
        unit_used: z.string().min(1, 'Unit is required'),
    })).min(1, 'Recipe must have at least one ingredient'),
})

export type RecipeSchemaType = z.infer<typeof recipeSchema>

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginSchemaType = z.infer<typeof loginSchema>

export const signupSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
    restaurantName: z.string().min(1, 'Restaurant name is required'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
})

export type SignupSchemaType = z.infer<typeof signupSchema>

export const profileSchema = z.object({
    restaurant_name: z.string().min(1, 'Restaurant name is required'),
    currency_symbol: z.string().min(1, 'Currency symbol is required').max(3),
})

export type ProfileSchemaType = z.infer<typeof profileSchema>

export const stockUpdateSchema = z.object({
    current_stock: z.coerce.number().min(0, 'Stock cannot be negative'),
})

export type StockUpdateSchemaType = z.infer<typeof stockUpdateSchema>
