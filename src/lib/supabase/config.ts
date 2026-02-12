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

if (!parsed.success) {
    const errorDetails = JSON.stringify(parsed.error.format(), null, 4)
    console.error('❌ Invalid environment variables:', errorDetails)

    // In production or CI, we want to be very clear about why it failed
    if (process.env.NODE_ENV === 'production' && !process.env.CI) {
        throw new Error(`Critical environment variables missing. Details: ${errorDetails}`)
    }

    // In development, crash early
    if (process.env.NODE_ENV === 'development') {
        throw new Error('Supabase environment variables are not configured correctly. Check your .env.local file.')
    }
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
