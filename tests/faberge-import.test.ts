import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { emptyWorkspace, sampleWorkspace, workspaceSchema } from '../src/lib/workspace/domain'
import { fabergeReportSchema, mergeFaberge, requiredAssets } from '../src/lib/workspace/faberge'

describe('Fabergé record import', () => {
  it('preserves user edits and maps recipe relationships to existing ingredient IDs', () => {
    const existing = sampleWorkspace('2026-10-10')
    existing.sampleData = false
    existing.ingredients[0] = { ...existing.ingredients[0], id: 'my-eggs', stock: 73, price: 99 }
    existing.recipes = []
    const incoming = sampleWorkspace('2026-10-10')
    incoming.ingredients[0] = { ...incoming.ingredients[0], price: 12, stock: null }
    const result = mergeFaberge(existing, incoming)
    expect(result.state.ingredients.find(i => i.id === 'my-eggs')?.price).toBe(99)
    expect(result.state.ingredients.find(i => i.id === 'my-eggs')?.stock).toBe(73)
    expect(result.state.recipes[0].items.find(i => i.ingredientId === 'my-eggs')).toBeTruthy()
    expect(result.state.ingredients).toHaveLength(existing.ingredients.length)
    expect(result.receipt.ingredientsAdded).toBe(0)
    expect(result.receipt.recipesAdded).toBe(2)
  })
  it('replaces illustrative sample records while keeping the kitchen settings', () => {
    const existing = sampleWorkspace('2026-10-10')
    existing.settings.kitchenName = 'Faberge'
    const incoming = emptyWorkspace()
    incoming.suppliers = [{ id: 'real-supplier', name: 'Real supplier', contact: '', email: '', phone: '', deliveryDays: '', notes: '' }]
    const result = mergeFaberge(existing, incoming)
    expect(result.state.ingredients).toEqual([])
    expect(result.state.suppliers.map(s => s.id)).toEqual(['real-supplier'])
    expect(result.state.settings.kitchenName).toBe('Faberge')
    expect(result.state.sampleData).toBe(false)
  })
  it('keeps an undated prep template undated through validation and repeated merging', () => {
    const incoming = emptyWorkspace()
    incoming.prep = [{ id: 'template', name: 'Hollandaise', station: 'Egg', assignee: '', quantity: '', due: null, priority: 'normal', status: 'todo' }]
    const first = mergeFaberge(emptyWorkspace(), incoming)
    expect(workspaceSchema.parse(first.state).prep[0].due).toBeNull()
    expect(mergeFaberge(first.state, incoming).state.prep).toHaveLength(1)
  })
})

const packagePath = process.env.FABERGE_IMPORT_PACKAGE
describe.skipIf(!packagePath)('Fabergé source package verification', () => {
  it('validates every record, source link and bounded report before upload', () => {
    const payload = JSON.parse(readFileSync(packagePath!, 'utf8'))
    const state = workspaceSchema.parse(payload.workspace)
    const report = fabergeReportSchema.parse(payload.report)
    const sourceIds = new Set(report.files.map(f => f.id))
    for (const record of [...state.ingredients, ...state.recipes, ...state.suppliers, ...state.prep]) {
      if (record.source) expect(sourceIds.has(record.source.fileId)).toBe(true)
    }
    expect(state.ingredients.filter(i => i.category !== 'Recipe inputs to confirm').length).toBeGreaterThan(0)
    expect(state.ingredients.every(i => i.stock === null && i.par === null)).toBe(true)
    expect(state.prep.every(p => p.due === null)).toBe(true)
    expect(report.summary.salesRows).toBeGreaterThan(0)
    expect(report.summary.salesTotal).toBeGreaterThan(0)
    expect(report.sales.daily.reduce((sum, row) => sum + row.sales, 0)).toBeCloseTo(report.summary.salesTotal, 2)
    expect(report.sales.items.reduce((sum, row) => sum + row.sales, 0)).toBeCloseTo(report.summary.salesTotal, 2)
    expect(report.sales.categories.reduce((sum, row) => sum + row.sales, 0)).toBeCloseTo(report.summary.salesTotal, 2)
    expect(report.sales.menu.length).toBeGreaterThan(0)
    expect(report.sales.menu.reduce((sum, row) => sum + row.sold, 0)).toBeGreaterThan(0)
    expect(report.sales.menu.some(row => /TOTAL/i.test(row.name))).toBe(false)
    expect(report.team.schedule.find(p => p.payType === 'Salary')?.hours).toBeNull()
    expect(report.team.payrollSummary.reportedTotal).toBeGreaterThan(0)
    expect(report.team.payrollSummary.management).toBeGreaterThanOrEqual(0)
    expect(report.team.payrollSummary.management).toBeLessThanOrEqual(report.team.payrollSummary.reportedTotal!)
    expect(state.ingredients.find(i => i.name === 'Ham Boneless Toupie')?.packQuantity).toBeNull()
    expect(state.ingredients.find(i => i.name === 'Salmon Atlantic Smoked Sliced')?.packQuantity).toBeNull()
    expect(state.recipes.find(r => r.name === 'Hollandaise')?.items.some(i => i.quantity === null)).toBe(true)
    expect(requiredAssets(report).length).toBeGreaterThan(0)
  })
})
