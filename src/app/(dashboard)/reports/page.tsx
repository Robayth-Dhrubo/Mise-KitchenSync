import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from '@/components/reports/analytics-dashboard'

import { cn } from '@/lib/utils'

export default async function ReportsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch sales logs with recipe data
    const { data: salesLogs } = await supabase
        .from('sales_logs')
        .select(`
            *,
            recipe:recipes (
                id,
                name,
                menu_price
            )
        `)
        .eq('user_id', user.id)
        .order('sale_date', { ascending: true })

    // Fetch recipes with ingredients for calculation
    const { data: recipes } = await supabase
        .from('recipes')
        .select(`
            id,
            name,
            recipe_items (
                quantity_needed,
                unit_used,
                ingredient:ingredients (
                    id,
                    name
                )
            )
        `)
        .eq('user_id', user.id)

    return (
        <div className="space-y-12 relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[140px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] -z-10" />

            <div className="space-y-1">
                <h1 className="text-5xl font-black text-white tracking-tighter italic">Intelligence.</h1>
                <p className="text-neutral-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    Kitchen Performance Analytics & Profit Matrix
                </p>
            </div>

            <AnalyticsDashboard salesLogs={salesLogs || []} recipes={recipes || []} />
        </div>
    )
}
