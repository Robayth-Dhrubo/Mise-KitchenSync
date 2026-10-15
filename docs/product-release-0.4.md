# Mise KitchenSync 0.4

This release connects physical counts, recipe usage, station prep and purchase
planning. The target user is the owner or kitchen manager who needs to explain a
stock difference and decide what to prepare or buy next. The hosted app remains
a private pilot.

## What changed

Stock control brings six related tasks into one workspace: counts, station prep,
sales usage, variance, forecasts and history. The existing forest and cream
design, labelled controls, empty states and contextual help carry through.

| Story | Done when | Verification |
| --- | --- | --- |
| Count in a walk-in with poor Wi-Fi | An account-specific draft keeps measured values; zero is counted and blank is untouched; reconnect queues one attempt; retries keep their ID. | Interaction and domain tests |
| Keep newer stock changes | A stale revision cannot overwrite stock; measured values survive a conflict; review creates a new draft and ID. | SQLite concurrency and interface tests |
| Buy in the supplier’s units | Purchase weights and volumes normalize to base units; US and Imperial volumes differ; cross-dimension conversions require explicit density. | Conversion and editor tests |
| Give each station a prep target | Only dated ready counts generate a shortfall; repeated drafts do not duplicate the same station/recipe/day task; raw inventory is untouched. | Domain and interface tests |
| Deduct a reviewed PMIX once | All sold items have quantity mappings; a dated physical baseline precedes sales; later counts and overlapping postings block depletion; stock and immutable usage save together. | Domain and SQLite API tests |
| Explain a physical variance | Exact sales dates fit opening/closing counts; receipts and logged waste are separate; missing inputs stay unknown; historical prices and posted quantities remain snapshots. | Reconciliation and interface tests |
| Draft an order from demand | Average daily recipe demand, cover days and multiplier are visible; stock and open orders reduce the need; purchases round up to usable packs and remain drafts. | Forecast tests |
| Keep account history private | Authenticated owner controls every query; an account marker blocks old tabs after a sign-in change; event pagination has a stable tie-break; failed inserts roll back stock. | Real SQLite API tests |
| Update invoice prices safely | Absent optional CSV columns preserve stock and other metadata; explicit blanks remain explicit; changed source prices require review. | Import tests |

Six new contextual guides explain the workflows. The full help centre contains
23 guides. Example counts, sales, receipts and variance in the demo are fictional
and stay separate from the private kitchen.

## Data and recovery

Migration `0004` creates `inventory_events` and adds a nullable transaction token
to `kitchen_workspaces`. It does not rewrite existing kitchen data or invent
earlier inventory history. Events use owner and location keys; the API selects
the authenticated owner and fixed primary location, never a supplied owner ID.

Stock saves compare the current revision. Event-bearing writes use a D1 batch:
the conditional snapshot update and event insert either commit together or roll
back. A per-save token prevents a losing writer from inserting a false event.
Count and PMIX request IDs support safe retries. A separate report reference
prevents posting the same sales snapshot under a new request ID.

Settings backs up current kitchen records. Event history is a separate export;
load all older pages before exporting a complete history. Restoring a kitchen
backup does not delete or import the native ledger. Restore changes are marked
for review rather than reclassified as new physical receipts. Device count
exports are review copies, not importable replacement kitchen backups.

## Verification and limits

Run typecheck, the full test suite, lint and the Sites production build before
private deployment. CI repeats the repository checks. Tests cover reconnects,
storage failure, account separation, duplicate requests, simultaneous writers,
rollback and unsafe historical depletion.

Signed-in desktop/mobile browser QA still needs to be performed in a supported
browser environment. DOM interaction tests do not verify visual rendering,
device background suspension or a real loss of Wi-Fi. The app must be opened
while connected and kept open for offline entry; this is not an offline-launch
PWA.

The sales forecast is an average-use scenario, not a trained demand model. It
does not know weather, holidays, closures or delivery arrival times. Recipe
usage depends on reviewed portion yields, modifiers and complete sales coverage.
A variance is not proof of waste or theft. Transfers, returns, count mistakes and
unrecorded movements must be investigated.

Current snapshots remain capped at 2 MB. History loads 25 events per page;
server reconciliation rejects intervals above 2,000 movement/usage events or
4 MB of payload. PMIX eligibility examines the latest 25 physical count events
and asks for a new baseline when an ingredient has none in that window.

## Next iteration

Pilot the complete loop: opening count, received delivery, reviewed sales,
closing count, variance and next order. Record time spent, corrections and
unresolved inputs. Use those observations to prioritise the
[integration backlog](integration-roadmap.md). Billing and customer access still
need the separate [commercial activation checks](commercial-release.md).
