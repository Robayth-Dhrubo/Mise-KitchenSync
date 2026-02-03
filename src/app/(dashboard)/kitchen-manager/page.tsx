import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KitchenHub } from '@/components/kitchen/kitchen-hub'

export default async function KitchenPage() {
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

    const hasAuthority = ['admin', 'owner', 'chef'].includes(profile?.role || '')

    // Fetch active orders for Kitchen Display
    const { data: initialOrders } = await supabase
        .from('orders')
        .select('*, order_items(*, recipe:recipes(name))')
        .eq('status', 'paid')
        .neq('preparation_status', 'delivered')
        .order('created_at', { ascending: true })

    // Fetch recipes for Menu
    let recipesQuery = supabase
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
        recipesQuery = recipesQuery.eq('user_id', user.id)
    }

    const { data: recipes } = await recipesQuery.order('created_at', { ascending: false })

    return (
        <div className="p-6 h-screen flex flex-col">
            <KitchenHub
                initialOrders={initialOrders || []}
                recipes={recipes || []}
                userId={user.id}
            />
        </div>
    )
}
