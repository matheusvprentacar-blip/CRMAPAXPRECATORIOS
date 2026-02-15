"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, Download, CheckCircle2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { ComunicadoDestinatarioRow, ComunicadoRow } from "@/lib/types/comunicados"
import { toast } from "sonner"

type PendingRow = ComunicadoDestinatarioRow & {
  comunicado?: ComunicadoRow
}

function readOptionalString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key]
  if (typeof value === "string") return value
  return null
}

function normalizeComunicado(input: unknown): ComunicadoRow | undefined {
  const raw = Array.isArray(input) ? input[0] : input
  if (!raw || typeof raw !== "object") return undefined
  const obj = raw as Record<string, unknown>

  const id = readOptionalString(obj, "id")
  const titulo = readOptionalString(obj, "titulo")
  const mensagemOriginal = readOptionalString(obj, "mensagem_original")
  const mensagemPublicada = readOptionalString(obj, "mensagem_publicada")
  const criadoPor = readOptionalString(obj, "criado_por")
  const escopoRaw = readOptionalString(obj, "escopo")

  if (!id || !titulo || !mensagemOriginal || !mensagemPublicada || !criadoPor) {
    return undefined
  }

  return {
    id,
    titulo,
    mensagem_original: mensagemOriginal,
    mensagem_publicada: mensagemPublicada,
    estilo_ia: readOptionalString(obj, "estilo_ia"),
    escopo: escopoRaw === "equipe" ? "equipe" : "operadores",
    anexo_url: readOptionalString(obj, "anexo_url"),
    anexo_nome: readOptionalString(obj, "anexo_nome"),
    anexo_mime: readOptionalString(obj, "anexo_mime"),
    anexo_tamanho:
      typeof obj.anexo_tamanho === "number"
        ? obj.anexo_tamanho
        : typeof obj.anexo_tamanho === "string"
        ? Number(obj.anexo_tamanho)
        : null,
    criado_por: criadoPor,
    ativo: typeof obj.ativo === "boolean" ? obj.ativo : true,
    publicado_em: readOptionalString(obj, "publicado_em") || new Date().toISOString(),
    created_at: readOptionalString(obj, "created_at") || new Date().toISOString(),
    updated_at: readOptionalString(obj, "updated_at") || new Date().toISOString(),
  }
}

function normalizePendingRow(input: unknown): PendingRow | null {
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>

  const id = readOptionalString(obj, "id")
  const comunicadoId = readOptionalString(obj, "comunicado_id")
  const usuarioId = readOptionalString(obj, "usuario_id")
  const enviadoEm = readOptionalString(obj, "enviado_em")
  const createdAt = readOptionalString(obj, "created_at")
  const updatedAt = readOptionalString(obj, "updated_at")

  if (!id || !comunicadoId || !usuarioId || !enviadoEm || !createdAt || !updatedAt) {
    return null
  }

  return {
    id,
    comunicado_id: comunicadoId,
    usuario_id: usuarioId,
    enviado_em: enviadoEm,
    visualizado_em: readOptionalString(obj, "visualizado_em"),
    dispensado_em: readOptionalString(obj, "dispensado_em"),
    baixou_anexo_em: readOptionalString(obj, "baixou_anexo_em"),
    created_at: createdAt,
    updated_at: updatedAt,
    comunicado: normalizeComunicado(obj.comunicado),
  }
}

export function ComunicadosBroadcastModal() {
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<PendingRow | null>(null)
  const [saving, setSaving] = useState(false)

  const userId = profile?.id

  const hasAttachment = useMemo(
    () => Boolean(pending?.comunicado?.anexo_url),
    [pending?.comunicado?.anexo_url]
  )

  const fetchPending = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("comunicado_destinatarios")
        .select(
          `
          id,
          comunicado_id,
          usuario_id,
          enviado_em,
          visualizado_em,
          dispensado_em,
          baixou_anexo_em,
          created_at,
          updated_at,
          comunicado:comunicados (
            id,
            titulo,
            mensagem_original,
            mensagem_publicada,
            estilo_ia,
            escopo,
            anexo_url,
            anexo_nome,
            anexo_mime,
            anexo_tamanho,
            criado_por,
            ativo,
            publicado_em,
            created_at,
            updated_at
          )
        `
        )
        .eq("usuario_id", userId)
        .is("visualizado_em", null)
        .is("dispensado_em", null)
        .order("enviado_em", { ascending: false })
        .limit(5)

      if (error) {
        console.error("Erro ao buscar comunicados pendentes:", error)
        setLoading(false)
        return
      }

      const rows = (Array.isArray(data) ? data : [])
        .map(normalizePendingRow)
        .filter((row): row is PendingRow => Boolean(row))
      const nextPending = rows.find((row) => row.comunicado?.ativo !== false) || null
      setPending(nextPending)
      setOpen(Boolean(nextPending))
    } catch (err) {
      console.error("Erro inesperado ao buscar comunicados:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase, userId])

  const registerEvent = useCallback(
    async (eventType: "visualizado" | "dispensado" | "download") => {
      if (!supabase || !pending?.comunicado_id) return false

      const { error } = await supabase.rpc("comunicado_registrar_evento", {
        p_comunicado_id: pending.comunicado_id,
        p_evento: eventType,
      })

      if (error) {
        console.error("Erro ao registrar evento de comunicado:", error)
        toast.error("Não foi possível registrar sua ação no comunicado.")
        return false
      }

      return true
    },
    [pending?.comunicado_id, supabase]
  )

  const handleMarkRead = useCallback(async () => {
    setSaving(true)
    const ok = await registerEvent("visualizado")
    setSaving(false)
    if (!ok) return

    setOpen(false)
    setPending(null)
    toast.success("Comunicado marcado como lido.")
    void fetchPending()
  }, [fetchPending, registerEvent])

  const handleDismiss = useCallback(async () => {
    setSaving(true)
    const ok = await registerEvent("dispensado")
    setSaving(false)
    if (!ok) return

    setOpen(false)
    setPending(null)
    void fetchPending()
  }, [fetchPending, registerEvent])

  const handleDownload = useCallback(async () => {
    if (!pending?.comunicado?.anexo_url) return
    const ok = await registerEvent("download")
    if (ok) {
      window.open(pending.comunicado.anexo_url, "_blank", "noopener,noreferrer")
    }
  }, [pending?.comunicado?.anexo_url, registerEvent])

  const openFullPage = useCallback(() => {
    if (!pending?.comunicado?.id) return
    router.push(`/comunicados?id=${pending.comunicado.id}`)
  }, [pending?.comunicado?.id, router])

  useEffect(() => {
    void fetchPending()
  }, [fetchPending])

  useEffect(() => {
    const onFocus = () => {
      void fetchPending()
    }

    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [fetchPending])

  if (!userId || loading || !pending?.comunicado) return null

  return (
    <Dialog open={open} onOpenChange={(state) => !state && void handleDismiss()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border border-primary/20">
        <div className="grid md:grid-cols-[220px_1fr]">
          <div className="bg-gradient-to-b from-orange-100 to-amber-50 dark:from-orange-950/40 dark:to-zinc-900 p-6 flex items-center justify-center">
            <div className="rounded-2xl bg-white/80 dark:bg-zinc-900/70 p-6 shadow-sm">
              <Megaphone className="w-16 h-16 text-orange-500" />
            </div>
          </div>

          <div className="p-6 space-y-4">
            <DialogHeader className="space-y-2">
              <Badge variant="secondary" className="w-fit">Comunicado da administração</Badge>
              <DialogTitle className="text-2xl leading-tight">{pending.comunicado.titulo}</DialogTitle>
              <DialogDescription className="text-base leading-relaxed whitespace-pre-line">
                {pending.comunicado.mensagem_publicada}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 pt-2">
              <div className="flex flex-wrap gap-2">
                {hasAttachment && (
                  <Button variant="outline" onClick={handleDownload} disabled={saving}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar anexo
                  </Button>
                )}
                <Button variant="ghost" onClick={openFullPage} disabled={saving}>
                  Ver detalhes
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void handleDismiss()} disabled={saving}>
                  Agora não
                </Button>
                <Button onClick={() => void handleMarkRead()} disabled={saving}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Li e entendi
                </Button>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
