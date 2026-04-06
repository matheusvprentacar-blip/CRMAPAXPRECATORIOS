"use client"

import CountUp from "react-countup"
import { type CSSProperties, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileText,
  CheckCircle2,
  Loader2,
  Megaphone,
  Layers,
  Mail,
  Paperclip,
  Plus,
  Send,
  Search,
  RefreshCw,
  Sparkles,
  Trash2,
  Users2,
  Clock3,
  X,
} from "@/components/icons"
import { toast } from "sonner"
import type {
  AdminComunicadoRow,
  ComunicadoDestinatarioRow,
  ComunicadoScope,
  ComunicadoRow,
} from "@/lib/types/comunicados"
import { COMUNICADOS_ALERT_EVENT_TYPES } from "@/lib/types/comunicados"

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

type InboxFilter = "all" | "unread" | "attachments" | "alerts"
type MetricTone = "slate" | "blue" | "amber" | "emerald"

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ")

const shellCardClass =
  "rounded-[24px] border border-black/[0.07] bg-white shadow-[16px_16px_36px_rgba(0,0,0,.08),-8px_-8px_20px_rgba(255,255,255,.94),inset_1px_1px_4px_rgba(255,255,255,.9),inset_-1px_-1px_2px_rgba(0,0,0,.04)]"

const innerShellClass =
  "rounded-[20px] border border-black/[0.06] bg-white shadow-[8px_8px_20px_rgba(0,0,0,.06),-4px_-4px_12px_rgba(255,255,255,.92),inset_1px_1px_3px_rgba(255,255,255,.88),inset_-1px_-1px_2px_rgba(0,0,0,.03)]"

const labelChipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-[#0e4d6a]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0e4d6a]"

const metricToneClass: Record<MetricTone, string> = {
  slate: "border-black/[0.07] bg-[#f2f3f7] text-[#0b0c10]",
  blue: "border-[#0e4d6a]/20 bg-[#e0effe] text-[#0e4d6a]",
  amber: "border-amber-200 bg-amber-50 text-[#92400e]",
  emerald: "border-emerald-200 bg-[#f0fdf4] text-[#15803d]",
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function matchesQuery(valueParts: Array<string | null | undefined>, query: string) {
  if (!query) return true
  const normalized = normalizeSearchText(valueParts.filter(Boolean).join(" "))
  return normalized.includes(query)
}

function getScopeLabel(scope: ComunicadoTargetScope, recipientName?: string | null) {
  if (scope === "individual") return recipientName ? `Individual · ${recipientName}` : "Individual"
  if (scope === "equipe") return "Equipe inteira"
  return "Somente operadores"
}

function getToneLabel(tone: string) {
  switch (tone) {
    case "formal":
      return "Formal"
    case "direto":
      return "Direto"
    case "inspirador":
      return "Inspirador"
    default:
      return "Neutro"
  }
}

function MetricTile({
  tone = "slate",
  label,
  value,
  hint,
  icon,
  loading,
}: {
  tone?: MetricTone
  label: string
  value: number
  hint: string
  icon: React.ReactNode
  loading?: boolean
}) {
  return (
    <div className={cx("rounded-[18px] border p-3.5 shadow-[8px_8px_18px_rgba(0,0,0,.06),-4px_-4px_10px_rgba(255,255,255,.92),inset_1px_1px_2px_rgba(255,255,255,.9),inset_-1px_-1px_2px_rgba(0,0,0,.02)]", metricToneClass[tone])}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] opacity-60">{label}</div>
          <div className="mt-1.5 text-[clamp(1.3rem,2vw,1.9rem)] font-black leading-none tracking-[-0.05em] tabular-nums">
            {loading ? (
              <span className="block h-7 w-16 animate-pulse rounded-xl bg-black/10" />
            ) : (
              <CountUp end={Number.isFinite(value) ? value : 0} duration={0.85} separator="." />
            )}
          </div>
          <div className="mt-1 text-[10px] font-medium opacity-60">{hint}</div>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white/70 shadow-[inset_2px_2px_5px_rgba(0,0,0,.07),inset_-2px_-2px_5px_rgba(255,255,255,.8)] text-[#0e4d6a]">
          {icon}
        </div>
      </div>
    </div>
  )
}

function ChecklistItem({
  done,
  label,
  hint,
}: {
  done: boolean
  label: string
  hint: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-[16px] border border-black/[0.07] bg-[#f2f3f7] p-3 shadow-[inset_3px_3px_7px_rgba(0,0,0,.05),inset_-2px_-2px_5px_rgba(255,255,255,.85)]">
      <div
        className={cx(
          "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full",
          done ? "bg-[#f0fdf4] text-[#15803d]" : "bg-[#f2f3f7] text-[#9ca3af]"
        )}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-[#0b0c10]">{label}</div>
        <div className="text-[11px] leading-5 text-[#6b7280]">{hint}</div>
      </div>
    </div>
  )
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
  tecnico_ti: "Tecnico de T.I",
  operador_comercial: "Operador comercial",
  operador_calculo: "Operador de calculo",
  operador: "Operador",
  analista: "Analista",
  gestor: "Gestor",
  gestor_certidoes: "Gestor de certidoes",
  gestor_oficio: "Gestor de oficio",
  gestor_escrituras: "Gestor de escrituras",
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

function getIndividualAlertLabel(eventType?: string | null) {
  if (eventType === "agenda_alerta") return "Alerta da agenda"
  return "Alerta individual"
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
    if (/auth session missing/i.test(sessionError.message || "")) {
      throw new Error("Sessao expirada para chamar IA. Faca login novamente.")
    }
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

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [recipientOptions, setRecipientOptions] = useState<RecipientOption[]>([])
  const [selectedIndividualRecipientId, setSelectedIndividualRecipientId] = useState("")
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  const [myComunicados, setMyComunicados] = useState<UserComunicadoRow[]>([])
  const [myIndividualAlerts, setMyIndividualAlerts] = useState<IndividualAlertRow[]>([])
  const [adminComunicados, setAdminComunicados] = useState<AdminComunicadoRow[]>([])
  const [expandedAdminRows, setExpandedAdminRows] = useState<Record<string, boolean>>({})
  const [deletingComunicadoId, setDeletingComunicadoId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"inbox" | "compose" | "archive">("inbox")
  const [query, setQuery] = useState("")
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all")

  const roles = useMemo(() => normalizeRoles(profile?.role), [profile?.role])
  const isAdmin = roles.includes("admin")
  const userId = profile?.id
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = useMemo(() => normalizeSearchText(deferredQuery.trim()), [deferredQuery])

  const unreadCount = useMemo(
    () =>
      myComunicados.filter((item) => !item.visualizado_em && !item.dispensado_em).length +
      myIndividualAlerts.filter((item) => !item.read_at).length,
    [myComunicados, myIndividualAlerts]
  )

  const receivedCount = myComunicados.length + myIndividualAlerts.length
  const readCount = Math.max(receivedCount - unreadCount, 0)
  const teamUnreadCount = myComunicados.filter((item) => !item.visualizado_em && !item.dispensado_em).length
  const alertUnreadCount = myIndividualAlerts.filter((item) => !item.read_at).length
  const attachmentCount = myComunicados.filter((item) => Boolean(item.comunicado?.anexo_url)).length
  const publishedCount = adminComunicados.length
  const publishedAttachmentCount = adminComunicados.filter((item) => Boolean(item.anexo_url)).length
  const latestPublishedLabel = adminComunicados[0]?.publicado_em ? formatDateTime(adminComunicados[0].publicado_em) : "Sem publicações"
  const selectedRecipient = useMemo(
    () => recipientOptions.find((item) => item.id === selectedIndividualRecipientId) || null,
    [recipientOptions, selectedIndividualRecipientId]
  )
  const finalPublishedMessage = mensagemPublicada.trim() || mensagemOriginal.trim()
  const canPublish =
    isAdmin &&
    Boolean(titulo.trim()) &&
    Boolean(mensagemOriginal.trim()) &&
    Boolean(finalPublishedMessage) &&
    (escopo !== "individual" || Boolean(selectedIndividualRecipientId))

  useEffect(() => {
    if (!isAdmin && activeTab !== "inbox") {
      setActiveTab("inbox")
    }
  }, [activeTab, isAdmin])

  const filteredMyComunicados = useMemo(() => {
    return myComunicados
      .filter((item) => {
        const comunicado = item.comunicado
        if (!comunicado) return false

        const isUnread = !item.visualizado_em && !item.dispensado_em
        if (inboxFilter === "unread" && !isUnread) return false
        if (inboxFilter === "attachments" && !comunicado.anexo_url) return false
        if (inboxFilter === "alerts") return false

        return matchesQuery(
          [
            comunicado.titulo,
            comunicado.mensagem_publicada,
            comunicado.mensagem_original,
            comunicado.anexo_nome,
            comunicado.escopo,
            item.enviado_em,
          ],
          normalizedQuery
        )
      })
      .sort((a, b) => {
        const aUnread = !a.visualizado_em && !a.dispensado_em
        const bUnread = !b.visualizado_em && !b.dispensado_em
        if (aUnread !== bUnread) return Number(bUnread) - Number(aUnread)
        return new Date(b.enviado_em).getTime() - new Date(a.enviado_em).getTime()
      })
  }, [inboxFilter, myComunicados, normalizedQuery])

  const filteredMyIndividualAlerts = useMemo(() => {
    return myIndividualAlerts
      .filter((item) => {
        const isUnread = !item.read_at
        if (inboxFilter === "unread" && !isUnread) return false
        if (inboxFilter === "attachments") return false

        return matchesQuery([item.title, item.body, item.event_type, item.entity_type, item.created_at], normalizedQuery)
      })
      .sort((a, b) => {
        const aUnread = !a.read_at
        const bUnread = !b.read_at
        if (aUnread !== bUnread) return Number(bUnread) - Number(aUnread)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [inboxFilter, myIndividualAlerts, normalizedQuery])

  const filteredAdminComunicados = useMemo(() => {
    return adminComunicados.filter((item) =>
      matchesQuery(
        [
          item.titulo,
          item.mensagem_publicada,
          item.mensagem_original,
          item.anexo_nome,
          item.escopo,
          item.publicado_em,
        ],
        normalizedQuery
      )
    )
  }, [adminComunicados, normalizedQuery])

  const composeChecklist = useMemo(
    () => [
      {
        done: Boolean(titulo.trim()),
        label: "Título definido",
        hint: "O assunto aparece no topo da publicação.",
      },
      {
        done: Boolean(mensagemOriginal.trim()),
        label: "Mensagem base pronta",
        hint: "Use a IA ou escreva diretamente o texto que será revisado.",
      },
      {
        done: Boolean(finalPublishedMessage),
        label: "Versão final pronta",
        hint: "O conteúdo publicado é o que o time vai receber.",
      },
      {
        done: escopo !== "individual" || Boolean(selectedIndividualRecipientId),
        label: "Público selecionado",
        hint: escopo === "individual" ? "Escolha o destinatário para envio exclusivo." : "O comunicado vai para o escopo escolhido.",
      },
      {
        done: Boolean(selectedFile),
        label: "Anexo opcional",
        hint: "Arquivos podem ser adicionados sem travar a publicação.",
      },
    ],
    [escopo, finalPublishedMessage, mensagemOriginal, selectedFile, selectedIndividualRecipientId, titulo]
  )

  const inboxFilterStats = useMemo(
    () => ({
      all: receivedCount,
      unread: unreadCount,
      attachments: attachmentCount,
      alerts: myIndividualAlerts.length,
    }),
    [attachmentCount, myIndividualAlerts.length, receivedCount, unreadCount]
  )
  const showTeamFeed = inboxFilter !== "alerts"
  const showAlertsFeed = inboxFilter !== "attachments"
  const visibleInboxCount = filteredMyComunicados.length + filteredMyIndividualAlerts.length
  const composeScopeLabel = getScopeLabel(escopo, selectedRecipient?.nome)

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
        .in("event_type", [...COMUNICADOS_ALERT_EVENT_TYPES])
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

  const renderTeamComunicadoCard = (row: UserComunicadoRow) => {
    const comunicado = row.comunicado
    if (!comunicado) return null

    const isUnread = !row.visualizado_em && !row.dispensado_em
    const hasAttachment = Boolean(comunicado.anexo_url)

    return (
      <Card key={row.id} className={cx(innerShellClass, "overflow-hidden", highlightedCardClass(comunicado.id))}>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cx(
                    "rounded-full border-[color:var(--com-border)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]",
                    isUnread ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600"
                  )}
                >
                  Equipe
                </Badge>
                {hasAttachment ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-[color:var(--com-border)] bg-slate-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-600"
                  >
                    Anexo
                  </Badge>
                ) : null}
                {row.dispensado_em ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-[color:var(--com-border)] bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--com-muted)]"
                  >
                    Dispensado
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--com-ink)]">{comunicado.titulo}</h3>
                <p className="text-xs font-medium text-[var(--com-muted)]">
                  Publicado em {formatDateTime(comunicado.publicado_em)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {isUnread ? (
                <Badge className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                  Novo
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                  Lido
                </Badge>
              )}
              {hasAttachment ? (
                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                  PDF
                </Badge>
              ) : null}
            </div>
          </div>

          <p className="whitespace-pre-line text-sm leading-6 text-[var(--com-ink)]/82">
            {comunicado.mensagem_publicada}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {isUnread ? (
              <Button size="sm" onClick={() => void markRead(row.comunicado_id)}>
                <Eye className="h-4 w-4" />
                Confirmar leitura
              </Button>
            ) : null}
            {hasAttachment ? (
              <Button size="sm" variant="outline" onClick={() => void downloadAttachment(row)}>
                <Download className="h-4 w-4" />
                Baixar anexo
              </Button>
            ) : null}
            {isUnread ? (
              <Button size="sm" variant="secondary" onClick={() => void dismissComunicado(row.comunicado_id)}>
                Agora não
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderAlertCard = (alert: IndividualAlertRow) => {
    const isUnread = !alert.read_at
    const canOpenTarget = Boolean(alert.link_url || (alert.entity_type === "precatorio" && alert.entity_id))

    return (
      <Card key={alert.id} className={innerShellClass}>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-[color:var(--com-border)] bg-sky-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--com-blue)]"
                >
                  Alerta individual
                </Badge>
                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]">
                  {getIndividualAlertLabel(alert.event_type)}
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--com-ink)]">{alert.title}</h3>
                <p className="text-xs font-medium text-[var(--com-muted)]">
                  Recebido em {formatDateTime(alert.created_at)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {isUnread ? (
                <Badge className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                  Novo
                </Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
                  Lido
                </Badge>
              )}
            </div>
          </div>

          <p className="whitespace-pre-line text-sm leading-6 text-[var(--com-ink)]/82">{alert.body}</p>

          <div className="flex flex-wrap items-center gap-2">
            {isUnread ? (
              <Button size="sm" onClick={() => void markIndividualAlertRead(alert.id)}>
                <Eye className="h-4 w-4" />
                Confirmar leitura
              </Button>
            ) : null}
            {canOpenTarget ? (
              <Button size="sm" variant="outline" onClick={() => openIndividualAlertTarget(alert)}>
                <ExternalLink className="h-4 w-4" />
                Abrir referência
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderPublishedCard = (comunicado: AdminComunicadoRow) => {
    const destinatarios = comunicado.comunicado_destinatarios || []
    const total = destinatarios.length
    const visualizados = destinatarios.filter((item) => item.visualizado_em).length
    const pendentes = total - visualizados
    const percentual = total > 0 ? Math.round((visualizados / total) * 100) : 0
    const expanded = Boolean(expandedAdminRows[comunicado.id])

    return (
      <Card key={comunicado.id} className={cx(innerShellClass, "overflow-hidden", highlightedCardClass(comunicado.id))}>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-[color:var(--com-border)] bg-slate-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-600"
                >
                  {getScopeLabel(comunicado.escopo as ComunicadoTargetScope)}
                </Badge>
                <Badge
                  variant={comunicado.ativo ? "secondary" : "outline"}
                  className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]"
                >
                  {comunicado.ativo ? "Ativo" : "Inativo"}
                </Badge>
                {comunicado.anexo_url ? (
                  <Badge
                    variant="outline"
                    className="rounded-full border-[color:var(--com-border)] bg-amber-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-700"
                  >
                    Com anexo
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--com-ink)]">{comunicado.titulo}</h3>
                <p className="text-xs font-medium text-[var(--com-muted)]">
                  Publicado em {formatDateTime(comunicado.publicado_em)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
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
                    <ChevronUp className="h-4 w-4" />
                    Ocultar detalhes
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="whitespace-pre-line text-sm leading-6 text-[var(--com-ink)]/82">
            {comunicado.mensagem_publicada}
          </p>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-[18px] border border-[color:var(--com-border)] bg-white/80 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--com-muted)]">Destinatários</div>
              <div className="mt-2 text-xl font-black tabular-nums text-[var(--com-ink)]">{total}</div>
            </div>
            <div className="rounded-[18px] border border-[color:var(--com-border)] bg-emerald-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--com-emerald)]">Visualizados</div>
              <div className="mt-2 text-xl font-black tabular-nums text-[var(--com-emerald)]">{visualizados}</div>
            </div>
            <div className="rounded-[18px] border border-[color:var(--com-border)] bg-amber-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Pendentes</div>
              <div className="mt-2 text-xl font-black tabular-nums text-amber-700">{pendentes}</div>
            </div>
            <div className="rounded-[18px] border border-[color:var(--com-border)] bg-slate-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Leitura</div>
              <div className="mt-2 text-xl font-black tabular-nums text-slate-900">{percentual}%</div>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[var(--com-blue)] transition-all" style={{ width: `${percentual}%` }} />
          </div>

          {comunicado.anexo_url ? (
            <div className="flex items-center gap-2 rounded-[18px] border border-[color:var(--com-border)] bg-white/80 px-3 py-2 text-xs text-[var(--com-muted)]">
              <FileText className="h-3.5 w-3.5" />
              Anexo: {comunicado.anexo_nome || "arquivo"} ({formatBytes(comunicado.anexo_tamanho || 0)})
            </div>
          ) : null}

          {expanded ? (
            <>
              <Separator />
              <div className="overflow-hidden rounded-[22px] border border-[color:var(--com-border)] bg-white/80">
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white/95">
                      <tr className="border-b border-[color:var(--com-border)] text-left">
                        <th className="px-3 py-3 font-semibold text-[var(--com-muted)]">Usuário</th>
                        <th className="px-3 py-3 font-semibold text-[var(--com-muted)]">Status</th>
                        <th className="px-3 py-3 font-semibold text-[var(--com-muted)]">Visualizado em</th>
                        <th className="px-3 py-3 font-semibold text-[var(--com-muted)]">Anexo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {destinatarios.map((dest) => (
                        <tr key={dest.id} className="border-b border-[color:var(--com-border)] last:border-none">
                          <td className="px-3 py-3">
                            <p className="font-semibold text-[var(--com-ink)]">{dest.usuarios?.nome || "Usuário"}</p>
                            <p className="text-xs text-[var(--com-muted)]">{dest.usuarios?.email || "-"}</p>
                          </td>
                          <td className="px-3 py-3">
                            {dest.visualizado_em ? (
                              <Badge variant="secondary">Visualizado</Badge>
                            ) : dest.dispensado_em ? (
                              <Badge variant="outline">Dispensado</Badge>
                            ) : (
                              <Badge>Pendente</Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 text-[var(--com-muted)]">{formatDateTime(dest.visualizado_em)}</td>
                          <td className="px-3 py-3 text-[var(--com-muted)]">{formatDateTime(dest.baixou_anexo_em)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='min-h-screen bg-[#f0f1f5]'>
      <div className='mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8'>

        {/* ===== HERO TITLE — padrão Clay ===== */}
        <section className={shellCardClass}>
          <div className='p-5 sm:p-7'>
            <div className='grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]'>

              {/* Esquerda — identidade */}
              <div>
                <span className='inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full bg-[#0e4d6a]/10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-[#0e4d6a]'>
                  <span className='shrink-0'>●</span>
                  <span className='truncate'>CRM Precatórios · comunicação interna</span>
                </span>

                <p className='mt-3 text-[clamp(1.8rem,5vw,3.8rem)] font-black leading-none tracking-[-0.06em] text-[#0e4d6a]'>
                  Comunicados
                </p>

                <h1 className='mt-2 text-[clamp(.95rem,2.5vw,1.4rem)] font-bold leading-snug tracking-[-0.03em] text-[#0b0c10]'>
                  Caixa unificada de avisos e alertas.
                </h1>

                <p className='mt-2 max-w-xl text-[13px] leading-relaxed text-[#6b7280]'>
                  Busque, filtre e publique comunicados sem perder contexto.
                  {' '}{teamUnreadCount > 0 && <span className='font-semibold text-[#0e4d6a]'>{teamUnreadCount} não lidos da equipe.</span>}
                </p>

                <div className='mt-4 flex flex-wrap gap-2'>
                  <button
                    onClick={() => setActiveTab('inbox')}
                    className='inline-flex h-9 items-center gap-2 rounded-[13px] bg-[#0e4d6a] px-4 text-[12.5px] font-bold text-white shadow-[8px_8px_20px_rgba(14,77,106,.42),-3px_-3px_8px_rgba(255,255,255,.3)] transition-all hover:-translate-y-[2px] active:translate-y-[1px] active:scale-[.97]'
                  >
                    <Mail className='h-3.5 w-3.5' />
                    Ver caixa
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setActiveTab('compose')}
                      className='inline-flex h-9 items-center gap-2 rounded-[13px] bg-[#0e4d6a] px-4 text-[12.5px] font-bold text-white shadow-[8px_8px_20px_rgba(14,77,106,.42),-3px_-3px_8px_rgba(255,255,255,.3)] transition-all hover:-translate-y-[2px] active:translate-y-[1px] active:scale-[.97]'
                    >
                      <Plus className='h-3.5 w-3.5' />
                      Novo comunicado
                    </button>
                  )}
                  <button
                    onClick={() => void loadData()}
                    disabled={loading}
                    className='inline-flex h-9 items-center gap-2 rounded-[13px] border border-black/[0.08] bg-white px-4 text-[12.5px] font-bold text-[#374151] shadow-[6px_6px_14px_rgba(0,0,0,.06),-3px_-3px_8px_rgba(255,255,255,.9)] transition-all hover:-translate-y-[2px] disabled:opacity-50 active:translate-y-[1px] active:scale-[.97]'
                  >
                    <RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} />
                    Atualizar
                  </button>
                </div>
              </div>

              {/* Direita — KPI cards */}
              <div className='grid grid-cols-2 gap-3'>
                <MetricTile tone='blue' label='Recebidos' value={receivedCount} hint='Caixa unificada' icon={<Mail className='h-5 w-5' />} loading={loading} />
                <MetricTile tone='amber' label='Não lidos' value={unreadCount} hint='Pendentes de leitura' icon={<Bell className='h-5 w-5' />} loading={loading} />
                <MetricTile tone='emerald' label='Lidos' value={readCount} hint='Já confirmados' icon={<CheckCircle2 className='h-5 w-5' />} loading={loading} />
                <MetricTile tone='slate' label='Com anexo' value={attachmentCount} hint='Com arquivo' icon={<Paperclip className='h-5 w-5' />} loading={loading} />
              </div>

            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'inbox' | 'compose' | 'archive')}>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            {/* Tabs clay — segmented */}
            <TabsList className='h-auto w-full gap-1 rounded-[16px] border border-black/[0.07] bg-white p-1.5 shadow-[inset_4px_4px_10px_rgba(0,0,0,.06),inset_-3px_-3px_8px_rgba(255,255,255,.87)] sm:inline-flex sm:w-auto'>
              <TabsTrigger
                value='inbox'
                className='rounded-[12px] px-4 py-2 text-[12.5px] font-semibold text-[#6b7280] transition-all data-[state=active]:bg-[#0e4d6a] data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:shadow-[4px_4px_10px_rgba(14,77,106,.35)]'
              >
                Recebidos
              </TabsTrigger>
              {isAdmin ? (
                <>
                  <TabsTrigger
                    value='compose'
                    className='rounded-[12px] px-4 py-2 text-[12.5px] font-semibold text-[#6b7280] transition-all data-[state=active]:bg-[#0e4d6a] data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:shadow-[4px_4px_10px_rgba(14,77,106,.35)]'
                  >
                    Escrever
                  </TabsTrigger>
                  <TabsTrigger
                    value='archive'
                    className='rounded-[12px] px-4 py-2 text-[12.5px] font-semibold text-[#6b7280] transition-all data-[state=active]:bg-[#0e4d6a] data-[state=active]:font-bold data-[state=active]:text-white data-[state=active]:shadow-[4px_4px_10px_rgba(14,77,106,.35)]'
                  >
                    Arquivo
                  </TabsTrigger>
                </>
              ) : null}
            </TabsList>

            {/* Ações secundárias */}
            <div className='flex flex-wrap gap-2'>
              <button
                onClick={() => { setQuery(''); setInboxFilter('all'); setActiveTab('inbox') }}
                className='inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-black/[0.08] bg-white px-3 text-[12px] font-semibold text-[#374151] shadow-[5px_5px_12px_rgba(0,0,0,.05),-3px_-3px_7px_rgba(255,255,255,.9)] transition-all hover:-translate-y-[1px] active:scale-[.97]'
              >
                <X className='h-3.5 w-3.5' />
                Limpar
              </button>
              <button
                onClick={() => void loadData()}
                disabled={loading}
                className='inline-flex h-9 items-center gap-1.5 rounded-[12px] border border-black/[0.08] bg-white px-3 text-[12px] font-semibold text-[#374151] shadow-[5px_5px_12px_rgba(0,0,0,.05),-3px_-3px_7px_rgba(255,255,255,.9)] transition-all hover:-translate-y-[1px] disabled:opacity-50 active:scale-[.97]'
              >
                <RefreshCw className={cx('h-3.5 w-3.5', loading && 'animate-spin')} />
                Atualizar
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('compose')}
                  className='inline-flex h-9 items-center gap-1.5 rounded-[12px] bg-[#0e4d6a] px-3 text-[12px] font-bold text-white shadow-[6px_6px_16px_rgba(14,77,106,.4),-2px_-2px_6px_rgba(255,255,255,.28)] transition-all hover:-translate-y-[1px] active:scale-[.97]'
                >
                  <Plus className='h-3.5 w-3.5' />
                  Novo
                </button>
              )}
            </div>
          </div>
          <TabsContent value='inbox' className='mt-4 space-y-4'>
            <div className={cx(innerShellClass, 'p-4 sm:p-5')}>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <h2 className='text-[15px] font-black tracking-[-0.03em] text-[#0b0c10]'>Buscar e filtrar</h2>
                  <p className='mt-0.5 text-[12px] text-[#6b7280]'>Título, mensagem, anexos e alertas.</p>
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  {[
                    { label: `${visibleInboxCount} visíveis`, active: true },
                    { label: `${inboxFilterStats.unread} abertos` },
                    { label: `${inboxFilterStats.attachments} c/ anexo` },
                    { label: `${inboxFilterStats.alerts} alertas` },
                  ].map(({ label, active }) => (
                    <span
                      key={label}
                      className={cx(
                        'inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.14em]',
                        active
                          ? 'bg-[#0e4d6a]/10 text-[#0e4d6a]'
                          : 'border border-black/[0.08] bg-[#f2f3f7] text-[#6b7280]'
                      )}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className='mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]'>
                <div className='relative'>
                  <Search className='pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]' />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder='Buscar por título, mensagem, anexo ou alerta…'
                    className='h-11 rounded-[14px] border-black/[0.08] bg-[#f2f3f7] pl-10 pr-12 text-[13px] shadow-[inset_4px_4px_10px_rgba(0,0,0,.06),inset_-3px_-3px_8px_rgba(255,255,255,.87)] focus-visible:ring-[#0e4d6a]/30'
                  />
                  {query ? (
                    <button
                      type='button'
                      className='absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#9ca3af] hover:text-[#374151]'
                      onClick={() => setQuery('')}
                    >
                      <X className='h-3.5 w-3.5' />
                    </button>
                  ) : null}
                </div>

                <div className='flex flex-wrap gap-1.5'>
                  {(['all', 'unread', 'attachments', 'alerts'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setInboxFilter(f)}
                      className={cx(
                        'inline-flex h-9 items-center rounded-[11px] px-3 text-[12px] font-semibold transition-all active:scale-[.97]',
                        inboxFilter === f
                          ? 'bg-[#0e4d6a] text-white shadow-[4px_4px_10px_rgba(14,77,106,.35)]'
                          : 'border border-black/[0.08] bg-white text-[#6b7280] shadow-[4px_4px_10px_rgba(0,0,0,.05),-2px_-2px_6px_rgba(255,255,255,.9)] hover:text-[#374151]'
                      )}
                    >
                      {{ all: 'Todos', unread: 'Não lidos', attachments: 'Anexo', alerts: 'Alertas' }[f]}
                    </button>
                  ))}
                </div>
              </div>

              {inboxFilter !== 'all' && (
                <div className='mt-3 flex items-center gap-2 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900'>
                  <AlertTriangle className='h-3.5 w-3.5 shrink-0' />
                  {inboxFilter === 'unread' ? 'Mostrando apenas não lidos.'
                    : inboxFilter === 'attachments' ? 'Mostrando apenas com anexo.'
                    : 'Mostrando apenas alertas individuais.'}
                </div>
              )}
            </div>

            {loading ? (
              <div className='grid gap-6 xl:grid-cols-2'>
                {[0, 1].map((index) => (
                  <div key={index} className={cx(innerShellClass, 'animate-pulse p-4 sm:p-5 lg:p-6')}>
                    <div className='h-4 w-32 rounded-full bg-slate-200/80' />
                    <div className='mt-4 h-5 w-3/4 rounded-full bg-slate-200/80' />
                    <div className='mt-2 h-3 w-1/2 rounded-full bg-slate-200/80' />
                    <div className='mt-5 space-y-3'>
                      <div className='h-3 w-full rounded-full bg-slate-200/80' />
                      <div className='h-3 w-5/6 rounded-full bg-slate-200/80' />
                      <div className='h-10 w-40 rounded-2xl bg-slate-200/80' />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='grid gap-6 xl:grid-cols-2'>
                {showTeamFeed ? (
                  <Card className={innerShellClass}>
                    <CardContent className='space-y-4 p-4 sm:p-5 lg:p-6'>
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='space-y-1'>
                          <h3 className='flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[var(--com-ink)]'>
                            <Mail className='h-4 w-4 text-[var(--com-blue)]' />
                            Comunicados da equipe
                          </h3>
                          <p className='text-sm text-[var(--com-muted)]'>
                            Mensagens gerais para a operacao.
                          </p>
                        </div>
                        <Badge variant='outline' className='rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]'>
                          {filteredMyComunicados.length} itens
                        </Badge>
                      </div>

                      <div className='space-y-4'>
                        {filteredMyComunicados.length > 0 ? (
                          filteredMyComunicados.map(renderTeamComunicadoCard)
                        ) : (
                          <div className='flex flex-col gap-3 rounded-[24px] border border-dashed border-[color:var(--com-border)] bg-white/70 p-5'>
                            <div className='flex items-start gap-3'>
                              <div className='grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500'>
                                <Mail className='h-4 w-4' />
                              </div>
                              <div className='space-y-1'>
                                <p className='font-semibold text-[var(--com-ink)]'>Nenhum comunicado encontrado.</p>
                                <p className='text-sm text-[var(--com-muted)]'>
                                  Tente ajustar a busca ou limpar os filtros.
                                </p>
                              </div>
                            </div>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                setQuery('')
                                setInboxFilter('all')
                              }}
                            >
                              <X className='h-4 w-4' />
                              Limpar filtros
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {showAlertsFeed ? (
                  <Card className={innerShellClass}>
                    <CardContent className='space-y-4 p-4 sm:p-5 lg:p-6'>
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='space-y-1'>
                          <h3 className='flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[var(--com-ink)]'>
                            <Bell className='h-4 w-4 text-[var(--com-emerald)]' />
                            Alertas individuais
                          </h3>
                          <p className='text-sm text-[var(--com-muted)]'>
                            Notificacoes direcionadas ao seu usuario.
                          </p>
                        </div>
                        <Badge variant='outline' className='rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]'>
                          {filteredMyIndividualAlerts.length} itens
                        </Badge>
                      </div>

                      <div className='space-y-4'>
                        {filteredMyIndividualAlerts.length > 0 ? (
                          filteredMyIndividualAlerts.map(renderAlertCard)
                        ) : (
                          <div className='flex flex-col gap-3 rounded-[24px] border border-dashed border-[color:var(--com-border)] bg-white/70 p-5'>
                            <div className='flex items-start gap-3'>
                              <div className='grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-[var(--com-emerald)]'>
                                <Bell className='h-4 w-4' />
                              </div>
                              <div className='space-y-1'>
                                <p className='font-semibold text-[var(--com-ink)]'>Nenhum alerta encontrado.</p>
                                <p className='text-sm text-[var(--com-muted)]'>
                                  Tente ajustar a busca ou limpar os filtros.
                                </p>
                              </div>
                            </div>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                setQuery('')
                                setInboxFilter('all')
                              }}
                            >
                              <X className='h-4 w-4' />
                              Limpar filtros
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}
          </TabsContent>

          {isAdmin ? (
            <TabsContent value='compose' className='mt-6 space-y-6'>
              <div className='grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]'>
                <Card className={innerShellClass}>
                  <CardContent className='space-y-5 p-4 sm:p-5 lg:p-6'>
                    <div className='space-y-1'>
                      <h2 className='text-xl font-black tracking-[-0.03em] text-[var(--com-ink)]'>Escrever comunicado</h2>
                      <p className='text-sm text-[var(--com-muted)]'>
                        Escreva uma vez, refine com IA e publique no escopo certo.
                      </p>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label htmlFor='titulo'>Titulo</Label>
                        <Input
                          id='titulo'
                          value={titulo}
                          onChange={(e) => setTitulo(e.target.value)}
                          placeholder='Ex.: Nova versao do sistema disponivel'
                          className='h-11 rounded-[18px] border-[color:var(--com-border)] bg-white/90'
                        />
                      </div>

                      <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='space-y-2'>
                          <Label>Escopo</Label>
                          <Select value={escopo} onValueChange={(value) => setEscopo(value as ComunicadoTargetScope)}>
                            <SelectTrigger className='h-11 rounded-[18px] border-[color:var(--com-border)] bg-white/90'>
                              <SelectValue placeholder='Selecione o publico' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='operadores'>Somente operadores</SelectItem>
                              <SelectItem value='equipe'>Equipe inteira</SelectItem>
                              <SelectItem value='individual'>Individual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className='space-y-2'>
                          <Label>Tom da IA</Label>
                          <Select value={tomIA} onValueChange={setTomIA}>
                            <SelectTrigger className='h-11 rounded-[18px] border-[color:var(--com-border)] bg-white/90'>
                              <SelectValue placeholder='Tom de escrita' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='neutro'>Neutro</SelectItem>
                              <SelectItem value='formal'>Formal</SelectItem>
                              <SelectItem value='direto'>Direto</SelectItem>
                              <SelectItem value='inspirador'>Inspirador</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {escopo === 'individual' ? (
                      <div className='space-y-2'>
                        <Label>Destinatario individual</Label>
                        <Select
                          value={selectedIndividualRecipientId || '__none__'}
                          onValueChange={(value) => setSelectedIndividualRecipientId(value === '__none__' ? '' : value)}
                          disabled={loadingRecipients || recipientOptions.length === 0}
                        >
                          <SelectTrigger className='h-11 rounded-[18px] border-[color:var(--com-border)] bg-white/90'>
                            <SelectValue placeholder={loadingRecipients ? 'Carregando usuarios...' : 'Selecione o usuario'} />
                          </SelectTrigger>
                          <SelectContent>
                            {recipientOptions.length === 0 ? (
                              <SelectItem value='__none__'>Nenhum usuario ativo encontrado</SelectItem>
                            ) : (
                              recipientOptions.map((recipient) => (
                                <SelectItem key={recipient.id} value={recipient.id}>
                                  {recipient.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <div className='flex items-start gap-3 rounded-[20px] border border-[color:var(--com-border)] bg-sky-50/70 p-3 text-sm text-[var(--com-muted)]'>
                          <Users2 className='mt-0.5 h-4 w-4 text-[var(--com-blue)]' />
                          <p>
                            {selectedRecipient
                              ? `Vai para ${selectedRecipient.nome} (${selectedRecipient.roleLabel}).`
                              : 'Selecione um destinatario para liberar a publicacao.'}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className='space-y-2'>
                      <Label htmlFor='mensagemOriginal'>Mensagem base</Label>
                      <Textarea
                        id='mensagemOriginal'
                        value={mensagemOriginal}
                        onChange={(e) => {
                          setMensagemOriginal(e.target.value)
                          if (!mensagemPublicada.trim()) {
                            setMensagemPublicada(e.target.value)
                          }
                        }}
                        placeholder='Descreva o comunicado com contexto e instrucao claras.'
                        className='min-h-[180px] rounded-[22px] border-[color:var(--com-border)] bg-white/90'
                      />
                    </div>

                    <div className='space-y-2'>
                      <div className='flex items-center justify-between gap-3'>
                        <Label htmlFor='mensagemPublicada'>Mensagem final para publicar</Label>
                        <span className='text-xs font-medium text-[var(--com-muted)]'>
                          {finalPublishedMessage.length} caracteres
                        </span>
                      </div>
                      <Textarea
                        id='mensagemPublicada'
                        value={mensagemPublicada}
                        onChange={(e) => setMensagemPublicada(e.target.value)}
                        placeholder='Se ficar vazio, a mensagem base sera usada.'
                        className='min-h-[180px] rounded-[22px] border-[color:var(--com-border)] bg-white/90'
                      />
                    </div>

                    <div className='space-y-3 rounded-[22px] border border-[color:var(--com-border)] bg-white/70 p-4'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold text-[var(--com-ink)]'>Anexo opcional</p>
                          <p className='text-xs text-[var(--com-muted)]'>
                            Adicione um arquivo sem travar a publicacao.
                          </p>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                          <Button type='button' variant='outline' onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className='h-4 w-4' />
                            Escolher arquivo
                          </Button>
                          {selectedFile ? (
                            <Button
                              type='button'
                              variant='ghost'
                              onClick={() => {
                                setSelectedFile(null)
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = ''
                                }
                              }}
                            >
                              <X className='h-4 w-4' />
                              Remover
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <input
                        ref={fileInputRef}
                        type='file'
                        accept='.pdf,.doc,.docx,.txt,image/*'
                        className='hidden'
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />

                      {selectedFile ? (
                        <div className='flex flex-wrap items-center gap-2 rounded-[18px] border border-[color:var(--com-border)] bg-white/90 px-3 py-2 text-sm text-[var(--com-ink)]'>
                          <FileText className='h-4 w-4 text-[var(--com-blue)]' />
                          <span className='font-medium'>{selectedFile.name}</span>
                          <span className='text-[var(--com-muted)]'>{formatBytes(selectedFile.size)}</span>
                        </div>
                      ) : (
                        <div className='rounded-[18px] border border-dashed border-[color:var(--com-border)] px-3 py-3 text-sm text-[var(--com-muted)]'>
                          Nenhum anexo selecionado.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <div className='space-y-6'>
                  <Card className={innerShellClass}>
                    <CardContent className='space-y-4 p-4 sm:p-5 lg:p-6'>
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='space-y-1'>
                          <h3 className='flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[var(--com-ink)]'>
                            <Sparkles className='h-4 w-4 text-[var(--com-amber)]' />
                            Revisao assistida
                          </h3>
                          <p className='text-sm text-[var(--com-muted)]'>
                            A IA revisa a mensagem base antes da publicacao.
                          </p>
                        </div>
                        <Badge variant='outline' className='rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]'>
                          {getToneLabel(tomIA)}
                        </Badge>
                      </div>

                      <Button
                        className='w-full'
                        onClick={() => void handleReviewWithAI()}
                        disabled={aiLoading || !mensagemOriginal.trim()}
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Sparkles className='h-4 w-4' />
                            Reescrever com IA
                          </>
                        )}
                      </Button>

                      {aiDraft ? (
                        <div className='space-y-4 rounded-[22px] border border-[color:var(--com-border)] bg-slate-50/80 p-4'>
                          <div className='space-y-1'>
                            <p className='text-[10px] font-black uppercase tracking-[0.18em] text-[var(--com-muted)]'>
                              Titulo sugerido
                            </p>
                            <p className='text-sm font-semibold text-[var(--com-ink)]'>{aiDraft.titulo_sugerido}</p>
                          </div>
                          <div className='space-y-1'>
                            <p className='text-[10px] font-black uppercase tracking-[0.18em] text-[var(--com-muted)]'>
                              Mensagem revisada
                            </p>
                            <p className='whitespace-pre-line text-sm leading-6 text-[var(--com-ink)]/85'>
                              {aiDraft.mensagem_revisada}
                            </p>
                          </div>
                          <div className='flex flex-wrap gap-2'>
                            <Button
                              size='sm'
                              variant='secondary'
                              onClick={() => {
                                setTitulo((prev) => prev || aiDraft.titulo_sugerido)
                                setMensagemPublicada(aiDraft.mensagem_revisada)
                              }}
                            >
                              Usar texto revisado
                            </Button>
                            <Button size='sm' variant='outline' onClick={() => setMensagemPublicada(aiDraft.versao_curta)}>
                              Usar versao curta
                            </Button>
                          </div>
                          {aiDraft.observacoes?.length > 0 ? (
                            <div className='space-y-1'>
                              <p className='text-[10px] font-black uppercase tracking-[0.18em] text-[var(--com-muted)]'>
                                Observacoes
                              </p>
                              {aiDraft.observacoes.map((obs, idx) => (
                                <p key={`${obs}-${idx}`} className='text-xs text-[var(--com-muted)]'>
                                  - {obs}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className='rounded-[22px] border border-dashed border-[color:var(--com-border)] bg-white/70 p-4 text-sm text-[var(--com-muted)]'>
                          Escreva a mensagem base e clique em Reescrever com IA para gerar uma sugestao.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className={innerShellClass}>
                    <CardContent className='space-y-4 p-4 sm:p-5 lg:p-6'>
                      <div className='space-y-1'>
                        <h3 className='flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[var(--com-ink)]'>
                          <FileText className='h-4 w-4 text-[var(--com-blue)]' />
                          Preview final
                        </h3>
                        <p className='text-sm text-[var(--com-muted)]'>
                          O que voce ver aqui e o que sera enviado.
                        </p>
                      </div>

                      <div className='rounded-[24px] border border-[color:var(--com-border)] bg-white/85 p-4'>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div className='space-y-1'>
                            <p className='text-[10px] font-black uppercase tracking-[0.18em] text-[var(--com-muted)]'>
                              Titulo
                            </p>
                            <h4 className='text-xl font-black tracking-[-0.03em] text-[var(--com-ink)]'>
                              {titulo.trim() || aiDraft?.titulo_sugerido || 'Titulo do comunicado'}
                            </h4>
                          </div>
                          <Badge variant='outline' className='rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]'>
                            {composeScopeLabel}
                          </Badge>
                        </div>

                        <div className='mt-4 whitespace-pre-line text-sm leading-6 text-[var(--com-ink)]/82'>
                          {finalPublishedMessage || 'A mensagem final aparecera aqui assim que voce preencher o campo.'}
                        </div>

                        <div className='mt-4 flex flex-wrap gap-2'>
                          <Badge variant='secondary' className='rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]'>
                            <CheckCircle2 className='h-3.5 w-3.5' />
                            {selectedFile ? formatBytes(selectedFile.size) : 'Sem anexo'}
                          </Badge>
                          {selectedRecipient ? (
                            <Badge variant='outline' className='rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em]'>
                              <Users2 className='h-3.5 w-3.5' />
                              {selectedRecipient.nome}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={innerShellClass}>
                    <CardContent className='space-y-4 p-4 sm:p-5 lg:p-6'>
                      <div className='space-y-1'>
                        <h3 className='flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[var(--com-ink)]'>
                          <CheckCircle2 className='h-4 w-4 text-[var(--com-emerald)]' />
                          Checklist operacional
                        </h3>
                        <p className='text-sm text-[var(--com-muted)]'>
                          Complete os itens abaixo antes de publicar.
                        </p>
                      </div>

                      <div className='grid gap-3'>
                        {composeChecklist.map((item) => (
                          <ChecklistItem key={item.label} done={item.done} label={item.label} hint={item.hint} />
                        ))}
                      </div>

                      <div className='rounded-[22px] border border-[color:var(--com-border)] bg-white/85 p-4'>
                        <Button
                          className='w-full'
                          onClick={() => void handlePublish()}
                          disabled={!canPublish || publishing || aiLoading}
                        >
                          {publishing ? (
                            <>
                              <Loader2 className='h-4 w-4 animate-spin' />
                              Publicando...
                            </>
                          ) : (
                            <>
                              <Send className='h-4 w-4' />
                              Publicar comunicado
                            </>
                          )}
                        </Button>
                        <p className='mt-2 text-xs leading-5 text-[var(--com-muted)]'>
                          {canPublish
                            ? 'Pronto para publicar no escopo selecionado.'
                            : 'Complete os campos obrigatorios para liberar a publicacao.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          ) : null}

          {isAdmin ? (
            <TabsContent value='archive' className='mt-6 space-y-6'>
              <Card className={innerShellClass}>
                <CardContent className='grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end lg:p-6'>
                  <div className='space-y-2'>
                    <div className={labelChipClass}>
                      <Layers className='h-3.5 w-3.5' />
                      Arquivo publicado
                    </div>
                    <h2 className='text-2xl font-black tracking-[-0.05em] text-[var(--com-ink)]'>
                      Historico de publicacoes
                    </h2>
                    <p className='text-sm text-[var(--com-muted)]'>
                      A busca acima tambem filtra o arquivo por titulo, mensagem e anexo.
                    </p>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-3'>
                    <div className='rounded-[20px] border border-[color:var(--com-border)] bg-white/85 p-3'>
                      <div className='text-[10px] font-black uppercase tracking-[0.18em] text-[var(--com-muted)]'>
                        Publicados
                      </div>
                      <div className='mt-2 text-xl font-black tabular-nums text-[var(--com-ink)]'>{publishedCount}</div>
                    </div>
                    <div className='rounded-[20px] border border-[color:var(--com-border)] bg-white/85 p-3'>
                      <div className='text-[10px] font-black uppercase tracking-[0.18em] text-[var(--com-muted)]'>
                        Com anexo
                      </div>
                      <div className='mt-2 text-xl font-black tabular-nums text-[var(--com-ink)]'>{publishedAttachmentCount}</div>
                    </div>
                    <div className='rounded-[20px] border border-[color:var(--com-border)] bg-white/85 p-3'>
                      <div className='text-[10px] font-black uppercase tracking-[0.18em] text-[var(--com-muted)]'>
                        Ultima publicacao
                      </div>
                      <div className='mt-2 text-sm font-semibold leading-5 text-[var(--com-ink)]'>
                        {latestPublishedLabel}
                      </div>
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <Button variant='outline' onClick={() => setActiveTab('compose')}>
                      <Plus className='h-4 w-4' />
                      Novo comunicado
                    </Button>
                    <Button variant='ghost' onClick={() => setExpandedAdminRows({})}>
                      <X className='h-4 w-4' />
                      Recolher detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {loading ? (
                <div className='space-y-4'>
                  {[0, 1].map((index) => (
                    <div key={index} className={cx(innerShellClass, 'animate-pulse p-4 sm:p-5 lg:p-6')}>
                      <div className='h-4 w-32 rounded-full bg-slate-200/80' />
                      <div className='mt-4 h-5 w-3/4 rounded-full bg-slate-200/80' />
                      <div className='mt-2 h-3 w-1/2 rounded-full bg-slate-200/80' />
                      <div className='mt-5 space-y-3'>
                        <div className='h-3 w-full rounded-full bg-slate-200/80' />
                        <div className='h-3 w-5/6 rounded-full bg-slate-200/80' />
                        <div className='h-3 w-2/3 rounded-full bg-slate-200/80' />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredAdminComunicados.length > 0 ? (
                <div className='space-y-4'>{filteredAdminComunicados.map(renderPublishedCard)}</div>
              ) : (
                <div className='flex flex-col gap-3 rounded-[24px] border border-dashed border-[color:var(--com-border)] bg-white/75 p-5'>
                  <div className='flex items-start gap-3'>
                    <div className='grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-500'>
                      <Layers className='h-4 w-4' />
                    </div>
                    <div className='space-y-1'>
                      <p className='font-semibold text-[var(--com-ink)]'>Nenhuma publicacao encontrada.</p>
                      <p className='text-sm text-[var(--com-muted)]'>
                        Ajuste a busca para encontrar comunicados no arquivo.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </div>
  )
}
