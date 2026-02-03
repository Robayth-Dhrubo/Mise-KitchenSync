import { type CostCalculation, type RecipeItemWithIngredient } from '@/lib/types/database'

/**
 * Calculate the total cost of a recipe based on its ingredients
 * This is the "killer feature" - Dynamic Recipe Costing
 */
export function calculateRecipeCost(
    items: RecipeItemWithIngredient[],
    menuPrice: number,
    targetFoodCostPct: number = 30
): CostCalculation {
    // Calculate total ingredient cost
    const totalCost = items.reduce((sum, item) => {
        // Cost per unit of ingredient
        const costPerUnit = item.ingredient.purchase_price / (item.ingredient.conversion_ratio || 1)
        // Cost for this recipe item
        const itemCost = costPerUnit * item.quantity_needed
        return sum + itemCost
    }, 0)

    // Calculate margins
    const grossMarginDollars = menuPrice - totalCost
    const margin = menuPrice > 0 ? (grossMarginDollars / menuPrice) * 100 : 0
    const foodCostPercentage = menuPrice > 0 ? (totalCost / menuPrice) * 100 : 0
    const isProfitable = grossMarginDollars > 0 && foodCostPercentage <= targetFoodCostPct

    // Determine margin status for visual feedback
    let marginStatus: CostCalculation['margin_status']
    if (foodCostPercentage <= 25) {
        marginStatus = 'excellent' // Green - Great margins
    } else if (foodCostPercentage <= 30) {
        marginStatus = 'good' // Green - Industry standard
    } else if (foodCostPercentage <= 35) {
        marginStatus = 'warning' // Yellow - Needs attention
    } else {
        marginStatus = 'danger' // Red - Unprofitable
    }

    return {
        id: '', // Will be set by database
        recipe_id: '', // Will be set by database
        total_cost: Math.round(totalCost * 100) / 100,
        margin: Math.round(margin * 10) / 10,
        gross_margin_dollars: Math.round(grossMarginDollars * 100) / 100,
        food_cost_percentage: Math.round(foodCostPercentage * 10) / 10,
        is_profitable: isProfitable,
        margin_status: marginStatus,
        updated_at: new Date().toISOString()
    }
}

/**
 * Check if a recipe should be considered "In Stock" based on required ingredients.
 * Returns true if every ingredient has current_stock >= quantity.
 */
export function isRecipeInStock(items: RecipeItemWithIngredient[]): boolean {
    if (!items || items.length === 0) return true // No ingredients? Always in stock (e.g. water)

    return items.every(item => {
        // Essential Fix: Compare stock in base units (current_stock * conversion_ratio)
        // vs usage units (quantity_needed). 

        if (!item.ingredient) return true

        const currentStock = item.ingredient.current_stock ?? 0
        const ratio = item.ingredient.conversion_ratio ?? 1
        const needed = item.quantity_needed ?? (item as any).quantity ?? 0

        const stockInBaseUnits = currentStock * ratio
        return stockInBaseUnits >= needed
    })
}

/**
 * Format currency with the user's preferred symbol
 */
export function formatCurrency(amount: number, symbol: string = '$'): string {
    return `${symbol}${amount.toFixed(2)}`
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
}

/**
 * Get color class based on margin status
 */
export function getMarginColorClass(status: CostCalculation['margin_status']): string {
    switch (status) {
        case 'excellent':
            return 'text-emerald-500'
        case 'good':
            return 'text-green-500'
        case 'warning':
            return 'text-yellow-500'
        case 'danger':
            return 'text-red-500'
        default:
            return 'text-neutral-500'
    }
}

/**
 * Get background color class based on margin status
 */
export function getMarginBgClass(status: CostCalculation['margin_status']): string {
    switch (status) {
        case 'excellent':
            return 'bg-emerald-500/10'
        case 'good':
            return 'bg-green-500/10'
        case 'warning':
            return 'bg-yellow-500/10'
        case 'danger':
            return 'bg-red-500/10'
        default:
            return 'bg-neutral-500/10'
    }
}

/**
 * Common unit measurements for ingredients
 */
export const UNITS = {
    weight: ['g', 'kg', 'oz', 'lb'],
    volume: ['ml', 'L', 'fl oz', 'cup', 'gal'],
    count: ['each', 'dozen', 'case', 'bunch'],
} as const

export const ALL_UNITS = [...UNITS.weight, ...UNITS.volume, ...UNITS.count]
