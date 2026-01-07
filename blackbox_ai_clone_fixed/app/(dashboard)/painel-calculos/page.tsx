"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calculator, Clock, AlertCircle } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { RoleGuard } from "@/lib/auth/role-guard"

interface PrecatorioComUsuario {
  id: string
  titulo: string | null
  numero_processo: string | null
  numero_precatorio: string | null
  credor_nome: string | null
  valor_principal: number | null
  valor_atualizado: number | null
  status: string | null
  created_at: string
  criado_por: string | null
  responsavel: string | null
  responsavel_calculo_id: string | null
  proposta_menor_valor: number | null
  proposta_maior_valor: number | null
  proposta_menor_valor_display: string | null
  proposta_maior_valor_display: string | null
  prioridade: boolean | null
  criador_nome: string | null
  responsavel_nome: string | null
  responsavel_calculo_nome: string | null
}

export default function PainelCalculosPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioComUsuario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      loadCalculosPendentes()
    }
  }, [profile])

  async function loadCalculosPendentes() {
    try {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const userId = user?.id

      console.log("[PAINEL CALCULOS] Loading for userId:", userId)

      if (supabase && userId) {
        const { data, error } = await supabase
          .from("precatorios_cards")
          .select(
            "id,titulo,numero_processo,numero_precatorio,credor_nome,valor_principal,valor_atualizado,status,created_at,criado_por,responsavel,responsavel_calculo_id,prioridade,proposta_menor_valor,proposta_maior_valor,proposta_menor_valor_display,proposta_maior_valor_display,criador_nome,responsavel_nome,responsavel_calculo_nome",
          )
          .eq("responsavel_calculo_id", userId)
          .in("status", ["em_calculo", "calculado"])
          .order("created_at", { ascending: true })

        console.log("[PAINEL CALCULOS] Query result:", { count: data?.length, error })

        if (error) {
          console.error("[PAINEL CALCULOS] Query error:", error)
          console.error("[PAINEL CALCULOS] Error details:", JSON.stringify(error, null, 2))
          throw error
        }

        if (data) {
          const sorted = [...data].sort((a, b) => {
            if (a.prioridade && !b.prioridade) return -1
            if (!a.prioridade && b.prioridade) return 1
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
          setPrecatorios(sorted)
        }
      }
    } catch (error) {
      console.error("[PAINEL CALCULOS] Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const abrirCalculadora = (precatorioId: string) => {
    router.push(`/calcular?id=${precatorioId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando cálculos pendentes...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["admin", "operador_calculo"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Cálculos</h1>
          <p className="text-muted-foreground">Precatórios atribuídos a você para cálculo</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Cálculo</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{precatorios.filter((p) => p.status === "em_calculo").length}</div>
              <p className="text-xs text-muted-foreground">Aguardando processamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calculados</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{precatorios.filter((p) => p.status === "calculado").length}</div>
              <p className="text-xs text-muted-foreground">Com valores definidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prioridade Alta</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{precatorios.filter((p) => p.prioridade).length}</div>
              <p className="text-xs text-muted-foreground">Urgentes</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Precatórios para Calcular</h2>

          {precatorios.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhum cálculo pendente</p>
                <p className="text-sm text-muted-foreground">Não há precatórios para calcular no momento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {precatorios.map((precatorio) => (
                <Card
                  key={precatorio.id}
                  className={`hover:shadow-md transition-shadow ${
                    precatorio.prioridade ? "border-red-500 border-2" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {precatorio.prioridade && <AlertCircle className="h-4 w-4 text-red-500" />}
                          {precatorio.titulo || precatorio.numero_precatorio || "Sem título"}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {precatorio.credor_nome || "Credor não informado"}
                        </CardDescription>
                      </div>
                      <Badge variant={precatorio.status === "em_calculo" ? "default" : "secondary"}>
                        {precatorio.status === "em_calculo" ? "Em Cálculo" : "Calculado"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Valor Principal:</span>
                        <span className="font-medium">
                          {precatorio.valor_principal
                            ? new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(precatorio.valor_principal)
                            : "Aguardando"}
                        </span>
                      </div>
                      {precatorio.valor_atualizado && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Valor Atualizado:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(precatorio.valor_atualizado)}
                          </span>
                        </div>
                      )}
                    </div>

                    {(precatorio.proposta_menor_valor_display || precatorio.proposta_maior_valor_display) && (
                      <div className="pt-2 border-t space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Propostas Calculadas:</p>
                        {precatorio.proposta_menor_valor_display && (
                          <div className="flex items-center justify-between text-xs">
                            <span>Menor:</span>
                            <span className="font-medium">{precatorio.proposta_menor_valor_display}</span>
                          </div>
                        )}
                        {precatorio.proposta_maior_valor_display && (
                          <div className="flex items-center justify-between text-xs">
                            <span>Maior:</span>
                            <span className="font-medium">{precatorio.proposta_maior_valor_display}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                      {precatorio.criador_nome && (
                        <div>
                          <span className="font-medium">Criado por:</span> {precatorio.criador_nome}
                        </div>
                      )}
                      {precatorio.responsavel_nome && (
                        <div>
                          <span className="font-medium">Comercial:</span> {precatorio.responsavel_nome}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t">
                      <Button onClick={() => abrirCalculadora(precatorio.id)} className="w-full" size="sm">
                        <Calculator className="w-4 h-4 mr-2" />
                        Abrir Calculadora
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}
