"use client"

import { useMemo } from "react"
import { Loader2 } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type FinanceFlowData = {
  saldoLiquido: number
  pssTotal: number
  irpfTotal: number
  honorariosTotal: number
  adiantamentoTotal: number
  irpfIsento: number
  irpfNaoIsento: number
}

type FinancialFlowSankeyProps = {
  data: FinanceFlowData
  loading?: boolean
}

type FinanceBarRow = {
  key: string
  name: string
  value: number
  color: string
}

const BAR_CONFIG = [
  { key: "saldo", name: "Saldo liquido", color: "#22c55e" },
  { key: "pss", name: "PSS", color: "#0ea5e9" },
  { key: "irpf", name: "IRPF", color: "#ef4444" },
  { key: "honorarios", name: "Honorarios", color: "#f59e0b" },
  { key: "adiantamento", name: "Adiantamento", color: "#14b8a6" },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatCount = (value: number) => new Intl.NumberFormat("pt-BR").format(value)

type ChartTooltipItem = {
  payload?: {
    name?: string
    value?: number
  }
  value?: number
}

function ChartTooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: ChartTooltipItem[]
}) {
  if (!active || !payload?.length) return null

  const item = payload[0]?.payload
  const value = Number(item?.value ?? payload[0]?.value ?? 0)

  return (
    <div className="rounded-md border border-border/70 bg-background/95 p-2 text-xs shadow-lg">
      <p className="font-medium text-foreground">{item?.name ?? "Valor"}</p>
      <p className="mt-1 font-mono tabular-nums text-muted-foreground">{formatCurrency(value)}</p>
    </div>
  )
}

export function FinancialFlowSankey({ data, loading = false }: FinancialFlowSankeyProps) {
  const chartData = useMemo(() => {
    const valuesByKey = {
      saldo: Number(data.saldoLiquido || 0),
      pss: Number(data.pssTotal || 0),
      irpf: Number(data.irpfTotal || 0),
      honorarios: Number(data.honorariosTotal || 0),
      adiantamento: Number(data.adiantamentoTotal || 0),
    } as const

    const rows = BAR_CONFIG.map((item) => ({
      key: item.key,
      name: item.name,
      value: valuesByKey[item.key],
      color: item.color,
    }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    const hasData = rows.length > 0
    return { rows, hasData }
  }, [data])

  return (
    <Card className="overflow-hidden border-zinc-200/70 dark:border-zinc-800/70">
      <CardHeader>
        <CardTitle>Financeiro por categoria</CardTitle>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Comparativo em barras dos principais componentes financeiros.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex h-[340px] items-center justify-center rounded-lg border border-dashed border-border/60">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.hasData ? (
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.rows}
                layout="vertical"
                margin={{ top: 10, right: 52, bottom: 10, left: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) =>
                    new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(value)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.35)" }} content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  <LabelList
                    dataKey="value"
                    position="right"
                    className="fill-muted-foreground text-[11px] font-medium"
                    formatter={(value: number) =>
                      new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(value)
                    }
                  />
                  {chartData.rows.map((entry: FinanceBarRow) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[340px] items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
            Sem dados financeiros para montar o grafico.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono tabular-nums">
            Isento: {formatCount(data.irpfIsento)}
          </Badge>
          <Badge className="bg-rose-100 text-rose-800 border border-rose-200 font-mono tabular-nums">
            Nao isento: {formatCount(data.irpfNaoIsento)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
