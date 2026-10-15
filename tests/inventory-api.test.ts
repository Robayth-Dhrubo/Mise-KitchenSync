// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { testD1 } from './helpers/d1'
import { POST as count } from '../src/app/api/inventory/counts/route'
import { POST as usage } from '../src/app/api/inventory/usage/route'
import { POST as reconcile } from '../src/app/api/inventory/reconcile/route'
import { GET as history } from '../src/app/api/inventory/events/route'
import { PUT } from '../src/app/api/workspace/route'
import { commitInventoryState, readWorkspace } from '../src/lib/workspace/inventory-server'
import { countSubmission, newCountDraft, type InventoryEvent } from '../src/lib/workspace/inventory-control'
import { demoWorkspace } from '../src/lib/workspace/demo'
import { demoInventoryHistory } from '../src/lib/workspace/inventory-demo'
import { kitchenDay, type Workspace } from '../src/lib/workspace/domain'
import { addDays } from '../src/lib/workspace/operations'

const mock = vi.hoisted(() => ({ env: {} as Record<string, unknown>, user: { userId: 'owner-one', email: 'one@example.test', displayName: 'Owner One' } as { userId: string; email: string; displayName: string } | null }))
vi.mock('cloudflare:workers', () => ({ env: mock.env }))
vi.mock('../src/app/chatgpt-auth', () => ({ getChatGPTUser: async () => mock.user }))
vi.mock('../src/lib/workspace/billing', () => ({ requireBillingAccess: async () => {}, BillingError: class BillingError extends Error { status = 503 } }))
let database: DatabaseSync
beforeEach(() => {
  database = new DatabaseSync(':memory:')
  for (const file of readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) database.exec(readFileSync(`drizzle/${file}`, 'utf8'))
  mock.user = { userId: 'owner-one', email: 'one@example.test', displayName: 'Owner One' }
  mock.env.DB = testD1(database)
})
afterEach(() => database.close())
const request = (path: string, body: unknown, scope = 'owner-one', origin = 'https://mise.example') => new Request(`https://mise.example/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Mise-Account': scope }, body: JSON.stringify(body) })
function seed(state = demoWorkspace(), owner = 'owner-one') {
  database.prepare('INSERT INTO kitchen_workspaces(owner_id, revision, data, updated_at) VALUES (?, 1, ?, ?)').run(owner, JSON.stringify(state), new Date().toISOString())
  return state
}
function input(state = demoWorkspace(), id = 'count-one') { const draft = newCountDraft(state, 1, 'owner-one'); draft.eventId = id; draft.lines[0].quantity = 25; return countSubmission(draft) }
function insertEvent(event: InventoryEvent, owner = 'owner-one', hash = '') {
  database.prepare('INSERT INTO inventory_events(owner_id, location_id, event_id, kind, occurred_on, recorded_at, revision, reference_id, request_hash, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(owner, 'primary', event.id, event.kind, event.occurredOn, event.recordedAt, event.revision, event.referenceId, hash, JSON.stringify(event.data))
}
const eventCount = () => database.prepare('SELECT count(*) AS total FROM inventory_events').get()!.total

describe('Authenticated physical counts and atomic history', () => {
  it('commits a physical count once, returns a fresh snapshot on retry and rejects reused IDs', async () => {
    const state = seed(), submission = input(state)
    const saved = await count(request('inventory/counts', submission))
    expect(saved.status).toBe(200); expect(saved.headers.get('cache-control')).toBe('no-store')
    expect((await saved.json()).snapshot.state.ingredients[0].stock).toBe(25)
    const duplicate = await count(request('inventory/counts', submission))
    expect((await duplicate.json()).duplicate).toBe(true); expect(eventCount()).toBe(1)
    expect((await count(request('inventory/counts', { ...submission, lines: [{ ...submission.lines[0], quantity: 26 }] }))).status).toBe(409)
    expect((await readWorkspace('owner-one')).revision).toBe(2)
    const stored = database.prepare('SELECT data FROM inventory_events').get()!
    expect(JSON.parse(String(stored.data)).recordedBy).toBe('Owner One')
  })
  it('rejects stale revisions and never creates an orphaned event', async () => {
    const state = seed()
    await count(request('inventory/counts', input(state)))
    const conflict = await count(request('inventory/counts', input(state, 'stale-count')))
    expect(conflict.status).toBe(409); expect((await conflict.json()).snapshot.revision).toBe(2); expect(eventCount()).toBe(1)
  })
  it('allows only one of two concurrent writers to update stock and history', async () => {
    const state = seed()
    const results = await Promise.all([count(request('inventory/counts', input(state, 'concurrent-a'))), count(request('inventory/counts', input(state, 'concurrent-b')))])
    expect(results.map(item => item.status).sort()).toEqual([200, 409]); expect(eventCount()).toBe(1)
    expect((await readWorkspace('owner-one')).revision).toBe(2)
  })
  it('rolls back the stock update when the event insert fails', async () => {
    const state = seed(), event = demoInventoryHistory(state)[0]
    insertEvent(event)
    const changed = { ...state, ingredients: state.ingredients.map(item => ({ ...item, stock: 999 })) }
    await expect(commitInventoryState('owner-one', 1, changed, event, 'duplicate')).rejects.toThrow()
    const snapshot = await readWorkspace('owner-one')
    expect(snapshot.revision).toBe(1); expect(snapshot.state.ingredients[0].stock).toBe(state.ingredients[0].stock); expect(eventCount()).toBe(1)
  })
  it('requires the current account marker and rejects cross-origin or unauthenticated writes', async () => {
    seed()
    expect((await count(request('inventory/counts', input(), 'another-owner'))).status).toBe(403)
    expect((await count(request('inventory/counts', input(), ''))).status).toBe(403)
    expect((await count(request('inventory/counts', input(), 'owner-one', 'https://other.example'))).status).toBe(403)
    mock.user = null
    expect((await count(request('inventory/counts', input()))).status).toBe(401); expect(eventCount()).toBe(0)
  })
  it('rejects invalid units, future dates and superseded historical counts without a stock change', async () => {
    const state = seed(), submission = input(state)
    expect((await count(request('inventory/counts', { ...submission, lines: [{ ...submission.lines[0], unit: 'kg' }] }))).status).toBe(400)
    expect((await count(request('inventory/counts', { ...submission, date: '2100-01-01' }))).status).toBe(400)
    expect((await count(request('inventory/counts', submission))).status).toBe(200)
    const old = await count(request('inventory/counts', { ...submission, eventId: 'old-count', revision: 2, date: addDays(kitchenDay(), -1) }))
    expect(old.status).toBe(400); expect(await old.text()).toContain('Later stock activity'); expect(eventCount()).toBe(1)
  })
})

describe('Inventory review ownership and pagination', () => {
  it('paginates a stable tie-break order and never returns another owner’s history', async () => {
    const state = seed(), fixture = demoInventoryHistory(state)[0]
    for (let index = 0; index < 27; index++) insertEvent({ ...fixture, id: `event-${String(index).padStart(2, '0')}` })
    insertEvent({ ...fixture, id: 'private-other' }, 'owner-two')
    const first = await (await history(new Request('https://mise.example/api/inventory/events'))).json()
    expect(first.events).toHaveLength(25); expect(first.nextCursor).toBeTruthy()
    const next = await (await history(new Request(`https://mise.example/api/inventory/events?cursor=${encodeURIComponent(first.nextCursor)}`))).json()
    expect(next.events).toHaveLength(2); expect(next.nextCursor).toBeNull()
    expect(new Set([...first.events, ...next.events].map(item => item.id)).size).toBe(27)
    expect((await history(new Request('https://mise.example/api/inventory/events?cursor=bad'))).status).toBe(400)
  })
  it('uses saved opening/closing costs and refuses another owner’s boundary IDs', async () => {
    const state = seed(), events = demoInventoryHistory(state)
    events.forEach(event => insertEvent(event))
    const body = { openingId: 'demo-count-open', closingId: 'demo-count-close', reportId: state.operations!.salesReports[0].id, completeSales: true }
    const result = await reconcile(request('inventory/reconcile', body))
    expect(result.status).toBe(200); expect((await result.json()).review.varianceValue).toBeCloseTo(1.12)
    seed(state, 'owner-two'); mock.user = { userId: 'owner-two', email: 'two@example.test', displayName: 'Two' }
    expect((await reconcile(request('inventory/reconcile', body, 'owner-two'))).status).toBe(404)
  })
})

describe('Reviewed PMIX posting', () => {
  function ready() { const state = demoWorkspace(); state.ingredients = state.ingredients.map(item => ({ ...item, stock: 100000 })); seed(state); insertEvent(demoInventoryHistory(state).find(event => event.id === 'demo-count-open')!); return state }
  it('posts stock and the immutable recipe snapshot once, with safe retries', async () => {
    const state = ready(), report = state.operations!.salesReports[0]
    const payload = { eventId: 'post-sales', reportId: report.id, revision: 1, confirmed: true }
    const posted = await usage(request('inventory/usage', payload))
    expect(posted.status).toBe(200); expect((await posted.json()).snapshot.state.ingredients[0].stock).toBe(99505)
    expect((await (await usage(request('inventory/usage', payload))).json()).duplicate).toBe(true)
    expect((await usage(request('inventory/usage', { ...payload, eventId: 'post-again', revision: 2 }))).status).toBe(400)
    expect(eventCount()).toBe(2); expect((await readWorkspace('owner-one')).revision).toBe(2)
  })
  it('blocks historical depletion and changes to a posted report', async () => {
    const historical = seed(); demoInventoryHistory(historical).forEach(event => insertEvent(event))
    const payload = { eventId: 'old-report', reportId: historical.operations!.salesReports[0].id, revision: 1, confirmed: true }
    expect((await usage(request('inventory/usage', payload))).status).toBe(400)
    database.exec('DELETE FROM inventory_events; DELETE FROM kitchen_workspaces')
    const state = ready(); expect((await usage(request('inventory/usage', { ...payload, reportId: state.operations!.salesReports[0].id }))).status).toBe(200)
    const snapshot = await readWorkspace('owner-one'); snapshot.state.operations!.salesReports[0].rows[0].quantity++
    const update = new Request('https://mise.example/api/workspace', { method: 'PUT', headers: { Origin: 'https://mise.example', 'Content-Type': 'application/json', 'X-Mise-Account': 'owner-one' }, body: JSON.stringify({ revision: 2, state: snapshot.state }) })
    expect((await PUT(update)).status).toBe(400)
  })
  it('does not accept backdated receipts already reflected in a physical count', async () => {
    const state = ready(), fixture = demoInventoryHistory(state)[0]; insertEvent({ ...fixture, occurredOn: kitchenDay() })
    const next: Workspace = { ...state, orders: [{ id: 'late-receipt', supplierId: null, created: addDays(kitchenDay(), -1), status: 'received', received: addDays(kitchenDay(), -1), lines: [{ ingredientId: state.ingredients[0].id, name: state.ingredients[0].name, packs: 1, unit: 'each', usablePerPack: 180, unitPrice: 64, purchaseLabel: 'Case' }] }], ingredients: state.ingredients.map((item, index) => index === 0 ? { ...item, stock: item.stock! + 180 } : item) }
    const update = new Request('https://mise.example/api/workspace', { method: 'PUT', headers: { Origin: 'https://mise.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 1, state: next }) })
    const result = await PUT(update); expect(result.status).toBe(400); expect(await result.text()).toContain('already covers')
    expect((await readWorkspace('owner-one')).revision).toBe(1)
  })
})
