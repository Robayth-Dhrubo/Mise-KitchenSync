'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ReferenceLine, Label } from 'recharts'
import { Info } from 'lucide-react'
import {
    Tooltip as UITooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface MenuMatrixItem {
    id: string
    name: string
    popularity: number // Sales Count
    profitability: number // Margin ($)
    price: number
    cost: number
    category: 'Star' | 'Plowhorse' | 'Puzzle' | 'Dog'
}

const CATEGORY_COLORS = {
    'Star': '#10b981', // Emerald-500
    'Plowhorse': '#f59e0b', // Amber-500
    'Puzzle': '#8b5cf6', // Violet-500
    'Dog': '#ef4444', // Red-500
}

interface MenuMatrixChartProps {
    data: MenuMatrixItem[]
}

interface CustomTooltipProps {
    active?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any[]
    label?: string
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        return (
            <div className="bg-card border border-border p-3 rounded-lg shadow-xl">
                <p className="font-bold text-foreground mb-1">{data.name}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Type: <span style={{ color: CATEGORY_COLORS[data.category as keyof typeof CATEGORY_COLORS] }}>{data.category}</span></p>
                    <p>Sales: {data.popularity}</p>
                    <p>Profit: ${data.profitability.toFixed(2)}</p>
                    <p>Price: ${data.price.toFixed(2)} (Cost: ${data.cost.toFixed(2)})</p>
                </div>
            </div>
        )
    }
    return null
}

export function MenuMatrixChart({ data }: MenuMatrixChartProps) {
    // Calculate averages for quadrants
    const avgPopularity = data.reduce((sum, item) => sum + item.popularity, 0) / (data.length || 1)
    const avgProfitability = data.reduce((sum, item) => sum + item.profitability, 0) / (data.length || 1)

    // Assign categories if not already done (though typically passed in, we can recalculate for visual lines)
    // Stars: High Profit, High Pop
    // Plowhorses: Low Profit, High Pop
    // Puzzles: High Profit, Low Pop
    // Dogs: Low Profit, Low Pop

    return (
        <Card className="col-span-2 bg-card/50 border-border">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium text-foreground flex items-center gap-2">
                        Menu Matrix
                        <TooltipProvider>
                            <UITooltip>
                                <TooltipTrigger>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="bg-card border-border text-foreground">
                                    <p>Analyze menu performance based on Profit vs. Popularity.</p>
                                </TooltipContent>
                            </UITooltip>
                        </TooltipProvider>
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <XAxis
                                type="number"
                                dataKey="popularity"
                                name="Popularity"
                                stroke="#52525b"
                                label={{ value: 'Popularity (Sales Vol)', position: 'bottom', fill: '#71717a', fontSize: 12 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="profitability"
                                name="Profitability"
                                stroke="#52525b"
                                unit="$"
                                label={{ value: 'Profitability (Margin)', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 12 }}
                            />
                            <ZAxis type="number" dataKey="price" range={[100, 500]} name="Price" />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                            {/* Quadrant Lines */}
                            <ReferenceLine x={avgPopularity} stroke="#52525b" strokeDasharray="3 3" />
                            <ReferenceLine y={avgProfitability} stroke="#52525b" strokeDasharray="3 3" />

                            {/* Quadrant Labels */}
                            <Label value="PLOWHORSES" position="insideTopLeft" fill="#f59e0b" fontSize={10} opacity={0.5} />
                            <Label value="STARS" position="insideTopRight" fill="#10b981" fontSize={10} opacity={0.5} />
                            <Label value="DOGS" position="insideBottomLeft" fill="#ef4444" fontSize={10} opacity={0.5} />
                            <Label value="PUZZLES" position="insideBottomRight" fill="#8b5cf6" fontSize={10} opacity={0.5} />

                            <Scatter name="Items" data={data}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category]} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                    {Object.entries(CATEGORY_COLORS).map(([name, color]) => (
                        <div key={name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-xs text-muted-foreground">{name}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
