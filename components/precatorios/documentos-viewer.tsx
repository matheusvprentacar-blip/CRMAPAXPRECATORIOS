/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useMemo, useState } from "react"
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

const formatTipo = (tipo?: string | null) =>
  tipo ? tipo.replaceAll("_", " ") : ""

// ─── Icons ────────────────────────────────────────────────────────────────────
const ICClose = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const ICRefresh = ({ spin }: { spin?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${spin ? "animate-spin" : ""}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)
const ICDoc = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)
const ICChevDown = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────
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
    secondary.forEach((doc) => { if (!map.has(doc.id)) map.set(doc.id, doc) })
    return Array.from(map.values())
  }

  useEffect(() => {
    let isMounted = true

    if (!precatorioId) {
      if (fallbackDocs.length) {
        setDocs(fallbackDocs)
        setActiveId((prev) => prev || fallbackDocs[0]?.id || "")
      } else {
        setDocs([]); setActiveId("")
      }
      setLoading(false); setError(null)
      return () => { isMounted = false }
    }

    const loadFromClient = async (): Promise<DocumentoItem[]> => {
      const supabase = createBrowserClient()
      if (!supabase) return []
      const docs: DocumentoItem[] = []

      const result = await listarDocumentos(precatorioId)
      if (result.success && result.documentos) {
        const resolved = await Promise.all(
          result.documentos.map(async (doc) => {
            const titulo = (TIPO_DOCUMENTO_LABELS as Record<string, string>)[doc.tipo_documento] || doc.nome_arquivo || "Documento"
            const storageRef = doc.storage_path ? `storage:precatorios-documentos/${doc.storage_path}` : null
            const viewUrl = doc.storage_url || (storageRef ? await getFileDownloadUrl(storageRef) : null)
            return { id: doc.id, titulo, tipo: doc.tipo_documento, viewUrl: viewUrl ?? null, urlType: viewUrl ? "resolved" : "invalid", created_at: doc.created_at }
          })
        )
        docs.push(...resolved)
      }

      const { data: itensData } = await supabase.rpc("obter_itens_precatorio", { p_precatorio_id: precatorioId })
      const itensDocs = await Promise.all(
        (itensData ?? []).filter((item: any) => item?.arquivo_url && item?.observacao !== "__EXCLUIDO__")
          .map(async (item: any) => {
            const viewUrl = await getFileDownloadUrl(item?.arquivo_url ?? null)
            return { id: `item-${item.id}`, titulo: item.nome_item || "Documento", tipo: item.tipo_grupo || "checklist", viewUrl: viewUrl ?? null, urlType: viewUrl ? "resolved" : "invalid", created_at: item.created_at }
          })
      )
      docs.push(...itensDocs)
      return docs.sort((a, b) => (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0))
    }

    const loadDocs = async () => {
      setLoading(true); setError(null)
      try {
        const clientDocs = await loadFromClient()
        const merged = mergeDocs(clientDocs, fallbackDocs)
        if (!isMounted) return
        setDocs(merged)
        setActiveId((prev) => {
          if (prev && merged.some((item) => item.id === prev)) return prev
          const preferred = merged.find((item) => item.tipo === "oficio_requisitorio" && item.viewUrl) || merged.find((item) => item.viewUrl) || merged[0]
          return preferred?.id || ""
        })
        if (!merged.length) setError("Nenhum documento encontrado.")
      } catch (err: any) {
        const clientDocs = await loadFromClient()
        if (!isMounted) return
        if (clientDocs.length || fallbackDocs.length) {
          const merged = mergeDocs(clientDocs, fallbackDocs)
          setDocs(merged); setActiveId((prev) => prev || merged[0]?.id || "")
          setError(clientDocs.length ? null : err?.message || "Erro ao carregar documentos")
        } else {
          setError(err?.message || "Erro ao carregar documentos"); setDocs([]); setActiveId("")
        }
      } finally { if (isMounted) setLoading(false) }
    }

    loadDocs()
    return () => { isMounted = false }
  }, [precatorioId, refreshKey, fallbackDocs])

  const activeDoc = useMemo(() => docs.find((item) => item.id === activeId) || null, [docs, activeId])

  const statusText = useMemo(() => {
    if (loading) return "Carregando..."
    if (!docs.length && error) return error
    if (!docs.length) return "Nenhum documento"
    return `${docs.length} documento${docs.length > 1 ? "s" : ""} disponível${docs.length > 1 ? "is" : ""}`
  }, [loading, error, docs.length])

  return (
    <div className={cn("flex h-full flex-col bg-white", className)}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 h-12 shrink-0"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[#0e4d6a]">
            <ICDoc />
          </span>
          <span className="text-[13px] font-bold text-[#0b0c10]">Documentos</span>
          {docs.length > 0 && (
            <span className="inline-flex items-center h-5 px-2 rounded-full bg-[#0e4d6a]/10 text-[10px] font-bold text-[#0e4d6a]">
              {docs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center justify-center w-7 h-7 rounded-[8px] text-[#6b7280] hover:text-[#0e4d6a] hover:bg-[#f0f1f5] transition-colors"
            title="Atualizar"
          >
            <ICRefresh spin={loading} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-[8px] text-[#6b7280] hover:text-[#0b0c10] hover:bg-[#f0f1f5] transition-colors"
              title="Fechar"
            >
              <ICClose />
            </button>
          )}
        </div>
      </div>

      {/* ── Select + status ──────────────────────────────────────────── */}
      <div
        className="px-3 py-3 shrink-0 space-y-2"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#f8f9fc" }}
      >
        {/* Select nativo com chevron */}
        <div className="relative">
          <select
            className="w-full h-9 rounded-[11px] border border-black/[0.09] bg-white pl-3 pr-9 text-[12.5px] text-[#0b0c10] font-medium outline-none focus:border-[#0e4d6a] focus:ring-2 focus:ring-[#0e4d6a]/15 transition-all appearance-none cursor-pointer disabled:opacity-50"
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            disabled={!docs.length || loading}
            style={{ boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.04),inset -2px -2px 4px rgba(255,255,255,0.8)" }}
          >
            {!docs.length && <option value="">Nenhum documento disponível</option>}
            {docs.map((doc) => (
              <option key={doc.id} value={doc.id} disabled={!doc.viewUrl}>
                {doc.titulo || "Documento sem título"}{!doc.viewUrl ? " (indisponível)" : ""}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
            <ICChevDown />
          </span>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-[#9ca3af] truncate">{statusText}</span>
          {activeDoc?.tipo && (
            <span className="shrink-0 inline-flex items-center h-5 px-2 rounded-full bg-[#0e4d6a]/08 border border-[#0e4d6a]/15 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#0e4d6a]">
              {formatTipo(activeDoc.tipo)}
            </span>
          )}
        </div>
      </div>

      {/* ── Viewer ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="h-8 w-8 rounded-full border-[3px] border-[#0e4d6a]/15 border-t-[#0e4d6a] animate-spin" />
            <p className="text-[12px] text-[#9ca3af]">Carregando documentos...</p>
          </div>
        ) : activeDoc?.viewUrl ? (
          <iframe
            key={activeDoc.viewUrl}
            src={activeDoc.viewUrl}
            className="h-full w-full"
            title={activeDoc.titulo || "Documento do precatório"}
            style={{ border: "none" }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-[18px] text-[#9ca3af]"
              style={{ boxShadow: "inset 5px 5px 12px rgba(0,0,0,0.06),inset -4px -4px 10px rgba(255,255,255,0.9)", background: "#f0f1f5" }}
            >
              <ICDoc />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#374151]">Nenhum documento</p>
              <p className="text-[12px] text-[#9ca3af] mt-0.5">
                {error || "Selecione um documento para visualizar."}
              </p>
            </div>
            {docs.length > 0 && !activeDoc?.viewUrl && (
              <p className="text-[11px] text-[#9ca3af]">O documento selecionado não possui URL de visualização.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
