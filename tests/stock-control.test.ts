import { describe, expect, it } from 'vitest'
import { costRecipe, createDraftOrders, kitchenDay, sampleWorkspace, workspaceSchema } from '../src/lib/workspace/domain'
import { demoWorkspace } from '../src/lib/workspace/demo'
import { addDays } from '../src/lib/workspace/operations'
import { convertMeasure, ingredientQuantity } from '../src/lib/workspace/measurements'
import { applyCount, countSubmission, forecastOrders, inventoryTransition, newCountDraft, purchaseForecast, rebaseCount, stationPrep, theoreticalUsage } from '../src/lib/workspace/inventory-control'
import { countDraftKey, readCountDraft } from '../src/lib/workspace/offline-counts'
import { demoInventoryHistory } from '../src/lib/workspace/inventory-demo'
import { prepareSalesUsage, reconcileInventory } from '../src/lib/workspace/inventory-reconciliation'
import { importInventory, inventoryCsv } from '../src/lib/workspace/import-export'

describe('Explicit purchasing and recipe conversions', () => {
  it('preserves absent optional columns during a price update and round-trips density', () => {
    const state = sampleWorkspace(), ingredient = state.ingredients[0]
    ingredient.densityGPerMl = 1.03
    ingredient.source = { fileId: 'private-source', file: 'Supplier invoice', sheet: 'Invoice', status: 'confirmed', detail: 'Original invoice', priceDate: '2026-01-01' }
    const imported = importInventory(`name,base_unit,pack_quantity,pack_price_cad\n${ingredient.name},each,${ingredient.packQuantity},70`, state)
    expect(imported.ingredients[0]).toMatchObject({ ...ingredient, price: 70, source: { ...ingredient.source, status: 'review', detail: 'Pricing changed by inventory CSV import. Confirm against the current supplier invoice.', priceDate: undefined } })
    const restored = importInventory(inventoryCsv(imported), imported)
    expect(restored.ingredients[0].densityGPerMl).toBe(1.03)
    const blank = importInventory(`name,base_unit,pack_quantity,pack_price_cad,stock\n${ingredient.name},each,180,70,`, state)
    expect(blank.ingredients[0].stock).toBeNull()
  })
  it('distinguishes US and Imperial volumes and weight ounces', () => {
    expect(convertMeasure(1, 'gal_us', 'ml')).toBeCloseTo(3785.411784)
    expect(convertMeasure(1, 'gal_imp', 'ml')).toBeCloseTo(4546.09)
    expect(convertMeasure(1, 'fl_oz_us', 'ml')).toBeCloseTo(29.5735295625)
    expect(convertMeasure(1, 'oz', 'g')).toBeCloseTo(28.349523125)
    expect(convertMeasure(1, 'gal', 'ml')).toBeNull()
  })
  it('requires an explicit ingredient density for weight/volume and never guesses pieces', () => {
    expect(convertMeasure(2, 'L', 'g')).toBeNull()
    expect(convertMeasure(2, 'L', 'g', 1.03)).toBeCloseTo(2060)
    expect(convertMeasure(2060, 'g', 'L', 1.03)).toBeCloseTo(2)
    expect(convertMeasure(2, 'each', 'g', 1.03)).toBeNull()
    expect(convertMeasure(Infinity, 'g', 'kg')).toBeNull()
  })
  it('counts purchase packs as usable contents and costs cleaned portions with trim loss', () => {
    const ingredient = { ...sampleWorkspace().ingredients[0], baseUnit: 'g' as const, packQuantity: 5000, price: 100, yieldPct: 70 }
    expect(ingredientQuantity(2, 'pack', ingredient)).toBe(7000)
    const recipe = { ...sampleWorkspace().recipes[0], portions: 1, items: [{ id: 'line', ingredientId: ingredient.id, quantity: 200, unit: 'g' as const }] }
    expect(costRecipe(recipe, [ingredient]).portionCost).toBeCloseTo(100 / 5000 * (200 / .7))
    expect(costRecipe({ ...recipe, items: [{ ...recipe.items[0], quantity: 1, unit: 'pack' }] }, [ingredient]).portionCost).toBeCloseTo(100)
  })
})

describe('Account-specific offline count drafts', () => {
  it('retains unknown entries, accepts confirmed zero and separates account and demo keys', () => {
    const state = sampleWorkspace(), draft = newCountDraft(state, 4, 'account-a')
    draft.lines[0].quantity = 0
    const input = countSubmission(draft)
    expect(input.lines).toHaveLength(1)
    expect(input.lines[0].quantity).toBe(0)
    expect(readCountDraft(JSON.stringify(draft), 'account-a')).toEqual(draft)
    expect(readCountDraft(JSON.stringify(draft), 'account-b')).toBeNull()
    expect(countDraftKey('account-a')).not.toBe(countDraftKey('account-b'))
    expect(countDraftKey('account-a', true)).not.toBe(countDraftKey('account-a'))
  })
  it('recomputes usable quantities and leaves uncounted ingredients unchanged', () => {
    const state = sampleWorkspace(), draft = newCountDraft(state, 4, 'account-a')
    draft.lines[0] = { ...draft.lines[0], quantity: 2, unit: 'pack' }
    const result = applyCount(state, countSubmission(draft), 'Test owner')
    expect(result.state.ingredients[0].stock).toBe(360)
    expect(result.state.ingredients[1].stock).toBe(state.ingredients[1].stock)
    expect(result.data.recordedBy).toBe('Test owner')
    expect(state.ingredients[0].stock).toBe(42)
  })
  it('rebases with a new ID and clears pack counts when their meaning changed', () => {
    const state = sampleWorkspace(), draft = newCountDraft(state, 4, 'account-a')
    draft.lines[0] = { ...draft.lines[0], quantity: 2, unit: 'pack' }
    draft.lines[1].quantity = 5
    const changed = { ...state, ingredients: state.ingredients.map((item, index) => index === 0 ? { ...item, packQuantity: 120 } : item) }
    const next = rebaseCount(draft, changed, 8)
    expect(next.eventId).not.toBe(draft.eventId); expect(next.revision).toBe(8)
    expect(next.lines[0].quantity).toBeNull(); expect(next.lines[1].quantity).toBe(5)
  })
  it('rejects future counts, missing ingredients and invalid conversions', () => {
    const state = sampleWorkspace(), draft = newCountDraft(state, 1, 'account-a')
    draft.lines[0].quantity = 1
    expect(() => applyCount(state, { ...countSubmission(draft), date: '2100-01-01' }, 'Owner')).toThrow('future')
    expect(() => applyCount({ ...state, ingredients: [] }, countSubmission(draft), 'Owner')).toThrow('removed')
    expect(() => applyCount(state, { ...countSubmission(draft), lines: [{ ingredientId: state.ingredients[0].id, quantity: 1, unit: 'kg' }] }, 'Owner')).toThrow('unit')
  })
})

describe('Receipts, waste and station targets', () => {
  it('records semantic receipts and waste without treating the same net delta as another adjustment', () => {
    const state = sampleWorkspace(), orders = createDraftOrders(state, kitchenDay(), () => 'test-order')
    const order = orders[0]
    const ingredient = state.ingredients.find(item => item.id === order.lines[0].ingredientId)!
    const incoming = order.lines.filter(line => line.ingredientId === ingredient.id).reduce((sum, line) => sum + line.packs * line.usablePerPack, 0)
    const received = { ...state, orders: [{ ...order, status: 'received' as const, received: kitchenDay() }], ingredients: state.ingredients.map(item => ({ ...item, stock: item.stock! + order.lines.filter(line => line.ingredientId === item.id).reduce((sum, line) => sum + line.packs * line.usablePerPack, 0) })) }
    const transition = inventoryTransition(state, received)
    expect(transition.lines.filter(line => line.ingredientId === ingredient.id)).toMatchObject([{ reason: 'received', quantity: incoming }])
    expect(transition.lines.some(line => line.reason === 'adjustment')).toBe(false)
    const edited = { ...received, ingredients: received.ingredients.map(item => item.id === ingredient.id ? { ...item, stock: item.stock! - 1 } : item) }
    expect(inventoryTransition(received, edited).lines).toMatchObject([{ reason: 'adjustment', quantity: -1 }])
  })
  it('uses only a fresh station count and does not duplicate dated recipe tasks', () => {
    const state = demoWorkspace(), station = state.stockControl!.stations[0]
    const tasks = stationPrep(state, station, kitchenDay(), () => 'station-task')
    expect(tasks).toHaveLength(1); expect(tasks[0].quantity).toContain('18 portions')
    expect(stationPrep({ ...state, prep: [...state.prep, ...tasks] }, station, kitchenDay())).toHaveLength(0)
    expect(stationPrep(state, { ...station, targets: station.targets.map(target => ({ ...target, countedOn: addDays(kitchenDay(), -1) })) }, kitchenDay())).toHaveLength(0)
    expect(workspaceSchema.safeParse({ ...state, recipes: [] }).success).toBe(false)
  })
})

describe('Theoretical usage, safe depletion and demand scenarios', () => {
  it('uses sold units and batch yield, and does not require prices to estimate quantities', () => {
    const state = demoWorkspace(), report = state.operations!.salesReports[0]
    const usage = theoreticalUsage(report, state)
    expect(usage.complete).toBe(true)
    expect(usage.lines.find(line => line.ingredientId === 'sample-eggs')?.quantity).toBe(495)
    state.ingredients[0].price = null
    expect(theoreticalUsage(report, state).complete).toBe(true)
    expect(theoreticalUsage(report, state).cost).toBeNull()
    report.rows[0].recipeId = null
    expect(theoreticalUsage(report, state).complete).toBe(false)
  })
  it('blocks depletion of historical reports already included in a physical count', () => {
    const state = demoWorkspace(), report = state.operations!.salesReports[0]
    expect(() => prepareSalesUsage(state, report, demoInventoryHistory(state))).toThrow('physical count already includes')
  })
  it('deducts once from a prior baseline and rejects overlaps and insufficient stock', () => {
    const state = demoWorkspace(), report = state.operations!.salesReports[0], events = demoInventoryHistory(state).filter(event => event.id === 'demo-count-open')
    state.ingredients = state.ingredients.map(item => ({ ...item, stock: 100000 }))
    const posted = prepareSalesUsage(state, report, events)
    expect(posted.state.ingredients[0].stock).toBe(100000 - 495)
    const event = { id: 'posted', kind: 'usage' as const, occurredOn: report.through, recordedAt: new Date().toISOString(), revision: 2, referenceId: report.id, data: { name: report.name, source: report.source, from: report.from, through: report.through, lines: posted.lines, recipeIds: ['sample-monte'] } }
    expect(() => prepareSalesUsage(state, report, [...events, event])).toThrow('already been posted')
    expect(() => prepareSalesUsage(state, { ...report, id: 'new-snapshot' }, [...events, event])).toThrow('overlapping')
    expect(() => prepareSalesUsage({ ...state, ingredients: state.ingredients.map(item => ({ ...item, stock: 0 })) }, report, events)).toThrow('exceeds')
  })
  it('subtracts open order quantities and refuses a partial demand model', () => {
    const state = demoWorkspace(), report = state.operations!.salesReports[0]
    const forecast = purchaseForecast(state, report, 3, 1)
    expect(forecast.span).toBe(7)
    const orders = forecastOrders(state, report, 3, 1, () => 'forecast-order')
    expect(orders.length).toBeGreaterThan(0)
    const next = purchaseForecast({ ...state, orders }, report, 3, 1)
    expect(next.forecast.every(line => line.packs === 0)).toBe(true)
    expect(() => forecastOrders(state, { ...report, rows: report.rows.map(row => ({ ...row, recipeId: null })) }, 3, 1)).toThrow('Complete every')
    expect(() => purchaseForecast(state, report, 0, 1)).toThrow('1–30')
  })
})

describe('Physical usage variance', () => {
  it('separates received stock and unexplained usage at a saved closing price', () => {
    const state = demoWorkspace(), events = demoInventoryHistory(state)
    const opening = events.find(event => event.kind === 'count' && event.data.phase === 'opening')!, closing = events.find(event => event.kind === 'count' && event.data.phase === 'closing')!
    if (opening.kind !== 'count' || closing.kind !== 'count') throw new Error('Invalid fixture')
    const review = reconcileInventory(opening, closing, state.operations!.salesReports[0], state, events)
    expect(review.complete).toBe(true)
    expect(review.rows.find(row => row.ingredientId === 'sample-ham')?.receipts).toBe(1000)
    expect(review.rows.find(row => row.ingredientId === 'sample-cheese')?.variance).toBeCloseTo(80)
    expect(review.varianceValue).toBeCloseTo(1.12)
  })
  it('keeps missing counts and mismatched periods unresolved', () => {
    const state = demoWorkspace(), events = demoInventoryHistory(state), opening = events[2], closing = events[0]
    if (opening.kind !== 'count' || closing.kind !== 'count') throw new Error('Invalid fixture')
    const missing = { ...opening, data: { ...opening.data, lines: opening.data.lines.slice(1) } }
    expect(reconcileInventory(missing, closing, state.operations!.salesReports[0], state, events).varianceValue).toBeNull()
    const different = { ...state.operations!.salesReports[0], from: addDays(opening.occurredOn, 1) }
    expect(reconcileInventory(opening, closing, different, state, events).rows.every(row => row.variance === null)).toBe(true)
    expect(reconcileInventory({ ...opening, data: { ...opening.data, phase: 'spot' } }, closing, state.operations!.salesReports[0], state, events).complete).toBe(false)
  })
})
