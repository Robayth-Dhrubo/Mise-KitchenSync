# Mise KitchenSync

A web app for the day-to-day work behind a restaurant kitchen: supplier prices,
recipe costs, menu sales, prep, purchasing and staff planning.

[![CI](https://github.com/Robayth-Dhrubo/Mise-KitchenSync/actions/workflows/ci.yml/badge.svg)](https://github.com/Robayth-Dhrubo/Mise-KitchenSync/actions/workflows/ci.yml)

## What it does

- Records purchase packs, invoice prices, usable yields, stock counts and pars.
- Converts purchasing and recipe units, with explicit US/Imperial volumes and optional measured density.
- Saves stock-count drafts on the device, queues them offline and reviews conflicts after reconnecting.
- Calculates recipe and portion costs, food-cost percentages and contribution.
- Builds dated prep tasks from station targets and freshly counted ready portions.
- Creates purchase drafts from stock shortfalls and records received deliveries.
- Stores supplier contacts, waste entries and a menu-launch checklist.
- Compares reviewed sales snapshots with current recipe costs and tests prices.
- Previews recipe usage, posts eligible sales once and compares counted usage with recipes and waste.
- Suggests purchase drafts from average sales demand, counted stock, pars and open orders.
- Keeps inventory events separate from editable kitchen records, with paged history and exports.
- Plans Sunday–Saturday shifts and exports approved worked hours.
- Keeps opening and closing checklists separate for each service date.
- Models annual staffing costs and monthly break-even sales.
- Includes guided setup, searchable help and explanations beside each workflow.

Missing prices, counts and recipe quantities stay marked as missing. The app does
not turn an unknown value into zero. Recipe contribution excludes labour,
overhead and tax; it is not restaurant profit.

## Try it

`/demo` opens an example kitchen. Changes stay in that browser session and do not
touch a live account. `/product` explains the tools and includes a plate-cost
calculator.

The hosted workspace at `/` is currently private and uses ChatGPT sign-in. Each
account has its own records. Adding a staff record does not create a login.
Shared team workspaces and automatic POS sync are
not part of this version.

For offline counting, open the app and start the count while connected. Keep the
page open in the walk-in, then reconnect to sync. Launching the app from a closed
browser without a connection is not supported.

## Run locally

Use Node.js 22.13 or newer.

```sh
git clone https://github.com/Robayth-Dhrubo/Mise-KitchenSync.git
cd Mise-KitchenSync
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run dev
```

Open `/demo` on the local server to try the interface. The live workspace also
needs the hosted identity headers and Cloudflare D1/R2 bindings; cloning the
repository does not download kitchen records or production credentials.

The Puppeteer setting skips a browser download used by the documentation's
diagram tools. The browser is not needed to run the kitchen app.

## Development

The current app uses React, TypeScript and Vinext on Cloudflare Workers. D1 stores
kitchen snapshots and inventory events; R2 stores imported files. Database changes
are append-only in `drizzle/`. The inventory event table uses authenticated owner
and location keys. The current interface supports one location per account.

```sh
npm run typecheck
npm run test
npm run lint
npm run build
```

The private import-package check runs only when `FABERGE_IMPORT_PACKAGE` points
to a local fixture. That file is kept outside this repository.

The older Next.js/Supabase POS and integration modules remain in source. They
need their own configuration and are separate from the current hosted workspace.
`npm run dev:next` and `npm run build:next` retain the original Next.js commands.

## Billing

Stripe Checkout, the customer portal and signed subscription webhooks are
implemented. Payments remain disabled until merchant credentials, a recurring
price and webhook delivery are configured and tested.

The webhook receiver in `workers/stripe-relay` is separate from the private
kitchen and has not been deployed. See its [setup notes](workers/stripe-relay/README.md)
and the [release guide](docs/commercial-release.md) before enabling payments.

## Documentation

- [Current release and acceptance checks](docs/product-release-0.4.md)
- [Architecture](docs/architecture.md)
- [Integration backlog](docs/integration-roadmap.md)
- [Kitchen setup, calculations and backups](docs/sites-workspace.md)
- [Billing setup and release requirements](docs/commercial-release.md)
- [Webhook receiver](workers/stripe-relay/README.md)
- [Security](SECURITY.md)

Kitchen files, backups and credentials belong in private storage, not in Git.

## License

[MIT](LICENSE).
