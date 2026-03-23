"use client"

import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "@/components/icons"

type CashFlowPoint = { name: string; income: number; expense: number }

const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL",
  notation: "compact", maximumFractionDigits: 1,
})
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

function fmtMonth(val: string) {
  const [y, m] = val.split("-")
  return `${m}/${y.slice(2)}`
}

// ─── custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const income  = payload.find((p: any) => p.dataKey === "income")?.value  ?? 0
  const expense = payload.find((p: any) => p.dataKey === "expense")?.value ?? 0
  const balance = income - expense

  return (
    <div className="rounded-2xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-sm p-3 min-w-[180px]">
      <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/40 mb-2.5">
        {fmtMonth(label)}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-foreground/60">Receitas</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {BRL.format(income)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-xs text-foreground/60">Despesas</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-rose-600 dark:text-rose-400">
            {BRL.format(expense)}
          </span>
        </div>
        <div className="mt-2 border-t border-border/40 pt-2 flex items-center justify-between">
          <span className="text-xs text-foreground/50">Saldo</span>
          <span className={[
            "text-xs font-bold tabular-nums",
            balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
          ].join(" ")}>
            {BRL.format(balance)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── component ────────────────────────────────────────────────────────────────
export function CashFlowChart({ data, loading }: { data: CashFlowPoint[]; loading: boolean }) {
  if (loading) {
    return (
      <Card className="h-[340px] flex items-center justify-center border-border/55">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
      </Card>
    )
  }

  const totalIncome  = data.reduce((s, d) => s + d.income,  0)
  const totalExpense = data.reduce((s, d) => s + d.expense, 0)

  return (
    <Card className="border-border/55 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border/40">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 mb-0.5">Análise Temporal</p>
          <p className="text-sm font-bold text-foreground">Fluxo de Caixa</p>
          <p className="text-xs text-foreground/45">Últimos 12 meses</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/35 mb-0.5">Receitas</p>
            <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {BRL_COMPACT.format(totalIncome)}
            </p>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/35 mb-0.5">Despesas</p>
            <p className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {BRL_COMPACT.format(totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Legenda inline ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-5 pt-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-foreground/50">Receitas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-[11px] text-foreground/50">Despesas</span>
        </div>
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      <CardContent className="px-2 pb-4 pt-2">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#f43f5e" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
              />

              <XAxis
                dataKey="name"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={fmtMonth}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={64}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => BRL_COMPACT.format(v)}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />

              <Area
                type="monotone"
                dataKey="income"
                name="Receitas"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradIncome)"
                dot={false}
                activeDot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="expense"
                name="Despesas"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="url(#gradExpense)"
                dot={false}
                activeDot={{ r: 4, fill: "#f43f5e", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
