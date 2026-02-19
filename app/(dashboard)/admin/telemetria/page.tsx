
"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Lock,
  PieChart as PieIcon,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react"
import { RoleGuard } from "@/lib/auth/role-guard"
import { getSupabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
} from "recharts"

interface TelemetryUser {
  nome: string | null
  email: string | null
  role: string[] | null
}

interface TelemetryEventRow {
  id: string
  user_id: string
  session_id: string
  event_type: string
  source: "web" | "tauri" | "hybrid"
  event_data: Record<string, unknown> | null
  occurred_at: string
  usuario: TelemetryUser | null
}

interface TelemetryUserOption {
  userId: string
  label: string
  email: string | null
  eventsCount: number
}

type RangeKey = "24h" | "7d" | "30d" | "all"

const EVENT_LABELS: Record<string, string> = {
  session_started: "Sessão iniciada",
  activity_ping: "Atividade",
  idle_started: "Inatividade iniciada",
  idle_ended: "Inatividade encerrada",
  window_blurred: "Perdeu foco",
  window_focused: "Em foco",
  window_hidden: "Janela oculta",
  window_visible: "Janela visível",
  window_minimized: "Minimizado",
  window_restored: "Restaurado",
  session_locked: "Sessão bloqueada",
  session_unlocked: "Sessão desbloqueada",
  reauth_failed: "Falha na senha",
  session_ended: "Sessão encerrada",
}

const RANGE_LABELS: Record<RangeKey, string> = {
  "24h": "Últimas 24 horas",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  all: "Tudo carregado",
}

const SOURCE_LABELS: Record<TelemetryEventRow["source"], string> = {
  web: "Web",
  tauri: "Desktop (Tauri)",
  hybrid: "Híbrido",
}

const TELEMETRY_SELECT =
  "id, user_id, session_id, event_type, source, event_data, occurred_at, usuario:usuarios(nome, email, role)"
const TELEMETRY_PAGE_SIZE = 500
const TELEMETRY_MAX_ROWS = 5000
const RECENT_EVENTS_PAGE_SIZE_OPTIONS = [20, 50, 100] as const

function normalizeUser(raw: unknown): TelemetryUser | null {
  if (!raw) return null
  if (Array.isArray(raw)) return normalizeUser(raw[0])
  if (typeof raw !== "object") return null

  const value = raw as Record<string, unknown>
  return {
    nome: typeof value.nome === "string" ? value.nome : null,
    email: typeof value.email === "string" ? value.email : null,
    role: Array.isArray(value.role) ? value.role.filter((r): r is string => typeof r === "string") : null,
  }
}

function formatEventLabel(eventType: string) {
  return EVENT_LABELS[eventType] ?? eventType
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR")
}

function compactPayload(value: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) return "-"
  const raw = JSON.stringify(value)
  if (raw.length <= 140) return raw
  return `${raw.slice(0, 137)}...`
}

function safeMs(iso: string) {
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "-"
  const s = Math.round(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${ss}s`
  return `${ss}s`
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function pickBadgeVariant(eventType: string) {
  if (eventType === "session_locked" || eventType === "reauth_failed") return "destructive"
  if (eventType === "idle_started" || eventType === "window_blurred" || eventType === "window_hidden" || eventType === "window_minimized")
    return "outline"
  return "secondary"
}

function riskLabel(score: number) {
  if (score >= 12) return { text: "Alto", variant: "destructive" as const }
  if (score >= 6) return { text: "Médio", variant: "secondary" as const }
  return { text: "Baixo", variant: "outline" as const }
}

type TimeBucket = {
  ts: number
  label: string
  total: number
  activity: number
  idle: number
  locks: number
  reauth: number
}

function buildTimeSeries(events: TelemetryEventRow[], rangeKey: RangeKey) {
  if (events.length === 0) return []

  const msList = events.map((e) => safeMs(e.occurred_at)).filter((v): v is number => v !== null)
  const minMs = Math.min(...msList)
  const maxMs = Math.max(...msList)
  const spanMs = maxMs - minMs

  // Granularidade: hora para janelas menores / dia para janelas maiores
  const byHour = rangeKey === "24h" || spanMs <= 48 * 60 * 60 * 1000

  const buckets = new Map<number, TimeBucket>()

  const bucketStart = (ms: number) => {
    const d = new Date(ms)
    if (byHour) {
      d.setMinutes(0, 0, 0)
    } else {
      d.setHours(0, 0, 0, 0)
    }
    return d.getTime()
  }

  for (const e of events) {
    const ms = safeMs(e.occurred_at)
    if (ms === null) continue
    const key = bucketStart(ms)

    const b =
      buckets.get(key) ??
      ({
        ts: key,
        label: "",
        total: 0,
        activity: 0,
        idle: 0,
        locks: 0,
        reauth: 0,
      } satisfies TimeBucket)

    b.total += 1
    if (e.event_type === "activity_ping") b.activity += 1
    if (e.event_type === "idle_started") b.idle += 1
    if (e.event_type === "session_locked") b.locks += 1
    if (e.event_type === "reauth_failed") b.reauth += 1

    buckets.set(key, b)
  }

  const arr = Array.from(buckets.values()).sort((a, b) => a.ts - b.ts)
  for (const item of arr) {
    const d = new Date(item.ts)
    item.label = byHour
      ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit" }).replace(", ", " ")
      : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  }
  return arr
}

function countByKey<T extends string>(arr: T[]) {
  const m = new Map<string, number>()
  for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1)
  return m
}

type SessionAgg = {
  session_id: string
  user_id: string
  user_label: string
  email: string | null
  source: TelemetryEventRow["source"]
  started_at_ms: number
  ended_at_ms: number
  duration_ms: number
  idle_ms: number
  idle_pct: number
  locks: number
  reauth_failed: number
  focus_lost: number
  minimized_or_hidden: number
  risk_score: number
  last_event_type: string
}

function buildSessions(events: TelemetryEventRow[]): SessionAgg[] {
  const bySession = new Map<string, TelemetryEventRow[]>()

  for (const e of events) {
    if (!e.session_id) continue
    const list = bySession.get(e.session_id) ?? []
    list.push(e)
    bySession.set(e.session_id, list)
  }

  const sessions: SessionAgg[] = []

  for (const [sessionId, list] of bySession.entries()) {
    const sorted = list
      .slice()
      .map((e) => ({ e, ms: safeMs(e.occurred_at) }))
      .filter((x): x is { e: TelemetryEventRow; ms: number } => x.ms !== null)
      .sort((a, b) => a.ms - b.ms)

    if (sorted.length === 0) continue

    const first = sorted[0].e
    const last = sorted[sorted.length - 1].e

    const startedAt = sorted[0].ms
    // Se houver session_ended, use como fim; se não, use último evento
    let endedAt = sorted[sorted.length - 1].ms
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].e.event_type === "session_ended") {
        endedAt = sorted[i].ms
        break
      }
    }

    const durationMs = Math.max(0, endedAt - startedAt)

    // Idle pairing: idle_started -> idle_ended
    let idleMs = 0
    let idleStart: number | null = null

    let locks = 0
    let reauth = 0
    let focusLost = 0
    let minimizedOrHidden = 0

    const sourceCounts = new Map<TelemetryEventRow["source"], number>()
    for (const { e, ms } of sorted) {
      sourceCounts.set(e.source, (sourceCounts.get(e.source) ?? 0) + 1)

      if (e.event_type === "idle_started") {
        if (idleStart === null) idleStart = ms
      } else if (e.event_type === "idle_ended") {
        if (idleStart !== null) {
          idleMs += Math.max(0, ms - idleStart)
          idleStart = null
        }
      }

      if (e.event_type === "session_locked") locks += 1
      if (e.event_type === "reauth_failed") reauth += 1
      if (e.event_type === "window_blurred") focusLost += 1
      if (e.event_type === "window_hidden" || e.event_type === "window_minimized") minimizedOrHidden += 1
    }

    // Se começou idle e não terminou, fecha no fim da sessão (ou último evento)
    if (idleStart !== null) idleMs += Math.max(0, endedAt - idleStart)

    const idlePct = durationMs > 0 ? clamp((idleMs / durationMs) * 100, 0, 100) : 0

    const dominantSource =
      (Array.from(sourceCounts.entries()).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] as
        | TelemetryEventRow["source"]
        | undefined) ?? first.source

    const userLabel = first.usuario?.nome || first.usuario?.email || first.user_id
    const email = first.usuario?.email ?? null

    // Score simples, mas útil: falha de senha pesa mais, lock pesa bastante.
    const riskScore = reauth * 5 + locks * 3 + focusLost * 1 + minimizedOrHidden * 1 + (idlePct >= 70 ? 2 : 0)

    sessions.push({
      session_id: sessionId,
      user_id: first.user_id,
      user_label: userLabel,
      email,
      source: dominantSource,
      started_at_ms: startedAt,
      ended_at_ms: endedAt,
      duration_ms: durationMs,
      idle_ms: idleMs,
      idle_pct: idlePct,
      locks,
      reauth_failed: reauth,
      focus_lost: focusLost,
      minimized_or_hidden: minimizedOrHidden,
      risk_score: riskScore,
      last_event_type: last.event_type,
    })
  }

  // Mais recentes primeiro
  return sessions.sort((a, b) => b.ended_at_ms - a.ended_at_ms)
}

export default function TelemetriaPage() {
  const [events, setEvents] = useState<TelemetryEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadCapped, setLoadCapped] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("all")
  const [rangeKey, setRangeKey] = useState<RangeKey>("24h")
  const [recentEventsFrom, setRecentEventsFrom] = useState("")
  const [recentEventsTo, setRecentEventsTo] = useState("")
  const [recentEventsPage, setRecentEventsPage] = useState(1)
  const [recentEventsPageSize, setRecentEventsPageSize] = useState<(typeof RECENT_EVENTS_PAGE_SIZE_OPTIONS)[number]>(20)

  const loadTelemetry = useCallback(async (isRefresh = false) => {
    const supabase = getSupabase()

    if (!supabase) {
      setError("Supabase não configurado.")
      setLoading(false)
      setRefreshing(false)
      return
    }

    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError(null)

    const rawRows: Array<Record<string, unknown>> = []
    let from = 0
    let capReached = false

    while (rawRows.length < TELEMETRY_MAX_ROWS) {
      const to = from + TELEMETRY_PAGE_SIZE - 1
      const { data: pageData, error: pageError } = await supabase
        .from("telemetria_uso")
        .select(TELEMETRY_SELECT)
        .order("occurred_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)

      if (pageError) {
        setError(pageError.message || "Não foi possível carregar os eventos de telemetria.")
        setEvents([])
        setLoadCapped(false)
        setLoading(false)
        setRefreshing(false)
        return
      }

      const pageRows = (pageData ?? []) as Array<Record<string, unknown>>
      if (pageRows.length === 0) break

      rawRows.push(...pageRows)

      if (pageRows.length < TELEMETRY_PAGE_SIZE) break

      from += TELEMETRY_PAGE_SIZE
      if (rawRows.length >= TELEMETRY_MAX_ROWS) {
        rawRows.length = TELEMETRY_MAX_ROWS
        capReached = true
        break
      }
    }

    // Probe para detectar se realmente existe próxima página.
    if (capReached) {
      const { data: probeData, error: probeError } = await supabase
        .from("telemetria_uso")
        .select("id")
        .order("occurred_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from)

      if (!probeError && (probeData?.length ?? 0) === 0) {
        capReached = false
      }
    }

    const rows = rawRows.map((row) => ({
      id: String(row.id ?? ""),
      user_id: String(row.user_id ?? ""),
      session_id: String(row.session_id ?? ""),
      event_type: String(row.event_type ?? ""),
      source: (row.source as "web" | "tauri" | "hybrid") ?? "web",
      event_data: (row.event_data as Record<string, unknown> | null) ?? null,
      occurred_at: String(row.occurred_at ?? ""),
      usuario: normalizeUser(row.usuario),
    }))

    setEvents(rows)
    setLoadCapped(capReached)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void loadTelemetry()
  }, [loadTelemetry])

  const userOptions = useMemo<TelemetryUserOption[]>(() => {
    const byUser = new Map<string, TelemetryUserOption>()
    for (const event of events) {
      if (!event.user_id) continue
      const current = byUser.get(event.user_id)
      if (current) {
        current.eventsCount += 1
        continue
      }
      const label = event.usuario?.nome || event.usuario?.email || event.user_id
      byUser.set(event.user_id, {
        userId: event.user_id,
        label,
        email: event.usuario?.email ?? null,
        eventsCount: 1,
      })
    }
    return Array.from(byUser.values()).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
  }, [events])

  useEffect(() => {
    if (selectedUserId === "all") return
    const stillExists = userOptions.some((option) => option.userId === selectedUserId)
    if (!stillExists) setSelectedUserId("all")
  }, [selectedUserId, userOptions])

  const byUserFiltered = useMemo(() => {
    if (selectedUserId === "all") return events
    return events.filter((event) => event.user_id === selectedUserId)
  }, [events, selectedUserId])

  const selectedUser = useMemo(() => {
    if (selectedUserId === "all") return null
    return userOptions.find((option) => option.userId === selectedUserId) ?? null
  }, [selectedUserId, userOptions])

  const rangeFilteredEvents = useMemo(() => {
    if (rangeKey === "all") return byUserFiltered
    const now = Date.now()
    const ms =
      rangeKey === "24h"
        ? 24 * 60 * 60 * 1000
        : rangeKey === "7d"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000
    return byUserFiltered.filter((e) => {
      const t = safeMs(e.occurred_at)
      return t !== null && t >= now - ms
    })
  }, [byUserFiltered, rangeKey])

  const recentRange = useMemo(() => {
    const fromMs = recentEventsFrom ? safeMs(recentEventsFrom) : null
    const toInputMs = recentEventsTo ? safeMs(recentEventsTo) : null
    // datetime-local não inclui segundos, então extendemos o "até" para o fim do minuto.
    const toMs = toInputMs === null ? null : toInputMs + 59_999
    const invalid = fromMs !== null && toMs !== null && fromMs > toMs
    return { fromMs, toMs, invalid }
  }, [recentEventsFrom, recentEventsTo])

  const recentEventsFiltered = useMemo(() => {
    if (recentRange.invalid) return []
    return rangeFilteredEvents.filter((event) => {
      const eventMs = safeMs(event.occurred_at)
      if (eventMs === null) return false
      if (recentRange.fromMs !== null && eventMs < recentRange.fromMs) return false
      if (recentRange.toMs !== null && eventMs > recentRange.toMs) return false
      return true
    })
  }, [rangeFilteredEvents, recentRange])

  const recentEventsTotalPages = useMemo(
    () => Math.max(1, Math.ceil(recentEventsFiltered.length / recentEventsPageSize)),
    [recentEventsFiltered.length, recentEventsPageSize]
  )

  useEffect(() => {
    setRecentEventsPage(1)
  }, [rangeKey, selectedUserId, recentEventsFrom, recentEventsTo])

  useEffect(() => {
    setRecentEventsPage((current) => Math.min(current, recentEventsTotalPages))
  }, [recentEventsTotalPages])

  const recentEventsPageStart = (recentEventsPage - 1) * recentEventsPageSize

  const recentEventsPageRows = useMemo(
    () => recentEventsFiltered.slice(recentEventsPageStart, recentEventsPageStart + recentEventsPageSize),
    [recentEventsFiltered, recentEventsPageSize, recentEventsPageStart]
  )

  const recentEventsRangeLabel = useMemo(() => {
    if (recentEventsFiltered.length === 0) return "0 de 0"
    const from = recentEventsPageStart + 1
    const to = Math.min(recentEventsPageStart + recentEventsPageSize, recentEventsFiltered.length)
    return `${from}-${to} de ${recentEventsFiltered.length}`
  }, [recentEventsFiltered.length, recentEventsPageSize, recentEventsPageStart])

  const sessions = useMemo(() => buildSessions(rangeFilteredEvents), [rangeFilteredEvents])

  const summary = useMemo(() => {
    const uniqueUsers = new Set(rangeFilteredEvents.map((e) => e.user_id).filter(Boolean))
    const uniqueSessions = new Set(rangeFilteredEvents.map((e) => e.session_id).filter(Boolean))

    const locks = rangeFilteredEvents.filter((e) => e.event_type === "session_locked").length
    const reauth = rangeFilteredEvents.filter((e) => e.event_type === "reauth_failed").length
    const focusLost = rangeFilteredEvents.filter((e) => e.event_type === "window_blurred").length

    const totalDuration = sessions.reduce((acc, s) => acc + s.duration_ms, 0)
    const totalIdle = sessions.reduce((acc, s) => acc + s.idle_ms, 0)

    const avgSession = sessions.length > 0 ? totalDuration / sessions.length : 0
    const idlePctGlobal = totalDuration > 0 ? clamp((totalIdle / totalDuration) * 100, 0, 100) : 0

    const lockRate = sessions.length > 0 ? (sessions.filter((s) => s.locks > 0).length / sessions.length) * 100 : 0
    const reauthRate = sessions.length > 0 ? (sessions.filter((s) => s.reauth_failed > 0).length / sessions.length) * 100 : 0

    // pico de eventos por bucket (para insights)
    const series = buildTimeSeries(rangeFilteredEvents, rangeKey)
    const peak = series.slice().sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0] ?? null

    // sessões atualmente “travadas” (melhor esforço com dados carregados):
    // considera travada se último evento da sessão no período for session_locked
    const currentlyLocked = sessions.filter((s) => s.last_event_type === "session_locked").length

    // score “saúde” (0..100) simples
    const penalty = locks * 4 + reauth * 6 + focusLost * 1 + idlePctGlobal * 0.25
    const health = clamp(Math.round(100 - penalty / 10), 0, 100)

    return {
      events: rangeFilteredEvents.length,
      users: uniqueUsers.size,
      sessions: uniqueSessions.size,
      locks,
      reauth,
      focusLost,
      avgSession,
      idlePctGlobal,
      lockRate,
      reauthRate,
      currentlyLocked,
      peak,
      health,
    }
  }, [rangeFilteredEvents, sessions, rangeKey])

  const timeSeries = useMemo(() => buildTimeSeries(rangeFilteredEvents, rangeKey), [rangeFilteredEvents, rangeKey])

  const eventTypeBars = useMemo(() => {
    const counts = countByKey(rangeFilteredEvents.map((e) => e.event_type))
    const arr = Array.from(counts.entries())
      .map(([key, value]) => ({ key, label: formatEventLabel(key), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    return arr
  }, [rangeFilteredEvents])

  const sourcePie = useMemo(() => {
    const counts = countByKey(rangeFilteredEvents.map((e) => e.source))
    const arr = (["web", "tauri", "hybrid"] as const)
      .map((k) => ({ key: k, label: SOURCE_LABELS[k], value: counts.get(k) ?? 0 }))
      .filter((x) => x.value > 0)
    return arr.length ? arr : [{ key: "web" as const, label: "Web", value: 0 }]
  }, [rangeFilteredEvents])

  const insights = useMemo(() => {
    const topRisk = sessions.slice().sort((a, b) => b.risk_score - a.risk_score).slice(0, 5)
    return { topRisk }
  }, [sessions])

  const pieColors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary-foreground))",
    "hsl(var(--muted-foreground))",
  ]

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Telemetria de uso</h1>
            <p className="text-muted-foreground">
              Monitoramento visual de atividade, inatividade, foco, minimização e bloqueio de sessão.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Observação: carregamento paginado em lotes de <span className="font-medium">{TELEMETRY_PAGE_SIZE}</span>,
              até <span className="font-medium">{TELEMETRY_MAX_ROWS} eventos</span> por consulta
              {loadCapped ? " (limite atual atingido)." : "."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-[220px]">
              <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">{RANGE_LABELS["24h"]}</SelectItem>
                  <SelectItem value="7d">{RANGE_LABELS["7d"]}</SelectItem>
                  <SelectItem value="30d">{RANGE_LABELS["30d"]}</SelectItem>
                  <SelectItem value="all">{RANGE_LABELS["all"]}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={() => void loadTelemetry(true)} disabled={loading || refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Visão separada por usuário</CardTitle>
            <CardDescription>Selecione um usuário para ver a telemetria dele + análises por sessão.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[320px_1fr] md:items-end">
            <div className="space-y-2">
              <p className="text-sm font-medium">Usuário</p>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {userOptions.map((option) => (
                    <SelectItem key={option.userId} value={option.userId}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
              {selectedUser ? (
                <p>
                  Exibindo <span className="font-semibold">{RANGE_LABELS[rangeKey]}</span> de{" "}
                  <span className="font-semibold">{selectedUser.label}</span>
                  {selectedUser.email ? ` (${selectedUser.email})` : ""}.
                </p>
              ) : (
                <p>
                  Exibindo <span className="font-semibold">{RANGE_LABELS[rangeKey]}</span> de todos os usuários (
                  {userOptions.length} com eventos no carregamento).
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SummaryCard title="Eventos" value={summary.events} icon={Activity} />
          <SummaryCard title={selectedUserId === "all" ? "Usuários ativos" : "Sessões"} value={selectedUserId === "all" ? summary.users : summary.sessions} icon={Users} />
          <SummaryCard title="Bloqueios" value={summary.locks} icon={Lock} />
          <SummaryCard title="Falhas de senha" value={summary.reauth} icon={ShieldAlert} />
          <SummaryCard title="Sessões travadas (agora)" value={summary.currentlyLocked} icon={Lock} />
          <SummaryCard title="Saúde (0–100)" value={summary.health} icon={AlertTriangle} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Timeline de eventos
              </CardTitle>
              <CardDescription>
                Total de eventos por {rangeKey === "24h" ? "hora" : "período"} + linhas de locks e falhas de senha.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {loading ? (
                <div className="h-full animate-pulse rounded-md bg-muted/40" />
              ) : timeSeries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados suficientes no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend />
                    <Bar dataKey="total" name="Eventos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Line dataKey="locks" name="Bloqueios" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                    <Line dataKey="reauth" name="Falhas senha" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieIcon className="h-5 w-5" />
                Origem dos eventos
              </CardTitle>
              <CardDescription>Distribuição por Web / Tauri / Híbrido.</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {loading ? (
                <div className="h-full animate-pulse rounded-md bg-muted/40" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      itemStyle={{ color: "#fff" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Legend />
                    <Pie data={sourcePie} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {sourcePie.map((_, idx) => (
                        <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top tipos de evento</CardTitle>
              <CardDescription>Os 10 tipos mais frequentes no período selecionado.</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              {loading ? (
                <div className="h-full animate-pulse rounded-md bg-muted/40" />
              ) : eventTypeBars.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados suficientes no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventTypeBars} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="label" width={170} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="value" name="Qtd" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Análises do período</CardTitle>
              <CardDescription>Indicadores calculados por sessão (melhor esforço).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sessão média</span>
                <span className="font-semibold tabular-nums">{formatDuration(summary.avgSession)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ociosidade (global)</span>
                <span className="font-semibold tabular-nums">{summary.idlePctGlobal.toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taxa de lock</span>
                <span className="font-semibold tabular-nums">{summary.lockRate.toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taxa de falha senha</span>
                <span className="font-semibold tabular-nums">{summary.reauthRate.toFixed(0)}%</span>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Pico de eventos</div>
                <div className="mt-1 font-medium">
                  {summary.peak ? (
                    <>
                      <span className="tabular-nums">{summary.peak.total}</span> eventos em{" "}
                      <span className="tabular-nums">{summary.peak.label}</span>
                    </>
                  ) : (
                    "-"
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">Dica</div>
                </div>
                <div className="mt-1 text-sm">
                  Esta análise já usa paginação; para manter a precisão de duração, registre sempre{" "}
                  <span className="font-medium">session_started/session_ended</span>.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sessões recentes (com score)</CardTitle>
            <CardDescription>
              Duração, ociosidade, perda de foco, locks, falhas de senha e score de risco por sessão.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando análises de sessão...</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem sessões suficientes no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="px-2 py-3 font-medium">Fim</th>
                      <th className="px-2 py-3 font-medium">Usuário</th>
                      <th className="px-2 py-3 font-medium">Origem</th>
                      <th className="px-2 py-3 font-medium">Duração</th>
                      <th className="px-2 py-3 font-medium">Ocioso</th>
                      <th className="px-2 py-3 font-medium">Foco</th>
                      <th className="px-2 py-3 font-medium">Locks</th>
                      <th className="px-2 py-3 font-medium">Falhas</th>
                      <th className="px-2 py-3 font-medium">Risco</th>
                      <th className="px-2 py-3 font-medium">Sessão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 12).map((s) => {
                      const risk = riskLabel(s.risk_score)
                      return (
                        <tr key={s.session_id} className="border-b border-border/50 align-top">
                          <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                            {new Date(s.ended_at_ms).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-2 py-3">
                            <div className="font-medium">{s.user_label}</div>
                            {s.email ? <div className="text-xs text-muted-foreground">{s.email}</div> : null}
                          </td>
                          <td className="px-2 py-3">
                            <Badge variant="outline" className="capitalize">
                              {SOURCE_LABELS[s.source]}
                            </Badge>
                          </td>
                          <td className="px-2 py-3 font-medium tabular-nums">{formatDuration(s.duration_ms)}</td>
                          <td className="px-2 py-3">
                            <div className="tabular-nums font-medium">{s.idle_pct.toFixed(0)}%</div>
                            <div className="text-xs text-muted-foreground">{formatDuration(s.idle_ms)}</div>
                          </td>
                          <td className="px-2 py-3 tabular-nums">{s.focus_lost}</td>
                          <td className="px-2 py-3 tabular-nums">{s.locks}</td>
                          <td className="px-2 py-3 tabular-nums">{s.reauth_failed}</td>
                          <td className="px-2 py-3">
                            <Badge variant={risk.variant}>
                              {risk.text} • {Math.round(s.risk_score)}
                            </Badge>
                          </td>
                          <td className="px-2 py-3 font-mono text-xs text-muted-foreground">
                            {s.session_id.length > 10 ? `${s.session_id.slice(0, 10)}…` : s.session_id}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {insights.topRisk.length > 0 ? (
              <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-medium">Sessões com maior risco (período)</div>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {insights.topRisk.map((s) => {
                    const risk = riskLabel(s.risk_score)
                    return (
                      <div key={s.session_id} className="rounded-md border border-border/60 bg-background p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium line-clamp-1">{s.user_label}</div>
                          <Badge variant={risk.variant}>{risk.text}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(s.ended_at_ms).toLocaleString("pt-BR")}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">Locks: {s.locks}</Badge>
                          <Badge variant="outline">Falhas: {s.reauth_failed}</Badge>
                          <Badge variant="outline">Foco: {s.focus_lost}</Badge>
                          <Badge variant="outline">Ocioso: {s.idle_pct.toFixed(0)}%</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos recentes</CardTitle>
            <CardDescription>
              {selectedUser
                ? `Eventos de ${selectedUser.label} dentro de ${RANGE_LABELS[rangeKey]}.`
                : `Eventos de todos os usuários dentro de ${RANGE_LABELS[rangeKey]}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">De (dia/hora)</p>
                <Input
                  type="datetime-local"
                  value={recentEventsFrom}
                  onChange={(e) => setRecentEventsFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Até (dia/hora)</p>
                <Input
                  type="datetime-local"
                  value={recentEventsTo}
                  onChange={(e) => setRecentEventsTo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Itens por página</p>
                <Select
                  value={String(recentEventsPageSize)}
                  onValueChange={(value) => {
                    const parsed = Number(value)
                    if (parsed === 20 || parsed === 50 || parsed === 100) {
                      setRecentEventsPageSize(parsed)
                      setRecentEventsPage(1)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Itens por página" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECENT_EVENTS_PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRecentEventsFrom("")
                    setRecentEventsTo("")
                    setRecentEventsPage(1)
                  }}
                  disabled={!recentEventsFrom && !recentEventsTo}
                >
                  Limpar faixa
                </Button>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando telemetria...</p>
            ) : error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </p>
            ) : recentRange.invalid ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-900/20 dark:text-amber-300">
                Faixa inválida: a data/hora inicial deve ser menor ou igual à data/hora final.
              </p>
            ) : recentEventsFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento encontrado na faixa de dia/hora selecionada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="px-2 py-3 font-medium">Data/Hora</th>
                      <th className="px-2 py-3 font-medium">Usuário</th>
                      <th className="px-2 py-3 font-medium">Evento</th>
                      <th className="px-2 py-3 font-medium">Origem</th>
                      <th className="px-2 py-3 font-medium">Dados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEventsPageRows.map((event) => (
                      <tr key={event.id} className="border-b border-border/50 align-top">
                        <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(event.occurred_at)}</td>
                        <td className="px-2 py-3">
                          <div className="font-medium">{event.usuario?.nome || event.usuario?.email || event.user_id}</div>
                          {event.usuario?.email ? (
                            <div className="text-xs text-muted-foreground">{event.usuario.email}</div>
                          ) : null}
                        </td>
                        <td className="px-2 py-3">
                          <Badge variant={pickBadgeVariant(event.event_type)}>{formatEventLabel(event.event_type)}</Badge>
                        </td>
                        <td className="px-2 py-3">
                          <Badge variant="outline" className="capitalize">
                            {event.source}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{compactPayload(event.event_data)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !error && !recentRange.invalid && recentEventsFiltered.length > 0 ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Mostrando {recentEventsRangeLabel}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRecentEventsPage((current) => Math.max(1, current - 1))}
                    disabled={recentEventsPage <= 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Página {recentEventsPage} de {recentEventsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRecentEventsPage((current) => Math.min(recentEventsTotalPages, current + 1))}
                    disabled={recentEventsPage >= recentEventsTotalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}
