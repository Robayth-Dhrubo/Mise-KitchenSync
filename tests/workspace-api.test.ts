// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { GET, PUT } from '../src/app/api/workspace/route'
import { demoWorkspace } from '../src/lib/workspace/demo'

const mock = vi.hoisted(() => ({ env: {} as Record<string, unknown>, user: { userId: 'owner-one', email: 'owner@example.test', displayName: 'Owner' } as { userId: string; email: string; displayName: string } | null }))
vi.mock('cloudflare:workers', () => ({ env: mock.env }))
vi.mock('../src/app/chatgpt-auth', () => ({ getChatGPTUser: async () => mock.user }))
vi.mock('../src/lib/workspace/billing', () => ({ requireBillingAccess: async () => {}, BillingError: class BillingError extends Error { status = 503 } }))
let database: DatabaseSync
beforeEach(() => {
  database = new DatabaseSync(':memory:')
  for (const file of readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) database.exec(readFileSync(`drizzle/${file}`, 'utf8'))
  mock.user = { userId: 'owner-one', email: 'owner@example.test', displayName: 'Owner' }
  mock.env.DB = { prepare: (sql: string) => ({ bind: (...values: (string | number | null)[]) => ({ first: async () => database.prepare(sql).get(...values) ?? null, run: async () => ({ meta: { changes: Number(database.prepare(sql).run(...values).changes) } }) }) }) }
})
afterEach(() => database.close())
const request = (body: unknown, origin = 'https://mise.example') => new Request('https://mise.example/api/workspace', { method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) })

describe('Operational storage boundaries', () => {
  it('round-trips new operational records through the real workspace API', async () => {
    const state = demoWorkspace()
    const saved = await PUT(request({ revision: 0, state }))
    expect(saved.status).toBe(200)
    const result = await (await GET()).json()
    expect(result.revision).toBe(1)
    expect(result.state.operations).toEqual(state.operations)
    expect(result.state.business).toEqual(state.business)
    expect((await GET()).headers.get('cache-control')).toBe('no-store')
  })
  it('uses authenticated ownership and does not accept a supplied owner ID', async () => {
    await PUT(request({ revision: 0, ownerId: 'another-owner', state: demoWorkspace() }))
    expect(database.prepare('SELECT owner_id FROM kitchen_workspaces').get()?.owner_id).toBe('owner-one')
    mock.user = { userId: 'owner-two', email: 'two@example.test', displayName: 'Other' }
    const result = await (await GET()).json()
    expect(result.revision).toBe(0); expect(result.state.operations).toBeUndefined()
  })
  it('rejects unauthenticated and cross-origin writes', async () => {
    expect((await PUT(request({ revision: 0, state: demoWorkspace() }, 'https://other.example'))).status).toBe(403)
    mock.user = null
    expect((await GET()).status).toBe(401)
    expect((await PUT(request({ revision: 0, state: demoWorkspace() }))).status).toBe(401)
    expect(database.prepare('SELECT count(*) AS total FROM kitchen_workspaces').get()?.total).toBe(0)
  })
  it('does not overwrite a newer revision from another device', async () => {
    const state = demoWorkspace()
    await PUT(request({ revision: 0, state }))
    const changed = { ...state, settings: { ...state.settings, kitchenName: 'Saved elsewhere' } }
    expect((await PUT(request({ revision: 1, state: changed }))).status).toBe(200)
    expect((await PUT(request({ revision: 1, state }))).status).toBe(409)
    expect((await (await GET()).json()).state.settings.kitchenName).toBe('Saved elsewhere')
  })
  it('rejects broken new references and excessive backup bodies before changing storage', async () => {
    const state = demoWorkspace(); state.operations!.shifts[0].employeeId = 'missing'
    expect((await PUT(request({ revision: 0, state }))).status).toBe(400)
    expect((await PUT(request({ revision: 0, state: demoWorkspace(), excessive: 'x'.repeat(2_000_001) }))).status).toBe(413)
    expect(database.prepare('SELECT count(*) AS total FROM kitchen_workspaces').get()?.total).toBe(0)
  })
})
