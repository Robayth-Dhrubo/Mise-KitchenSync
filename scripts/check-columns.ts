
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkCols() {
    console.log('🔍 Checking Profile Columns...')
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

    if (error) console.log('Error:', error)
    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]))
    }
}
checkCols()
