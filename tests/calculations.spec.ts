import { describe, it, expect } from 'vitest'
import { calculateRecipeCost, isRecipeInStock } from '../src/lib/calculations'
import { RecipeItemWithIngredient } from '../src/lib/types/database'

describe('calculateRecipeCost', () => {
    const mockIngredient = {
        id: '1',
        name: 'Flour',
        purchase_price: 10, // $10
        purchase_unit: 'kg',
        conversion_ratio: 1000, // 1000g per kg -> price per g = 0.01
        current_stock: 5000,
        created_at: '',
        updated_at: '',
        category: 'pantry',
        user_id: '1',
    }

    const mockItem: RecipeItemWithIngredient = {
        id: '1',
        recipe_id: '1',
        ingredient_id: '1',
        quantity_needed: 500, // 500g needed. Cost = 500 * 0.01 = $5
        unit_used: 'g',
        ingredient: mockIngredient,
    }

    it('calculates cost and margins correctly for profitable item', () => {
        // Cost = $5. Menu Price = $20.
        // Gross Margin = $15.
        // Food Cost % = 5/20 = 25%.
        // Target = 30%. Should be profitable.
        const result = calculateRecipeCost([mockItem], 20, 30)

        expect(result.total_cost).toBe(5)
        expect(result.gross_margin_dollars).toBe(15)
        expect(result.food_cost_percentage).toBe(25)
        expect(result.is_profitable).toBe(true)
        expect(result.margin_status).toBe('excellent') // <= 25% is excellent
    })

    it('handles zero menu price correctly', () => {
        // Cost = $5. Menu Price = $0.
        const result = calculateRecipeCost([mockItem], 0)

        expect(result.total_cost).toBe(5)
        expect(result.food_cost_percentage).toBe(0) // Logic: menuPrice > 0 ? ... : 0
        expect(result.margin_status).toBe('excellent') // Because pct is 0 <= 25. Actually wait, logic says 0.
    })

    it('marks as unprofitable if cost exceeds target', () => {
        // Cost = $5. Menu Price = $10.
        // Cost % = 50%. Target = 30%.
        const result = calculateRecipeCost([mockItem], 10, 30)

        expect(result.is_profitable).toBe(false)
        expect(result.margin_status).toBe('danger') // > 35% is danger
    })

    it('handles zero conversion ratio safely', () => {
        const badIngredient = { ...mockIngredient, conversion_ratio: 0 }
        const badItem = { ...mockItem, ingredient: badIngredient }

        // Logic uses || 1 if conversion_ratio is 0.
        // Cost per unit = 10 / 1 = 10.
        // Total cost = 10 * 500 = 5000.
        const result = calculateRecipeCost([badItem], 10000)
        expect(result.total_cost).toBe(5000)
    })
})

describe('isRecipeInStock', () => {
    const mockIngredient = {
        id: '1',
        name: 'Flour',
        current_stock: 10, // 10 units
        conversion_ratio: 1,
        purchase_price: 1,
        purchase_unit: 'kg',
        created_at: '',
        updated_at: '',
        category: 'pantry',
        user_id: '1',
    }

    const mockItem: RecipeItemWithIngredient = {
        id: '1',
        recipe_id: '1',
        ingredient_id: '1',
        quantity_needed: 5,
        unit_used: 'kg',
        ingredient: mockIngredient,
    }

    it('returns true when stock is sufficient', () => {
        expect(isRecipeInStock([mockItem])).toBe(true)
    })

    it('returns false when stock is insufficient', () => {
        const lowStockItem = {
            ...mockItem,
            ingredient: { ...mockIngredient, current_stock: 4 }
        }
        expect(isRecipeInStock([lowStockItem])).toBe(false)
    })

    it('returns true if ingredient is missing (current behavior)', () => {
        const missingIngredientItem = { ...mockItem, ingredient: undefined } as unknown as RecipeItemWithIngredient
        expect(isRecipeInStock([missingIngredientItem])).toBe(true)
    })

    it('handles conversion correctly', () => {
        // Stock: 2 bags (ratio 1000g each) -> 2000g total
        // Needed: 1500g
        const item = {
            ...mockItem,
            quantity_needed: 1500,
            ingredient: {
                ...mockIngredient,
                current_stock: 2,
                conversion_ratio: 1000
            }
        }
        expect(isRecipeInStock([item])).toBe(true)

        // Needed: 2500g -> false
        const item2 = {
            ...item,
            quantity_needed: 2500
        }
        expect(isRecipeInStock([item2])).toBe(false)
    })
})
