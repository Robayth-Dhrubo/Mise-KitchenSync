import { describe, expect, it } from 'vitest'
import { sampleWorkspace, workspaceSchema } from '../src/lib/workspace/domain'
import { demoWorkspace } from '../src/lib/workspace/demo'
import { analyseMenu, importSales, storeSalesReport } from '../src/lib/workspace/menu-analysis'
import { emptyOperations, type SalesReport } from '../src/lib/workspace/operations'

const details = { id: 'sales-one', name: 'Weekly items', from: '2026-10-01', through: '2026-10-07', source: 'Till export' }
const state = () => sampleWorkspace('2026-10-14')
let id = 0
const newId = () => `row-${++id}`

describe('Reviewed sales imports', () => {
  it('matches exact unique names and leaves unfamiliar items for review', () => {
    const report = importSales('item,quantity,net_sales_cad\nMonte Cristo,10,240\nOther dish,5,100', state(), details, newId)
    expect(report.rows[0].recipeId).toBe('sample-monte')
    expect(report.rows[1].recipeId).toBeNull()
    expect(report.rows[0].netSales).toBe(240)
  })
  it('handles a BOM, quoted names and case differences', () => {
    const workspace = state(); workspace.recipes[0].name = 'Monte, Cristo'
    const report = importSales('\uFEFFitem,quantity,net_sales_cad\r\n"MONTE, CRISTO",10,240', workspace, details, newId)
    expect(report.rows[0].recipeId).toBe('sample-monte')
  })
  it('does not guess between ambiguous recipe names', () => {
    const workspace = state(); workspace.recipes.push({ ...workspace.recipes[0], id: 'other-recipe' })
    expect(importSales('item,quantity,net_sales_cad\nMonte Cristo,10,240', workspace, details, newId).rows[0].recipeId).toBeNull()
  })
  it.each([
    'item,quantity,net_sales_cad\nDish,,100', 'item,quantity,net_sales_cad\nDish,-1,100',
    'item,quantity,net_sales_cad\nDish,1,$100', 'item,quantity,net_sales_cad\nDish,1,NaN',
    'item,quantity,net_sales_cad\nDish,0,100', 'item,quantity,net_sales_cad\nDish,1,100\nDISH,2,200',
    'item,quantity,quantity\nDish,1,100', 'item,quantity,net_sales_cad\nDish,1', 'item,quantity,net_sales_cad',
  ])('rejects ambiguous or invalid totals: %s', source => { expect(() => importSales(source, state(), details, newId)).toThrow() })
  it('rejects invalid or reversed dates and excessive item rows', () => {
    const source = 'item,quantity,net_sales_cad\nDish,1,20'
    expect(() => importSales(source, state(), { ...details, from: '2026-02-30' }, newId)).toThrow()
    expect(() => importSales(source, state(), { ...details, from: '2026-10-08' }, newId)).toThrow('end date')
    expect(() => importSales(`item,quantity,net_sales_cad\n${Array.from({ length: 501 }, (_, index) => `Dish ${index},1,20`).join('\n')}`, state(), details, newId)).toThrow('500')
  })
  it('requires a unique snapshot per source and dates, and supports replacing its links', () => {
    const report = importSales('item,quantity,net_sales_cad\nMonte Cristo,10,240', state(), details, newId)
    const saved = storeSalesReport(state(), report)
    expect(() => storeSalesReport(saved, { ...report, id: 'duplicate' })).toThrow('already exists')
    const replaced = storeSalesReport(saved, { ...report, rows: [{ ...report.rows[0], recipeId: null }] }, report.id)
    expect(replaced.operations!.salesReports).toHaveLength(1)
    expect(replaced.operations!.salesReports[0].rows[0].recipeId).toBeNull()
    expect(workspaceSchema.safeParse({ ...saved, operations: { ...saved.operations!, salesReports: [report, { ...report, id: 'duplicate' }] } }).success).toBe(false)
  })
})

describe('Sales-weighted menu calculations', () => {
  it('uses actual recorded revenue rather than multiplying a current menu price', () => {
    const report = importSales('item,quantity,net_sales_cad\nMonte Cristo,10,200', state(), details, newId)
    const result = analyseMenu(report, state())
    const cost = 2 * 30 / 24 + 80 * 15 / 1000 + 35 * 28 / 2000 + 64 / 180 + 15 * 18 / 1000
    expect(result.totalFoodCost).toBeCloseTo(cost * 10)
    expect(result.contribution).toBeCloseTo(200 - cost * 10)
    expect(result.rows[0].averagePrice).toBe(20)
    expect(result.foodPct).toBeCloseTo(cost * 10 / 200 * 100)
  })
  it('keeps the total contribution unknown when a sold item has no cost', () => {
    const report = importSales('item,quantity,net_sales_cad\nMonte Cristo,10,240\nOther,5,100', state(), details, newId)
    const result = analyseMenu(report, state())
    expect(result.netSales).toBe(340)
    expect(result.contribution).toBeNull(); expect(result.foodPct).toBeNull()
    expect(result.rows[0].contribution).not.toBeNull()
    expect(result.missing).toBe(1)
  })
  it('recalculates against current prices without changing the source report', () => {
    const workspace = state()
    const report = importSales('item,quantity,net_sales_cad\nMonte Cristo,10,240', workspace, details, newId)
    const original = JSON.stringify(report)
    const before = analyseMenu(report, workspace)
    workspace.ingredients = workspace.ingredients.map(ingredient => ({ ...ingredient, price: ingredient.price === null ? null : ingredient.price * 2 }))
    expect(analyseMenu(report, workspace).totalFoodCost).toBeCloseTo(before.totalFoodCost! * 2)
    expect(JSON.stringify(report)).toBe(original)
  })
  it('uses weighted contribution and comparable-item share, excluding zero-sale items', () => {
    const workspace = demoWorkspace()
    const report = workspace.operations!.salesReports[0]
    const result = analyseMenu(report, workspace)
    expect(result.comparableCount).toBe(4)
    expect(result.popularityThreshold).toBeCloseTo(0.175)
    expect(result.averageContribution).toBeCloseTo(result.contribution! / result.units)
    expect(result.rows.find(row => row.recipeId === 'sample-monte')?.action).toBe('Feature it')
    const zero: SalesReport = { ...report, rows: [...report.rows, { id: 'zero', item: 'Unsold', quantity: 0, netSales: 0, recipeId: null }] }
    expect(analyseMenu(zero, workspace).contribution).toBe(result.contribution)
    expect(analyseMenu(zero, workspace).rows.at(-1)?.action).toBe('No sales')
  })
  it('does not give a misleading menu classification with only one comparable item', () => {
    const report = importSales('item,quantity,net_sales_cad\nMonte Cristo,10,240', state(), details, newId)
    expect(analyseMenu(report, state()).rows[0].reason).toContain('At least two')
  })
  it('always flags non-positive ingredient contribution instead of suggesting promotion', () => {
    const workspace = demoWorkspace(), report = workspace.operations!.salesReports[0]
    const result = analyseMenu({ ...report, rows: report.rows.map(row => ({ ...row, netSales: 0 })) }, workspace)
    expect(result.rows.every(row => row.action === 'Review the margin')).toBe(true)
    expect(result.rows[0].reason).toContain('at least the recorded revenue')
  })
  it('preserves new modules and blocks a dangling recipe reference during restore', () => {
    const report = importSales('item,quantity,net_sales_cad\nMonte Cristo,10,240', state(), details, newId)
    const saved = storeSalesReport({ ...state(), operations: { ...emptyOperations(), employees: [{ id: 'person', name: 'Test', role: 'Cook', hourlyRate: null, active: true, availableDays: [], notes: '' }] } }, report)
    expect(workspaceSchema.parse(saved).operations!.employees).toHaveLength(1)
    expect(workspaceSchema.safeParse({ ...saved, recipes: [] }).success).toBe(false)
  })
})
