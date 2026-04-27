# Mise - The Operating System for Profitable Kitchens

> Automate recipe costing, track inventory in real-time, and prevent profit loss due to ingredient price fluctuations.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-green?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss)

## 🍳 Features

- **Dynamic Recipe Costing** - Update ingredient prices once, all recipes recalculate automatically
- **Smart Unit Conversion** - Buy in bulk, cook with precision. Mise handles the math
- **86 Dashboard** - Real-time stock tracking to prevent out-of-stock during service
- **Live Cost Preview** - See profit margins update in real-time as you build recipes
- **Security First** - Comprehensive [security policy](./SECURITY.md) and server-side validation

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
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

Edit `.env.local` with your credentials:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Yes |
| `OPENAI_API_KEY` | For AI Invoice Scanning | Optional (Demo fallback) |
| `GOOGLE_PLACES_API_KEY` | For Vendor Discovery | Optional (Demo fallback) |
| `CRON_SECRET` | Bearer token for cron jobs | Yes (Production) |

### 4. Development & Quality

```bash
npm run dev        # Start dev server
npm run typecheck  # Run TypeScript valuation
npm run test       # Run unit tests
npm run lint       # Run ESLint validation
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19 |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS 4 + Shadcn/UI |
| Monitoring | Sentry (Optional) |
| Testing | Vitest + Playwright |

## 📊 Database Schema

- **profiles** - Restaurant settings per user
- **ingredients** - Pantry items with pricing and stock
- **recipes** - Menu items with target margins
- **recipe_items** - Ingredients used in each recipe

## 🎯 Key Calculations

The core "killer feature" is in `/lib/calculations.ts`:

```typescript
calculateRecipeCost(items, menuPrice) → {
  total_cost,
  gross_margin_dollars,
  food_cost_percentage,
  is_profitable,
  margin_status // 'excellent' | 'good' | 'warning' | 'danger'
}
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

## 📜 License

MIT License - See [LICENSE](LICENSE) for details.

---

Built with 🔪 by chefs, for chefs.
