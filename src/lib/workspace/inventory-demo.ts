import { type Workspace } from './domain'
import { theoreticalUsage, type InventoryEvent } from './inventory-control'

export function demoInventoryHistory(state: Workspace): InventoryEvent[] {
  const report = state.operations?.salesReports[0]
  if (!report) return []
  const usage = theoreticalUsage(report, state)
  const lines = state.ingredients.map(ingredient => ({ ingredientId: ingredient.id, name: ingredient.name, unit: ingredient.baseUnit, quantity: ingredient.stock, unitCost: ingredient.price === null || ingredient.packQuantity === null ? null : ingredient.price / (ingredient.packQuantity * ingredient.yieldPct / 100) }))
  const opening = lines.map(line => ({ ...line, quantity: line.quantity === null ? null : line.quantity + (usage.lines.find(item => item.ingredientId === line.ingredientId)?.quantity ?? 0) + (line.ingredientId === 'sample-cheese' ? 80 : 0) - (line.ingredientId === 'sample-ham' ? 1000 : 0) }))
  return [
    { id: 'demo-count-close', kind: 'count', occurredOn: report.through, recordedAt: `${report.through}T23:00:00Z`, revision: 3, referenceId: null, data: { name: 'Illustrative closing count', phase: 'closing', recordedBy: 'Demo kitchen', lines } },
    { id: 'demo-received', kind: 'movement', occurredOn: report.from, recordedAt: `${report.from}T12:00:00Z`, revision: 2, referenceId: null, data: { lines: [{ ingredientId: 'sample-ham', name: 'Ham', unit: 'g', quantity: 1000, unitCost: .015, reason: 'received', occurredOn: report.from }] } },
    { id: 'demo-count-open', kind: 'count', occurredOn: report.from, recordedAt: `${report.from}T10:00:00Z`, revision: 1, referenceId: null, data: { name: 'Illustrative opening count', phase: 'opening', recordedBy: 'Demo kitchen', lines: opening } },
  ]
}
