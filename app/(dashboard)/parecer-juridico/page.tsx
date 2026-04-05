"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { ChevronDown, ChevronUp, Filter, Plus, RefreshCw, Scale, Search } from "@/components/icons"

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ")

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

function getStatusTagClass(status: LegalOpinionStatus): string {
  switch (status) {
    case "pendente":
      return "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300"
    case "em_analise":
      return "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
    case "concluido":
      return "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
    case "rejeitado":
      return "border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
    case "arquivado":
      return "border-slate-200 bg-slate-500/10 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
  }
}

function getPriorityTagClass(priority: LegalOpinionPriority): string {
  switch (priority) {
    case "baixa":
      return "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
    case "media":
      return "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300"
    case "alta":
      return "border-orange-200 bg-orange-500/10 text-orange-700 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-orange-300"
    case "critica":
      return "border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
  }
}

function TagPill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em]",
        className
      )}
    >
      {children}
    </span>
  )
}

export default function LegalOpinionListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<FiltersState>(initialFilters)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isMetadataLoading, setIsMetadataLoading] = useState(true)
  const [opinions, setOpinions] = useState<LegalOpinion[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [users, setUsers] = useState<LegalOpinionFormUserOption[]>([])
  const [precatorios, setPrecatorios] = useState<LegalOpinionFormPrecatorioOption[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)
  const [isSyncingFechamento, setIsSyncingFechamento] = useState(false)

  const statusCounters = useMemo(() => {
    const counters: Record<LegalOpinionStatus, number> = {
      pendente: 0,
      em_analise: 0,
      concluido: 0,
      rejeitado: 0,
      arquivado: 0,
    }
    for (const opinion of opinions) counters[opinion.status] += 1
    return counters
  }, [opinions])

  const hasActiveFilters = !!(
    filters.search ||
    filters.status ||
    filters.type ||
    filters.priority ||
    filters.origemSolicitacao ||
    filters.assignedTo ||
    filters.precatorioId ||
    filters.dueStart ||
    filters.dueEnd
  )

  const selectedPrecatorioFromQuery = searchParams.get("precatorioId")

  useEffect(() => {
    if (!selectedPrecatorioFromQuery) return
    setFilters((prev) => ({ ...prev, precatorioId: selectedPrecatorioFromQuery }))
  }, [selectedPrecatorioFromQuery])

  async function loadMetadata(search?: string) {
    setIsMetadataLoading(true)
    try {
      const metadata = await getLegalOpinionMetadata({ search })
      setUsers(
        metadata.users.map((user) => ({ id: user.id, nome: user.nome, email: user.email }))
      )
      setPrecatorios(
        metadata.precatorios.map((precatorio) => ({
          id: precatorio.id,
          label: buildPrecatorioLabel(precatorio),
          subtitle: [precatorio.numero_processo, precatorio.credor_nome]
            .filter(Boolean)
            .join(" • "),
        }))
      )
    } catch (error) {
      toast({
        title: "Falha ao carregar metadados",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsMetadataLoading(false)
    }
  }

  async function loadOpinions(nextPage = page, activeFilters = filters) {
    setIsLoading(true)
    try {
      const response = await listLegalOpinions({
        page: nextPage,
        pageSize,
        search: activeFilters.search || undefined,
        status: (activeFilters.status || undefined) as LegalOpinionStatus | undefined,
        type: (activeFilters.type || undefined) as LegalOpinionType | undefined,
        priority: (activeFilters.priority || undefined) as LegalOpinionPriority | undefined,
        origemSolicitacao: (activeFilters.origemSolicitacao ||
          undefined) as LegalOpinionSource | undefined,
        assignedTo: activeFilters.assignedTo || undefined,
        precatorioId: activeFilters.precatorioId || undefined,
        dueStart: activeFilters.dueStart || undefined,
        dueEnd: activeFilters.dueEnd || undefined,
      })
      setOpinions(response.data)
      setTotal(response.pagination.total)
      setTotalPages(response.pagination.totalPages)
      setPage(response.pagination.page)
    } catch (error) {
      toast({
        title: "Falha ao carregar pareceres",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function syncFechamentoQueue(showFeedback = false) {
    setIsSyncingFechamento(true)
    try {
      const result = await syncAcceptedProposalsToLegalOpinions({ limit: 1000 })
      if (showFeedback && result.created > 0) {
        toast({
          title: "Fila jurídica sincronizada",
          description: `${result.created} crédito(s) de Jurídico de fechamento foram adicionados ao Parecer Jurídico.`,
        })
      }
      if (showFeedback && result.failed > 0) {
        toast({
          title: "Sincronização parcial",
          description: `${result.failed} crédito(s) não puderam ser sincronizados agora.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      if (showFeedback) {
        toast({
          title: "Falha ao sincronizar fila jurídica",
          description: error instanceof Error ? error.message : "Falha inesperada.",
          variant: "destructive",
        })
      }
      console.error("[Parecer Juridico] Falha na sincronizacao de proposta aceita:", error)
    } finally {
      setIsSyncingFechamento(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadMetadata() }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void (async () => {
      await syncFechamentoQueue(false)
      await loadOpinions(1, filters)
    })()
  }, [])

  async function handleApplyFilters() {
    await loadOpinions(1, filters)
  }

  async function handleClearFilters() {
    const next = { ...initialFilters, precatorioId: selectedPrecatorioFromQuery || "" }
    setFilters(next)
    await loadOpinions(1, next)
  }

  async function handlePageChange(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return
    await loadOpinions(nextPage, filters)
  }

  async function handleRefresh() {
    await syncFechamentoQueue(true)
    await loadOpinions(page, filters)
  }

  return (
    <RoleGuard allowedRoles={["admin", "juridico", "gestor"]}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-6 pb-24 sm:px-5">

        {/* Hero Header */}
        <section className="relative overflow-hidden rounded-[24px] border border-slate-900/10 bg-[linear-gradient(135deg,#ffffff_60%,#fff7ed_100%)] px-5 py-6 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#18181b_60%,rgba(124,45,18,0.35)_100%)] sm:px-8">
          <div className="pointer-events-none absolute -right-5 -top-16 h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14)_0%,transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-12 left-4 h-[160px] w-[160px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.10)_0%,transparent_70%)]" />

          <div className="relative z-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Departamento Jurídico
                </p>
                <h1 className="mt-1 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                  Pareceres Jurídicos
                </h1>
                <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Gerencie análises, validações e pareceres vinculados aos precatórios da carteira.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={isSyncingFechamento}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-medium text-slate-500 shadow-[0_1px_4px_rgba(15,23,42,0.06)] transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-300"
                >
                  <RefreshCw className="h-4 w-4" />
                  {isSyncingFechamento ? "Sincronizando..." : "Atualizar"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(true)}
                  disabled={isMetadataLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border-none bg-gradient-to-br from-orange-500 to-orange-600 px-4 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(249,115,22,0.70)] transition hover:from-orange-400 hover:to-amber-500 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  Solicitar Parecer
                </button>
              </div>
            </div>

            {/* Stat cards */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <div className="rounded-[14px] border border-amber-500/25 bg-amber-500/10 px-4 py-3">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  Pendente
                </div>
                <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-amber-700 dark:text-amber-300">
                  {statusCounters.pendente}
                </div>
                <div className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/80">
                  aguardando análise
                </div>
              </div>
              <div className="rounded-[14px] border border-blue-500/25 bg-blue-500/10 px-4 py-3">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                  Em análise
                </div>
                <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-blue-600 dark:text-blue-300">
                  {statusCounters.em_analise}
                </div>
                <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">
                  em andamento agora
                </div>
              </div>
              <div className="rounded-[14px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  Concluído
                </div>
                <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-emerald-700 dark:text-emerald-300">
                  {statusCounters.concluido}
                </div>
                <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                  análise finalizada
                </div>
              </div>
              <div className="rounded-[14px] border border-rose-500/25 bg-rose-500/10 px-4 py-3">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
                  Rejeitado
                </div>
                <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-rose-600 dark:text-rose-300">
                  {statusCounters.rejeitado}
                </div>
                <div className="mt-1 text-[11px] text-rose-700/80 dark:text-rose-300/80">
                  parecer negativo
                </div>
              </div>
              <div className="rounded-[14px] border border-slate-900/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#18181b]">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Total
                </div>
                <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-slate-900 dark:text-slate-50">
                  {total}
                </div>
                <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  pareceres na carteira
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Painel de Filtros */}
        <div className="rounded-[18px] border border-slate-900/10 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#18181b]">
          <button
            type="button"
            onClick={() => setIsFiltersExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between px-5 py-4 text-left md:px-6"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Filter className="h-4 w-4 text-orange-500" />
              Filtros
              {hasActiveFilters && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  !
                </span>
              )}
            </span>
            {isFiltersExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {isFiltersExpanded && (
            <div className="border-t border-slate-900/10 px-5 py-5 dark:border-white/10 md:px-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {/* Busca */}
                <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
                  <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Busca
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Título, credor, número do processo..."
                      className="pl-9 rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]"
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, search: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Status
                  </Label>
                  <Select
                    value={filters.status || "__all__"}
                    onValueChange={(v) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: v === "__all__" ? "" : (v as LegalOpinionStatus),
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos os status</SelectItem>
                      {LEGAL_OPINION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LEGAL_OPINION_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo */}
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Tipo
                  </Label>
                  <Select
                    value={filters.type || "__all__"}
                    onValueChange={(v) =>
                      setFilters((prev) => ({
                        ...prev,
                        type: v === "__all__" ? "" : (v as LegalOpinionType),
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos os tipos</SelectItem>
                      {LEGAL_OPINION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {LEGAL_OPINION_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prioridade */}
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Prioridade
                  </Label>
                  <Select
                    value={filters.priority || "__all__"}
                    onValueChange={(v) =>
                      setFilters((prev) => ({
                        ...prev,
                        priority: v === "__all__" ? "" : (v as LegalOpinionPriority),
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]">
                      <SelectValue placeholder="Todas as prioridades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas as prioridades</SelectItem>
                      {LEGAL_OPINION_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {LEGAL_OPINION_PRIORITY_LABELS[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Origem */}
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Origem
                  </Label>
                  <Select
                    value={filters.origemSolicitacao || "__all__"}
                    onValueChange={(v) =>
                      setFilters((prev) => ({
                        ...prev,
                        origemSolicitacao: v === "__all__" ? "" : (v as LegalOpinionSource),
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]">
                      <SelectValue placeholder="Todas as origens" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas as origens</SelectItem>
                      {LEGAL_OPINION_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LEGAL_OPINION_SOURCE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Responsável */}
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Responsável
                  </Label>
                  <Select
                    value={filters.assignedTo || "__all__"}
                    onValueChange={(v) =>
                      setFilters((prev) => ({
                        ...prev,
                        assignedTo: v === "__all__" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]">
                      <SelectValue placeholder="Todos os responsáveis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos os responsáveis</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Precatório */}
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Precatório
                  </Label>
                  <Select
                    value={filters.precatorioId || "__all__"}
                    onValueChange={(v) =>
                      setFilters((prev) => ({
                        ...prev,
                        precatorioId: v === "__all__" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]">
                      <SelectValue placeholder="Todos os precatórios" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos os precatórios</SelectItem>
                      {precatorios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prazo inicial */}
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Prazo inicial
                  </Label>
                  <Input
                    type="date"
                    value={filters.dueStart}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, dueStart: e.target.value }))
                    }
                    className="rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]"
                  />
                </div>

                {/* Prazo final */}
                <div className="space-y-1.5">
                  <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Prazo final
                  </Label>
                  <Input
                    type="date"
                    value={filters.dueEnd}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, dueEnd: e.target.value }))
                    }
                    className="rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void handleClearFilters()}
                  className="h-9 rounded-lg border border-slate-900/10 bg-white px-3 text-sm font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:bg-[#09090b] dark:text-slate-300"
                >
                  Limpar tudo
                </button>
                <button
                  type="button"
                  onClick={() => void handleApplyFilters()}
                  className="h-9 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(249,115,22,0.60)] transition hover:bg-orange-400"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto rounded-[18px] border border-slate-900/10 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#18181b]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500/20 border-t-orange-500" />
            </div>
          ) : opinions.length === 0 ? (
            <div className="relative overflow-hidden px-6 py-20 text-center">
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-amber-400/10 blur-3xl" />
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]">
                <Scale className="h-7 w-7 text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="relative text-[15px] font-bold text-slate-900 dark:text-slate-50">
                Nenhum parecer encontrado
              </h3>
              <p className="relative mx-auto mt-1 max-w-sm text-[13px] text-slate-500 dark:text-slate-400">
                Tente ajustar os filtros ou solicite um novo parecer.
              </p>
            </div>
          ) : (
            <>
              <table className="min-w-[1000px] w-full border-collapse">
                <thead className="bg-[#f4f5f8] dark:bg-[#09090b]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Título
                    </th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Precatório
                    </th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Prioridade
                    </th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Prazo
                    </th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Responsável
                    </th>
                    <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Atualizado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {opinions.map((opinion) => (
                    <tr
                      key={opinion.id}
                      className="cursor-pointer border-t border-slate-900/5 transition hover:bg-orange-500/[0.03] dark:border-white/5 dark:hover:bg-orange-500/[0.04]"
                      onClick={() =>
                        router.push(`/parecer-juridico/detalhes?id=${opinion.id}`)
                      }
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="font-semibold text-slate-900 dark:text-slate-50">
                          {opinion.title}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                          {
                            LEGAL_OPINION_SOURCE_LABELS[
                              (opinion.origem_solicitacao || "manual") as LegalOpinionSource
                            ]
                          }
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-[13px] text-slate-600 dark:text-slate-300">
                        {opinion.precatorio?.numero_precatorio ||
                          opinion.precatorio?.titulo ||
                          "-"}
                      </td>
                      <td className="px-4 py-3 align-middle text-[13px] text-slate-600 dark:text-slate-300">
                        {LEGAL_OPINION_TYPE_LABELS[opinion.type]}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <TagPill className={getStatusTagClass(opinion.status)}>
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
                          {LEGAL_OPINION_STATUS_LABELS[opinion.status]}
                        </TagPill>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <TagPill className={getPriorityTagClass(opinion.priority)}>
                          {LEGAL_OPINION_PRIORITY_LABELS[opinion.priority]}
                        </TagPill>
                      </td>
                      <td className="px-4 py-3 align-middle text-[13px] text-slate-600 dark:text-slate-300">
                        {formatDate(opinion.due_date)}
                      </td>
                      <td className="px-4 py-3 align-middle text-[13px] text-slate-600 dark:text-slate-300">
                        {opinion.assigned_to_user?.nome || "Não atribuído"}
                      </td>
                      <td className="px-4 py-3 align-middle text-[12px] text-slate-400 dark:text-slate-500">
                        {formatDateTime(opinion.updated_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Paginação */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/10 px-5 py-4 dark:border-white/10">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Página {page} de {Math.max(totalPages, 1)} &bull; {total} resultado(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => void handlePageChange(page - 1)}
                    className="h-9 rounded-lg border border-slate-900/10 bg-white px-3 text-sm font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-300"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => void handlePageChange(page + 1)}
                    className="h-9 rounded-lg border border-slate-900/10 bg-white px-3 text-sm font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-300"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

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
