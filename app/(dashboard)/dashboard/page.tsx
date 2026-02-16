"use client"
/* eslint-disable */

import { useEffect, useMemo, useState } from "react"
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
} from "lucide-react"

import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"

import { FinancialOverview } from "@/components/dashboard/financial-overview"
import { ComplexityOverview } from "@/components/dashboard/complexity-overview"
import { DelayBottlenecks } from "@/components/dashboard/delay-bottlenecks"
import { PerformanceMetrics } from "@/components/dashboard/performance-metrics"
import { OperatorDistribution } from "@/components/dashboard/operator-distribution"
import { CriticalPrecatorios } from "@/components/dashboard/critical-precatorios"
import { MetricCard } from "@/components/dashboard/metric-card"

import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Chip,
  Progress,
  Select,
  SelectItem,
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
} from "@heroui/react"

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCurrency, formatPercent } from "@/lib/utils/currency"
import { KANBAN_COLUMNS } from "@/app/(dashboard)/kanban/columns"

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
const CHART_PALETTE = ["#0EA5E9", "#22C55E", "#F59E0B", "#EF4444", "#6366F1", "#14B8A6", "#A855F7"]

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
    periodo: { inicio: source.periodo?.inicio ?? null, fim: source.periodo?.fim ?? null },
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
  const preset = PERIOD_OPTIONS.find((option) => option.value === key) ?? PERIOD_OPTIONS[0]
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

// ---- UI helpers (novo) ----
function GlassCard(props: any) {
  return (
    <Card
      {...props}
      className={[
        "border border-zinc-200/70 bg-white/70 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/40",
        props?.className ?? "",
      ].join(" ")}
      shadow="sm"
      radius="lg"
    />
  )
}

function ToneChip({ tone = "default", children, className = "" }: any) {
  const map: Record<string, any> = {
    success: { color: "success", variant: "flat" },
    warning: { color: "warning", variant: "flat" },
    danger: { color: "danger", variant: "flat" },
    default: { color: "default", variant: "flat" },
    primary: { color: "primary", variant: "flat" },
  }
  const cfg = map[tone] ?? map.default
  return (
    <Chip {...cfg} size="sm" className={["font-semibold", className].join(" ")}>
      {children}
    </Chip>
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
      <CardHeader className="flex flex-col items-start gap-1">
        <div className="text-base font-semibold text-zinc-900 dark:text-white/90">{title}</div>
        {description ? <div className="text-sm text-zinc-600 dark:text-zinc-300">{description}</div> : null}
      </CardHeader>
      <CardBody className="pt-0">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm font-medium text-zinc-600 dark:text-zinc-300">{emptyLabel}</div>
        ) : (
          <Table
            aria-label={title}
            removeWrapper
            isStriped
            className="rounded-xl"
            classNames={{
              th: "bg-zinc-50/70 text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300",
              td: "text-zinc-800 dark:text-zinc-100",
            }}
          >
            <TableHeader>
              <TableColumn>{labelHeader}</TableColumn>
              <TableColumn className="text-right">{valueHeader}</TableColumn>
            </TableHeader>
            <TableBody emptyContent={emptyLabel}>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{valueFormatter(row.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardBody>
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
  const isCurrency = valueFormatter(1).includes("R$")
  const compactFormatter = (value: any) => {
    const numeric = Number(value ?? 0)
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

  const chartHeight = Math.max(320, Math.min(620, rows.length * 48))
  const yAxisWidth = Math.min(320, Math.max(132, Math.max(...chartData.map((item) => item.name.length), 0) * 7))
  const labelSample = chartData.map((item) => compactFormatter(item.value))
  const rightMargin = Math.min(220, Math.max(88, Math.max(...labelSample.map((v) => String(v).length), 0) * 7))
  const chartKey = `${title}-${chartData.length}-${chartData.map((d) => d.value).join("_")}`

  function KanbanBarTooltip({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ payload?: { name?: string; value?: number }; value?: number }>
  }) {
    if (!active || !payload?.length) return null
    const item = payload[0]?.payload
    const value = Number(item?.value ?? payload[0]?.value ?? 0)

    return (
      <div className="rounded-xl border border-zinc-200 bg-white/95 p-3 text-sm shadow-2xl dark:border-zinc-800 dark:bg-zinc-950/95">
        <p className="font-semibold text-zinc-900 dark:text-white/90">{item?.name ?? "Item"}</p>
        <p className="mt-1 font-mono text-base tabular-nums text-zinc-900 dark:text-white/90">{valueFormatter(value)}</p>
      </div>
    )
  }

  return (
    <GlassCard className="overflow-hidden">
      <CardHeader className="flex flex-col items-start gap-1">
        <div className="text-base font-semibold text-zinc-900 dark:text-white/90">{title}</div>
        {description ? <div className="text-sm text-zinc-600 dark:text-zinc-300">{description}</div> : null}
      </CardHeader>
      <CardBody className="pt-0">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm font-medium text-zinc-600 dark:text-zinc-300">{emptyLabel}</div>
        ) : (
          <div className="w-full" style={{ height: Math.max(chartHeight, height) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartKey} data={chartData} layout="vertical" margin={{ top: 12, right: rightMargin, bottom: 12, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={compactFormatter} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={yAxisWidth} tickLine={false} axisLine={false} tick={{ fontSize: 13 }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.35)" }} content={<KanbanBarTooltip />} />
                <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                  <LabelList
                    dataKey="value"
                    position="right"
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
      </CardBody>
    </GlassCard>
  )
}

function DashboardMetricTile({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeLabel,
  badgeTone = "default",
}: any) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] dark:opacity-[0.10]">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/40 to-transparent blur-2xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-gradient-to-br from-foreground/15 to-transparent blur-2xl" />
      </div>

      <CardBody className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-white/90">
            <Icon className="h-5 w-5" />
          </div>
          {badgeLabel ? <ToneChip tone={badgeTone}>{badgeLabel}</ToneChip> : null}
        </div>

        <div className="mt-4 space-y-1">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{title}</div>
          <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white/90">{value}</div>
          {subtitle ? <div className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</div> : null}
        </div>
      </CardBody>
    </GlassCard>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [kpis, setKpis] = useState<DashboardKpis>(DEFAULT_KPIS)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<PeriodKey>("30d")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [tab, setTab] = useState<DashTabKey>("overview")

  const roles = useMemo(() => {
    if (!profile?.role) return []
    return Array.isArray(profile.role) ? profile.role : [profile.role]
  }, [profile?.role])

  const isAdmin = roles.includes("admin") || roles.includes("gestor")
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

  const formatKanbanStatus = (status: string) => kanbanLabelMap.get(status) ?? humanizeKey(status)

  const roleFilter = useMemo(() => {
    if (!profile?.id) return null
    if (roles.includes("operador_comercial")) {
      return `criado_por.eq.${profile.id},responsavel.eq.${profile.id}`
    }
    if (roles.includes("operador_calculo")) {
      return `responsavel_calculo_id.eq.${profile.id},responsavel.eq.${profile.id},criado_por.eq.${profile.id}`
    }
    return null
  }, [profile?.id, roles])

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
    let queryFila = supabase
      .from("precatorios")
      .select("data_entrada_calculo")
      .eq("status", "em_calculo")
      .not("data_entrada_calculo", "is", null)
      .is("deleted_at", null)

    queryFila = applyRoleFilter(queryFila)
    const { data: emFila } = await queryFila

    const tempoMedioFila =
      emFila && emFila.length > 0
        ? emFila.reduce((sum: number, p: any) => {
          const horas = (Date.now() - new Date(p.data_entrada_calculo).getTime()) / (1000 * 60 * 60)
          return sum + horas
        }, 0) / emFila.length
        : 0

    let queryFinalizado = supabase
      .from("precatorios")
      .select("data_entrada_calculo, data_calculo")
      .eq("status", "concluido")
      .not("data_entrada_calculo", "is", null)
      .not("data_calculo", "is", null)
      .is("deleted_at", null)

    queryFinalizado = applyRoleFilter(queryFinalizado)
    const { data: finalizados } = await queryFinalizado

    const tempoMedioFinalizar =
      finalizados && finalizados.length > 0
        ? finalizados.reduce((sum: number, p: any) => {
          const horas =
            (new Date(p.data_calculo).getTime() - new Date(p.data_entrada_calculo).getTime()) / (1000 * 60 * 60)
          return sum + horas
        }, 0) / finalizados.length
        : 0

    let querySLA = supabase
      .from("precatorios")
      .select("id", { count: "exact", head: true })
      .eq("sla_status", "atrasado")
      .is("deleted_at", null)

    querySLA = applyRoleFilter(querySLA)
    const { count: slaEstourado } = await querySLA

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

    const isAdminRole = userRoles.includes("admin") || userRoles.includes("gestor")
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
    const { data, error } = await supabase.rpc("get_critical_precatorios")

    if (error) {
      console.error("[DASHBOARD] Erro ao buscar críticos:", error)
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

      const [kpisData, complexity, bottlenecks, performance, operators, critical] = await Promise.all([
        fetchKpis(supabase, range),
        safeFetch("complexidade", () => fetchComplexityData(supabase), DEFAULT_COMPLEXITY),
        safeFetch("gargalos", () => fetchBottlenecksData(supabase), DEFAULT_BOTTLENECKS),
        safeFetch("performance", () => fetchPerformanceData(supabase), DEFAULT_PERFORMANCE),
        safeFetch("operadores", () => fetchOperatorsData(supabase, profile.id, roles), DEFAULT_OPERATORS),
        safeFetch("críticos", () => fetchCriticalData(supabase), DEFAULT_CRITICAL),
      ])

      setKpis(kpisData)
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

  // ----- loading (melhor visual) -----
  if (loading) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)]">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-50 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black" />
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-16">
          <GlassCard className="w-full max-w-md">
            <CardBody className="py-10">
              <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <div className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Carregando dashboard…</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Preparando KPIs, gráficos e métricas.</div>
              </div>
            </CardBody>
          </GlassCard>
        </div>
      </div>
    )
  }

  const operational = metrics || {
    complexity: DEFAULT_COMPLEXITY,
    bottlenecks: DEFAULT_BOTTLENECKS,
    performance: DEFAULT_PERFORMANCE,
    operators: DEFAULT_OPERATORS,
    critical: DEFAULT_CRITICAL,
    financial: {
      totalPrincipal: kpis.resumo.total_principal,
      totalAtualizado: kpis.resumo.total_atualizado,
    },
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

  const kanbanQuantidadeRows = buildRows(kpis.kanban.quantidade_por_status, formatKanbanStatus)
  const kanbanValorRows = buildRows(kpis.kanban.valor_por_status, formatKanbanStatus)

  const financeiroConsolidadoRows: SimpleTableRow[] = [
    { label: "Total valor principal", value: kpis.resumo.total_principal },
    { label: "Total valor atualizado", value: kpis.resumo.total_atualizado },
    { label: "Saldo líquido", value: kpis.resumo.total_saldo_liquido },
    { label: "Honorários total", value: kpis.financeiro.honorarios_total },
    { label: "IRPF total", value: kpis.financeiro.irpf_total },
    { label: "Adiantamento total", value: kpis.financeiro.adiantamento_total },
    { label: "PSS total", value: kpis.financeiro.pss_total },
  ].filter((row) => row.value > 0)

  const propostaStatusRows = buildRows(kpis.propostas.por_status, humanizeKey)
  const usuarioRoleRows = buildRows(kpis.usuarios.por_role, humanizeKey)
  const juridicoParecerRows = buildRows(kpis.juridico.parecer_por_status, humanizeKey)
  const juridicoResultadoRows = buildRows(kpis.juridico.resultado_final, humanizeKey)
  const atividadesRows = buildRows(kpis.atividades.por_tipo, humanizeKey)

  const topCritical = operational.critical.slice(0, 7)
  const topRoles = usuarioRoleRows.slice(0, 6).map((row) => ({
    ...row,
    percent: kpis.usuarios.ativos_total > 0 ? (row.value / kpis.usuarios.ativos_total) * 100 : 0,
  }))

  const slaBase =
    kpis.sla.no_prazo + kpis.sla.atencao + kpis.sla.atrasado + kpis.sla.nao_iniciado + kpis.sla.concluido

  const slaHealthyPercent = slaBase > 0 ? ((kpis.sla.no_prazo + kpis.sla.concluido) / slaBase) * 100 : 0
  const monthlyTargetPercent = Math.round((docsPercent + certPercent + slaHealthyPercent) / 3)

  const periodSelectedKeys = new Set([period])

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* background premium */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-50 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black" />
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/20 via-sky-200/10 to-emerald-200/10 blur-3xl dark:from-primary/15 dark:via-sky-400/5 dark:to-emerald-400/5" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white/90 sm:text-3xl">
                Dashboard estratégico
              </h1>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {isAdmin ? "Visão completa de todos os precatórios" : `Seu desempenho — ${profile?.nome || "Usuário"}`}
            </p>
            {lastUpdated ? (
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Atualizado em {new Date(lastUpdated).toLocaleString("pt-BR")}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              aria-label="Período"
              selectedKeys={periodSelectedKeys as any}
              onSelectionChange={(keys: any) => {
                const first = Array.from(keys as Set<string>)[0]
                if (first) setPeriod(first as PeriodKey)
              }}
              variant="bordered"
              size="sm"
              className="w-[240px]"
              startContent={<Clock className="h-4 w-4 text-zinc-500" />}
            >
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value}>{option.label}</SelectItem>
              ))}
            </Select>

            <Button
              onPress={handleRefresh}
              isLoading={refreshing}
              variant="bordered"
              size="sm"
              startContent={!refreshing ? <RefreshCw className="h-4 w-4" /> : null}
            >
              Atualizar
            </Button>
          </div>
        </div>

        {/* Tabs para organizar (mudança principal) */}
        <Tabs
          selectedKey={tab}
          onSelectionChange={(k) => setTab(k as DashTabKey)}
          variant="underlined"
          color="primary"
          classNames={{
            tabList: "gap-4",
            tab: "data-[selected=true]:text-primary",
          }}
        >
          <Tab
            key="overview"
            title={
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Visão geral
              </div>
            }
          >
            <div className="mt-5 grid grid-cols-12 gap-4 md:gap-6">
              <div className="col-span-12 space-y-6 xl:col-span-7">
                <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
                  <DashboardMetricTile
                    title="Precatórios ativos"
                    value={formatCount(kpis.resumo.total_precatorios)}
                    subtitle={`Período: ${periodRange.label}`}
                    icon={Layers}
                    badgeLabel={`+${formatCount(kpis.periodo_kpis.novos_precatorios)}`}
                    badgeTone="success"
                  />
                  <DashboardMetricTile
                    title="Credores"
                    value={formatCount(kpis.resumo.total_credores)}
                    subtitle="Base cadastrada"
                    icon={Users}
                    badgeLabel={`${formatCount(kpis.usuarios.ativos_total)} usuários`}
                    badgeTone="default"
                  />
                  <DashboardMetricTile
                    title="Propostas"
                    value={formatCount(kpis.resumo.total_propostas)}
                    subtitle={`Ticket médio ${formatCurrency(kpis.propostas.ticket_medio)}`}
                    icon={FileText}
                    badgeLabel={`${formatPercent(kpis.propostas.desconto_medio, 1)} desc.`}
                    badgeTone="warning"
                  />
                  <DashboardMetricTile
                    title="Mensagens não lidas"
                    value={formatCount(kpis.chat.mensagens_nao_lidas)}
                    subtitle={`${formatCount(kpis.periodo_kpis.mensagens_chat_periodo)} no período`}
                    icon={MessageSquare}
                    badgeLabel={kpis.chat.mensagens_nao_lidas > 0 ? "Ação necessária" : "OK"}
                    badgeTone={kpis.chat.mensagens_nao_lidas > 0 ? "danger" : "success"}
                  />
                </div>
              </div>

              <div className="col-span-12 xl:col-span-5 xl:self-stretch">
                <GlassCard className="h-full">
                  <CardBody className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-base font-semibold text-zinc-900 dark:text-white/90">
                          Meta mensal operacional
                        </div>
                        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                          Resultado médio entre documentos, certidões e SLA.
                        </div>
                      </div>
                      <ToneChip tone="success">{monthlyTargetPercent}%</ToneChip>
                    </div>

                    <div className="mt-6 space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                          <span>Documentos recebidos</span>
                          <span className="font-mono tabular-nums">{docsPercent.toFixed(0)}%</span>
                        </div>
                        <Progress value={docsPercent} size="sm" className="w-full" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                          <span>Certidões recebidas</span>
                          <span className="font-mono tabular-nums">{certPercent.toFixed(0)}%</span>
                        </div>
                        <Progress value={certPercent} size="sm" className="w-full" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                          <span>SLA saudável</span>
                          <span className="font-mono tabular-nums">{slaHealthyPercent.toFixed(0)}%</span>
                        </div>
                        <Progress value={slaHealthyPercent} size="sm" className="w-full" />
                      </div>
                    </div>

                    <Divider className="my-6" />

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl bg-zinc-50/70 p-3 dark:bg-zinc-900/50">
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Saldo líquido</div>
                        <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white/90">
                          {formatCurrency(kpis.resumo.total_saldo_liquido)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-zinc-50/70 p-3 dark:bg-zinc-900/50">
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Vencidas</div>
                        <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white/90">
                          {formatCount(kpis.documentos_certidoes.certidoes_vencidas)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-zinc-50/70 p-3 dark:bg-zinc-900/50">
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">SLA atrasado</div>
                        <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white/90">
                          {formatCount(kpis.sla.atrasado)}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </GlassCard>
              </div>

              <div className="col-span-12">
                <FinancialOverview data={financialData} loading={refreshing} />
              </div>

              <div className="col-span-12">
                <Chart3DCard
                  title="Valor por status (Kanban)"
                  description="Distribuição financeira por etapa do fluxo."
                  rows={kanbanValorRows}
                  valueFormatter={formatCurrency}
                  emptyLabel="Sem valores por status"
                  height={420}
                />
              </div>

              <div className="col-span-12">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <Chart3DCard
                    title="Quantidade por status"
                    description="Distribuição de precatórios por etapa."
                    rows={kanbanQuantidadeRows}
                    valueFormatter={formatCount}
                    emptyLabel="Sem precatórios"
                  />
                  <Chart3DCard
                    title="Consolidado financeiro"
                    description="Passe o mouse nas barras para ver os totais."
                    rows={financeiroConsolidadoRows}
                    valueFormatter={formatCurrency}
                    emptyLabel="Sem dados financeiros"
                  />
                </div>
              </div>

              <div className="col-span-12 xl:col-span-5 xl:self-stretch">
                <GlassCard className="h-full">
                  <CardBody className="p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Distribuição por role</div>
                        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                          {formatCount(kpis.usuarios.ativos_total)} usuários ativos no total
                        </div>
                      </div>
                      <Users className="h-5 w-5 text-zinc-500" />
                    </div>

                    <div className="mt-6 space-y-4">
                      {topRoles.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-zinc-300/60 p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                          Sem distribuição de usuários.
                        </div>
                      ) : (
                        topRoles.map((row) => (
                          <div key={row.label} className="flex items-center gap-3">
                            <div title={row.label} className="w-28 shrink-0 truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              {row.label}
                            </div>
                            <div className="relative h-2.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                              <div
                                className="absolute left-0 top-0 h-full rounded-full bg-primary/80"
                                style={{ width: `${Math.max(row.percent, row.percent > 0 ? 8 : 0)}%` }}
                              />
                            </div>
                            <div className="w-10 text-right text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                              {row.percent.toFixed(0)}%
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardBody>
                </GlassCard>
              </div>

              <div className="col-span-12 xl:col-span-7 xl:self-stretch">
                <GlassCard className="h-full">
                  <CardBody className="p-5 sm:p-6">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Precatórios críticos</div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-300">
                          Itens com maior risco operacional no momento.
                        </div>
                      </div>
                      <Button
                        onPress={handleRefresh}
                        isLoading={refreshing}
                        variant="bordered"
                        size="sm"
                        startContent={!refreshing ? <RefreshCw className="h-4 w-4" /> : null}
                      >
                        Atualizar
                      </Button>
                    </div>

                    <Table
                      aria-label="Precatórios críticos"
                      isHeaderSticky
                      isStriped
                      classNames={{
                        th: "bg-zinc-50/70 text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300",
                      }}
                    >
                      <TableHeader>
                        <TableColumn>Precatório</TableColumn>
                        <TableColumn>Responsável</TableColumn>
                        <TableColumn>SLA</TableColumn>
                        <TableColumn className="text-right">Score</TableColumn>
                      </TableHeader>
                      <TableBody
                        emptyContent="Sem precatórios críticos para o período selecionado."
                      >
                        {topCritical.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-zinc-900 dark:text-white/90">
                                  {item.numero_precatorio || item.titulo}
                                </span>
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {humanizeKey(item.status || "sem_status")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                              {item.responsavel_nome || "Não atribuído"}
                            </TableCell>
                            <TableCell>
                              <ToneChip
                                tone={
                                  item.sla_status === "atrasado"
                                    ? "danger"
                                    : item.sla_status === "atencao"
                                      ? "warning"
                                      : "success"
                                }
                              >
                                {humanizeKey(item.sla_status || "no_prazo")}
                              </ToneChip>
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {formatCount(item.score_criticidade || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardBody>
                </GlassCard>
              </div>
            </div>
          </Tab>

          <Tab
            key="details"
            title={
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Detalhes
              </div>
            }
          >
            <div className="mt-5 space-y-6">
              <GlassCard>
                <CardBody className="p-5 sm:p-6 space-y-4">
                  <div>
                    <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Movimento do período</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">
                      {periodRange.inicio && periodRange.fim
                        ? `${periodRange.label} (${formatDateShort(periodRange.inicio)} - ${formatDateShort(periodRange.fim)})`
                        : periodRange.label}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <MetricCard title="Novos precatórios" value={formatCount(kpis.periodo_kpis.novos_precatorios)} icon={Layers} />
                    <MetricCard title="Precatórios atualizados" value={formatCount(kpis.periodo_kpis.precatorios_atualizados)} icon={RefreshCw} />
                    <MetricCard title="Propostas criadas" value={formatCount(kpis.periodo_kpis.propostas_criadas)} icon={FileText} />
                    <MetricCard title="Atividades" value={formatCount(kpis.periodo_kpis.atividades_periodo)} icon={ListChecks} />
                    <MetricCard title="Mensagens no chat" value={formatCount(kpis.periodo_kpis.mensagens_chat_periodo)} icon={MessageSquare} />
                  </div>
                </CardBody>
              </GlassCard>

              <GlassCard>
                <CardBody className="p-5 sm:p-6 space-y-4">
                  <div>
                    <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Propostas</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">Valores e distribuição</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <MetricCard title="Valor total" value={formatCurrency(kpis.propostas.valor_total)} icon={Wallet} />
                    <MetricCard title="Ticket médio" value={formatCurrency(kpis.propostas.ticket_medio)} icon={TrendingUp} />
                    <MetricCard title="Desconto médio" value={formatPercent(kpis.propostas.desconto_medio, 2)} icon={Percent} />
                  </div>
                  <SimpleTableCard title="Propostas por status" rows={propostaStatusRows} emptyLabel="Sem propostas" />
                </CardBody>
              </GlassCard>

              <GlassCard>
                <CardBody className="p-5 sm:p-6 space-y-4">
                  <div>
                    <div className="text-base font-semibold text-zinc-900 dark:text-white/90">SLA e cálculo</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">Controle de prazo e progresso da fila</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard title="Pronto para cálculo" value={formatCount(kpis.calculo.pronto_calculo)} icon={ListChecks} />
                    <MetricCard title="Em cálculo" value={formatCount(kpis.calculo.em_calculo)} icon={Clock} />
                    <MetricCard title="No prazo" value={formatCount(kpis.sla.no_prazo)} icon={CheckCircle2} variant="success" />
                    <MetricCard title="Atenção" value={formatCount(kpis.sla.atencao)} icon={AlertTriangle} variant="warning" />
                    <MetricCard title="Atrasado" value={formatCount(kpis.sla.atrasado)} icon={AlertTriangle} variant={kpis.sla.atrasado > 0 ? "danger" : "default"} />
                    <MetricCard title="Concluídos" value={formatCount(kpis.calculo.concluido)} icon={CheckCircle2} variant="success" />
                    <MetricCard title="Não iniciado" value={formatCount(kpis.sla.nao_iniciado)} icon={Clock} />
                    <MetricCard title="Desatualizados" value={formatCount(kpis.calculo.desatualizado)} icon={AlertTriangle} />
                    <MetricCard title="Tempo médio" value={formatHours(kpis.sla.tempo_medio_calculo_horas)} icon={Clock} />
                    <MetricCard title="Versões média" value={kpis.calculo.versoes_media.toFixed(1)} icon={TrendingUp} />
                  </div>
                </CardBody>
              </GlassCard>

              <GlassCard>
                <CardBody className="p-5 sm:p-6 space-y-4">
                  <div>
                    <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Documentos e certidões</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">Progresso dos itens obrigatórios</div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <GlassCard>
                      <CardHeader className="pb-0">
                        <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Documentos do credor</div>
                      </CardHeader>
                      <CardBody className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {formatCount(kpis.documentos_certidoes.docs_recebidos)} / {formatCount(kpis.documentos_certidoes.total_docs)}
                          </span>
                          <ToneChip tone="success">{docsPercent.toFixed(0)}%</ToneChip>
                        </div>
                        <Progress value={docsPercent} size="sm" className="w-full" />
                      </CardBody>
                    </GlassCard>

                    <GlassCard>
                      <CardHeader className="pb-0">
                        <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Certidões</div>
                      </CardHeader>
                      <CardBody className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {formatCount(kpis.documentos_certidoes.certidoes_recebidas)} / {formatCount(kpis.documentos_certidoes.total_certidoes)}
                          </span>
                          <ToneChip tone="primary">{certPercent.toFixed(0)}%</ToneChip>
                        </div>
                        <Progress value={certPercent} size="sm" className="w-full" />
                        <div className="text-sm">
                          <ToneChip tone={kpis.documentos_certidoes.certidoes_vencidas > 0 ? "danger" : "default"}>
                            Vencidas: {formatCount(kpis.documentos_certidoes.certidoes_vencidas)}
                          </ToneChip>
                        </div>
                      </CardBody>
                    </GlassCard>
                  </div>
                </CardBody>
              </GlassCard>

              <GlassCard>
                <CardBody className="p-5 sm:p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <MetricCard title="Total credores" value={formatCount(kpis.credores.total_credores)} icon={Users} />
                    <MetricCard title="Valor total principal" value={formatCurrency(kpis.credores.valor_total_principal)} icon={Wallet} />
                  </div>
                </CardBody>
              </GlassCard>

              <GlassCard>
                <CardBody className="p-5 sm:p-6 space-y-4">
                  <div>
                    <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Jurídico</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">Status de parecer e resultado</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SimpleTableCard title="Parecer por status" rows={juridicoParecerRows} emptyLabel="Sem pareceres" />
                    <SimpleTableCard title="Resultado final" rows={juridicoResultadoRows} emptyLabel="Sem resultados" />
                  </div>
                </CardBody>
              </GlassCard>

              <GlassCard>
                <CardBody className="p-5 sm:p-6 space-y-4">
                  <div>
                    <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Ofícios</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">Pendências e concluído</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <MetricCard title="Análise Processual Inicial" value={formatCount(kpis.oficios.analise_processual_inicial)} icon={FileText} />
                    <MetricCard title="Com ofício" value={formatCount(kpis.oficios.com_oficio)} icon={CheckCircle2} variant="success" />
                  </div>
                </CardBody>
              </GlassCard>

              <GlassCard>
                <CardBody className="p-5 sm:p-6 space-y-4">
                  <div>
                    <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Atividades</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">Eventos por tipo</div>
                  </div>
                  <SimpleTableCard title="Atividades por tipo" rows={atividadesRows} emptyLabel="Sem atividades" />
                </CardBody>
              </GlassCard>
            </div>
          </Tab>

          <Tab
            key="operation"
            title={
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Operação
              </div>
            }
          >
            <div className="mt-5 space-y-6">
              <GlassCard>
                <CardBody className="p-5 sm:p-6 space-y-5">
                  <div>
                    <div className="text-base font-semibold text-zinc-900 dark:text-white/90">Operação</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">
                      Indicadores operacionais detalhados
                    </div>
                  </div>

                  <ComplexityOverview data={operational.complexity} loading={refreshing} />
                  <PerformanceMetrics data={operational.performance} loading={refreshing} />
                  {operational.bottlenecks.length > 0 ? (
                    <DelayBottlenecks data={operational.bottlenecks} loading={refreshing} />
                  ) : null}
                  {operational.operators.length > 0 ? (
                    <OperatorDistribution data={operational.operators} loading={refreshing} />
                  ) : null}
                  <CriticalPrecatorios data={operational.critical} loading={refreshing} />
                </CardBody>
              </GlassCard>
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  )
}
