import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KitchenDisplay } from '@/components/kitchen/kitchen-display'

export default async function KitchenPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Initial fetch of active orders
    const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*, recipe:recipes(name))')
        .eq('status', 'paid')
        .neq('preparation_status', 'delivered')
        .order('created_at', { ascending: true })

    return (
        <div className="container mx-auto max-w-[1600px]">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight">Kitchen Display System</h1>
                <p className="text-neutral-500 mt-1">Live order tracking and preparation management.</p>
            </div>

            <KitchenDisplay initialOrders={orders || []} />
        </div>
    )
}
