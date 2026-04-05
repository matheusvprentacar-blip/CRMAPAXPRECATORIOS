/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  FileText,
  FileType,
  RefreshCcw,
  Send,
  Trash2,
  Upload,
} from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { saveFileWithPicker } from "@/lib/utils/file-saver-custom"
import { buildDownloadFileName, downloadFileWithMetadata, getFileDownloadUrl } from "@/lib/utils/file-upload"
import { uploadAndAttachPdf } from "@/lib/utils/pdf-upload"
import { listarDocumentos } from "@/lib/utils/documento-upload"
import { TIPO_DOCUMENTO_LABELS } from "@/lib/types/documento"
import { toast } from "sonner"
import { usePDFViewer } from "@/components/providers/pdf-viewer-provider"

type DocumentoItem = {
  id: string
  titulo?: string | null
  tipo?: string | null
  viewUrl?: string | null
  urlType?: string | null
  created_at?: string | null
  signError?: string | null
}

interface OficioViewerProps {
  precatorioId: string
  fileUrl?: string | null
  onFileUpdate: (url?: string) => void
  readonly?: boolean
  currentStatus?: string | null
}

const formatTipo = (tipo?: string | null) => {
  if (!tipo) return ""
  if (tipo === "oficio_requisitorio") return "Ofício Requisitório"
  return tipo.replaceAll("_", " ")
}

const buildStatusText = (loading: boolean, error: string | null, count: number) => {
  if (loading) return "Carregando documentos..."
  if (!count && error) return error
  if (!count) return "Nenhum documento encontrado."
  if (error) return `Mostrando ${count} documento(s). Falha ao buscar anexos.`
  return `${count} documento${count > 1 ? "s" : ""} disponível(is)`
}

export function OficioViewer({
  precatorioId,
  fileUrl,
  onFileUpdate,
  readonly = false,
  currentStatus,
}: OficioViewerProps) {
  const [uploading, setUploading] = useState(false)
  const [docs, setDocs] = useState<DocumentoItem[]>([])
  const [activeId, setActiveId] = useState("")
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const replaceInputRef = useRef<HTMLInputElement | null>(null)
  const attachInputRef = useRef<HTMLInputElement | null>(null)
  const { openPDF } = usePDFViewer()
  const { profile } = useAuth()
  const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as string[]
  const canEnviarCalculoRoles = roles.some((role) =>
    ["admin", "juridico", "analista", "analista_processual"].includes(role)
  )
  const isAnaliseProcessualStage = (currentStatus || "") === "analise_processual_inicial"
  const bloqueadoEnvio = isAnaliseProcessualStage && !canEnviarCalculoRoles

  useEffect(() => {
    let isMounted = true

    const loadDocs = async () => {
      if (!precatorioId) return

      setLoadingDocs(true)
      setError(null)

      let fallbackDoc: DocumentoItem | null = null
      if (fileUrl) {
        const resolved = await getFileDownloadUrl(fileUrl)
        const fallbackViewUrl = resolved ?? (fileUrl.startsWith("http") ? fileUrl : null)
        fallbackDoc = {
          id: "legacy-oficio",
          titulo: "Ofício Requisitório",
          tipo: "oficio_requisitorio",
          viewUrl: fallbackViewUrl,
          urlType: resolved ? "resolved" : "public",
        }
      }

      const loadFromClient = async (): Promise<DocumentoItem[]> => {
        const supabase = createBrowserClient()
        if (!supabase) return []

        const docs: DocumentoItem[] = []

        const result = await listarDocumentos(precatorioId)
        if (result.success && result.documentos) {
          const resolved = await Promise.all(
            result.documentos.map(async (doc: any) => {
              const tipo = doc?.tipo_documento ?? null
              const titulo =
                (TIPO_DOCUMENTO_LABELS as Record<string, string>)[tipo] ||
                doc?.nome_arquivo ||
                "Documento"
              const storageRef = doc?.storage_path
                ? `storage:precatorios-documentos/${doc.storage_path}`
                : null
              const viewUrl = doc?.storage_url || (storageRef ? await getFileDownloadUrl(storageRef) : null)
              return {
                id: doc.id,
                titulo,
                tipo,
                viewUrl: viewUrl ?? null,
                urlType: viewUrl ? "resolved" : "invalid",
                created_at: doc?.created_at ?? null,
              }
            })
          )
          docs.push(...resolved)
        }

        const { data: itensData } = await supabase
          .rpc("obter_itens_precatorio", { p_precatorio_id: precatorioId })

        const itensDocs = await Promise.all(
          (itensData ?? [])
            .filter((item: any) => item?.arquivo_url)
            .filter((item: any) => item?.observacao !== "__EXCLUIDO__")
            .map(async (item: any) => {
              const viewUrl = await getFileDownloadUrl(item?.arquivo_url ?? null)
              return {
                id: `item-${item.id}`,
                titulo: item.nome_item || "Documento",
                tipo: item.tipo_grupo || "checklist",
                viewUrl: viewUrl ?? null,
                urlType: viewUrl ? "resolved" : "invalid",
                created_at: item.created_at,
              }
            })
        )

        docs.push(...itensDocs)

        return docs.sort((a, b) => {
          const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0
          const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0
          return bTime - aTime
        })
      }

      let list: DocumentoItem[] = []
      try {
        list = await loadFromClient()
      } catch (err: any) {
        if (!isMounted) return
        setError(err?.message || "Erro ao carregar documentos")
      }

      const hasOficioApi = list.some((doc) => doc.tipo === "oficio_requisitorio" && doc.viewUrl)
      const hasDuplicateFallback =
        fallbackDoc?.viewUrl && list.some((doc) => doc.viewUrl && doc.viewUrl === fallbackDoc.viewUrl)

      const merged = fallbackDoc && !hasOficioApi && !hasDuplicateFallback ? [fallbackDoc, ...list] : list

      if (!isMounted) return
      setDocs(merged)
      setActiveId((prev) => {
        if (prev && merged.some((doc) => doc.id === prev)) return prev
        const preferred =
          merged.find((doc) => doc.tipo === "oficio_requisitorio" && doc.viewUrl) ||
          merged.find((doc) => doc.viewUrl) ||
          merged[0]
        return preferred?.id || ""
      })
      if (!merged.length && !fallbackDoc) {
        setError((prev) => prev || "Nenhum documento encontrado.")
      }
      setLoadingDocs(false)
    }

    loadDocs()

    return () => {
      isMounted = false
    }
  }, [precatorioId, fileUrl, refreshKey])

  const activeDoc = useMemo(
    () => docs.find((doc) => doc.id === activeId) || null,
    [docs, activeId]
  )

  const oficioDoc = useMemo(
    () => docs.find((doc) => doc.tipo === "oficio_requisitorio" && doc.viewUrl) || null,
    [docs]
  )
  const hasOficio = Boolean(oficioDoc?.viewUrl || fileUrl)

  const statusText = useMemo(
    () => buildStatusText(loadingDocs, error, docs.length),
    [loadingDocs, error, docs.length]
  )

  const handleDownload = async (doc?: DocumentoItem | null) => {
    if (!doc?.viewUrl) return
    try {
      setUploading(true)
      const supabase = createBrowserClient()
      if (!supabase) return

      toast.info("Iniciando download...")

      const downloaded = await downloadFileWithMetadata(doc.viewUrl, supabase, doc.titulo || "Documento")
      if (!downloaded) throw new Error("Falha ao baixar arquivo")

      const blob = new Blob([downloaded.buffer], {
        type: downloaded.mimeType || "application/octet-stream",
      })

      const fileName = buildDownloadFileName({
        preferredName: doc.titulo || "Documento",
        sourceFileName: downloaded.fileName,
        sourceUrl: doc.viewUrl,
        mimeType: downloaded.mimeType,
      })

      await saveFileWithPicker(blob, fileName)
      toast.success("Download iniciado")
    } catch (error: any) {
      console.error("Erro no download:", error)
      toast.error("Erro ao baixar documento.")
    } finally {
      setUploading(false)
    }
  }

  const handleViewDocument = (doc?: DocumentoItem | null) => {
    if (doc?.viewUrl) {
      openPDF(doc.viewUrl, doc.titulo || "Documento")
    }
  }

  const handleOpenNewTab = (doc?: DocumentoItem | null) => {
    if (!doc?.viewUrl) return
    window.open(doc.viewUrl, "_blank", "noopener,noreferrer")
  }

  const openReplacePicker = () => {
    if (uploading) return
    replaceInputRef.current?.click()
  }

  const openAttachPicker = () => {
    if (uploading) return
    attachInputRef.current?.click()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      toast.error("Por favor, envie apenas arquivos PDF.")
      return
    }

    try {
      setUploading(true)
      const { storageRef } = await uploadAndAttachPdf({
        precatorioId,
        file,
      })

      toast.success("Ofício anexado com sucesso!")
      onFileUpdate?.(storageRef)
      setRefreshKey((prev) => prev + 1)
    } catch (error) {
      console.error("Erro no upload:", error)
      const message = error instanceof Error ? error.message : "Erro ao fazer upload do ofício."
      toast.error(message)
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleRemoveFile = async () => {
    if (!confirm("Tem certeza que deseja remover este ofício?")) return

    try {
      setUploading(true)
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não inicializado")

      const { error } = await supabase.from("precatorios").update({ file_url: null }).eq("id", precatorioId)

      if (error) throw error

      toast.success("Ofício removido com sucesso!")
      onFileUpdate?.(undefined)
      setRefreshKey((prev) => prev + 1)
    } catch (error: any) {
      console.error("Erro ao remover:", error)
      toast.error(`Erro ao remover: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSendToCalculation = async () => {
    try {
      if (bloqueadoEnvio) {
        toast.error("Somente jurídico, admin ou analista processual podem enviar para cálculo.")
        return
      }
      setUploading(true)
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não inicializado")

      const { error } = await supabase
        .from("precatorios")
        .update({
          status_kanban: "pronto_calculo",
          localizacao_kanban: "fila_calculo",
        })
        .eq("id", precatorioId)

      if (error) throw error

      toast.success("Enviado para Fila de Cálculo com sucesso! 🚀")
      onFileUpdate?.()
    } catch (error: any) {
      console.error("Erro ao enviar:", error)
      toast.error(`Erro ao enviar: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="border-l-4 border-l-cyan-500 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-600" />
              Ofício Requisitório
            </CardTitle>
            <CardDescription>Documento oficial do precatório (ofício original).</CardDescription>
          </div>
          {hasOficio ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Anexado
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
              Pendente
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Documentos anexados</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                  disabled={loadingDocs}
                  title="Atualizar documentos"
                >
                  <RefreshCcw className={`h-4 w-4 ${loadingDocs ? "animate-spin" : ""}`} />
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                <Select value={activeId} onValueChange={setActiveId}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione um documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {docs.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id} disabled={!doc.viewUrl}>
                        {doc.titulo || "Documento sem título"}
                        {!doc.viewUrl ? " (indisponível)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-xs text-muted-foreground">{statusText}</p>
              </div>

              {docs.length > 0 && (
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {docs.map((doc) => {
                    const isActive = doc.id === activeId
                    return (
                      <button
                        key={`list-${doc.id}`}
                        type="button"
                        onClick={() => setActiveId(doc.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? "border-primary/60 bg-primary/10 text-foreground"
                            : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate">{doc.titulo || "Documento"}</span>
                          {doc.tipo ? (
                            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              {formatTipo(doc.tipo)}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Ofício Requisitório</p>
                {oficioDoc ? (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    Anexado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                    Pendente
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                O ofício é o documento obrigatório para liberar as próximas etapas.
              </p>

              {hasOficio ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(oficioDoc)}
                    disabled={!oficioDoc?.viewUrl}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(oficioDoc)}
                    disabled={!oficioDoc?.viewUrl}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                  {!readonly && (
                    <>
                      <div>
                        <input
                          ref={replaceInputRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                        <Button variant="secondary" size="sm" disabled={uploading} onClick={openReplacePicker}>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading ? "Enviando..." : "Anexar/Substituir Ofício"}
                        </Button>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={uploading}
                        onClick={handleRemoveFile}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  {!readonly ? (
                    <div className="inline-flex">
                      <input
                        ref={attachInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <Button
                        size="sm"
                        disabled={uploading}
                        className="bg-cyan-600 hover:bg-cyan-700"
                        onClick={openAttachPicker}
                      >
                        {uploading ? "Enviando..." : "Anexar Ofício Requisitório (PDF)"}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg border border-border/60">
                      Sem permissão para anexar Ofício neste precatório.
                    </div>
                  )}
                </div>
              )}

              {hasOficio && !oficioDoc?.viewUrl && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Ofício anexado, mas o link não pôde ser carregado. Clique em atualizar documentos.
                </p>
              )}

              {!readonly && hasOficio && (
                <div className="mt-4 border-t border-border/60 pt-3">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSendToCalculation}
                    disabled={uploading || bloqueadoEnvio}
                    title={
                      bloqueadoEnvio
                        ? "Somente jurídico, admin ou analista processual podem enviar para cálculo."
                        : "Enviar para cálculo"
                    }
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar para Cálculo
                  </Button>
                  {bloqueadoEnvio && (
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      Somente jurídico, admin ou analista processual podem enviar para cálculo.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/70 shadow-sm overflow-hidden flex flex-col min-h-[420px]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {activeDoc?.titulo || "Nenhum documento selecionado"}
                </p>
                <p className="text-xs text-muted-foreground">{formatTipo(activeDoc?.tipo) || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleViewDocument(activeDoc)}
                  disabled={!activeDoc?.viewUrl}
                  title="Visualizar em tela cheia"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleOpenNewTab(activeDoc)}
                  disabled={!activeDoc?.viewUrl}
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleDownload(activeDoc)}
                  disabled={!activeDoc?.viewUrl}
                  title="Baixar documento"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-muted/20">
              {activeDoc?.viewUrl ? (
                <iframe
                  key={activeDoc.viewUrl}
                  src={activeDoc.viewUrl}
                  className="h-full w-full"
                  title={activeDoc.titulo || "Documento do precatório"}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-muted-foreground">
                  <div className="rounded-full bg-muted p-4">
                    <FileType className="h-8 w-8 opacity-50" />
                  </div>
                  <p>Selecione um documento para visualizar.</p>
                  {error ? <p className="text-xs">{error}</p> : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
