"use client"

import { useEffect, useMemo, useState } from "react"
import { Eye, RefreshCcw, ChevronsRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@/lib/supabase/client"
import { listarDocumentos } from "@/lib/utils/documento-upload"
import { TIPO_DOCUMENTO_LABELS } from "@/lib/types/documento"
import { getFileDownloadUrl } from "@/lib/utils/file-upload"

type DocumentoItem = {
  id: string
  titulo?: string | null
  tipo?: string | null
  viewUrl?: string | null
  urlType?: string | null
  created_at?: string | null
}

interface DocumentosViewerProps {
  precatorioId?: string
  onClose?: () => void
  fallbackDocs?: DocumentoItem[]
  className?: string
}

const formatTipo = (tipo?: string | null) => {
  if (!tipo) return ""
  return tipo.replaceAll("_", " ")
}

export function DocumentosViewer({
  precatorioId,
  onClose,
  fallbackDocs = [],
  className,
}: DocumentosViewerProps) {
  const [docs, setDocs] = useState<DocumentoItem[]>([])
  const [activeId, setActiveId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const mergeDocs = (primary: DocumentoItem[], secondary: DocumentoItem[]) => {
    const map = new Map<string, DocumentoItem>()
    primary.forEach((doc) => map.set(doc.id, doc))
    secondary.forEach((doc) => {
      if (!map.has(doc.id)) map.set(doc.id, doc)
    })
    return Array.from(map.values())
  }

  useEffect(() => {
    let isMounted = true

    if (!precatorioId) {
      if (fallbackDocs.length) {
        setDocs(fallbackDocs)
        setActiveId((prev) => prev || fallbackDocs[0]?.id || "")
      } else {
        setDocs([])
        setActiveId("")
      }
      setLoading(false)
      setError(null)
      return () => {
        isMounted = false
      }
    }

    const loadFromClient = async (): Promise<DocumentoItem[]> => {
      const supabase = createBrowserClient()
      if (!supabase) return []

      const docs: DocumentoItem[] = []

      const result = await listarDocumentos(precatorioId)
      if (result.success && result.documentos) {
        const resolved = await Promise.all(
          result.documentos.map(async (doc) => {
            const titulo =
              (TIPO_DOCUMENTO_LABELS as Record<string, string>)[doc.tipo_documento] ||
              doc.nome_arquivo ||
              "Documento"
            const storageRef = doc.storage_path
              ? `storage:precatorios-documentos/${doc.storage_path}`
              : null
            const viewUrl = doc.storage_url || (storageRef ? await getFileDownloadUrl(storageRef) : null)
            return {
              id: doc.id,
              titulo,
              tipo: doc.tipo_documento,
              viewUrl: viewUrl ?? null,
              urlType: viewUrl ? "resolved" : "invalid",
              created_at: doc.created_at,
            }
          })
        )
        docs.push(...resolved)
      }

      const { data: itensData } = await supabase
        .from("precatorio_itens")
        .select("id, precatorio_id, tipo_grupo, nome_item, arquivo_url, observacao, created_at")
        .eq("precatorio_id", precatorioId)
        .not("arquivo_url", "is", null)
        .order("created_at", { ascending: false })

      const itensDocs = await Promise.all(
        (itensData ?? [])
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

    const loadDocs = async () => {
      setLoading(true)
      setError(null)
      try {
        let token: string | null = null
        const supabase = createBrowserClient()
        if (supabase) {
          const { data } = await supabase.auth.getSession()
          token = data.session?.access_token ?? null
        }

        const response = await fetch(`/api/precatorios/${precatorioId}/documentos`, {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || "Erro ao carregar documentos")
        }

        const list = Array.isArray(payload?.documentos) ? payload.documentos : []

        let merged = mergeDocs(list, fallbackDocs)
        if (!merged.length) {
          const clientDocs = await loadFromClient()
          merged = mergeDocs(clientDocs, fallbackDocs)
        }

        if (!isMounted) return
        setDocs(merged)
        setActiveId((prev) => {
          if (prev && merged.some((item: DocumentoItem) => item.id === prev)) return prev
          const preferred =
            merged.find((item: DocumentoItem) => item.tipo === "oficio_requisitorio" && item.viewUrl) ||
            merged.find((item: DocumentoItem) => item.viewUrl) ||
            merged[0]
          return preferred?.id || ""
        })
      } catch (err: any) {
        const message = err?.message || "Erro ao carregar documentos"
        const clientDocs = await loadFromClient()
        if (!isMounted) return
        if (clientDocs.length || fallbackDocs.length) {
          const merged = mergeDocs(clientDocs, fallbackDocs)
          setDocs(merged)
          setActiveId((prev) => prev || merged[0]?.id || "")
          setError(clientDocs.length ? null : message)
        } else {
          setError(message)
          setDocs([])
          setActiveId("")
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDocs()

    return () => {
      isMounted = false
    }
  }, [precatorioId, refreshKey, fallbackDocs])

  const activeDoc = useMemo(
    () => docs.find((item) => item.id === activeId) || null,
    [docs, activeId]
  )

  const statusText = useMemo(() => {
    if (loading) return "Carregando documentos..."
    if (!docs.length && error) return error
    if (!docs.length) return "Nenhum documento encontrado."
    if (error) return `Mostrando ${docs.length} documento(s). Falha ao buscar anexos.`
    return `${docs.length} documento${docs.length > 1 ? "s" : ""} disponivel(is)`
  }, [loading, error, docs.length])

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex items-center justify-between border-b border-border/60 bg-background/80 px-3 py-2">
        <span className="text-sm font-medium">Documentos do Precatorio</span>
        {onClose ? (
          <button
            onClick={onClose}
            className="rounded-full p-1 transition hover:bg-muted"
            title="Fechar visualizador"
            type="button"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <Select value={activeId} onValueChange={setActiveId}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Selecione um documento" />
            </SelectTrigger>
            <SelectContent>
              {docs.map((doc) => (
                <SelectItem key={doc.id} value={doc.id} disabled={!doc.viewUrl}>
                  {doc.titulo || "Documento sem titulo"}
                  {!doc.viewUrl ? " (indisponivel)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            title="Atualizar links"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{statusText}</span>
          {activeDoc?.tipo ? (
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {formatTipo(activeDoc.tipo)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex-1">
        {activeDoc?.viewUrl ? (
          <iframe
            key={activeDoc.viewUrl}
            src={activeDoc.viewUrl}
            className="h-full w-full"
            title={activeDoc.titulo || "Documento do precatorio"}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-muted-foreground">
            <div className="rounded-full bg-muted p-4">
              <Eye className="h-8 w-8 opacity-50" />
            </div>
            <p>Selecione um documento para visualizar.</p>
            {error ? <p className="text-xs">{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  )
}
