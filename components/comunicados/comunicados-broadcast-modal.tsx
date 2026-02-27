"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, Download, CheckCircle2 } from "@/components/icons"
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
import { COMUNICADOS_ALERT_EVENT_TYPES, type ComunicadoDestinatarioRow, type ComunicadoRow } from "@/lib/types/comunicados"
import { toast } from "sonner"

type PendingRow = ComunicadoDestinatarioRow & {
  comunicado?: ComunicadoRow
}

type AdminInterestAlertRow = {
  id: string
  title: string
  body: string
  link_url: string | null
  entity_type: string | null
  entity_id: string | null
  event_type: string | null
  created_at: string
  read_at: string | null
  precatorio_label?: string
  precatorio_valor?: number | null
}

type ComunicadosBroadcastModalProps = {
  onComunicadoBlockingChange?: (isBlocking: boolean) => void
}

function readOptionalString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key]
  if (typeof value === "string") return value
  return null
}

function readOptionalNumber(obj: Record<string, unknown>, key: string): number | null {
  const value = obj[key]
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
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
    anexo_tamanho: readOptionalNumber(obj, "anexo_tamanho"),
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

function normalizeAdminAlertRow(input: unknown): AdminInterestAlertRow | null {
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>

  const id = readOptionalString(obj, "id")
  const title = readOptionalString(obj, "title")
  const body = readOptionalString(obj, "body")
  const createdAt = readOptionalString(obj, "created_at")

  if (!id || !title || !body || !createdAt) return null

  return {
    id,
    title,
    body,
    link_url: readOptionalString(obj, "link_url"),
    entity_type: readOptionalString(obj, "entity_type"),
    entity_id: readOptionalString(obj, "entity_id"),
    event_type: readOptionalString(obj, "event_type"),
    created_at: createdAt,
    read_at: readOptionalString(obj, "read_at"),
  }
}

function formatCurrency(value?: number | null) {
  if (!value || value <= 0) return null
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function describeError(error: unknown): string {
  if (!error) return "erro desconhecido"
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>
    const code = readOptionalString(obj, "code")
    const message = readOptionalString(obj, "message")
    const details = readOptionalString(obj, "details")
    const hint = readOptionalString(obj, "hint")
    const parts = [code ? `code=${code}` : null, message, details, hint].filter(
      (value): value is string => Boolean(value)
    )
    if (parts.length > 0) return parts.join(" | ")
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function ComunicadosBroadcastModal({ onComunicadoBlockingChange }: ComunicadosBroadcastModalProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<PendingRow | null>(null)
  const [pendingAdminAlert, setPendingAdminAlert] = useState<AdminInterestAlertRow | null>(null)
  const [saving, setSaving] = useState(false)

  const userId = profile?.id

  const hasAttachment = useMemo(
    () => Boolean(pending?.comunicado?.anexo_url),
    [pending?.comunicado?.anexo_url]
  )

  const activeItem = useMemo(() => {
    const comunicadoDate = pending?.enviado_em ? new Date(pending.enviado_em).getTime() : 0
    const alertDate = pendingAdminAlert?.created_at ? new Date(pendingAdminAlert.created_at).getTime() : 0

    if (!pending && !pendingAdminAlert) return null
    if (!pending) return { kind: "alerta" as const, alerta: pendingAdminAlert }
    if (!pendingAdminAlert) return { kind: "comunicado" as const, comunicado: pending }

    if (alertDate >= comunicadoDate) {
      return { kind: "alerta" as const, alerta: pendingAdminAlert }
    }

    return { kind: "comunicado" as const, comunicado: pending }
  }, [pending, pendingAdminAlert])

  const fetchPending = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    try {
      const comunicadoPromise = supabase
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

      const alertPromise = supabase
        .from("notifications")
        .select("id, title, body, link_url, entity_type, entity_id, event_type, created_at, read_at")
        .eq("user_id", userId)
        .is("read_at", null)
        .in("event_type", [...COMUNICADOS_ALERT_EVENT_TYPES])
        .order("created_at", { ascending: false })
        .limit(5)

      const [{ data: comunicadoData, error: comunicadoError }, { data: alertsData, error: alertsError }] =
        await Promise.all([comunicadoPromise, alertPromise])

      if (comunicadoError) {
        console.error(`Erro ao buscar comunicados pendentes: ${describeError(comunicadoError)}`)
        setLoading(false)
        return
      }

      if (alertsError) {
        console.error(`Erro ao buscar alertas individuais do admin: ${describeError(alertsError)}`)
      }

      const comunicadoRows = (Array.isArray(comunicadoData) ? comunicadoData : [])
        .map(normalizePendingRow)
        .filter((row): row is PendingRow => Boolean(row))
      const nextPending = comunicadoRows.find((row) => row.comunicado?.ativo !== false) || null

      const normalizedAlerts = (Array.isArray(alertsData) ? alertsData : [])
        .map(normalizeAdminAlertRow)
        .filter((row): row is AdminInterestAlertRow => Boolean(row))

      const alertPrecatorioIds = Array.from(
        new Set(
          normalizedAlerts
            .map((row) => (row.entity_type === "precatorio" ? row.entity_id : null))
            .filter((id): id is string => Boolean(id))
        )
      )

      const alertByPrecatorioId = new Map<string, { label: string; valor: number | null }>()
      if (alertPrecatorioIds.length > 0) {
        const { data: precatoriosData, error: precatoriosError } = await supabase
          .from("precatorios")
          .select("id, titulo, numero_precatorio, credor_nome, valor_atualizado, valor_principal")
        .in("id", alertPrecatorioIds)

        if (precatoriosError) {
          console.error(
            `Erro ao carregar dados de precatorios para alertas: ${describeError(precatoriosError)}`
          )
        } else {
          const rows = Array.isArray(precatoriosData)
            ? (precatoriosData as Array<Record<string, unknown>>)
            : []
          for (const row of rows) {
            const precId = readOptionalString(row, "id")
            if (!precId) continue
            const label =
              readOptionalString(row, "titulo") ||
              readOptionalString(row, "numero_precatorio") ||
              readOptionalString(row, "credor_nome") ||
              "Credito sem identificacao"
            const valor =
              readOptionalNumber(row, "valor_atualizado") || readOptionalNumber(row, "valor_principal")
            alertByPrecatorioId.set(precId, { label, valor })
          }
        }
      }

      const enrichedAlerts = normalizedAlerts.map((row) => {
        const mapped = row.entity_id ? alertByPrecatorioId.get(row.entity_id) : null
        return {
          ...row,
          precatorio_label: mapped?.label,
          precatorio_valor: mapped?.valor ?? null,
        }
      })

      const nextAdminAlert = enrichedAlerts[0] || null

      setPending(nextPending)
      setPendingAdminAlert(nextAdminAlert)
      setOpen(Boolean(nextPending || nextAdminAlert))
    } catch (err) {
      console.error(`Erro inesperado ao buscar comunicados: ${describeError(err)}`)
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
        console.error(`Erro ao registrar evento de comunicado: ${describeError(error)}`)
        toast.error("Nao foi possivel registrar sua acao no comunicado.")
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

  const handleRequireRead = useCallback(() => {
    toast.warning("Para dispensar este comunicado, clique em 'Li e entendi'.")
  }, [])

  const handleMarkAlertRead = useCallback(async () => {
    if (!supabase || !pendingAdminAlert?.id) return

    setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: nowIso })
        .eq("id", pendingAdminAlert.id)

      if (error) throw error

      setOpen(false)
      setPendingAdminAlert(null)
      toast.success("Alerta marcado como lido.")
      void fetchPending()
    } catch (error) {
      console.error(`Erro ao marcar alerta como lido: ${describeError(error)}`)
      toast.error("Nao foi possivel confirmar leitura do alerta.")
    } finally {
      setSaving(false)
    }
  }, [fetchPending, pendingAdminAlert?.id, supabase])

  const handleDismissAlert = useCallback(() => {
    setOpen(false)
  }, [])

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

  const openAlertTarget = useCallback(() => {
    if (!pendingAdminAlert) return

    if (pendingAdminAlert.link_url) {
      router.push(pendingAdminAlert.link_url)
      return
    }

    if (pendingAdminAlert.entity_type === "precatorio" && pendingAdminAlert.entity_id) {
      router.push(`/precatorios/detalhes?id=${pendingAdminAlert.entity_id}`)
    }
  }, [pendingAdminAlert, router])

  const handleOpenChange = useCallback(
    (state: boolean) => {
      if (state) {
        setOpen(true)
        return
      }

      if (activeItem?.kind === "comunicado") {
        setOpen(true)
        handleRequireRead()
        return
      }

      setOpen(false)
    },
    [activeItem?.kind, handleRequireRead]
  )

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

  useEffect(() => {
    const isBlocking = Boolean(open && activeItem?.kind === "comunicado")
    onComunicadoBlockingChange?.(isBlocking)

    return () => {
      onComunicadoBlockingChange?.(false)
    }
  }, [activeItem?.kind, onComunicadoBlockingChange, open])

  if (!userId || loading || !activeItem) return null

  const comunicado = activeItem.kind === "comunicado" ? activeItem.comunicado?.comunicado : null
  const alerta = activeItem.kind === "alerta" ? activeItem.alerta : null
  const canOpenAlertTarget = Boolean(
    alerta?.link_url || (alerta?.entity_type === "precatorio" && alerta?.entity_id)
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`max-w-3xl max-h-[90vh] p-0 overflow-hidden border border-border/70 bg-card text-card-foreground shadow-2xl ${activeItem.kind === "comunicado" ? "[&>button]:hidden" : ""}`}
        onEscapeKeyDown={(event) => {
          if (activeItem.kind === "comunicado") {
            event.preventDefault()
            handleRequireRead()
          }
        }}
        onPointerDownOutside={(event) => {
          if (activeItem.kind === "comunicado") {
            event.preventDefault()
            handleRequireRead()
          }
        }}
      >
        <div className="grid max-h-[90vh] bg-card md:grid-cols-[220px_1fr]">
          <div className="flex items-center justify-center bg-gradient-to-b from-orange-100 to-amber-50 p-6 dark:from-orange-950 dark:to-zinc-900">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <Megaphone className="w-16 h-16 text-primary" />
            </div>
          </div>

          <div className="flex min-h-0 flex-col space-y-4 bg-card p-6 text-card-foreground">
            <DialogHeader className="space-y-2">
              <Badge variant="secondary" className="w-fit">
                {activeItem.kind === "comunicado"
                  ? "Comunicado da administracao"
                  : alerta?.event_type === "agenda_alerta"
                    ? "Alerta da agenda"
                    : "Alerta direto da administracao"}
              </Badge>
              <DialogTitle className="text-2xl leading-tight text-card-foreground">
                {activeItem.kind === "comunicado" ? comunicado?.titulo : alerta?.title}
              </DialogTitle>
              <div className="max-h-[45vh] md:max-h-[56vh] overflow-y-auto pr-2">
                <DialogDescription className="whitespace-pre-line text-base leading-relaxed text-card-foreground/85">
                  {activeItem.kind === "comunicado" ? comunicado?.mensagem_publicada : alerta?.body}
                </DialogDescription>
              </div>

              {activeItem.kind === "alerta" && alerta?.entity_type === "precatorio" && (
                <div className="rounded-lg border border-primary/40 bg-primary/15 dark:border-primary/40 dark:bg-primary/15 p-3 space-y-1">
                  <p className="text-xs font-semibold uppercase text-primary dark:text-primary">
                    Credito com interesse do admin
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {alerta.precatorio_label || "Credito vinculado"}
                  </p>
                  {formatCurrency(alerta.precatorio_valor) && (
                    <p className="text-xs text-muted-foreground">
                      Valor de referencia: {formatCurrency(alerta.precatorio_valor)}
                    </p>
                  )}
                </div>
              )}
            </DialogHeader>

            <DialogFooter className="pt-2 mt-auto flex-col gap-2">
              <div className="flex flex-wrap gap-2 justify-start">
                {activeItem.kind === "comunicado" && hasAttachment && (
                  <Button variant="outline" onClick={handleDownload} disabled={saving}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar anexo
                  </Button>
                )}

                {activeItem.kind === "comunicado" ? (
                  <Button variant="ghost" onClick={openFullPage} disabled={saving}>
                    Ver detalhes
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={openAlertTarget} disabled={saving || !canOpenAlertTarget}>
                    Ver credito
                  </Button>
                )}
              </div>

              {activeItem.kind === "comunicado" ? (
                <div className="flex justify-end gap-2 flex-nowrap">
                  <Button onClick={() => void handleMarkRead()} disabled={saving}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Li e entendi
                  </Button>
                </div>
              ) : (
                <div className="flex justify-end gap-2 flex-nowrap">
                  <Button variant="secondary" onClick={handleDismissAlert} disabled={saving}>
                    Agora nao
                  </Button>
                  <Button onClick={() => void handleMarkAlertRead()} disabled={saving}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Li e entendi
                  </Button>
                </div>
              )}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
