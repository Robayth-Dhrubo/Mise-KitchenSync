import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GuestMenu } from '@/components/guest/guest-menu'

export default async function MenuPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Check role for access control
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'

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

    if (!isAdmin) {
        query = query.eq('user_id', user.id)
    }

    const { data: recipes } = await query.order('created_at', { ascending: false })

    return (
        <div className="relative min-h-screen">
            <GuestMenu
                recipes={recipes || []}
                room="ADMIN"
                hotelId={user.id}
                isPreview={true}
            />
        </div>
    )
}
