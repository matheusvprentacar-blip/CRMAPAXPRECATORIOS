"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { Loader2, FileText, Plus, Pencil, AlertCircle, Download, Eye, CheckCircle } from "lucide-react"
import { ItemChecklistDialog } from "./item-checklist-dialog"
import { getFileDownloadUrl } from "@/lib/utils/file-upload"
import { usePDFViewer } from "@/components/providers/pdf-viewer-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ChecklistCertidoesProps {
  precatorioId: string
  canEdit: boolean
  onUpdate: () => void
}

interface Item {
  id: string
  nome_item: string
  tipo_grupo: string
  status_item: string
  observacao: string | null
  arquivo_url: string | null
  validade: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-gray-500",
  SOLICITADO: "bg-blue-500",
  RECEBIDO: "bg-green-500",
  INCOMPLETO: "bg-yellow-500",
  VENCIDO: "bg-red-500",
  NAO_APLICAVEL: "bg-gray-400",
}

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  SOLICITADO: "Solicitado",
  RECEBIDO: "Recebido",
  INCOMPLETO: "Incompleto",
  VENCIDO: "Vencido",
  NAO_APLICAVEL: "Não Aplicável",
}

export function ChecklistCertidoes({ precatorioId, canEdit, onUpdate }: ChecklistCertidoesProps) {
  const { openPDF } = usePDFViewer()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [confirmConclusaoOpen, setConfirmConclusaoOpen] = useState(false)

  useEffect(() => {
    loadItems()
  }, [precatorioId])

  async function loadItems() {
    try {
      setLoading(true)
      const supabase = createBrowserClient()
      if (!supabase) return

      const { data: allItems, error } = await supabase
        .rpc('obter_itens_precatorio', {
          p_precatorio_id: precatorioId
        })

      if (error) throw error

      // Filtrar APENAS CERTIDÕES
      const filteredItems = (allItems || []).filter((i: any) => i.tipo_grupo === 'CERTIDAO')
      setItems(filteredItems)
    } catch (error) {
      console.error("[Checklist Certidões] Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleEditItem(item: Item) {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  function handleAddItem() {
    setSelectedItem(null)
    setDialogOpen(true)
  }

  async function handleSaveItem(itemData: any) {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      if (selectedItem) {
        // PUT
        const payload = {
          p_item_id: selectedItem.id,
          p_novo_status: itemData.status || selectedItem.status_item,
          p_validade: itemData.validade || null,
          p_observacao: itemData.observacao,
          p_arquivo_url: itemData.arquivo_url
        }
        const { error } = await supabase.rpc('atualizar_status_item', payload)

        if (error) {
          console.error("[Checklist Certidões] Erro no UPDATE:", error)
          throw error
        }

        toast({
          title: "Item atualizado",
          description: "A certidão foi salva com sucesso.",
        })
      } else {
        // POST
        const payload = {
          p_precatorio_id: precatorioId,
          p_tipo_grupo: 'CERTIDAO',
          p_nome_item: itemData.nome,
          p_observacao: itemData.observacao,
          p_validade: itemData.validade || null,
          p_arquivo_url: itemData.arquivo_url || null
        }

        const { error } = await supabase.rpc('adicionar_item_customizado', payload)

        if (error) {
          console.error("[Checklist Certidões] Erro no INSERT:", error)
          throw error
        }

        toast({
          title: "Item adicionado",
          description: "A certidão foi salva com sucesso.",
        })
      }

      setDialogOpen(false)
      setSelectedItem(null)
      await loadItems()
      onUpdate()
    } catch (error: any) {
      console.error("[Checklist Certidões] Erro ao salvar:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o item.",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Tem certeza que deseja limpar os dados desta certidão? O item voltará para 'Pendente'.")) return

    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      // Ao invés de DELETE, fazemos um UPDATE para limpar os campos
      const { error } = await supabase
        .from('precatorio_itens')
        .update({
          status_item: 'PENDENTE',
          arquivo_url: null,
          validade: null,
          observacao: null
        })
        .eq('id', itemId)

      if (error) throw error

      toast({
        title: "Dados limpos",
        description: "As informações da certidão foram removidas com sucesso.",
      })

      setDialogOpen(false) // Fechar modal se estiver aberto via prop
      await loadItems()
      onUpdate()
    } catch (error) {
      console.error("[Checklist Certidões] Erro ao limpar:", error)
      toast({
        title: "Erro",
        description: "Não foi possível limpar o item.",
        variant: "destructive",
      })
    }
  }

  function calcularDiasParaVencer(validade: string | null): number | null {
    if (!validade) return null
    const hoje = new Date()
    const dataValidade = new Date(validade)
    const diff = dataValidade.getTime() - hoje.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  async function handleConcluirAnalise() {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const { error } = await supabase
        .from('precatorios')
        .update({
          status: 'calculo_concluido', // Updated target status
          status_kanban: 'calculo_concluido', // Updated target status
          updated_at: new Date().toISOString()
        })
        .eq('id', precatorioId)

      if (error) throw error

      toast({
        title: "Análise Concluída",
        description: "Precatório movido para 'Calculado' com sucesso.",
      })

      setConfirmConclusaoOpen(false)
      onUpdate() // Atualiza a tela pai (que deve redirecionar ou recarregar)
    } catch (error: any) {
      console.error("Erro ao concluir análise:", error)
      toast({
        title: "Erro",
        description: "Não foi possível concluir a análise: " + (error.message || "Erro desconhecido"),
        variant: "destructive"
      })
    }
  }

  function viewDocument(url: string, name: string) {
    openPDF(url, name)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const totalCertidoes = items.length
  const certidoesOk = items.filter((i) => i.status_item === "RECEBIDO" || i.status_item === "NAO_APLICAVEL").length
  const percentual = totalCertidoes > 0 ? Math.round((certidoesOk / totalCertidoes) * 100) : 0

  // Verificar certidões vencidas ou próximas do vencimento
  const certidoesVencidas = items.filter((i) => {
    const dias = calcularDiasParaVencer(i.validade)
    return dias !== null && dias < 0
  })

  const certidoesProximasVencimento = items.filter((i) => {
    const dias = calcularDiasParaVencer(i.validade)
    return dias !== null && dias >= 0 && dias <= 30
  })

  return (
    <div className="space-y-6">
      {/* Progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Progresso: {certidoesOk}/{totalCertidoes} certidões
          </p>
          <p className="text-sm font-semibold text-primary">{percentual}%</p>
        </div>
        <Progress value={percentual} className="h-2" />
      </div>

      {/* Alertas */}
      {certidoesVencidas.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">
                {certidoesVencidas.length} certidão(ões) vencida(s)
              </p>
              <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                {certidoesVencidas.map((cert) => (
                  <li key={cert.id}>{cert.nome_item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {certidoesProximasVencimento.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">
                {certidoesProximasVencimento.length} certidão(ões) próxima(s) do vencimento
              </p>
              <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                {certidoesProximasVencimento.map((cert) => {
                  const dias = calcularDiasParaVencer(cert.validade)
                  return (
                    <li key={cert.id}>
                      {cert.nome_item} - {dias} dia(s)
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Certidões */}
      <div className="space-y-2">
        {items.map((item) => {
          const diasParaVencer = calcularDiasParaVencer(item.validade)
          const vencida = diasParaVencer !== null && diasParaVencer < 0
          const proximaVencimento = diasParaVencer !== null && diasParaVencer >= 0 && diasParaVencer <= 30

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 bg-muted rounded-lg transition-colors ${canEdit ? "hover:bg-muted/80 cursor-pointer" : ""}`}
              onClick={() => canEdit && handleEditItem(item)}
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.nome_item}</p>
                  {item.validade && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Validade: {new Date(item.validade).toLocaleDateString("pt-BR")}
                      {diasParaVencer !== null && (
                        <span className={vencida ? "text-red-600 font-medium" : proximaVencimento ? "text-yellow-600 font-medium" : ""}>
                          {" "}({diasParaVencer >= 0 ? `${diasParaVencer} dias` : "Vencida"})
                        </span>
                      )}
                    </p>
                  )}
                  {item.observacao && <p className="text-xs text-muted-foreground mt-1">{item.observacao}</p>}
                </div>
                <Badge className={`${STATUS_COLORS[item.status_item]} text-white`}>{STATUS_LABELS[item.status_item]}</Badge>
              </div>

              <div className="flex items-center gap-2">
                {item.arquivo_url && (
                  <Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation()
                    viewDocument(item.arquivo_url!, item.nome_item)
                  }} title="Visualizar documento">
                    <Eye className="h-4 w-4" />
                  </Button>
                )}

                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma certidão cadastrada ainda.</p>
            <p className="text-xs mt-2">As certidões padrão serão criadas automaticamente.</p>
          </div>
        )}
      </div>

      {/* Botão Adicionar */}
      {
        canEdit && (
          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Certidão Customizada
            </Button>

            <div className="border-t pt-4 mt-4">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setConfirmConclusaoOpen(true)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir Análise de Certidões
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Ao concluir, o precatório será movido para a etapa de <strong>Calculado</strong>.
              </p>
            </div>
          </div>
        )
      }

      {/* Informações */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-900">📋 Certidões Padrão</p>
        <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
          <li>Certidão Negativa de Débitos Federais (CND)</li>
          <li>Certidão Negativa de Débitos Estaduais</li>
          <li>Certidão Negativa de Débitos Municipais</li>
        </ul>
        <p className="text-xs text-blue-700 mt-2">
          💡 <strong>Dica:</strong> Certidões geralmente têm validade de 180 dias. Fique atento aos prazos!
        </p>
      </div>

      {/* Dialog de Edição */}
      <ItemChecklistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        tipo="CERTIDAO"
        onSave={handleSaveItem}
        onDelete={selectedItem ? () => handleDeleteItem(selectedItem.id) : undefined}
      />

      {/* Dialog de Confirmação de Conclusão */}
      <AlertDialog open={confirmConclusaoOpen} onOpenChange={setConfirmConclusaoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir Análise de Certidões?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação moverá o precatório para a fase <strong>Calculado</strong>.
              Certifique-se de que todas as certidões necessárias foram anexadas e validadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConcluirAnalise} className="bg-green-600 hover:bg-green-700">
              Confirmar e Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
