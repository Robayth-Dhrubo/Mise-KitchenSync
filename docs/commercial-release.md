# Mise KitchenSync — commercial pilot 0.4

Mise helps an independent restaurant operator maintain purchase prices, cost
recipes, assign prep, create purchase drafts and plan annual kitchen labour.
The product tour is `/product`; `/demo` uses illustrative browser-session data.
The live workspace remains at `/`.

## What this release delivers

See the [0.4 acceptance criteria](product-release-0.4.md) and
[integration backlog](integration-roadmap.md) for current stock-control scope.

- A consistent responsive product interface, readable tables, focus indicators,
  labelled budget controls and keyboard skip links.
- Kitchen setup and a completion guide driven by actual records.
- Hourly and annual-salary staffing, employer burden, overtime allowance,
  recruitment budget and a monthly break-even/operating scenario.
- A saved menu-launch checklist.
- A product tour, working plate-cost calculator and isolated full-product demo.
- Subscription checkout and management using Stripe-hosted pages, server-side
  ownership checks, verified lifecycle webhooks and canonical subscription verification.
- Existing cost, stock, ordering, import, revision-conflict and backup behavior.

## Honest product boundary

This deployment is a **private pilot**, not an open paid launch. Hosted identity
is supplied by Sites/ChatGPT. Each authenticated account has its own kitchen.
Site access does not create shared kitchen membership. Customers need private
Site access arranged **before** subscribing. Shared team roles, general POS
synchronization and multi-location organization management are not in this
release. The retained original Supabase/POS modules are a separate configured
application path; they are not advertised as active pilot features.

The Fabergé source files, sales, payroll and kitchen database are runtime data,
not demo content and not committed to GitHub. Do not add backups, original
documents or credentials to the source repository. The repository's existing
MIT license is preserved.

## Configure merchant billing

Use the Sites environment settings. Never put values in the hosting manifest,
browser code, Git, examples or screenshots.

| Setting | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server-only restricted API key; use a separate sandbox for testing |
| `STRIPE_PRICE_ID` | Active fixed recurring price, supporting CAD/USD/EUR/GBP |
| `STRIPE_API_VERSION` | Optional override; defaults to `2026-08-26.dahlia` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the configured event destination |
| `BILLING_ENFORCED` | Set `true` only after paid access and customer migration have been tested |

Create the product and price in your merchant account, configure the Stripe
customer portal, business identity, public customer terms, privacy and support
details. Review tax and refund configuration for the actual business. The
`/privacy` and `/terms` pages are labelled pilot product notices and are not a
completed commercial policy or contract.

Publish the environment update. The Subscription screen reads the actual
configured price and labels test payments. No payment credentials means private
pilot mode; existing kitchen saves continue. Enforced billing with missing
configuration fails closed instead of silently granting paid access.

Checkout creates an owner-scoped Stripe customer mapping in D1. The price and
owner metadata are set on the server. The customer approves payment on Stripe.
Access checks retrieve the customer's subscriptions from Stripe, restrict them
to the configured price and owner metadata, and accept a verified trial or an active subscription whose latest invoice is paid.
A signed webhook must also have stored confirmation for that subscription.
A `checkout=complete` URL never grants access. Changing `STRIPE_PRICE_ID` is a
plan migration; do not replace it without handling existing subscribers.

Webhooks are required before enabling payments. The signed handler at
`/api/billing/webhook` verifies raw payloads, rejects stale signatures and wrong
environments, resolves ownership through existing Stripe customer mappings, and
records event IDs for safe retries. It retrieves current subscription and invoice
state, so old events cannot restore a canceled subscription. Pending asynchronous
payments do not grant paid access. Provider or storage failures return a retryable
error instead of acknowledging fulfillment.

A private Site requires platform service authentication, which Stripe does not
send directly. The separate receiver in `workers/stripe-relay` verifies Stripe's
signature and forwards the original bytes using server-only Site service access.
The private app verifies the signature again. See the receiver's README. Its
public deployment is not part of the current release; the kitchen's audience
remains owner-only. Do not enable billing until that endpoint is deployed and
signed sandbox events have been delivered end to end.

If Stripe is unavailable, paid saves fail visibly while view and export remain
available. Customer cancellation and payment changes happen through Stripe's
portal; Stripe portal configuration controls those options. Card numbers are
never stored by Mise.

## Validate before taking a real payment

1. Arrange a test customer's private Site access. Confirm it sees an empty
   kitchen and cannot access the Fabergé import or another account's records.
2. Choose a separate Stripe sandbox, configure a test recurring price and merchant portal,
   and deliver signed events through the separate receiver. Keep enforcement off.
3. Test hosted checkout, cancellation, return and subscription refresh using
   Stripe test mode. Confirm access requires both webhook confirmation and the canonical paid invoice.
4. Test an unpaid account, cancelled/expired subscription, a provider failure,
   retry and a concurrent kitchen save. Verify existing records can be exported.
5. Verify invoice renewals, failed payments, cancellation, duplicate deliveries and delayed
   payment settlement. Configure tax registrations and collection for the actual business.
6. Finalize the operating business, support, customer terms, privacy, refunds,
   retention/deletion process and billing/tax settings.
7. Test the actual desktop and mobile browsers with keyboard navigation. The
   authoring environment did not provide the supported Sites browser-QA path;
   automated interaction checks do not replace this step.
8. Enable live merchant keys and enforcement deliberately after the tests.
   Publish, then confirm the real price, access process and portal behavior.

## Validation commands

```sh
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run typecheck
npm run test
npm run lint
npm run build
```

Billing migrations are append-only under `drizzle/`: `0002` stores owner/customer
mappings and `0003` adds verified receipts and event deduplication. Inventory migration `0004` adds the stock ledger and a nullable save token. Existing
workspace backups stay valid; business-planning data is an optional addition.
Hosted publication applies the migration. Source builds retain the Sites
integration and its D1/R2 bindings.

## A practical sales offer

Start with assisted pilots for independent kitchens: supplier/CSV setup, one
costed menu, a station-prep routine and an approved staffing budget. Demonstrate
the product with `/demo`. Measure actual time spent on setup, stock counts,
costing and ordering before promising savings or choosing a subscription price.
Do not use Fabergé sales/payroll screenshots in a public sales demo.

One working tenant, documented support and tested billing are the first paid
pilot milestone. Broad SaaS sales require the additional access, team and
operations capabilities above.
