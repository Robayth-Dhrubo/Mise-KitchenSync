# KitchenSync workspace

This workspace builds on Mise-KitchenSync and is hosted as a private Site. It uses ChatGPT sign-in and owner-scoped D1 records, without requiring Supabase keys to use the new workspace. The original Supabase POS, guest, and integration modules remain in source and are separately configured.

## First use

1. In Settings, set the kitchen name and food-cost target. The initial 30% is an editable planning target, not an industry claim.
2. Add suppliers, then inventory. Enter the cost of the whole purchase pack and the amount it contains in grams, millilitres, or individual pieces. For example, a 5 kg bag contains 5,000 g.
3. Record available usable stock and target usable stock (par). Leave unknown counts blank; zero means no stock.
4. Cost recipe quantities for the whole batch and enter how many portions the batch produces. Selling prices are before sales tax.
5. Assign prep tasks to stations and people. Today's view includes unfinished overdue tasks.
6. Build purchase drafts from stock shortfalls. Open orders are excluded from duplicate suggestions. Export the order and send it to the supplier yourself. Mark it ordered; confirm a full delivery only after it arrives. Receiving updates stock once, using the usable pack quantity recorded on the draft.
7. Record waste beyond losses already included in usable yield. Waste cannot exceed counted stock. The log stores the ingredient cost when the entry was created.

The optional sample kitchen is explicitly labelled and uses illustrative prices and quantities. Loading samples or restoring backups requires an in-app review because these actions replace current records.

## Calculations

| Result | Formula |
| --- | --- |
| Usable unit cost | Pack price / (pack quantity × yield percentage / 100) |
| Batch cost | Sum of converted batch quantities × usable unit cost |
| Portion cost | Batch cost / portions produced |
| Food cost percentage | Portion cost / selling price × 100 |
| Contribution per portion | Selling price − ingredient cost |
| Price at target | Portion cost / (target percentage / 100) |
| Order packs | Round up max(0, par − stock) / usable quantity per purchase pack |

Contribution excludes labour, overhead, delivery costs, and taxes. It is not net restaurant profit. Menu averages are simple averages of fully costed recipes and are not weighted by sales. Unpriced stock and waste are excluded from displayed dollar totals and their missing pricing is flagged. Missing recipe inputs produce an incomplete result; incompatible weight-to-volume units cannot silently convert without a density.

## CSV and backups

Inventory accepts the CSV template downloadable from the Inventory page. Use numeric values without currency signs or thousands separators. Use `g`, `ml`, or `each` as base units. Matching ingredient names update existing records while preserving IDs; new names create records. Add suppliers before importing ingredients that reference their names. The importer validates the whole file before saving and does not change base units on existing ingredients. All table views export CSV; spreadsheet formula-like text is escaped.

Settings downloads a complete JSON backup. Restoring validates its version, record IDs, dates, relationships, and quantities before showing a replacement confirmation. Download a current backup before restoring, clearing records, or loading samples.

## Storage and concurrency

The schema is in `db/schema.ts`; the schema-only migration is in `drizzle/`. Sites applies the hosted migration during publication. Every request to `/api/workspace` verifies the authenticated user and scopes the database query to their user ID. Updates compare the saved revision atomically. A conflicting save is rejected instead of overwriting another tab or device. On a conflict, use Reload kitchen and retry the edit. A failed load does not enable editing of an invented empty workspace. The app never saves example data automatically on startup.

## Development and validation

Use Node 22.13 or newer. Install dependencies with `PUPPETEER_SKIP_DOWNLOAD=1` because the documentation diagram tooling has a Puppeteer dependency; Sites does not install or launch Chromium. Follow the Sites skill for runtime setup, builds, source packaging, and private publication. The build uses the vendored `sites()` integration and declares `DB` in `.openai/hosting.json`.

`npm run test` checks costing, units, incomplete inputs, purchasing, receipt idempotency, waste, import validation, and UI save-failure behavior, together with the original tests. `npm run typecheck` checks the project. `npm run build` creates the Worker and client assets. Browser QA was unavailable in the authoring environment and was not run.

Source was cloned from GitHub and saved to the Site's own source repository. This does not configure automatic two-way GitHub synchronization or change the original GitHub branch.
# Fabergé source import

The private workspace includes a Library-file import with editable purchasing
products, draft recipes and undated prep templates. Sales history, staffing,
payroll and original-file views are separate from current stock and recipe costs.
Source formulas are retained as text with their cached values; they are not
executed in the app. Original files remain byte-for-byte downloads in private R2.

`scripts/import-faberge.py` builds a package outside the checkout from downloaded
sources and a source manifest. `scripts/upload-faberge.py` receives Site service
access and the import key through hidden stdin, checks every asset checksum and
then commits against the live workspace revision. It can safely resume uploads.
The same batch ID is idempotent. Existing user records and settings are kept,
and imported relationships are mapped to their existing IDs where names match.

The import endpoint requires the runtime secrets `FABERGE_IMPORT_KEY` and
`FABERGE_OWNER_ID`; neither is present in source or browser bundles. Its owner
target comes from the Site's existing owner-scoped workspace row. Reader routes
require ChatGPT identity and only expose imports owned by that identity.

Inventory counts and pars are unknown until entered. Recipe trial yields and
historical menu costs keep their source labels. POS report controls are separate
and never added together. The roster uses work days for the salaried chef and
hours for hourly staff. The separately listed Management payroll column is not
added to the owner's reported total.


## Menu sales, staffing and service routines

Version 0.3 adds an optional `operations` object to the existing version-1 kitchen
backup. Older backups still load. It contains employees, dated shifts, weekly
assumptions, separate sales snapshots, routine templates and dated completion
records. Existing owner scoping, billing access checks and revision protection
apply to the entire save. No database migration or live data backfill is needed.

The sales CSV template uses `item,quantity,net_sales_cad`. Imports are previewed
before saving and each sold item is explicitly linked to a recipe. Current
ingredient costs are applied to recorded sales; this is an estimate of ingredient
contribution, not a historical cost-of-sales or net-profit report. Snapshots are
analysed separately. Missing sold-item costs keep the total incomplete.

The Staff planner uses Sunday–Saturday weeks and local clock hours. Hourly rates
are copied onto shifts, so employee-rate edits do not rewrite existing wages.
Overlaps are rejected across overnight boundaries. Manager-entered actual hours
are separate from planned hours; only approved records are included in the
approved-hours export. Salary and employer-cost scenarios stay in Labour & budget.

Service routines are editable. Completion records keep their service date, time,
recorded name and original wording. Changing a previously completed action creates
a new routine item and retains the old one in history.

Get started shows input-based setup progress. Help & guides and `/help` explain
the workflows; the top bar offers contextual help and Ctrl/Cmd+K page search.
