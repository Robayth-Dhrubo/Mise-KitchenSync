# Integration backlog

The current product is an operational tool for an independent kitchen. The next
steps should remove work from a real service without making stock or money
harder to explain. Provider configuration and shared access need their own
release gates.

| Capability | Current position | Next acceptance gate |
| --- | --- | --- |
| Yield costing | Usable pack quantity, trim yield, batch yield and portion cost are implemented. | Check measured yields against repeated kitchen trials. |
| Unit conversions | Mass, explicit US/Imperial volumes, pieces, packs and optional density are implemented. | Validate the actual supplier pack catalogue; do not guess variable case contents. |
| Station prep | Targets and dated ready counts produce prep drafts. | Observe a service and test overlapping prep ownership. |
| Offline inventory | Device drafts work on a page opened while connected. | Test device suspension and reconnection; define a separate service-worker/cache release for offline launch. |
| PMIX depletion | Reviewed CSV snapshots can post eligible recipe usage once. | Connect one chosen POS with stable merchant/location/item identifiers and verified events. |
| Variance | Physical counts, receipts, recipe usage and logged waste can be compared. | Validate a complete operating week, including every sales channel and stock movement. |
| Ordering | Transparent average-use scenarios create purchase drafts. | Compare suggestions with actual demand; add supplier lead times and dated incoming deliveries. |
| Invoice extraction | Original files and reviewed inventory CSV imports are available; OCR is not connected. | Select a provider, approve its data handling and validate extracted lines before a price or receipt change. |
| Live 86 status | Not implemented in the hosted workspace. | Build venue-scoped availability, explicit manager override and tested reconnect/stale-state behavior. |
| Shared teams and multiple locations | Owner isolation and a location key exist; team membership and location administration do not. | Enforce organisation membership, location permissions and server-side authorization before opening shared access. |

## Iteration 1: prove the operating loop

Run one complete week with the operator. Keep opening and closing counts,
reviewed sales and receipts aligned to service days. Compare observed count time
and correction work with the previous process. Resolve mapping errors and
confusing terms before adding another integration.

## Iteration 2: one POS connection

Choose the system the pilot restaurant actually uses. Define a provider adapter
that normalizes external item IDs, quantities, service dates, modifiers, refunds
and voids into a staging area. A webhook endpoint verifies the provider’s
documented authenticity mechanism and records external event IDs before
acknowledging delivery. The private Site needs a separately secured provider
ingress, as with the existing billing relay design.

The adapter must not call the general workspace PUT with a guessed balance.
Queue deliveries, reconcile them against a stable merchant and location, review
recipe mappings and use an atomic posting path. Replay the same webhook, deliver
events out of order, retry after a timeout, test late refunds and recover a
missing delivery. Historical imports go to reconciliation when physical counts
already include them. Keep failed imports visible for review.

## Iteration 3: invoice review

Store the original document privately. Extraction produces suggestions, not
confirmed costs or stock receipts. Show the source line beside the matched
ingredient, pack quantity, units, currency, price and tax/freight treatment.
Require a person to resolve uncertain matches and distinguish a price update
from receiving a delivery. Use supplier/document identifiers and a content hash
to detect duplicates. Test credits, split packs, repeated scans and corrected
invoices before enabling live updates.

## Iteration 4: shared service

Add organisation, membership, location and explicit permission records. Start
with owner, manager and station roles, and authorize each server action against
the requested location. Staff roster rows remain separate from login identities.
Test invitations, revocation, transfers between locations and cross-tenant
requests before shared work is available.

Only then add live availability updates. Stock alone cannot determine whether a
dish is available: prep, equipment and a manager’s override also matter. Show
when availability was last confirmed, avoid presenting cached state as live,
and preserve an audit record for each change.

## Commercial gate

Treat these as separate releases with observed acceptance results. Do not sell
unconnected OCR, live POS sync, multi-location permissions or payroll processing
as included features. Configure customer access and verify billing end to end
before taking subscriptions. Price the product using measured operating value
and support costs, not a promise to replace an enterprise HR system.
