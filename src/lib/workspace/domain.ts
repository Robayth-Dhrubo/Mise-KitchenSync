import { z } from 'zod'
import { businessSchema } from './business'
import { operationsSchema } from './operations'
import { stockControlSchema } from './stock-control-schema'
import { convertMeasure, ingredientQuantity, measureUnits } from './measurements'

const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)
const text = z.string().trim().max(300)
const name = z.string().trim().min(1, 'A name is required').max(120)
const optionalNumber = z.number().finite().min(0).max(1e9).nullable()
const positiveNumber = z.number().finite().gt(0).max(1e9).nullable()
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}, 'Use a valid date')
export const sourceSchema = z.object({
  fileId: id, file: z.string().max(300), sheet: z.string().max(200), row: z.number().int().positive().optional(),
  status: z.enum(['confirmed', 'estimate', 'review', 'reference', 'draft']), detail: z.string().max(1000), priceDate: day.optional(),
})

export const ingredientSchema = z.object({
  id, name, category: text, supplierId: id.nullable(), purchaseLabel: text,
  baseUnit: z.enum(['g', 'ml', 'each']), packQuantity: positiveNumber,
  price: optionalNumber, yieldPct: z.number().gt(0).max(100),
  stock: optionalNumber, par: optionalNumber, notes: text, source: sourceSchema.optional(), densityGPerMl: z.number().finite().gt(0).max(100).nullable().optional(),
})
export const recipeSchema = z.object({
  id, name, category: text, portions: positiveNumber, sellingPrice: optionalNumber, notes: text,
  items: z.array(z.object({ id, ingredientId: id, quantity: positiveNumber, unit: z.enum(measureUnits) })).max(100), source: sourceSchema.optional(),
})
export const supplierSchema = z.object({ id, name, contact: text, email: z.string().max(150).refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Use a valid email'), phone: text, deliveryDays: text, notes: text, source: sourceSchema.optional() })
export const prepSchema = z.object({ id, name, station: text, assignee: text, quantity: text, due: day.nullable(), priority: z.enum(['normal', 'high']), status: z.enum(['todo', 'doing', 'done']), source: sourceSchema.optional(), stationTarget: z.object({ stationId: id, recipeId: id }).optional() })
export const wasteSchema = z.object({ id, ingredientId: id, quantity: z.number().finite().gt(0).max(1e9), unit: z.enum(['g', 'ml', 'each']), reason: name, date: day, cost: optionalNumber })
export const orderSchema = z.object({
  id, supplierId: id.nullable(), created: day, status: z.enum(['draft', 'ordered', 'received']), received: day.nullable(),
  lines: z.array(z.object({ ingredientId: id, name, packs: z.number().int().gt(0).max(1e6), unit: z.enum(['g', 'ml', 'each']), usablePerPack: z.number().finite().gt(0).max(1e9), unitPrice: z.number().finite().min(0).max(1e9), purchaseLabel: text })).min(1).max(500),
})
export const workspaceSchema = z.object({
  version: z.literal(1), sampleData: z.boolean(),
  settings: z.object({ kitchenName: name, targetFoodCost: z.number().gt(0).lt(100) }),
  ingredients: z.array(ingredientSchema).max(500), recipes: z.array(recipeSchema).max(500),
  suppliers: z.array(supplierSchema).max(200), prep: z.array(prepSchema).max(1000),
  waste: z.array(wasteSchema).max(2000), orders: z.array(orderSchema).max(500),
  business: businessSchema.optional(),
  operations: operationsSchema.optional(),
  stockControl: stockControlSchema.optional(),
}).superRefine((state, ctx) => {
  for (const key of ['ingredients', 'recipes', 'suppliers', 'prep', 'waste', 'orders'] as const) {
    const ids = state[key].map(item => item.id)
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: [key], message: 'Duplicate record IDs' })
  }
  for (const key of ['ingredients', 'suppliers'] as const) {
    const names = state[key].map(item => item.name.toLowerCase())
    if (new Set(names).size !== names.length) ctx.addIssue({ code: 'custom', path: [key], message: `Use a unique name for each ${key === 'ingredients' ? 'ingredient' : 'supplier'}.` })
  }
  const ingredientIds = new Set(state.ingredients.map(i => i.id))
  const supplierIds = new Set(state.suppliers.map(i => i.id))
  for (const ingredient of state.ingredients) if (ingredient.supplierId && !supplierIds.has(ingredient.supplierId)) ctx.addIssue({ code: 'custom', message: `Supplier for ${ingredient.name} is missing` })
  for (const recipe of state.recipes) {
    if (new Set(recipe.items.map(i => i.id)).size !== recipe.items.length) ctx.addIssue({ code: 'custom', message: `Duplicate lines in ${recipe.name}` })
    for (const item of recipe.items) if (!ingredientIds.has(item.ingredientId)) ctx.addIssue({ code: 'custom', message: `An ingredient in ${recipe.name} is missing` })
  }
  for (const entry of state.waste) if (!ingredientIds.has(entry.ingredientId)) ctx.addIssue({ code: 'custom', message: 'A waste ingredient is missing' })
  for (const order of state.orders) {
    if (order.supplierId && !supplierIds.has(order.supplierId)) ctx.addIssue({ code: 'custom', message: 'An order supplier is missing' })
    for (const line of order.lines) if (!ingredientIds.has(line.ingredientId)) ctx.addIssue({ code: 'custom', message: 'An order ingredient is missing' })
    if ((order.status === 'received') !== (order.received !== null)) ctx.addIssue({ code: 'custom', message: 'Order receipt status is inconsistent' })
  }
  for (const report of state.operations?.salesReports ?? []) for (const row of report.rows) {
    if (row.recipeId && !state.recipes.some(recipe => recipe.id === row.recipeId)) ctx.addIssue({ code: 'custom', message: 'A sales item points to a missing recipe. Unlink it before deleting the recipe.' })
  }
  for (const station of state.stockControl?.stations ?? []) for (const target of station.targets) {
    if (!state.recipes.some(recipe => recipe.id === target.recipeId)) ctx.addIssue({ code: 'custom', message: 'A station target points to a missing recipe.' })
  }
})

export type Ingredient = z.infer<typeof ingredientSchema>
export type Recipe = z.infer<typeof recipeSchema>
export type Supplier = z.infer<typeof supplierSchema>
export type PrepTask = z.infer<typeof prepSchema>
export type Waste = z.infer<typeof wasteSchema>
export type Order = z.infer<typeof orderSchema>
export type Workspace = z.infer<typeof workspaceSchema>
export type Snapshot = { revision: number; state: Workspace; updatedAt: string | null }

export function emptyWorkspace(): Workspace {
  return { version: 1, sampleData: false, settings: { kitchenName: 'My kitchen', targetFoodCost: 30 }, ingredients: [], recipes: [], suppliers: [], prep: [], waste: [], orders: [] }
}
export function kitchenDay(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
export function money(value: number | null, digits = 2): string {
  return value === null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}
export function quantity(value: number | null, unit = ''): string {
  return value === null ? 'Not counted' : `${new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2 }).format(value)}${unit ? ` ${unit}` : ''}`
}
export function unitCost(ingredient: Ingredient): number | null {
  if (ingredient.price === null || ingredient.packQuantity === null || ingredient.packQuantity <= 0 || ingredient.yieldPct <= 0) return null
  return ingredient.price / (ingredient.packQuantity * ingredient.yieldPct / 100)
}
export function convertQuantity(value: number, from: string, to: string): number | null {
  return convertMeasure(value, from, to)
}
export function costRecipe(recipe: Recipe, ingredients: Ingredient[], target = 30) {
  const issues: string[] = []
  const lines = recipe.items.map(item => {
    const ingredient = ingredients.find(i => i.id === item.ingredientId)
    let cost: number | null = null
    if (!ingredient) issues.push('An ingredient is missing')
    else {
      const price = unitCost(ingredient)
      if (price === null) issues.push(`${ingredient.name}: enter pack price and quantity`)
      if (item.quantity === null || item.quantity <= 0) issues.push(`${ingredient.name}: enter recipe quantity`)
      const amount = item.quantity === null ? null : ingredientQuantity(item.quantity, item.unit, ingredient)
      if (amount === null && item.quantity !== null) issues.push(`${ingredient.name}: ${item.unit} cannot be converted to ${ingredient.baseUnit}`)
      if (price !== null && amount !== null && item.quantity !== null && item.quantity > 0) cost = price * amount
    }
    return { ...item, name: ingredient?.name ?? 'Missing ingredient', cost }
  })
  if (!recipe.items.length) issues.push('Add recipe ingredients')
  const batchCost = recipe.items.length && lines.every(line => line.cost !== null) ? lines.reduce((sum, line) => sum + (line.cost ?? 0), 0) : null
  if (recipe.portions === null || recipe.portions <= 0) issues.push('Enter the portions produced per batch')
  const portionCost = batchCost !== null && recipe.portions && recipe.portions > 0 ? batchCost / recipe.portions : null
  if (recipe.sellingPrice === null || recipe.sellingPrice <= 0) issues.push('Enter a selling price greater than zero')
  const foodCost = portionCost !== null && recipe.sellingPrice && recipe.sellingPrice > 0 ? portionCost / recipe.sellingPrice * 100 : null
  const contribution = portionCost !== null && recipe.sellingPrice !== null && recipe.sellingPrice > 0 ? recipe.sellingPrice - portionCost : null
  const suggestedPrice = portionCost === null ? null : portionCost / (target / 100)
  return { lines, issues: [...new Set(issues)], batchCost, portionCost, foodCost, contribution, suggestedPrice, status: foodCost === null ? 'incomplete' : foodCost > target ? 'review' : 'on-target' }
}
export function stockStatus(ingredient: Ingredient): 'unknown' | 'low' | 'healthy' {
  if (ingredient.stock === null || ingredient.par === null) return 'unknown'
  return ingredient.stock < ingredient.par ? 'low' : 'healthy'
}
export function orderPacks(ingredient: Ingredient): number | null {
  if (ingredient.stock === null || ingredient.par === null || !ingredient.packQuantity || unitCost(ingredient) === null) return null
  return Math.ceil(Math.max(0, ingredient.par - ingredient.stock) / (ingredient.packQuantity * ingredient.yieldPct / 100))
}
export function createDraftOrders(state: Workspace, today = kitchenDay(), newId = () => crypto.randomUUID()): Order[] {
  const covered = new Set(state.orders.filter(o => o.status !== 'received').flatMap(o => o.lines.map(l => l.ingredientId)))
  const groups = new Map<string | null, Order['lines']>()
  for (const ingredient of state.ingredients) {
    const packs = orderPacks(ingredient)
    if (!packs || covered.has(ingredient.id)) continue
    const lines = groups.get(ingredient.supplierId) ?? []
    lines.push({ ingredientId: ingredient.id, name: ingredient.name, packs, unit: ingredient.baseUnit, usablePerPack: ingredient.packQuantity! * ingredient.yieldPct / 100, unitPrice: ingredient.price!, purchaseLabel: ingredient.purchaseLabel || 'pack' })
    groups.set(ingredient.supplierId, lines)
  }
  return [...groups].map(([supplierId, lines]) => ({ id: newId(), supplierId, created: today, status: 'draft' as const, received: null, lines }))
}
export function receiveOrder(state: Workspace, orderId: string, today = kitchenDay()): Workspace {
  const order = state.orders.find(o => o.id === orderId)
  if (!order || order.status !== 'ordered') throw new Error('Only an ordered purchase can be received, once.')
  for (const line of order.lines) {
    const ingredient = state.ingredients.find(i => i.id === line.ingredientId)
    if (!ingredient || ingredient.stock === null) throw new Error(`Count ${line.name} before receiving this order.`)
    if (ingredient.baseUnit !== line.unit) throw new Error(`The unit for ${line.name} has changed. Review the order first.`)
  }
  return {
    ...state,
    ingredients: state.ingredients.map(ingredient => ({ ...ingredient, stock: ingredient.stock === null ? null : ingredient.stock + order.lines.filter(l => l.ingredientId === ingredient.id).reduce((sum, line) => sum + line.packs * line.usablePerPack, 0) })),
    orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'received', received: today } : o),
  }
}
export function logWaste(state: Workspace, entry: Omit<Waste, 'cost'>): Workspace {
  const ingredient = state.ingredients.find(i => i.id === entry.ingredientId)
  if (!ingredient || ingredient.stock === null) throw new Error('Count this ingredient before recording waste.')
  if (!Number.isFinite(entry.quantity) || entry.quantity <= 0 || entry.unit !== ingredient.baseUnit || entry.quantity > ingredient.stock) throw new Error('Waste must be greater than zero and cannot exceed available stock.')
  const cost = unitCost(ingredient)
  return { ...state, ingredients: state.ingredients.map(i => i.id === ingredient.id ? { ...i, stock: i.stock! - entry.quantity } : i), waste: [{ ...entry, cost: cost === null ? null : cost * entry.quantity }, ...state.waste] }
}
export function escapeCsv(value: unknown): string {
  const raw = value == null ? '' : String(value)
  // Neutralize spreadsheet formula injection, including leading whitespace.
  const safe = /^\s*[=+@-]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}
export function sampleWorkspace(today = kitchenDay()): Workspace {
  const state = emptyWorkspace()
  state.sampleData = true
  state.settings.kitchenName = 'Sample brunch kitchen'
  state.suppliers = [{ id: 'sample-supplier', name: 'Example supplier', contact: '', email: '', phone: '', deliveryDays: 'Tuesday, Friday', notes: 'Example only; replace with your supplier.' }]
  const rows: [string, string, Ingredient['baseUnit'], number, number, number, number, string][] = [
    ['eggs', 'Whole eggs', 'each', 180, 64, 42, 90, 'Case of 180'],
    ['brioche', 'Brioche', 'each', 24, 30, 12, 24, '24 slices'],
    ['butter', 'Clarified butter', 'g', 1000, 18, 600, 1000, '1 kg tub'],
    ['yolks', 'Pasteurized egg yolks', 'g', 1000, 16, 1100, 1000, '1 kg carton'],
    ['cream', '35% cream', 'ml', 1000, 8, 800, 1000, '1 L carton'],
    ['lemon', 'Lemon juice', 'ml', 1000, 7, 700, 1000, '1 L bottle'],
    ['ham', 'Ham', 'g', 1000, 15, 1600, 2000, '1 kg pack'],
    ['cheese', 'Cheddar', 'g', 2000, 28, 1800, 2000, '2 kg block'],
  ]
  state.ingredients = rows.map(([id, name, baseUnit, packQuantity, price, stock, par, purchaseLabel]) => ({ id: `sample-${id}`, name, category: ['eggs','yolks','cream','cheese','butter'].includes(id) ? 'Dairy & eggs' : 'Pantry', supplierId: 'sample-supplier', purchaseLabel, baseUnit, packQuantity, price, stock, par, yieldPct: 100, notes: 'Illustrative price. Replace before making business decisions.' }))
  state.recipes = [{ id: 'sample-monte', name: 'Monte Cristo', category: 'Brunch', portions: 1, sellingPrice: 24, notes: 'Illustrative costing, not a verified restaurant recipe.', items: [
    { id: 'line-1', ingredientId: 'sample-brioche', quantity: 2, unit: 'each' },
    { id: 'line-2', ingredientId: 'sample-ham', quantity: 80, unit: 'g' },
    { id: 'line-3', ingredientId: 'sample-cheese', quantity: 35, unit: 'g' },
    { id: 'line-4', ingredientId: 'sample-eggs', quantity: 1, unit: 'each' },
    { id: 'line-5', ingredientId: 'sample-butter', quantity: 15, unit: 'g' },
  ] }, { id: 'sample-benny', name: 'Eggs Benedict · test batch', category: 'Brunch', portions: 1, sellingPrice: 22, notes: 'Incomplete example: add every component before using the cost.', items: [] }]
  state.prep = [
    { id: 'sample-prep-1', name: 'Make hollandaise', station: 'Hot line', assignee: '', quantity: '1 batch', due: today, priority: 'high', status: 'todo' },
    { id: 'sample-prep-2', name: 'Portion ham for service', station: 'Cold prep', assignee: '', quantity: '20 portions', due: today, priority: 'normal', status: 'doing' },
    { id: 'sample-prep-3', name: 'Set up the line', station: 'Hot line', assignee: '', quantity: '', due: today, priority: 'normal', status: 'done' },
  ]
  return state
}
