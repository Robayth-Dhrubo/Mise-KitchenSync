# Mise KitchenSync

A web app for the day-to-day work behind a restaurant kitchen: supplier prices,
recipe costs, prep, purchasing and staffing budgets.

[![CI](https://github.com/Robayth-Dhrubo/Mise-KitchenSync/actions/workflows/ci.yml/badge.svg)](https://github.com/Robayth-Dhrubo/Mise-KitchenSync/actions/workflows/ci.yml)

## What it does

- Records purchase packs, invoice prices, usable yields, stock counts and pars.
- Calculates recipe and portion costs, food-cost percentages and contribution.
- Organises prep by station, person, quantity and date.
- Creates purchase drafts from stock shortfalls and records received deliveries.
- Stores supplier contacts, waste entries and a menu-launch checklist.
- Models annual staffing costs and monthly break-even sales.

Missing prices, counts and recipe quantities stay marked as missing. The app does
not turn an unknown value into zero. Recipe contribution excludes labour,
overhead and tax; it is not restaurant profit.

## Try it

`/demo` opens an example kitchen. Changes stay in that browser session and do not
touch a live account. `/product` explains the tools and includes a plate-cost
calculator.

The hosted workspace at `/` is currently private and uses ChatGPT sign-in. Each
account has its own records. Shared team workspaces and automatic POS sync are
not part of this version.

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
kitchen records and R2 stores imported files. Database changes are in `drizzle/`.

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

- [Kitchen setup, calculations and backups](docs/sites-workspace.md)
- [Billing setup and release requirements](docs/commercial-release.md)
- [Webhook receiver](workers/stripe-relay/README.md)
- [Security](SECURITY.md)

Kitchen files, backups and credentials belong in private storage, not in Git.

## License

[MIT](LICENSE).
