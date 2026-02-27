"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button, Card, Chip, Spinner } from "@heroui/react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import {
  createLegalOpinion,
  getLegalOpinionMetadata,
  listLegalOpinions,
} from "@/features/legal-opinion/api"
import {
  LEGAL_OPINION_PRIORITIES,
  LEGAL_OPINION_PRIORITY_LABELS,
  LEGAL_OPINION_SOURCES,
  LEGAL_OPINION_SOURCE_LABELS,
  LEGAL_OPINION_STATUSES,
  LEGAL_OPINION_STATUS_COLORS,
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
import { LegalOpinionFormModal, type LegalOpinionFormPrecatorioOption, type LegalOpinionFormUserOption } from "@/features/legal-opinion/components/legal-opinion-form-modal"
import { ChevronDown, ChevronUp, Filter, Plus, RefreshCw, Scale, Search } from "@/components/icons"

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

const REQUEST_OPINION_BUTTON_CLASS =
  "!bg-orange-500 !text-white shadow-[0_0_0_1px_rgba(249,115,22,0.45),0_0_24px_rgba(249,115,22,0.5)] hover:!bg-orange-400 hover:shadow-[0_0_0_1px_rgba(251,146,60,0.55),0_0_30px_rgba(251,146,60,0.6)] focus-visible:ring-2 focus-visible:ring-orange-300/80"

const dashboardCardClass =
  "group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white/85 via-white/70 to-zinc-50/60 backdrop-blur-xl shadow-[0_8px_26px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_14px_40px_rgba(15,23,42,0.16)] dark:border-border dark:bg-gradient-to-br dark:from-zinc-950/75 dark:via-zinc-950/55 dark:to-zinc-900/45 dark:hover:border-primary/45 dark:hover:shadow-[0_18px_44px_rgba(0,0,0,0.38)]"

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
    "Precatorio sem identificacao"
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
  const [tenantName, setTenantName] = useState<string>("Empresa atual")
  const [users, setUsers] = useState<LegalOpinionFormUserOption[]>([])
  const [precatorios, setPrecatorios] = useState<LegalOpinionFormPrecatorioOption[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

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

  const selectedPrecatorioFromQuery = searchParams.get("precatorioId")

  useEffect(() => {
    if (!selectedPrecatorioFromQuery) return
    setFilters((prev) => ({
      ...prev,
      precatorioId: selectedPrecatorioFromQuery,
    }))
  }, [selectedPrecatorioFromQuery])

  async function loadMetadata(search?: string) {
    setIsMetadataLoading(true)
    try {
      const metadata = await getLegalOpinionMetadata({ search })
      setTenantName(metadata.tenant?.name || "Empresa atual")
      setUsers(
        metadata.users.map((user) => ({
          id: user.id,
          nome: user.nome,
          email: user.email,
        }))
      )
      setPrecatorios(
        metadata.precatorios.map((precatorio) => ({
          id: precatorio.id,
          label: buildPrecatorioLabel(precatorio),
          subtitle: [precatorio.numero_processo, precatorio.credor_nome].filter(Boolean).join(" â€¢ "),
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
        origemSolicitacao: (activeFilters.origemSolicitacao || undefined) as LegalOpinionSource | undefined,
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

  useEffect(() => {
    void loadMetadata()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void loadOpinions(1, filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleApplyFilters() {
    await loadOpinions(1, filters)
  }

  async function handleClearFilters() {
    const next = {
      ...initialFilters,
      precatorioId: selectedPrecatorioFromQuery || "",
    }
    setFilters(next)
    await loadOpinions(1, next)
  }

  async function handlePageChange(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return
    await loadOpinions(nextPage, filters)
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-50 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black" />
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/20 via-sky-200/10 to-emerald-200/10 blur-3xl dark:from-primary/20 dark:via-orange-400/10 dark:to-sky-400/10" />
      <div className="pointer-events-none absolute top-28 right-[-9rem] -z-10 h-72 w-72 rounded-full bg-gradient-to-br from-amber-300/15 via-orange-300/10 to-cyan-300/10 blur-3xl dark:from-amber-500/18 dark:via-primary/14 dark:to-cyan-500/12" />
      <div className="pointer-events-none absolute bottom-10 left-[-8rem] -z-10 h-64 w-64 rounded-full bg-gradient-to-br from-primary/10 via-rose-200/10 to-amber-200/10 blur-3xl dark:from-primary/12 dark:via-rose-400/8 dark:to-amber-400/10" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <Card className="relative z-20 overflow-hidden rounded-3xl border border-border bg-white/90 px-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-border dark:bg-zinc-950/80 dark:shadow-[0_16px_42px_rgba(0,0,0,0.42)]">
        <Card.Header className="flex flex-wrap items-start justify-between gap-3 px-5 sm:px-6">
          <div>
            <Card.Title className="flex items-center gap-2 text-xl font-semibold">
              <Scale className="h-5 w-5 text-primary" />
              Parecer Juridico
            </Card.Title>
            <Card.Description>
              Lista de pareceres com filtros por status, tipo, prazo, responsavel e precatorio.
            </Card.Description>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" variant="flat" color="default">
              Empresa: {tenantName}
            </Chip>
            <Chip size="sm" variant="flat" color="warning">
              {total} parecer(es)
            </Chip>
            <Button variant="secondary" size="sm" onPress={() => void loadOpinions(page, filters)}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button
              color="primary"
              size="sm"
              className={REQUEST_OPINION_BUTTON_CLASS}
              onPress={() => setIsFormOpen(true)}
              isDisabled={isMetadataLoading}
            >
              <Plus className="h-4 w-4" />
              Solicitar Parecer
            </Button>
          </div>
        </Card.Header>
      </Card>

      <Card className={dashboardCardClass}>
        <Card.Header>
          <button
            type="button"
            onClick={() => setIsFiltersExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-left transition-colors hover:bg-default-100/40"
            aria-expanded={isFiltersExpanded}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-primary" />
              Filtros
            </span>
            <span className="text-muted-foreground">
              {isFiltersExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </button>
        </Card.Header>
        {isFiltersExpanded ? (
        <Card.Content className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2 md:col-span-2 xl:col-span-1">
              <Label htmlFor="legal-opinion-search">Busca</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="legal-opinion-search"
                  placeholder="Buscar por titulo, credor, numero do processo..."
                  className="pl-9"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status || "__all__"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value === "__all__" ? "" : (value as LegalOpinionStatus) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os status</SelectItem>
                  {LEGAL_OPINION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {LEGAL_OPINION_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={filters.type || "__all__"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, type: value === "__all__" ? "" : (value as LegalOpinionType) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os tipos</SelectItem>
                  {LEGAL_OPINION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {LEGAL_OPINION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={filters.priority || "__all__"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    priority: value === "__all__" ? "" : (value as LegalOpinionPriority),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as prioridades</SelectItem>
                  {LEGAL_OPINION_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {LEGAL_OPINION_PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Origem</Label>
              <Select
                value={filters.origemSolicitacao || "__all__"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    origemSolicitacao: value === "__all__" ? "" : (value as LegalOpinionSource),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as origens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as origens</SelectItem>
                  {LEGAL_OPINION_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {LEGAL_OPINION_SOURCE_LABELS[source]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsavel</Label>
              <Select
                value={filters.assignedTo || "__all__"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, assignedTo: value === "__all__" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os responsaveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os responsaveis</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>PrecatÃ³rio</Label>
              <Select
                value={filters.precatorioId || "__all__"}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, precatorioId: value === "__all__" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os precatorios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os precatorios</SelectItem>
                  {precatorios.map((precatorio) => (
                    <SelectItem key={precatorio.id} value={precatorio.id}>
                      {precatorio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due-start">Prazo inicial</Label>
              <Input
                id="due-start"
                type="date"
                value={filters.dueStart}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    dueStart: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-end">Prazo final</Label>
              <Input
                id="due-end"
                type="date"
                value={filters.dueEnd}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    dueEnd: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onPress={() => void handleClearFilters()}>
              Limpar
            </Button>
            <Button color="primary" onPress={() => void handleApplyFilters()}>
              Aplicar filtros
            </Button>
          </div>
        </Card.Content>
        ) : null}
      </Card>

      <Card className={dashboardCardClass}>
        <Card.Header className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {LEGAL_OPINION_STATUSES.map((status) => (
            <div
              key={status}
              className="rounded-xl border border-default-200/75 bg-default-100/45 px-3 py-2"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60">
                {LEGAL_OPINION_STATUS_LABELS[status]}
              </p>
              <p className="mt-1 text-lg font-bold">{statusCounters[status]}</p>
            </div>
          ))}
        </Card.Header>
        <Card.Content>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="sm" />
            </div>
          ) : opinions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum parecer encontrado para os filtros aplicados.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titulo</TableHead>
                    <TableHead>PrecatÃ³rio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Responsavel</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opinions.map((opinion) => (
                    <TableRow
                      key={opinion.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/parecer-juridico/detalhes?id=${opinion.id}`)}
                    >
                      <TableCell className="font-medium">{opinion.title}</TableCell>
                      <TableCell>{opinion.precatorio?.numero_precatorio || opinion.precatorio?.titulo || "-"}</TableCell>
                      <TableCell>{LEGAL_OPINION_TYPE_LABELS[opinion.type]}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={LEGAL_OPINION_STATUS_COLORS[opinion.status]}>
                          {LEGAL_OPINION_STATUS_LABELS[opinion.status]}
                        </Chip>
                      </TableCell>
                      <TableCell>{LEGAL_OPINION_PRIORITY_LABELS[opinion.priority]}</TableCell>
                      <TableCell>
                        {LEGAL_OPINION_SOURCE_LABELS[(opinion.origem_solicitacao || "manual") as LegalOpinionSource]}
                      </TableCell>
                      <TableCell>{formatDate(opinion.due_date)}</TableCell>
                      <TableCell>{opinion.assigned_to_user?.nome || "Nao atribuido"}</TableCell>
                      <TableCell>{formatDateTime(opinion.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Pagina {page} de {Math.max(totalPages, 1)} â€¢ {total} resultado(s)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={page <= 1}
                    onPress={() => void handlePageChange(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={page >= totalPages}
                    onPress={() => void handlePageChange(page + 1)}
                  >
                    Proxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card.Content>
      </Card>

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
            toast({
              title: "Parecer criado com sucesso.",
              description: created.title,
            })
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
    </div>
  )
}
