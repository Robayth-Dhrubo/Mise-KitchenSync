import { z } from 'zod'
import { emptyWorkspace, workspaceSchema, type Workspace } from './domain'

const text = z.string().max(1000)
const id = z.string().regex(/^[a-zA-Z0-9_-]+$/).max(100)
const asset = z.string().regex(/^[a-f0-9]{64}$/)
const num = z.number().finite()
const optional = num.nullable()
export const sourceFileSchema = z.object({
  id, name: z.string().min(1).max(300), asset, bytes: num.int().min(0).max(12_000_000), modifiedAt: text,
  category: text, status: z.enum(['current', 'reference', 'draft']),
  tables: z.array(z.object({ id, name: text, asset, rows: num.int().min(0), columns: num.int().min(0).max(1000) })).max(100),
})
export const fabergeReportSchema = z.object({
  batchId: id, title: text, importedAt: text, files: z.array(sourceFileSchema).max(200),
  summary: z.object({ salesRows: num, salesTotal: num, salesFrom: text, salesThrough: text, salesDates: num, receipts: num,
    stockCounts: num, priceProducts: num, recipeInputs: num, recipes: num, suppliers: num, prepTemplates: num, files: num, tables: num }),
  sales: z.object({
    fileId: id,
    daily: z.array(z.object({ date: text, sales: num, quantity: num, receipts: num })).max(1000),
    items: z.array(z.object({ id: text, name: text, category: text, quantity: num, sales: num })).max(5000),
    categories: z.array(z.object({ name: text, quantity: num, sales: num })).max(500),
    controls: z.array(z.object({ report: text, total: optional, fileId: id })).max(100),
    hours: z.array(z.object({ hour: text, sales: optional })).max(24),
    menu: z.array(z.object({ name: text, category: text, sold: num, foodCost: optional, sellingPrice: optional,
      revenue: optional, classification: text, basis: text })).max(500),
  }),
  team: z.object({
    scheduleFileId: id,
    schedule: z.array(z.object({ name: text, role: text, payType: text, rate: optional,
      days: z.array(optional).length(7), hours: optional, weeklyCost: optional, dayUnit: text })).max(200),
    payroll: z.array(z.object({ year: text, period: text, sales: optional, foh: optional, boh: optional, admin: optional, management: optional, reportedTotal: optional })).max(2000),
    payrollSummary: z.object({ year: text, netSales: optional, foh: optional, boh: optional, admin: optional, management: optional, reportedTotal: optional, coverage: text, fileId: id }),
  }),
  issues: z.array(z.object({ title: text, detail: text })).max(100),
  priceIssues: z.array(z.object({ product: text, issue: text })).max(500),
  receipt: z.object({ ingredientsAdded: num, recipesAdded: num, suppliersAdded: num, prepAdded: num, keptExisting: num }).optional(),
}).superRefine((report, ctx) => {
  const ids = report.files.map(file => file.id)
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Duplicate source IDs.' })
  const sourceIds = new Set(ids)
  for (const ref of [report.sales.fileId, report.team.scheduleFileId, report.team.payrollSummary.fileId, ...report.sales.controls.map(c => c.fileId)]) {
    if (!sourceIds.has(ref)) ctx.addIssue({ code: 'custom', message: 'An import source is missing.' })
  }
  const tableIds = report.files.flatMap(f => f.tables.map(t => t.id))
  if (new Set(tableIds).size !== tableIds.length) ctx.addIssue({ code: 'custom', message: 'Duplicate source table IDs.' })
})
export type FabergeReport = z.infer<typeof fabergeReportSchema>
export type SourceFile = z.infer<typeof sourceFileSchema>
export type SourceRow = { row: number; cells: (string | number | boolean | null)[]; formulas?: Record<string, string>; formats?: Record<string, string> }
export type SourceTable = { name: string; columns: string[]; rows: SourceRow[] }
export type SourcePage = SourceTable & { total: number; offset: number; nextOffset: number | null }

export function requiredAssets(report: FabergeReport) {
  return [...new Set(report.files.flatMap(file => [file.asset, ...file.tables.map(table => table.asset)]))]
}

/** Preserve existing records and map imported relationships to their stable IDs. */
export function mergeFaberge(existing: Workspace, incoming: Workspace) {
  const state = existing.sampleData ? { ...emptyWorkspace(), settings: existing.settings } : structuredClone(existing)
  const before = { ingredients: state.ingredients.length, recipes: state.recipes.length, suppliers: state.suppliers.length, prep: state.prep.length }
  const supplierIds = new Map<string, string>(), ingredientIds = new Map<string, string>()
  const key = (name: string) => name.trim().toLocaleLowerCase('en-CA')
  for (const supplier of incoming.suppliers) {
    const found = state.suppliers.find(s => s.id === supplier.id || key(s.name) === key(supplier.name))
    supplierIds.set(supplier.id, found?.id ?? supplier.id)
    if (!found) state.suppliers.push(supplier)
  }
  for (const ingredient of incoming.ingredients) {
    const found = state.ingredients.find(i => i.id === ingredient.id || key(i.name) === key(ingredient.name))
    ingredientIds.set(ingredient.id, found?.id ?? ingredient.id)
    if (!found) state.ingredients.push({ ...ingredient, supplierId: ingredient.supplierId ? supplierIds.get(ingredient.supplierId)! : null })
  }
  for (const recipe of incoming.recipes) {
    if (!state.recipes.some(r => r.id === recipe.id || key(r.name) === key(recipe.name))) {
      state.recipes.push({ ...recipe, items: recipe.items.map(item => ({ ...item, ingredientId: ingredientIds.get(item.ingredientId)! })) })
    }
  }
  for (const task of incoming.prep) if (!state.prep.some(p => p.id === task.id)) state.prep.push(task)
  state.sampleData = false
  return { state: workspaceSchema.parse(state), receipt: {
    ingredientsAdded: state.ingredients.length - before.ingredients, recipesAdded: state.recipes.length - before.recipes,
    suppliersAdded: state.suppliers.length - before.suppliers, prepAdded: state.prep.length - before.prep,
    keptExisting: Object.values(before).reduce((a, b) => a + b, 0),
  } }
}
