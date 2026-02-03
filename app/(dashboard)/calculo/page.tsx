"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { User, Clock, Gavel, DollarSign, Calculator, AlertCircle, Search } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { SLAIndicator } from "@/components/ui/sla-indicator"
import { ModalAtraso } from "@/components/calculo/modal-atraso"
import { ModalEnviarJuridico } from "@/components/calculo/modal-enviar-juridico"
import { ModalCalculoManual } from "@/components/precatorios/modal-calculo-manual"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PrecatorioCalculo {
  id: string
  titulo: string | null
  numero_processo: string | null
  numero_precatorio: string | null
  credor_nome: string | null
  advogado_nome: string | null
  valor_principal: number | null
  valor_atualizado: number | null
  status: string | null
  localizacao_kanban?: string | null
  created_at: string
  urgente?: boolean
  tribunal?: string | null
  criador_nome?: string | null
  responsavel_nome?: string | null
  responsavel_calculo_nome?: string | null
  motivo_atraso_calculo?: string | null
  data_atraso_calculo?: string | null
  // FASE 1: Complexidade e SLA
  score_complexidade?: number
  nivel_complexidade?: "baixa" | "media" | "alta"
  data_entrada_calculo?: string | null
  sla_horas?: number
  sla_status?: "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido"
  calculo_externo?: boolean
  saldo_liquido?: number | null
  proposta_maior_valor?: number | null
  proposta_menor_valor?: number | null
}

export default function FilaCalculoPage() {
  const router = useRouter()
  const [filaCalculo, setFilaCalculo] = useState<PrecatorioCalculo[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [modalAtrasoOpen, setModalAtrasoOpen] = useState(false)
  const [modalJuridicoOpen, setModalJuridicoOpen] = useState(false)
  const [modalManualOpen, setModalManualOpen] = useState(false)
  const [precatorioParaManual, setPrecatorioParaManual] = useState<PrecatorioCalculo | null>(null)
  const [precatorioSelecionado, setPrecatorioSelecionado] = useState<PrecatorioCalculo | null>(null)
  const [calculando, setCalculando] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("aguardando")

  useEffect(() => {
    loadData()
  }, [activeTab]) // Reload when tab changes

  async function loadData() {
    setLoading(true) // Ensure loading state shows during fetch
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Buscar perfil do usuário para verificar role
      const { data: profile } = await supabase
        .from("usuarios")
        .select("role")
        .eq("id", user.id)
        .single()

      // Buscar precatórios
      let query = supabase
        .from("precatorios_cards")
        .select(
          `id,
          titulo,
          numero_processo,
          numero_precatorio,
          credor_nome,
          advogado_nome,
          valor_principal,
          valor_atualizado,
          saldo_liquido,
          calculo_externo,
          status,
          localizacao_kanban,
          created_at,
          urgente,
          tribunal,
          criador_nome,
          responsavel_nome,
          responsavel_calculo_nome,
          responsavel_calculo_id,
          motivo_atraso_calculo,
          data_atraso_calculo,
          score_complexidade,
          criador_nome,
          responsavel_nome,
          responsavel_calculo_nome,
          responsavel_calculo_id,
          motivo_atraso_calculo,
          data_atraso_calculo,
          score_complexidade,
          nivel_complexidade,
          data_entrada_calculo,
          sla_horas,
          sla_status,
          proposta_maior_valor,
          proposta_menor_valor`
        )

      // Filter based on active tab
      if (activeTab === "aguardando") {
        query = query
          .or("status.in.(pronto_calculo),localizacao_kanban.in.(pronto_calculo)")
          .is("motivo_atraso_calculo", null)
      } else if (activeTab === "iniciado") {
        query = query
          .or("status.in.(calculo_andamento,em_calculo),localizacao_kanban.in.(calculo_andamento,em_calculo)")
          .is("motivo_atraso_calculo", null)
      } else if (activeTab === "atrasados") {
        query = query.not("motivo_atraso_calculo", "is", null)
      } else if (activeTab === "juridico") {
        query = query.or("status.eq.juridico,localizacao_kanban.eq.juridico")
      } else {
        query = query
          .or("status.in.(calculo_concluido,calculado),localizacao_kanban.eq.calculo_concluido")
          .not("saldo_liquido", "is", null)
      }

      // Se for operador de cálculo (e não for admin/gestor), filtrar apenas os atribuídos a ele
      const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
      const isAdmin = roles.includes("admin") || roles.includes("gestor")

      if (roles.includes("operador_calculo") && !isAdmin) {
        // Filtrar: (responsavel = usuario ID) OU (responsavel IS NULL)
        query = query.or(`responsavel_calculo_id.eq.${user.id},responsavel_calculo_id.is.null`)
      }

      const { data, error } = await query
        .order("urgente", { ascending: false })
        .order("created_at", { ascending: true })

      if (error) {
        console.error("[FILA CALCULO] Erro ao carregar:", error)
        throw error
      }

      setFilaCalculo((data as PrecatorioCalculo[]) || [])
    } catch (error) {
      console.error("[FILA CALCULO] Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalcular = async (precatorioId: string) => {
    setCalculando(precatorioId)
    try {
      const supabase = getSupabase()
      if (supabase) {
        // Auto-move to "Em Andamento" on Kanban
        const { error } = await supabase
          .from("precatorios")
          .update({
            status: "calculo_andamento",
            status_kanban: "calculo_andamento",
            localizacao_kanban: "calculo_andamento",
            updated_at: new Date().toISOString(),
          })
          .eq("id", precatorioId)

        if (!error) {
          await supabase.from("atividades").insert({
            precatorio_id: precatorioId,
            tipo: "mudanca_status",
            descricao: "Cálculo iniciado na fila de cálculo",
          })
        }
      }
    } catch (e) {
      console.error("Erro ao atualizar status para andamento:", e)
    }
    router.push(`/calcular?id=${precatorioId}`)
  }

  const handleFinalizarCalculo = async (precatorioId: string) => {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const { error } = await supabase
        .from("precatorios")
        .update({
          status: "calculado",
          status_kanban: "calculo_concluido",
          localizacao_kanban: "calculo_concluido",
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (error) throw error

      await supabase.from("atividades").insert({
        precatorio_id: precatorioId,
        tipo: "mudanca_status",
        descricao: "Cálculo finalizado na fila de cálculo",
      })

      toast.success("Cálculo finalizado.")
      loadData()
    } catch (error: any) {
      console.error("[FILA CALCULO] Erro ao finalizar cálculo:", error)
      toast.error(error?.message || "Erro ao finalizar cálculo.")
    }
  }

  const handleRetornarJuridico = async (precatorioId: string) => {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const { error } = await supabase
        .from("precatorios")
        .update({
          status: "pronto_calculo",
          status_kanban: "pronto_calculo",
          localizacao_kanban: "pronto_calculo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (error) throw error

      await supabase.from("atividades").insert({
        precatorio_id: precatorioId,
        tipo: "mudanca_status",
        descricao: "Retorno da análise jurídica para fila de cálculo",
      })

      toast.success("Retornado para a fila de cálculo.")
      loadData()
    } catch (error: any) {
      console.error("[FILA CALCULO] Erro ao retornar do jurídico:", error)
      toast.error(error?.message || "Erro ao retornar do jurídico.")
    }
  }

  const handleReportarAtraso = (precatorio: PrecatorioCalculo) => {
    setPrecatorioSelecionado(precatorio)
    setModalAtrasoOpen(true)
  }

  const handleAtrasoSuccess = () => {
    loadData()
  }

  const handleRemoverAtraso = async (precatorioId: string) => {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      // Remover atraso (limpar campos)
      const { error } = await supabase
        .from("precatorios")
        .update({
          motivo_atraso_calculo: null,
          data_atraso_calculo: null,
          tipo_atraso: null,
          impacto_atraso: null,
        })
        .eq("id", precatorioId)

      if (error) throw error

      // Registrar atividade
      await supabase.from("atividades").insert({
        precatorio_id: precatorioId,
        tipo: "atualizacao",
        descricao: "Atraso removido - precatório retomado",
      })

      // Recarregar dados
      loadData()
    } catch (error) {
      console.error("[FILA CALCULO] Erro ao remover atraso:", error)
    }
  }

  const filteredFila = searchTerm
    ? filaCalculo.filter(
      (p) =>
        p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : filaCalculo

  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case "pronto_calculo":
        return "Pronto para cálculo"
      case "calculo_andamento":
      case "em_calculo":
        return "Em cálculo"
      case "calculo_concluido":
      case "calculado":
        return "Concluído"
      case "juridico":
        return "Jurídico"
      default:
        return status ? status.replace(/_/g, " ") : "N/I"
    }
  }

  const getStatusBadgeClass = (status?: string | null) => {
    switch (status) {
      case "pronto_calculo":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "calculo_andamento":
      case "em_calculo":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "calculo_concluido":
      case "calculado":
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      case "juridico":
        return "bg-purple-100 text-purple-700 border-purple-200"
      default:
        return "bg-slate-100 text-slate-600 border-slate-200"
    }
  }

  return (
    <div className="container mx-auto max-w-[100vw] p-6 space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fila de Cálculo</h1>
          <p className="text-muted-foreground">Gestão de precatórios para cálculo</p>
        </div>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold">{filteredFila.length}</span>
          <span className="text-sm text-muted-foreground">
            {activeTab === "aguardando"
              ? "na fila"
              : activeTab === "iniciado"
                ? "em andamento"
                : activeTab === "atrasados"
                  ? "atrasados"
                  : activeTab === "juridico"
                    ? "no jurídico"
                    : "concluídos"}
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-5">
          <TabsTrigger value="aguardando">Aguardando Cálculo</TabsTrigger>
          <TabsTrigger value="iniciado">Cálculo Iniciado</TabsTrigger>
          <TabsTrigger value="atrasados" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-900">
            Cálculo em Atraso
          </TabsTrigger>
          <TabsTrigger value="juridico">Jurídico</TabsTrigger>
          <TabsTrigger value="concluidos">Cálculos Concluídos</TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          {/* Barra de Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, número do precatório ou credor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFila.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? "Nenhum precatório encontrado" : "Lista vazia"}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      {searchTerm
                        ? "Tente ajustar os termos da busca"
                        : activeTab === "aguardando"
                          ? "Não há precatórios aguardando cálculo no momento"
                          : activeTab === "iniciado"
                            ? "Não há cálculos em andamento"
                            : activeTab === "atrasados"
                              ? "Nenhum cálculo registrado com atraso"
                              : activeTab === "juridico"
                                ? "Nenhum precatório em análise jurídica"
                                : "Nenhum cálculo concluído encontrado"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {filteredFila.map((precatorio, index) => {
                    const statusAtual = precatorio.localizacao_kanban || precatorio.status || null
                    const isJuridico = statusAtual === "juridico"
                    const isEmCalculo = statusAtual === "calculo_andamento" || statusAtual === "em_calculo"
                    const isConcluido = statusAtual === "calculo_concluido" || statusAtual === "calculado"
                    const isCalculado = isConcluido || precatorio.calculo_externo
                    return (
                      <Card
                        key={precatorio.id}
                        onClick={() => router.push(`/precatorios/detalhes?id=${precatorio.id}`)}
                        className={cn(
                          "hover:shadow-md transition-shadow cursor-pointer border-l-4 group relative overflow-hidden",
                          activeTab === 'atrasados' ? "border-l-red-500/60" : "border-l-orange-500/40"
                        )}
                      >
                        {/* Efeito de hover */}
                        <div className={cn(
                          "absolute inset-0 transition-colors",
                          activeTab === 'atrasados' ? "bg-red-500/0 group-hover:bg-red-500/5" : "bg-orange-500/0 group-hover:bg-orange-500/5"
                        )} />

                        <CardContent className="p-6 relative z-10 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-6 flex-1">
                              {/* Índice */}
                              <div className="flex flex-col items-center justify-center min-w-[3rem]">
                                <span className={cn(
                                  "text-4xl font-black text-muted-foreground/20 transition-colors",
                                  activeTab === 'atrasados' ? "group-hover:text-red-500/40" : "group-hover:text-orange-500/40"
                                )}>
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                              </div>

                              {/* Colunas de Dados */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">

                                {/* 1. Credor & Status */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                      <User className="w-3 h-3" /> Credor
                                    </span>
                                    {precatorio.urgente && <Badge variant="destructive" className="text-[10px] h-4 px-1">Urgente</Badge>}
                                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1 border", getStatusBadgeClass(statusAtual))}>
                                      {getStatusLabel(statusAtual)}
                                    </Badge>
                                  </div>
                                  <p className="font-medium truncate text-base" title={precatorio.credor_nome || ""}>{precatorio.credor_nome || "Nome não informado"}</p>
                                  <p className="text-xs text-muted-foreground truncate">{precatorio.advogado_nome || "Advogado N/I"}</p>
                                </div>

                                {/* 2. Valor */}
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <Calculator className="w-3 h-3" />
                                    {isCalculado ? "Valor Atualizado" : "Valor Principal"}
                                  </label>
                                  <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                                    {isCalculado
                                      ? (precatorio.valor_atualizado ? `R$ ${precatorio.valor_atualizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00")
                                      : (precatorio.valor_principal ? `R$ ${precatorio.valor_principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00")
                                    }
                                  </span>
                                  {isCalculado && (
                                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground mt-1">
                                      <span title="Menor Proposta">Min: {precatorio.proposta_menor_valor ? `R$ ${precatorio.proposta_menor_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</span>
                                      <span title="Maior Proposta">Max: {precatorio.proposta_maior_valor ? `R$ ${precatorio.proposta_maior_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</span>
                                    </div>
                                  )}
                                </div>

                                {/* 3. Processo */}
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Processo
                                  </label>
                                  <p className="font-medium text-sm font-mono">{precatorio.numero_processo || "N/A"}</p>
                                  <p className="text-xs text-muted-foreground">{precatorio.numero_precatorio || "Prec. N/A"}</p>
                                </div>

                                {/* 4. SLA & Responsável */}
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> SLA & Responsável
                                  </label>
                                  <div className="flex flex-col gap-1">
                                    <SLAIndicator
                                      status={precatorio.sla_status || 'nao_iniciado'}
                                      slaHoras={precatorio.sla_horas || 48}
                                      dataEntrada={precatorio.data_entrada_calculo || undefined}
                                    />
                                    <span className="text-xs text-muted-foreground truncate" title={precatorio.responsavel_calculo_nome || precatorio.criador_nome || "Ninguém"}>
                                      Resp: {precatorio.responsavel_calculo_nome || precatorio.criador_nome || "Não atribuído"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Linha de Ações (Botões) */}
                          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/50 flex-wrap">
                            {(activeTab === "aguardando" || activeTab === "iniciado") && !isJuridico && !precatorio.motivo_atraso_calculo && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReportarAtraso(precatorio); }}
                                className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline px-2 py-1 flex items-center gap-1"
                              >
                                <AlertCircle className="w-3 h-3" /> Reportar Atraso
                              </button>
                            )}

                            {activeTab === "atrasados" && precatorio.motivo_atraso_calculo && (
                              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs">
                                <AlertCircle className="w-3 h-3" />
                                <span>Em Atraso: {precatorio.motivo_atraso_calculo}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoverAtraso(precatorio.id); }}
                                  className="ml-2 underline font-bold"
                                >Resolver</button>
                              </div>
                            )}

                            {!isJuridico && activeTab !== "juridico" && activeTab !== "concluidos" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setPrecatorioSelecionado(precatorio); setModalJuridicoOpen(true); }}
                                className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:underline px-2 py-1 flex items-center gap-1"
                              >
                                <Gavel className="w-3 h-3" /> Jurídico
                              </button>
                            )}

                            {isJuridico && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRetornarJuridico(precatorio.id); }}
                                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-md"
                              >
                                Retornar do Jurídico
                              </button>
                            )}

                            <div className="flex items-center gap-2">
                              {!isConcluido && !isJuridico && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCalcular(precatorio.id)
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-4 rounded-md shadow-sm transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                                  title={isEmCalculo ? "Abrir cálculo" : "Iniciar cálculo"}
                                >
                                  <Calculator className="w-3 h-3" /> {isEmCalculo ? "Abrir cálculo" : "Iniciar cálculo"}
                                </button>
                              )}

                              {isEmCalculo && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleFinalizarCalculo(precatorio.id)
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-4 rounded-md shadow-sm transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                                  title="Finalizar cálculo"
                                >
                                  <Calculator className="w-3 h-3" /> Finalizar
                                </button>
                              )}

                              {!isJuridico && !isConcluido && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrecatorioParaManual(precatorio);
                                    setModalManualOpen(true);
                                  }}
                                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-1.5 px-4 rounded-md shadow-sm transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                                  title="Inserir valores calculados externamente"
                                >
                                  <DollarSign className="w-3 h-3" /> Inserir Manual
                                </button>
                              )}
                            </div>
                          </div>

                        </CardContent>
                      </Card>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </Tabs>

      {precatorioSelecionado && (
        <ModalAtraso
          open={modalAtrasoOpen}
          onOpenChange={setModalAtrasoOpen}
          precatorioId={precatorioSelecionado.id}
          precatorioTitulo={
            precatorioSelecionado.titulo ||
            precatorioSelecionado.numero_precatorio ||
            "Sem título"
          }
          onSuccess={handleAtrasoSuccess}
        />
      )}

      {precatorioSelecionado && (
        <ModalEnviarJuridico
          open={modalJuridicoOpen}
          onOpenChange={setModalJuridicoOpen}
          precatorioId={precatorioSelecionado.id}
          precatorioTitulo={
            precatorioSelecionado.titulo ||
            precatorioSelecionado.numero_precatorio ||
            "Sem título"
          }
          onSuccess={handleAtrasoSuccess}
        />
      )}

      {precatorioParaManual && (
        <ModalCalculoManual
          open={modalManualOpen}
          onOpenChange={setModalManualOpen}
          precatorio={precatorioParaManual as any}
          onSuccess={() => {
            setModalManualOpen(false)
            setPrecatorioParaManual(null)
            loadData()
          }}
        />
      )}
    </div>
  )
}
