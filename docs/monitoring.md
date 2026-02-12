# Monitoring & Logging — Mise KitchenSync

This document recommends lightweight monitoring and error-tracking for production and a simple local logging approach for development.

## Goals
- Capture server-side errors and exceptions
- Track important business events (order-failures, inventory anomalies)
- Low-friction setup (Sentry or similar)

## Recommended stack
- Errors & performance: Sentry (server + browser)
- Logs: structured logs to stdout (captured by platform like Vercel) or to a centralized log sink (Datadog/Logflare)
- Alerts: Sentry alerts + Slack webhook for high-severity errors

## Sentry setup (recommended)
1. Create a project at https://sentry.io and obtain a DSN.
2. Add the DSN as a secret: `SENTRY_DSN` (Vercel/GitHub Actions/Env).
3. Install packages: `@sentry/node` (server) and `@sentry/react` (client) if desired.

Server sample (see `src/lib/monitoring/sentry.ts`):

```ts
import * as Sentry from '@sentry/node'

export function initSentry() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  Sentry.init({ dsn, tracesSampleRate: 0.1 })
}

export function captureException(e: unknown) {
  if ((global as any).Sentry) {
    Sentry.captureException(e)
  } else {
    console.error(e)
  }
}
```

## Business events & telemetry
- Track events like: `order.created.failed`, `inventory.threshold.reached`, `seed.failed`.
- Use Sentry breadcrumbs or a small analytics pipeline (Segment) for higher-level metrics.

## Logging best practices
- Use structured logs (JSON) in server processes: include request id, user id, location id.
- Avoid logging secrets (keys, tokens, full request bodies with card data).

## Quick-run checklist
1. Add `SENTRY_DSN` to your production environment variables.
2. Install `@sentry/node` and initialize `initSentry()` early in server startup (e.g., in `src/lib/providers` or server entrypoints).
3. Capture critical errors in API routes and server-side rendering.

## Next steps I can implement
- Add `src/lib/monitoring/sentry.ts` with initialization helpers (I can add this file).  
- Add sample integration to an API route or error boundary.  
