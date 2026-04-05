"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Key } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar as HeroCalendar, DateField, DatePicker } from "@heroui/react"
import { parseDate, parseZonedDateTime, getLocalTimeZone } from "@internationalized/date"
import type { DateValue } from "@internationalized/date"
import { Space_Grotesk } from "next/font/google"
import {
  addDays,
  addHours,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import {
  AGENDA_DESTINO_LABELS,
  AGENDA_DESTINO_OPTIONS,
  AGENDA_PRIORIDADE_LABELS,
  AGENDA_PRIORIDADE_OPTIONS,
  AGENDA_STATUS_LABELS,
  AGENDA_STATUS_OPTIONS,
  AGENDA_TIPO_OPTIONS,
  type AgendaDestino,
  type AgendaEvento,
  type AgendaPrioridade,
  type AgendaStatus,
  type AgendaTipo,
} from "@/lib/types/agenda"
import {
  BellAlert,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "@/components/icons"
import {
  Button,
  Card,
  Chip,
  Separator,
  Input,
  InputGroup,
  Modal,
  Select,
  Skeleton,
  Surface,
  TextField,
  Label,
  ListBox,
} from "@heroui/react"
import { Textarea as UiTextarea } from "@/components/ui/textarea"

const agendaCalendarFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
})

type EventForm = {
  titulo: string
  descricao: string
  tipo: AgendaTipo
  status: AgendaStatus
  prioridade: AgendaPrioridade
  inicioEm: string
  fimEm: string
  diaInteiro: boolean
  local: string
  precatorioId: string
  destino: AgendaDestino
  destinatarioUsuarioId: string
  enviarAlerta: boolean
  alertaAntecedenciaMin: number
  dispararComoComunicado: boolean
  comunicadoTitulo: string
  comunicadoMensagem: string
}

type JanelaExecucaoTipo = "fixa" | "faixa"

type PrecatorioOption = {
  id: string
  label: string
  titulo: string
  numeroPrecatorio: string
  numeroProcesso: string
  credorNome: string
  searchText: string
}

const statusColor: Record<AgendaStatus, "default" | "success" | "danger"> = {
  agendado: "default",
  concluido: "success",
  cancelado: "danger",
}

const prioridadeColor: Record<AgendaPrioridade, "default" | "warning" | "danger"> = {
  baixa: "default",
  media: "warning",
  alta: "danger",
}

const solidCardClassName = "rounded-2xl border border-default-200/80 bg-background dark:bg-muted shadow-sm"

const _toKey = (keys: "all" | Set<Key>) => {
  if (keys === "all") return ""
  const value = Array.from(keys)[0]
  return typeof value === "string" ? value : value ? String(value) : ""
}

const str = (obj: Record<string, unknown>, key: string) => {
  const value = obj[key]
  return typeof value === "string" ? value : null
}

const num = (obj: Record<string, unknown>, key: string, fallback = 0) => {
  const value = obj[key]
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const bool = (obj: Record<string, unknown>, key: string, fallback = false) => {
  const value = obj[key]
  return typeof value === "boolean" ? value : fallback
}

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const sanitizeTextareaValue = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\uFFFD\u25A0]/g, "")

function toLocalValue(date: Date) {
  const y = `${date.getFullYear()}`.padStart(4, "0")
  const m = `${date.getMonth() + 1}`.padStart(2, "0")
  const d = `${date.getDate()}`.padStart(2, "0")
  const h = `${date.getHours()}`.padStart(2, "0")
  const min = `${date.getMinutes()}`.padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}:00`
}

function fromIso(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : toLocalValue(date)
}

function toIso(value: string, dayOnly: boolean, end = false) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (dayOnly) {
    if (end) date.setHours(23, 59, 59, 999)
    else date.setHours(0, 0, 0, 0)
  }
  return date.toISOString()
}

function defaultForm(base = new Date()): EventForm {
  const start = addHours(base, 1)
  start.setMinutes(0, 0, 0)
  const end = addHours(start, 1)
  return {
    titulo: "",
    descricao: "",
    tipo: "lembrete",
    status: "agendado",
    prioridade: "media",
    inicioEm: toLocalValue(start),
    fimEm: toLocalValue(end),
    diaInteiro: false,
    local: "",
    precatorioId: "",
    destino: "pessoal",
    destinatarioUsuarioId: "",
    enviarAlerta: true,
    alertaAntecedenciaMin: 30,
    dispararComoComunicado: false,
    comunicadoTitulo: "",
    comunicadoMensagem: "",
  }
}

function normalizeEvent(input: unknown): AgendaEvento | null {
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>
  const id = str(obj, "id")
  const titulo = str(obj, "titulo")
  const inicio = str(obj, "inicio_em")
  const criado = str(obj, "criado_por")
  const createdAt = str(obj, "created_at")
  const updatedAt = str(obj, "updated_at")
  if (!id || !titulo || !inicio || !criado || !createdAt || !updatedAt) return null
  return {
    id,
    titulo,
    descricao: str(obj, "descricao"),
    tipo: (str(obj, "tipo") || "lembrete") as AgendaTipo,
    status: (str(obj, "status") || "agendado") as AgendaStatus,
    prioridade: (str(obj, "prioridade") || "media") as AgendaPrioridade,
    inicio_em: inicio,
    fim_em: str(obj, "fim_em"),
    dia_inteiro: bool(obj, "dia_inteiro"),
    local: str(obj, "local"),
    precatorio_id: str(obj, "precatorio_id"),
    criado_por: criado,
    destino: (str(obj, "destino") || "pessoal") as AgendaDestino,
    destinatario_usuario_id: str(obj, "destinatario_usuario_id"),
    enviar_alerta: bool(obj, "enviar_alerta", true),
    alerta_antecedencia_min: num(obj, "alerta_antecedencia_min", 30),
    alerta_disparado_em: str(obj, "alerta_disparado_em"),
    disparar_como_comunicado: bool(obj, "disparar_como_comunicado"),
    comunicado_titulo: str(obj, "comunicado_titulo"),
    comunicado_mensagem: str(obj, "comunicado_mensagem"),
    comunicado_publicado_id: str(obj, "comunicado_publicado_id"),
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

function eventInDay(evento: AgendaEvento, day: Date) {
  const start = new Date(evento.inicio_em)
  if (Number.isNaN(start.getTime())) return false
  const dayStart = startOfDay(day)
  const dayEnd = addDays(dayStart, 1)
  const end = evento.fim_em ? new Date(evento.fim_em) : start
  return start < dayEnd && end >= dayStart
}

function periodLabel(evento: AgendaEvento) {
  const date = new Date(evento.inicio_em)
  if (Number.isNaN(date.getTime())) return "-"
  if (evento.dia_inteiro) return format(date, "dd/MM/yyyy", { locale: ptBR })
  return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR })
}

function calendarValueToDate(value: any): Date | null {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value?.toDate === "function") {
    try {
      const date = value.toDate(getLocalTimeZone())
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
    } catch {
      // noop
    }
  }

  if (typeof value === "string") {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === "object") {
    const year = Number((value as any).year)
    const month = Number((value as any).month)
    const day = Number((value as any).day)
    if ([year, month, day].every((n) => Number.isFinite(n))) {
      const date = new Date(year, month - 1, day)
      return Number.isNaN(date.getTime()) ? null : date
    }
  }

  return null
}

function dateValueToLocal(value: DateValue): string | null {
  const raw = value.toString().replace(/\[.*?\]$/, "")
  const match = raw.match(/^(\d{1,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return null

  const year = match[1].padStart(4, "0")
  const second = match[6] ?? "00"
  return `${year}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${second}`
}

function parseDateFieldValue(value: string, dayOnly: boolean): DateValue | null {
  if (!value) return null

  if (dayOnly) {
    const dayPart = value.split("T")[0]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayPart)) return null
    try {
      return parseDate(dayPart)
    } catch {
      return null
    }
  }

  const match = value
    .replace(/\[.*?\]$/, "")
    .match(/^(\d{1,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:[+-]\d{2}:\d{2})?$/)

  if (!match) return null

  const year = match[1].padStart(4, "0")
  const second = match[6] ?? "00"
  const normalized = `${year}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${second}`

  try {
    return parseZonedDateTime(`${normalized}[America/Sao_Paulo]`)
  } catch {
    return null
  }
}

function shiftLocalDateTime(value: string, deltaMinutes: number): string | null {
  const match = value
    .replace(/\[.*?\]$/, "")
    .match(/^(\d{1,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:[+-]\d{2}:\d{2})?$/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] ?? "00")

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  if (Number.isNaN(date.getTime())) return null

  date.setUTCMinutes(date.getUTCMinutes() + deltaMinutes)

  const y = `${date.getUTCFullYear()}`.padStart(4, "0")
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0")
  const d = `${date.getUTCDate()}`.padStart(2, "0")
  const h = `${date.getUTCHours()}`.padStart(2, "0")
  const min = `${date.getUTCMinutes()}`.padStart(2, "0")
  const sec = `${date.getUTCSeconds()}`.padStart(2, "0")

  return `${y}-${m}-${d}T${h}:${min}:${sec}`
}

function localTimeLabel(value: string) {
  const match = value.replace(/\[.*?\]$/, "").match(/T(\d{2}):(\d{2})/)
  if (!match) return "--:--"
  return `${match[1]}:${match[2]}`
}

function shiftLocalByUnits(
  value: string,
  units: { minutes?: number; days?: number; weeks?: number; months?: number },
): string | null {
  const match = value
    .replace(/\[.*?\]$/, "")
    .match(/^(\d{1,4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:[+-]\d{2}:\d{2})?$/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] ?? "00")

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  if (Number.isNaN(date.getTime())) return null

  if (units.months) date.setUTCMonth(date.getUTCMonth() + units.months)
  if (units.weeks || units.days) date.setUTCDate(date.getUTCDate() + (units.days ?? 0) + (units.weeks ?? 0) * 7)
  if (units.minutes) date.setUTCMinutes(date.getUTCMinutes() + units.minutes)

  const y = `${date.getUTCFullYear()}`.padStart(4, "0")
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0")
  const d = `${date.getUTCDate()}`.padStart(2, "0")
  const h = `${date.getUTCHours()}`.padStart(2, "0")
  const min = `${date.getUTCMinutes()}`.padStart(2, "0")
  const sec = `${date.getUTCSeconds()}`.padStart(2, "0")

  return `${y}-${m}-${d}T${h}:${min}:${sec}`
}

function isSundayCalendarValue(value: any) {
  const date = calendarValueToDate(value)
  return !!date && date.getDay() === 0
}

function isSundayWeekLabel(label: string) {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

  return normalized.startsWith("dom") || normalized.startsWith("sun")
}

const sundayHeaderClassName = "font-extrabold tracking-wide text-danger"
const calendarCellClassName =
  "rounded-2xl transition-all " +
  "data-[selected=true]:bg-primary/15 data-[selected=true]:shadow-[inset_0_0_0_1px_rgba(249,115,22,0.35)] " +
  "dark:data-[selected=true]:bg-primary/25 dark:data-[selected=true]:shadow-[inset_0_0_0_1px_rgba(251,146,60,0.4)]"
const sundayCellClassName =
  "font-extrabold text-danger " +
  "data-[selected=true]:!text-danger " +
  "data-[outside-month=true]:!text-danger data-[outside-month=true]:!opacity-100"

export default function AgendaPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createBrowserClient()
  const { profile } = useAuth()
  const userId = profile?.id ?? null
  const roles = Array.isArray(profile?.role)
    ? profile.role.map(String)
    : profile?.role
      ? [String(profile.role)]
      : []
  const isAdmin = roles.includes("admin")
  const isOperador = roles.some((role) => ["operador", "operador_comercial", "operador_calculo"].includes(role))
  const canManageTargets = isAdmin || roles.includes("gestor")
  const linkedPrecatorioParam = params.get("precatorioId") || ""
  const shouldOpenCreateFromParam = params.get("novo") === "1"

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [events, setEvents] = useState<AgendaEvento[]>([])
  const [users, setUsers] = useState<Array<{ id: string; nome: string; role: string[] }>>([])
  const [precatorios, setPrecatorios] = useState<PrecatorioOption[]>([])
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [day, setDay] = useState(startOfDay(new Date()))
  const [search, setSearch] = useState("")
  const [creditSearch, setCreditSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [tipoFilter, setTipoFilter] = useState("todos")
  const [mineOnly, setMineOnly] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>(defaultForm())
  const [janelaExecucaoTipo, setJanelaExecucaoTipo] = useState<JanelaExecucaoTipo>("faixa")
  const createFromParamHandledRef = useRef<string | null>(null)

  const runScheduler = useCallback(async () => {
    if (!supabase) return
    await supabase.rpc("processar_agenda_eventos_pendentes", { p_reference: new Date().toISOString() })
  }, [supabase])

  const loadOptions = useCallback(async () => {
    if (!supabase) return

    const toPrecatorioOption = (item: any): PrecatorioOption => {
      const id = String(item.id)
      const titulo = String(item.titulo || "")
      const numeroPrecatorio = String(item.numero_precatorio || "")
      const numeroProcesso = String(item.numero_processo || "")
      const credorNome = String(item.credor_nome || "")
      const principalLabel = titulo || numeroPrecatorio || credorNome || id
      const detailParts = [
        credorNome && credorNome !== principalLabel ? `Credor: ${credorNome}` : "",
        numeroPrecatorio && numeroPrecatorio !== principalLabel ? `Prec.: ${numeroPrecatorio}` : "",
        numeroProcesso ? `Proc.: ${numeroProcesso}` : "",
      ].filter(Boolean)
      const label = detailParts.length > 0 ? `${principalLabel} - ${detailParts.join(" | ")}` : principalLabel

      return {
        id,
        label,
        titulo,
        numeroPrecatorio,
        numeroProcesso,
        credorNome,
        searchText: normalizeSearch(`${principalLabel} ${credorNome} ${numeroPrecatorio} ${numeroProcesso}`),
      }
    }

    const [usersResult, precatoriosResult] = await Promise.all([
      supabase.from("usuarios").select("id, nome, role, ativo").eq("ativo", true).order("nome", { ascending: true }),
      supabase
        .from("precatorios")
        .select("id, titulo, numero_precatorio, numero_processo, credor_nome, updated_at")
        .order("updated_at", { ascending: false })
        .limit(2000),
    ])
    if (usersResult.error) throw usersResult.error
    if (precatoriosResult.error) throw precatoriosResult.error

    setUsers(
      (usersResult.data || []).map((item: any) => ({
        id: String(item.id),
        nome: String(item.nome || "Sem nome"),
        role: Array.isArray(item.role) ? item.role.map(String) : [String(item.role || "")].filter(Boolean),
      }))
    )

    const options = (precatoriosResult.data || []).map(toPrecatorioOption)

    if (linkedPrecatorioParam && !options.some((item) => item.id === linkedPrecatorioParam)) {
      const { data: linkedPrecatorio, error } = await supabase
        .from("precatorios")
        .select("id, titulo, numero_precatorio, numero_processo, credor_nome")
        .eq("id", linkedPrecatorioParam)
        .maybeSingle()

      if (!error && linkedPrecatorio) {
        options.unshift(toPrecatorioOption(linkedPrecatorio))
      }
    }

    setPrecatorios(options)
  }, [linkedPrecatorioParam, supabase])

  const loadEvents = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      await runScheduler()
      let query = supabase
        .from("agenda_eventos")
        .select("*")
        .gte("inicio_em", subMonths(startOfMonth(month), 2).toISOString())
        .lte("inicio_em", addMonths(endOfMonth(month), 12).toISOString())

      if (isOperador && !isAdmin) {
        query = query.or(`criado_por.eq.${userId},destinatario_usuario_id.eq.${userId}`)
      }

      const { data, error } = await query.order("inicio_em", { ascending: true })

      if (error) throw error
      setEvents((data || []).map(normalizeEvent).filter((row): row is AgendaEvento => Boolean(row)))
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isOperador, month, runScheduler, supabase, userId])

  useEffect(() => {
    if (!userId) return
    Promise.all([loadOptions(), loadEvents()]).catch((error) => {
      console.error("Erro ao carregar agenda:", error)
      toast.error("Nao foi possivel carregar agenda.")
    })
  }, [loadEvents, loadOptions, userId])

  useEffect(() => {
    const id = params.get("eventoId")
    if (!id) return
    const found = events.find((item) => item.id === id)
    if (!found) return
    const target = startOfDay(new Date(found.inicio_em))
    setDay(target)
    setMonth(startOfMonth(target))
  }, [events, params])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return events.filter((item) => {
      if (mineOnly && item.criado_por !== userId) return false
      if (statusFilter !== "todos" && item.status !== statusFilter) return false
      if (tipoFilter !== "todos" && item.tipo !== tipoFilter) return false
      if (!query) return true
      return `${item.titulo} ${item.descricao || ""} ${item.local || ""}`.toLowerCase().includes(query)
    })
  }, [events, mineOnly, search, statusFilter, tipoFilter, userId])

  const filteredPrecatorios = useMemo(() => {
    const query = normalizeSearch(creditSearch)
    const selected = form.precatorioId ? precatorios.find((item) => item.id === form.precatorioId) : null

    const ranked = query
      ? precatorios
        .map((item) => {
          const starts = item.searchText.startsWith(query)
          const includes = item.searchText.includes(query)
          if (!starts && !includes) return null
          return { item, score: starts ? 2 : 1 }
        })
        .filter((entry): entry is { item: PrecatorioOption; score: number } => entry !== null)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return a.item.label.localeCompare(b.item.label)
        })
        .map((entry) => entry.item)
      : precatorios

    const limited = ranked.slice(0, 120)
    if (selected && !limited.some((item) => item.id === selected.id)) return [selected, ...limited]
    return limited
  }, [creditSearch, form.precatorioId, precatorios])

  const _calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const selectedDayEvents = useMemo(() => filtered.filter((item) => eventInDay(item, day)), [day, filtered])
  const _HeroCalendarCellAny = HeroCalendar.Cell as any
  const monthEvents = useMemo(() => filtered.filter((item) => isSameMonth(new Date(item.inicio_em), month)), [filtered, month])
  const nextWeekEvents = useMemo(() => {
    const now = new Date()
    const end = addDays(now, 7)
    return filtered.filter((item) => {
      const date = new Date(item.inicio_em)
      return !Number.isNaN(date.getTime()) && !isBefore(date, now) && isBefore(date, end)
    })
  }, [filtered])

  const openCreate = (baseDay?: Date, prelinkedPrecatorioId = "", requireManualDate = false) => {
    const ref = baseDay ? addHours(startOfDay(baseDay), 9) : new Date()
    const nextForm = defaultForm(ref)
    if (requireManualDate) {
      nextForm.inicioEm = ""
      nextForm.fimEm = ""
    }
    if (prelinkedPrecatorioId) {
      nextForm.precatorioId = prelinkedPrecatorioId
    }
    setEditingId(null)
    setJanelaExecucaoTipo("faixa")
    setForm(nextForm)
    setCreditSearch("")
    setModalOpen(true)
  }

  const handleCalendarWrapperDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Find the clicked calendar cell: HeroUI renders role="gridcell" on <td>
    const cell = (e.target as HTMLElement).closest('[data-date]') as HTMLElement | null
    // fallback: look for td[aria-label] containing a date string
    const tdCell = (e.target as HTMLElement).closest('td') as HTMLTableCellElement | null
    const rawDate = cell?.dataset?.date ?? tdCell?.getAttribute('data-date') ?? null
    if (rawDate) {
      const parsed = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? new Date(`${rawDate}T00:00:00`)
        : new Date(rawDate)
      if (!Number.isNaN(parsed.getTime())) {
        const targetDate = startOfDay(parsed)
        setDay(targetDate)
        setMonth(startOfMonth(targetDate))
        openCreate(targetDate)
        return
      }
    }
    // Fallback: try aria-label on button inside td which HeroUI uses like "Friday, February 21, 2026"
    const btn = (e.target as HTMLElement).closest('button[aria-label]') as HTMLButtonElement | null
    if (btn) {
      const label = btn.getAttribute('aria-label') ?? ""
      const parsed = new Date(label)
      if (!Number.isNaN(parsed.getTime())) {
        const targetDate = startOfDay(parsed)
        setDay(targetDate)
        setMonth(startOfMonth(targetDate))
        openCreate(targetDate)
      }
    }
  }, [openCreate])

  const openEdit = (evento: AgendaEvento) => {
    const inicioLocal = fromIso(evento.inicio_em)
    const fallbackForm = defaultForm()
    const inicioSafe = inicioLocal || fallbackForm.inicioEm
    const fimLocal = fromIso(evento.fim_em || evento.inicio_em)
    const fimSafe = fimLocal || inicioSafe
    const hasRange = Boolean(evento.fim_em && evento.fim_em !== evento.inicio_em)

    setEditingId(evento.id)
    setJanelaExecucaoTipo(hasRange ? "faixa" : "fixa")
    setForm({
      titulo: evento.titulo,
      descricao: sanitizeTextareaValue(evento.descricao || ""),
      tipo: evento.tipo,
      status: evento.status,
      prioridade: evento.prioridade,
      inicioEm: inicioSafe,
      fimEm: fimSafe,
      diaInteiro: evento.dia_inteiro,
      local: evento.local || "",
      precatorioId: evento.precatorio_id || "",
      destino: evento.destino,
      destinatarioUsuarioId: evento.destinatario_usuario_id || "",
      enviarAlerta: evento.enviar_alerta,
      alertaAntecedenciaMin: Math.max(0, evento.alerta_antecedencia_min || 0),
      dispararComoComunicado: evento.disparar_como_comunicado,
      comunicadoTitulo: evento.comunicado_titulo || "",
      comunicadoMensagem: sanitizeTextareaValue(evento.comunicado_mensagem || ""),
    })
    setCreditSearch("")
    setModalOpen(true)
  }

  useEffect(() => {
    if (!shouldOpenCreateFromParam) return
    const key = `${shouldOpenCreateFromParam ? "1" : "0"}:${linkedPrecatorioParam || ""}`
    if (createFromParamHandledRef.current === key) return
    createFromParamHandledRef.current = key

    const nextForm = defaultForm()
    if (linkedPrecatorioParam) {
      nextForm.precatorioId = linkedPrecatorioParam
    }

    setEditingId(null)
    setJanelaExecucaoTipo("faixa")
    setForm(nextForm)
    setCreditSearch("")
    setModalOpen(true)
  }, [linkedPrecatorioParam, shouldOpenCreateFromParam])

  const saveEvent = async () => {
    if (!supabase || !userId) return
    if (!form.titulo.trim()) return toast.error("Informe o titulo.")

    const inicio = toIso(form.inicioEm, form.diaInteiro)
    if (!inicio) return toast.error("Informe a data de inicio.")
    const fim = janelaExecucaoTipo === "faixa" ? (form.fimEm ? toIso(form.fimEm, form.diaInteiro, true) : null) : null
    if (janelaExecucaoTipo === "faixa" && !fim) return toast.error("Informe a data de fim.")
    if (fim) {
      const inicioDate = new Date(inicio)
      const fimDate = new Date(fim)
      if (fimDate < inicioDate) return toast.error("A data final deve ser maior ou igual ao inicio.")
    }

    if (form.destino === "individual" && !form.destinatarioUsuarioId) {
      return toast.error("Selecione o destinatario individual.")
    }

    if (!canManageTargets && form.destino !== "pessoal") {
      return toast.error("Seu perfil so pode usar destino pessoal.")
    }

    if (form.dispararComoComunicado && !isAdmin) {
      return toast.error("Somente admin pode agendar comunicados.")
    }

    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      tipo: form.tipo,
      status: form.status,
      prioridade: form.prioridade,
      inicio_em: inicio,
      fim_em: fim,
      dia_inteiro: form.diaInteiro,
      local: form.local.trim() || null,
      precatorio_id: form.precatorioId || null,
      destino: form.destino,
      destinatario_usuario_id: form.destino === "individual" ? form.destinatarioUsuarioId : null,
      enviar_alerta: form.enviarAlerta,
      alerta_antecedencia_min: Math.max(0, Number(form.alertaAntecedenciaMin) || 0),
      disparar_como_comunicado: isAdmin ? form.dispararComoComunicado : false,
      comunicado_titulo: isAdmin && form.dispararComoComunicado ? form.comunicadoTitulo.trim() || null : null,
      comunicado_mensagem: isAdmin && form.dispararComoComunicado ? form.comunicadoMensagem.trim() || null : null,
    }

    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase.from("agenda_eventos").update(payload).eq("id", editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("agenda_eventos").insert([{ ...payload, criado_por: userId }])
        if (error) throw error
      }
      toast.success("Agendamento salvo.")
      setModalOpen(false)
      setEditingId(null)
      setJanelaExecucaoTipo("faixa")
      setForm(defaultForm())
      setCreditSearch("")
      await loadEvents()
    } catch (error) {
      console.error("Erro ao salvar agenda:", error)
      toast.error("Nao foi possivel salvar agendamento.")
    } finally {
      setSaving(false)
    }
  }

  const removeEvent = async (evento: AgendaEvento) => {
    if (!supabase) return
    if (!window.confirm(`Excluir "${evento.titulo}"?`)) return
    const { error } = await supabase.from("agenda_eventos").delete().eq("id", evento.id)
    if (error) return toast.error("Nao foi possivel excluir.")
    toast.success("Agendamento excluido.")
    await loadEvents()
  }

  const setEventStatus = async (evento: AgendaEvento, status: AgendaStatus) => {
    if (!supabase) return
    const { error } = await supabase.from("agenda_eventos").update({ status }).eq("id", evento.id)
    if (error) return toast.error("Nao foi possivel atualizar status.")
    await loadEvents()
  }

  const quickActionActive = form.diaInteiro || form.enviarAlerta || (isAdmin && form.dispararComoComunicado)
  const quickActionButtonClass = (active: boolean) =>
    `min-h-10 font-semibold transition-all data-[hover=true]:-translate-y-px ${
      active
        ? "border-orange-400/70 bg-gradient-to-r from-[#f96b06] to-[#f97316] text-white shadow-[0_8px_18px_-10px_rgba(249,115,22,0.85)] data-[hover=true]:from-[#f45d00] data-[hover=true]:to-[#f96b06] dark:border-orange-300/65 dark:from-[#f97a1f] dark:to-[#f96b06]"
        : "border border-default-200/80"
    }`

  return (
    <div className="space-y-6">
      <Card className={solidCardClassName}>
        <Card.Header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">Agenda e Agendamentos</h1>
            </div>
            <p className="text-sm text-default-500">Compromissos, tarefas, lembretes e comunicados agendados.</p>
          </div>
          <div className="flex gap-2">
            <Button
              radius="full"
              className="px-5"
              variant="secondary"
              onPress={() => void Promise.all([loadEvents(), loadOptions()])}
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button radius="full" className="px-5" color="primary" onPress={() => openCreate(undefined, "", true)}>
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </div>
        </Card.Header>
        <Card.Content className="grid gap-3 md:grid-cols-3">
          {loading ? (
            <>
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </>
          ) : (
            <>
              <div className="rounded-xl border border-default-200/70 p-4">
                <p className="text-xs text-default-500">Eventos no mes</p>
                <p className="text-2xl font-semibold tabular-nums">{monthEvents.length}</p>
              </div>
              <div className="rounded-xl border border-default-200/70 p-4">
                <p className="text-xs text-default-500">Proximos 7 dias</p>
                <p className="text-2xl font-semibold tabular-nums">{nextWeekEvents.length}</p>
              </div>
              <div className="rounded-xl border border-default-200/70 p-4">
                <p className="text-xs text-default-500">Comunicados agendados</p>
                <p className="text-2xl font-semibold tabular-nums">{monthEvents.filter((item) => item.disparar_como_comunicado).length}</p>
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      <Card className={solidCardClassName}>
        <Card.Content className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField
            className="min-w-0"
            placeholder="Titulo, descricao ou local..."
            value={search}
            onChange={setSearch}
          >
            <Label className="text-xs font-medium text-default-600">Busca</Label>
            <InputGroup>
              <InputGroup.Prefix>
                <Search className="h-4 w-4 text-default-400" />
              </InputGroup.Prefix>
              <InputGroup.Input />
            </InputGroup>
          </TextField>

          <Select
            className="w-full"
            placeholder="Selecione o status"
            value={statusFilter}
            onChange={(key) => setStatusFilter(String(key) || "todos")}
          >
            <Label className="text-xs font-medium text-default-600">Status</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="todos" textValue="Todos">Todos</ListBox.Item>
                {AGENDA_STATUS_OPTIONS.map((item) => (
                  <ListBox.Item key={item.key} id={item.key} textValue={item.label}>
                    {item.label}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            className="w-full"
            placeholder="Selecione o tipo"
            value={tipoFilter}
            onChange={(key) => setTipoFilter(String(key) || "todos")}
          >
            <Label className="text-xs font-medium text-default-600">Tipo</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="todos" textValue="Todos">Todos</ListBox.Item>
                {AGENDA_TIPO_OPTIONS.map((item) => (
                  <ListBox.Item key={item.key} id={item.key} textValue={item.label}>
                    {item.label}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <div className="flex min-h-11 items-center rounded-2xl border border-default-200/80 bg-background dark:bg-muted px-3">
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.14 }} className="w-full">
              <Button
                radius="full"
                className="w-full justify-start px-4"
                variant={mineOnly ? "solid" : "secondary"}
                color={mineOnly ? "warning" : "default"}
                onPress={() => setMineOnly((prev) => !prev)}
              >
                <Filter className="h-4 w-4" />
                Somente meus
              </Button>
            </motion.div>
          </div>
        </Card.Content>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card className={solidCardClassName}>
          <Card.Header className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Calendario mensal</h2>
              <p className="text-xs text-default-500">Selecione o dia para ver seus eventos.</p>
            </div>
          </Card.Header>
          <Card.Content className="space-y-2 flex justify-center p-4">
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div onDoubleClick={handleCalendarWrapperDoubleClick} className="w-full">
              <HeroCalendar
                aria-label="Event date"
                value={parseDate(format(day, "yyyy-MM-dd"))}
                focusedValue={parseDate(format(month, "yyyy-MM-dd"))}
                onFocusChange={(newFocus: any) => {
                  const jsDate = newFocus.toDate(getLocalTimeZone())
                  setMonth(startOfMonth(jsDate))
                }}
                onChange={(newDate: any) => {
                  const jsDate = newDate.toDate(getLocalTimeZone())
                  setDay(startOfDay(jsDate))
                  setMonth(startOfMonth(jsDate))
                }}
                className={`${agendaCalendarFont.className} w-full h-full min-w-full rounded-2xl border bg-background/95 dark:bg-muted/95 shadow-sm`}
              >
                <HeroCalendar.Header className="px-4 py-2 border-b bg-default-50/50">
                  <HeroCalendar.Heading className="text-sm font-semibold tracking-wide" />
                  <div className="flex gap-1">
                    <HeroCalendar.NavButton slot="previous" />
                    <HeroCalendar.NavButton slot="next" />
                  </div>
                </HeroCalendar.Header>
                <HeroCalendar.Grid className="p-2">
                  <HeroCalendar.GridHeader>
                    {(dayParam: any) => (
                      <HeroCalendar.HeaderCell className="text-default-400 font-medium">
                        <span
                          className={isSundayWeekLabel(String(dayParam)) ? sundayHeaderClassName : ""}
                        >
                          {dayParam}
                        </span>
                      </HeroCalendar.HeaderCell>
                    )}
                  </HeroCalendar.GridHeader>
                  <HeroCalendar.GridBody>
                    {(dateParam: any) => {
                      const isSunday = isSundayCalendarValue(dateParam)
                      const dateStr = dateParam.toString()
                      return (
                        <HeroCalendar.Cell
                          date={dateParam}
                          data-date={dateStr}
                          className={`${calendarCellClassName} ${isSunday ? sundayCellClassName : ""}`}
                        >
                          {(cellValues: any) => {
                            const isOutsideMonth = Boolean(cellValues?.isOutsideMonth)
                            const dayTextClass = isSunday
                              ? "text-danger"
                              : isOutsideMonth
                                ? "text-default-400"
                                : "text-foreground"

                            return (
                              <span className={`inline-flex h-full w-full items-center justify-center text-sm font-extrabold leading-none ${dayTextClass}`}>
                                {cellValues?.formattedDate}
                              </span>
                            )
                          }}
                        </HeroCalendar.Cell>
                      )
                    }}
                  </HeroCalendar.GridBody>
                </HeroCalendar.Grid>
              </HeroCalendar>
            </div>
            <p className="px-1 text-xs text-default-500">Dica: clique para selecionar o dia; duplo clique abre o agendamento com a data preenchida.</p>
          </Card.Content>
        </Card>

        <Card className={solidCardClassName}>
          <Card.Header className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Dia {format(day, "dd/MM/yyyy")}</h2>
              <p className="text-xs text-default-500">{selectedDayEvents.length} item(ns)</p>
            </div>
            <Button radius="full" className="px-4" size="sm" color="primary" onPress={() => openCreate(undefined, "", true)}>
              <Plus className="h-4 w-4" />
              Agendar
            </Button>
          </Card.Header>
          <Card.Content className="space-y-2">
            {selectedDayEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-default-500">Nenhum item neste dia.</div>
            ) : null}
            {selectedDayEvents.map((evento) => (
              <div key={evento.id} className="rounded-xl border border-default-200/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{evento.titulo}</p>
                    <p className="text-xs text-default-500">{periodLabel(evento)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Chip size="sm" color={statusColor[evento.status]}>{AGENDA_STATUS_LABELS[evento.status]}</Chip>
                    <Chip size="sm" color={prioridadeColor[evento.prioridade]} variant="dot">{AGENDA_PRIORIDADE_LABELS[evento.prioridade]}</Chip>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip size="sm" variant="flat">{AGENDA_DESTINO_LABELS[evento.destino]}</Chip>
                  {evento.enviar_alerta ? <Chip size="sm" variant="soft"><BellAlert className="h-3.5 w-3.5" /><Chip.Label>Alerta {evento.alerta_antecedencia_min}m</Chip.Label></Chip> : null}
                  {evento.disparar_como_comunicado ? <Chip size="sm" color="warning" variant="soft"><Mail className="h-3.5 w-3.5" /><Chip.Label>Comunicado</Chip.Label></Chip> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button radius="full" className="px-4" size="sm" variant="secondary" onPress={() => openEdit(evento)}>
                    <Edit3 className="h-4 w-4" />
                    Editar
                  </Button>
                  {evento.precatorio_id ? <Button radius="full" className="px-4" size="sm" variant="secondary" onPress={() => router.push(`/precatorios/detalhes?id=${evento.precatorio_id}`)}>Abrir credito</Button> : null}
                  {evento.status !== "concluido" ? (
                    <Button radius="full" className="px-4" size="sm" color="success" variant="ghost" onPress={() => void setEventStatus(evento, "concluido")}>
                      <CheckCircle className="h-4 w-4" />
                      Concluir
                    </Button>
                  ) : null}
                  {evento.status !== "cancelado" ? (
                    <Button radius="full" className="px-4" size="sm" color="danger" variant="ghost" onPress={() => void setEventStatus(evento, "cancelado")}>
                      <XCircle className="h-4 w-4" />
                      Cancelar
                    </Button>
                  ) : null}
                  <Button radius="full" className="px-4" size="sm" color="danger" variant="ghost" onPress={() => void removeEvent(evento)}>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>
      </div>

      <Card className={solidCardClassName}>
        <Card.Header>
          <h2 className="font-semibold">Proximos compromissos</h2>
        </Card.Header>
        <Separator />
        <Card.Content className="space-y-2">
          {nextWeekEvents.length === 0 ? <p className="text-sm text-default-500">Sem compromissos para os proximos 7 dias.</p> : null}
          {nextWeekEvents.slice(0, 12).map((evento) => (
            <button
              key={evento.id}
              type="button"
              className="rounded-xl border border-default-200/70 p-3 text-left hover:bg-default-50"
              onClick={() => {
                const target = new Date(evento.inicio_em)
                setDay(startOfDay(target))
                setMonth(startOfMonth(target))
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{evento.titulo}</p>
                <Chip size="sm" color={statusColor[evento.status]} variant="flat">{AGENDA_STATUS_LABELS[evento.status]}</Chip>
              </div>
              <p className="mt-1 text-xs text-default-500">{periodLabel(evento)}</p>
            </button>
          ))}
        </Card.Content>
      </Card>

      <Modal
        isOpen={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setCreditSearch("")
        }}
      >
        <Modal.Backdrop className="bg-black/60 backdrop-blur-[3px] supports-[backdrop-filter]:bg-black/45">
          <Modal.Container placement="center" size="3xl" className="px-3 sm:px-6">
            <Modal.Dialog className="sm:max-w-4xl overflow-hidden rounded-[2rem] border border-default-300/65 bg-[#e9e1d6] shadow-[0_30px_90px_-45px_hsl(var(--primary)/0.6)] outline-none dark:border-default-200/70 dark:bg-[#171b23]">
              {({ close }) => (
                <>
                  <Modal.CloseTrigger className="absolute right-5 top-5 z-20 rounded-full border border-default-300/65 bg-[#ece8e1]/95 text-foreground shadow-sm backdrop-blur hover:bg-[#e5e0d7] dark:border-default-200/70 dark:bg-muted/85 dark:hover:bg-default-200/10" />

                  <Modal.Header className="relative overflow-hidden border-b border-default-300/65 bg-transparent px-6 pb-5 pt-7 sm:px-8 dark:border-default-200/70">
                    <Modal.Icon className="mb-3 size-11 rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                      <Calendar className="size-5" />
                    </Modal.Icon>
                    <Modal.Heading className="text-2xl font-black tracking-tight text-foreground">
                      {editingId ? "Editar agendamento" : "Novo agendamento"}
                    </Modal.Heading>
                    <p className="mt-2 max-w-2xl text-sm leading-5 font-medium text-default-600 dark:text-default-400">
                      Preencha os detalhes abaixo para organizar seu compromisso.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Chip size="sm" variant="flat" color="warning" className="border border-warning/30 font-semibold">
                        Agenda inteligente
                      </Chip>
                      <Chip size="sm" variant="flat" color="default" className="border border-default-200/80 font-semibold">
                        Fluxo operacional
                      </Chip>
                      {isAdmin ? (
                        <Chip size="sm" variant="flat" color="primary" className="border border-primary/30 font-semibold">
                          Perfil administrador
                        </Chip>
                      ) : null}
                    </div>
                  </Modal.Header>

                  <Modal.Body className="max-h-[70vh] overflow-y-auto bg-transparent px-4 pb-6 pt-5 sm:px-8">
                    <Surface variant="default" className="flex flex-col gap-6 rounded-[1.75rem] border border-default-300/65 bg-gradient-to-b from-[#eee8de]/72 via-[#e8ecf3]/58 to-[#ece4d9]/45 p-5 shadow-inner dark:border-default-200/70 dark:from-black/35 dark:via-black/25 dark:to-black/15 sm:p-6">
                      <div
                        className={`rounded-2xl border p-4 transition-colors ${
                          quickActionActive
                            ? "border-orange-300/75 bg-orange-100/70 dark:border-orange-400/45 dark:bg-orange-500/12"
                            : "border-default-300/65 bg-[#f8f4ee] dark:border-default-200/70 dark:bg-muted/70"
                        }`}
                      >
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80">Dados principais</p>
                        <div className="grid gap-4 md:grid-cols-2">
                        {/* @ts-expect-error componente HeroUI sem tipos completos */}
                        <TextField
                          className="w-full"
                          placeholder="Ex.: Reunião..."
                          value={form.titulo}
                          onChange={(value: string) => setForm((prev) => ({ ...prev, titulo: value }))}
                        >
                          <Label className="text-xs font-bold uppercase tracking-wider text-[#6f5a45] dark:text-default-300">Titulo</Label>
                          <Input />
                        </TextField>
                        {/* @ts-expect-error componente HeroUI sem tipos completos */}
                        <TextField
                          className="w-full"
                          placeholder="Ex.: Meet / Sala 2"
                          value={form.local}
                          onChange={(value: string) => setForm((prev) => ({ ...prev, local: value }))}
                        >
                          <Label className="text-xs font-bold uppercase tracking-wider text-[#6f5a45] dark:text-default-300">Local</Label>
                          <Input />
                        </TextField>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-2xl border border-default-300/65 bg-[#f8f4ee] p-4 dark:border-default-200/70 dark:bg-muted/70">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80">Descrição</Label>
                        <UiTextarea
                          className="min-h-[100px] rounded-xl border border-default-200/70 bg-default-100/55 text-sm ring-0 transition-all focus-visible:ring-1 focus-visible:ring-primary/30 dark:bg-default-100/10"
                          placeholder="Detalhes extras..."
                          value={form.descricao}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, descricao: sanitizeTextareaValue(event.target.value) }))
                          }
                        />
                      </div>

                      <div className="rounded-2xl border border-default-300/65 bg-[#f8f4ee] p-4 dark:border-default-200/70 dark:bg-muted/70">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80">Classificação</p>
                        <div className="grid gap-6 md:grid-cols-2">
                        <Select
                          className="w-full"
                          placeholder="Tipo"
                          value={form.tipo}
                          onChange={(key) => setForm((prev) => ({ ...prev, tipo: (String(key) as AgendaTipo) || "lembrete" }))}
                        >
                          <Label className="text-xs font-semibold uppercase tracking-wider text-default-500">Tipo</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {AGENDA_TIPO_OPTIONS.map((item) => (
                                <ListBox.Item key={item.key} id={item.key} textValue={item.label}>
                                  {item.label}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>

                        <Select
                          className="w-full"
                          placeholder="Status"
                          value={form.status}
                          onChange={(key) => setForm((prev) => ({ ...prev, status: (String(key) as AgendaStatus) || "agendado" }))}
                        >
                          <Label className="text-xs font-semibold uppercase tracking-wider text-default-500">Status</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {AGENDA_STATUS_OPTIONS.map((item) => (
                                <ListBox.Item key={item.key} id={item.key} textValue={item.label}>
                                  {item.label}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>

                        <Select
                          className="w-full"
                          placeholder="Prioridade"
                          value={form.prioridade}
                          onChange={(key) => setForm((prev) => ({ ...prev, prioridade: (String(key) as AgendaPrioridade) || "media" }))}
                        >
                          <Label className="text-xs font-semibold uppercase tracking-wider text-default-500">Prioridade</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {AGENDA_PRIORIDADE_OPTIONS.map((item) => (
                                <ListBox.Item key={item.key} id={item.key} textValue={item.label}>
                                  {item.label}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>

                        <Select
                          className="w-full"
                          placeholder="Destino"
                          isDisabled={!canManageTargets}
                          value={form.destino}
                          onChange={(key) => {
                            const next = (String(key) as AgendaDestino) || "pessoal"
                            setForm((prev) => ({
                              ...prev,
                              destino: canManageTargets ? next : "pessoal",
                              destinatarioUsuarioId: next === "individual" ? prev.destinatarioUsuarioId : "",
                            }))
                          }}
                        >
                          <Label className="text-xs font-semibold uppercase tracking-wider text-default-500">Destino</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {AGENDA_DESTINO_OPTIONS.filter((item) => canManageTargets || item.key === "pessoal").map((item) => (
                                <ListBox.Item key={item.key} id={item.key} textValue={item.label}>
                                  {item.label}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-default-300/65 bg-[#f8f4ee] p-4 dark:border-default-200/70 dark:bg-muted/70">
                        <div className="mb-4 flex items-start gap-3">
                          <div className="mt-0.5 inline-flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                            <Calendar className="size-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80">Janela de execução</p>
                            <p className="text-xs text-default-500">
                              {janelaExecucaoTipo === "faixa"
                                ? "Defina início e fim com precisão operacional."
                                : "Defina uma data fixa para o agendamento."}
                            </p>
                          </div>
                        </div>
                        <div className="mb-4 flex flex-wrap gap-2">
                          <Button
                            radius="full"
                            size="sm"
                            className="min-h-9 border border-default-200/80 font-semibold"
                            variant={janelaExecucaoTipo === "fixa" ? "solid" : "flat"}
                            color={janelaExecucaoTipo === "fixa" ? "primary" : "default"}
                            onPress={() => setJanelaExecucaoTipo("fixa")}
                          >
                            Data fixa
                          </Button>
                          <Button
                            radius="full"
                            size="sm"
                            className="min-h-9 border border-default-200/80 font-semibold"
                            variant={janelaExecucaoTipo === "faixa" ? "solid" : "flat"}
                            color={janelaExecucaoTipo === "faixa" ? "primary" : "default"}
                            onPress={() => {
                              setJanelaExecucaoTipo("faixa")
                              setForm((prev) => {
                                if (prev.fimEm) return prev
                                const base = prev.inicioEm || defaultForm().inicioEm
                                const next = shiftLocalByUnits(base, { minutes: 60 })
                                if (!next) return prev
                                return { ...prev, fimEm: prev.diaInteiro ? `${next.split("T")[0]}T23:59:59` : next }
                              })
                            }}
                          >
                            Faixa de data
                          </Button>
                        </div>
                        <div className={`grid gap-6 ${janelaExecucaoTipo === "faixa" ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                        <DatePicker
                          className="w-full"
                          granularity={form.diaInteiro ? "day" : "minute"}
                          hideTimeZone={true}
                          hourCycle={24}
                          shouldForceLeadingZeros={true}
                          value={parseDateFieldValue(form.inicioEm, form.diaInteiro)}
                          onChange={(val: DateValue | null) => {
                            if (!val) {
                              setForm((prev) => ({ ...prev, inicioEm: "" }))
                              return
                            }
                            if (form.diaInteiro) {
                              setForm((prev) => ({ ...prev, inicioEm: `${val.toString()}T00:00:00` }))
                              return
                            }
                            const normalized = dateValueToLocal(val)
                            setForm((prev) => ({ ...prev, inicioEm: normalized || prev.inicioEm }))
                          }}
                        >
                          <Label className="text-xs font-semibold uppercase tracking-wider text-default-500">
                            {janelaExecucaoTipo === "faixa" ? "Inicio" : "Data"}
                          </Label>
                          <DateField.Group fullWidth variant="secondary">
                            <DateField.Input>
                              {(segment) => <DateField.Segment segment={segment} />}
                            </DateField.Input>
                            <DateField.Suffix>
                              <DatePicker.Trigger>
                                <DatePicker.TriggerIndicator />
                              </DatePicker.Trigger>
                            </DateField.Suffix>
                          </DateField.Group>
                          <DatePicker.Popover className="w-[280px] rounded-2xl border border-default-300/65 bg-[#f8f4ee] p-2 shadow-xl dark:border-default-200/70 dark:bg-[#1a1f28]">
                            <HeroCalendar aria-label="Escolher inicio" className="w-full rounded-xl border border-default-300/60 bg-[#faf7f2] p-1 dark:border-default-200/60 dark:bg-[#111722]">
                              <HeroCalendar.Header>
                                <HeroCalendar.YearPickerTrigger>
                                  <HeroCalendar.YearPickerTriggerHeading />
                                  <HeroCalendar.YearPickerTriggerIndicator />
                                </HeroCalendar.YearPickerTrigger>
                                <HeroCalendar.NavButton slot="previous" />
                                <HeroCalendar.NavButton slot="next" />
                              </HeroCalendar.Header>
                              <HeroCalendar.Grid>
                                <HeroCalendar.GridHeader>
                                  {(day) => <HeroCalendar.HeaderCell>{day}</HeroCalendar.HeaderCell>}
                                </HeroCalendar.GridHeader>
                                <HeroCalendar.GridBody>
                                  {(date) => <HeroCalendar.Cell date={date} />}
                                </HeroCalendar.GridBody>
                              </HeroCalendar.Grid>
                              <HeroCalendar.YearPickerGrid>
                                <HeroCalendar.YearPickerGridBody>
                                  {({ year }) => <HeroCalendar.YearPickerCell year={year} />}
                                </HeroCalendar.YearPickerGridBody>
                              </HeroCalendar.YearPickerGrid>
                            </HeroCalendar>
                            {!form.diaInteiro ? (
                              <div className="mt-2 flex items-center justify-between rounded-xl border border-default-300/60 bg-[#faf7f2] px-2 py-1.5 dark:border-default-200/60 dark:bg-[#111722]">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  radius="full"
                                  variant="secondary"
                                  className="h-8 w-8 min-w-8"
                                  onPress={() =>
                                    setForm((prev) => {
                                      const next = shiftLocalDateTime(prev.inicioEm, -30)
                                      return { ...prev, inicioEm: next || prev.inicioEm }
                                    })
                                  }
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs font-semibold tabular-nums text-default-700 dark:text-default-200">
                                  {localTimeLabel(form.inicioEm)}
                                </span>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  radius="full"
                                  variant="secondary"
                                  className="h-8 w-8 min-w-8"
                                  onPress={() =>
                                    setForm((prev) => {
                                      const next = shiftLocalDateTime(prev.inicioEm, 30)
                                      return { ...prev, inicioEm: next || prev.inicioEm }
                                    })
                                  }
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : null}
                          </DatePicker.Popover>
                        </DatePicker>

                        {janelaExecucaoTipo === "faixa" ? (
                        <DatePicker
                          className="w-full"
                          granularity={form.diaInteiro ? "day" : "minute"}
                          hideTimeZone={true}
                          hourCycle={24}
                          shouldForceLeadingZeros={true}
                          value={parseDateFieldValue(form.fimEm, form.diaInteiro)}
                          onChange={(val: DateValue | null) => {
                            if (!val) {
                              setForm((prev) => ({ ...prev, fimEm: "" }))
                              return
                            }
                            if (form.diaInteiro) {
                              setForm((prev) => ({ ...prev, fimEm: `${val.toString()}T23:59:59` }))
                              return
                            }
                            const normalized = dateValueToLocal(val)
                            setForm((prev) => ({ ...prev, fimEm: normalized || prev.fimEm }))
                          }}
                        >
                          <Label className="text-xs font-semibold uppercase tracking-wider text-default-500">Fim</Label>
                          <DateField.Group fullWidth variant="secondary">
                            <DateField.Input>
                              {(segment) => <DateField.Segment segment={segment} />}
                            </DateField.Input>
                            <DateField.Suffix>
                              <DatePicker.Trigger>
                                <DatePicker.TriggerIndicator />
                              </DatePicker.Trigger>
                            </DateField.Suffix>
                          </DateField.Group>
                          <DatePicker.Popover className="w-[280px] rounded-2xl border border-default-300/65 bg-[#f8f4ee] p-2 shadow-xl dark:border-default-200/70 dark:bg-[#1a1f28]">
                            <HeroCalendar aria-label="Escolher fim" className="w-full rounded-xl border border-default-300/60 bg-[#faf7f2] p-1 dark:border-default-200/60 dark:bg-[#111722]">
                              <HeroCalendar.Header>
                                <HeroCalendar.YearPickerTrigger>
                                  <HeroCalendar.YearPickerTriggerHeading />
                                  <HeroCalendar.YearPickerTriggerIndicator />
                                </HeroCalendar.YearPickerTrigger>
                                <HeroCalendar.NavButton slot="previous" />
                                <HeroCalendar.NavButton slot="next" />
                              </HeroCalendar.Header>
                              <HeroCalendar.Grid>
                                <HeroCalendar.GridHeader>
                                  {(day) => <HeroCalendar.HeaderCell>{day}</HeroCalendar.HeaderCell>}
                                </HeroCalendar.GridHeader>
                                <HeroCalendar.GridBody>
                                  {(date) => <HeroCalendar.Cell date={date} />}
                                </HeroCalendar.GridBody>
                              </HeroCalendar.Grid>
                              <HeroCalendar.YearPickerGrid>
                                <HeroCalendar.YearPickerGridBody>
                                  {({ year }) => <HeroCalendar.YearPickerCell year={year} />}
                                </HeroCalendar.YearPickerGridBody>
                              </HeroCalendar.YearPickerGrid>
                            </HeroCalendar>
                            {!form.diaInteiro ? (
                              <div className="mt-2 flex items-center justify-between rounded-xl border border-default-300/60 bg-[#faf7f2] px-2 py-1.5 dark:border-default-200/60 dark:bg-[#111722]">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  radius="full"
                                  variant="secondary"
                                  className="h-8 w-8 min-w-8"
                                  onPress={() =>
                                    setForm((prev) => {
                                      const next = shiftLocalDateTime(prev.fimEm, -30)
                                      return { ...prev, fimEm: next || prev.fimEm }
                                    })
                                  }
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs font-semibold tabular-nums text-default-700 dark:text-default-200">
                                  {localTimeLabel(form.fimEm)}
                                </span>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  radius="full"
                                  variant="secondary"
                                  className="h-8 w-8 min-w-8"
                                  onPress={() =>
                                    setForm((prev) => {
                                      const next = shiftLocalDateTime(prev.fimEm, 30)
                                      return { ...prev, fimEm: next || prev.fimEm }
                                    })
                                  }
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : null}
                          </DatePicker.Popover>
                        </DatePicker>
                        ) : null}
                        </div>
                      </div>

                      {janelaExecucaoTipo === "faixa" ? (
                      <div className="rounded-2xl border border-default-300/65 bg-[#f8f4ee] p-4 dark:border-default-200/70 dark:bg-muted/70">
                        <div className="mb-3 flex items-start gap-3">
                          <div className="mt-0.5 inline-flex size-8 items-center justify-center rounded-xl border border-default-300/70 bg-default-100/70 text-default-700 dark:border-default-200/60 dark:bg-default-200/15 dark:text-default-200">
                            <ChevronRight className="size-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80">Ajustes de prazo</p>
                            <p className="text-xs text-default-500">Aplique atalhos de duracao para preencher a data final.</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            radius="full"
                            size="sm"
                            variant="secondary"
                            className="min-h-10 border border-default-200/80 font-semibold"
                            onPress={() => {
                              setJanelaExecucaoTipo("faixa")
                              setForm((prev) => {
                                const base = prev.inicioEm || prev.fimEm || defaultForm().inicioEm
                                const next = shiftLocalByUnits(base, { minutes: 30 })
                                if (!next) return prev
                                return { ...prev, fimEm: prev.diaInteiro ? `${next.split("T")[0]}T23:59:59` : next }
                              })
                            }}
                          >
                            Fim +30min
                          </Button>
                          <Button
                            radius="full"
                            size="sm"
                            variant="secondary"
                            className="min-h-10 border border-default-200/80 font-semibold"
                            onPress={() => {
                              setJanelaExecucaoTipo("faixa")
                              setForm((prev) => {
                                const base = prev.inicioEm || prev.fimEm || defaultForm().inicioEm
                                const next = shiftLocalByUnits(base, { minutes: 60 })
                                if (!next) return prev
                                return { ...prev, fimEm: prev.diaInteiro ? `${next.split("T")[0]}T23:59:59` : next }
                              })
                            }}
                          >
                            Fim +1h
                          </Button>
                          <Button
                            radius="full"
                            size="sm"
                            variant="secondary"
                            className="min-h-10 border border-default-200/80 font-semibold"
                            onPress={() => {
                              setJanelaExecucaoTipo("faixa")
                              setForm((prev) => {
                                const base = prev.inicioEm || prev.fimEm || defaultForm().inicioEm
                                const next = shiftLocalByUnits(base, { days: 1 })
                                if (!next) return prev
                                return { ...prev, fimEm: prev.diaInteiro ? `${next.split("T")[0]}T23:59:59` : next }
                              })
                            }}
                          >
                            Fim +1 dia
                          </Button>
                          <Button
                            radius="full"
                            size="sm"
                            variant="secondary"
                            className="min-h-10 border border-default-200/80 font-semibold"
                            onPress={() => {
                              setJanelaExecucaoTipo("faixa")
                              setForm((prev) => {
                                const base = prev.inicioEm || prev.fimEm || defaultForm().inicioEm
                                const next = shiftLocalByUnits(base, { weeks: 1 })
                                if (!next) return prev
                                return { ...prev, fimEm: prev.diaInteiro ? `${next.split("T")[0]}T23:59:59` : next }
                              })
                            }}
                          >
                            Fim +1 semana
                          </Button>
                          <Button
                            radius="full"
                            size="sm"
                            variant="secondary"
                            className="min-h-10 border border-default-200/80 font-semibold"
                            onPress={() => {
                              setJanelaExecucaoTipo("faixa")
                              setForm((prev) => {
                                const base = prev.inicioEm || prev.fimEm || defaultForm().inicioEm
                                const next = shiftLocalByUnits(base, { months: 1 })
                                if (!next) return prev
                                return { ...prev, fimEm: prev.diaInteiro ? `${next.split("T")[0]}T23:59:59` : next }
                              })
                            }}
                          >
                            Fim +1 mes
                          </Button>
                        </div>
                      </div>
                      ) : null}

                      <div className="rounded-2xl border border-default-300/65 bg-[#f8f4ee] p-4 dark:border-default-200/70 dark:bg-muted/70">
                        <div className="mb-4 flex items-start gap-3">
                          <div className="mt-0.5 inline-flex size-8 items-center justify-center rounded-xl border border-warning/30 bg-warning/15 text-warning-600 dark:text-warning-400">
                            <BellAlert className="size-4" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80">Ações rápidas</p>
                            <p className="text-xs text-default-500">Ative comportamentos críticos para este agendamento.</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            radius="full"
                            size="sm"
                            className={quickActionButtonClass(form.diaInteiro)}
                            variant="secondary"
                            onPress={() => setForm((prev) => ({ ...prev, diaInteiro: !prev.diaInteiro }))}
                          >
                            Dia inteiro
                          </Button>
                          <Button
                            radius="full"
                            size="sm"
                            className={quickActionButtonClass(form.enviarAlerta)}
                            variant="secondary"
                            aria-pressed={form.enviarAlerta}
                            onPress={() => setForm((prev) => ({ ...prev, enviarAlerta: !prev.enviarAlerta }))}
                          >
                            Enviar alerta
                          </Button>
                          {isAdmin && (
                            <Button
                              radius="full"
                              size="sm"
                              className={quickActionButtonClass(form.dispararComoComunicado)}
                              variant="secondary"
                              onPress={() => setForm((prev) => ({ ...prev, dispararComoComunicado: !prev.dispararComoComunicado }))}
                            >
                              Comunicado
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-default-300/65 bg-[#f8f4ee] p-4 dark:border-default-200/70 dark:bg-muted/70">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80">Credito vinculado</p>
                        <div className="grid gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-default-500">Crédito Vinculado</Label>
                            <Select
                              className="w-full"
                              placeholder="Selecionar crédito"
                              value={form.precatorioId}
                              onChange={(key) => setForm((prev) => ({ ...prev, precatorioId: String(key) || "" }))}
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <div className="p-2 border-b border-default-100">
                                  <Input
                                    placeholder="Buscar..."
                                    size="sm"
                                    value={creditSearch}
                                    onChange={(e) => setCreditSearch(e.target.value)}
                                  />
                                </div>
                                <ListBox className="max-h-[200px] overflow-y-auto">
                                  {filteredPrecatorios.map((item) => (
                                    <ListBox.Item key={item.id} id={item.id} textValue={item.label}>
                                      {item.label}
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {form.destino === "individual" && (
                        <div className="rounded-2xl border border-default-300/65 bg-[#f8f4ee] p-4 dark:border-default-200/70 dark:bg-muted/70">
                          <Select
                            className="w-full"
                            placeholder="Selecione destinatário"
                            value={form.destinatarioUsuarioId}
                            onChange={(key) => setForm((prev) => ({ ...prev, destinatarioUsuarioId: String(key) || "" }))}
                          >
                            <Label className="text-xs font-semibold uppercase tracking-wider text-default-500">Destinatário Individual</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                {users.map((item) => (
                                  <ListBox.Item key={item.id} id={item.id} textValue={item.nome}>
                                    {item.nome}
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>
                      )}

                      {isAdmin && form.dispararComoComunicado && (
                        <div className="space-y-6 rounded-[2rem] border border-warning-200/80 bg-gradient-to-br from-warning-50/60 to-background p-6 shadow-inner dark:from-warning-500/10 dark:to-default-100/5 sm:p-8">
                          <div className="flex items-center gap-3 text-warning-600">
                            <Mail className="h-5 w-5" />
                            <h3 className="font-bold uppercase tracking-tight text-sm">Configurações do Comunicado</h3>
                          </div>
                          {/* @ts-expect-error componente HeroUI sem tipos completos */}
                          <TextField
                            className="w-full"
                            value={form.comunicadoTitulo}
                            onChange={(value: string) => setForm((prev) => ({ ...prev, comunicadoTitulo: value }))}
                          >
                            <Label className="text-xs font-semibold uppercase tracking-wider text-default-500">Título do Comunicado</Label>
                            <Input placeholder="Assunto do alerta..." />
                          </TextField>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-default-500">Mensagem do Comunicado</Label>
                            <UiTextarea
                              className="min-h-[100px] rounded-2xl bg-white/50 border-warning-100"
                              placeholder="Conteúdo que será enviado aos usuários..."
                              value={form.comunicadoMensagem}
                              onChange={(event) =>
                                setForm((prev) => ({ ...prev, comunicadoMensagem: sanitizeTextareaValue(event.target.value) }))
                              }
                            />
                          </div>
                        </div>
                      )}
                    </Surface>
                  </Modal.Body>

                  <Modal.Footer className="flex items-center justify-end gap-3 border-t border-default-300/65 bg-transparent px-6 pb-6 pt-4 sm:px-8 dark:border-default-200/70">
                    <Button
                      variant="secondary"
                      radius="full"
                      className="h-11 border border-default-300/80 bg-background/75 px-6 font-semibold text-default-700 transition-all data-[hover=true]:-translate-y-px data-[hover=true]:bg-default-100 dark:bg-muted/70"
                      onPress={close}
                    >
                      Cancelar
                    </Button>
                    <Button
                      radius="full"
                      className="h-11 bg-gradient-to-r from-primary to-orange-500 px-10 font-bold text-white shadow-[0_14px_30px_-14px_hsl(var(--primary)/0.95)] transition-all data-[hover=true]:-translate-y-px data-[hover=true]:from-primary/90 data-[hover=true]:to-orange-500/90"
                      isLoading={saving}
                      onPress={() => void saveEvent()}
                    >
                      Salvar Agendamento
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal >
    </div >
  )
}
