import { costRecipe, type Workspace } from './domain'
import { parseCsv } from './import-export'
import { salesReportSchema, type SalesReport } from './operations'

export const salesHeaders = ['item', 'quantity', 'net_sales_cad']
const normalized = (value: string) => value.trim().normalize('NFKC').toLocaleLowerCase('en-CA').replace(/\s+/g, ' ')
export function importSales(source: string, state: Workspace, details: Omit<SalesReport, 'rows'>, newId = () => crypto.randomUUID()): SalesReport {
  const [headers, ...rows] = parseCsv(source)
  if (!headers || !rows.length) throw new Error('The CSV has no sales rows. Download the template to get started.')
  if (rows.length > 500) throw new Error('Use no more than 500 item rows in one report.')
  const keys = headers.map(header => header.trim().toLowerCase())
  if (new Set(keys).size !== keys.length) throw new Error('The CSV contains duplicate column names.')
  for (const header of salesHeaders) if (!keys.includes(header)) throw new Error(`Missing column: ${header}. Use the sales template.`)
  const reportRows = rows.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`Row ${index + 2}: the number of columns does not match the header.`)
    const get = (key: string) => cells[keys.indexOf(key)]?.trim() ?? ''
    const number = (key: string) => {
      const value = get(key)
      if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error(`Row ${index + 2}: ${key} must be a non-negative number. Use net totals per item, without tax, tips, currency signs or thousands separators.`)
      return Number(value)
    }
    const item = get('item')
    const recipes = state.recipes.filter(recipe => normalized(recipe.name) === normalized(item))
    return { id: newId(), item, quantity: number('quantity'), netSales: number('net_sales_cad'), recipeId: recipes.length === 1 ? recipes[0].id : null }
  })
  const report = salesReportSchema.safeParse({ ...details, rows: reportRows })
  if (!report.success) throw new Error(report.error.issues[0].message)
  return report.data
}

export type MenuAction = 'Feature it' | 'Review the margin' | 'Improve visibility' | 'Review the dish' | 'Complete inputs' | 'No sales'
export function analyseMenu(report: SalesReport, state: Workspace) {
  const rows = report.rows.map(row => {
    const recipe = state.recipes.find(recipe => recipe.id === row.recipeId)
    const cost = recipe ? costRecipe(recipe, state.ingredients, state.settings.targetFoodCost) : null
    const portionCost = cost?.portionCost ?? null
    const foodCost = portionCost === null ? null : portionCost * row.quantity
    const contribution = foodCost === null ? null : row.netSales - foodCost
    return { ...row, recipe, portionCost, foodCost, contribution, unitContribution: contribution !== null && row.quantity > 0 ? contribution / row.quantity : null,
      averagePrice: row.quantity > 0 ? row.netSales / row.quantity : null,
      foodPct: foodCost !== null && row.netSales > 0 ? foodCost / row.netSales * 100 : null }
  })
  const comparable = rows.filter(row => row.quantity > 0 && row.unitContribution !== null)
  const comparableUnits = comparable.reduce((sum, row) => sum + row.quantity, 0)
  const comparableContribution = comparable.reduce((sum, row) => sum + row.contribution!, 0)
  const averageContribution = comparableUnits > 0 ? comparableContribution / comparableUnits : null
  const popularityThreshold = comparable.length > 0 ? 0.7 / comparable.length : null
  const analysed = rows.map(row => {
    let action: MenuAction = 'Complete inputs'
    let reason = row.recipeId ? 'Complete the linked recipe’s ingredient quantities and purchase prices.' : 'Link this sales item to a recipe to calculate its ingredient cost.'
    if (row.quantity === 0) { action = 'No sales'; reason = 'No units were sold in this report.' }
    else if (row.unitContribution !== null && averageContribution !== null && popularityThreshold !== null) {
      const popular = row.quantity / comparableUnits >= popularityThreshold
      const highContribution = row.unitContribution >= averageContribution
      if (row.unitContribution <= 0) { action = 'Review the margin'; reason = 'Ingredient cost is at least the recorded revenue. Review portions, purchasing, discounts and price before promoting this item.' }
      else if (comparable.length < 2) { action = 'Complete inputs'; reason = 'At least two sold, fully costed items are needed for a meaningful comparison.' }
      else if (popular && highContribution) { action = 'Feature it'; reason = 'Above the comparison thresholds for both sales mix and contribution per unit.' }
      else if (popular) { action = 'Review the margin'; reason = 'A popular item with below-average contribution. Review portions, purchasing and price.' }
      else if (highContribution) { action = 'Improve visibility'; reason = 'Above-average contribution with a smaller sales mix. Review placement and service recommendations.' }
      else { action = 'Review the dish'; reason = 'Below both comparison thresholds. Review customer demand and preparation effort before deciding.' }
    }
    return { ...row, action, reason }
  })
  const netSales = rows.reduce((sum, row) => sum + row.netSales, 0)
  const complete = rows.filter(row => row.quantity > 0).every(row => row.foodCost !== null)
  const totalFoodCost = complete && rows.some(row => row.quantity > 0) ? rows.reduce((sum, row) => sum + (row.foodCost ?? 0), 0) : null
  return { rows: analysed, netSales, units: rows.reduce((sum, row) => sum + row.quantity, 0), totalFoodCost,
    contribution: totalFoodCost === null ? null : netSales - totalFoodCost,
    foodPct: totalFoodCost !== null && netSales > 0 ? totalFoodCost / netSales * 100 : null,
    comparableCount: comparable.length, averageContribution, popularityThreshold,
    costedSales: rows.filter(row => row.foodCost !== null).reduce((sum, row) => sum + row.netSales, 0),
    missing: rows.filter(row => row.quantity > 0 && row.foodCost === null).length }
}

export function storeSalesReport(state: Workspace, report: SalesReport, replaceId?: string): Workspace {
  const parsed = salesReportSchema.parse(report)
  const reports = state.operations?.salesReports ?? []
  if (reports.some(existing => existing.id !== replaceId && (existing.id === parsed.id || existing.from === parsed.from && existing.through === parsed.through && normalized(existing.source) === normalized(parsed.source)))) throw new Error('A report from this source for these dates already exists. Open that report to replace it.')
  return { ...state, operations: { employees: [], shifts: [], weeks: [], routines: [], checks: [], ...state.operations, salesReports: [parsed, ...reports.filter(existing => existing.id !== (replaceId ?? parsed.id))] } }
}
