"use client"

import { MetricCard } from "./metric-card"
import { Clock, CheckCircle2, AlertCircle } from "lucide-react"
import type { PerformanceMetrics } from "@/lib/types/dashboard"

interface PerformanceMetricsProps {
  data: PerformanceMetrics
  loading?: boolean
}

export function PerformanceMetrics({ data, loading }: PerformanceMetricsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`
    }
    return `${hours.toFixed(1)}h`
  }

  // Determinar variante baseado em thresholds
  const getFilaVariant = () => {
    if (data.tempo_medio_fila < 12) return "success"
    if (data.tempo_medio_fila < 24) return "warning"
    return "danger"
  }

  const getFinalizarVariant = () => {
    if (data.tempo_medio_finalizar < 24) return "success"
    if (data.tempo_medio_finalizar < 48) return "warning"
    return "danger"
  }

  const getSLAVariant = () => {
    if (data.sla_estourado === 0) return "success"
    if (data.sla_estourado < 5) return "warning"
    return "danger"
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Performance Operacional</h3>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Métricas de tempo e eficiência</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Tempo Médio em Fila"
          value={formatHours(data.tempo_medio_fila)}
          subtitle={`${data.total_em_calculo} precatórios em cálculo`}
          icon={Clock}
          variant={getFilaVariant()}
        />

        <MetricCard
          title="Tempo Médio p/ Finalizar"
          value={formatHours(data.tempo_medio_finalizar)}
          subtitle={`${data.total_finalizados} precatórios finalizados`}
          icon={CheckCircle2}
          variant={getFinalizarVariant()}
        />

        <MetricCard
          title="SLA Estourado"
          value={data.sla_estourado}
          subtitle={data.sla_estourado === 0 ? "Nenhum atraso" : "Precatórios atrasados"}
          icon={AlertCircle}
          variant={getSLAVariant()}
        />
      </div>
    </div>
  )
}
