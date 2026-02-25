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
  LEGAL_OPINION_STATUSES,
  LEGAL_OPINION_STATUS_COLORS,
  LEGAL_OPINION_STATUS_LABELS,
  LEGAL_OPINION_TYPES,
  LEGAL_OPINION_TYPE_LABELS,
  type LegalOpinion,
  type LegalOpinionPriority,
  type LegalOpinionStatus,
  type LegalOpinionType,
} from "@/features/legal-opinion/types"
import { formatDate, formatDateTime } from "@/features/legal-opinion/format"
import { LegalOpinionFormModal, type LegalOpinionFormPrecatorioOption, type LegalOpinionFormUserOption } from "@/features/legal-opinion/components/legal-opinion-form-modal"
import { Filter, Plus, RefreshCw, Scale, Search } from "@/components/icons"

type FiltersState = {
  search: string
  status: LegalOpinionStatus | ""
  type: LegalOpinionType | ""
  priority: LegalOpinionPriority | ""
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
      const metadata = await getLegalOpinionMetadata({ search, precatorioLimit: 160 })
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
          subtitle: [precatorio.numero_processo, precatorio.credor_nome].filter(Boolean).join(" • "),
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
    <div className="space-y-4 p-4 md:p-6">
      <Card className="border border-default-200/75 bg-content1 shadow-sm">
        <Card.Header className="flex flex-wrap items-start justify-between gap-3">
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
            <Button color="primary" size="sm" onPress={() => setIsFormOpen(true)} isDisabled={isMetadataLoading}>
              <Plus className="h-4 w-4" />
              Solicitar Parecer
            </Button>
          </div>
        </Card.Header>
      </Card>

      <Card className="border border-default-200/75 bg-content1 shadow-sm">
        <Card.Header>
          <Card.Title className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-primary" />
            Filtros
          </Card.Title>
        </Card.Header>
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
              <Label>Precatório</Label>
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
      </Card>

      <Card className="border border-default-200/75 bg-content1 shadow-sm">
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
                    <TableHead>Precatório</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
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
                      <TableCell>{formatDate(opinion.due_date)}</TableCell>
                      <TableCell>{opinion.assigned_to_user?.nome || "Nao atribuido"}</TableCell>
                      <TableCell>{formatDateTime(opinion.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Pagina {page} de {Math.max(totalPages, 1)} • {total} resultado(s)
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
  )
}

