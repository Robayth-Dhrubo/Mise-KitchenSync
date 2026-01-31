'use client'

import { useMemo } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react'

interface AnalyticsDashboardProps {
    salesLogs: any[]
    recipes: any[]
}

import { cn } from '@/lib/utils'

export function AnalyticsDashboard({ salesLogs, recipes }: AnalyticsDashboardProps) {

    const stats = useMemo(() => {
        const totalSales = salesLogs.reduce((acc, log) => acc + (log.quantity_sold * (log.recipe?.menu_price || 0)), 0)
        const totalItemsSold = salesLogs.reduce((acc, log) => acc + log.quantity_sold, 0)
        const uniqueRecipesCount = new Set(salesLogs.map(log => log.recipe_id)).size

        const salesByRecipe: Record<string, { name: string, quantity: number }> = {}
        salesLogs.forEach(log => {
            const recipeId = log.recipe_id
            const name = log.recipe?.name || 'Unknown'
            if (!salesByRecipe[recipeId]) {
                salesByRecipe[recipeId] = { name, quantity: 0 }
            }
            salesByRecipe[recipeId].quantity += log.quantity_sold
        })
        const bestSellersData = Object.values(salesByRecipe)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5)

        const revenueByDate: Record<string, number> = {}
        salesLogs.forEach(log => {
            const date = new Date(log.sale_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            revenueByDate[date] = (revenueByDate[date] || 0) + (log.quantity_sold * (log.recipe?.menu_price || 0))
        })
        const dailyRevenueData = Object.entries(revenueByDate).map(([date, revenue]) => ({ date, revenue }))

        const ingredientUsage: Record<string, { name: string, amount: number, unit: string }> = {}
        salesLogs.forEach(log => {
            const recipe = recipes.find(r => r.id === log.recipe_id)
            if (recipe && recipe.recipe_items) {
                recipe.recipe_items.forEach((item: any) => {
                    const name = item.ingredient?.name || 'Unknown'
                    if (!ingredientUsage[name]) {
                        ingredientUsage[name] = { name, amount: 0, unit: item.unit_used }
                    }
                    ingredientUsage[name].amount += (item.quantity_needed * log.quantity_sold)
                })
            }
        })
        const ingredientUsageData = Object.values(ingredientUsage)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10)
            .map(item => ({
                ...item,
                amount: Math.round(item.amount * 100) / 100
            }))

        return {
            totalSales,
            totalItemsSold,
            uniqueRecipes: uniqueRecipesCount,
            bestSellersData,
            dailyRevenueData,
            ingredientUsageData
        }
    }, [salesLogs, recipes])

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

    return (
        <div className="space-y-8 pb-20">
            {/* Top Stats */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="glass-card shadow-emerald-500/[0.02]">
                    <CardContent className="p-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/5">
                                <DollarSign className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-1">Gross Revenue</p>
                                <h3 className="text-3xl font-black text-white italic tracking-tighter tabular-nums">${stats.totalSales.toLocaleString()}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-blue-500/[0.02]">
                    <CardContent className="p-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/5">
                                <TrendingUp className="w-8 h-8 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-1">Total Servings</p>
                                <h3 className="text-3xl font-black text-white italic tracking-tighter tabular-nums">{stats.totalItemsSold.toLocaleString()}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card shadow-purple-500/[0.02]">
                    <CardContent className="p-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/5">
                                <Package className="w-8 h-8 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600 mb-1">Dish Reach</p>
                                <h3 className="text-3xl font-black text-white italic tracking-tighter tabular-nums">{stats.uniqueRecipes} Unique</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Daily Revenue Chart */}
                <Card className="glass-card overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/5">
                        <CardTitle className="text-xl font-black text-white italic flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            Revenue Velocity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] p-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.dailyRevenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#525252"
                                    fontSize={10}
                                    fontWeight="bold"
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#525252"
                                    fontSize={10}
                                    fontWeight="bold"
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', backdropFilter: 'blur(10px)', color: '#fff', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#10b981' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={4}
                                    dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#000' }}
                                    activeDot={{ r: 8, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Best Sellers Chart */}
                <Card className="glass-card overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/5">
                        <CardTitle className="text-xl font-black text-white italic flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Users className="w-5 h-5" />
                            </div>
                            Top Performers
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] p-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.bestSellersData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#a3a3a3"
                                    fontSize={12}
                                    fontWeight="bold"
                                    width={120}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                                    contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                                />
                                <Bar dataKey="quantity" radius={[0, 12, 12, 0]} barSize={32}>
                                    {stats.bestSellersData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Ingredient Usage Chart */}
                <Card className="glass-card md:col-span-2 overflow-hidden">
                    <CardHeader className="p-8 border-b border-white/5">
                        <CardTitle className="text-xl font-black text-white italic flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                <Package className="w-5 h-5" />
                            </div>
                            Supply Chain Consumption
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] p-8">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.ingredientUsageData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#525252"
                                    fontSize={10}
                                    fontWeight="bold"
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#525252"
                                    fontSize={10}
                                    fontWeight="bold"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                                    contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.9)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                                    formatter={(value, name, props: any) => [`${value} ${props.payload.unit}`, 'Amount Consumed']}
                                />
                                <Bar dataKey="amount" fill="#8b5cf6" radius={[12, 12, 0, 0]} fillOpacity={0.8} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
