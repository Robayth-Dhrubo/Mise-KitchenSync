import { type Workspace } from './domain'
import { addDays, type SalesReport } from './operations'
import { theoreticalUsage, type InventoryEvent } from './inventory-control'

const sourceKey = (value: string) => value.trim().normalize('NFKC').toLocaleLowerCase('en-CA').replace(/\s+/g, ' ')
type CountEvent = Extract<InventoryEvent, { kind: 'count' }>
export function reconcileInventory(opening: CountEvent, closing: CountEvent, report: SalesReport, state: Workspace, events: InventoryEvent[]) {
  const issues: string[] = []
  const from = opening.data.phase === 'closing' ? addDays(opening.occurredOn, 1) : opening.occurredOn
  const through = closing.data.phase === 'opening' ? addDays(closing.occurredOn, -1) : closing.occurredOn
  if (opening.id === closing.id || from > through) issues.push('Choose two different counts that bookend the service period.')
  if (opening.data.phase === 'spot' || closing.data.phase === 'spot') issues.push('Spot counts do not define a full service day. Use opening or closing counts for a daily sales review.')
  if (report.from !== from || report.through !== through) issues.push(`The sales snapshot must cover ${from} through ${through} exactly.`)
  const recordedUsage = events.find(event => event.kind === 'usage' && event.referenceId === report.id)
  const currentUsage = theoreticalUsage(report, state)
  const usageLines = recordedUsage?.kind === 'usage' ? recordedUsage.data.lines : currentUsage.lines
  if (!recordedUsage) issues.push(...currentUsage.issues)
  const movement = events.flatMap(event => event.kind === 'movement' ? event.data.lines : []).filter(line => line.occurredOn >= from && line.occurredOn <= through)
  const ids = [...new Set([...opening.data.lines, ...closing.data.lines, ...usageLines, ...movement].map(line => line.ingredientId))]
  const rows = ids.map(id => {
    const first = opening.data.lines.find(line => line.ingredientId === id), last = closing.data.lines.find(line => line.ingredientId === id)
    const theoreticalLine = usageLines.find(line => line.ingredientId === id)
    const movements = movement.filter(line => line.ingredientId === id)
    const reference = last ?? first ?? theoreticalLine ?? movements[0]
    const rowIssues: string[] = []
    if (!first || first.quantity === null) rowIssues.push('Opening count missing')
    if (!last || last.quantity === null) rowIssues.push('Closing count missing')
    if (movements.some(line => ['received', 'waste'].includes(line.reason) && line.quantity === null)) rowIssues.push('Receipt or waste quantity missing')
    if (first && last && first.unit !== last.unit || movements.some(line => line.unit !== reference.unit) || theoreticalLine && theoreticalLine.unit !== reference.unit) rowIssues.push('Units changed within the period')
    const receipts = movements.filter(line => line.reason === 'received').reduce((sum, line) => sum + (line.quantity ?? 0), 0)
    const loggedWaste = Math.max(0, -movements.filter(line => line.reason === 'waste').reduce((sum, line) => sum + (line.quantity ?? 0), 0))
    const adjustments = movements.filter(line => line.reason === 'adjustment' || line.reason === 'initial').length
    const actual = !rowIssues.length ? first!.quantity! + receipts - last!.quantity! : null
    const theoretical = recordedUsage || currentUsage.complete ? theoreticalLine?.quantity ?? 0 : null
    const variance = actual !== null && theoretical !== null && !issues.length ? actual - theoretical - loggedWaste : null
    return { ingredientId: id, name: reference.name, unit: reference.unit, opening: first?.quantity ?? null, receipts, closing: last?.quantity ?? null, actual,
      theoretical, loggedWaste, variance, unitCost: last?.unitCost ?? null, varianceValue: variance !== null && last?.unitCost != null ? variance * last.unitCost : null, adjustments, issues: rowIssues }
  })
  const complete = !issues.length && rows.length > 0 && rows.every(row => row.variance !== null)
  return { from, through, rows, issues: [...new Set(issues)], complete, costBasis: 'Closing-count unit cost', usageBasis: recordedUsage ? 'Posted recipe-usage snapshot' : 'Current recipes; estimated historical usage',
    varianceValue: complete && rows.every(row => row.varianceValue !== null) ? rows.reduce((sum, row) => sum + row.varianceValue!, 0) : null,
    adjustmentCount: rows.reduce((sum, row) => sum + row.adjustments, 0) }
}

export function prepareSalesUsage(state: Workspace, report: SalesReport, events: InventoryEvent[]) {
  const usage = theoreticalUsage(report, state)
  if (!usage.complete) throw new Error(usage.issues[0] ?? 'Complete the sold-item recipe quantities first.')
  for (const event of events) if (event.kind === 'usage') {
    if (event.referenceId === report.id) throw new Error('This sales snapshot has already been posted to inventory.')
    if (sourceKey(event.data.source) === sourceKey(report.source) && event.data.from <= report.through && event.data.through >= report.from) throw new Error('This source already has posted sales for an overlapping period. Review the earlier posting first.')
  }
  for (const line of usage.lines) {
    const ingredient = state.ingredients.find(item => item.id === line.ingredientId)!
    if (ingredient.stock === null) throw new Error(`Count ${ingredient.name} before posting sales usage.`)
    const counts = events.filter((event): event is CountEvent => event.kind === 'count' && event.data.lines.some(item => item.ingredientId === line.ingredientId))
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id))
    const latest = counts[0]
    if (!latest) throw new Error(`Record an opening baseline for ${ingredient.name} before posting a sales period.`)
    if (latest.occurredOn > report.from || latest.occurredOn === report.from && latest.data.phase !== 'opening') throw new Error(`${ingredient.name}: a physical count already includes part or all of this sales period. Use the report for reconciliation instead.`)
    if (events.some(event => event.kind === 'movement' && event.recordedAt >= latest.recordedAt && event.data.lines.some(item => item.ingredientId === line.ingredientId && ['adjustment', 'initial'].includes(item.reason)))) throw new Error(`${ingredient.name}: manual stock edits followed the baseline. Reconcile those changes before posting usage.`)
    if (line.quantity > ingredient.stock + 1e-7) throw new Error(`${ingredient.name}: the sales usage exceeds recorded stock. Review counts, receipts and recipe quantities.`)
  }
  return { state: { ...state, ingredients: state.ingredients.map(ingredient => { const usage = usageLine(ingredient.id); return usage === null ? ingredient : { ...ingredient, stock: Math.max(0, ingredient.stock! - usage) } }) }, lines: usage.lines }
  function usageLine(id: string) { return usage.lines.find(line => line.ingredientId === id)?.quantity ?? null }
}

