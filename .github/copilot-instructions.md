# Mise KitchenSync Copilot Instructions

As an AI assistant working on Mise KitchenSync, adhere to these guidelines to maintain project security and stability.

## Core Principles

1.  **Security First**:
    - Never suggest hardcoding API keys or secrets.
    - Always use `src/lib/supabase/config.ts` for environment variable access.
    - Strictly separate client-side (`createClient`) and server-side (`createAdminClient`) Supabase usage.

2.  **Type Safety**:
    - Avoid `any` types. Prefer specific database types from `@/lib/types/database`.
    - Always type-check props and function arguments.

3.  **Dynamic Costing**:
    - When modifying recipe or ingredient logic, ensure you don't break the `calculateRecipeCost` or `isRecipeInStock` logic in `@/lib/calculations.ts`.
    - Always consider unit conversions and yield factors.

4.  **Premium UX**:
    - Maintain the "Run Your Kitchen Like a Machine" aesthetic.
    - Use Lucide icons consistently.
    - Prefer `sonner` for toast notifications and `Card` components for data display.

## Common Patterns

- **Supabase Hooks**: Use the provided wrappers in `@/lib/supabase/` instead of raw `@supabase/supabase-js`.
- **Modals**: Use the standard Radix-based `Dialog` components.
- **Data Fetching**: Use parallel promises for dashboard metrics to improve performance.
