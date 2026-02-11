import { createClient } from '@/lib/supabase/server'
import PosSystem from '@/components/pos/pos-system'

export const dynamic = 'force-dynamic'

export default async function TerminalPage({ searchParams }: { searchParams: Promise<{ location_id?: string }> }) {
    const supabase = await createClient()
    const { location_id } = await searchParams

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <div>Unauthorized</div>

    const { data: recipes } = await supabase
        .from('recipes')
        .select('*, recipe_items(*, ingredient:ingredients(*))')
        .order('name')

    let locationData = null
    if (location_id) {
        const { data } = await supabase
            .from('locations')
            .select('*')
            .eq('id', location_id)
            .single()
        locationData = data
    }

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <PosSystem recipes={recipes || []} initialLocation={locationData} />
        </div>
    )
}
