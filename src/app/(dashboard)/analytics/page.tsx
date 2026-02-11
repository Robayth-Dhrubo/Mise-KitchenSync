import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportsDashboard } from '@/components/reports/reports-dashboard'

import { cn } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'

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
        <div className="p-8 space-y-12 relative max-w-7xl mx-auto">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[140px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] -z-10" />

            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <BarChart3 className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Analytics</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Service performance and profit margins
                    </p>
                </div>
            </div>

            <ReportsDashboard salesLogs={salesLogs || []} recipes={recipes || []} />
        </div>
    )
}
