import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    TrendingUp,
    AlertTriangle,
    DollarSign,
    BookOpen,
    ArrowRight,
    Package,
    ChefHat,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch dashboard data
    const [recipesRes, ingredientsRes, lowStockRes] = await Promise.all([
        supabase.from('recipes').select('id, menu_price').eq('user_id', user.id),
        supabase.from('ingredients').select('id').eq('user_id', user.id),
        supabase.from('ingredients').select('id').eq('user_id', user.id).lt('current_stock', 5),
    ])

    const totalRecipes = recipesRes.data?.length || 0
    const totalIngredients = ingredientsRes.data?.length || 0
    const lowStockCount = lowStockRes.data?.length || 0

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('restaurant_name')
        .eq('id', user.id)
        .single()

    return (
        <div className="space-y-12">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[140px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] -z-10" />

            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black text-white tracking-tighter italic font-display">
                        {profile?.restaurant_name || 'Chef&apos;s Command.'}
                    </h1>
                    <p className="text-neutral-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        System Operational • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <Link href="/menu/new">
                    <Button className="h-14 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
                        <ChefHat className="w-5 h-5 mr-3" />
                        Intelligence +
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass-card hover:border-emerald-500/30 transition-all duration-500 group">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Inventory</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Package className="w-5 h-5 text-emerald-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-white mb-1 tabular-nums italic font-display">{totalIngredients}</div>
                        <p className="text-xs font-bold text-neutral-600 uppercase">Live SKU Count</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:border-blue-500/30 transition-all duration-500 group">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Recipes</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BookOpen className="w-5 h-5 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-white mb-1 tabular-nums italic font-display">{totalRecipes}</div>
                        <p className="text-xs font-bold text-neutral-600 uppercase">Active Menu Assets</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:border-purple-500/30 transition-all duration-500 group">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Margin</CardTitle>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <DollarSign className="w-5 h-5 text-purple-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-white mb-1 tabular-nums italic font-display">64%</div>
                        <p className="text-xs font-bold text-neutral-600 uppercase">Avg Gross Profit</p>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "glass-card transition-all duration-500 group",
                    lowStockCount > 0 ? "border-red-500/30" : "hover:border-emerald-500/30"
                )}>
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Procurement</CardTitle>
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform",
                            lowStockCount > 0 ? "bg-red-500/10" : "bg-emerald-500/10"
                        )}>
                            <AlertTriangle className={cn("w-5 h-5", lowStockCount > 0 ? "text-red-500" : "text-emerald-500")} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-4xl font-black mb-1 tabular-nums italic font-display",
                            lowStockCount > 0 ? "text-red-500" : "text-white"
                        )}>{lowStockCount}</div>
                        <p className="text-xs font-bold text-neutral-600 uppercase">Critical Alerts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid gap-6 md:grid-cols-3">
                {[
                    { title: 'Pantry Stock', sub: 'Unit level tracking', icon: Package, color: 'emerald', href: '/pantry' },
                    { title: 'Menu Studio', sub: 'Advanced recipe costing', icon: BookOpen, color: 'blue', href: '/menu' },
                    { title: 'Analytics', sub: 'Profit & Loss insights', icon: TrendingUp, color: 'purple', href: '/reports' },
                ].map((item) => (
                    <Link key={item.title} href={item.href} className="group">
                        <Card className="glass-card hover:bg-white/[0.05] transition-all duration-500 h-full p-2">
                            <CardContent className="flex items-center gap-6 p-6">
                                <div className={cn(
                                    "w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg",
                                    item.color === 'emerald' ? "bg-emerald-500/10 shadow-emerald-500/5" :
                                        item.color === 'blue' ? "bg-blue-500/10 shadow-blue-500/5" :
                                            "bg-purple-500/10 shadow-purple-500/5"
                                )}>
                                    <item.icon className={cn(
                                        "w-8 h-8",
                                        item.color === 'emerald' ? "text-emerald-500" :
                                            item.color === 'blue' ? "text-blue-500" :
                                                "text-purple-500"
                                    )} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-white group-hover:translate-x-1 transition-transform italic font-display">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs font-bold text-neutral-600 uppercase tracking-widest">{item.sub}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Empty State */}
            {totalRecipes === 0 && totalIngredients === 0 && (
                <Card className="glass-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent overflow-hidden">
                    <CardContent className="flex flex-col items-center text-center py-24 relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] -z-10" />

                        <div className="w-24 h-24 rounded-[32px] bg-emerald-600 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/40 rotate-6 group">
                            <ChefHat className="w-12 h-12 text-white group-hover:rotate-12 transition-transform" />
                        </div>
                        <h2 className="text-4xl font-black text-white italic mb-4 font-display">Initialize Kitchen OS.</h2>
                        <p className="text-neutral-500 max-w-sm mb-12 font-medium leading-relaxed">
                            Your unified operations center is ready. Sync your ingredients to begin hyper-accurate recipe costing.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/pantry">
                                <Button variant="outline" className="h-16 px-10 rounded-2xl border-white/10 bg-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all font-display italic">
                                    Sync Pantry
                                </Button>
                            </Link>
                            <Link href="/menu/new">
                                <Button className="h-16 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all font-display italic">
                                    New Asset +
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
