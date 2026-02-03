"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RoleGuard } from "@/lib/auth/role-guard"
import { useEffect, useState } from "react"
import { NewTransactionModal } from "@/components/finance/new-transaction-modal"
import { ArrowDown, ArrowUp, DollarSign, AlertCircle, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CashFlowChart } from "@/components/finance/cash-flow-chart"
import { ExpensesBreakdown, TopExpenses } from "@/components/finance/expenses-charts"
import { GlobalTransactionsTable } from "@/components/hr/global-transactions-table"
import { DateRange } from "react-day-picker"

import { getFinanceSummary, getFinanceTimeSeries, getExpensesBreakdown, getTopExpenses, getRecentTransactions } from "@/services/finance-service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MonthlyClosingTab } from "@/components/finance/monthly-closing-tab"

export default function FinanceiroPage() {
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().setDate(1)), // First day of current month
        to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) // Last day
    })

    const [summary, setSummary] = useState<any>(null)
    const [timeseries, setTimeseries] = useState<any[]>([])
    const [breakdown, setBreakdown] = useState<any[]>([])
    const [topExpenses, setTopExpenses] = useState<any[]>([])
    const [recent, setRecent] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [date])

    async function fetchDashboardData() {
        setLoading(true)
        const from = date?.from ? date.from.toISOString().split('T')[0] : undefined
        const to = date?.to ? date.to.toISOString().split('T')[0] : undefined

        try {
            const [sumData, timeData, breakData, topData, recentData] = await Promise.all([
                getFinanceSummary(from, to),
                getFinanceTimeSeries(),
                getExpensesBreakdown(from, to),
                getTopExpenses(from, to),
                getRecentTransactions()
            ])

            setSummary(sumData)
            setTimeseries(timeData)
            setBreakdown(breakData)
            setTopExpenses(topData)
            setRecent(recentData)

        } catch (error) {
            console.error("Failed to fetch dashboard data", error)
        } finally {
            setLoading(false)
        }
    }


    return (
        <RoleGuard allowedRoles={["admin", "financeiro"]}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Financeiro Inteligente</h1>
                        <p className="text-muted-foreground">Visão estratégica e operacional do fluxo de caixa.</p>
                    </div>
                </div>

                <Tabs defaultValue="dashboard" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="dashboard">Visão Geral</TabsTrigger>
                        <TabsTrigger value="transactions">Transações</TabsTrigger>
                        <TabsTrigger value="closing">Fechamento & Comissão</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-4">
                        {/* Filters specific to Dashboard */}
                        <div className="flex justify-end gap-2 items-center">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date?.from ? (
                                            date.to ? (
                                                <>
                                                    {format(date.from, "dd/MM/yy")} - {format(date.to, "dd/MM/yy")}
                                                </>
                                            ) : (
                                                format(date.from, "dd/MM/yy")
                                            )
                                        ) : (
                                            <span>Filtrar Data</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={setDate}
                                        numberOfMonths={2}
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                            <NewTransactionModal onSuccess={fetchDashboardData} />
                        </div>

                        {/* KPI Cards */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <KpiCard
                                title="Saldo do Período"
                                value={summary?.balance || 0}
                                icon={DollarSign}
                                description="Receitas Realizadas - Despesas Realizadas"
                                color={summary?.balance >= 0 ? "text-green-600" : "text-red-600"}
                            />
                            <KpiCard
                                title="Receitas (Realizadas)"
                                value={summary?.netRevenue || 0}
                                icon={ArrowUp}
                                description={`Total Faturado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.totalRevenue || 0)}`}
                                color="text-green-600"
                            />
                            <KpiCard
                                title="Despesas (Realizadas)"
                                value={summary?.netExpense || 0}
                                icon={ArrowDown}
                                description={`Total Lançado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.totalExpense || 0)}`}
                                color="text-red-600"
                            />
                            <KpiCard
                                title="A Receber (Atrasado)"
                                value={summary?.overdueReceivables || 0}
                                icon={AlertCircle}
                                description="Inadimplência detectada"
                                color="text-orange-600"
                            />
                        </div>

                        {/* Main Charts */}
                        <div className="grid gap-4 md:grid-cols-7">
                            <CashFlowChart data={timeseries} loading={loading} />
                            <div className="col-span-4 md:col-span-3 grid gap-4">
                                <ExpensesBreakdown data={breakdown} loading={loading} />
                                <TopExpenses data={topExpenses} loading={loading} />
                            </div>
                        </div>

                        {/* Recent Transactions Table Preview */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Transações Recentes</CardTitle>
                                <CardDescription>Últimas movimentações. Veja a aba 'Transações' para gestão completa.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <GlobalTransactionsTable data={recent} onUpdate={fetchDashboardData} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="transactions">
                        <Card>
                            <CardHeader>
                                <CardTitle>Todas as Transações</CardTitle>
                                <CardDescription>Gestão completa de entradas e saídas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <GlobalTransactionsTable data={recent} onUpdate={fetchDashboardData} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="closing">
                        <MonthlyClosingTab />
                    </TabsContent>
                </Tabs>
            </div>
        </RoleGuard>
    )
}

function KpiCard({ title, value, icon: Icon, description, color }: any) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 text-muted-foreground`} />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${color}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}
