"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { RoleGuard } from "@/lib/auth/role-guard"
import {
  createLegalOpinion,
  getLegalOpinionMetadata,
  listLegalOpinions,
} from "@/features/legal-opinion/api"
import { syncAcceptedProposalsToLegalOpinions } from "@/features/legal-opinion/request-from-precatorio"
import {
  LEGAL_OPINION_PRIORITIES,
  LEGAL_OPINION_PRIORITY_LABELS,
  LEGAL_OPINION_SOURCES,
  LEGAL_OPINION_SOURCE_LABELS,
  LEGAL_OPINION_STATUSES,
  LEGAL_OPINION_STATUS_LABELS,
  LEGAL_OPINION_TYPES,
  LEGAL_OPINION_TYPE_LABELS,
  type LegalOpinion,
  type LegalOpinionPriority,
  type LegalOpinionSource,
  type LegalOpinionStatus,
  type LegalOpinionType,
} from "@/features/legal-opinion/types"
import { formatDate, formatDateTime } from "@/features/legal-opinion/format"
import {
  LegalOpinionFormModal,
  type LegalOpinionFormPrecatorioOption,
  type LegalOpinionFormUserOption,
} from "@/features/legal-opinion/components/legal-opinion-form-modal"
import React from "react"

// ─── Clay shadows ────────────────────────────────────────────────────────────
const SH_CARD: React.CSSProperties = {
  boxShadow:
    "16px 16px 36px rgba(0,0,0,.08),-8px -8px 20px rgba(255,255,255,.94),inset 1px 1px 4px rgba(255,255,255,.9),inset -1px -1px 2px rgba(0,0,0,.04)",
}
const SH_BTN_AC: React.CSSProperties = {
  boxShadow:
    "8px 8px 20px rgba(14,77,106,.42),-3px -3px 8px rgba(255,255,255,.3),inset 1px 1px 3px rgba(255,255,255,.14),inset -1px -1px 2px rgba(8,40,60,.3)",
}
const SH_BTN_GHOST: React.CSSProperties = {
  boxShadow:
    "5px 5px 12px rgba(0,0,0,.07),-3px -3px 8px rgba(255,255,255,.92),inset 1px 1px 2px rgba(255,255,255,.87),inset -1px -1px 2px rgba(0,0,0,.04)",
}
const SH_INSET: React.CSSProperties = {
  boxShadow:
    "inset 5px 5px 12px rgba(0,0,0,.07),inset -4px -4px 10px rgba(255,255,255,.87)",
}

// ─── Style constants ──────────────────────────────────────────────────────────
const C_CARD = "bg-white rounded-[24px] border border-black/[0.07] overflow-hidden transition-all duration-300"
const C_BTN_AC =
  "inline-flex items-center gap-2 h-10 px-5 rounded-[15px] bg-[#0e4d6a] text-white text-[12.5px] font-bold cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 relative overflow-hidden whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
const C_BTN_GHOST =
  "inline-flex items-center gap-2 h-10 px-4 rounded-[15px] bg-gradient-to-b from-white to-[#f2f3f7] border border-black/[0.08] text-[#374151] text-[12.5px] font-bold cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 hover:text-[#0b0c10] active:translate-y-0.5 active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
const C_BADGE =
  "inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10.5px] font-bold border whitespace-nowrap"
const C_INPUT =
  "w-full h-10 rounded-[13px] border border-black/[0.09] bg-[#f2f3f7] px-3 text-[13px] text-[#0b0c10] placeholder:text-[#9ca3af] outline-none focus:border-[#0e4d6a] focus:ring-2 focus:ring-[#0e4d6a]/20 transition-all"
const C_SELECT =
  "w-full h-10 rounded-[13px] border border-black/[0.09] bg-[#f2f3f7] px-3 text-[13px] text-[#0b0c10] outline-none focus:border-[#0e4d6a] transition-all appearance-none cursor-pointer"
const C_LABEL =
  "block text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#9ca3af] mb-1.5"

// ─── Status / Priority classes ────────────────────────────────────────────────
const STATUS_CLS: Record<LegalOpinionStatus, string> = {
  pendente:   "bg-[#fffbeb] text-[#92400e] border-[#fde68a]",
  em_analise: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]",
  concluido:  "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]",
  rejeitado:  "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  arquivado:  "bg-[#f9fafb] text-[#6b7280] border-[#e5e7eb]",
}

const PRIORITY_CLS: Record<LegalOpinionPriority, string> = {
  baixa:   "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]",
  media:   "bg-[#fffbeb] text-[#92400e] border-[#fde68a]",
  alta:    "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]",
  critica: "bg-[#fdf2f8] text-[#9d174d] border-[#fbcfe8]",
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IC = {
  scale: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707M18.364 18.364l.707.707M1 12h1M21 12h1M4.22 19.778l.707-.707M18.364 5.636l.707-.707M7 10l-3 5h6L7 10zM17 10l-3 5h6L17 10zM7 15h10M12 3a2 2 0 010 4" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591L15.25 12.5v6.25a.75.75 0 01-.75.75h-5a.75.75 0 01-.75-.75V12.5L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  ),
  dot: (
    <svg viewBox="0 0 6 6" fill="currentColor" className="w-1.5 h-1.5">
      <circle cx="3" cy="3" r="3" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  ),
}

// ─── Types ────────────────────────────────────────────────────────────────────
type FiltersState = {
  search: string
  status: LegalOpinionStatus | ""
  type: LegalOpinionType | ""
  priority: LegalOpinionPriority | ""
  origemSolicitacao: LegalOpinionSource | ""
  assignedTo: string
  precatorioId: string
  dueStart: string
  dueEnd: string
}

const pageSize = 12

const initialFilters: FiltersState = {
  search: "",
  status: "",
  type: "",
  priority: "",
  origemSolicitacao: "",
  assignedTo: "",
  precatorioId: "",
  dueStart: "",
  dueEnd: "",
}

function buildPrecatorioLabel(precatorio: {
  titulo: string | null
  numero_precatorio: string | null
  numero_processo: string | null
  credor_nome: string | null
}) {
  return (
    precatorio.titulo ||
    precatorio.numero_precatorio ||
    precatorio.credor_nome ||
    "Precatório sem identificação"
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, cls }: { label: string; value: number; sub: string; cls: string }) {
  return (
    <div
      className={`rounded-[18px] border px-4 py-3.5 transition-all duration-300 ${cls}`}
      style={SH_CARD}
    >
      <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] opacity-70">{label}</div>
      <div className="mt-1.5 text-[26px] font-black leading-none tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] opacity-60">{sub}</div>
    </div>
  )
}

// ─── Opinion Row ──────────────────────────────────────────────────────────────
function OpinionRow({ opinion, onClick }: { opinion: LegalOpinion; onClick: () => void }) {
  const statusCls = STATUS_CLS[opinion.status]
  const priorityCls = PRIORITY_CLS[opinion.priority]

  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer border-t border-black/[0.05] transition-colors hover:bg-[#f0f1f5]/60"
    >
      <td className="px-5 py-3.5 align-middle">
        <div className="font-semibold text-[13.5px] text-[#0b0c10] group-hover:text-[#0e4d6a] transition-colors">
          {opinion.title}
        </div>
        <div className="mt-0.5 text-[11px] text-[#9ca3af]">
          {LEGAL_OPINION_SOURCE_LABELS[(opinion.origem_solicitacao || "manual") as LegalOpinionSource]}
        </div>
      </td>
      <td className="px-5 py-3.5 align-middle">
        <span className="text-[13px] text-[#374151]">
          {opinion.precatorio?.numero_precatorio || opinion.precatorio?.titulo || "—"}
        </span>
      </td>
      <td className="px-5 py-3.5 align-middle">
        <span className="text-[13px] text-[#374151]">
          {LEGAL_OPINION_TYPE_LABELS[opinion.type]}
        </span>
      </td>
      <td className="px-5 py-3.5 align-middle">
        <span className={`${C_BADGE} ${statusCls}`}>
          {IC.dot}
          {LEGAL_OPINION_STATUS_LABELS[opinion.status]}
        </span>
      </td>
      <td className="px-5 py-3.5 align-middle">
        <span className={`${C_BADGE} ${priorityCls}`}>
          {LEGAL_OPINION_PRIORITY_LABELS[opinion.priority]}
        </span>
      </td>
      <td className="px-5 py-3.5 align-middle">
        <div className="flex items-center gap-1.5 text-[12.5px] text-[#374151]">
          {IC.calendar}
          {formatDate(opinion.due_date)}
        </div>
      </td>
      <td className="px-5 py-3.5 align-middle">
        <div className="flex items-center gap-1.5 text-[12.5px] text-[#374151]">
          {IC.user}
          {opinion.assigned_to_user?.nome || "Não atribuído"}
        </div>
      </td>
      <td className="px-5 py-3.5 align-middle text-[11.5px] text-[#9ca3af]">
        {formatDateTime(opinion.updated_at)}
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PareceresPage() {
  const router = useRouter()

  const [opinions, setOpinions] = useState<LegalOpinion[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isMetadataLoading, setIsMetadataLoading] = useState(true)
  const [isSyncingFechamento, setIsSyncingFechamento] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

  const [users, setUsers] = useState<LegalOpinionFormUserOption[]>([])
  const [precatorios, setPrecatorios] = useState<LegalOpinionFormPrecatorioOption[]>([])
  const [filters, setFilters] = useState<FiltersState>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(initialFilters)

  const statusCounters = useMemo(() => {
    const base = { pendente: 0, em_analise: 0, concluido: 0, rejeitado: 0, arquivado: 0 }
    return opinions.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, base as Record<LegalOpinionStatus, number>)
  }, [opinions])

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean)

  async function loadMetadata() {
    setIsMetadataLoading(true)
    try {
      const meta = await getLegalOpinionMetadata()
      setUsers(meta.users)
      setPrecatorios(
        meta.precatorios.map((p) => ({
          id: p.id,
          label: buildPrecatorioLabel(p),
        }))
      )
    } finally {
      setIsMetadataLoading(false)
    }
  }

  async function loadOpinions(p: number, f: FiltersState) {
    setIsLoading(true)
    try {
      const result = await listLegalOpinions({
        page: p,
        pageSize,
        search: f.search || undefined,
        status: f.status || undefined,
        type: f.type || undefined,
        priority: f.priority || undefined,
        origemSolicitacao: f.origemSolicitacao || undefined,
        assignedTo: f.assignedTo || undefined,
        precatorioId: f.precatorioId || undefined,
        dueStart: f.dueStart || undefined,
        dueEnd: f.dueEnd || undefined,
      })
      setOpinions(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } finally {
      setIsLoading(false)
    }
  }

  async function syncFechamentoQueue() {
    setIsSyncingFechamento(true)
    try {
      await syncAcceptedProposalsToLegalOpinions()
    } finally {
      setIsSyncingFechamento(false)
    }
  }

  async function handleRefresh() {
    await syncFechamentoQueue()
    await loadOpinions(page, appliedFilters)
  }

  async function handleApplyFilters() {
    setAppliedFilters(filters)
    setPage(1)
    await loadOpinions(1, filters)
    setIsFiltersExpanded(false)
  }

  async function handleClearFilters() {
    setFilters(initialFilters)
    setAppliedFilters(initialFilters)
    setPage(1)
    await loadOpinions(1, initialFilters)
  }

  async function handlePageChange(p: number) {
    setPage(p)
    await loadOpinions(p, appliedFilters)
  }

  useEffect(() => {
    void loadMetadata()
    void loadOpinions(1, initialFilters)
  }, [])

  return (
    <RoleGuard allowedRoles={["admin", "juridico", "gestor"]}>
      <div className="min-h-screen bg-[#f0f1f5] p-4 md:p-6 space-y-5">

        {/* ── Hero Title ──────────────────────────────────────────────── */}
        <div className="pt-2 pb-1">
          <span className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full bg-primary/10 px-3 py-1.5 text-[13px] font-bold tracking-wide text-primary">
            <span className="shrink-0">●</span>
            <span className="truncate">CRM Precatórios · jurídico</span>
          </span>
          <p className="mt-3 text-[clamp(1.55rem,6vw,4rem)] font-black leading-none tracking-[-0.05em] text-primary">
            Parecer Jurídico
          </p>
          <h1 className="mt-3 text-[clamp(1rem,3vw,1.9rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
            Análise, risco e recomendações legais.
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#6b7280]">
            Gerencie os pareceres jurídicos da carteira de precatórios — acompanhe status, prazos e responsáveis em um único painel.
          </p>

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isSyncingFechamento}
              className={C_BTN_GHOST}
              style={SH_BTN_GHOST}
            >
              <span className={isSyncingFechamento ? "animate-spin" : ""}>{IC.refresh}</span>
              {isSyncingFechamento ? "Sincronizando..." : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              disabled={isMetadataLoading}
              className={C_BTN_AC}
              style={SH_BTN_AC}
            >
              {IC.plus}
              Solicitar Parecer
            </button>
          </div>
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────── */}
        <div
          className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5"
          style={{ animation: "cardIn .55s .09s cubic-bezier(.34,1.56,.64,1) both" }}
        >
          <KpiCard
            label="Pendente"
            value={statusCounters.pendente}
            sub="aguardando análise"
            cls="bg-[#fffbeb] text-[#92400e] border-[#fde68a]"
          />
          <KpiCard
            label="Em análise"
            value={statusCounters.em_analise}
            sub="em andamento agora"
            cls="bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"
          />
          <KpiCard
            label="Concluído"
            value={statusCounters.concluido}
            sub="análise finalizada"
            cls="bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]"
          />
          <KpiCard
            label="Rejeitado"
            value={statusCounters.rejeitado}
            sub="parecer negativo"
            cls="bg-[#fef2f2] text-[#dc2626] border-[#fecaca]"
          />
          <KpiCard
            label="Total"
            value={total}
            sub="pareceres na carteira"
            cls="bg-white text-[#0b0c10] border-black/[0.07]"
          />
        </div>

        {/* ── Filtros ──────────────────────────────────────────────────── */}
        <div className={C_CARD} style={SH_CARD}>
          <button
            type="button"
            onClick={() => setIsFiltersExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between px-5 py-4"
          >
            <span className="flex items-center gap-2 text-[13px] font-bold text-[#374151]">
              {IC.filter}
              Filtros
              {hasActiveFilters && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0e4d6a] text-[10px] font-bold text-white">
                  !
                </span>
              )}
            </span>
            <span className="text-[#9ca3af] transition-transform duration-200" style={{ transform: isFiltersExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
              {IC.chevronDown}
            </span>
          </button>

          {isFiltersExpanded && (
            <div className="border-t border-black/[0.06] px-5 py-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">

                {/* Busca */}
                <div className="md:col-span-2 xl:col-span-1">
                  <label className={C_LABEL}>Busca</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                      {IC.search}
                    </span>
                    <input
                      type="text"
                      placeholder="Título, credor, número do processo..."
                      className={`${C_INPUT} pl-9`}
                      value={filters.search}
                      onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className={C_LABEL}>Status</label>
                  <div className="relative">
                    <select
                      className={C_SELECT}
                      value={filters.status || "__all__"}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          status: e.target.value === "__all__" ? "" : (e.target.value as LegalOpinionStatus),
                        }))
                      }
                    >
                      <option value="__all__">Todos os status</option>
                      {LEGAL_OPINION_STATUSES.map((s) => (
                        <option key={s} value={s}>{LEGAL_OPINION_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                      {IC.chevronDown}
                    </span>
                  </div>
                </div>

                {/* Tipo */}
                <div>
                  <label className={C_LABEL}>Tipo</label>
                  <div className="relative">
                    <select
                      className={C_SELECT}
                      value={filters.type || "__all__"}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          type: e.target.value === "__all__" ? "" : (e.target.value as LegalOpinionType),
                        }))
                      }
                    >
                      <option value="__all__">Todos os tipos</option>
                      {LEGAL_OPINION_TYPES.map((t) => (
                        <option key={t} value={t}>{LEGAL_OPINION_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                      {IC.chevronDown}
                    </span>
                  </div>
                </div>

                {/* Prioridade */}
                <div>
                  <label className={C_LABEL}>Prioridade</label>
                  <div className="relative">
                    <select
                      className={C_SELECT}
                      value={filters.priority || "__all__"}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          priority: e.target.value === "__all__" ? "" : (e.target.value as LegalOpinionPriority),
                        }))
                      }
                    >
                      <option value="__all__">Todas as prioridades</option>
                      {LEGAL_OPINION_PRIORITIES.map((p) => (
                        <option key={p} value={p}>{LEGAL_OPINION_PRIORITY_LABELS[p]}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                      {IC.chevronDown}
                    </span>
                  </div>
                </div>

                {/* Origem */}
                <div>
                  <label className={C_LABEL}>Origem</label>
                  <div className="relative">
                    <select
                      className={C_SELECT}
                      value={filters.origemSolicitacao || "__all__"}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          origemSolicitacao: e.target.value === "__all__" ? "" : (e.target.value as LegalOpinionSource),
                        }))
                      }
                    >
                      <option value="__all__">Todas as origens</option>
                      {LEGAL_OPINION_SOURCES.map((s) => (
                        <option key={s} value={s}>{LEGAL_OPINION_SOURCE_LABELS[s]}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                      {IC.chevronDown}
                    </span>
                  </div>
                </div>

                {/* Responsável */}
                <div>
                  <label className={C_LABEL}>Responsável</label>
                  <div className="relative">
                    <select
                      className={C_SELECT}
                      value={filters.assignedTo || "__all__"}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          assignedTo: e.target.value === "__all__" ? "" : e.target.value,
                        }))
                      }
                    >
                      <option value="__all__">Todos os responsáveis</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                      {IC.chevronDown}
                    </span>
                  </div>
                </div>

                {/* Precatório */}
                <div>
                  <label className={C_LABEL}>Precatório</label>
                  <div className="relative">
                    <select
                      className={C_SELECT}
                      value={filters.precatorioId || "__all__"}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          precatorioId: e.target.value === "__all__" ? "" : e.target.value,
                        }))
                      }
                    >
                      <option value="__all__">Todos os precatórios</option>
                      {precatorios.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                      {IC.chevronDown}
                    </span>
                  </div>
                </div>

                {/* Prazo inicial */}
                <div>
                  <label className={C_LABEL}>Prazo inicial</label>
                  <input
                    type="date"
                    className={C_INPUT}
                    value={filters.dueStart}
                    onChange={(e) => setFilters((prev) => ({ ...prev, dueStart: e.target.value }))}
                  />
                </div>

                {/* Prazo final */}
                <div>
                  <label className={C_LABEL}>Prazo final</label>
                  <input
                    type="date"
                    className={C_INPUT}
                    value={filters.dueEnd}
                    onChange={(e) => setFilters((prev) => ({ ...prev, dueEnd: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void handleClearFilters()}
                  className={C_BTN_GHOST}
                  style={SH_BTN_GHOST}
                >
                  Limpar tudo
                </button>
                <button
                  type="button"
                  onClick={() => void handleApplyFilters()}
                  className={C_BTN_AC}
                  style={SH_BTN_AC}
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabela ──────────────────────────────────────────────────── */}
        <div className={C_CARD} style={SH_CARD}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div
                className="h-9 w-9 rounded-full border-[3px] border-[#0e4d6a]/20 border-t-[#0e4d6a] animate-spin"
              />
            </div>
          ) : opinions.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#f0f1f5] text-[#6b7280]"
                style={SH_INSET}
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707M18.364 18.364l.707.707M1 12h1M21 12h1M4.22 19.778l.707-.707M18.364 5.636l.707-.707" />
                </svg>
              </div>
              <h3 className="text-[15px] font-bold text-[#0b0c10]">Nenhum parecer encontrado</h3>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#6b7280]">
                Tente ajustar os filtros ou solicite um novo parecer.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1000px] w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f0f1f5]">
                      {["Título", "Precatório", "Tipo", "Status", "Prioridade", "Prazo", "Responsável", "Atualizado"].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#9ca3af] border-b border-black/[0.06]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {opinions.map((opinion) => (
                      <OpinionRow
                        key={opinion.id}
                        opinion={opinion}
                        onClick={() => router.push(`/parecer-juridico/detalhes?id=${opinion.id}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div
                className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-5 py-4"
              >
                <span className="text-[12.5px] text-[#6b7280]">
                  Página {page} de {Math.max(totalPages, 1)} &bull; {total} resultado(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => void handlePageChange(page - 1)}
                    className={C_BTN_GHOST}
                    style={SH_BTN_GHOST}
                  >
                    {IC.chevronLeft}
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => void handlePageChange(page + 1)}
                    className={C_BTN_AC}
                    style={SH_BTN_AC}
                  >
                    Próxima
                    {IC.chevronRight}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Form Modal ──────────────────────────────────────────────── */}
        <LegalOpinionFormModal
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          mode="create"
          users={users}
          precatorios={precatorios}
          submitting={isCreating}
          onSubmit={async (value) => {
            setIsCreating(true)
            try {
              const created = await createLegalOpinion({
                precatorioId: value.precatorioId,
                title: value.title,
                type: value.type,
                status: value.status,
                priority: value.priority,
                origemSolicitacao: "manual",
                dueDate: value.dueDate || null,
                assignedTo: value.assignedTo || null,
                executiveSummary: value.executiveSummary || null,
                analysis: value.analysis || null,
                recommendation: value.recommendation || null,
                conclusion: value.conclusion || null,
                checklist: value.checklist,
              })
              setIsFormOpen(false)
              toast({ title: "Parecer criado com sucesso.", description: created.title })
              await loadOpinions(1, filters)
            } catch (error) {
              toast({
                title: "Falha ao criar parecer",
                description: error instanceof Error ? error.message : "Falha inesperada.",
                variant: "destructive",
              })
            } finally {
              setIsCreating(false)
            }
          }}
        />
      </div>
    </RoleGuard>
  )
}
