
import { createAdminClient } from '../../src/lib/supabase/admin'

async function checkUsers() {
    const supabase = createAdminClient()
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error) {
        console.error('Error listing users:', error)
        return
    }

    console.log('Existing Auth Users:', users.users.length)
    users.users.forEach((u: any) => console.log(`- ${u.email} (${u.id})`))

    const { data: profiles } = await supabase.from('profiles').select('*')
    console.log('\nExisting Profiles:', profiles?.length)
    profiles?.forEach((p: any) => console.log(`- ${p.name || 'No Name'} [${p.role}] (${p.id})`))
}

checkUsers()
