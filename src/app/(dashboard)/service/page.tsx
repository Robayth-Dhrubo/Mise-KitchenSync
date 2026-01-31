import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ServiceLogger } from '@/components/service/service-logger'

export default async function ServicePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: recipes } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

    return (
        <div className="container mx-auto max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight">Service Logger</h1>
                <p className="text-neutral-400 mt-2">Log your sales to automatically deduct inventory.</p>
            </div>

            <ServiceLogger recipes={recipes || []} />
        </div>
    )
}
