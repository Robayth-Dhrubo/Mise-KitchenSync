import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KitchenHub } from '@/components/kitchen/kitchen-hub'

export default async function KitchenPage() {
    const supabase = await createClient()

    let profile: any = { role: 'admin' }
    let initialOrders: any[] = []
    let recipes: any[] = []
    let userId = 'demo-user-id'

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            userId = user.id

            // Check role for access control
            const { data: fetchProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            if (fetchProfile) profile = fetchProfile

            const hasAuthority = ['admin', 'owner', 'chef'].includes(profile?.role || '')

            // Fetch active orders for Kitchen Display
            const { data: oData } = await supabase
                .from('orders')
                .select('*, order_items(*, recipe:recipes(name))')
                .eq('status', 'paid')
                .neq('preparation_status', 'delivered')
                .order('created_at', { ascending: true })
            if (oData) initialOrders = oData

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

            const { data: rData } = await recipesQuery.order('created_at', { ascending: false })
            if (rData) recipes = rData
        }
    } catch (e) {
        // App is likely in bypass GUI mode without db connectivity
        console.warn('Caught auth/db error in KitchenManager page. Serving bypass empty arrays.', e)
    }

    return (
        <div className="p-6 h-screen flex flex-col">
            <KitchenHub
                initialOrders={initialOrders || []}
                recipes={recipes || []}
                userId={userId}
            />
        </div>
    )
}
