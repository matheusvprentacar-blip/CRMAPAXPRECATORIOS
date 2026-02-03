"use client"

import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899']

export function ExpensesBreakdown({ data, loading }: { data: any[], loading: boolean }) {
    if (loading) return <SkeletonCard title="Despesas por Categoria" />

    return (
        <Card>
            <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full h-[300px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {data.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            {entry.name}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export function TopExpenses({ data, loading }: { data: any[], loading: boolean }) {
    if (loading) return <SkeletonCard title="Top 5 Gastos" />

    return (
        <Card>
            <CardHeader>
                <CardTitle>Maiores Despesas</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full h-[300px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data} margin={{ left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                tick={{ fontSize: 11 }}
                                interval={0}
                            />
                            <Tooltip
                                formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))}
                                contentStyle={{ color: 'black' }}
                            />
                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="value" position="right" formatter={(val: any) => `R$${val}`} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}

function SkeletonCard({ title }: { title: string }) {
    return (
        <Card className="col-span-2">
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="h-[250px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    )
}
