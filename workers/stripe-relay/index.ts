import { verifyStripeWebhook, StripeWebhookError } from '../../src/lib/workspace/stripe-webhook'

type RelayEnv = { MISE_SITE_ORIGIN?: string; MISE_SITE_SERVICE_TOKEN?: string; STRIPE_WEBHOOK_SECRET?: string }

// This receiver is separate from the private kitchen. It has no database or
// kitchen read endpoint. Deploy it only when configuring merchant webhooks.
export default {
  async fetch(request: Request, env: RelayEnv): Promise<Response> {
    if (new URL(request.url).pathname !== '/stripe') return new Response('Not found', { status: 404 })
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } })
    try {
      if (!env.MISE_SITE_ORIGIN || !env.MISE_SITE_SERVICE_TOKEN) throw new StripeWebhookError('Receiver is not configured.', 503)
      const site = new URL(env.MISE_SITE_ORIGIN)
      if (site.protocol !== 'https:' || !site.hostname.endsWith('.chatgpt.site') || site.port || site.username || site.password || site.pathname !== '/' || site.search || site.hash) {
        throw new StripeWebhookError('Receiver destination is not configured.', 503)
      }
      const { body } = await verifyStripeWebhook(request, env.STRIPE_WEBHOOK_SECRET)
      const response = await fetch(new URL('/api/billing/webhook', site), {
        method: 'POST', body, redirect: 'error', signal: AbortSignal.timeout(20000),
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': request.headers.get('stripe-signature')!,
          'OAI-Sites-Authorization': `Bearer ${env.MISE_SITE_SERVICE_TOKEN}`,
        },
      })
      const result = await response.json().catch(() => null) as { received?: boolean } | null
      if (!response.ok || result?.received !== true) throw new StripeWebhookError('Delivery is temporarily unavailable.', 503)
      return Response.json({ received: true })
    } catch (error) {
      const expected = error instanceof StripeWebhookError
      return Response.json({ error: expected ? error.message : 'Delivery is temporarily unavailable.' }, { status: expected ? error.status : 503 })
    }
  },
}
