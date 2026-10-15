import { z } from 'zod'
import { kitchenDay, unitCost, type Order, type PrepTask, type Workspace } from './domain'
import { ingredientQuantity } from './measurements'
import { countDraftSchema, countSubmissionSchema, recordId, type CountDraft, type CountSubmission, type Station } from './stock-control-schema'
import { calendarDate, type SalesReport } from './operations'

const nullableQuantity = z.number().finite().min(0).max(1e12).nullable()
export const stockLineSchema = z.object({ ingredientId: recordId, name: z.string().max(120), unit: z.enum(['g', 'ml', 'each']), quantity: nullableQuantity, unitCost: nullableQuantity })
export const countDataSchema = z.object({ name: z.string().max(120), phase: z.enum(['opening', 'closing', 'spot']), recordedBy: z.string().max(120), lines: z.array(stockLineSchema).min(1).max(500) })
export const movementDataSchema = z.object({ lines: z.array(stockLineSchema.extend({ quantity: z.number().finite().nullable(), reason: z.enum(['received', 'waste', 'adjustment', 'initial']), occurredOn: calendarDate })).max(2000) })
export const usageDataSchema = z.object({ name: z.string().max(120), source: z.string().max(200), from: calendarDate, through: calendarDate, lines: z.array(stockLineSchema).min(1).max(500), recipeIds: z.array(recordId).max(500) })
const eventBase = { id: recordId, occurredOn: calendarDate, recordedAt: z.iso.datetime(), revision: z.number().int().positive(), referenceId: z.string().max(100).nullable() }
export const inventoryEventSchema = z.discriminatedUnion('kind', [
  z.object({ ...eventBase, kind: z.literal('count'), data: countDataSchema }),
  z.object({ ...eventBase, kind: z.literal('movement'), data: movementDataSchema }),
  z.object({ ...eventBase, kind: z.literal('usage'), data: usageDataSchema }),
])
export type InventoryEvent = z.infer<typeof inventoryEventSchema>
export type StockLine = z.infer<typeof stockLineSchema>
export type Usage = ReturnType<typeof theoreticalUsage>

export function newCountDraft(state: Workspace, revision: number, scope: string, today = kitchenDay()): CountDraft {
  if (!state.ingredients.length) throw new Error('Add inventory ingredients before starting a count.')
  return countDraftSchema.parse({ version: 1, scope, eventId: crypto.randomUUID(), revision, kitchenName: state.settings.kitchenName, name: 'Stock count', date: today, phase: 'spot', status: 'draft', updatedAt: new Date().toISOString(),
    lines: state.ingredients.map(item => ({ ingredientId: item.id, name: item.name, baseUnit: item.baseUnit, packQuantity: item.packQuantity, yieldPct: item.yieldPct, densityGPerMl: item.densityGPerMl ?? null, baseline: item.stock, quantity: null, unit: item.baseUnit })) })
}
export function countSubmission(draft: CountDraft): CountSubmission {
  const lines = draft.lines.filter(line => line.quantity !== null).map(line => ({ ingredientId: line.ingredientId, quantity: line.quantity!, unit: line.unit }))
  return countSubmissionSchema.parse({ eventId: draft.eventId, revision: draft.revision, name: draft.name, date: draft.date, phase: draft.phase, lines })
}
export function rebaseCount(draft: CountDraft, state: Workspace, revision: number): CountDraft {
  const lines = draft.lines.flatMap(line => {
    const item = state.ingredients.find(item => item.id === line.ingredientId)
    if (!item) return []
    const compatible = line.baseUnit === item.baseUnit && (line.unit !== 'pack' || line.packQuantity === item.packQuantity && line.yieldPct === item.yieldPct) && line.densityGPerMl === (item.densityGPerMl ?? null)
    return [{ ...line, name: item.name, baseUnit: item.baseUnit, baseline: item.stock, packQuantity: item.packQuantity, yieldPct: item.yieldPct, densityGPerMl: item.densityGPerMl ?? null, quantity: compatible ? line.quantity : null, unit: compatible ? line.unit : item.baseUnit }]
  })
  if (!lines.length) throw new Error('These ingredients no longer exist. Export the old draft and start a new count.')
  return countDraftSchema.parse({ ...draft, eventId: crypto.randomUUID(), revision, status: 'draft', updatedAt: new Date().toISOString(), lines })
}
export function applyCount(state: Workspace, input: CountSubmission, recordedBy: string) {
  if (input.date > kitchenDay()) throw new Error('A physical count cannot be recorded for a future service.')
  const lines = input.lines.map(line => {
    const ingredient = state.ingredients.find(item => item.id === line.ingredientId)
    if (!ingredient) throw new Error('An ingredient was removed. Review the latest inventory before applying this count.')
    const quantity = ingredientQuantity(line.quantity, line.unit, ingredient)
    if (quantity === null || !Number.isFinite(quantity) || quantity < 0 || quantity > 1e9) throw new Error(`${ingredient.name}: check the unit, pack size or density before counting.`)
    return { ingredientId: ingredient.id, name: ingredient.name, unit: ingredient.baseUnit, quantity, unitCost: unitCost(ingredient) }
  })
  return { state: { ...state, ingredients: state.ingredients.map(item => { const line = lines.find(line => line.ingredientId === item.id); return line ? { ...item, stock: line.quantity } : item }) }, data: countDataSchema.parse({ name: input.name, phase: input.phase, recordedBy: recordedBy.slice(0, 120), lines }) }
}

export function inventoryTransition(before: Workspace, after: Workspace, today = kitchenDay()) {
  const lines: z.infer<typeof movementDataSchema>['lines'] = []
  const knownDelta = new Map<string, number>()
  const add = (line: typeof lines[number]) => { lines.push(line); if (line.quantity !== null) knownDelta.set(line.ingredientId, (knownDelta.get(line.ingredientId) ?? 0) + line.quantity) }
  for (const order of after.orders.filter(order => order.status === 'received' && !before.orders.some(old => old.id === order.id && old.status === 'received'))) for (const line of order.lines) {
    add({ ingredientId: line.ingredientId, name: line.name, unit: line.unit, quantity: line.packs * line.usablePerPack, unitCost: line.unitPrice / line.usablePerPack, reason: 'received', occurredOn: order.received! })
  }
  for (const waste of after.waste.filter(waste => !before.waste.some(old => old.id === waste.id))) {
    const ingredient = after.ingredients.find(item => item.id === waste.ingredientId)
    if (ingredient) add({ ingredientId: ingredient.id, name: ingredient.name, unit: waste.unit, quantity: -waste.quantity, unitCost: waste.cost === null ? null : waste.cost / waste.quantity, reason: 'waste', occurredOn: waste.date })
  }
  for (const item of after.ingredients) {
    const old = before.ingredients.find(old => old.id === item.id)
    if (old?.stock === item.stock && old?.baseUnit === item.baseUnit && !knownDelta.has(item.id)) continue
    const known = knownDelta.get(item.id) ?? 0
    const delta = old && old.stock !== null && item.stock !== null && old.baseUnit === item.baseUnit ? item.stock - old.stock - known : null
    if (delta !== null && Math.abs(delta) <= 1e-7 * Math.max(1, Math.abs(item.stock ?? 0))) continue
    if (!old && item.stock === null) continue
    if (old?.stock === null && item.stock === null && !known) continue
    lines.push({ ingredientId: item.id, name: item.name, unit: item.baseUnit, quantity: delta, unitCost: unitCost(item), reason: old?.stock === null || !old ? 'initial' : 'adjustment', occurredOn: today })
  }
  return movementDataSchema.parse({ lines })
}

export function theoreticalUsage(report: SalesReport, state: Workspace) {
  const issues: string[] = [], quantities = new Map<string, number>()
  for (const sold of report.rows.filter(row => row.quantity > 0)) {
    const recipe = state.recipes.find(recipe => recipe.id === sold.recipeId)
    if (!recipe) { issues.push(`${sold.item}: link the sold item to a recipe.`); continue }
    if (!recipe.portions || !recipe.items.length) { issues.push(`${sold.item}: complete the batch yield and ingredients.`); continue }
    for (const line of recipe.items) {
      const ingredient = state.ingredients.find(item => item.id === line.ingredientId)
      const quantity = ingredient && line.quantity !== null ? ingredientQuantity(line.quantity, line.unit, ingredient) : null
      if (!ingredient || quantity === null) { issues.push(`${sold.item}: complete the quantity and conversion for ${ingredient?.name ?? 'a missing ingredient'}.`); continue }
      quantities.set(ingredient.id, (quantities.get(ingredient.id) ?? 0) + quantity / recipe.portions * sold.quantity)
    }
  }
  if (!report.rows.some(row => row.quantity > 0)) issues.push('This report has no sold units.')
  const lines = [...quantities].map(([id, quantity]) => { const ingredient = state.ingredients.find(item => item.id === id)!; return { ingredientId: id, name: ingredient.name, unit: ingredient.baseUnit, quantity, unitCost: unitCost(ingredient) } })
  const complete = issues.length === 0 && lines.length > 0
  return { lines, issues: [...new Set(issues)], complete, cost: complete && lines.every(line => line.unitCost !== null) ? lines.reduce((sum, line) => sum + line.quantity * line.unitCost!, 0) : null }
}

export function stationPrep(state: Workspace, station: Station, date: string, newId = () => crypto.randomUUID()): PrepTask[] {
  if (date > kitchenDay()) throw new Error('Confirm the station count on the service date before building its automatic prep shortfall.')
  return station.targets.flatMap(target => {
    if (target.onHand === null || target.countedOn !== date) return []
    const recipe = state.recipes.find(recipe => recipe.id === target.recipeId)
    const shortage = Math.max(0, target.par - target.onHand)
    if (!recipe || !shortage || state.prep.some(task => task.due === date && task.stationTarget?.stationId === station.id && task.stationTarget.recipeId === recipe.id)) return []
    return [{ id: newId(), name: `Prepare ${recipe.name}`.slice(0, 120), station: station.name, assignee: station.assignee, quantity: `${shortage} portions${recipe.portions ? ` · ${Math.ceil(shortage / recipe.portions)} full batches` : ' · confirm batch yield'}`, due: date, priority: 'normal' as const, status: 'todo' as const, stationTarget: { stationId: station.id, recipeId: recipe.id } }]
  })
}

export function purchaseForecast(state: Workspace, report: SalesReport, days: number, multiplier = 1) {
  if (!Number.isInteger(days) || days < 1 || days > 30 || !Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 5) throw new Error('Use 1–30 cover days and a demand multiplier above zero and no more than five.')
  const usage = theoreticalUsage(report, state)
  const span = (new Date(`${report.through}T12:00:00Z`).valueOf() - new Date(`${report.from}T12:00:00Z`).valueOf()) / 86400000 + 1
  const lines = usage.lines.map(line => {
    const ingredient = state.ingredients.find(item => item.id === line.ingredientId)!
    const demand = line.quantity / span * days * multiplier
    const target = Math.max(ingredient.par ?? 0, demand)
    const incoming = state.orders.filter(order => order.status !== 'received').flatMap(order => order.lines).filter(item => item.ingredientId === ingredient.id).reduce((sum, item) => sum + item.packs * item.usablePerPack, 0)
    const usablePerPack = ingredient.packQuantity === null ? null : ingredient.packQuantity * ingredient.yieldPct / 100
    const shortfall = ingredient.stock === null ? null : Math.max(0, target - ingredient.stock - incoming)
    const unitMismatch = state.orders.filter(order => order.status !== 'received').some(order => order.lines.some(item => item.ingredientId === ingredient.id && item.unit !== ingredient.baseUnit))
    const packs = shortfall === null || !usablePerPack || ingredient.price === null || !usage.complete || unitMismatch ? null : Math.ceil(shortfall / usablePerPack)
    return { ...line, ingredient, daily: line.quantity / span, demand, target, incoming, shortfall, packs, cost: packs === null ? null : packs * ingredient.price! }
  })
  return { ...usage, forecast: lines, span }
}
export function forecastOrders(state: Workspace, report: SalesReport, days: number, multiplier: number, newId = () => crypto.randomUUID()): Order[] {
  const forecast = purchaseForecast(state, report, days, multiplier)
  if (!forecast.complete) throw new Error('Complete every sold-item recipe and quantity before building demand-based orders.')
  if (forecast.forecast.some(line => line.packs === null)) throw new Error('Confirm stock counts and purchase pricing for every ingredient in this forecast.')
  const groups = new Map<string | null, Order['lines']>()
  for (const line of forecast.forecast) {
    if (!line.packs) continue
    const ingredient = line.ingredient
    const rows = groups.get(ingredient.supplierId) ?? []
    rows.push({ ingredientId: ingredient.id, name: ingredient.name, packs: line.packs, unit: ingredient.baseUnit, usablePerPack: ingredient.packQuantity! * ingredient.yieldPct / 100, unitPrice: ingredient.price!, purchaseLabel: ingredient.purchaseLabel || 'pack' })
    groups.set(ingredient.supplierId, rows)
  }
  return [...groups].map(([supplierId, lines]) => ({ id: newId(), supplierId, created: kitchenDay(), status: 'draft', received: null, lines }))
}
