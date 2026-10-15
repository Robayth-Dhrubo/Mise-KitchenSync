import { env } from 'cloudflare:workers'
import { handleBillingEvent, BillingError } from '@/lib/workspace/billing'
import { verifyStripeWebhook, StripeWebhookError } from '@/lib/workspace/stripe-webhook'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const { event } = await verifyStripeWebhook(request, env.STRIPE_WEBHOOK_SECRET)
    const result = await handleBillingEvent(event)
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const expected = error instanceof StripeWebhookError || error instanceof BillingError
    return Response.json({ error: expected ? error.message : 'Webhook processing is temporarily unavailable.' }, {
      status: expected ? error.status : 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
