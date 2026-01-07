"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, FileText, Clock, CheckCircle2, TrendingUp, Users, UserCheck } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import type { Precatorio } from "@/lib/types/database"

export default function DashboardPage() {
  const { profile } = useAuth()
  const [precatorios, setPrecatorios] = useState<Precatorio[]>([])
  const [loading, setLoading] = useState(true)
  const [distribuidosPeloAdmin, setDistribuidosPeloAdmin] = useState(0)
  const [precatoriosRecentes, setPrecatoriosRecentes] = useState<Precatorio[]>([])

  useEffect(() => {
    if (profile) {
      loadData()
    }
  }, [profile])

  async function loadData() {
    try {
      const supabase = createBrowserClient()

      if (supabase) {
        let query = supabase.from("precatorios").select("*")

        if (profile?.role === "operador_comercial" || profile?.role === "operador") {
          query = query.or(`criado_por.eq.${profile.id},responsavel.eq.${profile.id}`)

          const { count } = await supabase
            .from("precatorios")
            .select("id", { count: "exact", head: true })
            .eq("responsavel", profile.id)
            .is("deleted_at", null)

          if (count) setDistribuidosPeloAdmin(count)

          const { data: recentes } = await supabase
            .from("precatorios")
            .select("*")
            .eq("responsavel", profile.id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(10)

          if (recentes) setPrecatoriosRecentes(recentes as Precatorio[])
        } else if (profile?.role === "operador_calculo") {
          query = query.or(`criado_por.eq.${profile.id},responsavel_calculo_id.eq.${profile.id}`)
        }
        // Admin vê todos (sem filtro)

        const { data, error } = await query.order("created_at", { ascending: false })

        if (!error && data) {
          setPrecatorios(data as Precatorio[])
        }
      }
    } catch (error) {
      console.error("[v0] Dashboard: Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalPrecatorios = precatorios.length
  const emAnalise = precatorios.filter((p) => ["novo", "em_calculo"].includes(p.status || "")).length
  const emNegociacao = precatorios.filter((p) => p.status === "aguardando_cliente").length
  const finalizados = precatorios.filter((p) => p.status === "concluido").length

  const valorTotal = precatorios.reduce((sum, p) => sum + (p.valor_atualizado || p.valor_principal || 0), 0)
  const valorLiquidoTotal = precatorios.reduce((sum, p) => sum + (p.valor_liquido_credor || 0), 0)

  const stats = [
    {
      title: "Total de Precatórios",
      value: totalPrecatorios,
      icon: FileText,
      description: profile?.role === "admin" ? "Todos no sistema" : "Do seu workspace",
      show: true,
    },
    {
      title: "Distribuídos pelo Admin",
      value: distribuidosPeloAdmin,
      icon: UserCheck,
      description: "Atribuídos a você",
      show: profile?.role === "operador_comercial",
    },
    {
      title: "Valor Total",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorTotal),
      icon: DollarSign,
      description: "Valor atualizado",
      show: true,
    },
    {
      title: "Em Análise",
      value: emAnalise,
      icon: Clock,
      description: "Aguardando cálculo",
      show: true,
    },
    {
      title: "Em Negociação",
      value: emNegociacao,
      icon: TrendingUp,
      description: "Aguardando cliente",
      show: true,
    },
    {
      title: "Finalizados",
      value: finalizados,
      icon: CheckCircle2,
      description: "Processos concluídos",
      show: true,
    },
    {
      title: "Valor Líquido",
      value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorLiquidoTotal),
      icon: Users,
      description: "Após descontos",
      show: true,
    },
  ].filter((stat) => stat.show)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {profile?.role === "admin" ? "Visão geral de todos os precatórios" : `Seus precatórios - ${profile?.nome}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {profile?.role === "operador_comercial" && precatoriosRecentes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Atribuídos Recentemente pelo Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {precatoriosRecentes.map((precatorio) => (
                <div key={precatorio.id} className="flex items-center">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium leading-none">
                      {precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                    </p>
                    <p className="text-sm text-muted-foreground">{precatorio.credor_nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        precatorio.valor_atualizado || precatorio.valor_principal || 0,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(precatorio.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Precatórios Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {precatorios.slice(0, 5).map((precatorio) => (
              <div key={precatorio.id} className="flex items-center">
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium leading-none">
                    {precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{precatorio.credor_nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      precatorio.valor_atualizado || precatorio.valor_principal || 0,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {precatorio.status?.replace(/_/g, " ") || "novo"}
                  </p>
                </div>
              </div>
            ))}
            {precatorios.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum precatório encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
