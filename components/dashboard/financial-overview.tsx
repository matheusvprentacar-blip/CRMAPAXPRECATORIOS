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
                    <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Total Valor Principal</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-7 w-32 bg-muted animate-pulse rounded" />
                    ) : (
                        <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-primary">
                            {formatCurrency(data.totalPrincipal)}
                        </div>
                    )}
                    <p className="mt-1 text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                        Soma dos valores originais de todos os precatórios ativos
                    </p>
                </CardContent>
            </Card>

            {/* Total Valor Atualizado */}
            <Card className="shadow-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Total Valor Atualizado</CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-7 w-32 bg-muted animate-pulse rounded" />
                    ) : (
                        <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-primary dark:text-primary">
                            {formatCurrency(data.totalAtualizado)}
                        </div>
                    )}
                    <p className="mt-1 text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                        Soma dos valores corrigidos (última atualização)
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
