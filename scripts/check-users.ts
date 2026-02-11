
import { createAdminClient } from '@/lib/supabase/admin'

async function checkUsers() {
    const supabase = createAdminClient()
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error) {
        console.error('Error listing users:', error)
        return
    }

    console.log('Existing Auth Users:', users.users.length)
    users.users.forEach(u => console.log(`- ${u.email} (${u.id})`))

    const { data: profiles } = await supabase.from('profiles').select('*')
    console.log('\nExisting Profiles:', profiles?.length)
    profiles?.forEach(p => console.log(`- ${p.full_name} [${p.role}] (${p.id})`))
}

checkUsers()
