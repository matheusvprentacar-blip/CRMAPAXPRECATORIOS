/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { RoleGuard } from "@/lib/auth/role-guard"
import { NewTransactionModal } from "@/components/finance/new-transaction-modal"
import {
  ArrowDown, ArrowUp, AlertCircle, Calendar as CalendarIcon,
  TrendingUp, TrendingDown, BarChart3, Layers, Activity,
} from "@/components/icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CashFlowChart } from "@/components/finance/cash-flow-chart"
import { ExpensesBreakdown, TopExpenses } from "@/components/finance/expenses-charts"
import { GlobalTransactionsTable } from "@/components/hr/global-transactions-table"
import { DateRange } from "react-day-picker"
import {
  getFinanceSummary, getFinanceTimeSeries,
  getExpensesBreakdown, getTopExpenses, getRecentTransactions,
} from "@/services/finance-service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MonthlyClosingTab } from "@/components/finance/monthly-closing-tab"

// ─── formatters ───────────────────────────────────────────────────────────────
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL",
  notation: "compact", maximumFractionDigits: 1,
})

// ─── period presets ───────────────────────────────────────────────────────────
type PeriodPreset = "mes-atual" | "mes-anterior" | "trimestre" | "ano" | "custom"

const PRESETS: { id: PeriodPreset; label: string; range: () => DateRange }[] = [
  { id: "mes-atual",    label: "Este Mês",  range: () => ({ from: startOfMonth(new Date()),       to: endOfMonth(new Date()) }) },
  { id: "mes-anterior", label: "Mês Ant.",  range: () => { const p = subMonths(new Date(), 1); return { from: startOfMonth(p), to: endOfMonth(p) } } },
  { id: "trimestre",    label: "Trimestre", range: () => ({ from: startOfQuarter(new Date()),     to: endOfQuarter(new Date()) }) },
  { id: "ano",          label: "Este Ano",  range: () => ({ from: startOfYear(new Date()),        to: endOfYear(new Date()) }) },
]

// ─── page ─────────────────────────────────────────────────────────────────────
export default function FinanceiroPage() {
  const [preset, setPreset]         = useState<PeriodPreset>("mes-atual")
  const [date, setDate]             = useState<DateRange | undefined>(PRESETS[0].range())
  const [summary, setSummary]       = useState<any>(null)
  const [timeseries, setTimeseries] = useState<any[]>([])
  const [breakdown, setBreakdown]   = useState<any[]>([])
  const [topExp, setTopExp]         = useState<any[]>([])
  const [recent, setRecent]         = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => { fetchAll() }, [date])

  async function fetchAll() {
    setLoading(true)
    const from = date?.from?.toISOString().split("T")[0]
    const to   = date?.to?.toISOString().split("T")[0]
    try {
      const [s, t, b, e, r] = await Promise.all([
        getFinanceSummary(from, to),
        getFinanceTimeSeries(),
        getExpensesBreakdown(from, to),
        getTopExpenses(from, to),
        getRecentTransactions(),
      ])
      setSummary(s); setTimeseries(t); setBreakdown(b); setTopExp(e); setRecent(r)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function applyPreset(p: typeof PRESETS[number]) {
    setPreset(p.id)
    setDate(p.range())
  }

  const balance         = summary?.balance ?? 0
  const isPositive      = balance >= 0
  const periodLabel     =
    date?.from && date?.to
      ? `${format(date.from, "dd MMM", { locale: ptBR })} – ${format(date.to, "dd MMM yyyy", { locale: ptBR })}`
      : "—"

  return (
    <RoleGuard allowedRoles={["admin", "financeiro"]}>
      <div className="space-y-7 pb-12">

        {/* ── CABEÇALHO ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/38 mb-1">
              Admin · Gestão
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="mt-0.5 text-sm text-foreground/55">
              Visão estratégica e operacional do fluxo de caixa.
            </p>
          </div>
          <NewTransactionModal onSuccess={fetchAll} />
        </div>

        {/* ── TABS ──────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="dashboard">
          <div className="border-b border-border/50 mb-7">
            <TabsList className="bg-transparent p-0 h-auto gap-0 rounded-none">
              {[
                { v: "dashboard",    l: "Visão Geral" },
                { v: "transactions", l: "Transações" },
                { v: "closing",      l: "Fechamento & Comissão" },
              ].map(({ v, l }) => (
                <TabsTrigger
                  key={v} value={v}
                  className="rounded-none border-b-2 border-transparent px-5 py-2.5 text-sm font-medium text-foreground/50 transition-colors data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
                >
                  {l}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── VISÃO GERAL ───────────────────────────────────────────────── */}
          <TabsContent value="dashboard" className="space-y-7 mt-0">

            {/* Seletor de período */}
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className={[
                    "h-8 rounded-full px-4 text-xs font-semibold transition-all",
                    preset === p.id
                      ? "bg-foreground text-background shadow-sm"
                      : "bg-content2/60 text-foreground/55 hover:bg-content2 hover:text-foreground",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              ))}

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    onClick={() => setPreset("custom")}
                    className={[
                      "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all",
                      preset === "custom"
                        ? "bg-foreground text-background shadow-sm"
                        : "bg-content2/60 text-foreground/55 hover:bg-content2 hover:text-foreground",
                    ].join(" ")}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {preset === "custom" && date?.from ? periodLabel : "Personalizado"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={(d) => { setDate(d); setPreset("custom") }}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              <span className="ml-auto text-[11px] tabular-nums text-foreground/35">{periodLabel}</span>
            </div>

            {/* ── SALDO HERO ──────────────────────────────────────────────── */}
            <div className={[
              "relative overflow-hidden rounded-2xl border p-6 md:p-8",
              isPositive
                ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                : "border-destructive/25 bg-destructive/[0.04]",
            ].join(" ")}>
              {/* fundo decorativo */}
              <div className={[
                "pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full opacity-10 blur-3xl",
                isPositive ? "bg-emerald-400" : "bg-rose-400",
              ].join(" ")} />

              <div className="relative flex flex-wrap items-end justify-between gap-6">
                {/* número principal */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 mb-3">
                    Saldo Líquido do Período
                  </p>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className={[
                      "text-5xl md:text-6xl font-black tabular-nums tracking-tight leading-none",
                      isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                    ].join(" ")}>
                      {loading ? "—" : BRL.format(balance)}
                    </span>
                    {!loading && (
                      <span className={[
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                        isPositive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
                      ].join(" ")}>
                        {isPositive
                          ? <TrendingUp className="h-3 w-3" />
                          : <TrendingDown className="h-3 w-3" />}
                        {isPositive ? "Superávit" : "Déficit"}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-foreground/45">{periodLabel}</p>
                </div>

                {/* totais resumidos */}
                <div className="flex gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/38 mb-1">Total Receita</p>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {loading ? "—" : BRL_COMPACT.format(summary?.totalRevenue ?? 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/38 mb-1">Total Despesa</p>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                      {loading ? "—" : BRL_COMPACT.format(summary?.totalExpense ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── KPI ZONES ───────────────────────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Zona Receitas */}
              <div>
                <SectionLabel icon={<Activity className="h-3.5 w-3.5" />} dot="bg-emerald-500">
                  Receitas
                </SectionLabel>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <MetricTile
                    label="Realizadas"
                    value={summary?.netRevenue ?? 0}
                    sub="Pagas / confirmadas"
                    tone="income"
                    icon={<ArrowUp className="h-3.5 w-3.5" />}
                    loading={loading}
                  />
                  <MetricTile
                    label="A Receber"
                    value={summary?.overdueReceivables ?? 0}
                    sub="Inadimplência detectada"
                    tone="warning"
                    icon={<AlertCircle className="h-3.5 w-3.5" />}
                    loading={loading}
                  />
                </div>
              </div>

              {/* Zona Despesas */}
              <div>
                <SectionLabel icon={<Activity className="h-3.5 w-3.5" />} dot="bg-rose-500">
                  Despesas
                </SectionLabel>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <MetricTile
                    label="Realizadas"
                    value={summary?.netExpense ?? 0}
                    sub="Pagas / confirmadas"
                    tone="expense"
                    icon={<ArrowDown className="h-3.5 w-3.5" />}
                    loading={loading}
                  />
                  <MetricTile
                    label="A Pagar"
                    value={summary?.overduePayables ?? 0}
                    sub="Pagamentos em atraso"
                    tone="danger"
                    icon={<AlertCircle className="h-3.5 w-3.5" />}
                    loading={loading}
                  />
                </div>
              </div>
            </div>

            {/* ── GRÁFICOS ────────────────────────────────────────────────── */}
            <div>
              <SectionLabel icon={<BarChart3 className="h-3.5 w-3.5" />}>
                Análise Gráfica
              </SectionLabel>
              <div className="grid gap-4 md:grid-cols-7 mt-3">
                <div className="md:col-span-4">
                  <CashFlowChart data={timeseries} loading={loading} />
                </div>
                <div className="md:col-span-3 space-y-4">
                  <ExpensesBreakdown data={breakdown} loading={loading} />
                  <TopExpenses data={topExp} loading={loading} />
                </div>
              </div>
            </div>

            {/* ── TRANSAÇÕES RECENTES ─────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel icon={<Layers className="h-3.5 w-3.5" />}>
                  Movimentações Recentes
                </SectionLabel>
                <span className="text-[11px] text-foreground/38">
                  Gestão completa na aba &quot;Transações&quot;
                </span>
              </div>
              <Card className="border-border/55 overflow-hidden">
                <CardContent className="p-0">
                  <GlobalTransactionsTable data={recent} onUpdate={fetchAll} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── TRANSAÇÕES ────────────────────────────────────────────────── */}
          <TabsContent value="transactions" className="mt-0 space-y-4">
            <SectionLabel icon={<Layers className="h-3.5 w-3.5" />}>
              Todas as Transações
            </SectionLabel>
            <Card className="border-border/55 overflow-hidden">
              <CardContent className="p-0">
                <GlobalTransactionsTable data={recent} onUpdate={fetchAll} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FECHAMENTO ────────────────────────────────────────────────── */}
          <TabsContent value="closing" className="mt-0">
            <MonthlyClosingTab />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ children, icon, dot }: { children: ReactNode; icon?: ReactNode; dot?: string }) {
  return (
    <div className="flex items-center gap-2">
      {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
      {!dot && icon && <span className="text-foreground/38">{icon}</span>}
      <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/45">
        {children}
      </span>
    </div>
  )
}

// ─── MetricTile ───────────────────────────────────────────────────────────────
type Tone = "income" | "expense" | "warning" | "danger" | "neutral"

const TONE: Record<Tone, { border: string; bg: string; badge: string; value: string }> = {
  income:  { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.05]", badge: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",                   value: "text-emerald-700 dark:text-emerald-300" },
  expense: { border: "border-rose-500/20",    bg: "bg-rose-500/[0.05]",    badge: "text-rose-600 dark:text-rose-400 bg-rose-500/10",                             value: "text-rose-700 dark:text-rose-300" },
  warning: { border: "border-amber-500/20",   bg: "bg-amber-500/[0.05]",   badge: "text-amber-600 dark:text-amber-400 bg-amber-500/10",                          value: "text-amber-700 dark:text-amber-300" },
  danger:  { border: "border-destructive/20", bg: "bg-destructive/[0.05]", badge: "text-destructive bg-destructive/10",                                          value: "text-destructive" },
  neutral: { border: "border-border/60",      bg: "bg-content2/30",        badge: "text-foreground/55 bg-content2/60",                                            value: "text-foreground" },
}

function MetricTile({
  label, value, sub, tone = "neutral", icon, loading,
}: {
  label: string
  value: number
  sub?: string
  tone?: Tone
  icon?: ReactNode
  loading?: boolean
}) {
  const t = TONE[tone]
  return (
    <div className={`rounded-2xl border ${t.border} ${t.bg} p-4 space-y-2.5`}>
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${t.badge}`}>
        {icon}
        {label}
      </div>
      <p className={`text-2xl font-bold tabular-nums leading-none ${t.value}`}>
        {loading ? <span className="text-foreground/25 text-xl">carregando</span> : BRL.format(value)}
      </p>
      {sub && <p className="text-[11px] text-foreground/40 leading-snug">{sub}</p>}
    </div>
  )
}
