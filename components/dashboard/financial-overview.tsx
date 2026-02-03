"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Wallet } from "lucide-react"

interface FinancialOverviewProps {
    data: {
        totalPrincipal: number
        totalAtualizado: number
    }
    loading: boolean
}

export function FinancialOverview({ data, loading }: FinancialOverviewProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
        }).format(value)
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {/* Total Valor Principal */}
            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold tracking-wide uppercase text-zinc-500">Total Valor Principal</CardTitle>
                    <Wallet className="h-4 w-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-7 w-32 bg-muted animate-pulse rounded" />
                    ) : (
                        <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(data.totalPrincipal)}
                        </div>
                    )}
                    <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                        Soma dos valores originais de todos os precatórios ativos
                    </p>
                </CardContent>
            </Card>

            {/* Total Valor Atualizado */}
            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold tracking-wide uppercase text-zinc-500">Total Valor Atualizado</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-7 w-32 bg-muted animate-pulse rounded" />
                    ) : (
                        <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(data.totalAtualizado)}
                        </div>
                    )}
                    <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                        Soma dos valores corrigidos (última atualização)
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
