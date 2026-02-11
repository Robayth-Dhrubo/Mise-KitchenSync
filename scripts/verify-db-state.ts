
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local', override: true })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function finalizeSeed() {
    console.log('⚡️ Finalizing Seeding via Verify Script...')

    // 1. Chef
    console.log('Updating Chef...')
    const { error: chefError } = await supabase
        .from('profiles')
        .update({ full_name: 'Executive Chef' })
        .eq('email', 'chef@mise.local')

    if (chefError) console.error('Chef Error:', chefError)
    else console.log('✅ Chef Updated')

    // 2. Front Office
    console.log('Updating FO...')
    const { error: foError } = await supabase
        .from('profiles')
        .update({ full_name: 'Front Desk' })
        .eq('email', 'fo@mise.local')

    if (foError) console.error('FO Error:', foError)
    else console.log('✅ FO Updated')

    // 3. Admin (Fix name)
    console.log('Updating Admin...')
    const { error: adminError } = await supabase
        .from('profiles')
        .update({ full_name: 'Owner Admin' })
        .eq('email', 'admin@mise.local')

    if (adminError) console.error('Admin Error:', adminError)
    else console.log('✅ Admin Updated')
}

finalizeSeed()
