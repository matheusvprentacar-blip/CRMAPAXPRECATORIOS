"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Lock, LockOpen, AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react"
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

import { KANBAN_COLUMNS } from "./columns";

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
  valor_atualizado: number | null
  saldo_liquido: number | null
  responsavel_calculo_id: string | null
  created_at: string
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
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean
    precatorioId: string | null
    colunaDestino: string | null
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
          valor_atualizado,
          saldo_liquido,
          prioridade,
          responsavel,
          responsavel_certidoes_id,
          responsavel_juridico_id,
          responsavel_calculo_id,
          created_at
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
      // Admin: Vê tudo (filtragem = none)
      // Comercial: responsavel = user.id
      // Certidoes: responsavel_certidoes_id = user.id
      // Juridico: responsavel_juridico_id = user.id
      // Calculo: responsavel_calculo_id = user.id

      const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
      const isAdmin = roles.includes("admin")
      const userId = profile?.id

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
          // Vê seus atribuídos OU qualquer um sem dono nas fases de cálculo
          // Isso permite que ele veja e trabalhe sem necessariamente "tomar posse" se o fluxo exigir
          const fasesCalculo = ['pronto_calculo', 'calculo_andamento', 'calculo_concluido']
          return p.responsavel_calculo_id === userId || (!p.responsavel_calculo_id && fasesCalculo.includes(p.status_kanban))
        }

        // Se não tiver role específica mapeada, não vê nada (ou vê tudo? Melhor travar)
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

  const agruparPorColuna = () => {
    const grupos: Record<string, PrecatorioCard[]> = {}

    COLUNAS.forEach((coluna) => {
      grupos[coluna.id] = precatorios.filter((p) => p.status_kanban === coluna.id)
    })

    return grupos
  }

  const calcularTotalColuna = (precatorios: PrecatorioCard[]) => {
    return precatorios.reduce((acc, p) => {
      const valor = Number(p.valor_atualizado ?? 0)
      return acc + valor
    }, 0)
  }

  const formatBR = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

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
    const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]

    // Admin tem acesso total
    if (roles.includes("admin")) return true

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
    <div className="container mx-auto max-w-[100vw] p-6 space-y-8">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent w-fit">
            Kanban Workflow
          </h1>
          <p className="text-muted-foreground mt-1">Fluxo controlado com gates de validação automática</p>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUNAS.map((coluna) => {
            const precatoriosColuna = grupos[coluna.id] || []
            const totalColuna = calcularTotalColuna(precatoriosColuna)

            return (
              <div key={coluna.id} className="flex-shrink-0 w-80">
                <Card className="shadow-md border-border/50">
                  <CardHeader className="pb-3 border-b bg-muted/10">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${coluna.cor}`} />
                      <CardTitle className="text-sm font-semibold">{coluna.titulo}</CardTitle>
                      <span className="ml-auto text-sm font-medium text-muted-foreground">({precatoriosColuna.length})</span>
                    </div>
                    {totalColuna > 0 && (
                      <div className="text-xs font-semibold text-primary mt-1">{formatBR(totalColuna)}</div>
                    )}
                  </CardHeader>
                  <Droppable droppableId={coluna.id}>
                    {(provided) => (
                      <CardContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2 min-h-[80px]"
                      >
                        {precatoriosColuna.map((precatorio, index) => {
                          const podeCalculos = podeAcessarCalculos(precatorio)
                          const resumo = precatorio.resumo_itens

                          return (
                            <Draggable draggableId={precatorio.id} index={index} key={precatorio.id}>
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                  <Card className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-150 border-border/50">
                                    <CardContent className="p-4">
                                      <div className="space-y-2">
                                        {/* Título */}
                                        <div className="flex items-start justify-between gap-2">
                                          <h4
                                            className="font-medium text-sm flex-1"
                                            onClick={() => abrirDetalhe(precatorio.id)}
                                          >
                                            {precatorio.titulo || precatorio.numero_precatorio || "Sem título"}
                                          </h4>
                                        </div>

                                        {/* Credor */}
                                        <p className="text-xs text-muted-foreground">{precatorio.credor_nome}</p>

                                        {/* Badges de Status */}
                                        <div className="flex flex-wrap gap-1">
                                          {/* Interesse */}
                                          {precatorio.interesse_status && (
                                            <Badge
                                              variant={
                                                precatorio.interesse_status === "TEM_INTERESSE"
                                                  ? "default"
                                                  : "secondary"
                                              }
                                              className="text-xs"
                                            >
                                              {precatorio.interesse_status === "TEM_INTERESSE" ? (
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                              ) : (
                                                <Clock className="h-3 w-3 mr-1" />
                                              )}
                                              {precatorio.interesse_status.replace("_", " ")}
                                            </Badge>
                                          )}

                                          {/* Documentos */}
                                          {resumo && resumo.total_docs > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              <FileText className="h-3 w-3 mr-1" />
                                              Docs: {resumo.docs_recebidos}/{resumo.total_docs}
                                            </Badge>
                                          )}

                                          {/* Certidões */}
                                          {resumo && resumo.total_certidoes > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              Cert: {resumo.certidoes_recebidas + resumo.certidoes_nao_aplicavel}/
                                              {resumo.total_certidoes}
                                            </Badge>
                                          )}

                                          {/* Cálculo Desatualizado */}
                                          {precatorio.calculo_desatualizado && (
                                            <Badge variant="destructive" className="text-xs">
                                              <AlertCircle className="h-3 w-3 mr-1" />
                                              Cálculo desatualizado
                                            </Badge>
                                          )}

                                          {/* Versão do Cálculo */}
                                          {precatorio.calculo_ultima_versao > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                              v{precatorio.calculo_ultima_versao}
                                            </Badge>
                                          )}
                                        </div>

                                        {/* Valores */}
                                        {precatorio.valor_atualizado && (
                                          <div className="space-y-1 pt-2 border-t">
                                            <div className="text-xs text-muted-foreground">Valor Atualizado</div>
                                            <p className="text-sm font-semibold">{formatBR(precatorio.valor_atualizado)}</p>
                                          </div>
                                        )}

                                        {precatorio.saldo_liquido && (
                                          <div className="space-y-1">
                                            <div className="text-xs text-muted-foreground">Saldo Líquido</div>
                                            <p className="text-sm font-semibold text-blue-600">
                                              {formatBR(precatorio.saldo_liquido)}
                                            </p>
                                          </div>
                                        )}

                                        {/* Botão Área de Cálculos */}
                                        <div className="pt-2 border-t">
                                          <Button
                                            variant={podeCalculos ? "default" : "outline"}
                                            size="sm"
                                            className="w-full text-xs"
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
                                                <LockOpen className="h-3 w-3 mr-1" />
                                                Área de Cálculos
                                              </>
                                            ) : (
                                              <>
                                                <Lock className="h-3 w-3 mr-1" />
                                                Cálculo Bloqueado
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
                          <p className="text-center text-sm text-muted-foreground py-8">Nenhum precatório</p>
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
