# Stripe receiver for a private Mise kitchen

This prepared Worker has **not been deployed**. It exposes only `POST /stripe`.
It verifies the raw Stripe signature, forwards that exact payload to the private
Site using server-side service access, and returns success only when the private
handler accepts it. It has no kitchen database binding or read API.

The kitchen Site stays private. Stripe cannot call a private Site directly
because it does not send the platform's service authentication header.

## Configure and test before enabling payments

1. Select a separate Stripe sandbox and a Cloudflare account for this receiver.
   Review the receiver's public deployment separately from the private kitchen.
2. Review `wrangler.jsonc` and retain the exact private Site origin. Keep all
   secrets out of this file and out of Git.
3. Deploy the receiver using the project's Wrangler CLI when public receiver
   deployment is authorized. Its event URL is the returned Worker origin plus
   `/stripe`. Never make the kitchen public to bypass service authentication.
4. Create a Stripe event destination for the receiver URL. Use API version
   `2026-08-26.dahlia` and subscribe to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`
   - `invoice.paid`, `invoice.payment_failed`
5. Store the destination's signing secret as `STRIPE_WEBHOOK_SECRET` in both
   the receiver's secrets and the private Site's secret settings. Store
   `MISE_SITE_SERVICE_TOKEN` only in the receiver's secret settings using the
   platform-provided service credential for this exact Site. Do not send this
   token to another destination or place it in a webhook URL. A service token
   provides Site access, so restrict receiver administration to trusted owners.
6. Store a sandbox restricted API key and recurring price as `STRIPE_SECRET_KEY`
   and `STRIPE_PRICE_ID` in the private Site's secret settings. The key needs
   Customers read/write, Prices/Products read, Subscriptions/Invoices read,
   Checkout Sessions write and Billing Portal Sessions write permissions.
   Test the actual restricted key's permissions before using a live equivalent.
7. Deliver signed sandbox events through the public receiver. Test checkout,
   renewals, failed payments, cancellation, delayed payment success, retries
   and a second owner. A paid invoice and a matching verified receipt must both
   exist before enforced paid access is granted. Unknown customers are ignored.
8. Configure the merchant portal, business and support identity, customer access,
   tax registrations/collection, and commercial terms. Switch to live credentials
   only after the sandbox flow passes. Each mode has its own signing secret.
   Set `BILLING_ENFORCED=true` only after the existing accounts are migrated.

Use platform secret-input prompts; never pass a secret on the command line.
Do not log request bodies or authentication headers. Restrict receiver ingress
to Stripe's published webhook IP addresses at the hosting edge when configured.
Signature verification remains required regardless of network filtering.

## Delivery behavior

The receiver rejects missing signatures, signatures outside a five-minute clock
tolerance, modified bodies, oversized payloads and arbitrary forwarding hosts.
Both hops preserve the raw body. The Site re-fetches canonical Stripe state and
maps Stripe's customer ID to an existing owner; event metadata cannot choose an
owner. Event receipts are deduplicated in D1. Provider/storage/delivery failures
return `503` so Stripe retries, rather than acknowledging an unprocessed event.

The current receiver handles events synchronously for the assisted pilot. Add
a durable queue before scaling to high delivery volumes. It does not provide
self-service Site invitations or shared kitchen membership.
