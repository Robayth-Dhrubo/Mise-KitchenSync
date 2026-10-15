// Shared by the private app and its separately deployed webhook receiver.
// Uses Web Crypto so signature checks work in Cloudflare Workers without Node APIs.
export class StripeWebhookError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export type StripeEvent = {
  id: string
  type: string
  livemode: boolean
  data: { object: Record<string, unknown> }
}

const MAX_BYTES = 1024 * 1024
export async function verifyStripeWebhook(request: Request, secret: string | undefined) {
  if (!secret) throw new StripeWebhookError('Webhook delivery is not configured.', 503)
  const header = request.headers.get('stripe-signature') ?? ''
  if (header.length > 4096) throw new StripeWebhookError('Invalid webhook signature.')
  const parts = header.split(',').map(part => part.trim().split('='))
  const times = parts.filter(([name]) => name === 't').map(([, value]) => value)
  const signatures = parts.filter(([name, value]) => name === 'v1' && /^[a-f0-9]{64}$/i.test(value ?? '')).map(([, value]) => value)
  const timestamp = times[0]
  if (times.length !== 1 || !/^\d{1,12}$/.test(timestamp ?? '') || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    throw new StripeWebhookError('Invalid or expired webhook signature.')
  }
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new StripeWebhookError('Webhook body is too large.', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new StripeWebhookError('Missing webhook body.')
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      length += next.value.byteLength
      if (length > MAX_BYTES) { await reader.cancel(); throw new StripeWebhookError('Webhook body is too large.', 413) }
      chunks.push(next.value)
    }
  } finally { reader.releaseLock() }
  const body = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length }
  const prefix = new TextEncoder().encode(`${timestamp}.`)
  const signed = new Uint8Array(prefix.length + body.length)
  signed.set(prefix); signed.set(body, prefix.length)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  let valid = false
  for (const signature of signatures) {
    const bytes = Uint8Array.from(signature.match(/../g)!, pair => parseInt(pair, 16))
    // The platform's cryptographic verification avoids string comparison timing leaks.
    valid = await crypto.subtle.verify('HMAC', key, bytes, signed) || valid
  }
  if (!valid) throw new StripeWebhookError('Invalid webhook signature.')
  let event: StripeEvent
  try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) } catch { throw new StripeWebhookError('Invalid webhook body.') }
  if (!event || !/^evt_[a-zA-Z0-9_]{1,200}$/.test(event.id ?? '') || typeof event.type !== 'string' || typeof event.livemode !== 'boolean' || !event.data?.object || typeof event.data.object !== 'object' || Array.isArray(event.data.object)) {
    throw new StripeWebhookError('Invalid webhook event.')
  }
  return { event, body: body.buffer }
}
