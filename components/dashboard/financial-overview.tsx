"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Wallet } from "@/components/icons"
import CountUp from "react-countup"

interface FinancialOverviewProps {
    data: {
        totalPrincipal: number
        totalAtualizado: number
    }
    loading: boolean
}

export function FinancialOverview({ data, loading }: FinancialOverviewProps) {
    const currencyPrefix = "R$\u00A0"

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {/* Total Valor Principal */}
            <Card className="border-primary/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Total Valor Principal</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-7 w-32 animate-pulse rounded-2xl bg-muted" />
                    ) : (
                        <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-primary">
                            <CountUp
                                end={data.totalPrincipal}
                                duration={0.9}
                                separator="."
                                decimal=","
                                decimals={2}
                                prefix={currencyPrefix}
                                enableScrollSpy
                                scrollSpyOnce
                                scrollSpyDelay={120}
                            />
                        </div>
                    )}
                    <p className="mt-1 text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                        Soma dos valores originais de todos os precatórios ativos
                    </p>
                </CardContent>
            </Card>

            {/* Total Valor Atualizado */}
            <Card className="border-orange-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Total Valor Atualizado</CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-7 w-32 animate-pulse rounded-2xl bg-muted" />
                    ) : (
                        <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-primary dark:text-primary">
                            <CountUp
                                end={data.totalAtualizado}
                                duration={0.9}
                                separator="."
                                decimal=","
                                decimals={2}
                                prefix={currencyPrefix}
                                enableScrollSpy
                                scrollSpyOnce
                                scrollSpyDelay={120}
                            />
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
