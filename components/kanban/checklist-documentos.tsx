"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { Loader2, FileText, Plus, Pencil, Eye, Trash2, ImageIcon, Download } from "lucide-react"
import { ItemChecklistDialog } from "./item-checklist-dialog"
import { getFileDownloadUrl, downloadFileAsArrayBuffer } from "@/lib/utils/file-upload"
import { usePDFViewer } from "@/components/providers/pdf-viewer-provider"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { saveFileWithPicker } from "@/lib/utils/file-saver-custom"

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


const HIDDEN_DOC_NAMES = new Set(["profissao do credor", "profissao do conjuge"])
const EXCLUDED_DOC_MARKER = "__EXCLUIDO__"


const normalizeNomeItem = (value?: string | null) => {
  if (!value) return ""
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

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

export function ChecklistDocumentos({ precatorioId, canEdit, onUpdate, pdfUrl }: ChecklistDocumentosProps) {
  const { openPDF } = usePDFViewer()
  const [items, setItems] = useState<Item[]>([])
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})
  const [pdfThumbs, setPdfThumbs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  useEffect(() => {
    loadItems()
  }, [precatorioId])

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
          console.warn("[Checklist Docs] Falha ao gerar thumbnail PDF:", err)
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

      // Filtrar, removendo CERTIDÕES (elas têm sua própria aba)
      const filteredItems = (allItems || [])
        .filter((i: any) => i.tipo_grupo !== 'CERTIDAO')
        .filter((i: any) => !HIDDEN_DOC_NAMES.has(normalizeNomeItem(i.nome_item)))
        .filter((i: any) => i.observacao !== EXCLUDED_DOC_MARKER)
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
        const { data: newItemId, error } = await supabase.rpc('adicionar_item_customizado', {
          p_precatorio_id: precatorioId,
          p_tipo_grupo: 'DOC_CREDOR',
          p_nome_item: itemData.nome,
          p_observacao: itemData.observacao
        })
        if (error) throw error

        if (newItemId && (itemData.arquivo_url || itemData.status || itemData.validade)) {
          const { error: updateError } = await supabase.rpc('atualizar_status_item', {
            p_item_id: newItemId,
            p_novo_status: itemData.status || "PENDENTE",
            p_validade: itemData.validade || null,
            p_observacao: itemData.observacao || null,
            p_arquivo_url: itemData.arquivo_url || null,
          })
          if (updateError) throw updateError
        }

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

      const { data: rpcOk, error: rpcError } = await supabase.rpc('excluir_item_precatorio', {
        p_item_id: itemId,
      })

      if (rpcError || rpcOk !== true) {
        const { data: updated, error: fallbackError } = await supabase
          .from('precatorio_itens')
          .update({
            status_item: 'NAO_APLICAVEL',
            arquivo_url: null,
            validade: null,
            observacao: EXCLUDED_DOC_MARKER,
          })
          .eq('id', itemId)
          .select('id')

        if (fallbackError || !updated || updated.length === 0) {
          throw fallbackError || rpcError || new Error("Sem permissao para excluir este item.")
        }
      }

      toast({
        title: "Documento excluido",
        description: "O item foi removido do precatorio.",
      })

      await loadItems()
      onUpdate()
    } catch (error) {
      console.error("[Checklist Docs] Erro ao excluir:", error)
      toast({
        title: "Erro",
        description: "Nao foi possivel excluir o item.",
        variant: "destructive",
      })
    }
  }

  function viewDocument(url: string, title?: string) {
    openPDF(url, title || "Visualização de Documento")
  }

  const isImageUrl = (url?: string | null) => {
    if (!url) return false
    return /\.(png|jpg|jpeg|webp)$/i.test(url.split("?")[0])
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
      console.error("Erro ao baixar item individual:", error)
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive"
      })
    }
  }

  async function handleDownloadAll() {
    try {
      setLoading(true)
      const zip = new JSZip()
      const supabase = createBrowserClient()
      if (!supabase) return

      toast({
        title: "Iniciando download",
        description: "Preparando arquivos para compressão...",
      })

      // 1. Buscar TODOS os itens
      const { data: allItems, error } = await supabase
        .rpc('obter_itens_precatorio', {
          p_precatorio_id: precatorioId
        })

      if (error) throw error

      let count = 0
      let errors = 0

      // 2. Adicionar Ofício (se houver)
      if (pdfUrl) {
        const blob = await downloadFileAsArrayBuffer(pdfUrl, supabase, "Oficio Requisitorio")
        if (blob) {
          zip.file("Oficio_Requisitorio.pdf", blob)
          count++
        } else {
          errors++
        }
      }

      // 3. Adicionar Itens (Documentos e Certidões)
      if (allItems && allItems.length > 0) {
        const docsFolder = zip.folder("Documentos")
        const certFolder = zip.folder("Certidoes")

        for (const item of allItems) {
          if (!item.arquivo_url || item.observacao === EXCLUDED_DOC_MARKER) continue

          const blob = await downloadFileAsArrayBuffer(item.arquivo_url, supabase, item.nome_item)
          if (!blob) {
            errors++
            continue
          }

          const ext = getFileExt(getFileNameFromUrl(item.arquivo_url))
          const safeName = item.nome_item.replace(/[^a-z0-9]/gi, '_').substring(0, 50)
          const fileName = `${safeName}.${ext.toLowerCase()}`

          if (item.tipo_grupo === 'CERTIDAO') {
            certFolder?.file(fileName, blob)
          } else {
            docsFolder?.file(fileName, blob)
          }
          count++
        }
      }

      if (count === 0) {
        toast({
          title: "Erro no Download",
          description: errors > 0 ? "Falha ao baixar arquivos (Possível erro de rede)." : "Nenhum arquivo encontrado.",
          variant: "destructive"
        })
        return
      }

      const zipBlob = await zip.generateAsync({ type: "blob" })
      await saveFileWithPicker(zipBlob, "Documentacao_Precatorio.zip")

      if (errors > 0) {
        toast({
          title: "Download Parcial",
          description: `${count} baixados. ${errors} falharam.`,
        })
      } else {
        toast({
          title: "Sucesso",
          description: `${count} arquivos baixados com sucesso.`,
        })
      }

    } catch (error: any) {
      console.error("Erro no download total:", error)
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
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
      {/* Progresso e Botão Download Total */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">
                Progresso: {docsRecebidos}/{totalDocs} documentos
              </p>
              <p className="text-sm font-semibold text-primary">{percentual}%</p>
            </div>
            <Progress value={percentual} className="h-2" />
          </div>

          <Button onClick={handleDownloadAll} variant="default" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shrink-0">
            <Download className="mr-2 h-4 w-4" />
            Baixar Toda Documentação
          </Button>
        </div>
      </div>

      {/* Mini visualizadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {/* Item Especial: Oficio (PDF Original) */}
        {pdfUrl && (
          <div className="rounded-xl border border-border/50 bg-muted/40 p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Oficio Requisitorio (Original)</p>
                <p className="text-xs text-muted-foreground">Documento original enviado pelo Admin</p>
              </div>
              <Badge className="bg-green-500/80 text-white">Recebido</Badge>
            </div>
            <div className="mt-3 flex h-28 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => viewDocument(pdfUrl, "Oficio Requisitorio (PDF)")}
                className="w-full"
              >
                <Eye className="mr-2 h-4 w-4" />
                Visualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadItem(pdfUrl, "Oficio Requisitorio")}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </Button>
            </div>
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="group rounded-xl border border-border/50 bg-background/60 p-3 shadow-sm transition-colors hover:border-border"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.nome_item}</p>
                {item.observacao && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.observacao}</p>
                )}
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

            <div className="mt-3 flex flex-wrap items-center gap-2">
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
                    variant={item.arquivo_url ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleEditItem(item)}
                    className={
                      item.arquivo_url
                        ? undefined
                        : "bg-orange-500 text-white hover:bg-orange-600 border border-orange-500"
                    }
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
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && !pdfUrl && (
          <div className="col-span-full rounded-xl border border-dashed border-border/60 p-8 text-center text-muted-foreground">
            <p>Nenhum documento cadastrado ainda.</p>
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
