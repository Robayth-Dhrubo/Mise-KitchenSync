import { createClient } from '@/lib/supabase/server'
import PosSystem from '@/components/pos/pos-system'

export const dynamic = 'force-dynamic'

export default async function TerminalPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <div>Unauthorized</div>

    const { data: recipes } = await supabase
        .from('recipes')
        .select('*, recipe_items(*, ingredient:ingredients(*))')
        .order('name')

    return (
        <div className="p-4 sm:p-8 h-full overflow-hidden flex flex-col">
            <PosSystem recipes={recipes || []} />
        </div>
    )
}
