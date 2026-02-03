"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { Loader2, FileText, Plus, Pencil, AlertCircle, Eye, CheckCircle, ImageIcon, Trash2, Download } from "lucide-react"
import { ItemChecklistDialog } from "./item-checklist-dialog"
import { getFileDownloadUrl, downloadFileAsArrayBuffer } from "@/lib/utils/file-upload"
import { usePDFViewer } from "@/components/providers/pdf-viewer-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveAs } from "file-saver"
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
import { saveFileWithPicker } from "@/lib/utils/file-saver-custom"

interface ChecklistCertidoesProps {
  precatorioId: string
  canEdit: boolean
  onUpdate: () => void
  initialStatus?: string
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

const STATUS_CERTIDOES_LABELS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  concluido_com_ressalvas: "Concluído com ressalvas",
}


const EXCLUDED_CERTIDAO_MARKER = "__EXCLUIDO__"

const getFileNameFromUrl = (url?: string | null) => {
  if (!url) return "arquivo"
  if (url.startsWith("storage:")) {
    const match = url.match(/^storage:[^/]+\/(.+)$/)
    if (match) {
      const path = match[1]
      return decodeURIComponent(path.split("/").pop() || "arquivo")
    }
  }
  try {
    const parsed = new URL(url)
    return decodeURIComponent(parsed.pathname.split("/").pop() || "arquivo")
  } catch {
    return decodeURIComponent(url.split("/").pop() || "arquivo")
  }
}

const getFileExt = (name: string) => {
  const parts = name.split(".")
  return parts.length > 1 ? parts.pop()!.toUpperCase() : "ARQ"
}

const isImageUrl = (url?: string | null) => {
  if (!url) return false
  return /\.(png|jpg|jpeg|webp)$/i.test(url.split("?")[0])
}

export function ChecklistCertidoes({ precatorioId, canEdit, onUpdate, initialStatus }: ChecklistCertidoesProps) {
  const { openPDF } = usePDFViewer()
  const [items, setItems] = useState<Item[]>([])
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [pdfThumbs, setPdfThumbs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [confirmConclusaoOpen, setConfirmConclusaoOpen] = useState(false)
  const [statusCertidoes, setStatusCertidoes] = useState<string>(initialStatus || "nao_iniciado")
  const [savingStatusCertidoes, setSavingStatusCertidoes] = useState(false)

  useEffect(() => {
    loadItems()
  }, [precatorioId])

  useEffect(() => {
    if (initialStatus) {
      setStatusCertidoes(initialStatus)
    }
  }, [initialStatus])

  useEffect(() => {
    let alive = true
    const resolvePreviews = async () => {
      const next: Record<string, string> = {}
      for (const item of items) {
        if (!item.arquivo_url || !isImageUrl(item.arquivo_url)) continue
        if (item.arquivo_url.startsWith("http") || item.arquivo_url.startsWith("blob:")) {
          next[item.id] = item.arquivo_url
          continue
        }
        const resolved = await getFileDownloadUrl(item.arquivo_url)
        if (resolved) next[item.id] = resolved
      }
      if (alive) setPreviewUrls(next)
    }
    resolvePreviews()
    return () => {
      alive = false
    }
  }, [items])

  useEffect(() => {
    let alive = true
    const renderPdfThumbs = async () => {
      const next: Record<string, string> = {}
      const pdfjs = await import(
        /* webpackIgnore: true */
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.min.mjs"
      )
      const { getDocument, GlobalWorkerOptions } = pdfjs as any
      GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs"

      const supabase = createBrowserClient()

      const fetchPdfBytes = async (url: string) => {
        try {
          if (url.startsWith("storage:")) {
            const match = url.match(/^storage:([^/]+)\/(.+)$/)
            if (!match || !supabase) return null
            const [, bucket, path] = match
            const { data, error } = await supabase.storage.from(bucket).download(path)
            if (error || !data) return null
            const buffer = await data.arrayBuffer()
            return new Uint8Array(buffer)
          }

          let finalUrl = url
          if (!finalUrl.startsWith("http") && !finalUrl.startsWith("blob:")) {
            const resolved = await getFileDownloadUrl(finalUrl)
            if (resolved) finalUrl = resolved
          }

          const response = await fetch(finalUrl)
          if (!response.ok) return null
          const buffer = await response.arrayBuffer()
          return new Uint8Array(buffer)
        } catch {
          return null
        }
      }

      for (const item of items) {
        if (!item.arquivo_url) continue
        const filename = getFileNameFromUrl(item.arquivo_url)
        const ext = getFileExt(filename).toLowerCase()
        if (ext !== "pdf") continue
        if (pdfThumbs[item.id]) {
          next[item.id] = pdfThumbs[item.id]
          continue
        }

        try {
          const pdfBytes = await fetchPdfBytes(item.arquivo_url)
          if (!pdfBytes) continue
          const loadingTask = getDocument({ data: pdfBytes, disableWorker: true })
          const pdf = await loadingTask.promise
          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 0.5 })
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          if (!context) continue
          canvas.height = viewport.height
          canvas.width = viewport.width
          await page.render({ canvasContext: context, viewport }).promise
          next[item.id] = canvas.toDataURL("image/png")
          page.cleanup()
          pdf.destroy()
        } catch (err) {
          console.warn("[Checklist Certidoes] Falha ao gerar thumbnail PDF:", err)
        }
      }

      if (alive) setPdfThumbs(next)
    }
    if (items.length > 0) {
      renderPdfThumbs()
    }
    return () => {
      alive = false
    }
  }, [items])

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
      const filteredItems = (allItems || [])
        .filter((i: any) => i.tipo_grupo === 'CERTIDAO')
        .filter((i: any) => i.observacao !== EXCLUDED_CERTIDAO_MARKER)
      setItems(filteredItems)

      setItems(filteredItems)
      // Status loaded via props (initialStatus) to avoid RLS issues on read

    } catch (error) {
      console.error("[Checklist Certidões] Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatusCertidoes(value: string, options?: { advanceToFechamento?: boolean }) {
    const previous = statusCertidoes
    setStatusCertidoes(value)
    setSavingStatusCertidoes(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const payload: any = {
        status_certidoes: value,
        updated_at: new Date().toISOString(),
      }

      if (options?.advanceToFechamento) {
        payload.status_kanban = "fechado"
        payload.localizacao_kanban = "fechado"
      }

      const { error } = await supabase
        .from('precatorios')
        .update(payload)
        .eq('id', precatorioId)

      if (error) throw error

      toast({
        title: "Status atualizado",
        description: "Status das certidões atualizado com sucesso.",
      })
      onUpdate()
    } catch (error: any) {
      console.error("[Checklist Certidões] Erro ao atualizar status:", error)
      setStatusCertidoes(previous)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o status das certidões.",
        variant: "destructive",
      })
    } finally {
      setSavingStatusCertidoes(false)
    }
  }

  async function handleStatusCertidoesChange(value: string) {
    if (!canEdit) return
    await updateStatusCertidoes(value)
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
      await updateStatusCertidoes('concluido', { advanceToFechamento: true })

      toast({
        title: "Certidões Concluídas",
        description: "Status das certidões atualizado e enviado para fechamento.",
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



  // ... imports ...

  async function handleDownloadItem(url: string, name: string) {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      toast({ title: "Baixando", description: `Iniciando download de ${name}...` })

      const buffer = await downloadFileAsArrayBuffer(url, supabase, name)
      if (!buffer) throw new Error("Falha ao baixar arquivo")

      const blob = new Blob([buffer])
      const ext = getFileExt(getFileNameFromUrl(url))
      const safeName = name.replace(/[^a-z0-9]/gi, '_').substring(0, 50)
      const fileName = `${safeName}.${ext.toLowerCase()}`

      await saveFileWithPicker(blob, fileName)

    } catch (error) {
      console.error("Erro ao baixar certidão:", error)
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive"
      })
    }
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
      <div className="rounded-lg border p-4 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Status das Certidões</p>
            <p className="text-xs text-muted-foreground">
              Necessário para avançar para o fechamento.
            </p>
          </div>
          <Select
            value={statusCertidoes}
            onValueChange={handleStatusCertidoesChange}
            disabled={!canEdit || savingStatusCertidoes}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CERTIDOES_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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

      {/* Mini visualizadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const diasParaVencer = calcularDiasParaVencer(item.validade)
          const vencida = diasParaVencer !== null && diasParaVencer < 0
          const proximaVencimento = diasParaVencer !== null && diasParaVencer >= 0 && diasParaVencer <= 30

          return (
            <div
              key={item.id}
              className={`group rounded-xl border border-border/50 bg-background/60 p-3 shadow-sm transition-colors ${canEdit ? "hover:border-border" : ""}`}
              onClick={() => canEdit && handleEditItem(item)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.nome_item}</p>
                  {item.validade && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Validade: {new Date(item.validade).toLocaleDateString("pt-BR")}
                      {diasParaVencer !== null && (
                        <span className={vencida ? "text-red-600 font-medium" : proximaVencimento ? "text-yellow-600 font-medium" : ""}>
                          {" "}({diasParaVencer >= 0 ? `${diasParaVencer} dias` : "Vencida"})
                        </span>
                      )}
                    </p>
                  )}
                  {item.observacao && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.observacao}</p>}
                </div>
                <Badge className={`${STATUS_COLORS[item.status_item]} text-white`}>
                  {STATUS_LABELS[item.status_item]}
                </Badge>
              </div>

              <div className="mt-3 flex h-28 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/40">
                {item.arquivo_url ? (
                  isImageUrl(item.arquivo_url) && previewUrls[item.id] ? (
                    <img
                      src={previewUrls[item.id]}
                      alt={item.nome_item}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : pdfThumbs[item.id] ? (
                    <img
                      src={pdfThumbs[item.id]}
                      alt={`PDF ${item.nome_item}`}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-md bg-muted/60 px-3 text-center">
                      <FileText className="h-7 w-7 text-muted-foreground" />
                      <div className="text-xs font-medium text-muted-foreground">
                        {getFileNameFromUrl(item.arquivo_url)}
                      </div>
                      <div className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {getFileExt(getFileNameFromUrl(item.arquivo_url))}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                    Sem anexo
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.arquivo_url ? "Anexo enviado" : "Aguardando anexo"}</span>
                {item.validade && <span>Validade: {item.validade}</span>}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {item.arquivo_url && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        viewDocument(item.arquivo_url!, item.nome_item)
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadItem(item.arquivo_url!, item.nome_item)
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </>
                )}

                <div className="ml-auto flex flex-wrap gap-2">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={
                        item.arquivo_url
                          ? undefined
                          : "bg-orange-500 text-white hover:bg-orange-600 border border-orange-500"
                      }
                      onClick={() => handleEditItem(item)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {item.arquivo_url ? "Substituir" : "Anexar"}
                    </Button>
                  )}

                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-200"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border/60 p-8 text-center text-muted-foreground">
            <p>Nenhuma certidao cadastrada ainda.</p>
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
                Marcar Certidões como Concluídas
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Ao concluir, o status das certidões permitirá avançar para <strong>Fechamento</strong>.
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
            <AlertDialogTitle>Marcar certidões como concluídas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará as certidões como concluídas e liberará o avanço para
              <strong> Fechamento</strong>.
              Certifique-se de que todas as certidões necessárias foram anexadas e validadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConcluirAnalise} className="bg-green-600 hover:bg-green-700">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
