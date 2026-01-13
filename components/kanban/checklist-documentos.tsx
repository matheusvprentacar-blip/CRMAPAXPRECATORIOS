"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { Loader2, FileText, Plus, Pencil, Check, X, Printer, Eye } from "lucide-react"
import { ItemChecklistDialog } from "./item-checklist-dialog"
import { getFileDownloadUrl } from "@/lib/utils/file-upload"
import { usePDFViewer } from "@/components/providers/pdf-viewer-provider"

interface ChecklistDocumentosProps {
  precatorioId: string
  canEdit: boolean
  onUpdate: () => void
  pdfUrl?: string | null
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

export function ChecklistDocumentos({ precatorioId, canEdit, onUpdate, pdfUrl }: ChecklistDocumentosProps) {
  const { openPDF } = usePDFViewer()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

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

      // Filtrar, removendo CERTIDÕES (elas têm sua própria aba)
      const filteredItems = (allItems || []).filter((i: any) => i.tipo_grupo !== 'CERTIDAO')
      setItems(filteredItems)
    } catch (error) {
      console.error("[Checklist Docs] Erro:", error)
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
        const { error } = await supabase.rpc('atualizar_status_item', {
          p_item_id: selectedItem.id,
          p_novo_status: itemData.status || selectedItem.status_item,
          p_validade: itemData.validade || null,
          p_observacao: itemData.observacao,
          p_arquivo_url: itemData.arquivo_url
        })
        if (error) throw error

        toast({
          title: "Item atualizado",
          description: "O documento foi salvo com sucesso.",
        })
      } else {
        // POST
        const { error } = await supabase.rpc('adicionar_item_customizado', {
          p_precatorio_id: precatorioId,
          p_tipo_grupo: 'DOC_CREDOR',
          p_nome_item: itemData.nome,
          p_observacao: itemData.observacao
        })
        if (error) throw error

        toast({
          title: "Item adicionado",
          description: "O documento foi salvo com sucesso.",
        })
      }

      setDialogOpen(false)
      setSelectedItem(null)
      await loadItems()
      onUpdate()
    } catch (error: any) {
      console.error("[Checklist Docs] Erro ao salvar:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o item.",
        variant: "destructive",
      })
    }
  }

  async function deleteItem(itemId: string) {
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
        description: "As informações do documento foram removidas com sucesso.",
      })

      await loadItems()
      onUpdate()
    } catch (error) {
      console.error("[Checklist Docs] Erro ao limpar:", error)
      toast({
        title: "Erro",
        description: "Não foi possível limpar o item.",
        variant: "destructive",
      })
    }
  }

  function viewDocument(url: string, title?: string) {
    openPDF(url, title || "Visualização de Documento")
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const totalDocs = items.length + (pdfUrl ? 1 : 0)
  const docsRecebidos = items.filter((i) => i.status_item === "RECEBIDO" || i.status_item === "NAO_APLICAVEL").length + (pdfUrl ? 1 : 0)
  const percentual = totalDocs > 0 ? Math.round((docsRecebidos / totalDocs) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Progresso: {docsRecebidos}/{totalDocs} documentos
          </p>
          <p className="text-sm font-semibold text-primary">{percentual}%</p>
        </div>
        <Progress value={percentual} className="h-2" />
      </div>

      {/* Lista de Documentos */}
      <div className="space-y-2">
        {/* Item Especial: Ofício (PDF Original) */}
        {pdfUrl && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-center gap-3 flex-1">
              <FileText className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-blue-900">
                    Ofício Requisitório (Original)
                  </p>
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Documento original enviado pelo Admin
                </p>
              </div>
              <Badge className="bg-green-500 text-white hover:bg-green-600">RECEBIDO</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => viewDocument(pdfUrl, "Ofício Requisitório (PDF)")}
                title="Abrir PDF"
                className="hover:bg-blue-100 text-blue-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
            </div>
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {item.nome_item}
                  </p>
                  {item.arquivo_url ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-red-400" />
                  )}
                </div>
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
        ))}

        {items.length === 0 && !pdfUrl && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum documento cadastrado ainda.</p>
            <p className="text-xs mt-2">Os documentos padrão serão criados automaticamente.</p>
          </div>
        )}
      </div>

      {/* Botão Adicionar */}
      {canEdit && (
        <Button variant="outline" className="w-full" onClick={handleAddItem}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Documento Customizado
        </Button>
      )}

      {/* Informações */}
      <div className="p-4 bg-muted/50 border rounded-lg">
        <p className="text-sm font-medium mb-2">📋 Documentos Padrão</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>RG e CPF do credor</li>
          <li>Comprovante de residência</li>
          <li>Dados bancários</li>
          <li>Procuração (se aplicável)</li>
          <li>Cálculo homologado</li>
          <li>Certidão de trânsito em julgado</li>
        </ul>
      </div>

      {/* Dialog de Edição */}
      <ItemChecklistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        tipo="DOCUMENTO"
        onSave={handleSaveItem}
        onDelete={selectedItem ? () => deleteItem(selectedItem.id) : undefined}
      />
    </div>
  )
}
