import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GuestMenu } from '@/components/guest/guest-menu'

export default async function MenuPage() {
    const supabase = await createClient()

    let recipes: any[] = []
    let userId = 'demo-user-id'

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            userId = user.id
            // Check role for access control
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            const hasAuthority = ['admin', 'owner', 'chef'].includes(profile?.role || '')

            // Fetch recipes with items for stock check
            // If admin/owner, fetch ALL recipes. If typical user, fetch OWN recipes.
            let query = supabase
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

            if (!hasAuthority) {
                query = query.eq('user_id', user.id)
            }

            const { data: rData } = await query.order('created_at', { ascending: false })
            if (rData) recipes = rData
        }
    } catch (e) {
        console.warn('Caught auth/db error in Menu page. Serving empty UI for presentation.', e)
    }

    return (
        <div className="relative min-h-screen">
            <GuestMenu
                recipes={recipes || []}
                room="ADMIN"
                hotelId={userId}
                isPreview={true}
            />
        </div>
    )
}
