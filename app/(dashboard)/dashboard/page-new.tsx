"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { ComplexityOverview } from "@/components/dashboard/complexity-overview"
import { DelayBottlenecks } from "@/components/dashboard/delay-bottlenecks"
import { PerformanceMetrics } from "@/components/dashboard/performance-metrics"
import { OperatorDistribution } from "@/components/dashboard/operator-distribution"
import { CriticalPrecatorios } from "@/components/dashboard/critical-precatorios"
import type { DashboardMetrics } from "@/lib/types/dashboard"

export default function DashboardPage() {
  const { profile } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (profile) {
      loadDashboardMetrics()
    }
  }, [profile])

  async function loadDashboardMetrics() {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      setRefreshing(true)

      // Carregar todas as métricas em paralelo
      const [complexity, bottlenecks, performance, operators, critical] = await Promise.all([
        fetchComplexityData(supabase),
        fetchBottlenecksData(supabase),
        fetchPerformanceData(supabase),
        fetchOperatorsData(supabase, profile?.id, profile?.role),
        fetchCriticalData(supabase),
      ])

      setMetrics({
        complexity,
        bottlenecks,
        performance,
        operators,
        critical,
        financial: { totalPrincipal: 0, totalAtualizado: 0 },
      })
    } catch (error) {
      console.error("[DASHBOARD] Erro ao carregar métricas:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // BLOCO 1: Complexidade
  async function fetchComplexityData(supabase: any) {
    const { data, error } = await supabase
      .from("precatorios")
      .select("nivel_complexidade")
      .is("deleted_at", null)

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

  // BLOCO 2: Gargalos
  async function fetchBottlenecksData(supabase: any) {
    const { data, error } = await supabase
      .from("precatorios")
      .select("tipo_atraso, sla_status")
      .not("tipo_atraso", "is", null)
      .is("deleted_at", null)

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

  // BLOCO 3: Performance
  async function fetchPerformanceData(supabase: any) {
    // Tempo médio em fila
    const { data: emFila } = await supabase
      .from("precatorios")
      .select("data_entrada_calculo")
      .eq("status", "em_calculo")
      .not("data_entrada_calculo", "is", null)
      .is("deleted_at", null)

    const tempoMedioFila =
      emFila && emFila.length > 0
        ? emFila.reduce((sum: number, p: any) => {
          const horas = (Date.now() - new Date(p.data_entrada_calculo).getTime()) / (1000 * 60 * 60)
          return sum + horas
        }, 0) / emFila.length
        : 0

    // Tempo médio para finalizar
    const { data: finalizados } = await supabase
      .from("precatorios")
      .select("data_entrada_calculo, data_calculo")
      .eq("status", "concluido")
      .not("data_entrada_calculo", "is", null)
      .not("data_calculo", "is", null)
      .is("deleted_at", null)

    const tempoMedioFinalizar =
      finalizados && finalizados.length > 0
        ? finalizados.reduce((sum: number, p: any) => {
          const horas =
            (new Date(p.data_calculo).getTime() - new Date(p.data_entrada_calculo).getTime()) / (1000 * 60 * 60)
          return sum + horas
        }, 0) / finalizados.length
        : 0

    // SLA estourado
    const { count: slaEstourado } = await supabase
      .from("precatorios")
      .select("id", { count: "exact", head: true })
      .eq("sla_status", "atrasado")
      .is("deleted_at", null)

    return {
      tempo_medio_fila: tempoMedioFila,
      tempo_medio_finalizar: tempoMedioFinalizar,
      sla_estourado: slaEstourado || 0,
      total_em_calculo: emFila?.length || 0,
      total_finalizados: finalizados?.length || 0,
    }
  }

  // BLOCO 4: Operadores
  async function fetchOperatorsData(supabase: any, userId?: string, userRole?: string | string[]) {
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

    // Se não for admin, filtrar apenas o próprio operador
    const roles = Array.isArray(userRole) ? userRole : [userRole].filter(Boolean)
    const isAdmin = roles.includes("admin")

    if (!isAdmin && userId) {
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

  // BLOCO 5: Críticos
  async function fetchCriticalData(supabase: any) {
    const { data, error } = await supabase.rpc("get_critical_precatorios")

    if (error) {
      console.error("[DASHBOARD] Erro ao buscar críticos:", error)
      // Fallback: buscar manualmente
      const { data: fallbackData } = await supabase
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
        .order("created_at", { ascending: true })
        .limit(10)

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

    return data || []
  }

  const handleRefresh = () => {
    loadDashboardMetrics()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Estratégico</h1>
          <p className="text-muted-foreground">
            {Array.isArray(profile?.role) && profile.role.includes("admin")
              ? "Visão completa de todos os precatórios"
              : `Seu desempenho - ${profile?.nome}`}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {metrics && (
        <>
          {/* BLOCO 1: Visão por Complexidade */}
          <ComplexityOverview data={metrics.complexity} loading={refreshing} />

          {/* BLOCO 3: Performance Operacional */}
          <PerformanceMetrics data={metrics.performance} loading={refreshing} />

          {/* BLOCO 2: Gargalos por Motivo de Atraso */}
          {metrics.bottlenecks.length > 0 && <DelayBottlenecks data={metrics.bottlenecks} loading={refreshing} />}

          {/* BLOCO 4: Distribuição por Operador */}
          {metrics.operators.length > 0 && <OperatorDistribution data={metrics.operators} loading={refreshing} />}

          {/* BLOCO 5: Precatórios Críticos */}
          <CriticalPrecatorios data={metrics.critical} loading={refreshing} />
        </>
      )}
    </div>
  )
}
