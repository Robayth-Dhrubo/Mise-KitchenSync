import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service key to bypass RLS for this fix
const supabase = createClient(supabaseUrl, supabaseKey)

async function forceEnableRecipes() {
    console.log('Force enabling all recipes...')
    const { error } = await supabase
        .from('recipes')
        .update({ is_available: true })
        .not('is_available', 'eq', true) // Only update if not already true

    if (error) {
        console.error('Error enabling recipes:', error)
    } else {
        console.log('Successfully enabled recipes.')
    }
}

forceEnableRecipes()
