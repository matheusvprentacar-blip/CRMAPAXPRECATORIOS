"use client"

import { MetricCard } from "./metric-card"
import { Layers, TrendingUp, TrendingDown, Activity } from "lucide-react"
import type { ComplexityMetrics } from "@/lib/types/dashboard"

interface ComplexityOverviewProps {
  data: ComplexityMetrics
  loading?: boolean
}

export function ComplexityOverview({ data, loading }: ComplexityOverviewProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Visão por Complexidade</h3>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Distribuição de precatórios por nível de complexidade</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Baixa Complexidade"
          value={data.baixa}
          subtitle={`${data.percentuais.baixa.toFixed(1)}% do total`}
          icon={TrendingDown}
          variant="success"
        />

        <MetricCard
          title="Média Complexidade"
          value={data.media}
          subtitle={`${data.percentuais.media.toFixed(1)}% do total`}
          icon={Activity}
          variant="warning"
        />

        <MetricCard
          title="Alta Complexidade"
          value={data.alta}
          subtitle={`${data.percentuais.alta.toFixed(1)}% do total`}
          icon={TrendingUp}
          variant="danger"
        />

        <MetricCard
          title="Total de Precatórios"
          value={data.total}
          subtitle="Todos os níveis"
          icon={Layers}
          variant="default"
        />
      </div>
    </div>
  )
}
