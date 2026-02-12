# Contributing to Mise-KitchenSync

Welcome! This guide will help you get started with development and ensure your contributions meet our standards.

## 🛠 Prerequisites

- Node.js 20.x
- A Supabase account and project
- OpenAI API Key (for invoice processing)
- Google Places API Key (for vendor discovery)

## 🚀 Development Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Robayth-Dhrubo/Mise-KitchenSync.git
    cd Mise-KitchenSync
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure environment variables**:
    Copy `.env.local.example` to `.env.local` and fill in your keys.
    ```bash
    cp .env.local.example .env.local
    ```

4.  **Seed your local database**:
    ```bash
    npm run run-script scripts/seed-dev.ts
    ```

5.  **Run the development server**:
    ```bash
    npm run dev
    ```

## 🧪 Quality Standards

We maintain high standards through automated checks. Before submitting a PR, ensure:

- **Typecheck**: `npm run typecheck` passes.
- **Lint**: `npm run lint` passes (no errors).
- **Tests**: `npm run test` passes.
- **Build**: `npm run build` passes.

## 📝 Pull Request Checklist

- [ ] I have followed the environment configuration guide.
- [ ] I have run local tests and they pass.
- [ ] I have updated documentation for any new features.
- [ ] I have handled secrets safely (no keys committed).

## 🔒 Security Policy

- **NEVER** commit secrets. Use `.env.local` for local development.
- Service Role keys must **ONLY** be used on the server via `src/lib/supabase/admin.ts`.
- All webhooks must validate the `POS_API_KEY`.
