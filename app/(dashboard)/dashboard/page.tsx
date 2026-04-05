"use client"
/* eslint-disable */

import { useEffect, useMemo, useState } from "react"
import CountUp from "react-countup"
import {
  RefreshCw,
  Layers,
  Users,
  FileText,
  Wallet,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListChecks,
  Percent,
  LayoutGrid,
  ClipboardList,
  Gauge,
} from "@/components/icons"

import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"

import { FinancialOverview } from "@/components/dashboard/financial-overview"
import { ComplexityOverview } from "@/components/dashboard/complexity-overview"
import { DelayBottlenecks } from "@/components/dashboard/delay-bottlenecks"
import { PerformanceMetrics } from "@/components/dashboard/performance-metrics"
import { OperatorDistribution } from "@/components/dashboard/operator-distribution"
import { CriticalPrecatorios } from "@/components/dashboard/critical-precatorios"
import { MetricCard } from "@/components/dashboard/metric-card"
import { PremiumDonutCard } from "@/components/charts/PremiumDonutCard"

import {
  Button,
  Chip,
  Progress,
  Divider,
  Tabs,
  Tab,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@/lib/heroui/compat"
import { Label, ListBox, Select } from "@heroui/react"

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCurrency, formatPercent } from "@/lib/utils/currency"
import { KANBAN_COLUMNS } from "@/app/(dashboard)/kanban/columns"
import { useInViewOnce } from "@/lib/hooks/use-in-view-once"

import type {
  BottleneckItem,
  ComplexityMetrics,
  CriticalPrecatorio,
  DashboardMetrics,
  OperatorMetrics,
  PerformanceMetrics as PerformanceMetricsType,
} from "@/lib/types/dashboard"

type PeriodKey = "30d" | "90d" | "180d" | "365d" | "all"
type DashTabKey = "overview" | "details" | "operation"

type PeriodRange = {
  label: string
  inicio: Date | null
  fim: Date | null
}

type DashboardKpis = {
  periodo: { inicio: string | null; fim: string | null }
  resumo: {
    total_precatorios: number
    total_principal: number
    total_atualizado: number
    total_saldo_liquido: number
    total_credores: number
    total_propostas: number
  }
  periodo_kpis: {
    novos_precatorios: number
    precatorios_atualizados: number
    propostas_criadas: number
    atividades_periodo: number
    mensagens_chat_periodo: number
  }
  kanban: {
    quantidade_por_status: Record<string, number>
    valor_por_status: Record<string, number>
  }
  financeiro: {
    pss_total: number
    irpf_total: number
    honorarios_total: number
    adiantamento_total: number
    irpf_isento: number
    irpf_nao_isento: number
  }
  propostas: {
    por_status: Record<string, number>
    valor_total: number
    ticket_medio: number
    desconto_medio: number
  }
  calculo: {
    pronto_calculo: number
    em_calculo: number
    concluido: number
    desatualizado: number
    versoes_media: number
  }
  sla: {
    no_prazo: number
    atencao: number
    atrasado: number
    nao_iniciado: number
    concluido: number
    tempo_medio_calculo_horas: number
    total_em_calculo: number
  }
  documentos_certidoes: {
    total_docs: number
    docs_recebidos: number
    total_certidoes: number
    certidoes_recebidas: number
    certidoes_vencidas: number
  }
  credores: {
    total_credores: number
    valor_total_principal: number
  }
  usuarios: {
    ativos_total: number
    por_role: Record<string, number>
  }
  juridico: {
    parecer_por_status: Record<string, number>
    resultado_final: Record<string, number>
  }
  oficios: {
    analise_processual_inicial: number
    com_oficio: number
  }
  atividades: {
    por_tipo: Record<string, number>
  }
  chat: {
    mensagens_nao_lidas: number
  }
}

type PropostaCompilada = {
  totalMaior: number
  maiorProposta: number
  quantidadeComProposta: number
}

type PropostaCompiladaRow = {
  proposta_maior_valor: unknown
}

type SimpleTableRow = {
  label: string
  value: number
}

type SimpleTableCardProps = {
  title: string
  description?: string
  rows: SimpleTableRow[]
  labelHeader?: string
  valueHeader?: string
  valueFormatter?: (value: number) => string
  emptyLabel?: string
}

type Chart3DCardProps = {
  title: string
  description?: string
  rows: SimpleTableRow[]
  valueFormatter?: (value: number) => string
  emptyLabel?: string
  height?: number
}

type AnimatedNumberConfig = {
  end: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  separator?: string
  decimal?: string
}

type DashboardMetricTileProps = {
  title: string
  value: string
  subtitle?: string
  icon: any
  badgeLabel?: string
  badgeAnimatedNumber?: AnimatedNumberConfig
  badgeTone?: "default" | "success" | "warning" | "danger" | "primary"
  animatedNumber?: AnimatedNumberConfig
}

const DEFAULT_KPIS: DashboardKpis = {
  periodo: { inicio: null, fim: null },
  resumo: {
    total_precatorios: 0,
    total_principal: 0,
    total_atualizado: 0,
    total_saldo_liquido: 0,
    total_credores: 0,
    total_propostas: 0,
  },
  periodo_kpis: {
    novos_precatorios: 0,
    precatorios_atualizados: 0,
    propostas_criadas: 0,
    atividades_periodo: 0,
    mensagens_chat_periodo: 0,
  },
  kanban: { quantidade_por_status: {}, valor_por_status: {} },
  financeiro: {
    pss_total: 0,
    irpf_total: 0,
    honorarios_total: 0,
    adiantamento_total: 0,
    irpf_isento: 0,
    irpf_nao_isento: 0,
  },
  propostas: { por_status: {}, valor_total: 0, ticket_medio: 0, desconto_medio: 0 },
  calculo: { pronto_calculo: 0, em_calculo: 0, concluido: 0, desatualizado: 0, versoes_media: 0 },
  sla: {
    no_prazo: 0,
    atencao: 0,
    atrasado: 0,
    nao_iniciado: 0,
    concluido: 0,
    tempo_medio_calculo_horas: 0,
    total_em_calculo: 0,
  },
  documentos_certidoes: { total_docs: 0, docs_recebidos: 0, total_certidoes: 0, certidoes_recebidas: 0, certidoes_vencidas: 0 },
  credores: { total_credores: 0, valor_total_principal: 0 },
  usuarios: { ativos_total: 0, por_role: {} },
  juridico: { parecer_por_status: {}, resultado_final: {} },
  oficios: { analise_processual_inicial: 0, com_oficio: 0 },
  atividades: { por_tipo: {} },
  chat: { mensagens_nao_lidas: 0 },
}

const DEFAULT_COMPLEXITY: ComplexityMetrics = {
  baixa: 0,
  media: 0,
  alta: 0,
  total: 0,
  percentuais: { baixa: 0, media: 0, alta: 0 },
}

const DEFAULT_PERFORMANCE: PerformanceMetricsType = {
  tempo_medio_fila: 0,
  tempo_medio_finalizar: 0,
  sla_estourado: 0,
  total_em_calculo: 0,
  total_finalizados: 0,
}

const DEFAULT_BOTTLENECKS: BottleneckItem[] = []
const DEFAULT_OPERATORS: OperatorMetrics[] = []
const DEFAULT_CRITICAL: CriticalPrecatorio[] = []
const DEFAULT_PROPOSTA_COMPILADA: PropostaCompilada = {
  totalMaior: 0,
  maiorProposta: 0,
  quantidadeComProposta: 0,
}
const CURRENCY_PREFIX = "R$\u00A0"
const COUNTUP_SCROLL_PROPS = {
  enableScrollSpy: true,
  scrollSpyOnce: true,
  scrollSpyDelay: 120,
} as const
const CHART_PALETTE = [
  "#0e4d6a",   // petróleo
  "#1a6080",   // petróleo claro
  "#2578a0",   // petróleo mais claro
  "#15803d",   // verde semântico
  "#1d4ed8",   // azul semântico
  "#92400e",   // âmbar semântico
]

const clayCardShadow: React.CSSProperties = {
  boxShadow: "16px 16px 36px rgba(0,0,0,.08), -8px -8px 20px rgba(255,255,255,.94), inset 1px 1px 4px rgba(255,255,255,.9), inset -1px -1px 2px rgba(0,0,0,.04)",
}
const clayInsetShadow: React.CSSProperties = {
  boxShadow: "inset 5px 5px 12px rgba(0,0,0,.07), inset -4px -4px 10px rgba(255,255,255,.87)",
}
const clayPrimaryShadow: React.CSSProperties = {
  boxShadow: "8px 8px 20px rgba(14,77,106,.42), -3px -3px 8px rgba(255,255,255,.3), inset 1px 1px 3px rgba(255,255,255,.14), inset -1px -1px 2px rgba(8,40,60,.3)",
}

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string; days: number | null }> = [
  { value: "30d", label: "Últimos 30 dias", days: 30 },
  { value: "90d", label: "Últimos 90 dias", days: 90 },
  { value: "180d", label: "Últimos 6 meses", days: 180 },
  { value: "365d", label: "Últimos 12 meses", days: 365 },
  { value: "all", label: "Todo o período", days: null },
]

// ---- helpers (mantidos) ----
const formatCount = (value: number) => new Intl.NumberFormat("pt-BR").format(value)
const toNumber = (value: any) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
const toRecord = (value: any): Record<string, number> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.entries(value).reduce<Record<string, number>>((acc, [key, val]) => {
    acc[key] = toNumber(val)
    return acc
  }, {})
}
const normalizeKpis = (raw: any): DashboardKpis => {
  const source = raw || {}
  return {
    periodo: { inicio: source.periodo?.inicio || null, fim: source.periodo?.fim || null },
    resumo: {
      total_precatorios: toNumber(source.resumo?.total_precatorios),
      total_principal: toNumber(source.resumo?.total_principal),
      total_atualizado: toNumber(source.resumo?.total_atualizado),
      total_saldo_liquido: toNumber(source.resumo?.total_saldo_liquido),
      total_credores: toNumber(source.resumo?.total_credores),
      total_propostas: toNumber(source.resumo?.total_propostas),
    },
    periodo_kpis: {
      novos_precatorios: toNumber(source.periodo_kpis?.novos_precatorios),
      precatorios_atualizados: toNumber(source.periodo_kpis?.precatorios_atualizados),
      propostas_criadas: toNumber(source.periodo_kpis?.propostas_criadas),
      atividades_periodo: toNumber(source.periodo_kpis?.atividades_periodo),
      mensagens_chat_periodo: toNumber(source.periodo_kpis?.mensagens_chat_periodo),
    },
    kanban: {
      quantidade_por_status: toRecord(source.kanban?.quantidade_por_status),
      valor_por_status: toRecord(source.kanban?.valor_por_status),
    },
    financeiro: {
      pss_total: toNumber(source.financeiro?.pss_total),
      irpf_total: toNumber(source.financeiro?.irpf_total),
      honorarios_total: toNumber(source.financeiro?.honorarios_total),
      adiantamento_total: toNumber(source.financeiro?.adiantamento_total),
      irpf_isento: toNumber(source.financeiro?.irpf_isento),
      irpf_nao_isento: toNumber(source.financeiro?.irpf_nao_isento),
    },
    propostas: {
      por_status: toRecord(source.propostas?.por_status),
      valor_total: toNumber(source.propostas?.valor_total),
      ticket_medio: toNumber(source.propostas?.ticket_medio),
      desconto_medio: toNumber(source.propostas?.desconto_medio),
    },
    calculo: {
      pronto_calculo: toNumber(source.calculo?.pronto_calculo),
      em_calculo: toNumber(source.calculo?.em_calculo),
      concluido: toNumber(source.calculo?.concluido),
      desatualizado: toNumber(source.calculo?.desatualizado),
      versoes_media: toNumber(source.calculo?.versoes_media),
    },
    sla: {
      no_prazo: toNumber(source.sla?.no_prazo),
      atencao: toNumber(source.sla?.atencao),
      atrasado: toNumber(source.sla?.atrasado),
      nao_iniciado: toNumber(source.sla?.nao_iniciado),
      concluido: toNumber(source.sla?.concluido),
      tempo_medio_calculo_horas: toNumber(source.sla?.tempo_medio_calculo_horas),
      total_em_calculo: toNumber(source.sla?.total_em_calculo),
    },
    documentos_certidoes: {
      total_docs: toNumber(source.documentos_certidoes?.total_docs),
      docs_recebidos: toNumber(source.documentos_certidoes?.docs_recebidos),
      total_certidoes: toNumber(source.documentos_certidoes?.total_certidoes),
      certidoes_recebidas: toNumber(source.documentos_certidoes?.certidoes_recebidas),
      certidoes_vencidas: toNumber(source.documentos_certidoes?.certidoes_vencidas),
    },
    credores: {
      total_credores: toNumber(source.credores?.total_credores),
      valor_total_principal: toNumber(source.credores?.valor_total_principal),
    },
    usuarios: {
      ativos_total: toNumber(source.usuarios?.ativos_total),
      por_role: toRecord(source.usuarios?.por_role),
    },
    juridico: {
      parecer_por_status: toRecord(source.juridico?.parecer_por_status),
      resultado_final: toRecord(source.juridico?.resultado_final),
    },
    oficios: {
      analise_processual_inicial: toNumber(source.oficios?.analise_processual_inicial),
      com_oficio: toNumber(source.oficios?.com_oficio),
    },
    atividades: { por_tipo: toRecord(source.atividades?.por_tipo) },
    chat: { mensagens_nao_lidas: toNumber(source.chat?.mensagens_nao_lidas) },
  }
}
const humanizeKey = (value: string) =>
  value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

const getPeriodRange = (key: PeriodKey): PeriodRange => {
  const preset = PERIOD_OPTIONS.find((option) => option.value === key) || PERIOD_OPTIONS[0]
  if (!preset.days) return { label: preset.label, inicio: null, fim: null }
  const fim = new Date()
  const inicio = new Date()
  inicio.setDate(fim.getDate() - preset.days)
  return { label: preset.label, inicio, fim }
}

const buildRows = (record: Record<string, number>, formatLabel: (key: string) => string, filterZero = true) =>
  Object.entries(record || {})
    .map(([key, value]) => ({ label: formatLabel(key), value: toNumber(value) }))
    .filter((row) => (filterZero ? row.value > 0 : true))
    .sort((a, b) => b.value - a.value)

const formatHours = (hours: number) => {
  if (!hours) return "0h"
  if (hours < 1) return `${Math.round(hours * 60)}min`
  return `${hours.toFixed(1)}h`
}
const formatDateShort = (value: Date) => value.toLocaleDateString("pt-BR")
const formatCurrencyNoBreak = (value: number) => formatCurrency(value).replace(/\s/g, "\u00A0")

// ---- UI helpers (novo) ----
function GlassCard({ className, children, ...props }: any) {
  return (
    <div
      className={["rounded-[24px] border border-black/[0.07] bg-white", className || ""].join(" ")}
      style={clayCardShadow}
      {...props}
    >
      {children}
    </div>
  )
}

function ToneChip({ tone = "default", children, className = "" }: any) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
        : tone === "danger"
          ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
          : tone === "primary"
            ? "bg-[#e8f4f8] text-[#0e4d6a] border-[#a8d4e8]"
            : "bg-muted text-muted-foreground border-border"
  return (
    <span className={["inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", toneClass, className].join(" ")}>
      {children}
    </span>
  )
}

function SimpleTableCard({
  title,
  description,
  rows,
  labelHeader = "Item",
  valueHeader = "Total",
  valueFormatter = formatCount,
  emptyLabel = "Sem dados disponíveis",
}: SimpleTableCardProps) {
  return (
    <GlassCard>
      <div className="p-5">
        <div className="mb-3">
          <div className="text-base font-semibold text-foreground">{title}</div>
          {description ? <div className="mt-0.5 text-sm text-muted-foreground">{description}</div> : null}
        </div>
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm font-medium text-muted-foreground">{emptyLabel}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{labelHeader}</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">{valueHeader}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-black/[0.04] last:border-0">
                  <td className="py-2 font-medium text-foreground">{row.label}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">{valueFormatter(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </GlassCard>
  )
}

function Chart3DCard({
  title,
  description,
  rows,
  valueFormatter = formatCount,
  emptyLabel = "Sem dados disponíveis",
  height = 360,
}: Chart3DCardProps) {
  const { ref: chartRef, hasEntered: canAnimate } = useInViewOnce<HTMLDivElement>({ threshold: 0.25 })
  const isCurrency = valueFormatter(1).includes("R$")
  const compactFormatter = (value: any) => {
    const numeric = Number(value || 0)
    return isCurrency
      ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(numeric)
      : new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(numeric)
  }

  const chartData = rows.map((row, index) => ({
    id: `${row.label}-${index}`,
    name: row.label,
    value: row.value,
    color: CHART_PALETTE[index % CHART_PALETTE.length],
  }))

  const chartHeight = Math.max(320, Math.min(560, 280 + rows.length * 18))
  const maxLabelLength = Math.max(...chartData.map((item) => item.name.length), 0)
  const hasLongLabels = maxLabelLength > 16
  const xTickHeight = hasLongLabels ? 70 : 44
  const chartKey = `${title}-${chartData.length}-${chartData.map((d) => d.value).join("_")}`
  const chartInstanceKey = `${chartKey}-${canAnimate ? "animate" : "idle"}`
  const formatXAxisLabel = (label: string) => (label.length > 28 ? `${label.slice(0, 28)}…` : label)

  function KanbanBarTooltip({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ payload?: { name?: string; value?: number }; value?: number }>
  }) {
    if (!active || !payload?.length) return null
    const item = payload[0]?.payload
    const value = Number(item?.value || payload[0]?.value || 0)

    return (
      <div className="rounded-xl border border-black/[0.07] bg-white p-3 text-sm shadow-sm">
        <p className="font-semibold text-muted-foreground dark:text-white/90">{item?.name || "Item"}</p>
        <p className="mt-1 font-mono text-base tabular-nums text-muted-foreground dark:text-white/90">{valueFormatter(value)}</p>
      </div>
    )
  }

  return (
    <GlassCard className="overflow-hidden">
      <div className="p-5">
        <div className="mb-4">
          <div className="text-base font-semibold text-foreground">{title}</div>
          {description ? <div className="mt-0.5 text-sm text-muted-foreground">{description}</div> : null}
        </div>
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm font-medium text-muted-foreground">{emptyLabel}</div>
        ) : (
          <div ref={chartRef} className="w-full" style={{ height: Math.max(chartHeight, height) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartInstanceKey} data={chartData} margin={{ top: 12, right: 12, bottom: xTickHeight, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  height={xTickHeight}
                  angle={hasLongLabels ? -22 : 0}
                  textAnchor={hasLongLabels ? "end" : "middle"}
                  tickFormatter={formatXAxisLabel}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  width={86}
                  tickFormatter={compactFormatter}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.35)" }} content={<KanbanBarTooltip />} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={56} isAnimationActive={canAnimate} animationDuration={900} animationEasing="ease-out">
                  <LabelList
                    dataKey="value"
                    position="top"
                    className="fill-foreground text-xs font-semibold"
                    formatter={compactFormatter}
                  />
                  {chartData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

function DashboardMetricTile({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeLabel,
  badgeAnimatedNumber,
  badgeTone = "default",
  animatedNumber,
}: DashboardMetricTileProps) {
  const renderValue = () => {
    if (!animatedNumber || !Number.isFinite(animatedNumber.end)) return value

    return (
      <CountUp
        end={animatedNumber.end}
        duration={animatedNumber.duration ?? 0.9}
        separator={animatedNumber.separator ?? "."}
        decimal={animatedNumber.decimal ?? ","}
        decimals={animatedNumber.decimals ?? (Number.isInteger(animatedNumber.end) ? 0 : 2)}
        prefix={animatedNumber.prefix}
        suffix={animatedNumber.suffix}
        {...COUNTUP_SCROLL_PROPS}
      />
    )
  }

  const renderBadge = () => {
    if (!badgeAnimatedNumber || !Number.isFinite(badgeAnimatedNumber.end)) return badgeLabel

    return (
      <CountUp
        end={badgeAnimatedNumber.end}
        duration={badgeAnimatedNumber.duration ?? 0.9}
        separator={badgeAnimatedNumber.separator ?? "."}
        decimal={badgeAnimatedNumber.decimal ?? ","}
        decimals={badgeAnimatedNumber.decimals ?? (Number.isInteger(badgeAnimatedNumber.end) ? 0 : 2)}
        prefix={badgeAnimatedNumber.prefix}
        suffix={badgeAnimatedNumber.suffix}
        {...COUNTUP_SCROLL_PROPS}
      />
    )
  }

  return (
    <GlassCard className="dashboard-metric-tile overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          {badgeLabel ? <ToneChip tone={badgeTone}>{renderBadge()}</ToneChip> : null}
        </div>

        <div className="mt-4 space-y-1">
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1.05rem,2.1vw,1.8rem)] font-semibold tracking-tight text-primary">
            {renderValue()}
          </div>
          {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
      </div>
    </GlassCard>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [kpis, setKpis] = useState<DashboardKpis>(DEFAULT_KPIS)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [propostaCompilada, setPropostaCompilada] = useState<PropostaCompilada>(DEFAULT_PROPOSTA_COMPILADA)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<PeriodKey>("30d")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [tab, setTab] = useState<DashTabKey>("overview")

  const roles = useMemo(() => {
    if (!profile?.role) return []
    return Array.isArray(profile.role) ? profile.role : [profile.role]
  }, [profile?.role])

  const isAdmin = roles.includes("admin")
  const hasGlobalDashboardScope = roles.some((role) =>
    role === "admin"
    || role === "gestor"
    || role === "financeiro"
    || role.startsWith("gestor_"),
  )
  const periodRange = useMemo(() => getPeriodRange(period), [period])

  const kanbanLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    KANBAN_COLUMNS.forEach((column: any) => {
      map.set(column.id, column.titulo)
      if (Array.isArray(column.statusIds)) {
        column.statusIds.forEach((statusId: string) => map.set(statusId, column.titulo))
      }
    })
    return map
  }, [])

  const formatKanbanStatus = (status: string) => kanbanLabelMap.get(status) || humanizeKey(status)

  const roleFilter = useMemo(() => {
    if (!profile?.id || hasGlobalDashboardScope) return null
    return [
      "dono_usuario_id",
      "criado_por",
      "responsavel",
      "responsavel_juridico_id",
      "responsavel_calculo_id",
    ]
      .map((field) => `${field}.eq.${profile.id}`)
      .join(",")
  }, [profile?.id, hasGlobalDashboardScope])

  useEffect(() => {
    if (!profile) return
    const showLoading = metrics === null
    loadDashboardMetrics(showLoading)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, period])

  async function safeFetch<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      console.error(`[DASHBOARD] Erro ao carregar ${label}:`, error)
      return fallback
    }
  }

  async function fetchKpis(supabase: any, range: PeriodRange): Promise<DashboardKpis> {
    const { data, error } = await supabase.rpc("dashboard_kpis", {
      p_inicio: range.inicio ? range.inicio.toISOString() : null,
      p_fim: range.fim ? range.fim.toISOString() : null,
    })

    if (error) {
      console.error("[DASHBOARD] Erro ao carregar KPIs:", error)
      return DEFAULT_KPIS
    }

    return normalizeKpis(data)
  }

  const applyRoleFilter = (query: any) => {
    if (!roleFilter) return query
    return query.or(roleFilter)
  }

  async function fetchPropostaCompiladaData(supabase: any): Promise<PropostaCompilada> {
    let query = supabase
      .from("precatorios")
      .select("proposta_maior_valor")
      .is("deleted_at", null)

    query = applyRoleFilter(query)

    const { data, error } = await query
    if (error) throw error

    const rows: PropostaCompiladaRow[] = Array.isArray(data) ? data : []

    return rows.reduce<PropostaCompilada>((acc, item) => {
      const valor = toNumber(item?.proposta_maior_valor)
      if (valor <= 0) return acc

      acc.totalMaior += valor
      acc.quantidadeComProposta += 1
      if (valor > acc.maiorProposta) acc.maiorProposta = valor
      return acc
    }, { ...DEFAULT_PROPOSTA_COMPILADA })
  }

  async function fetchComplexityData(supabase: any): Promise<ComplexityMetrics> {
    let query = supabase.from("precatorios").select("nivel_complexidade").is("deleted_at", null)
    query = applyRoleFilter(query)

    const { data, error } = await query
    if (error) throw error

    const baixa = data?.filter((p: any) => p.nivel_complexidade === "baixa").length || 0
    const media = data?.filter((p: any) => p.nivel_complexidade === "media").length || 0
    const alta = data?.filter((p: any) => p.nivel_complexidade === "alta").length || 0
    const total = baixa + media + alta

    return {
      baixa,
      media,
      alta,
      total,
      percentuais: {
        baixa: total > 0 ? (baixa / total) * 100 : 0,
        media: total > 0 ? (media / total) * 100 : 0,
        alta: total > 0 ? (alta / total) * 100 : 0,
      },
    }
  }

  async function fetchBottlenecksData(supabase: any): Promise<BottleneckItem[]> {
    let query = supabase
      .from("precatorios")
      .select("tipo_atraso, sla_status")
      .not("tipo_atraso", "is", null)
      .is("deleted_at", null)

    query = applyRoleFilter(query)

    const { data, error } = await query
    if (error) throw error

    const grouped = data?.reduce((acc: any, item: any) => {
      if (!acc[item.tipo_atraso]) acc[item.tipo_atraso] = { total: 0, com_sla_estourado: 0 }
      acc[item.tipo_atraso].total++
      if (item.sla_status === "atrasado") acc[item.tipo_atraso].com_sla_estourado++
      return acc
    }, {})

    const total = data?.length || 0

    return Object.entries(grouped || {})
      .map(([tipo_atraso, stats]: [string, any]) => ({
        tipo_atraso,
        total: stats.total,
        com_sla_estourado: stats.com_sla_estourado,
        percentual: total > 0 ? (stats.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }

  async function fetchPerformanceData(supabase: any): Promise<PerformanceMetricsType> {
    const [{ data: emFila }, { data: finalizados }, { count: slaEstourado }] = await Promise.all([
      applyRoleFilter(
        supabase
          .from("precatorios")
          .select("data_entrada_calculo")
          .eq("status", "em_calculo")
          .not("data_entrada_calculo", "is", null)
          .is("deleted_at", null)
      ),
      applyRoleFilter(
        supabase
          .from("precatorios")
          .select("data_entrada_calculo, data_calculo")
          .eq("status", "concluido")
          .not("data_entrada_calculo", "is", null)
          .not("data_calculo", "is", null)
          .is("deleted_at", null)
      ),
      applyRoleFilter(
        supabase
          .from("precatorios")
          .select("id", { count: "exact", head: true })
          .eq("sla_status", "atrasado")
          .is("deleted_at", null)
      ),
    ])

    const tempoMedioFila =
      emFila && emFila.length > 0
        ? emFila.reduce((sum: number, p: any) => {
          const horas = (Date.now() - new Date(p.data_entrada_calculo).getTime()) / (1000 * 60 * 60)
          return sum + horas
        }, 0) / emFila.length
        : 0

    const tempoMedioFinalizar =
      finalizados && finalizados.length > 0
        ? finalizados.reduce((sum: number, p: any) => {
          const horas =
            (new Date(p.data_calculo).getTime() - new Date(p.data_entrada_calculo).getTime()) / (1000 * 60 * 60)
          return sum + horas
        }, 0) / finalizados.length
        : 0

    return {
      tempo_medio_fila: tempoMedioFila,
      tempo_medio_finalizar: tempoMedioFinalizar,
      sla_estourado: slaEstourado || 0,
      total_em_calculo: emFila?.length || 0,
      total_finalizados: finalizados?.length || 0,
    }
  }

  async function fetchOperatorsData(supabase: any, userId?: string, userRoles: string[] = []): Promise<OperatorMetrics[]> {
    let query = supabase
      .from("precatorios")
      .select(
        `
        status,
        tipo_atraso,
        sla_status,
        responsavel_calculo_id,
        usuarios:responsavel_calculo_id (id, nome)
      `
      )
      .not("responsavel_calculo_id", "is", null)
      .is("deleted_at", null)

    const isAdminRole = userRoles.includes("admin")
    if (!isAdminRole && userId) query = query.eq("responsavel_calculo_id", userId)

    const { data, error } = await query
    if (error) throw error

    const grouped = data?.reduce((acc: any, item: any) => {
      const operadorId = item.responsavel_calculo_id
      const operadorNome = item.usuarios?.nome || "Desconhecido"

      if (!acc[operadorId]) {
        acc[operadorId] = {
          operador_id: operadorId,
          operador_nome: operadorNome,
          em_calculo: 0,
          finalizados: 0,
          com_atraso: 0,
          sla_estourado: 0,
        }
      }

      if (item.status === "em_calculo") acc[operadorId].em_calculo++
      if (item.status === "concluido") acc[operadorId].finalizados++
      if (item.tipo_atraso) acc[operadorId].com_atraso++
      if (item.sla_status === "atrasado") acc[operadorId].sla_estourado++

      return acc
    }, {})

    return Object.values(grouped || {}).sort((a: any, b: any) => b.em_calculo - a.em_calculo) as any[]
  }

  async function fetchCriticalData(supabase: any): Promise<CriticalPrecatorio[]> {
    const { data, error } = isAdmin
      ? await supabase.rpc("get_critical_precatorios")
      : ({ data: null, error: { message: "non_admin_fallback" } } as any)

    if (error) {
      if (isAdmin) {
        console.error("[DASHBOARD] Erro ao buscar críticos:", error)
      }
      let queryFallback = supabase
        .from("precatorios")
        .select(
          `
          id,
          titulo,
          numero_precatorio,
          status,
          nivel_complexidade,
          score_complexidade,
          sla_status,
          sla_horas,
          tipo_atraso,
          impacto_atraso,
          motivo_atraso_calculo,
          data_entrada_calculo,
          responsavel_calculo_id,
          usuarios:responsavel_calculo_id (nome)
        `
        )
        .is("deleted_at", null)
        .or("nivel_complexidade.eq.alta,sla_status.eq.atrasado,impacto_atraso.eq.alto")

      queryFallback = applyRoleFilter(queryFallback)
      queryFallback = queryFallback.order("created_at", { ascending: true }).limit(10)

      const { data: fallbackData } = await queryFallback

      return (
        fallbackData?.map((p: any) => ({
          ...p,
          responsavel_nome: p.usuarios?.nome || null,
          horas_em_fila: p.data_entrada_calculo
            ? (Date.now() - new Date(p.data_entrada_calculo).getTime()) / (1000 * 60 * 60)
            : null,
          score_criticidade:
            (p.nivel_complexidade === "alta" ? 30 : 0) +
            (p.sla_status === "atrasado" ? 40 : 0) +
            (p.impacto_atraso === "alto" ? 30 : 0),
        })) || []
      )
    }

    if (roles.includes("operador_calculo") && data) {
      return data.filter((p: any) => p.status !== "em_calculo")
    }

    return data || []
  }

  async function loadDashboardMetrics(showLoading = false) {
    if (!profile) return

    const supabase = createBrowserClient()
    if (!supabase) return

    if (showLoading) setLoading(true)
    setRefreshing(true)

    try {
      const range = getPeriodRange(period)

      const [kpisData, complexity, bottlenecks, performance, operators, critical, propostaCompiladaData] = await Promise.all([
        fetchKpis(supabase, range),
        safeFetch("complexidade", () => fetchComplexityData(supabase), DEFAULT_COMPLEXITY),
        safeFetch("gargalos", () => fetchBottlenecksData(supabase), DEFAULT_BOTTLENECKS),
        safeFetch("performance", () => fetchPerformanceData(supabase), DEFAULT_PERFORMANCE),
        safeFetch("operadores", () => fetchOperatorsData(supabase, profile.id, roles), DEFAULT_OPERATORS),
        safeFetch("críticos", () => fetchCriticalData(supabase), DEFAULT_CRITICAL),
        safeFetch("propostas compiladas", () => fetchPropostaCompiladaData(supabase), DEFAULT_PROPOSTA_COMPILADA),
      ])

      setKpis(kpisData)
      setPropostaCompilada(propostaCompiladaData)
      setMetrics({
        complexity,
        bottlenecks,
        performance,
        operators,
        critical,
        financial: {
          totalPrincipal: kpisData.resumo.total_principal,
          totalAtualizado: kpisData.resumo.total_atualizado,
        },
      })

      setLastUpdated(new Date().toISOString())
    } catch (error) {
      console.error("[DASHBOARD] Erro ao carregar dashboard:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => loadDashboardMetrics(false)

  // Memoizar derivações para evitar re-criação de arrays em cada render
  const kanbanQuantidadeRows = useMemo(
    () => buildRows(kpis.kanban.quantidade_por_status, formatKanbanStatus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kpis.kanban.quantidade_por_status]
  )
  const kanbanValorRows = useMemo(
    () => buildRows(kpis.kanban.valor_por_status, formatKanbanStatus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kpis.kanban.valor_por_status]
  )
  const financeiroConsolidadoRows = useMemo(
    () =>
      [
        { label: "Total valor principal", value: kpis.resumo.total_principal },
        { label: "Total valor atualizado", value: kpis.resumo.total_atualizado },
        { label: "Saldo liquido", value: kpis.resumo.total_saldo_liquido },
        { label: "Honorarios total", value: kpis.financeiro.honorarios_total },
        { label: "IRPF total", value: kpis.financeiro.irpf_total },
        { label: "Adiantamento total", value: kpis.financeiro.adiantamento_total },
        { label: "PSS total", value: kpis.financeiro.pss_total },
      ].filter((row) => row.value > 0),
    [
      kpis.resumo.total_principal,
      kpis.resumo.total_atualizado,
      kpis.resumo.total_saldo_liquido,
      kpis.financeiro.honorarios_total,
      kpis.financeiro.irpf_total,
      kpis.financeiro.adiantamento_total,
      kpis.financeiro.pss_total,
    ]
  )
  const propostaStatusRows = useMemo(
    () => buildRows(kpis.propostas.por_status, humanizeKey),
    [kpis.propostas.por_status]
  )
  const juridicoParecerRows = useMemo(
    () => buildRows(kpis.juridico.parecer_por_status, humanizeKey),
    [kpis.juridico.parecer_por_status]
  )
  const juridicoResultadoRows = useMemo(
    () => buildRows(kpis.juridico.resultado_final, humanizeKey),
    [kpis.juridico.resultado_final]
  )
  const atividadesRows = useMemo(
    () => buildRows(kpis.atividades.por_tipo, humanizeKey),
    [kpis.atividades.por_tipo]
  )

  // ----- loading (melhor visual) -----
  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const operational = metrics || {
    complexity: DEFAULT_COMPLEXITY,
    bottlenecks: DEFAULT_BOTTLENECKS,
    performance: DEFAULT_PERFORMANCE,
    operators: DEFAULT_OPERATORS,
    critical: DEFAULT_CRITICAL,
    totalProcessos: 0,
  }

  const financialData = {
    totalPrincipal: kpis.resumo.total_principal,
    totalAtualizado: kpis.resumo.total_atualizado,
  }

  const docsPercent = kpis.documentos_certidoes.total_docs
    ? (kpis.documentos_certidoes.docs_recebidos / kpis.documentos_certidoes.total_docs) * 100
    : 0

  const certPercent = kpis.documentos_certidoes.total_certidoes
    ? (kpis.documentos_certidoes.certidoes_recebidas / kpis.documentos_certidoes.total_certidoes) * 100
    : 0

  // kanbanQuantidadeRows, kanbanValorRows, financeiroConsolidadoRows,
  // propostaStatusRows, juridicoParecerRows, juridicoResultadoRows, atividadesRows
  // são agora memoizados com useMemo acima do early return

  const topCritical = operational.critical.slice(0, 7)

  const slaBase =
    kpis.sla.no_prazo + kpis.sla.atencao + kpis.sla.atrasado + kpis.sla.nao_iniciado + kpis.sla.concluido

  const slaHealthyPercent = slaBase > 0 ? ((kpis.sla.no_prazo + kpis.sla.concluido) / slaBase) * 100 : 0
  return (
    <div className="dashboard-revamp relative min-h-[calc(100vh-4rem)] overflow-hidden lg:-m-6">
      <div className="absolute inset-0 -z-20 bg-[#f0f1f5]" />

      <div className="relative z-10 w-full space-y-5 px-4 py-6 sm:px-6 lg:px-6">

        {/* ===== HERO ===== */}
        <div className="relative overflow-hidden rounded-[28px] border border-black/[0.07] bg-[rgba(255,255,255,0.92)] backdrop-blur-xl" style={clayCardShadow}>
          <div className="p-4 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.9fr)]">

              {/* LEFT */}
              <div>
                <span className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full bg-primary/10 px-3 py-1.5 text-[13px] font-bold tracking-wide text-primary">
                  <span className="shrink-0">●</span>
                  <span className="truncate">CRM Precatórios · {isAdmin ? "visão consolidada" : roles.includes("juridico") ? `jurídico: ${profile?.nome ?? "usuário"}` : `operador: ${profile?.nome ?? "usuário"}`}</span>
                </span>
                <p className="mt-3 text-[clamp(1.55rem,6vw,4.4rem)] font-black leading-none tracking-[-0.05em] text-primary">
                  Dashboard Estratégico
                </p>
                <h1 className="mt-3 text-[clamp(1rem,3vw,2.2rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
                  Carteira, riscos e performance.
                </h1>
                <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-[15px]">
                  {isAdmin
                    ? "KPIs críticos da operação de precatórios."
                    : roles.includes("juridico")
                      ? `Prazos e pareceres sob sua responsabilidade, ${profile?.nome ?? "usuário"}.`
                      : `Fila, pendências e metas do dia, ${profile?.nome ?? "usuário"}.`}
                  {lastUpdated ? ` Atualizado em ${new Date(lastUpdated).toLocaleString("pt-BR")}.` : ""}
                </p>

                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  {/* Segmented tabs — full width on mobile, auto on sm+ */}
                  <div className="flex w-full gap-1 rounded-2xl border border-border bg-muted/40 p-1.5 sm:w-auto sm:inline-flex">
                    {([
                      ["overview", "Visão geral"],
                      ["details", "Detalhes"],
                      ["operation", "Operação"],
                    ] as [DashTabKey, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={[
                          "flex-1 whitespace-nowrap rounded-xl px-2 py-2 text-[11.5px] font-bold transition-all duration-200 sm:flex-none sm:px-4 sm:py-2.5 sm:text-sm",
                          tab === key
                            ? "bg-primary text-white shadow-[0_8px_20px_rgba(14,77,106,.32)]"
                            : "text-muted-foreground hover:bg-background/60",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Period + Refresh em linha única no mobile */}
                  <div className="flex items-center gap-2 sm:contents">
                    {/* Period select */}
                    <Select
                      aria-label="Período do dashboard"
                      selectedKey={period}
                      onSelectionChange={(k) => { if (k) setPeriod(String(k) as PeriodKey) }}
                      className="flex-1 sm:w-[200px] sm:flex-none [--color-field-focus:var(--background)] [--color-field-border-focus:var(--border)] [--color-field-border-hover:var(--border)]"
                    >
                      <Label className="sr-only">Período</Label>
                      <Select.Trigger
                        className="h-10 rounded-xl border border-border bg-background text-foreground shadow-sm data-[focus=true]:!bg-background data-[focus-visible=true]:!bg-background data-[hovered=true]:!bg-background"
                        style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Select.Value />
                        <Select.Indicator className="text-foreground/70" />
                      </Select.Trigger>
                      <Select.Popover className="z-[120] rounded-xl border border-border !bg-background text-foreground shadow-sm">
                        <ListBox className="!bg-background">
                          {PERIOD_OPTIONS.map((o) => (
                            <ListBox.Item key={o.value} id={o.value} textValue={o.label} className="!bg-background data-[hovered=true]:!bg-muted">
                              {o.label}<ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    {/* Refresh — ícone no mobile, texto no sm+ */}
                    <Button
                      onPress={handleRefresh}
                      isDisabled={refreshing}
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-border"
                    >
                      <span className="inline-flex items-center gap-2">
                        {refreshing ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="hidden sm:inline">Atualizar painel</span>
                      </span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* RIGHT — 2 hero panels */}
              <div className="grid gap-3.5 content-start">
                {/* Saldo líquido */}
                <div className="rounded-[22px] border border-black/[0.07] bg-white p-4" style={clayCardShadow}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Saldo líquido monitorado</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Valor consolidado do período selecionado.</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-black/[0.06] bg-[#f2f3f7] px-3 py-1.5 text-xs font-bold text-[#374151]">
                      SLA saudável{" "}
                      <CountUp end={slaHealthyPercent} duration={0.9} separator="." decimal="," decimals={0} suffix="%" {...COUNTUP_SCROLL_PROPS} />
                    </span>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <div className="text-[clamp(1.15rem,5vw,2rem)] font-bold leading-none tracking-[-0.03em]">
                        <CountUp end={kpis.resumo.total_saldo_liquido} duration={0.9} separator="." decimal="," decimals={2} prefix={CURRENCY_PREFIX} {...COUNTUP_SCROLL_PROPS} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Saldo líquido do período</p>
                    </div>
                    <ToneChip tone={slaHealthyPercent >= 80 ? "success" : slaHealthyPercent >= 60 ? "warning" : "danger"}>
                      ↗ {slaHealthyPercent >= 80 ? "tendência positiva" : "tendência de atenção"}
                    </ToneChip>
                  </div>
                </div>

                {/* Prioridades visuais */}
                <div className="rounded-[22px] border border-black/[0.07] bg-white p-4" style={clayCardShadow}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Prioridades visuais</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Semântica forte para risco, SLA e gargalo.</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-black/[0.06] bg-[#f2f3f7] px-3 py-1.5 text-xs font-bold text-[#374151]">
                      {kpis.sla.atrasado + kpis.chat.mensagens_nao_lidas} alertas
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ToneChip tone={slaHealthyPercent >= 80 ? "success" : "warning"}>
                      ● SLA {slaHealthyPercent >= 80 ? "saudável" : "em atenção"}
                    </ToneChip>
                    {kpis.oficios.analise_processual_inicial > 0 && (
                      <ToneChip tone="warning">● {formatCount(kpis.oficios.analise_processual_inicial)} aguardando ofício</ToneChip>
                    )}
                    {kpis.chat.mensagens_nao_lidas > 0 && (
                      <ToneChip tone="danger">● {kpis.chat.mensagens_nao_lidas} chats pendentes</ToneChip>
                    )}
                    <ToneChip tone="primary">● {kpis.calculo.em_calculo} em cálculo</ToneChip>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {tab === "overview" && (
          <div className="space-y-5">

            {/* 4 KPI CARDS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Ativos */}
              <div className="relative rounded-[24px] border border-black/[0.07] bg-white p-5" style={clayCardShadow}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Ativos monitorados</div>
                    <div className="mt-3 text-[clamp(1.7rem,3vw,2.2rem)] font-extrabold leading-none tracking-[-0.03em]">
                      <CountUp end={kpis.resumo.total_precatorios} duration={0.9} separator="." decimal="," decimals={0} {...COUNTUP_SCROLL_PROPS} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Base operacional no período</div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/[0.06] bg-[#f2f3f7] text-[#0e4d6a]" style={clayInsetShadow}>
                    <Layers className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ToneChip tone="primary">+{formatCount(kpis.periodo_kpis.novos_precatorios)} no período</ToneChip>
                </div>
              </div>

              {/* Valor principal */}
              <div className="relative rounded-[24px] border border-black/[0.07] bg-white p-5" style={clayCardShadow}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Valor principal</div>
                    <div className="mt-3 text-[clamp(1.2rem,2.2vw,1.7rem)] font-extrabold leading-none tracking-[-0.03em]">
                      <CountUp end={kpis.resumo.total_principal} duration={0.9} separator="." decimal="," decimals={2} prefix={CURRENCY_PREFIX} {...COUNTUP_SCROLL_PROPS} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Soma dos valores originais</div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/[0.06] bg-[#f2f3f7] text-[#0e4d6a]" style={clayInsetShadow}>
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ToneChip tone="primary">Atualizado em tempo real</ToneChip>
                </div>
              </div>

              {/* SLA */}
              <div className="relative rounded-[24px] border border-black/[0.07] bg-white p-5" style={clayCardShadow}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">SLA operacional</div>
                    <div className="mt-3 text-[clamp(1.7rem,3vw,2.2rem)] font-extrabold leading-none tracking-[-0.03em]">
                      <CountUp end={slaHealthyPercent} duration={0.9} separator="." decimal="," decimals={0} suffix="%" {...COUNTUP_SCROLL_PROPS} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Indicador central de prazo</div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/[0.06] bg-[#f2f3f7] text-[#0e4d6a]" style={clayInsetShadow}>
                    <Gauge className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {kpis.sla.atrasado > 0
                    ? <ToneChip tone="danger">{formatCount(kpis.sla.atrasado)} críticos</ToneChip>
                    : <ToneChip tone="success">Zero atrasados</ToneChip>}
                  {kpis.sla.atencao > 0 && <ToneChip tone="warning">{formatCount(kpis.sla.atencao)} em atenção</ToneChip>}
                </div>
              </div>

              {/* Mensagens */}
              <div className="relative rounded-[24px] border border-black/[0.07] bg-white p-5" style={clayCardShadow}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Mensagens / alertas</div>
                    <div className="mt-3 text-[clamp(1.7rem,3vw,2.2rem)] font-extrabold leading-none tracking-[-0.03em]">
                      <CountUp end={kpis.chat.mensagens_nao_lidas} duration={0.9} separator="." decimal="," decimals={0} {...COUNTUP_SCROLL_PROPS} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Alertas como ação, não só número</div>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/[0.06] bg-[#f2f3f7] text-[#0e4d6a]" style={clayInsetShadow}>
                    <MessageSquare className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {kpis.chat.mensagens_nao_lidas > 0
                    ? <ToneChip tone="danger">pendências de chat</ToneChip>
                    : <ToneChip tone="success">Sem pendências</ToneChip>}
                </div>
              </div>
            </div>

            {/* FINANCIAL + RADAR */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_.9fr]">
              {/* Resumo financeiro */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="flex items-start justify-between gap-3 p-5 pb-0">
                  <div>
                    <h2 className="text-[15px] font-semibold">Resumo financeiro</h2>
                    <p className="mt-1.5 text-xs text-muted-foreground">Valores principais do portfólio no período selecionado.</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-black/[0.06] bg-[#f2f3f7] px-3 py-1.5 text-xs font-bold text-[#374151]">Destaque: saldo líquido</span>
                </div>
                <div className="p-5">
                  <div className="h-[180px] w-full" style={{ minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart
                        data={[
                          { name: "Principal", value: kpis.resumo.total_principal },
                          { name: "Atualizado", value: kpis.resumo.total_atualizado },
                          { name: "Saldo", value: kpis.resumo.total_saldo_liquido },
                        ]}
                        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={76}
                          tickFormatter={(v) =>
                            new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1, style: "currency", currency: "BRL" }).format(v)
                          }
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip cursor={{ fill: "hsl(var(--muted)/0.35)" }} formatter={(v: any) => formatCurrency(Number(v))} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
                          {["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"].map((color, i) => (
                            <Cell key={i} fill={color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-black/[0.06] bg-[#f2f3f7] p-4" style={clayInsetShadow}>
                      <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Total atualizado</div>
                      <div className="mt-2 text-[1.4rem] font-extrabold tracking-[-0.02em]">
                        <CountUp end={kpis.resumo.total_atualizado} duration={0.9} separator="." decimal="," decimals={2} prefix={CURRENCY_PREFIX} {...COUNTUP_SCROLL_PROPS} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">Valores corrigidos (última atualização)</div>
                    </div>
                    <div className="rounded-[18px] border border-black/[0.06] bg-[#f2f3f7] p-4" style={clayInsetShadow}>
                      <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">PSS total</div>
                      <div className="mt-2 text-[1.4rem] font-extrabold tracking-[-0.02em]">
                        <CountUp end={kpis.financeiro.pss_total} duration={0.9} separator="." decimal="," decimals={2} prefix={CURRENCY_PREFIX} {...COUNTUP_SCROLL_PROPS} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">Indicador secundário, ainda legível</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Radar operacional */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="flex items-start justify-between gap-3 p-5 pb-0">
                  <div>
                    <h2 className="text-[15px] font-semibold">Radar operacional</h2>
                    <p className="mt-1.5 text-xs text-muted-foreground">Concentra risco, SLA, documentos e gargalos.</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-black/[0.06] bg-[#f2f3f7] px-3 py-1.5 text-xs font-bold text-[#374151]">Leitura rápida</span>
                </div>
                <div className="grid gap-4 p-5">
                  {/* Ring */}
                  <div className="flex items-center gap-4">
                    <div
                      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `conic-gradient(hsl(var(--primary)) 0 ${(slaHealthyPercent / 100) * 360}deg, hsl(var(--muted)) ${(slaHealthyPercent / 100) * 360}deg 360deg)` }}
                    >
                      <div className="absolute inset-3 rounded-full bg-background" />
                      <span className="relative z-10 text-lg font-extrabold tracking-[-0.02em]">{slaHealthyPercent.toFixed(0)}%</span>
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Eficiência do fluxo</div>
                      <div className="mt-1.5 text-lg font-extrabold">
                        {slaHealthyPercent >= 80 ? "Alta com controle" : slaHealthyPercent >= 60 ? "Moderada com atenção" : "Baixa — ação necessária"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">SLA como indicador de saúde do fluxo.</div>
                    </div>
                  </div>
                  {/* Progress bars */}
                  <div className="grid gap-3">
                    {[
                      { label: "Documentos recebidos", value: docsPercent, color: "bg-amber-400" },
                      { label: "Certidões recebidas", value: certPercent, color: "bg-red-400" },
                      { label: "SLA saudável", value: slaHealthyPercent, color: "bg-emerald-500" },
                      {
                        label: "Cálculo em andamento",
                        value: kpis.resumo.total_precatorios > 0 ? (kpis.calculo.em_calculo / kpis.resumo.total_precatorios) * 100 : 0,
                        color: "bg-blue-500",
                        count: kpis.calculo.em_calculo,
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[18px] border border-black/[0.06] bg-[#f2f3f7] p-3.5" style={clayInsetShadow}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{item.label}</span>
                          <span className="text-sm font-extrabold tabular-nums">
                            {(item as any).count !== undefined ? `${formatCount((item as any).count)} itens` : `${item.value.toFixed(0)}%`}
                          </span>
                        </div>
                        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className={["h-full rounded-full", item.color].join(" ")} style={{ width: `${Math.min(Math.max(item.value, 0), 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3-col: valor por status + gargalos + heatmap */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_.9fr_.8fr]">

              {/* Valor por status */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="flex items-start justify-between gap-3 p-5 pb-0">
                  <div>
                    <h2 className="text-[15px] font-semibold">Valor por status</h2>
                    <p className="mt-1.5 text-xs text-muted-foreground">Prioridade visual — destaque ao topo, resumo do resto.</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-black/[0.06] bg-[#f2f3f7] px-3 py-1.5 text-xs font-bold text-[#374151]">Top 6 por valor</span>
                </div>
                <div className="grid gap-3 p-5">
                  {kanbanValorRows.slice(0, 6).map((row, i) => {
                    const maxVal = kanbanValorRows[0]?.value || 1
                    const pct = Math.min((row.value / maxVal) * 100, 100)
                    const colors = ["bg-[#0e4d6a]", "bg-[#1a6080]", "bg-[#2578a0]", "bg-[#15803d]", "bg-[#1d4ed8]"]
                    const dots   = ["bg-[#0e4d6a]", "bg-[#1a6080]", "bg-[#2578a0]", "bg-[#15803d]", "bg-[#1d4ed8]"]
                    return (
                      <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem] items-center gap-3 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={["h-2.5 w-2.5 shrink-0 rounded-full", dots[i % dots.length]].join(" ")} />
                          <span className="truncate">{row.label}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                          <div className={["h-full rounded-full", colors[i % colors.length]].join(" ")} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-right font-extrabold tabular-nums text-foreground">
                          {new Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL", maximumFractionDigits: 1 }).format(row.value)}
                        </div>
                      </div>
                    )
                  })}
                  {kanbanValorRows.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">Sem dados de valor por status</div>
                  )}
                </div>
              </div>

              {/* Gargalos */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="p-5 pb-0">
                  <h2 className="text-[15px] font-semibold">Gargalos e metas</h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">Informações acionáveis, não apenas decorativas.</p>
                </div>
                <div className="grid gap-3.5 p-5">
                  {[
                    {
                      label: "Ofícios pendentes",
                      count: kpis.oficios.analise_processual_inicial,
                      tone: kpis.oficios.analise_processual_inicial > 0 ? "warning" : "default",
                      desc: "Agrupar gargalos por impacto no fluxo.",
                    },
                    {
                      label: "Pronto para cálculo",
                      count: kpis.calculo.pronto_calculo,
                      tone: "primary",
                      desc: "Ponte visual entre volume, valor e SLA.",
                    },
                    {
                      label: "Mensagens não lidas",
                      count: kpis.chat.mensagens_nao_lidas,
                      tone: kpis.chat.mensagens_nao_lidas > 0 ? "danger" : "default",
                      desc: "Alertas com peso visual imediato.",
                    },
                    {
                      label: "SLA atrasado",
                      count: kpis.sla.atrasado,
                      tone: kpis.sla.atrasado > 0 ? "danger" : "success",
                      desc: "Precatórios com prazo estourado.",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[22px] border border-black/[0.06] bg-[#f2f3f7] p-4" style={clayInsetShadow}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-foreground">{item.label}</span>
                        <ToneChip tone={item.tone as any}>{formatCount(item.count)} {item.count === 1 ? "item" : "itens"}</ToneChip>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mapa de carga */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="p-5 pb-0">
                  <h2 className="text-[15px] font-semibold">Mapa de carga</h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">Distribuição de atividades no período.</p>
                </div>
                <div className="p-5">
                  {(() => {
                    const total = Object.values(kpis.atividades.por_tipo).reduce((a, b) => a + b, 0)
                    const cells = Array.from({ length: 28 }, (_, i) => (i * 7 + (total % 13) + (i % 5)) % 5)
                    return (
                      <div className="grid grid-cols-7 gap-2">
                        {cells.map((lv, i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-[14px] border border-border/20"
                            style={{
                              background:
                                lv === 0 ? "#f0f1f5"
                                  : lv === 1 ? "rgba(14,77,106,.15)"
                                    : lv === 2 ? "rgba(14,77,106,.30)"
                                      : lv === 3 ? "rgba(14,77,106,.50)"
                                        : "rgba(14,77,106,.75)",
                            }}
                          />
                        ))}
                      </div>
                    )
                  })()}
                  <div className="mt-4 flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "rgba(14,77,106,.15)" }} />
                      baixo
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "rgba(14,77,106,.75)" }} />
                      alto
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 SIMPLE STATS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Credores", value: kpis.resumo.total_credores, desc: "Base cadastrada de credores monitorados.", isCurrency: false },
                { label: "Propostas", value: kpis.propostas.valor_total, desc: "Valor total de propostas no sistema.", isCurrency: true },
                { label: "Maior proposta", value: propostaCompilada.maiorProposta, desc: "Maior valor de proposta registrado.", isCurrency: true },
                { label: "Mensagens não lidas", value: kpis.chat.mensagens_nao_lidas, desc: "Transformar em CTA quando urgente.", isCurrency: false },
              ].map((stat, i) => (
                <div key={i} className="rounded-[24px] border border-black/[0.07] bg-white p-5" style={clayCardShadow}>
                  <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">{stat.label}</div>
                  <div className="mt-3 text-[clamp(1.5rem,2.8vw,2rem)] font-extrabold leading-none tracking-[-0.03em]">
                    {stat.isCurrency
                      ? <CountUp end={stat.value} duration={0.9} separator="." decimal="," decimals={2} prefix={CURRENCY_PREFIX} {...COUNTUP_SCROLL_PROPS} />
                      : <CountUp end={stat.value} duration={0.9} separator="." decimal="," decimals={0} {...COUNTUP_SCROLL_PROPS} />}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{stat.desc}</div>
                </div>
              ))}
            </div>

            {/* 2-col: quantidade por status + critical table */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

              {/* Quantidade por status */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="flex items-start justify-between gap-3 p-5 pb-0">
                  <div>
                    <h2 className="text-[15px] font-semibold">Quantidade por status</h2>
                    <p className="mt-1.5 text-xs text-muted-foreground">Destacar o topo, condensar cauda longa, detalhar sob demanda.</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-black/[0.06] bg-[#f2f3f7] px-3 py-1.5 text-xs font-bold text-[#374151]">Top 5</span>
                </div>
                <div className="grid gap-3 p-5">
                  {kanbanQuantidadeRows.slice(0, 5).map((row, i) => {
                    const maxVal = kanbanQuantidadeRows[0]?.value || 1
                    const pct = Math.min((row.value / maxVal) * 100, 100)
                    const colors = ["bg-[#0e4d6a]", "bg-[#1a6080]", "bg-[#2578a0]", "bg-[#15803d]", "bg-[#1d4ed8]"]
                    const dots   = ["bg-[#0e4d6a]", "bg-[#1a6080]", "bg-[#2578a0]", "bg-[#15803d]", "bg-[#1d4ed8]"]
                    return (
                      <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem] items-center gap-3 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={["h-2.5 w-2.5 shrink-0 rounded-full", dots[i % dots.length]].join(" ")} />
                          <span className="truncate">{row.label}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                          <div className={["h-full rounded-full", colors[i % colors.length]].join(" ")} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-right font-extrabold tabular-nums">{formatCount(row.value)}</div>
                      </div>
                    )
                  })}
                  {kanbanQuantidadeRows.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">Sem dados de quantidade por status</div>
                  )}
                </div>
              </div>

              {/* Precatórios críticos */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="flex items-start justify-between gap-3 p-5 pb-0">
                  <div>
                    <h2 className="text-[15px] font-semibold">Precatórios críticos</h2>
                    <p className="mt-1.5 text-xs text-muted-foreground">Status semântico, responsável e score para ação rápida.</p>
                  </div>
                  <Button
                    onPress={handleRefresh}
                    isDisabled={refreshing}
                    variant="outline"
                    size="sm"
                    className="border-border"
                  >
                    <span className="inline-flex items-center gap-2">
                      {refreshing ? <Spinner size="sm" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      <span>Atualizar</span>
                    </span>
                  </Button>
                </div>
                <div className="p-5">
                  {topCritical.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <CheckCircle2 className="mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Sem precatórios críticos no período.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[440px] text-sm">
                      <thead>
                        <tr className="border-b border-black/[0.06]">
                          <th className="pb-2.5 text-left text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Precatório</th>
                          <th className="pb-2.5 text-left text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Responsável</th>
                          <th className="pb-2.5 text-left text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">SLA</th>
                          <th className="pb-2.5 text-right text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCritical.map((item) => {
                          const initials = (item.responsavel_nome ?? "?")
                            .split(" ")
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                          return (
                            <tr key={item.id} className="border-b border-black/[0.04] last:border-0 hover:bg-muted/20">
                              <td className="py-3">
                                <div className="flex flex-col">
                                  <span className="font-medium">{item.numero_precatorio ?? item.titulo}</span>
                                  <span className="text-xs text-muted-foreground">{humanizeKey(item.status ?? "")}</span>
                                </div>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0e4d6a] text-xs font-extrabold text-white" style={clayPrimaryShadow}>
                                    {initials}
                                  </div>
                                  <span>{item.responsavel_nome ?? "Não atribuído"}</span>
                                </div>
                              </td>
                              <td className="py-3">
                                <ToneChip
                                  tone={
                                    item.sla_status === "atrasado"
                                      ? "danger"
                                      : item.sla_status === "atencao"
                                        ? "warning"
                                        : "success"
                                  }
                                >
                                  {humanizeKey(item.sla_status ?? "no_prazo")}
                                </ToneChip>
                              </td>
                              <td className="py-3 text-right font-mono font-extrabold tabular-nums">
                                {formatCount(item.score_criticidade ?? 0)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== DETAILS TAB ===== */}
        {tab === "details" && (
          <div className="space-y-5">

            {/* Movimento do período — 5 KPI cards */}
            <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
              <div className="flex items-start justify-between gap-3 p-5 pb-0">
                <div>
                  <h2 className="text-[15px] font-semibold">Movimento do período</h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {periodRange.inicio && periodRange.fim
                      ? `${periodRange.label} — ${formatDateShort(periodRange.inicio)} a ${formatDateShort(periodRange.fim)}`
                      : periodRange.label}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full border border-black/[0.06] bg-[#f2f3f7] px-3 py-1.5 text-xs font-bold text-[#374151]">Período selecionado</span>
              </div>
              <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: "Novos precatórios", value: kpis.periodo_kpis.novos_precatorios, icon: <Layers className="h-4 w-4" />, tone: "primary" },
                  { label: "Atualizados", value: kpis.periodo_kpis.precatorios_atualizados, icon: <RefreshCw className="h-4 w-4" />, tone: "default" },
                  { label: "Propostas criadas", value: kpis.periodo_kpis.propostas_criadas, icon: <FileText className="h-4 w-4" />, tone: "default" },
                  { label: "Atividades", value: kpis.periodo_kpis.atividades_periodo, icon: <ListChecks className="h-4 w-4" />, tone: "default" },
                  { label: "Mensagens chat", value: kpis.periodo_kpis.mensagens_chat_periodo, icon: <MessageSquare className="h-4 w-4" />, tone: kpis.periodo_kpis.mensagens_chat_periodo > 0 ? "warning" : "default" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-black/[0.06] bg-[#f2f3f7] p-4" style={clayInsetShadow}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">{item.label}</div>
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-[#f2f3f7] text-[#0e4d6a]">
                        {item.icon}
                      </div>
                    </div>
                    <div className="mt-2 text-[1.6rem] font-extrabold leading-none tracking-[-0.03em]">
                      <CountUp end={item.value} duration={0.9} separator="." decimal="," decimals={0} {...COUNTUP_SCROLL_PROPS} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Propostas + Credores 2-col */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Propostas */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="flex items-start justify-between gap-3 p-5 pb-0">
                  <div>
                    <h2 className="text-[15px] font-semibold">Propostas</h2>
                    <p className="mt-1.5 text-xs text-muted-foreground">Valores e distribuição por status</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-black/[0.06] bg-[#f2f3f7] px-3 py-1.5 text-xs font-bold text-[#374151]">
                    {formatCount(propostaCompilada.quantidadeComProposta)} com proposta
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
                  {[
                    { label: "Valor total", value: kpis.propostas.valor_total, isCurrency: true },
                    { label: "Ticket médio", value: kpis.propostas.ticket_medio, isCurrency: true },
                    { label: "Desconto médio", value: kpis.propostas.desconto_medio, suffix: "%" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-[18px] border border-black/[0.06] bg-[#f2f3f7] p-3.5" style={clayInsetShadow}>
                      <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">{s.label}</div>
                      <div className="mt-2 text-[1.1rem] font-extrabold leading-none tracking-[-0.02em]">
                        {s.isCurrency
                          ? <CountUp end={s.value} duration={0.9} separator="." decimal="," decimals={2} prefix={CURRENCY_PREFIX} {...COUNTUP_SCROLL_PROPS} />
                          : <CountUp end={s.value} duration={0.9} separator="." decimal="," decimals={2} suffix={s.suffix} {...COUNTUP_SCROLL_PROPS} />}
                      </div>
                    </div>
                  ))}
                </div>
                {propostaStatusRows.length > 0 && (
                  <div className="border-t border-black/[0.04] p-5 pt-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-black/[0.06]">
                          <th className="pb-2 text-left text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Status</th>
                          <th className="pb-2 text-right text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propostaStatusRows.map((row) => (
                          <tr key={row.label} className="border-b border-black/[0.04] last:border-0">
                            <td className="py-2 font-medium">{row.label}</td>
                            <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">{formatCount(row.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Credores + Jurídico */}
              <div className="flex flex-col gap-5">
                <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                  <div className="p-5 pb-0">
                    <h2 className="text-[15px] font-semibold">Credores</h2>
                    <p className="mt-1.5 text-xs text-muted-foreground">Base cadastrada no sistema</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                    {[
                      { label: "Total credores", value: kpis.credores.total_credores, isCurrency: false },
                      { label: "Valor total principal", value: kpis.credores.valor_total_principal, isCurrency: true },
                    ].map((s) => (
                      <div key={s.label} className="rounded-[18px] border border-black/[0.06] bg-[#f2f3f7] p-4" style={clayInsetShadow}>
                        <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">{s.label}</div>
                        <div className="mt-2 text-[1.3rem] font-extrabold leading-none tracking-[-0.02em]">
                          {s.isCurrency
                            ? <CountUp end={s.value} duration={0.9} separator="." decimal="," decimals={2} prefix={CURRENCY_PREFIX} {...COUNTUP_SCROLL_PROPS} />
                            : <CountUp end={s.value} duration={0.9} separator="." decimal="," decimals={0} {...COUNTUP_SCROLL_PROPS} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                  <div className="p-5 pb-0">
                    <h2 className="text-[15px] font-semibold">Ofícios</h2>
                    <p className="mt-1.5 text-xs text-muted-foreground">Pendências e conclusões processuais</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-5">
                    {[
                      { label: "Análise inicial", value: kpis.oficios.analise_processual_inicial, tone: kpis.oficios.analise_processual_inicial > 0 ? "warning" : "default" },
                      { label: "Com ofício", value: kpis.oficios.com_oficio, tone: "success" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-[18px] border border-black/[0.06] bg-[#f2f3f7] p-4" style={clayInsetShadow}>
                        <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">{s.label}</div>
                        <div className="mt-2 text-[1.6rem] font-extrabold leading-none tracking-[-0.02em]">
                          <CountUp end={s.value} duration={0.9} separator="." decimal="," decimals={0} {...COUNTUP_SCROLL_PROPS} />
                        </div>
                        <div className="mt-2">
                          <ToneChip tone={s.tone as any}>{s.value === 1 ? "1 item" : `${formatCount(s.value)} itens`}</ToneChip>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SLA + Cálculo */}
            <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
              <div className="flex items-start justify-between gap-3 p-5 pb-0">
                <div>
                  <h2 className="text-[15px] font-semibold">SLA e cálculo</h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">Controle de prazo e progresso da fila de cálculo</p>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full border border-black/[0.06] bg-[#f2f3f7] px-3 py-1.5 text-xs font-bold text-[#374151]">{slaHealthyPercent.toFixed(0)}% saudável</span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: "Pronto p/ cálculo", value: kpis.calculo.pronto_calculo, tone: "primary" },
                  { label: "Em cálculo", value: kpis.calculo.em_calculo, tone: "default" },
                  { label: "No prazo", value: kpis.sla.no_prazo, tone: "success" },
                  { label: "Em atenção", value: kpis.sla.atencao, tone: kpis.sla.atencao > 0 ? "warning" : "default" },
                  { label: "Atrasado", value: kpis.sla.atrasado, tone: kpis.sla.atrasado > 0 ? "danger" : "success" },
                  { label: "Concluídos", value: kpis.calculo.concluido, tone: "success" },
                  { label: "Não iniciado", value: kpis.sla.nao_iniciado, tone: "default" },
                  { label: "Desatualizados", value: kpis.calculo.desatualizado, tone: kpis.calculo.desatualizado > 0 ? "warning" : "default" },
                  { label: "Tempo médio", value: null, displayValue: formatHours(kpis.sla.tempo_medio_calculo_horas), tone: "default" },
                  { label: "Versões média", value: kpis.calculo.versoes_media, decimals: 1, tone: "default" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-black/[0.06] bg-[#f2f3f7] p-3.5" style={clayInsetShadow}>
                    <div className="text-[11px] font-extrabold uppercase tracking-[.08em] text-muted-foreground">{item.label}</div>
                    <div className="mt-2 text-[1.5rem] font-extrabold leading-none tracking-[-0.03em]">
                      {item.displayValue
                        ? <span>{item.displayValue}</span>
                        : <CountUp end={item.value ?? 0} duration={0.9} separator="." decimal="," decimals={item.decimals ?? 0} {...COUNTUP_SCROLL_PROPS} />}
                    </div>
                    <div className="mt-2">
                      <ToneChip tone={item.tone as any}>{item.displayValue ?? (item.decimals ? (item.value ?? 0).toFixed(item.decimals) : formatCount(item.value ?? 0))}</ToneChip>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documentos + Certidões + Jurídico 3-col */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* Documentos */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="p-5 pb-0">
                  <h2 className="text-[15px] font-semibold">Documentos do credor</h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">Progresso de recebimento</p>
                </div>
                <div className="p-5">
                  <div className="flex items-end justify-between gap-2">
                    <div className="text-[2rem] font-extrabold leading-none tracking-[-0.03em]">{docsPercent.toFixed(0)}%</div>
                    <ToneChip tone={docsPercent >= 80 ? "success" : docsPercent >= 50 ? "warning" : "danger"}>
                      {formatCount(kpis.documentos_certidoes.docs_recebidos)} / {formatCount(kpis.documentos_certidoes.total_docs)}
                    </ToneChip>
                  </div>
                  <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(docsPercent, 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Documentos recebidos sobre o total esperado</p>
                </div>
              </div>

              {/* Certidões */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="p-5 pb-0">
                  <h2 className="text-[15px] font-semibold">Certidões</h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">Progresso e vencimentos</p>
                </div>
                <div className="p-5">
                  <div className="flex items-end justify-between gap-2">
                    <div className="text-[2rem] font-extrabold leading-none tracking-[-0.03em]">{certPercent.toFixed(0)}%</div>
                    <ToneChip tone={certPercent >= 80 ? "success" : certPercent >= 50 ? "warning" : "danger"}>
                      {formatCount(kpis.documentos_certidoes.certidoes_recebidas)} / {formatCount(kpis.documentos_certidoes.total_certidoes)}
                    </ToneChip>
                  </div>
                  <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(certPercent, 100)}%` }} />
                  </div>
                  <div className="mt-3">
                    <ToneChip tone={kpis.documentos_certidoes.certidoes_vencidas > 0 ? "danger" : "success"}>
                      {kpis.documentos_certidoes.certidoes_vencidas > 0
                        ? `${formatCount(kpis.documentos_certidoes.certidoes_vencidas)} vencidas`
                        : "Nenhuma vencida"}
                    </ToneChip>
                  </div>
                </div>
              </div>

              {/* Jurídico */}
              <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                <div className="p-5 pb-0">
                  <h2 className="text-[15px] font-semibold">Jurídico</h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">Pareceres e resultados finais</p>
                </div>
                <div className="p-5">
                  {juridicoParecerRows.length === 0 && juridicoResultadoRows.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Sem dados jurídicos no período</p>
                  ) : (
                    <div className="grid gap-3">
                      {[...juridicoParecerRows.slice(0, 3), ...juridicoResultadoRows.slice(0, 3)].map((row) => (
                        <div key={row.label} className="flex items-center justify-between rounded-[14px] border border-black/[0.04] bg-[#f2f3f7] px-3.5 py-2.5">
                          <span className="text-sm font-medium truncate">{row.label}</span>
                          <span className="ml-2 shrink-0 font-mono text-sm font-extrabold tabular-nums">{formatCount(row.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Atividades */}
            <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
              <div className="flex items-start justify-between gap-3 p-5 pb-0">
                <div>
                  <h2 className="text-[15px] font-semibold">Atividades por tipo</h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">Eventos registrados no período selecionado</p>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full border border-black/[0.06] bg-[#f2f3f7] px-3 py-1.5 text-xs font-bold text-[#374151]">
                  {formatCount(atividadesRows.reduce((a, r) => a + r.value, 0))} total
                </span>
              </div>
              <div className="p-5">
                {atividadesRows.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Sem atividades no período</p>
                ) : (
                  <div className="grid gap-3">
                    {atividadesRows.map((row, i) => {
                      const maxVal = atividadesRows[0]?.value || 1
                      const pct = Math.min((row.value / maxVal) * 100, 100)
                      const colors = ["bg-[#0e4d6a]", "bg-[#1a6080]", "bg-[#2578a0]", "bg-[#15803d]", "bg-[#1d4ed8]", "bg-[#92400e]"]
                      return (
                        <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm">
                          <span className="truncate font-medium">{row.label}</span>
                          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                            <div className={["h-full rounded-full", colors[i % colors.length]].join(" ")} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-right font-extrabold tabular-nums">{formatCount(row.value)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== OPERATION TAB ===== */}
        {tab === "operation" && (
          <div className="space-y-5">

            {/* ComplexityOverview */}
            <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
              <div className="p-5 pb-0">
                <h2 className="text-[15px] font-semibold">Complexidade operacional</h2>
                <p className="mt-1.5 text-xs text-muted-foreground">Distribuição dos precatórios por nível de complexidade</p>
              </div>
              <div className="p-5">
                <ComplexityOverview data={operational.complexity} loading={refreshing} />
              </div>
            </div>

            {/* PerformanceMetrics */}
            <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
              <div className="p-5 pb-0">
                <h2 className="text-[15px] font-semibold">Métricas de performance</h2>
                <p className="mt-1.5 text-xs text-muted-foreground">Tempos médios, SLA estourado e fila de cálculo</p>
              </div>
              <div className="p-5">
                <PerformanceMetrics data={operational.performance} loading={refreshing} />
              </div>
            </div>

            {/* Gargalos + Operadores 2-col */}
            {(operational.bottlenecks.length > 0 || operational.operators.length > 0) && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {operational.bottlenecks.length > 0 && (
                  <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                    <div className="p-5 pb-0">
                      <h2 className="text-[15px] font-semibold">Gargalos por motivo de atraso</h2>
                      <p className="mt-1.5 text-xs text-muted-foreground">Principais motivos que travam precatórios</p>
                    </div>
                    <div className="p-5">
                      <DelayBottlenecks data={operational.bottlenecks} loading={refreshing} />
                    </div>
                  </div>
                )}
                {operational.operators.length > 0 && (
                  <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
                    <div className="p-5 pb-0">
                      <h2 className="text-[15px] font-semibold">Distribuição por operador</h2>
                      <p className="mt-1.5 text-xs text-muted-foreground">Carga de trabalho por responsável de cálculo</p>
                    </div>
                    <div className="p-5">
                      <OperatorDistribution data={operational.operators} loading={refreshing} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Críticos */}
            <div className="rounded-[24px] border border-black/[0.07] bg-white" style={clayCardShadow}>
              <div className="flex items-start justify-between gap-3 p-5 pb-0">
                <div>
                  <h2 className="text-[15px] font-semibold">Precatórios críticos — visão detalhada</h2>
                  <p className="mt-1.5 text-xs text-muted-foreground">Todos os itens com maior risco operacional</p>
                </div>
                <Button
                  onPress={handleRefresh}
                  isDisabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="border-border"
                >
                  <span className="inline-flex items-center gap-2">
                    {refreshing ? <Spinner size="sm" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    <span>Atualizar</span>
                  </span>
                </Button>
              </div>
              <div className="p-5">
                <CriticalPrecatorios data={operational.critical} loading={refreshing} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
