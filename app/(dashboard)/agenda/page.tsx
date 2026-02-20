"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Key } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  addDays,
  addHours,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
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
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Skeleton,
} from "@heroui/react"
import { Textarea as UiTextarea } from "@/components/ui/textarea"

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

const inputClassNames = {
  inputWrapper: "rounded-2xl min-h-11 border border-default-200/80 bg-background dark:bg-muted",
}

const textareaInputClassName =
  "min-h-[92px] rounded-2xl border-default-200/80 bg-background text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap focus-visible:ring-warning-400/60 focus-visible:ring-offset-0 dark:bg-muted"

const selectClassNames = {
  trigger: "rounded-2xl min-h-11 border border-default-200/80 bg-background dark:bg-muted",
  popoverContent:
    "rounded-2xl border border-default-200/80 bg-background/95 dark:bg-muted backdrop-blur-md shadow-xl",
}

const solidCardClassName = "rounded-2xl border border-default-200/80 bg-background dark:bg-muted shadow-sm"

const toKey = (keys: "all" | Set<Key>) => {
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
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, "0")
  const d = `${date.getDate()}`.padStart(2, "0")
  const h = `${date.getHours()}`.padStart(2, "0")
  const min = `${date.getMinutes()}`.padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}`
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

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const selectedDayEvents = useMemo(() => filtered.filter((item) => eventInDay(item, day)), [day, filtered])
  const monthEvents = useMemo(() => filtered.filter((item) => isSameMonth(new Date(item.inicio_em), month)), [filtered, month])
  const nextWeekEvents = useMemo(() => {
    const now = new Date()
    const end = addDays(now, 7)
    return filtered.filter((item) => {
      const date = new Date(item.inicio_em)
      return !Number.isNaN(date.getTime()) && !isBefore(date, now) && isBefore(date, end)
    })
  }, [filtered])

  const openCreate = (baseDay?: Date, prelinkedPrecatorioId = "") => {
    const ref = baseDay ? addHours(startOfDay(baseDay), 9) : new Date()
    const nextForm = defaultForm(ref)
    if (prelinkedPrecatorioId) {
      nextForm.precatorioId = prelinkedPrecatorioId
    }
    setEditingId(null)
    setForm(nextForm)
    setCreditSearch("")
    setModalOpen(true)
  }

  const openEdit = (evento: AgendaEvento) => {
    setEditingId(evento.id)
    setForm({
      titulo: evento.titulo,
      descricao: sanitizeTextareaValue(evento.descricao || ""),
      tipo: evento.tipo,
      status: evento.status,
      prioridade: evento.prioridade,
      inicioEm: fromIso(evento.inicio_em),
      fimEm: fromIso(evento.fim_em),
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
    setForm(nextForm)
    setCreditSearch("")
    setModalOpen(true)
  }, [linkedPrecatorioParam, shouldOpenCreateFromParam])

  const saveEvent = async () => {
    if (!supabase || !userId) return
    if (!form.titulo.trim()) return toast.error("Informe o titulo.")

    const inicio = toIso(form.inicioEm, form.diaInteiro)
    const fim = form.fimEm ? toIso(form.fimEm, form.diaInteiro, true) : null
    if (!inicio) return toast.error("Informe a data de inicio.")

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

  return (
    <div className="space-y-6">
      <Card className={solidCardClassName}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              variant="flat"
              onClick={() => void Promise.all([loadEvents(), loadOptions()])}
              startContent={<RefreshCw className="h-4 w-4" />}
            >
              Atualizar
            </Button>
            <Button radius="full" className="px-5" color="primary" onClick={() => openCreate()} startContent={<Plus className="h-4 w-4" />}>
              Novo
            </Button>
          </div>
        </CardHeader>
        <CardBody className="grid gap-3 md:grid-cols-3">
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
        </CardBody>
      </Card>

      <Card className={solidCardClassName}>
        <CardBody className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-default-600">Busca</p>
            <Input
              className="w-full"
              classNames={inputClassNames}
              placeholder="Titulo, descricao ou local..."
              value={search}
              onValueChange={setSearch}
              startContent={<Search className="h-4 w-4 text-default-400" />}
            />
          </div>

          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-default-600">Status</p>
            <Select
              className="w-full"
              classNames={selectClassNames}
              selectedKeys={new Set([statusFilter])}
              onSelectionChange={(keys) => setStatusFilter(toKey(keys) || "todos")}
            >
              <SelectItem key="todos">Todos</SelectItem>
              {AGENDA_STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.key}>{item.label}</SelectItem>
              ))}
            </Select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-medium text-default-600">Tipo</p>
            <Select
              className="w-full"
              classNames={selectClassNames}
              selectedKeys={new Set([tipoFilter])}
              onSelectionChange={(keys) => setTipoFilter(toKey(keys) || "todos")}
            >
              <SelectItem key="todos">Todos</SelectItem>
              {AGENDA_TIPO_OPTIONS.map((item) => (
                <SelectItem key={item.key}>{item.label}</SelectItem>
              ))}
            </Select>
          </div>

          <div className="flex min-h-11 items-center rounded-2xl border border-default-200/80 bg-background dark:bg-muted px-3">
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.14 }} className="w-full">
              <Button
                radius="full"
                className="w-full justify-start px-4"
                variant={mineOnly ? "solid" : "bordered"}
                color={mineOnly ? "warning" : "default"}
                startContent={<Filter className="h-4 w-4" />}
                onPress={() => setMineOnly((prev) => !prev)}
              >
                Somente meus
              </Button>
            </motion.div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card className={solidCardClassName}>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Calendario mensal</h2>
              <p className="text-xs text-default-500">Duplo clique no dia para criar.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button radius="full" isIconOnly variant="light" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <p className="min-w-[170px] text-center text-sm font-medium">{format(month, "MMMM yyyy", { locale: ptBR })}</p>
              <Button radius="full" isIconOnly variant="light" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-2">
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] uppercase text-default-500">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index}>{format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index), "EEE", { locale: ptBR })}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((item) => {
                const eventsDay = filtered.filter((evento) => eventInDay(evento, item))
                const active = isSameDay(day, item)
                return (
                  <button
                    key={item.toISOString()}
                    type="button"
                    onClick={() => setDay(startOfDay(item))}
                    onDoubleClick={() => openCreate(item)}
                    className={`min-h-[88px] rounded-xl border p-2 text-left transition ${
                      active
                        ? "border-warning bg-warning-50/90 dark:bg-warning-500/15"
                        : "border-default-200/70 bg-background/95 dark:bg-muted hover:bg-default-50 dark:hover:bg-muted"
                    } ${isSameMonth(item, month) ? "" : "opacity-40"}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span>{format(item, "d")}</span>
                      {eventsDay.length ? <Chip size="sm" variant="flat">{eventsDay.length}</Chip> : null}
                    </div>
                    <div className="mt-1 space-y-1">
                      {eventsDay.slice(0, 2).map((evento) => <p key={evento.id} className="truncate text-[11px]">{evento.titulo}</p>)}
                      {eventsDay.length > 2 ? <p className="text-[11px] text-default-500">+{eventsDay.length - 2}</p> : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardBody>
        </Card>

        <Card className={solidCardClassName}>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Dia {format(day, "dd/MM/yyyy")}</h2>
              <p className="text-xs text-default-500">{selectedDayEvents.length} item(ns)</p>
            </div>
            <Button radius="full" className="px-4" size="sm" color="primary" startContent={<Plus className="h-4 w-4" />} onClick={() => openCreate(day)}>Agendar</Button>
          </CardHeader>
          <CardBody className="space-y-2">
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
                  {evento.enviar_alerta ? <Chip size="sm" variant="flat" startContent={<BellAlert className="h-3.5 w-3.5" />}>Alerta {evento.alerta_antecedencia_min}m</Chip> : null}
                  {evento.disparar_como_comunicado ? <Chip size="sm" color="warning" variant="flat" startContent={<Mail className="h-3.5 w-3.5" />}>Comunicado</Chip> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button radius="full" className="px-4" size="sm" variant="flat" startContent={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(evento)}>Editar</Button>
                  {evento.precatorio_id ? <Button radius="full" className="px-4" size="sm" variant="flat" onClick={() => router.push(`/precatorios/detalhes?id=${evento.precatorio_id}`)}>Abrir credito</Button> : null}
                  {evento.status !== "concluido" ? <Button radius="full" className="px-4" size="sm" color="success" variant="light" startContent={<CheckCircle className="h-4 w-4" />} onClick={() => void setEventStatus(evento, "concluido")}>Concluir</Button> : null}
                  {evento.status !== "cancelado" ? <Button radius="full" className="px-4" size="sm" color="danger" variant="light" startContent={<XCircle className="h-4 w-4" />} onClick={() => void setEventStatus(evento, "cancelado")}>Cancelar</Button> : null}
                  <Button radius="full" className="px-4" size="sm" color="danger" variant="light" startContent={<Trash2 className="h-4 w-4" />} onClick={() => void removeEvent(evento)}>Excluir</Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card className={solidCardClassName}>
        <CardHeader>
          <h2 className="font-semibold">Proximos compromissos</h2>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-2">
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
        </CardBody>
      </Card>

      <Modal
        isOpen={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setCreditSearch("")
        }}
        size="4xl"
        scrollBehavior="inside"
        classNames={{ backdrop: "bg-black/40 backdrop-blur-[1px]" }}
      >
        <ModalContent className="rounded-3xl border border-default-200/80 bg-background dark:bg-muted shadow-2xl">
          {(onClose) => (
            <>
              <ModalHeader className="pb-2">
                {editingId ? "Editar agendamento" : "Novo agendamento"}
              </ModalHeader>
              <ModalBody className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-default-600">Titulo</p>
                    <Input
                      aria-label="Titulo"
                      classNames={inputClassNames}
                      placeholder="Ex.: Reuniao com operador"
                      value={form.titulo}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, titulo: value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-default-600">Local</p>
                    <Input
                      aria-label="Local"
                      classNames={inputClassNames}
                      placeholder="Ex.: Meet / Sala 2"
                      value={form.local}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, local: value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-default-600">Descricao</p>
                  <UiTextarea
                    aria-label="Descricao"
                    className={textareaInputClassName}
                    placeholder="Detalhes do agendamento..."
                    value={form.descricao}
                    rows={4}
                    spellCheck={false}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, descricao: sanitizeTextareaValue(event.target.value) }))
                    }
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-default-600">Tipo</p>
                    <Select
                      aria-label="Tipo"
                      classNames={selectClassNames}
                      selectedKeys={new Set([form.tipo])}
                      onSelectionChange={(keys) =>
                        setForm((prev) => ({ ...prev, tipo: (toKey(keys) as AgendaTipo) || "lembrete" }))
                      }
                    >
                      {AGENDA_TIPO_OPTIONS.map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-default-600">Status</p>
                    <Select
                      aria-label="Status"
                      classNames={selectClassNames}
                      selectedKeys={new Set([form.status])}
                      onSelectionChange={(keys) =>
                        setForm((prev) => ({ ...prev, status: (toKey(keys) as AgendaStatus) || "agendado" }))
                      }
                    >
                      {AGENDA_STATUS_OPTIONS.map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-default-600">Prioridade</p>
                    <Select
                      aria-label="Prioridade"
                      classNames={selectClassNames}
                      selectedKeys={new Set([form.prioridade])}
                      onSelectionChange={(keys) =>
                        setForm((prev) => ({
                          ...prev,
                          prioridade: (toKey(keys) as AgendaPrioridade) || "media",
                        }))
                      }
                    >
                      {AGENDA_PRIORIDADE_OPTIONS.map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-default-600">Destino</p>
                    <Select
                      aria-label="Destino"
                      classNames={selectClassNames}
                      selectedKeys={new Set([form.destino])}
                      isDisabled={!canManageTargets}
                      onSelectionChange={(keys) => {
                        const next = (toKey(keys) as AgendaDestino) || "pessoal"
                        setForm((prev) => ({
                          ...prev,
                          destino: canManageTargets ? next : "pessoal",
                          destinatarioUsuarioId: next === "individual" ? prev.destinatarioUsuarioId : "",
                        }))
                      }}
                    >
                      {AGENDA_DESTINO_OPTIONS.filter((item) => canManageTargets || item.key === "pessoal").map(
                        (item) => (
                          <SelectItem key={item.key}>{item.label}</SelectItem>
                        )
                      )}
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-default-600">Inicio</p>
                    <Input
                      aria-label="Inicio"
                      classNames={inputClassNames}
                      type="datetime-local"
                      value={form.inicioEm}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, inicioEm: value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-default-600">Fim</p>
                    <Input
                      aria-label="Fim"
                      classNames={inputClassNames}
                      type="datetime-local"
                      value={form.fimEm}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, fimEm: value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.14 }}>
                    <Button
                      radius="full"
                      className="w-full justify-start px-4"
                      variant={form.diaInteiro ? "solid" : "bordered"}
                      color={form.diaInteiro ? "primary" : "default"}
                      startContent={<Calendar className="h-4 w-4" />}
                      onClick={() => setForm((prev) => ({ ...prev, diaInteiro: !prev.diaInteiro }))}
                    >
                      Dia inteiro
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.14 }}>
                    <Button
                      radius="full"
                      className="w-full justify-start px-4"
                      variant={form.enviarAlerta ? "solid" : "bordered"}
                      color={form.enviarAlerta ? "primary" : "default"}
                      startContent={<BellAlert className="h-4 w-4" />}
                      onClick={() => setForm((prev) => ({ ...prev, enviarAlerta: !prev.enviarAlerta }))}
                    >
                      Enviar alerta
                    </Button>
                  </motion.div>
                  {isAdmin ? (
                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.14 }}>
                      <Button
                        radius="full"
                        className="w-full justify-start px-4"
                        variant={form.dispararComoComunicado ? "solid" : "bordered"}
                        color={form.dispararComoComunicado ? "primary" : "default"}
                        startContent={<Mail className="h-4 w-4" />}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            dispararComoComunicado: !prev.dispararComoComunicado,
                          }))
                        }
                      >
                        Disparar comunicado
                      </Button>
                    </motion.div>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-default-600">Alerta (min)</p>
                    <Input
                      aria-label="Alerta (min)"
                      classNames={inputClassNames}
                      type="number"
                      min={0}
                      value={String(form.alertaAntecedenciaMin)}
                      isDisabled={!form.enviarAlerta}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          alertaAntecedenciaMin: Math.max(0, Number(value) || 0),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-default-600">Credito vinculado</p>
                      {form.precatorioId ? (
                        <Button
                          radius="full"
                          size="sm"
                          variant="light"
                          className="h-7 min-w-0 px-3 text-xs"
                          onClick={() => setForm((prev) => ({ ...prev, precatorioId: "" }))}
                        >
                          Limpar
                        </Button>
                      ) : null}
                    </div>
                    <Input
                      aria-label="Buscar credito vinculado"
                      classNames={inputClassNames}
                      placeholder="Busque por credor, numero do precatorio ou processo..."
                      value={creditSearch}
                      onValueChange={setCreditSearch}
                      startContent={<Search className="h-4 w-4 text-default-400" />}
                    />
                    <Select
                      aria-label="Credito vinculado"
                      classNames={selectClassNames}
                      placeholder="Selecione um credito"
                      selectedKeys={form.precatorioId ? new Set([form.precatorioId]) : new Set([])}
                      onSelectionChange={(keys) => {
                        const value = toKey(keys) || ""
                        setForm((prev) => ({ ...prev, precatorioId: value }))
                        if (value) setCreditSearch("")
                      }}
                    >
                      {filteredPrecatorios.map((item) => (
                        <SelectItem key={item.id}>{item.label}</SelectItem>
                      ))}
                    </Select>
                    <p className="text-[11px] text-default-500">
                      {creditSearch.trim()
                        ? `${filteredPrecatorios.length} resultado(s) na busca`
                        : `${Math.min(precatorios.length, 120)} de ${precatorios.length} credito(s) exibido(s)`}
                    </p>
                  </div>
                </div>

                {form.destino === "individual" ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-default-600">Destinatario individual</p>
                    <Select
                      aria-label="Destinatario individual"
                      classNames={selectClassNames}
                      selectedKeys={
                        form.destinatarioUsuarioId ? new Set([form.destinatarioUsuarioId]) : new Set([])
                      }
                      onSelectionChange={(keys) =>
                        setForm((prev) => ({ ...prev, destinatarioUsuarioId: toKey(keys) || "" }))
                      }
                    >
                      {users.map((item) => {
                        const roleLabel =
                          item.role.length > 0 ? item.role.join(" / ").replace(/_/g, " ") : "sem cargo"
                        return <SelectItem key={item.id}>{`${item.nome} (${roleLabel})`}</SelectItem>
                      })}
                    </Select>
                  </div>
                ) : null}

                {isAdmin && form.dispararComoComunicado ? (
                  <div className="space-y-3 rounded-xl border border-warning-300/50 bg-warning-50/40 p-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-default-600">Titulo do comunicado</p>
                      <Input
                        aria-label="Titulo do comunicado"
                        classNames={inputClassNames}
                        value={form.comunicadoTitulo}
                        onValueChange={(value) =>
                          setForm((prev) => ({ ...prev, comunicadoTitulo: value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-default-600">Mensagem do comunicado</p>
                      <UiTextarea
                        aria-label="Mensagem do comunicado"
                        className={textareaInputClassName}
                        rows={4}
                        value={form.comunicadoMensagem}
                        spellCheck={false}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, comunicadoMensagem: sanitizeTextareaValue(event.target.value) }))
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </ModalBody>
              <ModalFooter>
                <Button radius="full" className="px-5" variant="flat" onClick={() => { setModalOpen(false); setEditingId(null); setForm(defaultForm()); setCreditSearch(""); onClose() }}>Cancelar</Button>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} transition={{ duration: 0.15 }}>
                  <Button radius="full" className="px-6 font-semibold shadow-sm" color="primary" onClick={() => void saveEvent()} isLoading={saving}>Salvar</Button>
                </motion.div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
