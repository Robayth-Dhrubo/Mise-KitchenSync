import { createClient } from '@/lib/supabase/server'
import { KitchenDisplay } from '@/components/kitchen/kitchen-display'

export default async function ServiceLogPage() {
    const supabase = await createClient()

    // Initial fetch of active orders to hydrate the client component
    const { data: initialOrders } = await supabase
        .from('orders')
        .select('*, order_items(*, recipe:recipes(name))')
        .eq('status', 'paid')
        .neq('preparation_status', 'delivered')
        .order('created_at', { ascending: true })

    return (
        <div className="p-6 h-screen flex flex-col">
            <KitchenDisplay initialOrders={initialOrders || []} />
        </div>
    )
}
