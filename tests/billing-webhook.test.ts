// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { POST } from '../src/app/api/billing/webhook/route'
import { verifyStripeWebhook } from '../src/lib/workspace/stripe-webhook'
import relay from '../workers/stripe-relay'

const mock = vi.hoisted(() => ({ env: {} as Record<string, unknown> }))
vi.mock('cloudflare:workers', () => ({ env: mock.env }))
const secret = 'whsec_fixture_placeholder'
let database: DatabaseSync
const subscription = {
  id: 'sub_owned', status: 'active', latest_invoice: { status: 'paid' },
  metadata: { mise_owner_id: 'owner-one' }, items: { data: [{ price: { id: 'price_mise' } }] },
}
function event(type = 'invoice.paid', object: Record<string, unknown> = { customer: 'cus_owned' }) {
  return { id: 'evt_fixture', type, livemode: false, data: { object } }
}
function signed(value: unknown, timestamp = Math.floor(Date.now() / 1000), url = 'https://mise.example/api/billing/webhook') {
  const body = typeof value === 'string' ? value : JSON.stringify(value)
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return new Request(url, { method: 'POST', headers: { 'Stripe-Signature': `t=${timestamp},v1=${signature}` }, body })
}
function provider(value: unknown = subscription) {
  const fetcher = vi.fn(async (input: string) => { expect(input).toContain('/subscriptions?'); return Response.json({ data: value ? [value] : [], has_more: false }) })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
function receipt() { return database.prepare('SELECT * FROM billing_receipts WHERE owner_id = ?').get('owner-one') }

beforeEach(() => {
  Object.keys(mock.env).forEach(key => delete mock.env[key])
  database = new DatabaseSync(':memory:')
  for (const file of readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) {
    database.exec(readFileSync(`drizzle/${file}`, 'utf8'))
  }
  database.prepare('INSERT INTO billing_accounts (owner_id, customer_id, updated_at) VALUES (?, ?, ?)').run('owner-one', 'cus_owned', '2026-01-01')
  const prepare = (sql: string) => ({ bind: (...values: (string | null)[]) => ({
    first: async () => database.prepare(sql).get(...values) ?? null,
    run: async () => database.prepare(sql).run(...values),
  }) })
  Object.assign(mock.env, {
    STRIPE_SECRET_KEY: 'rk_test_fixture_placeholder', STRIPE_PRICE_ID: 'price_mise', STRIPE_WEBHOOK_SECRET: secret,
    DB: { prepare, batch: async (statements: { run: () => Promise<unknown> }[]) => {
      database.exec('BEGIN')
      try { const result = []; for (const statement of statements) result.push(await statement.run()); database.exec('COMMIT'); return result }
      catch (error) { database.exec('ROLLBACK'); throw error }
    } },
  })
})
afterEach(() => { vi.unstubAllGlobals(); database.close() })

describe('Signed Stripe delivery', () => {
  it('verifies the exact raw bytes and supports signature rotation', async () => {
    const request = signed(JSON.stringify(event(), null, 2))
    request.headers.set('stripe-signature', `${request.headers.get('stripe-signature')},v1=${'0'.repeat(64)}`)
    expect((await verifyStripeWebhook(request, secret)).event.id).toBe('evt_fixture')
  })
  it('rejects tampering before any account or database processing', async () => {
    const original = signed(event())
    const request = new Request(original.url, { method: 'POST', headers: original.headers, body: JSON.stringify(event('invoice.payment_failed')) })
    const fetcher = provider()
    expect((await POST(request)).status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled(); expect(receipt()).toBeUndefined()
  })
  it.each([-301, 301])('rejects a signature outside the clock tolerance (%s seconds)', async delta => {
    const response = await POST(signed(event(), Math.floor(Date.now() / 1000) + delta))
    expect(response.status).toBe(400)
  })
  it('rejects missing signatures, malformed events, and excessive bodies', async () => {
    expect((await POST(new Request('https://mise.example/api/billing/webhook', { method: 'POST', body: '{}' }))).status).toBe(400)
    expect((await POST(signed({ id: 'evt_bad', type: 'invoice.paid' }))).status).toBe(400)
    expect((await POST(signed('x'.repeat(1024 * 1024 + 1)))).status).toBe(413)
  })
})

describe('Subscription lifecycle and ownership', () => {
  it('stores canonical settled access using the existing customer ownership mapping', async () => {
    const fetcher = provider()
    const response = await POST(signed(event('invoice.paid', { customer: 'cus_owned', metadata: { mise_owner_id: 'attacker' } })))
    expect(response.status).toBe(200)
    expect(receipt()).toMatchObject({ owner_id: 'owner-one', subscription_id: 'sub_owned', status: 'active' })
    expect(database.prepare('SELECT * FROM billing_receipts WHERE owner_id = ?').get('attacker')).toBeUndefined()
    expect(fetcher.mock.calls[0][0]).toContain('customer=cus_owned')
  })
  it('deduplicates retries without repeating the provider call', async () => {
    const fetcher = provider()
    await POST(signed(event()))
    const again = await POST(signed(event()))
    expect(await again.json()).toMatchObject({ received: true, duplicate: true })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(database.prepare('SELECT count(*) AS total FROM billing_events').get()?.total).toBe(1)
  })
  it('uses current cancellation state even when an older paid event arrives late', async () => {
    provider({ ...subscription, status: 'canceled' })
    expect((await POST(signed(event('invoice.paid')))).status).toBe(200)
    expect(receipt()).toMatchObject({ status: 'canceled' })
  })
  it('keeps asynchronous payments pending until the canonical invoice is paid', async () => {
    provider({ ...subscription, latest_invoice: { status: 'open' } })
    await POST(signed(event('customer.subscription.created')))
    expect(receipt()).toMatchObject({ status: 'pending_payment' })
    const fetcher = provider()
    const unpaid = event('checkout.session.completed', { customer: 'cus_owned', payment_status: 'unpaid' })
    expect(await (await POST(signed({ ...unpaid, id: 'evt_unpaid' }))).json()).toMatchObject({ ignored: true })
    expect(fetcher).not.toHaveBeenCalled()
    const paid = event('checkout.session.async_payment_succeeded', { customer: 'cus_owned', payment_status: 'paid' })
    await POST(signed({ ...paid, id: 'evt_settled' }))
    expect(receipt()).toMatchObject({ status: 'active', event_id: 'evt_settled' })
  })
  it('handles failed renewals without extending paid access', async () => {
    provider({ ...subscription, status: 'past_due', latest_invoice: { status: 'open' } })
    await POST(signed(event('invoice.payment_failed')))
    expect(receipt()).toMatchObject({ status: 'past_due' })
  })
  it('ignores unknown customers and rejects unrelated prices, owners, and environments', async () => {
    const fetcher = provider()
    expect(await (await POST(signed(event('invoice.paid', { customer: 'cus_unknown' })))).json()).toMatchObject({ ignored: true })
    expect(fetcher).not.toHaveBeenCalled()
    provider({ ...subscription, metadata: { mise_owner_id: 'other-owner' } })
    await POST(signed(event()))
    expect(receipt()).toMatchObject({ status: 'none', subscription_id: null })
    provider({ ...subscription, items: { data: [{ price: { id: 'price_unrelated' } }] } })
    await POST(signed({ ...event(), id: 'evt_wrong_price' }))
    expect(receipt()).toMatchObject({ status: 'none' })
    expect((await POST(signed({ ...event(), livemode: true }))).status).toBe(400)
  })
  it('returns a retryable error without acknowledging a failed provider lookup', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    expect((await POST(signed(event()))).status).toBe(503)
    expect(receipt()).toBeUndefined()
    expect(database.prepare('SELECT count(*) AS total FROM billing_events').get()?.total).toBe(0)
  })
})

describe('Separate receiver for a private kitchen', () => {
  const settings = { MISE_SITE_ORIGIN: 'https://mise-kitchensync.earthy-swan-3457.chatgpt.site', MISE_SITE_SERVICE_TOKEN: 'service_fixture_placeholder', STRIPE_WEBHOOK_SECRET: secret }
  it('forwards verified raw events only to the configured private Site', async () => {
    const fetcher = vi.fn(async (_url: URL, _options: RequestInit) => Response.json({ received: true }))
    vi.stubGlobal('fetch', fetcher)
    const response = await relay.fetch(signed(event(), undefined, 'https://receiver.example/stripe'), settings)
    expect(response.status).toBe(200)
    const [url, options] = fetcher.mock.calls[0]
    expect(url.href).toBe(`${settings.MISE_SITE_ORIGIN}/api/billing/webhook`)
    expect(new Headers(options.headers).get('OAI-Sites-Authorization')).toBe(`Bearer ${settings.MISE_SITE_SERVICE_TOKEN}`)
    expect(new TextDecoder().decode(options.body as ArrayBuffer)).toBe(JSON.stringify(event()))
    expect(options.redirect).toBe('error')
  })
  it('rejects unsigned requests and arbitrary destinations without forwarding credentials', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    expect((await relay.fetch(new Request('https://receiver.example/stripe', { method: 'POST', body: '{}' }), settings)).status).toBe(400)
    expect((await relay.fetch(signed(event(), undefined, 'https://receiver.example/stripe'), { ...settings, MISE_SITE_ORIGIN: 'https://attacker.example' })).status).toBe(503)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('keeps upstream failures retryable and exposes no other public routes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    expect((await relay.fetch(signed(event(), undefined, 'https://receiver.example/stripe'), settings)).status).toBe(503)
    expect((await relay.fetch(new Request('https://receiver.example/stripe'), settings)).status).toBe(405)
    expect((await relay.fetch(new Request('https://receiver.example/'), settings)).status).toBe(404)
  })
  it('does not acknowledge a sign-in page masquerading as a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Sign in</html>', { headers: { 'Content-Type': 'text/html' } })))
    expect((await relay.fetch(signed(event(), undefined, 'https://receiver.example/stripe'), settings)).status).toBe(503)
  })
})
