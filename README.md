# Mise - The Operating System for Profitable Kitchens

> Automate recipe costing, track inventory in real-time, and prevent profit loss due to ingredient price fluctuations.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-green?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss)

## 🍳 Features

- **Dynamic Recipe Costing** - Update ingredient prices once, all recipes recalculate automatically
- **Smart Unit Conversion** - Buy in bulk, cook with precision. Mise handles the math
- **86 Dashboard** - Real-time stock tracking to prevent out-of-stock during service
- **Live Cost Preview** - See profit margins update in real-time as you build recipes
- **Beautiful Dark UI** - Designed for kitchen environments with high contrast and large touch targets

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
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

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key # Required for admin features
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Seed local development data (optional)

If you want to auto-provision a room/location and sample recipes for local development, run:

```bash
# using ts-node (already a dev dependency)
npx ts-node scripts/seed-dev.ts "Local Room"

# or, if you added an npm script, use:
# npm run seed:dev -- "Local Room"
```

Note: The app will only auto-provision from the guest page when `NODE_ENV==='development'` and your Supabase URL points to localhost. Alternatively, run the script directly to seed data.

## 📁 Project Structure

```
/src
├── app
│   ├── (auth)            # Login/Signup pages
│   ├── (dashboard)       # Protected dashboard routes
│   │   ├── dashboard     # Main analytics dashboard
│   │   ├── pantry        # Ingredient management
│   │   ├── menu          # Recipe creation & costing
│   │   ├── inventory     # Stock tracking
│   │   └── settings      # Profile & preferences
│   ├── layout.tsx        # Root layout with providers
│   └── page.tsx          # Landing page
├── components
│   └── ui                # Shadcn UI components
├── lib
│   ├── calculations.ts   # Core costing algorithms
│   ├── validations.ts    # Zod schemas
│   ├── types/            # TypeScript types
│   ├── providers/        # React Query provider
│   └── supabase/         # Supabase client setup
└── middleware.ts         # Auth protection
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS + Shadcn/UI |
| State | TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |

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
