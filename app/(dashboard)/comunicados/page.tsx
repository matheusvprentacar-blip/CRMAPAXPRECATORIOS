"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Megaphone,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import type {
  AdminComunicadoRow,
  ComunicadoDestinatarioRow,
  ComunicadoScope,
  ComunicadoRow,
} from "@/lib/types/comunicados"

type AiDraft = {
  titulo_sugerido: string
  mensagem_revisada: string
  versao_curta: string
  observacoes: string[]
}

type UserComunicadoRow = ComunicadoDestinatarioRow & {
  comunicado?: ComunicadoRow
}

type ComunicadoTargetScope = ComunicadoScope | "individual"

type RecipientOption = {
  id: string
  nome: string
  email: string
  roleLabel: string
  label: string
}

type IndividualAlertRow = {
  id: string
  title: string
  body: string
  link_url: string | null
  entity_type: string | null
  entity_id: string | null
  event_type: string | null
  created_at: string
  read_at: string | null
}

type AiReviewRequest = {
  title: string
  message: string
  tone: string
}

type AiEnvelope = {
  ok?: boolean
  data?: unknown
  error?: string
}

function normalizeAiText(input: unknown): string {
  if (typeof input !== "string") return ""
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function normalizeAiDraft(input: unknown, fallbackTitle: string, fallbackMessage: string): AiDraft {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : {}
  const cleanedMessage = normalizeAiText(obj.mensagem_revisada) || normalizeAiText(fallbackMessage)

  return {
    titulo_sugerido:
      normalizeAiText(obj.titulo_sugerido) || normalizeAiText(fallbackTitle) || "Comunicado interno",
    mensagem_revisada: cleanedMessage,
    versao_curta:
      normalizeAiText(obj.versao_curta) ||
      cleanedMessage.slice(0, 280) ||
      normalizeAiText(fallbackMessage).slice(0, 280),
    observacoes: Array.isArray(obj.observacoes)
      ? obj.observacoes.map((item) => normalizeAiText(String(item))).filter(Boolean).slice(0, 4)
      : [],
  }
}

function normalizeRoles(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean)
  if (typeof value === "string" && value.trim().length > 0) return [value]
  return []
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  operador_comercial: "Operador comercial",
  operador_calculo: "Operador de calculo",
  operador: "Operador",
  analista: "Analista",
  gestor: "Gestor",
  gestor_certidoes: "Gestor de certidoes",
  gestor_oficio: "Gestor de oficio",
  juridico: "Juridico",
  financeiro: "Financeiro",
}

function formatRoleLabel(roles: string[]): string {
  if (roles.length === 0) return "Sem cargo"
  return roles
    .map((role) => ROLE_LABELS[role] || role.replace(/_/g, " "))
    .join(" / ")
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("pt-BR")
}

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return "-"
  const units = ["B", "KB", "MB", "GB"]
  let size = value
  let idx = 0
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024
    idx += 1
  }
  return `${size.toFixed(size >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) return message
  }
  return fallback
}

function looksLikeHtml(contentType: string | null, bodyText: string) {
  const contentTypeValue = String(contentType || "").toLowerCase()
  const text = bodyText.trim().toLowerCase()
  if (contentTypeValue.includes("text/html")) return true
  return text.startsWith("<!doctype html") || text.startsWith("<html")
}

function parseAiEnvelope(rawBody: string, sourceLabel: string): AiEnvelope | null {
  if (rawBody.trim().length === 0) return null
  try {
    const parsed = JSON.parse(rawBody) as unknown
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Resposta invalida do ${sourceLabel}.`)
    }
    const parsedObj = parsed as Record<string, unknown>
    return {
      ok: typeof parsedObj.ok === "boolean" ? parsedObj.ok : undefined,
      data: parsedObj.data,
      error: typeof parsedObj.error === "string" ? parsedObj.error : undefined,
    }
  } catch {
    throw new Error(`Resposta invalida do ${sourceLabel} (nao-JSON).`)
  }
}

async function requestAiViaApi(input: AiReviewRequest): Promise<AiDraft> {
  const response = await fetch("/api/comunicados/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  const contentType = response.headers.get("content-type")
  const rawBody = await response.text()

  if (looksLikeHtml(contentType, rawBody)) {
    throw new Error("Servico local OpenAI indisponivel nesta versao do app.")
  }

  const payload = parseAiEnvelope(rawBody, "servico OpenAI")

  if (!response.ok) {
    throw new Error(payload?.error || `Falha ao revisar comunicado com IA (HTTP ${response.status}).`)
  }

  if (!payload?.ok || !payload?.data) {
    throw new Error(payload?.error || "Falha ao revisar comunicado com IA.")
  }

  return normalizeAiDraft(payload.data, input.title, input.message)
}

async function requestAiViaSupabaseHttp(
  supabase: ReturnType<typeof createBrowserClient>,
  input: AiReviewRequest
): Promise<AiDraft> {
  if (!supabase) throw new Error("Cliente Supabase indisponivel.")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Configuracao do Supabase ausente para revisar comunicado com IA.")
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(sessionError.message || "Nao foi possivel validar a sessao atual.")
  }

  if (!session?.access_token) {
    throw new Error("Sessao expirada para chamar IA. Faca login novamente.")
  }

  const functionUrl = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/comunicados-ai`
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  })

  const contentType = response.headers.get("content-type")
  const rawBody = await response.text()

  if (looksLikeHtml(contentType, rawBody)) {
    throw new Error("Resposta invalida da funcao remota OpenAI (HTML).")
  }

  const payload = parseAiEnvelope(rawBody, "funcao remota OpenAI")

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Funcao remota comunicados-ai nao encontrada (HTTP 404).")
    }
    throw new Error(payload?.error || `Falha ao consultar OpenAI via Supabase (HTTP ${response.status}).`)
  }

  if (!payload?.ok || !payload?.data) {
    throw new Error(payload?.error || "Resposta invalida da funcao remota OpenAI.")
  }

  return normalizeAiDraft(payload.data, input.title, input.message)
}

async function requestAiViaSupabaseFunction(
  supabase: ReturnType<typeof createBrowserClient>,
  input: AiReviewRequest
): Promise<AiDraft> {
  if (!supabase) throw new Error("Cliente Supabase indisponivel.")

  try {
    const { data, error } = await supabase.functions.invoke("comunicados-ai", {
      body: input,
    })

    if (error) {
      throw error
    }

    if (!data?.ok || !data?.data) {
      throw new Error(data?.error || "Resposta invalida da funcao remota OpenAI.")
    }

    return normalizeAiDraft(data.data, input.title, input.message)
  } catch (invokeError: unknown) {
    try {
      return await requestAiViaSupabaseHttp(supabase, input)
    } catch (httpError: unknown) {
      const httpMessage = getErrorMessage(httpError, "Falha ao consultar OpenAI via Supabase.")
      const invokeMessage = getErrorMessage(invokeError, "")
      if (!invokeMessage || invokeMessage === httpMessage) {
        throw new Error(httpMessage)
      }
      throw new Error(`${httpMessage} Detalhe adicional: ${invokeMessage}`)
    }
  }
}

function readOptionalString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key]
  if (typeof value === "string") return value
  return null
}

function normalizeIndividualAlertRow(input: unknown): IndividualAlertRow | null {
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

function normalizeComunicadoRow(input: unknown): ComunicadoRow | undefined {
  const raw = Array.isArray(input) ? input[0] : input
  if (!raw || typeof raw !== "object") return undefined
  const obj = raw as Record<string, unknown>

  const id = readOptionalString(obj, "id")
  const titulo = readOptionalString(obj, "titulo")
  const mensagemOriginal = readOptionalString(obj, "mensagem_original")
  const mensagemPublicada = readOptionalString(obj, "mensagem_publicada")
  const criadoPor = readOptionalString(obj, "criado_por")
  const escopoRaw = readOptionalString(obj, "escopo")
  const escopo: ComunicadoScope = escopoRaw === "equipe" ? "equipe" : "operadores"

  if (!id || !titulo || !mensagemOriginal || !mensagemPublicada || !criadoPor) {
    return undefined
  }

  return {
    id,
    titulo,
    mensagem_original: mensagemOriginal,
    mensagem_publicada: mensagemPublicada,
    estilo_ia: readOptionalString(obj, "estilo_ia"),
    escopo,
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

function normalizeUserComunicadoRow(input: unknown): UserComunicadoRow | null {
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
    comunicado: normalizeComunicadoRow(obj.comunicado),
  }
}

export default function ComunicadosPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const highlightedId = searchParams.get("id")

  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const [titulo, setTitulo] = useState("")
  const [mensagemOriginal, setMensagemOriginal] = useState("")
  const [mensagemPublicada, setMensagemPublicada] = useState("")
  const [tomIA, setTomIA] = useState("neutro")
  const [escopo, setEscopo] = useState<ComunicadoTargetScope>("operadores")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null)
  const [recipientOptions, setRecipientOptions] = useState<RecipientOption[]>([])
  const [selectedIndividualRecipientId, setSelectedIndividualRecipientId] = useState("")
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  const [myComunicados, setMyComunicados] = useState<UserComunicadoRow[]>([])
  const [myIndividualAlerts, setMyIndividualAlerts] = useState<IndividualAlertRow[]>([])
  const [adminComunicados, setAdminComunicados] = useState<AdminComunicadoRow[]>([])
  const [expandedAdminRows, setExpandedAdminRows] = useState<Record<string, boolean>>({})
  const [deletingComunicadoId, setDeletingComunicadoId] = useState<string | null>(null)

  const roles = useMemo(() => normalizeRoles(profile?.role), [profile?.role])
  const isAdmin = roles.includes("admin")
  const userId = profile?.id

  const unreadCount = useMemo(
    () =>
      myComunicados.filter((item) => !item.visualizado_em && !item.dispensado_em).length +
      myIndividualAlerts.filter((item) => !item.read_at).length,
    [myComunicados, myIndividualAlerts]
  )

  const loadRecipientOptions = useCallback(async () => {
    if (!supabase || !isAdmin) {
      setRecipientOptions([])
      setSelectedIndividualRecipientId("")
      return
    }

    setLoadingRecipients(true)
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, role, ativo")
        .or("ativo.is.null,ativo.eq.true")
        .order("nome", { ascending: true })

      if (error) throw error

      const options = (Array.isArray(data) ? data : [])
        .map((row) => {
          const id = typeof row.id === "string" ? row.id : ""
          if (!id) return null

          const nomeRaw = typeof row.nome === "string" ? row.nome.trim() : ""
          const emailRaw = typeof row.email === "string" ? row.email.trim() : ""
          const nome = nomeRaw || emailRaw || `Usuario ${id.slice(0, 8)}`
          const roleLabel = formatRoleLabel(normalizeRoles(row.role))
          const emailSuffix = emailRaw ? ` (${emailRaw})` : ""

          return {
            id,
            nome,
            email: emailRaw,
            roleLabel,
            label: `${nome} - ${roleLabel}${emailSuffix}`,
          } satisfies RecipientOption
        })
        .filter((item): item is RecipientOption => Boolean(item))

      setRecipientOptions(options)
      setSelectedIndividualRecipientId((prev) => {
        if (prev && options.some((item) => item.id === prev)) return prev
        return options[0]?.id || ""
      })
    } catch (error: unknown) {
      console.error("Erro ao carregar usuarios para envio individual:", error)
      toast.error("Nao foi possivel carregar usuarios para envio individual.", {
        description: getErrorMessage(error, "Tente novamente em instantes."),
      })
      setRecipientOptions([])
      setSelectedIndividualRecipientId("")
    } finally {
      setLoadingRecipients(false)
    }
  }, [isAdmin, supabase])

  const loadData = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const userPromise = supabase
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
        .order("enviado_em", { ascending: false })

      const adminPromise = isAdmin
        ? supabase
            .from("comunicados")
            .select(
              `
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
              updated_at,
              comunicado_destinatarios (
                id,
                comunicado_id,
                usuario_id,
                enviado_em,
                visualizado_em,
                dispensado_em,
                baixou_anexo_em,
                usuarios (
                  nome,
                  email
                )
              )
            `
            )
            .order("publicado_em", { ascending: false })
        : Promise.resolve({ data: [] as AdminComunicadoRow[], error: null })

      const alertsPromise = supabase
        .from("notifications")
        .select("id, title, body, link_url, entity_type, entity_id, event_type, created_at, read_at")
        .eq("user_id", userId)
        .in("event_type", ["interesse_calculo_admin", "admin_alerta_individual_precatorio"])
        .order("created_at", { ascending: false })

      const [
        { data: userRows, error: userError },
        { data: adminRows, error: adminError },
        { data: alertRows, error: alertsError },
      ] = await Promise.all([userPromise, adminPromise, alertsPromise])

      if (userError) throw userError
      if (adminError) throw adminError
      if (alertsError) throw alertsError

      const filteredUserRows = (Array.isArray(userRows) ? userRows : [])
        .map(normalizeUserComunicadoRow)
        .filter((item): item is UserComunicadoRow => Boolean(item))
        .filter((item) => item.comunicado?.ativo !== false)

      const normalizedAlertRows = (Array.isArray(alertRows) ? alertRows : [])
        .map(normalizeIndividualAlertRow)
        .filter((item): item is IndividualAlertRow => Boolean(item))

      setMyComunicados(filteredUserRows)
      setMyIndividualAlerts(normalizedAlertRows)
      setAdminComunicados((adminRows || []) as AdminComunicadoRow[])
    } catch (error: unknown) {
      console.error("Erro ao carregar comunicados:", error)
      toast.error("Erro ao carregar comunicados.", {
        description: getErrorMessage(error, "Tente novamente em instantes."),
      })
    } finally {
      setLoading(false)
    }
  }, [isAdmin, supabase, userId])

  const markRead = useCallback(
    async (comunicadoId: string) => {
      if (!supabase) return
      const { error } = await supabase.rpc("comunicado_registrar_evento", {
        p_comunicado_id: comunicadoId,
        p_evento: "visualizado",
      })
      if (error) {
        toast.error("Não foi possível confirmar leitura.")
        return
      }
      setMyComunicados((prev) =>
        prev.map((item) =>
          item.comunicado_id === comunicadoId
            ? { ...item, visualizado_em: item.visualizado_em || new Date().toISOString() }
            : item
        )
      )
      void loadData()
    },
    [loadData, supabase]
  )

  const dismissComunicado = useCallback(
    async (comunicadoId: string) => {
      if (!supabase) return
      const { error } = await supabase.rpc("comunicado_registrar_evento", {
        p_comunicado_id: comunicadoId,
        p_evento: "dispensado",
      })
      if (error) {
        toast.error("Não foi possível dispensar este comunicado.")
        return
      }
      setMyComunicados((prev) =>
        prev.map((item) =>
          item.comunicado_id === comunicadoId
            ? { ...item, dispensado_em: item.dispensado_em || new Date().toISOString() }
            : item
        )
      )
      void loadData()
    },
    [loadData, supabase]
  )

  const markIndividualAlertRead = useCallback(
    async (alertId: string) => {
      if (!supabase) return

      const nowIso = new Date().toISOString()
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: nowIso })
        .eq("id", alertId)

      if (error) {
        toast.error("Nao foi possivel confirmar leitura do alerta individual.")
        return
      }

      setMyIndividualAlerts((prev) =>
        prev.map((item) => (item.id === alertId ? { ...item, read_at: item.read_at || nowIso } : item))
      )
    },
    [supabase]
  )

  const openIndividualAlertTarget = useCallback(
    (alert: IndividualAlertRow) => {
      if (alert.link_url) {
        router.push(alert.link_url)
        return
      }

      if (alert.entity_type === "precatorio" && alert.entity_id) {
        router.push(`/precatorios/detalhes?id=${alert.entity_id}`)
      }
    },
    [router]
  )

  const downloadAttachment = useCallback(
    async (row: UserComunicadoRow) => {
      if (!row.comunicado?.anexo_url || !supabase) return
      const { error } = await supabase.rpc("comunicado_registrar_evento", {
        p_comunicado_id: row.comunicado_id,
        p_evento: "download",
      })
      if (error) {
        toast.error("Não foi possível registrar download do anexo.")
      }
      window.open(row.comunicado.anexo_url, "_blank", "noopener,noreferrer")
      void loadData()
    },
    [loadData, supabase]
  )

  const handleReviewWithAI = useCallback(async () => {
    if (!mensagemOriginal.trim()) {
      toast.error("Escreva a mensagem antes de usar a IA.")
      return
    }

    setAiLoading(true)
    try {
      const requestBody: AiReviewRequest = {
        title: titulo,
        message: mensagemOriginal,
        tone: tomIA,
      }

      let aiData: AiDraft | null = null
      let edgeFunctionError: unknown = null

      try {
        aiData = await requestAiViaSupabaseFunction(supabase, requestBody)
      } catch (error: unknown) {
        edgeFunctionError = error
      }

      if (!aiData) {
        try {
          aiData = await requestAiViaApi(requestBody)
        } catch (apiError: unknown) {
          const edgeMessage = edgeFunctionError
            ? getErrorMessage(edgeFunctionError, "Falha na funcao remota OpenAI.")
            : ""
          const apiMessage = getErrorMessage(apiError, "Falha na API local OpenAI.")
          const composed = edgeMessage
            ? `${apiMessage} Detalhe adicional: ${edgeMessage}`
            : apiMessage
          throw new Error(composed)
        }
      }

      if (!aiData) {
        throw new Error("Nao foi possivel gerar sugestao da IA.")
      }

      setAiDraft(aiData)
      toast.success("Sugestao da IA gerada com sucesso.")
    } catch (error: unknown) {
      toast.error("Erro ao revisar mensagem com IA.", {
        description: getErrorMessage(error, "Verifique a configuracao da OpenAI."),
      })
    } finally {
      setAiLoading(false)
    }
  }, [mensagemOriginal, supabase, titulo, tomIA])

  const uploadAttachment = useCallback(async (): Promise<{
    url: string
    name: string
    mime: string
    size: number
  } | null> => {
    if (!selectedFile || !supabase || !userId) return null

    const safeName = sanitizeFileName(selectedFile.name)
    const path = `${userId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("comunicados")
      .upload(path, selectedFile, {
        upsert: false,
        contentType: selectedFile.type || undefined,
      })

    if (uploadError) {
      throw new Error(uploadError.message || "Falha no upload do anexo.")
    }

    const { data: publicUrlData } = supabase.storage.from("comunicados").getPublicUrl(path)
    if (!publicUrlData?.publicUrl) {
      throw new Error("Não foi possível gerar URL pública do anexo.")
    }

    return {
      url: publicUrlData.publicUrl,
      name: selectedFile.name,
      mime: selectedFile.type || "application/octet-stream",
      size: selectedFile.size || 0,
    }
  }, [selectedFile, supabase, userId])

  const handlePublish = useCallback(async () => {
    if (!supabase) return
    if (!isAdmin) {
      toast.error("Apenas admin pode publicar comunicados.")
      return
    }

    if (escopo === "individual" && !selectedIndividualRecipientId) {
      toast.error("Selecione o usuario para envio individual.")
      return
    }

    const title = titulo.trim()
    const original = mensagemOriginal.trim()
    const published = (mensagemPublicada.trim() || mensagemOriginal.trim()).trim()

    if (!title) {
      toast.error("Título é obrigatório.")
      return
    }
    if (!original) {
      toast.error("Mensagem original é obrigatória.")
      return
    }
    if (!published) {
      toast.error("Mensagem publicada não pode ficar vazia.")
      return
    }

    setPublishing(true)
    try {
      const publishScope: ComunicadoScope = escopo === "individual" ? "equipe" : escopo
      let attachment: Awaited<ReturnType<typeof uploadAttachment>> = null
      if (selectedFile) {
        attachment = await uploadAttachment()
      }

      const { data, error } = await supabase.rpc("publish_comunicado", {
        p_titulo: title,
        p_mensagem_original: original,
        p_mensagem_publicada: published,
        p_estilo_ia: aiDraft ? tomIA : null,
        p_escopo: publishScope,
        p_anexo_url: attachment?.url || null,
        p_anexo_nome: attachment?.name || null,
        p_anexo_mime: attachment?.mime || null,
        p_anexo_tamanho: attachment?.size || null,
      })

      if (error) throw error

      if (escopo === "individual") {
        const comunicadoId = typeof data === "string" ? data : ""
        if (!comunicadoId) {
          throw new Error("Nao foi possivel identificar o comunicado publicado para envio individual.")
        }

        const { error: trimRecipientsError } = await supabase
          .from("comunicado_destinatarios")
          .delete()
          .eq("comunicado_id", comunicadoId)
          .neq("usuario_id", selectedIndividualRecipientId)

        if (trimRecipientsError) throw trimRecipientsError
      }

      const selectedRecipient =
        escopo === "individual"
          ? recipientOptions.find((item) => item.id === selectedIndividualRecipientId) || null
          : null

      if (selectedRecipient) {
        toast.success(`Comunicado enviado para ${selectedRecipient.nome} (${selectedRecipient.roleLabel}).`)
      } else {
        toast.success("Comunicado publicado com sucesso.")
      }

      setTitulo("")
      setMensagemOriginal("")
      setMensagemPublicada("")
      setTomIA("neutro")
      setEscopo("operadores")
      setSelectedFile(null)
      setAiDraft(null)

      if (typeof data === "string" && data.length > 0) {
        setExpandedAdminRows((prev) => ({ ...prev, [data]: true }))
      }

      void loadData()
    } catch (error: unknown) {
      toast.error("Erro ao publicar comunicado.", {
        description: getErrorMessage(error, "Confira os dados e tente novamente."),
      })
    } finally {
      setPublishing(false)
    }
  }, [
    aiDraft,
    escopo,
    isAdmin,
    loadData,
    mensagemOriginal,
    mensagemPublicada,
    recipientOptions,
    selectedIndividualRecipientId,
    selectedFile,
    supabase,
    titulo,
    tomIA,
    uploadAttachment,
  ])

  const handleDeleteComunicado = useCallback(
    async (comunicado: AdminComunicadoRow) => {
      if (!supabase || !isAdmin) return

      const confirmed = window.confirm(
        `Tem certeza que deseja excluir o comunicado "${comunicado.titulo}"? Essa ação não pode ser desfeita.`
      )
      if (!confirmed) return

      setDeletingComunicadoId(comunicado.id)
      try {
        const { error } = await supabase
          .from("comunicados")
          .delete()
          .eq("id", comunicado.id)

        if (error) throw error

        toast.success("Comunicado excluído com sucesso.")
        setAdminComunicados((prev) => prev.filter((item) => item.id !== comunicado.id))
        setExpandedAdminRows((prev) => {
          const next = { ...prev }
          delete next[comunicado.id]
          return next
        })
        setMyComunicados((prev) => prev.filter((item) => item.comunicado_id !== comunicado.id))
      } catch (error: unknown) {
        toast.error("Erro ao excluir comunicado.", {
          description: getErrorMessage(error, "Tente novamente em instantes."),
        })
      } finally {
        setDeletingComunicadoId(null)
      }
    },
    [isAdmin, supabase]
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    void loadRecipientOptions()
  }, [loadRecipientOptions])

  const highlightedCardClass = (id?: string) =>
    id && highlightedId && id === highlightedId
      ? "border-primary ring-1 ring-primary/40"
      : ""

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comunicados</h1>
          <p className="text-muted-foreground">
            Canal oficial para avisos e atualizações da administração.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={unreadCount > 0 ? "default" : "secondary"}>
            {unreadCount} pendente(s)
          </Badge>
          <Badge variant="outline">{myComunicados.length + myIndividualAlerts.length} recebido(s)</Badge>
        </div>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Novo comunicado para a equipe
            </CardTitle>
            <CardDescription>
              Crie o comunicado, refine com IA e publique para operadores, equipe inteira ou individual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Nova versão do sistema disponível"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Escopo</Label>
                  <Select
                    value={escopo}
                    onValueChange={(value) => setEscopo(value as ComunicadoTargetScope)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o público" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operadores">Somente operadores</SelectItem>
                      <SelectItem value="equipe">Equipe inteira</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tom da IA</Label>
                  <Select value={tomIA} onValueChange={setTomIA}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tom de escrita" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutro">Neutro</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="direto">Direto</SelectItem>
                      <SelectItem value="inspirador">Inspirador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {escopo === "individual" && (
              <div className="space-y-2">
                <Label>Destinatario individual (nome e cargo)</Label>
                <Select
                  value={selectedIndividualRecipientId || "__none__"}
                  onValueChange={(value) =>
                    setSelectedIndividualRecipientId(value === "__none__" ? "" : value)
                  }
                  disabled={loadingRecipients || recipientOptions.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingRecipients ? "Carregando usuarios..." : "Selecione o usuario"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {recipientOptions.length === 0 ? (
                      <SelectItem value="__none__">Nenhum usuario ativo encontrado</SelectItem>
                    ) : (
                      recipientOptions.map((recipient) => (
                        <SelectItem key={recipient.id} value={recipient.id}>
                          {recipient.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mensagem-original">Mensagem original</Label>
              <Textarea
                id="mensagem-original"
                rows={7}
                value={mensagemOriginal}
                onChange={(e) => {
                  setMensagemOriginal(e.target.value)
                  if (!mensagemPublicada.trim()) {
                    setMensagemPublicada(e.target.value)
                  }
                }}
                placeholder="Escreva aqui o comunicado que será enviado à equipe..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensagem-publicada">Mensagem final (publicada)</Label>
              <Textarea
                id="mensagem-publicada"
                rows={7}
                value={mensagemPublicada}
                onChange={(e) => setMensagemPublicada(e.target.value)}
                placeholder="Versão final que será exibida para todos."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anexo-comunicado">Anexo opcional</Label>
              <Input
                id="anexo-comunicado"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  {selectedFile.name} ({formatBytes(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void handleReviewWithAI()}
                disabled={aiLoading || publishing}
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Revisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Revisar com IA
                  </>
                )}
              </Button>

              <Button
                onClick={() => void handlePublish()}
                disabled={
                  publishing ||
                  aiLoading ||
                  (escopo === "individual" && !selectedIndividualRecipientId)
                }
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publicar comunicado
                  </>
                )}
              </Button>
            </div>

            {aiDraft && (
              <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Sugestão da IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Título sugerido</p>
                    <p className="text-sm">{aiDraft.titulo_sugerido}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Mensagem revisada</p>
                    <p className="text-sm whitespace-pre-line">{aiDraft.mensagem_revisada}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setTitulo((prev) => prev || aiDraft.titulo_sugerido)
                        setMensagemPublicada(aiDraft.mensagem_revisada)
                      }}
                    >
                      Usar texto revisado
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMensagemPublicada(aiDraft.versao_curta)}
                    >
                      Usar versão curta
                    </Button>
                  </div>
                  {aiDraft.observacoes?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Observações</p>
                      {aiDraft.observacoes.map((obs, idx) => (
                        <p key={`${obs}-${idx}`} className="text-xs text-muted-foreground">
                          • {obs}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meus comunicados</CardTitle>
          <CardDescription>
            Leia os avisos da administração, incluindo comunicados gerais e envios individuais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && myComunicados.length === 0 && myIndividualAlerts.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum comunicado recebido até o momento.</p>
          )}

          {myComunicados.map((row) => {
            const comunicado = row.comunicado
            if (!comunicado) return null

            const isUnread = !row.visualizado_em && !row.dispensado_em
            const hasAttachment = Boolean(comunicado.anexo_url)

            return (
              <Card key={row.id} className={highlightedCardClass(comunicado.id)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{comunicado.titulo}</h3>
                      <p className="text-xs text-muted-foreground">
                        Publicado em {formatDateTime(comunicado.publicado_em)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isUnread ? (
                        <Badge>Não lido</Badge>
                      ) : (
                        <Badge variant="secondary">Lido</Badge>
                      )}
                      {row.dispensado_em && <Badge variant="outline">Dispensado</Badge>}
                    </div>
                  </div>

                  <p className="text-sm whitespace-pre-line">{comunicado.mensagem_publicada}</p>

                  <div className="flex flex-wrap gap-2">
                    {isUnread && (
                      <Button size="sm" onClick={() => void markRead(row.comunicado_id)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Confirmar leitura
                      </Button>
                    )}

                    {hasAttachment && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void downloadAttachment(row)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar anexo
                      </Button>
                    )}

                    {isUnread && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void dismissComunicado(row.comunicado_id)}
                      >
                        Agora não
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {myIndividualAlerts.map((alert) => {
            const isUnread = !alert.read_at
            const canOpenTarget = Boolean(
              alert.link_url || (alert.entity_type === "precatorio" && alert.entity_id)
            )

            return (
              <Card key={alert.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{alert.title}</h3>
                        <Badge variant="outline">Alerta individual</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recebido em {formatDateTime(alert.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isUnread ? <Badge>Não lido</Badge> : <Badge variant="secondary">Lido</Badge>}
                    </div>
                  </div>

                  <p className="text-sm whitespace-pre-line">{alert.body}</p>

                  <div className="flex flex-wrap gap-2">
                    {isUnread && (
                      <Button size="sm" onClick={() => void markIndividualAlertRead(alert.id)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Confirmar leitura
                      </Button>
                    )}

                    {canOpenTarget && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openIndividualAlertTarget(alert)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir referência
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Painel de leitura</CardTitle>
            <CardDescription>
              Acompanhe quem visualizou cada comunicado publicado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!loading && adminComunicados.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum comunicado publicado ainda.</p>
            )}

            {adminComunicados.map((comunicado) => {
              const destinatarios = comunicado.comunicado_destinatarios || []
              const total = destinatarios.length
              const visualizados = destinatarios.filter((item) => item.visualizado_em).length
              const pendentes = total - visualizados
              const percentual = total > 0 ? Math.round((visualizados / total) * 100) : 0
              const expanded = Boolean(expandedAdminRows[comunicado.id])

              return (
                <Card key={comunicado.id} className={highlightedCardClass(comunicado.id)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{comunicado.titulo}</h3>
                        <p className="text-xs text-muted-foreground">
                          Publicado em {formatDateTime(comunicado.publicado_em)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedAdminRows((prev) => ({
                              ...prev,
                              [comunicado.id]: !prev[comunicado.id],
                            }))
                          }
                        >
                          {expanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Ocultar detalhes
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              Ver detalhes
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDeleteComunicado(comunicado)}
                          disabled={deletingComunicadoId === comunicado.id}
                        >
                          {deletingComunicadoId === comunicado.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Excluindo...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Excluir
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{total} destinatário(s)</Badge>
                      <Badge variant="secondary">{visualizados} visualizado(s)</Badge>
                      <Badge>{pendentes} pendente(s)</Badge>
                      <Badge variant="outline">{percentual}% lido</Badge>
                    </div>

                    <div className="h-2 w-full rounded bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>

                    {comunicado.anexo_url && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        Anexo: {comunicado.anexo_nome || "arquivo"} ({formatBytes(comunicado.anexo_tamanho || 0)})
                      </div>
                    )}

                    {expanded && (
                      <>
                        <Separator />
                        <div className="max-h-72 overflow-auto rounded border">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-muted/70">
                              <tr className="border-b">
                                <th className="text-left px-3 py-2">Usuário</th>
                                <th className="text-left px-3 py-2">Status</th>
                                <th className="text-left px-3 py-2">Visualizado em</th>
                                <th className="text-left px-3 py-2">Download anexo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {destinatarios.map((dest) => (
                                <tr key={dest.id} className="border-b last:border-none">
                                  <td className="px-3 py-2">
                                    <p className="font-medium">{dest.usuarios?.nome || "Usuário"}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {dest.usuarios?.email || "-"}
                                    </p>
                                  </td>
                                  <td className="px-3 py-2">
                                    {dest.visualizado_em ? (
                                      <Badge variant="secondary">Visualizado</Badge>
                                    ) : dest.dispensado_em ? (
                                      <Badge variant="outline">Dispensado</Badge>
                                    ) : (
                                      <Badge>Pendente</Badge>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">{formatDateTime(dest.visualizado_em)}</td>
                                  <td className="px-3 py-2">{formatDateTime(dest.baixou_anexo_em)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
