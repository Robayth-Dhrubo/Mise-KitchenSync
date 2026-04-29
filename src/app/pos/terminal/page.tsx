import { createClient } from '@/lib/supabase/server'
import PosSystem from '@/components/pos/pos-system'

export const dynamic = 'force-dynamic'

export default async function TerminalPage({ searchParams }: { searchParams: Promise<{ location_id?: string }> }) {
    const supabase = await createClient()
    const { location_id } = await searchParams

    let recipes: any[] = []
    let locationData: any = null

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from('recipes')
                .select('*, recipe_items(*, ingredient:ingredients(*))')
                .order('name')
            if (data) recipes = data

            if (location_id) {
                const { data: loc } = await supabase
                    .from('locations')
                    .select('*')
                    .eq('id', location_id)
                    .single()
                if (loc) locationData = loc
            }
        }
    } catch (e) {
        console.warn('Caught auth/db error in POS Terminal. Serving bypass empty arrays.', e)
    }

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <PosSystem recipes={recipes || []} initialLocation={locationData} />
        </div>
    )
}
