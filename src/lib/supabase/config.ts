import { z } from 'zod'

// Validate environment variables using Zod
const envSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(), // Only required on server
    SUPABASE_URL: z.string().optional(), // Often same as NEXT_PUBLIC_SUPABASE_URL but for server side
})

// Process parsing - handle missing envs gracefully in build time but throw in runtime if critical
const processEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || (process.env.CI ? 'https://placeholder.supabase.co' : undefined),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (process.env.CI ? 'placeholder-key' : undefined),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || (process.env.CI ? 'https://placeholder.supabase.co' : undefined),
}

// Check if we are on the server
const isServer = typeof window === 'undefined'

// Parse and validate
const parsed = envSchema.safeParse(processEnv)

export const isSupabaseConfigured = parsed.success

if (!parsed.success && (processEnv.NEXT_PUBLIC_SUPABASE_URL || processEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    const errorDetails = JSON.stringify(parsed.error.format(), null, 4)
    console.error('❌ Invalid environment variables:', errorDetails)

    // In production or CI, we want to be very clear about why it failed
    // The Sites workspace has its own durable storage. Legacy Supabase routes
    // are gated by middleware until valid credentials are configured.
}

export const supabaseConfig = {
    url: processEnv.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: processEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: processEnv.SUPABASE_SERVICE_ROLE_KEY,
    internalUrl: processEnv.SUPABASE_URL,
}

// Helper to ensure service role key usage is safe
export function getServiceRoleKey() {
    if (!isServer) {
        throw new Error('Using service role key on the client is strictly forbidden')
    }
    if (!supabaseConfig.serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
    }
    return supabaseConfig.serviceRoleKey
}
