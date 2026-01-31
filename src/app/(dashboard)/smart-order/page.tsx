import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SmartOrderList } from '@/components/orders/smart-order-list'

export default async function SmartOrderPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: ingredients } = await supabase
        .from('ingredients')
        .select('*')
        .eq('user_id', user.id)
        .order('category', { ascending: true })

    return (
        <div className="container mx-auto max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight">Smart Order</h1>
                <p className="text-neutral-400 mt-2">Auto-generated orders based on par levels.</p>
            </div>

            <SmartOrderList ingredients={ingredients || []} />
        </div>
    )
}
