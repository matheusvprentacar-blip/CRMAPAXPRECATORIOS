"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, AlertCircle, Calculator, User } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
import { Button } from "@/components/ui/button"

export default function FilaCalculoPage() {
  const router = useRouter()
  const [filaGlobal, setFilaGlobal] = useState<Precatorio[]>([])
  const [filaCalculo, setFilaCalculo] = useState<Precatorio[]>([])
  const [meusPrecatorios, setMeusPrecatorios] = useState<Precatorio[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("fila-global")
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [assuming, setAssuming] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const {
        data: { user, session },
      } = await supabase.auth.getSession()
      if (!user) return

      setAuthUserId(user.id)
      const role = session?.user?.app_metadata?.role
      setUserRole(role)

      console.log("[CALCULO] ROLE:", role, "USER ID:", user.id)
      console.log("[CALCULO] Full app_metadata:", session?.user?.app_metadata)

      const { data: global, error: globalError } = await supabase
        .from("precatorios_cards")
        .select(
          "id,titulo,numero_processo,numero_precatorio,credor_nome,valor_principal,valor_atualizado,status,created_at,criado_por,responsavel,responsavel_calculo_id,prioridade,urgente,proposta_menor_valor_display,proposta_maior_valor_display,tribunal",
        )
        .eq("status", "em_calculo")
        .order("urgente", { ascending: false })
        .order("created_at", { ascending: true })

      if (globalError) {
        console.error("[CALCULO] Erro fila global:", globalError)
        console.error("[CALCULO] Erro detalhes:", JSON.stringify(globalError, null, 2))
      } else {
        console.log("[v0] Fila global carregada:", global?.length || 0, "precatórios")
        if (global && global.length > 0) {
          console.log("[v0] Primeiro da fila:", global[0].id, global[0].titulo)
        }
        setFilaGlobal((global as Precatorio[]) || [])
      }

      const { data: fila, error: filaError } = await supabase
        .from("precatorios_cards")
        .select(
          "id,titulo,numero_processo,numero_precatorio,credor_nome,valor_principal,valor_atualizado,status,created_at,criado_por,responsavel,responsavel_calculo_id,prioridade,urgente,proposta_menor_valor_display,proposta_maior_valor_display,tribunal,dados_calculo_display",
        )
        .eq("responsavel_calculo_id", user.id)
        .in("status", ["em_calculo", "calculado"])
        .order("urgente", { ascending: false })
        .order("created_at", { ascending: true })

      if (filaError) {
        console.error("[CALCULO] Erro meus calculos:", filaError)
        console.error("[CALCULO] Erro detalhes:", JSON.stringify(filaError, null, 2))
      } else {
        console.log("[v0] Meus cálculos carregados:", fila?.length || 0, "precatórios")
        setFilaCalculo((fila as Precatorio[]) || [])
      }

      const { data: meus, error: meusError } = await supabase
        .from("precatorios_cards")
        .select(
          "id,titulo,numero_processo,numero_precatorio,credor_nome,valor_principal,valor_atualizado,status,created_at,criado_por,responsavel,responsavel_calculo_id,proposta_menor_valor_display,proposta_maior_valor_display,tribunal",
        )
        .or(`criado_por.eq.${user.id},responsavel.eq.${user.id}`)
        .neq("status", "em_calculo")
        .order("created_at", { ascending: false })

      if (meusError) {
        console.error("[CALCULO] Erro meus precatorios:", meusError)
      } else {
        console.log("[v0] Meus precatórios carregados:", meus?.length || 0)
        setMeusPrecatorios((meus as Precatorio[]) || [])
      }
    } catch (error) {
      console.error("[CALCULO] Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAssumir(precatorioId: string) {
    if (!authUserId) return

    setAssuming(precatorioId)
    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error("Supabase não disponível")

      console.log("[v0] Assumindo precatório:", precatorioId, "para:", authUserId)

      const { error } = await supabase
        .from("precatorios")
        .update({
          responsavel_calculo_id: authUserId,
          operador_calculo: authUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)
        .eq("status", "em_calculo")

      if (error) {
        console.error("[v0] Erro ao assumir:", error)
        throw error
      }

      console.log("[v0] Precatório assumido com sucesso")
      await loadData()
    } catch (error: any) {
      console.error("[v0] Erro ao assumir precatório:", error)
    } finally {
      setAssuming(null)
    }
  }

  const filteredFilaGlobal = searchTerm
    ? filaGlobal.filter(
        (p) =>
          p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : filaGlobal

  const filteredFila = searchTerm
    ? filaCalculo.filter(
        (p) =>
          p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : filaCalculo

  const filteredMeus = searchTerm
    ? meusPrecatorios.filter(
        (p) =>
          p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : meusPrecatorios

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operador de Cálculo</h1>
        <p className="text-muted-foreground">Gerencie sua fila de cálculos e precatórios próprios</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="fila-global" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Fila Global ({filaGlobal.length})
          </TabsTrigger>
          <TabsTrigger value="fila" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Meus Cálculos ({filaCalculo.length})
          </TabsTrigger>
          <TabsTrigger value="meus" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Meus Precatórios ({meusPrecatorios.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, número ou credor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="fila-global" className="mt-6">
          <div className="grid gap-4">
            {filteredFilaGlobal.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "Nenhum precatório encontrado" : "A fila global está vazia"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredFilaGlobal.map((precatorio, index) => (
                <Card key={precatorio.id} className="hover:bg-accent transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div
                        className="space-y-1 flex-1 cursor-pointer"
                        onClick={() => router.push(`/precatorios/${precatorio.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                          <h3 className="font-semibold text-lg">
                            {precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                          </h3>
                          {precatorio.urgente && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="h-3 w-3" />
                              Urgente
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Credor: {precatorio.credor_nome}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          {precatorio.numero_processo && <span>Processo: {precatorio.numero_processo}</span>}
                          {precatorio.tribunal && <span>Tribunal: {precatorio.tribunal}</span>}
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="text-lg font-bold">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            precatorio.valor_atualizado || precatorio.valor_principal || 0,
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAssumir(precatorio.id)
                          }}
                          disabled={assuming === precatorio.id}
                        >
                          {assuming === precatorio.id ? "Assumindo..." : "Assumir"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="fila" className="mt-6">
          <div className="grid gap-4">
            {filteredFila.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "Nenhum precatório encontrado na fila" : "A fila de cálculo está vazia"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredFila.map((precatorio, index) => (
                <Card
                  key={precatorio.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => router.push(`/precatorios/${precatorio.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                          <h3 className="font-semibold text-lg">
                            {precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                          </h3>
                          {precatorio.urgente && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="h-3 w-3" />
                              Urgente
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Credor: {precatorio.credor_nome}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          {precatorio.numero_processo && <span>Processo: {precatorio.numero_processo}</span>}
                          {precatorio.tribunal && <span>Tribunal: {precatorio.tribunal}</span>}
                        </div>
                        {precatorio.dados_calculo_display && (
                          <div className="text-sm text-muted-foreground mt-2">
                            Cálculo: {precatorio.dados_calculo_display}
                          </div>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        <div className="text-lg font-bold">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            precatorio.valor_atualizado || precatorio.valor_principal || 0,
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Recebido: {new Date(precatorio.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="meus" className="mt-6">
          <div className="grid gap-4">
            {filteredMeus.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "Nenhum precatório encontrado" : "Você não tem precatórios em negociação"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredMeus.map((precatorio) => (
                <Card
                  key={precatorio.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => router.push(`/precatorios/${precatorio.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-lg">
                          {precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">Credor: {precatorio.credor_nome}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                          {precatorio.numero_processo && <span>Processo: {precatorio.numero_processo}</span>}
                          {precatorio.tribunal && <span>Tribunal: {precatorio.tribunal}</span>}
                        </div>
                        {(precatorio.proposta_menor_valor_display || precatorio.proposta_maior_valor_display) && (
                          <div className="flex items-center gap-2 text-sm mt-2">
                            <span className="text-muted-foreground">Propostas:</span>
                            <span className="font-medium">
                              {precatorio.proposta_menor_valor_display} - {precatorio.proposta_maior_valor_display}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        <div className="text-lg font-bold">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            precatorio.valor_atualizado || precatorio.valor_principal || 0,
                          )}
                        </div>
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {precatorio.status?.replace(/_/g, " ") || "Novo"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
