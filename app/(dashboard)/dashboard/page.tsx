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
  Scale,
  MessageSquare,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListChecks,
  Percent,
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  showLegend?: boolean
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
  kanban: {
    quantidade_por_status: {},
    valor_por_status: {},
  },
  financeiro: {
    pss_total: 0,
    irpf_total: 0,
    honorarios_total: 0,
    adiantamento_total: 0,
    irpf_isento: 0,
    irpf_nao_isento: 0,
  },
  propostas: {
    por_status: {},
    valor_total: 0,
    ticket_medio: 0,
    desconto_medio: 0,
  },
  calculo: {
    pronto_calculo: 0,
    em_calculo: 0,
    concluido: 0,
    desatualizado: 0,
    versoes_media: 0,
  },
  sla: {
    no_prazo: 0,
    atencao: 0,
    atrasado: 0,
    nao_iniciado: 0,
    concluido: 0,
    tempo_medio_calculo_horas: 0,
    total_em_calculo: 0,
  },
  documentos_certidoes: {
    total_docs: 0,
    docs_recebidos: 0,
    total_certidoes: 0,
    certidoes_recebidas: 0,
    certidoes_vencidas: 0,
  },
  credores: {
    total_credores: 0,
    valor_total_principal: 0,
  },
  usuarios: {
    ativos_total: 0,
    por_role: {},
  },
  juridico: {
    parecer_por_status: {},
    resultado_final: {},
  },
  oficios: {
    analise_processual_inicial: 0,
    com_oficio: 0,
  },
  atividades: {
    por_tipo: {},
  },
  chat: {
    mensagens_nao_lidas: 0,
  },
}

const DEFAULT_COMPLEXITY: ComplexityMetrics = {
  baixa: 0,
  media: 0,
  alta: 0,
  total: 0,
  percentuais: {
    baixa: 0,
    media: 0,
    alta: 0,
  },
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

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string; days: number | null }> = [
  { value: "30d", label: "Ultimos 30 dias", days: 30 },
  { value: "90d", label: "Ultimos 90 dias", days: 90 },
  { value: "180d", label: "Ultimos 6 meses", days: 180 },
  { value: "365d", label: "Ultimos 12 meses", days: 365 },
  { value: "all", label: "Todo o periodo", days: null },
]

const SECTION_BASE = "rounded-2xl border p-4 sm:p-6 shadow-sm"
const SECTION_TONES = {
  summary: "border-slate-200/70 bg-gradient-to-br from-slate-50/80 via-background to-background dark:border-slate-800/60 dark:from-slate-950/30",
  finance: "border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 via-background to-background dark:border-emerald-800/40 dark:from-emerald-950/20",
  period: "border-amber-200/70 bg-gradient-to-br from-amber-50/70 via-background to-background dark:border-amber-800/40 dark:from-amber-950/20",
  kanban: "border-sky-200/70 bg-gradient-to-br from-sky-50/70 via-background to-background dark:border-sky-800/40 dark:from-sky-950/20",
  propostas: "border-cyan-200/70 bg-gradient-to-br from-cyan-50/70 via-background to-background dark:border-cyan-800/40 dark:from-cyan-950/20",
  calculo: "border-orange-200/70 bg-gradient-to-br from-orange-50/70 via-background to-background dark:border-orange-900/40 dark:from-orange-950/20",
  sla: "border-rose-200/70 bg-gradient-to-br from-rose-50/70 via-background to-background dark:border-rose-900/40 dark:from-rose-950/20",
  documentos: "border-lime-200/70 bg-gradient-to-br from-lime-50/70 via-background to-background dark:border-lime-900/40 dark:from-lime-950/20",
  credores: "border-teal-200/70 bg-gradient-to-br from-teal-50/70 via-background to-background dark:border-teal-900/40 dark:from-teal-950/20",
  usuarios: "border-blue-200/70 bg-gradient-to-br from-blue-50/70 via-background to-background dark:border-blue-900/40 dark:from-blue-950/20",
  juridico: "border-zinc-200/70 bg-gradient-to-br from-zinc-50/70 via-background to-background dark:border-zinc-800/50 dark:from-zinc-950/20",
  oficios: "border-sky-200/70 bg-gradient-to-br from-sky-50/70 via-background to-background dark:border-sky-800/40 dark:from-sky-950/20",
  atividades: "border-slate-200/70 bg-gradient-to-br from-slate-50/70 via-background to-background dark:border-slate-800/50 dark:from-slate-950/20",
  operacao: "border-neutral-200/70 bg-gradient-to-br from-neutral-50/70 via-background to-background dark:border-neutral-800/50 dark:from-neutral-950/20",
}

const sectionClass = (tone: keyof typeof SECTION_TONES, spacing = "space-y-4") => {
  return `${spacing} ${SECTION_BASE} ${SECTION_TONES[tone]}`
}
const formatCount = (value: number) => new Intl.NumberFormat("pt-BR").format(value)

const toNumber = (value: any) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toRecord = (value: any): Record<string, number> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return Object.entries(value).reduce<Record<string, number>>((acc, [key, val]) => {
    acc[key] = toNumber(val)
    return acc
  }, {})
}

const normalizeKpis = (raw: any): DashboardKpis => {
  const source = raw || {}

  return {
    periodo: {
      inicio: source.periodo?.inicio ?? null,
      fim: source.periodo?.fim ?? null,
    },
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
    atividades: {
      por_tipo: toRecord(source.atividades?.por_tipo),
    },
    chat: {
      mensagens_nao_lidas: toNumber(source.chat?.mensagens_nao_lidas),
    },
  }
}

const humanizeKey = (value: string) => {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const getPeriodRange = (key: PeriodKey): PeriodRange => {
  const preset = PERIOD_OPTIONS.find((option) => option.value === key) ?? PERIOD_OPTIONS[0]
  if (!preset.days) {
    return {
      label: preset.label,
      inicio: null,
      fim: null,
    }
  }

  const fim = new Date()
  const inicio = new Date()
  inicio.setDate(fim.getDate() - preset.days)

  return {
    label: preset.label,
    inicio,
    fim,
  }
}

const buildRows = (record: Record<string, number>, formatLabel: (key: string) => string, filterZero = true) => {
  return Object.entries(record || {})
    .map(([key, value]) => ({
      label: formatLabel(key),
      value: toNumber(value),
    }))
    .filter((row) => (filterZero ? row.value > 0 : true))
    .sort((a, b) => b.value - a.value)
}

const formatHours = (hours: number) => {
  if (!hours) return "0h"
  if (hours < 1) return `${Math.round(hours * 60)}min`
  return `${hours.toFixed(1)}h`
}

const formatDateShort = (value: Date) => value.toLocaleDateString("pt-BR")

function SimpleTableCard({
  title,
  description,
  rows,
  labelHeader = "Item",
  valueHeader = "Total",
  valueFormatter = formatCount,
  emptyLabel = "Sem dados disponiveis",
}: SimpleTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{description}</p>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="py-8 text-center text-sm font-medium text-zinc-600 dark:text-zinc-300">{emptyLabel}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labelHeader}</TableHead>
                <TableHead className="text-right">{valueHeader}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{valueFormatter(row.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function Chart3DCard({
  title,
  description,
  rows,
  valueFormatter = formatCount,
  emptyLabel = "Sem dados disponiveis",
  height = 420,
  showLegend = true,
}: Chart3DCardProps) {
  const maxValue = rows.reduce((max, row) => Math.max(max, row.value), 0) || 1
  const gridSteps = [1, 0.75, 0.5, 0.25]
  const valueLabelHeight = 0
  const barAreaHeight = Math.max(160, height - valueLabelHeight)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{description}</p>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="py-8 text-center text-sm font-medium text-zinc-600 dark:text-zinc-300">{emptyLabel}</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="overflow-x-auto">
              <div className="min-w-[360px]">
                <div className="relative" style={{ height }}>
                  <div
                    className="pointer-events-none absolute left-0 right-0"
                    style={{ top: valueLabelHeight, height: barAreaHeight }}
                  >
                    {gridSteps.map((step) => (
                      <div
                        key={step}
                        className="absolute left-0 right-0 border-t border-dashed border-zinc-200/60 dark:border-zinc-700/60"
                        style={{ bottom: `${step * 100}%` }}
                      >
                      </div>
                    ))}
                  </div>
                  <div className="relative grid grid-flow-col auto-cols-[minmax(54px,1fr)] items-end gap-2 pb-3 pt-2 h-full">
                    {rows.map((row, index) => {
                      const slot = (index % 5) + 1
                      const baseColor = `hsl(var(--chart-${slot}))`
                      const sideColor = `hsl(var(--chart-${slot}) / 0.85)`
                      const topColor = `hsl(var(--chart-${slot}) / 0.6)`
                      const ratio = row.value / maxValue
                      const barHeight = Math.max(6, Math.round(ratio * barAreaHeight))
                      return (
                        <div key={`${row.label}-${index}`} className="flex flex-col items-center gap-1 h-full">
                          <div className="relative flex items-end" style={{ height: barAreaHeight }}>
                            <div className="relative w-8 h-full group" title={`${row.label}: ${valueFormatter(row.value)}`}>
                              <div
                                className="absolute bottom-0 left-0 w-full rounded-t-md shadow-[0_16px_35px_-20px_rgba(0,0,0,0.8)]"
                                style={{
                                  height: `${barHeight}px`,
                                  background: `linear-gradient(180deg, ${baseColor} 0%, ${sideColor} 100%)`,
                                }}
                              />
                              <div
                                className="absolute bottom-0 -right-2 w-2 rounded-tr-md"
                                style={{
                                  height: `${barHeight}px`,
                                  background: `linear-gradient(180deg, ${sideColor} 0%, ${baseColor} 100%)`,
                                  transform: "skewY(-12deg)",
                                  transformOrigin: "bottom left",
                                }}
                              />
                              <div
                                className="absolute -top-2 left-0 w-full h-2 rounded-t-md"
                                style={{
                                  background: `linear-gradient(90deg, ${topColor} 0%, ${baseColor} 100%)`,
                                  transform: "skewX(-12deg)",
                                  transformOrigin: "bottom left",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-zinc-200/70 to-transparent dark:via-zinc-700/60" />
              </div>
            </div>
            {showLegend && (
              <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/40 p-3 dark:border-zinc-800/60 dark:bg-zinc-900/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Legenda
                </p>
                <div className="mt-3 space-y-2">
                  {rows.map((row, index) => {
                    const slot = (index % 5) + 1
                    const dotColor = `hsl(var(--chart-${slot}))`
                      return (
                        <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.25)]"
                            style={{ background: dotColor }}
                          />
                          <span className="line-clamp-1 text-zinc-600 dark:text-zinc-300">{row.label}</span>
                        </div>
                        <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                          {valueFormatter(row.value)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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

  const formatKanbanStatus = (status: string) => {
    return kanbanLabelMap.get(status) ?? humanizeKey(status)
  }

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
      if (!acc[item.tipo_atraso]) {
        acc[item.tipo_atraso] = { total: 0, com_sla_estourado: 0 }
      }
      acc[item.tipo_atraso].total++
      if (item.sla_status === "atrasado") {
        acc[item.tipo_atraso].com_sla_estourado++
      }
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
  async function fetchOperatorsData(
    supabase: any,
    userId?: string,
    userRoles: string[] = []
  ): Promise<OperatorMetrics[]> {
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

    if (!isAdminRole && userId) {
      query = query.eq("responsavel_calculo_id", userId)
    }

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
      console.error("[DASHBOARD] Erro ao buscar criticos:", error)
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

    if (showLoading) {
      setLoading(true)
    }

    setRefreshing(true)

    try {
      const range = getPeriodRange(period)

      const [kpisData, complexity, bottlenecks, performance, operators, critical] = await Promise.all([
        fetchKpis(supabase, range),
        safeFetch("complexidade", () => fetchComplexityData(supabase), DEFAULT_COMPLEXITY),
        safeFetch("gargalos", () => fetchBottlenecksData(supabase), DEFAULT_BOTTLENECKS),
        safeFetch("performance", () => fetchPerformanceData(supabase), DEFAULT_PERFORMANCE),
        safeFetch("operadores", () => fetchOperatorsData(supabase, profile.id, roles), DEFAULT_OPERATORS),
        safeFetch("criticos", () => fetchCriticalData(supabase), DEFAULT_CRITICAL),
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

  const handleRefresh = () => {
    loadDashboardMetrics(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">Carregando dashboard...</p>
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
  const propostaStatusRows = buildRows(kpis.propostas.por_status, humanizeKey)
  const usuarioRoleRows = buildRows(kpis.usuarios.por_role, humanizeKey)
  const juridicoParecerRows = buildRows(kpis.juridico.parecer_por_status, humanizeKey)
  const juridicoResultadoRows = buildRows(kpis.juridico.resultado_final, humanizeKey)
  const atividadesRows = buildRows(kpis.atividades.por_tipo, humanizeKey)
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard estrategico</h1>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            {isAdmin
              ? "Visao completa de todos os precatorios"
              : `Seu desempenho - ${profile?.nome || "Usuario"}`}
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">Atualizado em {new Date(lastUpdated).toLocaleString("pt-BR")}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodKey)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <section className={sectionClass("summary")}>
        <div>
          <h2 className="text-lg font-semibold">Resumo geral</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Visao macro do sistema</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total precatorios"
            value={formatCount(kpis.resumo.total_precatorios)}
            subtitle="Todos ativos"
            icon={Layers}
            className="border-sky-200/70 bg-sky-50/70 dark:border-sky-900/40 dark:bg-sky-950/30"
          />
          <MetricCard
            title="Total credores"
            value={formatCount(kpis.resumo.total_credores)}
            subtitle="Base cadastrada"
            icon={Users}
            className="border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/30"
          />
          <MetricCard
            title="Total propostas"
            value={formatCount(kpis.resumo.total_propostas)}
            subtitle="Em qualquer status"
            icon={FileText}
            className="border-amber-200/70 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/30"
          />
          <MetricCard
            title="Mensagens nao lidas"
            value={formatCount(kpis.chat.mensagens_nao_lidas)}
            subtitle="Chat do sistema"
            icon={MessageSquare}
            variant={kpis.chat.mensagens_nao_lidas > 0 ? "warning" : "success"}
            className="border-rose-200/70 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/30"
          />
        </div>
      </section>

      <section className={sectionClass("finance")}>
        <div>
          <h2 className="text-lg font-semibold">Financeiro</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Totais consolidados e tributos</p>
        </div>
        <FinancialOverview data={financialData} loading={refreshing} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Saldo liquido"
            value={formatCurrency(kpis.resumo.total_saldo_liquido)}
            subtitle="Liquido total"
            icon={Scale}
            variant="success"
            className="border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/30"
          />
          <MetricCard
            title="PSS total"
            value={formatCurrency(kpis.financeiro.pss_total)}
            subtitle="Contribuicao"
            icon={Percent}
            className="border-sky-200/70 bg-sky-50/70 dark:border-sky-900/40 dark:bg-sky-950/30"
          />
          <MetricCard
            title="IRPF total"
            value={formatCurrency(kpis.financeiro.irpf_total)}
            subtitle="Imposto de renda"
            icon={DollarSign}
            className="border-rose-200/70 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/30"
          />
          <MetricCard
            title="Honorarios total"
            value={formatCurrency(kpis.financeiro.honorarios_total)}
            subtitle="Honorarios"
            icon={Wallet}
            className="border-amber-200/70 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/30"
          />
          <MetricCard
            title="Adiantamento total"
            value={formatCurrency(kpis.financeiro.adiantamento_total)}
            subtitle="Adiantamentos"
            icon={TrendingUp}
            className="border-teal-200/70 bg-teal-50/70 dark:border-teal-900/40 dark:bg-teal-950/30"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>IRPF isento</CardTitle>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Distribuicao de isencao</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono tabular-nums">
              Isento: {formatCount(kpis.financeiro.irpf_isento)}
            </Badge>
            <Badge className="bg-rose-100 text-rose-800 border border-rose-200 font-mono tabular-nums">
              Nao isento: {formatCount(kpis.financeiro.irpf_nao_isento)}
            </Badge>
          </CardContent>
        </Card>
      </section>
      <section className={sectionClass("period")}>
        <div>
          <h2 className="text-lg font-semibold">Periodo selecionado</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            {periodRange.inicio && periodRange.fim
              ? `${periodRange.label} (${formatDateShort(periodRange.inicio)} - ${formatDateShort(periodRange.fim)})`
              : periodRange.label}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Novos precatorios"
            value={formatCount(kpis.periodo_kpis.novos_precatorios)}
            icon={Layers}
          />
          <MetricCard
            title="Precatorios atualizados"
            value={formatCount(kpis.periodo_kpis.precatorios_atualizados)}
            icon={RefreshCw}
          />
          <MetricCard
            title="Propostas criadas"
            value={formatCount(kpis.periodo_kpis.propostas_criadas)}
            icon={FileText}
          />
          <MetricCard
            title="Atividades"
            value={formatCount(kpis.periodo_kpis.atividades_periodo)}
            icon={ListChecks}
          />
          <MetricCard
            title="Mensagens no chat"
            value={formatCount(kpis.periodo_kpis.mensagens_chat_periodo)}
            icon={MessageSquare}
          />
        </div>
      </section>

      <section className={sectionClass("kanban")}>
        <div>
          <h2 className="text-lg font-semibold">Kanban</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Distribuicao por status e valores</p>
        </div>
        <div className="grid gap-4">
          <Chart3DCard
            title="Quantidade por status"
            rows={kanbanQuantidadeRows}
            valueFormatter={formatCount}
            emptyLabel="Sem precatórios"
          />
          <Chart3DCard
            title="Valor por status"
            rows={kanbanValorRows}
            valueFormatter={formatCurrency}
            emptyLabel="Sem valores"
          />
        </div>
      </section>
      <section className={sectionClass("propostas")}>
        <div>
          <h2 className="text-lg font-semibold">Propostas</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Valores e distribuicao</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard title="Valor total" value={formatCurrency(kpis.propostas.valor_total)} icon={Wallet} />
          <MetricCard title="Ticket medio" value={formatCurrency(kpis.propostas.ticket_medio)} icon={TrendingUp} />
          <MetricCard title="Desconto medio" value={formatPercent(kpis.propostas.desconto_medio, 2)} icon={Percent} />
        </div>
        <SimpleTableCard title="Propostas por status" rows={propostaStatusRows} emptyLabel="Sem propostas" />
      </section>

      <section className={sectionClass("calculo")}>
        <div>
          <h2 className="text-lg font-semibold">Calculo</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Status da fila e versoes</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard title="Pronto para calculo" value={formatCount(kpis.calculo.pronto_calculo)} icon={ListChecks} />
          <MetricCard title="Em calculo" value={formatCount(kpis.calculo.em_calculo)} icon={Clock} />
          <MetricCard
            title="Concluidos"
            value={formatCount(kpis.calculo.concluido)}
            icon={CheckCircle2}
            variant="success"
          />
          <MetricCard
            title="Desatualizados"
            value={formatCount(kpis.calculo.desatualizado)}
            icon={AlertTriangle}
            variant={kpis.calculo.desatualizado > 0 ? "warning" : "default"}
          />
          <MetricCard title="Versoes media" value={kpis.calculo.versoes_media.toFixed(1)} icon={TrendingUp} />
        </div>
      </section>
      <section className={sectionClass("sla")}>
        <div>
          <h2 className="text-lg font-semibold">SLA de calculo</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Controle de prazo e eficiencia</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="No prazo" value={formatCount(kpis.sla.no_prazo)} icon={CheckCircle2} variant="success" />
          <MetricCard title="Atencao" value={formatCount(kpis.sla.atencao)} icon={AlertTriangle} variant="warning" />
          <MetricCard
            title="Atrasado"
            value={formatCount(kpis.sla.atrasado)}
            icon={AlertTriangle}
            variant={kpis.sla.atrasado > 0 ? "danger" : "default"}
          />
          <MetricCard title="Nao iniciado" value={formatCount(kpis.sla.nao_iniciado)} icon={Clock} />
          <MetricCard title="Concluido" value={formatCount(kpis.sla.concluido)} icon={CheckCircle2} variant="success" />
          <MetricCard title="Tempo medio" value={formatHours(kpis.sla.tempo_medio_calculo_horas)} icon={Clock} />
          <MetricCard title="Total em calculo" value={formatCount(kpis.sla.total_em_calculo)} icon={Clock} />
        </div>
      </section>

      <section className={sectionClass("documentos")}>
        <div>
          <h2 className="text-lg font-semibold">Documentos e certidoes</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Progresso dos itens obrigatorios</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Documentos do credor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {formatCount(kpis.documentos_certidoes.docs_recebidos)} / {formatCount(kpis.documentos_certidoes.total_docs)}
                </span>
                <Badge className="bg-lime-100 text-lime-800 border border-lime-200 font-mono tabular-nums">
                  {docsPercent.toFixed(0)}%
                </Badge>
              </div>
              <Progress value={docsPercent} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Certidoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {formatCount(kpis.documentos_certidoes.certidoes_recebidas)} / {formatCount(kpis.documentos_certidoes.total_certidoes)}
                </span>
                <Badge className="bg-cyan-100 text-cyan-800 border border-cyan-200 font-mono tabular-nums">
                  {certPercent.toFixed(0)}%
                </Badge>
              </div>
              <Progress value={certPercent} />
              <div className="text-sm">
                <Badge
                  variant={kpis.documentos_certidoes.certidoes_vencidas > 0 ? "destructive" : "secondary"}
                  className="font-mono tabular-nums"
                >
                  Vencidas: {formatCount(kpis.documentos_certidoes.certidoes_vencidas)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      <section className={sectionClass("credores")}>
        <div>
          <h2 className="text-lg font-semibold">Credores</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Base e valores consolidados</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard title="Total credores" value={formatCount(kpis.credores.total_credores)} icon={Users} />
          <MetricCard title="Valor total principal" value={formatCurrency(kpis.credores.valor_total_principal)} icon={Wallet} />
        </div>
      </section>

      <section className={sectionClass("usuarios")}>
        <div>
          <h2 className="text-lg font-semibold">Usuarios</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Distribuicao por role</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard title="Usuarios ativos" value={formatCount(kpis.usuarios.ativos_total)} icon={Users} />
          <SimpleTableCard title="Ativos por role" rows={usuarioRoleRows} emptyLabel="Sem usuarios" />
        </div>
      </section>

      <section className={sectionClass("juridico")}>
        <div>
          <h2 className="text-lg font-semibold">Juridico</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Status de parecer e resultado</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <SimpleTableCard title="Parecer por status" rows={juridicoParecerRows} emptyLabel="Sem pareceres" />
          <SimpleTableCard title="Resultado final" rows={juridicoResultadoRows} emptyLabel="Sem resultados" />
        </div>
      </section>
      <section className={sectionClass("oficios")}>
        <div>
          <h2 className="text-lg font-semibold">Oficios</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Pendencias e concluido</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard title="Análise Processual Inicial" value={formatCount(kpis.oficios.analise_processual_inicial)} icon={FileText} />
          <MetricCard
            title="Com oficio"
            value={formatCount(kpis.oficios.com_oficio)}
            icon={CheckCircle2}
            variant="success"
          />
        </div>
      </section>

      <section className={sectionClass("atividades")}>
        <div>
          <h2 className="text-lg font-semibold">Atividades</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Eventos por tipo</p>
        </div>
        <SimpleTableCard title="Atividades por tipo" rows={atividadesRows} emptyLabel="Sem atividades" />
      </section>

      <Separator />

      <section className={sectionClass("operacao", "space-y-6")}>
        <div>
          <h2 className="text-lg font-semibold">Operacao</h2>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Indicadores operacionais detalhados</p>
        </div>
        <ComplexityOverview data={operational.complexity} loading={refreshing} />
        <PerformanceMetrics data={operational.performance} loading={refreshing} />
        {operational.bottlenecks.length > 0 && (
          <DelayBottlenecks data={operational.bottlenecks} loading={refreshing} />
        )}
        {operational.operators.length > 0 && <OperatorDistribution data={operational.operators} loading={refreshing} />}
        <CriticalPrecatorios data={operational.critical} loading={refreshing} />
      </section>
    </div>
  )
}
