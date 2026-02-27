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
            <Card
                allowShadow
                disableDefaultSurface
                className="relative overflow-hidden rounded-3xl border border-primary/30 bg-content1 shadow-[0_22px_54px_-34px_rgba(15,23,42,0.22)] dark:bg-zinc-900/72 dark:shadow-[0_30px_76px_-42px_rgba(251,146,60,0.42)]"
            >
                <div className="pointer-events-none absolute inset-0 hidden opacity-80 dark:block">
                    <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-gradient-to-br from-primary/38 to-transparent blur-2xl" />
                    <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,hsl(var(--primary)/0.16)_0%,transparent_58%)]" />
                </div>
                <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Total Valor Principal</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="relative z-10">
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
            <Card
                allowShadow
                disableDefaultSurface
                className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-content1 shadow-[0_22px_54px_-34px_rgba(15,23,42,0.22)] dark:bg-zinc-900/72 dark:shadow-[0_30px_76px_-42px_rgba(251,146,60,0.42)]"
            >
                <div className="pointer-events-none absolute inset-0 hidden opacity-80 dark:block">
                    <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-gradient-to-br from-orange-400/38 to-transparent blur-2xl" />
                    <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(251,146,60,0.17)_0%,transparent_58%)]" />
                </div>
                <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Total Valor Atualizado</CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent className="relative z-10">
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
