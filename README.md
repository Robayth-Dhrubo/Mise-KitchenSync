# Mise — The Operating System for Profitable Kitchens

> Automate recipe costing, track inventory in real-time, and prevent profit loss due to ingredient price fluctuations.

[![CI](https://github.com/Robayth-Dhrubo/Mise-KitchenSync/actions/workflows/ci.yml/badge.svg)](https://github.com/Robayth-Dhrubo/Mise-KitchenSync/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss)

---

## 🍳 Features

### Core Operations
- **Dynamic Recipe Costing** — Update ingredient prices once, all recipes recalculate automatically
- **Smart Unit Conversion** — Buy in bulk, cook with precision. Mise handles the math
- **86 Dashboard** — Real-time stock tracking to prevent out-of-stock during service
- **Live Cost Preview** — See profit margins update in real-time as you build recipes
- **Margin Guard** — Financial analytics dashboard tracking profitability across your menu

### Point of Sale & Front-of-House
- **Floor Map Command Center** — Drag-and-drop restaurant layout with live table status
- **POS Terminal** — Full order management with location-based service
- **In-Room Dining (IRD)** — Hotel-style room service with guest-facing menu
- **Reservation System** — Table booking with pre-order support
- **Kitchen Display System** — Real-time order display for back-of-house

### Intelligence & Automation
- **AI Invoice Scanner** — Upload paper invoices, OpenAI Vision extracts items and updates inventory automatically
- **Smart Ordering** — Procurement suggestions based on par levels and consumption trends
- **Vendor Discovery** — Google Places-powered local vendor search with comparison
- **Nightly Price Scraper** — Automated ingredient price monitoring via cron job

### Integrations
- **Square POS** — Bidirectional menu and order sync
- **Toast POS** — Menu import and order webhook processing
- **QuickBooks** — Financial data sync for accounting

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- Supabase Account

### 1. Clone & Install

```bash
git clone https://github.com/Robayth-Dhrubo/Mise-KitchenSync.git
cd Mise-KitchenSync
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from Settings → API

### 3. Configure Environment

Create a `.env.local` file with the following:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-level Supabase key | ✅ Production |
| `OPENAI_API_KEY` | For AI Invoice Scanning | Optional (demo fallback) |
| `GOOGLE_PLACES_API_KEY` | For Vendor Discovery | Optional (demo fallback) |
| `CRON_SECRET` | Bearer token for cron jobs | ✅ Production |
| `SENTRY_DSN` | Error monitoring endpoint | Optional |

> **Note:** When `OPENAI_API_KEY` or `GOOGLE_PLACES_API_KEY` are missing, the app falls back to mock data with a visible UI indicator — this is by design for safe local development.

### 4. Run

```bash
npm run dev        # Start dev server at http://localhost:3000
npm run typecheck  # TypeScript validation
npm run test       # Unit tests (Vitest)
npm run lint       # ESLint
npm run build      # Production build
```

### 5. Seed Development Data (Optional)

```bash
npx ts-node scripts/seed-dev.ts "Local Room"
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login & Signup
│   ├── (dashboard)/         # Protected routes
│   │   ├── dashboard/       # Main analytics hub
│   │   ├── menu/            # Recipe creation & costing
│   │   ├── recipes/         # Recipe management
│   │   ├── inventory/       # Stock tracking & AI scanner
│   │   ├── kitchen-manager/ # Kitchen display system
│   │   ├── finance/         # Margin guard analytics
│   │   ├── integrations/    # Square, Toast, QuickBooks
│   │   ├── service-desk/    # Support interface
│   │   ├── settings/        # Profile & preferences
│   │   └── weekly-schedule/ # Staff scheduling
│   ├── pos/                 # Point of Sale
│   │   ├── terminal/        # Order terminal
│   │   ├── ird/             # In-room dining
│   │   ├── reservations/    # Booking system
│   │   └── ledger/          # Transaction history
│   ├── guest/               # Public guest menu
│   ├── smart-order/         # Procurement suggestions
│   ├── api/                 # API routes
│   │   ├── cron/            # Nightly price scraper
│   │   ├── webhooks/        # POS order webhooks
│   │   └── integrations/    # Square, Toast, QuickBooks
│   └── actions/             # Server actions
├── components/
│   ├── ui/                  # Shadcn/UI components
│   ├── pos/                 # Floor map, terminal
│   ├── procurement/         # Invoice scanner, vendor list
│   └── recipes/             # Recipe builder, cost cards
├── lib/
│   ├── calculations.ts      # Core costing engine
│   ├── supabase/            # DB clients (client, server, admin)
│   ├── scraper/             # Price scraping engine
│   ├── monitoring/          # Sentry error tracking
│   ├── types/               # TypeScript definitions
│   └── validations.ts       # Zod schemas
└── middleware.ts             # Auth protection
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19 |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth (SSR) |
| Styling | Tailwind CSS 4 + Shadcn/UI |
| State | TanStack Query + React Hook Form |
| Charts | Recharts |
| AI | OpenAI SDK (Vision API) |
| Monitoring | Sentry (optional) |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions |
| Deployment | Vercel |

---

## 📊 Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | Restaurant settings per user |
| `ingredients` | Pantry items with pricing, stock, and par levels |
| `recipes` | Menu items with target margins |
| `recipe_items` | Ingredients used in each recipe |
| `suppliers` | Vendor directory with contact info |
| `vendor_products` | Product-vendor-ingredient mapping with prices |
| `locations` | Restaurant floor layout (tables, rooms, zones) |
| `orders` | POS orders with pre-order and scheduling |
| `reservations` | Table bookings with time slots |

---

## 🎯 Core Costing Engine

The heart of Mise lives in `src/lib/calculations.ts`:

```typescript
calculateRecipeCost(items, menuPrice) → {
  total_cost,
  gross_margin_dollars,
  food_cost_percentage,
  is_profitable,
  margin_status // 'excellent' | 'good' | 'warning' | 'danger'
}
```

Every ingredient price change cascades through all recipes in real-time, giving operators instant visibility into margin impact.

---

## 🔒 Security

See [SECURITY.md](./SECURITY.md) for our vulnerability disclosure policy, secret management practices, and mock-data transparency guidelines.

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables from the table above
4. Deploy!

### CI/CD

Every push to `main` triggers the GitHub Actions pipeline:
- TypeScript compilation check
- Unit tests (Vitest)
- ESLint validation
- Production build verification

---

## 📜 License

MIT License — See [LICENSE](LICENSE) for details.

---

Built with 🔪 by chefs, for chefs.
