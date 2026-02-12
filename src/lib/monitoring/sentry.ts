// Lightweight Sentry wrapper. Install `@sentry/node` in production to enable.
// Usage: call initSentry() on server startup. Use captureException(e) to report.

let _Sentry: any = null

export async function initSentry() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  try {
    const mod = await import('@sentry/node')
    _Sentry = (mod as any).default ?? mod
    _Sentry.init({ dsn, tracesSampleRate: 0.05 })
  } catch {
    // optional dependency not installed in this environment
  }
}

export function captureException(e: unknown) {
  if (_Sentry && _Sentry.captureException) {
    _Sentry.captureException(e)
  } else {
    console.error('Captured error:', e)
  }
}

const sentry = { initSentry, captureException }
export default sentry
