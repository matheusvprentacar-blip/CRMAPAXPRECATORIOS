"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { FileText, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PdfViewerModal } from "@/components/pdf-viewer-modal"
import { toast } from "@/components/ui/use-toast"

const COLUNAS = [
  { id: "novo", titulo: "Novo (Pendente)", cor: "bg-blue-500" },
  { id: "distribuido", titulo: "Distribuído", cor: "bg-indigo-500" },
  { id: "em_calculo", titulo: "Em Cálculo", cor: "bg-purple-500" },
  { id: "calculado", titulo: "Cálculo Realizado", cor: "bg-teal-500" },
  { id: "aguardando_cliente", titulo: "Aguardando Cliente", cor: "bg-orange-500" },
  { id: "concluido", titulo: "Concluído", cor: "bg-green-500" },
  { id: "cancelado", titulo: "Cancelado", cor: "bg-gray-500" },
]

interface PrecatorioCard {
  id: string
  titulo: string | null
  status: string | null
  valor_atualizado: number | null
  valor_principal: number | null
  valor_juros: number | null
  valor_selic: number | null
  saldo_liquido: number | null
  pss_valor: number | null
  irpf_valor: number | null
  created_at: string
  responsavel: string | null
  responsavel_calculo_id: string | null
  criado_por: string | null
  numero_precatorio: string | null
  credor_nome: string | null
  proposta_menor_valor: number | null
  proposta_maior_valor: number | null
  proposta_menor_percentual: number | null
  proposta_maior_percentual: number | null
  proposta_menor_valor_display: string | null
  proposta_maior_valor_display: string | null
  pdf_url: string | null
  criador_nome: string | null
  responsavel_nome: string | null
  responsavel_calculo_nome: string | null
  localizacao_kanban: string | null
}

export default function KanbanPage() {
  const { profile } = useAuth()
  const [precatorios, setPrecatorios] = useState<PrecatorioCard[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [openSelectCalc, setOpenSelectCalc] = useState(false)
  const [pendingMove, setPendingMove] = useState<{ precatorioId: string } | null>(null)
  const [operadorCalculoId, setOperadorCalculoId] = useState<string>("")
  const [operadoresCalculo, setOperadoresCalculo] = useState<{ id: string; nome: string }[]>([])
  const [selectedPdf, setSelectedPdf] = useState<{ url: string | null; titulo: string } | null>(null)

  useEffect(() => {
    if (profile) {
      loadPrecatorios()
      loadOperadoresCalculo()
    }
  }, [profile])

  async function loadPrecatorios() {
    try {
      const supabase = createBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const userId = user?.id

      if (!userId) {
        setLoading(false)
        return
      }

      setAuthUserId(userId)

      let query = supabase.from("precatorios_cards").select("*").order("created_at", { ascending: false })

      // Filtrar por role
      if (profile?.role === "operador_comercial") {
        query = query.or(`criado_por.eq.${userId},responsavel.eq.${userId}`)
      } else if (profile?.role === "operador_calculo") {
        query = query.or(`responsavel_calculo_id.eq.${userId},responsavel.eq.${userId},criado_por.eq.${userId}`)
      }
      // Admin vê tudo (sem filtro)

      const { data: items, error } = await query

      console.log("[v0] Kanban: Loaded items:", items?.length || 0)
      console.log("[v0] Kanban: Error:", error)

      if (error) {
        console.error("[KANBAN] error:", error)
        throw error
      }

      setPrecatorios(items || [])
    } catch (error) {
      console.error("[v0] Kanban: Erro ao carregar:", error)
    } finally {
      setLoading(false)
    }
  }

  async function loadOperadoresCalculo() {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.from("usuarios").select("id,nome,role").eq("role", "operador_calculo")

    if (!error && data) {
      setOperadoresCalculo(data.map((u) => ({ id: u.id, nome: u.nome ?? u.id })))
    }
  }

  const calcularTotalColuna = (precatorios: PrecatorioCard[]) => {
    return precatorios.reduce((acc, p) => {
      const valor = Number(p.valor_atualizado ?? p.valor_principal ?? 0)
      return acc + valor
    }, 0)
  }

  const formatBR = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const agruparPorStatus = () => {
    return {
      novo: precatorios.filter((p) => p.status === "novo" && !p.responsavel),
      distribuido: precatorios.filter((p) => p.status === "novo" && p.responsavel && !p.responsavel_calculo_id),
      em_calculo: precatorios.filter((p) => p.status === "em_calculo"),
      calculado: precatorios.filter((p) => p.status === "calculado"),
      aguardando_cliente: precatorios.filter((p) => p.status === "aguardando_cliente"),
      concluido: precatorios.filter((p) => p.status === "concluido"),
      cancelado: precatorios.filter((p) => p.status === "cancelado"),
    }
  }

  async function onDragEnd(result: any) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const supabase = createBrowserClient()
    const dest = destination.droppableId

    console.log("[v0] Drag:", draggableId, "from", source.droppableId, "to", dest)

    if (dest === "em_calculo") {
      setPendingMove({ precatorioId: draggableId })
      setOperadorCalculoId("")
      setOpenSelectCalc(true)
      return
    }

    const { data, error } = await supabase
      .from("precatorios")
      .update({
        status: dest,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draggableId)
      .select("id, status")

    if (error) {
      console.error("[KANBAN] move error:", error)
      toast({
        title: "Erro",
        description: "Não foi possível mover o card",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Updated successfully:", data)
    await loadPrecatorios()
  }

  async function confirmarEnvioParaCalculo() {
    if (!pendingMove?.precatorioId || !operadorCalculoId) return
    const supabase = createBrowserClient()

    console.log("[v0] Enviando para cálculo:", pendingMove.precatorioId, "operador:", operadorCalculoId)

    const { data, error } = await supabase
      .from("precatorios")
      .update({
        status: "em_calculo",
        responsavel_calculo_id: operadorCalculoId,
        operador_calculo: operadorCalculoId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pendingMove.precatorioId)
      .select("id, status, responsavel_calculo_id")

    if (error) {
      console.error("[KANBAN] send calc error:", error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar para cálculo",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Sent to calculation successfully:", data)
    toast({
      title: "Enviado para cálculo",
      description: "Precatório atribuído ao operador de cálculo",
    })
    setOpenSelectCalc(false)
    setPendingMove(null)
    await loadPrecatorios()
  }

  const grupos = agruparPorStatus()

  const abrirDetalhe = (precatorioId: string) => {
    router.push(`/precatorios/${precatorioId}`)
  }

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
        <h1 className="text-3xl font-bold tracking-tight">Kanban</h1>
        <p className="text-muted-foreground">Visualize o fluxo dos precatórios</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUNAS.map((coluna) => {
            const precatoriosColuna = grupos[coluna.id as keyof typeof grupos] || []
            const totalColuna = calcularTotalColuna(precatoriosColuna)

            return (
              <div key={coluna.id} className="flex-shrink-0 w-80">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${coluna.cor}`} />
                      <CardTitle className="text-sm font-medium">{coluna.titulo}</CardTitle>
                      <span className="ml-auto text-sm text-muted-foreground">({precatoriosColuna.length})</span>
                    </div>
                    <div className="text-xs font-semibold text-primary mt-1">Total: {formatBR(totalColuna)}</div>
                  </CardHeader>
                  <Droppable droppableId={coluna.id}>
                    {(provided) => (
                      <CardContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2 min-h-[80px]"
                      >
                        {precatoriosColuna.map((precatorio, index) => (
                          <Draggable draggableId={precatorio.id} index={index} key={precatorio.id}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <Card
                                  className="cursor-pointer hover:bg-accent transition-colors"
                                  onClick={() => abrirDetalhe(precatorio.id)}
                                >
                                  <CardContent className="p-4">
                                    <div className="space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-medium text-sm flex-1">
                                          {precatorio.titulo || precatorio.numero_precatorio || "Sem título"}
                                        </h4>
                                      </div>
                                      <p className="text-xs text-muted-foreground">{precatorio.credor_nome}</p>

                                      <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground">
                                          {(() => {
                                            const vp = Number(precatorio.valor_principal ?? 0)
                                            const va = Number(precatorio.valor_atualizado ?? 0)
                                            if (va > 0) return "Valor atualizado"
                                            if (vp > 0) return "Valor principal"
                                            return "Valor"
                                          })()}
                                        </div>
                                        <p className="text-sm font-semibold">
                                          {(() => {
                                            const vp = Number(precatorio.valor_principal ?? 0)
                                            const va = Number(precatorio.valor_atualizado ?? 0)
                                            const valorExibido = va > 0 ? va : vp > 0 ? vp : null
                                            return valorExibido ? formatBR(valorExibido) : "Aguardando"
                                          })()}
                                        </p>
                                      </div>

                                      {Number(precatorio.saldo_liquido ?? 0) > 0 && (
                                        <div className="space-y-1 pt-2 border-t">
                                          <div className="text-xs text-muted-foreground">Saldo Líquido</div>
                                          <p className="text-sm font-semibold text-blue-600">
                                            {formatBR(Number(precatorio.saldo_liquido))}
                                          </p>
                                        </div>
                                      )}

                                      {(Number(precatorio.pss_valor ?? 0) > 0 ||
                                        Number(precatorio.irpf_valor ?? 0) > 0) && (
                                        <div className="space-y-1 pt-2 border-t text-xs">
                                          <div className="text-muted-foreground font-medium">Descontos:</div>
                                          {Number(precatorio.pss_valor ?? 0) > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">PSS:</span>
                                              <span className="font-medium text-red-600">
                                                {formatBR(Number(precatorio.pss_valor))}
                                              </span>
                                            </div>
                                          )}
                                          {Number(precatorio.irpf_valor ?? 0) > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">IRPF:</span>
                                              <span className="font-medium text-red-600">
                                                {formatBR(Number(precatorio.irpf_valor))}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {(precatorio.proposta_menor_valor_display ||
                                        precatorio.proposta_maior_valor_display) && (
                                        <div className="space-y-1 pt-2 border-t text-xs">
                                          {precatorio.proposta_menor_valor_display && (
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Menor:</span>
                                              <span className="font-medium">
                                                {precatorio.proposta_menor_valor_display}
                                                {precatorio.proposta_menor_percentual &&
                                                  ` (${precatorio.proposta_menor_percentual}%)`}
                                              </span>
                                            </div>
                                          )}
                                          {precatorio.proposta_maior_valor_display && (
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Maior:</span>
                                              <span className="font-medium">
                                                {precatorio.proposta_maior_valor_display}
                                                {precatorio.proposta_maior_percentual &&
                                                  ` (${precatorio.proposta_maior_percentual}%)`}
                                              </span>
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
                                            <span className="font-medium">Comercial:</span>{" "}
                                            {precatorio.responsavel_nome}
                                          </div>
                                        )}
                                        {precatorio.responsavel_calculo_nome && (
                                          <div>
                                            <span className="font-medium">Cálculo:</span>{" "}
                                            {precatorio.responsavel_calculo_nome}
                                          </div>
                                        )}
                                      </div>

                                      {precatorio.pdf_url && (
                                        <div className="pt-2 border-t">
                                          <div className="flex items-center justify-between gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                              <FileText className="h-3 w-3 mr-1" />
                                              PDF anexado
                                            </Badge>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 px-2 text-xs"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedPdf({
                                                  url: precatorio.pdf_url,
                                                  titulo: precatorio.titulo || precatorio.numero_precatorio || "PDF",
                                                })
                                              }}
                                            >
                                              <Eye className="h-3 w-3 mr-1" />
                                              Ver PDF
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
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

      <Dialog open={openSelectCalc} onOpenChange={setOpenSelectCalc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para cálculo</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Select value={operadorCalculoId} onValueChange={setOperadorCalculoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o operador de cálculo" />
              </SelectTrigger>
              <SelectContent>
                {operadoresCalculo.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenSelectCalc(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarEnvioParaCalculo} disabled={!operadorCalculoId}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PdfViewerModal
        open={!!selectedPdf}
        onOpenChange={(open) => !open && setSelectedPdf(null)}
        pdfUrl={selectedPdf?.url || null}
        titulo={selectedPdf?.titulo}
      />
    </div>
  )
}
