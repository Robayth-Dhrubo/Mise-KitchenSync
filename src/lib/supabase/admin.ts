import { createClient } from '@supabase/supabase-js'
import { supabaseConfig, getServiceRoleKey } from './config'

export function createAdminClient() {
    return createClient(
        supabaseConfig.url,
        getServiceRoleKey(),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
