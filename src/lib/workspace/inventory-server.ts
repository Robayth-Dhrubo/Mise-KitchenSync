import { env } from 'cloudflare:workers'
import { emptyWorkspace, kitchenDay, workspaceSchema, type Snapshot, type Workspace } from './domain'
import { inventoryEventSchema, inventoryTransition, type InventoryEvent } from './inventory-control'
import type { CountSubmission } from './stock-control-schema'

export class InventoryError extends Error { constructor(message: string, public status = 400, public snapshot?: Snapshot) { super(message) } }
export const privateJson = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
export function checkOrigin(request: Request) { const origin = request.headers.get('origin'); if (origin && origin !== new URL(request.url).origin) throw new InventoryError('This request did not originate from your kitchen.', 403) }
export function checkAccount(request: Request, owner: string, required = false) { const scope = request.headers.get('x-mise-account'); if ((required && !scope) || (scope && scope !== owner)) throw new InventoryError('The signed-in account changed. Sign in to the account that started this work, or reload the page before making a new edit.', 403) }
function db() { if (!env.DB) throw new InventoryError('Inventory storage is unavailable. Your draft has not been applied.', 503); return env.DB }
export async function readWorkspace(owner: string): Promise<Snapshot> {
  const row = await db().prepare('SELECT revision, data, updated_at FROM kitchen_workspaces WHERE owner_id = ?').bind(owner).first<{ revision: number; data: string; updated_at: string }>()
  return row ? { revision: row.revision, state: workspaceSchema.parse(JSON.parse(row.data)), updatedAt: row.updated_at } : { revision: 0, state: emptyWorkspace(), updatedAt: null }
}
export type EventRow = { event_id: string; kind: string; occurred_on: string; recorded_at: string; revision: number; reference_id: string | null; request_hash: string; data: string }
export function eventFromRow(row: EventRow): InventoryEvent { return inventoryEventSchema.parse({ id: row.event_id, kind: row.kind, occurredOn: row.occurred_on, recordedAt: row.recorded_at, revision: row.revision, referenceId: row.reference_id, data: JSON.parse(row.data) }) }
export async function findInventoryEvent(owner: string, id: string) { return db().prepare('SELECT * FROM inventory_events WHERE owner_id = ? AND location_id = ? AND event_id = ?').bind(owner, 'primary', id).first<EventRow>() }
export async function requestHash(value: unknown) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))))).map(value => value.toString(16).padStart(2, '0')).join('') }
export async function checkCountDate(owner: string, input: CountSubmission) {
  // A backdated physical quantity must not erase later stock activity. Do not
  // infer a replacement current balance from an old count and incomplete data.
  if (input.date === kitchenDay()) return
  const later = await db().prepare("SELECT event_id FROM inventory_events WHERE owner_id = ? AND location_id = ? AND EXISTS (SELECT 1 FROM json_each(inventory_events.data, '$.lines') AS line JOIN json_each(?) AS requested ON json_extract(line.value, '$.ingredientId') = requested.value WHERE (kind IN ('count', 'usage') AND occurred_on > ?) OR (kind = 'movement' AND json_extract(line.value, '$.occurredOn') > ?)) LIMIT 1")
    .bind(owner, 'primary', JSON.stringify(input.lines.map(line => line.ingredientId)), input.date, input.date).first()
  if (later) throw new InventoryError('Later stock activity already follows this count date. Recount current stock instead of replacing it with a historical quantity.')
}

/** The token connects the event insert to the conditional update in one D1 transaction. */
export async function commitInventoryState(owner: string, revision: number, state: Workspace, event?: InventoryEvent, hash = ''): Promise<Snapshot> {
  const database = db(), token = crypto.randomUUID(), updatedAt = new Date().toISOString(), data = JSON.stringify(workspaceSchema.parse(state))
  const update = revision === 0
    ? database.prepare('INSERT INTO kitchen_workspaces (owner_id, revision, data, updated_at, save_token) VALUES (?, 1, ?, ?, ?) ON CONFLICT(owner_id) DO NOTHING').bind(owner, data, updatedAt, token)
    : database.prepare('UPDATE kitchen_workspaces SET revision = revision + 1, data = ?, updated_at = ?, save_token = ? WHERE owner_id = ? AND revision = ?').bind(data, updatedAt, token, owner, revision)
  let changed: number
  if (event) {
    inventoryEventSchema.parse(event)
    const insert = database.prepare('INSERT INTO inventory_events (owner_id, location_id, event_id, kind, occurred_on, recorded_at, revision, reference_id, request_hash, data) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM kitchen_workspaces WHERE owner_id = ? AND save_token = ?)')
      .bind(owner, 'primary', event.id, event.kind, event.occurredOn, event.recordedAt, revision + 1, event.referenceId, hash, JSON.stringify(event.data), owner, token)
    const results = await database.batch([update, insert]); changed = results[0].meta.changes
  } else { changed = (await update.run()).meta.changes }
  if (!changed) throw new InventoryError('Another tab or device saved changes. Review the latest kitchen before applying this edit.', 409, await readWorkspace(owner))
  return { revision: revision + 1, state, updatedAt }
}
export async function saveWorkspace(owner: string, revision: number, state: Workspace, replace = false): Promise<Snapshot> {
  const previous = await readWorkspace(owner)
  if (previous.revision !== revision) throw new InventoryError('Another tab or device saved changes. Reload your kitchen, then retry this edit.', 409, previous)
  if (!replace) for (const report of previous.state.operations?.salesReports ?? []) {
    const next = state.operations?.salesReports.find(item => item.id === report.id)
    if (JSON.stringify(next) !== JSON.stringify(report)) {
      const posted = await db().prepare('SELECT event_id FROM inventory_events WHERE owner_id = ? AND location_id = ? AND kind = ? AND reference_id = ?').bind(owner, 'primary', 'usage', report.id).first()
      if (posted) throw new InventoryError('This sales report has posted inventory usage. Keep its original snapshot and use a new report for a reviewed correction.')
    }
  }
  const transition = inventoryTransition(previous.state, state)
  if (!replace) {
    if (transition.lines.some(line => line.occurredOn > kitchenDay())) throw new InventoryError('Physical receipts and waste cannot be recorded for a future date.')
    const dated = transition.lines.filter(line => line.reason === 'received' || line.reason === 'waste')
    if (dated.length) {
      const counts = await baselineCounts(owner)
      for (const line of dated) {
        const later = counts.find(event => event.kind === 'count' && event.data.lines.some(item => item.ingredientId === line.ingredientId) && (event.occurredOn > line.occurredOn || event.occurredOn === line.occurredOn && event.data.phase === 'closing'))
        if (later) throw new InventoryError(`${line.name}: a later physical count already covers this dated receipt or loss. Reconcile the historical record instead of changing current stock again.`)
      }
    }
  }
  const event: InventoryEvent | undefined = transition.lines.length ? { id: crypto.randomUUID(), kind: 'movement', occurredOn: kitchenDay(), recordedAt: new Date().toISOString(), revision: revision + 1, referenceId: null,
    data: replace ? { lines: transition.lines.map(line => ({ ...line, quantity: null, reason: 'adjustment' as const })) } : transition } : undefined
  return commitInventoryState(owner, revision, state, event, event ? await requestHash(event.data) : '')
}
export async function listInventoryEvents(owner: string, cursor: { at: string; id: string } | null = null) {
  const result = cursor
    ? await db().prepare('SELECT * FROM inventory_events WHERE owner_id = ? AND location_id = ? AND (recorded_at < ? OR (recorded_at = ? AND event_id < ?)) ORDER BY recorded_at DESC, event_id DESC LIMIT 26').bind(owner, 'primary', cursor.at, cursor.at, cursor.id).all<EventRow>()
    : await db().prepare('SELECT * FROM inventory_events WHERE owner_id = ? AND location_id = ? ORDER BY recorded_at DESC, event_id DESC LIMIT 26').bind(owner, 'primary').all<EventRow>()
  const rows = result.results.slice(0, 25), last = rows.at(-1)
  return { events: rows.map(eventFromRow), next: result.results.length > 25 && last ? { at: last.recorded_at, id: last.event_id } : null }
}
export async function eventsForPeriod(owner: string, from: string, through: string) {
  const filter = "owner_id = ? AND location_id = ? AND ((kind = 'usage' AND occurred_on BETWEEN ? AND ?) OR (kind = 'movement' AND EXISTS (SELECT 1 FROM json_each(inventory_events.data, '$.lines') AS line WHERE json_extract(line.value, '$.occurredOn') BETWEEN ? AND ?)))"
  const values = [owner, 'primary', from, through, from, through]
  const size = await db().prepare(`SELECT count(*) AS total, coalesce(sum(length(data)), 0) AS bytes FROM inventory_events WHERE ${filter}`).bind(...values).first<{ total: number; bytes: number }>()
  if (size && (size.total > 2000 || size.bytes > 4_000_000)) throw new InventoryError('This review is too large. Use a shorter interval or export the inventory history for review.')
  const rows = await db().prepare(`SELECT * FROM inventory_events WHERE ${filter} ORDER BY recorded_at ASC LIMIT 2000`).bind(...values).all<EventRow>()
  return rows.results.map(eventFromRow)
}
export async function baselineCounts(owner: string) {
  const rows = await db().prepare('SELECT * FROM inventory_events WHERE owner_id = ? AND location_id = ? AND kind = ? ORDER BY occurred_on DESC, recorded_at DESC LIMIT 25').bind(owner, 'primary', 'count').all<EventRow>()
  return rows.results.map(eventFromRow)
}
