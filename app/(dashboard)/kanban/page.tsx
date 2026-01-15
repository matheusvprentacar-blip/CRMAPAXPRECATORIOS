"use client"
/* eslint-disable */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lock, LockOpen, CheckCircle2, Clock, Kanban } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

import { SearchBar } from "@/components/precatorios/search-bar"
import { AdvancedFilters } from "@/components/precatorios/advanced-filters"
import { KANBAN_COLUMNS } from "./columns";
import type { FiltrosPrecatorios } from "@/lib/types/filtros"
import { getFiltrosAtivos } from "@/lib/types/filtros"
import { X } from "lucide-react"

// 11 Colunas do Kanban com Gates
const COLUNAS = KANBAN_COLUMNS;

// Colunas que permitem acesso à área de cálculos
const COLUNAS_CALCULO_PERMITIDO = [
  "pronto_calculo",
  "calculo_andamento",
  "analise_juridica",
  "calculo_concluido",
]

interface PrecatorioCard {
  id: string
  titulo: string | null
  numero_precatorio: string | null
  credor_nome: string | null
  devedor: string | null
  tribunal: string | null
  status_kanban: string
  interesse_status: string | null
  calculo_desatualizado: boolean
  calculo_ultima_versao: number
  valor_principal: number | null
  valor_atualizado: number | null
  saldo_liquido: number | null
  responsavel_calculo_id: string | null
  created_at: string
  // Campos para filtros avançados
  nivel_complexidade?: 'baixa' | 'media' | 'alta' | null
  sla_status?: 'nao_iniciado' | 'no_prazo' | 'atencao' | 'atrasado' | 'concluido' | null
  tipo_atraso?: string | null
  impacto_atraso?: 'baixo' | 'medio' | 'alto' | null
  urgente?: boolean
  titular_falecido?: boolean
  data_entrada_calculo?: string | null
  status?: string // Usado para filtro de status também
  resumo_itens?: {
    total_docs: number
    docs_recebidos: number
    total_certidoes: number
    certidoes_recebidas: number
    certidoes_nao_aplicavel: number
    percentual_docs: number
    percentual_certidoes: number
  }
}

export default function KanbanPageNewGates() {
  const { profile } = useAuth()
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioCard[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<FiltrosPrecatorios>({}) // Filtros state

  const [moveDialog, setMoveDialog] = useState<{
    open: boolean
    precatorioId: string | null
    colunaDestino: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validacao: any
  }>({
    open: false,
    precatorioId: null,
    colunaDestino: null,
    validacao: null,
  })
  const [motivoFechamento, setMotivoFechamento] = useState("")

  useEffect(() => {
    if (profile) {
      loadPrecatorios()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadPrecatorios() {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      setLoading(true)

      const { data: precatoriosData, error } = await supabase
        .from('precatorios')
        .select(`
          id,
          titulo,
          numero_precatorio,
          credor_nome,
          devedor,
          tribunal,
          status_kanban,
          interesse_status,
          calculo_desatualizado,
          calculo_ultima_versao,
          valor_principal,
          valor_atualizado,
          saldo_liquido,
          prioridade,
          responsavel,
          responsavel_certidoes_id,
          responsavel_juridico_id,
          responsavel_calculo_id,
          created_at,
          nivel_complexidade,
          sla_status,
          tipo_atraso,
          impacto_atraso,
          urgente,
          status
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Buscar resumos
      const precatoriosComResumo = await Promise.all(
        (precatoriosData || []).map(async (p) => {
          const { data: resumo } = await supabase
            .from('view_resumo_itens_precatorio')
            .select('*')
            .eq('precatorio_id', p.id)
            .single()

          return {
            ...p,
            resumo_itens: resumo || null
          }
        })
      )

      // Filtragem Client-Side para "Kanban Único"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
      const isAdmin = roles.includes("admin") || roles.includes("gestor")
      const userId = profile?.id

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const precatoriosFiltrados = precatoriosComResumo.filter((p: any) => {
        if (isAdmin) return true

        if (roles.includes("operador_comercial")) {
          return p.responsavel === userId
        }
        if (roles.includes("gestor_certidoes")) {
          return p.responsavel_certidoes_id === userId
        }
        if (roles.includes("juridico")) {
          return p.responsavel_juridico_id === userId
        }
        if (roles.includes("operador_calculo")) {
          const fasesCalculo = ['pronto_calculo', 'calculo_andamento', 'calculo_concluido']
          return p.responsavel_calculo_id === userId || (!p.responsavel_calculo_id && fasesCalculo.includes(p.status_kanban))
        }

        return false
      })

      setPrecatorios(precatoriosFiltrados as PrecatorioCard[])
    } catch (error) {
      console.error("[Kanban] Erro ao carregar:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os precatórios",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  }

  const getFilteredPrecatorios = () => {
    return precatorios.filter(p => {
      // 1. Busca por termo
      if (filtros.termo) {
        const term = normalizeString(filtros.termo)
        const matchTermo = (
          (p.titulo && normalizeString(p.titulo).includes(term)) ||
          (p.numero_precatorio && normalizeString(p.numero_precatorio).includes(term)) ||
          (p.credor_nome && normalizeString(p.credor_nome).includes(term)) ||
          (p.devedor && normalizeString(p.devedor).includes(term)) ||
          (p.tribunal && normalizeString(p.tribunal).includes(term))
        )
        if (!matchTermo) return false
      }

      // 2. Status
      if (filtros.status && filtros.status.length > 0) {
        if (!filtros.status.includes(p.status || '')) return false
      }

      // 3. Complexidade (Mapeado para nivel_complexidade)
      if (filtros.complexidade && filtros.complexidade.length > 0) {
        if (!p.nivel_complexidade || !filtros.complexidade.includes(p.nivel_complexidade)) return false
      }

      // 4. SLA Status
      if (filtros.sla_status && filtros.sla_status.length > 0) {
        if (!p.sla_status || !filtros.sla_status.includes(p.sla_status)) return false
      }

      // 5. Tipo Atraso
      if (filtros.tipo_atraso && filtros.tipo_atraso.length > 0) {
        // Casting p.tipo_atraso to avoid type mismatch if needed, though defined as string | null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!p.tipo_atraso || !filtros.tipo_atraso.includes(p.tipo_atraso as any)) return false
      }

      // 6. Impacto Atraso
      if (filtros.impacto_atraso && filtros.impacto_atraso.length > 0) {
        if (!p.impacto_atraso || !filtros.impacto_atraso.includes(p.impacto_atraso)) return false
      }

      // 7. Datas de Criação
      if (filtros.data_criacao_inicio) {
        if (new Date(p.created_at) < new Date(filtros.data_criacao_inicio)) return false
      }
      if (filtros.data_criacao_fim) {
        const endDate = new Date(filtros.data_criacao_fim)
        endDate.setHours(23, 59, 59, 999)
        if (new Date(p.created_at) > endDate) return false
      }

      // 8. Valores
      const valor = (p.valor_atualizado && p.valor_atualizado > 0) ? p.valor_atualizado : (p.valor_principal || 0)
      if (filtros.valor_min && valor < filtros.valor_min) return false
      if (filtros.valor_max && valor > filtros.valor_max) return false

      // 9. Flags
      if (filtros.urgente && !p.urgente) return false
      if (filtros.titular_falecido && !p.titular_falecido) return false

      return true
    })
  }

  // Handlers para Filtros
  const updateFiltros = (novosFiltros: FiltrosPrecatorios) => {
    setFiltros(novosFiltros)
  }

  const clearFiltros = () => {
    setFiltros({})
  }

  const removeFiltro = (key: string) => {
    setFiltros((prev) => {
      const newFiltros = { ...prev }
      delete newFiltros[key as keyof FiltrosPrecatorios]
      return newFiltros
    })
  }

  const filtrosAtivos = getFiltrosAtivos(filtros)
  const filteredPrecatorios = getFilteredPrecatorios()

  const agruparPorColuna = () => {
    const grupos: Record<string, PrecatorioCard[]> = {}

    COLUNAS.forEach((coluna) => {
      grupos[coluna.id] = filteredPrecatorios.filter((p) => p.status_kanban === coluna.id)
    })

    return grupos
  }

  // Helper para atualizar termo da searchbar
  const setSearchTerm = (term: string) => {
    setFiltros(prev => ({ ...prev, termo: term }))
  }

  // ... restante do componente ... 

  // Inside return statement replace header:


  const calcularTotalColuna = (precatorios: PrecatorioCard[]) => {
    return precatorios.reduce((acc, p) => {
      // Se tiver valor atualizado, usa. Se não, usa valor principal.
      const valor = (p.valor_atualizado && p.valor_atualizado > 0)
        ? p.valor_atualizado
        : (p.valor_principal ?? 0)
      return acc + valor
    }, 0)
  }

  const formatBR = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onDragEnd(result: any) {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const colunaDestino = destination.droppableId

    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      // Validar movimentação
      const { data: validacao, error: validacaoError } = await supabase
        .rpc('validar_movimentacao_kanban', {
          p_precatorio_id: draggableId,
          p_coluna_destino: colunaDestino
        })

      if (validacaoError) throw validacaoError

      if (!validacao.valido) {
        // Movimentação bloqueada
        setMoveDialog({
          open: true,
          precatorioId: draggableId,
          colunaDestino: colunaDestino,
          validacao: validacao,
        })
        return
      }

      // Mapeamento de status do Kanban para status do sistema
      const statusMapping: Record<string, string> = {
        pronto_calculo: 'em_calculo',
        calculo_andamento: 'em_calculo',
        calculo_concluido: 'calculado',
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        status_kanban: colunaDestino,
        updated_at: new Date().toISOString()
      }

      // Se houver um mapeamento para o novo status, atualizar também
      if (statusMapping[colunaDestino]) {
        updateData.status = statusMapping[colunaDestino]
      }

      // Se sucesso, atualizar
      const { error: updateError } = await supabase
        .from('precatorios')
        .update(updateData)
        .eq('id', draggableId)

      if (updateError) throw updateError

      toast({
        title: "Movido com sucesso",
        description: `Precatório movido para ${colunaDestino}`,
      })

      await loadPrecatorios()
    } catch (error) {
      console.error("[Kanban] Erro ao mover:", error)
      toast({
        title: "Erro",
        description: "Não foi possível mover o precatório",
        variant: "destructive",
      })
    }
  }

  async function confirmarMovimentacao() {
    if (!moveDialog.precatorioId || !moveDialog.colunaDestino) return

    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        status_kanban: moveDialog.colunaDestino,
        updated_at: new Date().toISOString()
      }

      // Mapeamento de status
      const statusMapping: Record<string, string> = {
        pronto_calculo: 'em_calculo',
        calculo_andamento: 'em_calculo',
        calculo_concluido: 'calculado',
      }

      if (statusMapping[moveDialog.colunaDestino]) {
        updateData.status = statusMapping[moveDialog.colunaDestino]
      }

      if (moveDialog.colunaDestino === "fechado" && motivoFechamento) {
        updateData.interesse_observacao = motivoFechamento
      }

      const { error } = await supabase
        .from('precatorios')
        .update(updateData)
        .eq('id', moveDialog.precatorioId)

      if (error) throw error

      toast({
        title: "Movido com sucesso",
        description: "Precatório movido com sucesso.",
      })

      setMoveDialog({ open: false, precatorioId: null, colunaDestino: null, validacao: null })
      setMotivoFechamento("")
      await loadPrecatorios()
    } catch (error) {
      console.error("[Kanban] Erro:", error)
      toast({
        title: "Erro",
        description: "Não foi possível mover o precatório",
        variant: "destructive",
      })
    }
  }

  function podeAcessarCalculos(precatorio: PrecatorioCard): boolean {
    // Verificar se está em coluna permitida
    if (!COLUNAS_CALCULO_PERMITIDO.includes(precatorio.status_kanban)) {
      return false
    }

    // Checking roles safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]

    // Admin e Gestor tem acesso total
    if (roles.includes("admin") || roles.includes("gestor")) return true

    // Operador de cálculo tem acesso se estiver na coluna correta
    // (A responsabilidade já foi verificada no filtro de visualização da página)
    if (roles.includes("operador_calculo")) {
      return true
    }

    return false
  }

  function abrirDetalhe(precatorioId: string) {
    // Operador comercial vai para página de visualização
    // Admin e Operador de Cálculo vão para página de edição completa
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
    if (roles.includes("operador_comercial")) {
      router.push(`/precatorios/detalhes?id=${precatorioId}`)
    } else {
      router.push(`/precatorios/visualizar?id=${precatorioId}`)
    }
  }

  async function abrirAreaCalculos(precatorioId: string) {
    // Atualizar status para Em Cálculo
    const supabase = createBrowserClient()
    if (supabase) {
      const { error } = await supabase
        .from('precatorios')
        .update({
          status: 'calculo_andamento', // ou 'em_calculo' dependendo do sistema
          status_kanban: 'calculo_andamento',
          localizacao_kanban: 'calculo_andamento',
          updated_at: new Date().toISOString()
        })
        .eq('id', precatorioId)

      if (error) {
        console.error("Erro ao atualizar status:", error)
        toast({
          title: "Erro ao atualizar status",
          description: error.message,
          variant: "destructive"
        })
        return // Stop redirection on error
      }
    }

    // Redirecionar para a Calculadora (não para a fila)
    router.push(`/calcular?id=${precatorioId}`)
  }

  const grupos = agruparPorColuna()

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
    <div className="container mx-auto max-w-[100vw] space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      {/* Header Premium */}
      <div className="flex flex-col space-y-4 border-b pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent w-fit">
              Kanban Workflow
            </h1>
            <p className="text-muted-foreground mt-1">Fluxo controlado com gates de validação automática</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="w-full md:w-80">
              <SearchBar
                value={filtros.termo || ""}
                onChange={setSearchTerm}
                onClear={() => setSearchTerm("")}
                placeholder="Filtrar Cards..."
              />
            </div>
            <AdvancedFilters
              filtros={filtros}
              onFilterChange={updateFiltros}
              onClearFilters={clearFiltros}
              totalFiltrosAtivos={filtrosAtivos.length}
            />
          </div>
        </div>

        {/* Badges de Filtros Ativos */}
        {filtrosAtivos.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-2">Filtros:</span>
            {filtrosAtivos.map((filtro, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1.5 px-2.5 py-1"
              >
                <span className="font-semibold">{filtro.label}:</span>
                <span>{filtro.displayValue}</span>
                <button
                  onClick={() => removeFiltro(filtro.key)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFiltros} className="text-xs h-7">
              Limpar
            </Button>
          </div>
        )}
      </div>

      {/* Container Principal com Altura Fixa */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 h-full px-1">
            {COLUNAS.map((coluna) => {
              const precatoriosColuna = grupos[coluna.id] || []
              const totalColuna = calcularTotalColuna(precatoriosColuna)

              return (
                <div key={coluna.id} className="flex-shrink-0 w-80 h-full flex flex-col">
                  <Card className="flex flex-col h-full shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
                    {/* Header Sticky */}
                    <CardHeader className="pb-3 border-b bg-card/95 z-10 rounded-t-lg sticky top-0 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${coluna.cor}`} />
                        <CardTitle className="text-sm font-semibold">{coluna.titulo}</CardTitle>
                        <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                          {precatoriosColuna.length}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-primary mt-1 flex justify-between items-center">
                        <span>Total:</span>
                        <span>{formatBR(totalColuna)}</span>
                      </div>
                    </CardHeader>

                    {/* Área de Drop com Scroll Interno */}
                    <Droppable droppableId={coluna.id}>
                      {(provided) => (
                        <CardContent
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-3 p-3 flex-1 overflow-y-auto min-h-[100px]"
                        >
                          {precatoriosColuna.map((precatorio, index) => {
                            const podeCalculos = podeAcessarCalculos(precatorio)

                            return (
                              <Draggable draggableId={precatorio.id} index={index} key={precatorio.id}>
                                {(provided) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                    <Card className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all duration-200 border-border/60 bg-card group">
                                      <CardContent className="p-3">
                                        <div className="space-y-2">
                                          {/* Título */}
                                          <div className="flex items-start justify-between gap-2">
                                            <h4
                                              className="font-medium text-sm flex-1 leading-tight group-hover:text-primary transition-colors"
                                              onClick={() => abrirDetalhe(precatorio.id)}
                                            >
                                              {precatorio.titulo || precatorio.numero_precatorio || "Sem título"}
                                            </h4>
                                          </div>

                                          {/* Credor */}
                                          <p className="text-xs text-muted-foreground line-clamp-1">{precatorio.credor_nome}</p>

                                          {/* Badges de Status */}
                                          <div className="flex flex-wrap gap-1.5 pt-1">
                                            {/* Interesse */}
                                            {precatorio.interesse_status && (
                                              <Badge
                                                variant={
                                                  precatorio.interesse_status === "TEM_INTERESSE"
                                                    ? "default"
                                                    : "secondary"
                                                }
                                                className="text-[10px] h-5 px-1.5"
                                              >
                                                {precatorio.interesse_status === "TEM_INTERESSE" ? (
                                                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                                ) : (
                                                  <Clock className="h-2.5 w-2.5 mr-1" />
                                                )}
                                                {precatorio.interesse_status === "TEM_INTERESSE" ? "Interesse" : "Análise"}
                                              </Badge>
                                            )}

                                            {/* Versão do Cálculo */}
                                            {precatorio.calculo_ultima_versao > 0 && (
                                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                                v{precatorio.calculo_ultima_versao}
                                              </Badge>
                                            )}
                                          </div>

                                          {/* Valores */}
                                          {((precatorio.valor_atualizado && precatorio.valor_atualizado > 0) || (precatorio.valor_principal && precatorio.valor_principal > 0)) && (
                                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                              <span className="text-[10px] text-muted-foreground">
                                                {precatorio.valor_atualizado && precatorio.valor_atualizado > 0 ? "Atualizado:" : "Principal:"}
                                              </span>
                                              <span className="text-xs font-bold text-foreground">
                                                {formatBR((precatorio.valor_atualizado && precatorio.valor_atualizado > 0 ? precatorio.valor_atualizado : precatorio.valor_principal) ?? 0)}
                                              </span>
                                            </div>
                                          )}

                                          {/* Botão Área de Cálculos */}
                                          <div className="pt-2">
                                            <Button
                                              variant={podeCalculos ? "secondary" : "ghost"}
                                              size="sm"
                                              className={`w-full text-[10px] h-7 ${!podeCalculos ? 'opacity-50' : 'hover:bg-primary/10 hover:text-primary'}`}
                                              disabled={!podeCalculos}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                if (podeCalculos) {
                                                  abrirAreaCalculos(precatorio.id)
                                                }
                                              }}
                                            >
                                              {podeCalculos ? (
                                                <>
                                                  <LockOpen className="h-3 w-3 mr-1.5" />
                                                  Área de Cálculos
                                                </>
                                              ) : (
                                                <>
                                                  <Lock className="h-3 w-3 mr-1.5" />
                                                  Bloqueado
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}
                              </Draggable>
                            )
                          })}
                          {provided.placeholder}
                          {precatoriosColuna.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 opacity-50">
                              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-3 mb-2">
                                <Kanban className="h-6 w-6 text-muted-foreground/50" />
                              </div>
                              <p className="text-xs text-muted-foreground">Vazio</p>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Droppable>
                  </Card>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Dialog de Validação/Bloqueio */}
      <Dialog open={moveDialog.open} onOpenChange={(open) => !open && setMoveDialog({ ...moveDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moveDialog.validacao?.valido ? "Confirmar Movimentação" : "Movimentação Bloqueada"}
            </DialogTitle>
            <DialogDescription>{moveDialog.validacao?.mensagem}</DialogDescription>
          </DialogHeader>

          {/* Se for fechamento, pedir motivo */}
          {moveDialog.colunaDestino === "fechado" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo do Fechamento *</label>
              <Textarea
                value={motivoFechamento}
                onChange={(e) => setMotivoFechamento(e.target.value)}
                placeholder="Descreva o motivo do fechamento..."
                rows={3}
              />
            </div>
          )}

          {/* Detalhes do bloqueio */}
          {moveDialog.validacao && !moveDialog.validacao.valido && (
            <div className="space-y-2">
              {moveDialog.validacao.docs_pendentes && (
                <div>
                  <p className="text-sm font-medium">Documentos Pendentes:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {moveDialog.validacao.docs_pendentes.map((doc: string, i: number) => (
                      <li key={i}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}
              {moveDialog.validacao.certidoes_pendentes && (
                <div>
                  <p className="text-sm font-medium">Certidões Pendentes:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {moveDialog.validacao.certidoes_pendentes.map((cert: string, i: number) => (
                      <li key={i}>{cert}</li>
                    ))}
                  </ul>
                </div>
              )}
              {moveDialog.validacao.campos_faltando && (
                <div>
                  <p className="text-sm font-medium">Campos Faltando:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {moveDialog.validacao.campos_faltando.map((campo: string, i: number) => (
                      <li key={i}>{campo}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog({ ...moveDialog, open: false })}>
              {moveDialog.validacao?.valido ? "Cancelar" : "Fechar"}
            </Button>
            {moveDialog.validacao?.valido && (
              <Button
                onClick={confirmarMovimentacao}
                disabled={moveDialog.colunaDestino === "fechado" && !motivoFechamento}
              >
                Confirmar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
