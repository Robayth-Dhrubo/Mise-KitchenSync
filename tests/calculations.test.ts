import { describe, it, expect } from 'vitest'
import { calculateRecipeCost, isRecipeInStock } from '../src/lib/calculations'

describe('calculateRecipeCost', () => {
  it('calculates total cost and percentages correctly for simple recipe', () => {
    const items = [
      {
        quantity_needed: 100, // units
        ingredient: {
          purchase_price: 2.0, // price per purchase unit
          conversion_ratio: 100, // purchase unit covers 100 recipe-units
          current_stock: 10,
        },
      },
      {
        quantity_needed: 50,
        ingredient: {
          purchase_price: 1.0,
          conversion_ratio: 50,
          current_stock: 5,
        },
      },
    ] as any

    // Compute: first item cost: (2.0 / 100) * 100 = 2.0
    // second item cost: (1.0 / 50) * 50 = 1.0
    // totalCost = 3.0
    const menuPrice = 12
    const result = calculateRecipeCost(items, menuPrice, 30)

    expect(result.total_cost).toBeCloseTo(3.0, 2)
    expect(result.gross_margin_dollars).toBeCloseTo(9.0, 2)
    expect(result.food_cost_percentage).toBeCloseTo((3.0 / 12) * 100, 1)
    expect(typeof result.margin_status).toBe('string')
  })

  it('handles zero menu price without throwing', () => {
    const items: any[] = []
    const result = calculateRecipeCost(items, 0, 30)
    expect(result.total_cost).toBe(0)
    expect(result.margin).toBe(0)
    expect(result.food_cost_percentage).toBe(0)
  })
})

describe('isRecipeInStock', () => {
  it('returns true when all ingredients have sufficient stock', () => {
    const items = [
      { quantity_needed: 100, ingredient: { current_stock: 2, conversion_ratio: 100 } },
      { quantity_needed: 50, ingredient: { current_stock: 2, conversion_ratio: 25 } },
    ] as any

    expect(isRecipeInStock(items)).toBe(true)
  })

  it('returns false when any ingredient is insufficient', () => {
    const items = [
      { quantity_needed: 100, ingredient: { current_stock: 0, conversion_ratio: 100 } },
      { quantity_needed: 50, ingredient: { current_stock: 2, conversion_ratio: 25 } },
    ] as any

    expect(isRecipeInStock(items)).toBe(false)
  })

  it('returns true for empty items list', () => {
    expect(isRecipeInStock([])).toBe(true)
  })
})
