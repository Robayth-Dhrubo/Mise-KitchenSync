import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PosSystem from '@/components/pos/pos-system'

import { cn } from '@/lib/utils'

export default async function PosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: recipes } = await supabase
        .from('recipes')
        .select(`
            *,
            recipe_items (
                quantity_needed,
                unit_used,
                ingredient:ingredients (
                    name,
                    purchase_price,
                    purchase_unit,
                    current_stock,
                    conversion_ratio
                )
            )
        `)
        .eq('user_id', user.id)
        .order('name', { ascending: true })

    return (
        <div className="space-y-12 relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[140px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] -z-10" />

            <div className="space-y-1">
                <h1 className="text-5xl font-black text-white tracking-tighter font-display">Terminal.</h1>
                <p className="text-neutral-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Front of House Transaction Interface
                </p>
            </div>

            <PosSystem recipes={recipes || []} />
        </div>
    )
}
