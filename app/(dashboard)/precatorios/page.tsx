"use client"
/* eslint-disable */

import React, { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  Button as HeroButton,
  Card as HeroCard,
  Checkbox as HeroCheckbox,
  Chip as HeroChip,
  Dropdown as HeroDropdown,
  DropdownPopover as HeroDropdownPopover,
  DropdownItem as HeroDropdownItem,
  DropdownMenu as HeroDropdownMenu,
  DropdownTrigger as HeroDropdownTrigger,
  Modal as HeroModal,
  Spinner as HeroSpinner,
} from "@heroui/react"
import { Plus, Trash2, X, FileJson, Loader2, Filter, FileText, MoreVertical, LayoutGrid, List } from "@/components/icons"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
import { maskProcesso } from "@/lib/masks"
import { useToast } from "@/hooks/use-toast"
import { ImportJsonModal } from "@/components/import/import-json-modal"
import { SearchBar } from "@/components/precatorios/search-bar"
import { AdvancedFilters } from "@/components/precatorios/advanced-filters"
import { usePrecatoriosSearch } from "@/hooks/use-precatorios-search"
import { STATUS_LABELS, STATUS_OPTIONS } from "@/lib/types/filtros"

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ")

const deleteActionPopoverClassName =
  "w-fit !min-w-0 md:!min-w-0 overflow-hidden rounded-xl border border-white/15 !bg-black p-0 text-white shadow-[0_20px_50px_-28px_rgba(0,0,0,0.95)]"
const deleteActionMenuClassName = "w-auto min-w-0 !bg-black !p-0 !gap-0 text-white"
const deleteActionItemClassName =
  "!m-0 !h-auto !min-h-0 !rounded-none !bg-transparent !px-0 !py-0 text-white outline-none transition-colors data-[focus=true]:!bg-black/40 data-[focus-visible=true]:!bg-black/40 data-[hover=true]:!bg-black/40 data-[hovered=true]:!bg-black/40"
const deleteActionItemStyle: React.CSSProperties = { padding: 0, minHeight: 0 }
const deleteActionContentClassName =
  "group flex w-full select-none items-center gap-3 rounded-lg border border-white/15 bg-black p-2 shadow-sm"

type ButtonVariant = "default" | "outline" | "ghost" | "destructive" | "secondary"

function Button({
  children,
  variant = "default",
  className,
  disabled,
  isLoading,
  size = "md",
  ...props
}: {
  children?: ReactNode
  variant?: ButtonVariant
  className?: string
  disabled?: boolean
  isLoading?: boolean
  size?: "sm" | "md" | "lg"
  [key: string]: unknown
}) {
  const heroVariant =
    variant === "outline"
      ? "outline"
      : variant === "ghost"
        ? "tertiary"
        : variant === "destructive"
          ? "danger"
          : "primary"
  const sizeClass = size === "sm" ? "h-9 px-3 text-sm" : size === "lg" ? "h-12 px-5 text-base" : "h-10 px-4 text-sm"
  return (
    <HeroButton
      {...(props as Record<string, unknown>)}
      variant={heroVariant}
      isDisabled={disabled || isLoading}
      className={cx(sizeClass, className)}
    >
      <span className="inline-flex items-center gap-2">
        {isLoading ? <HeroSpinner size="sm" /> : null}
        {children}
      </span>
    </HeroButton>
  )
}

function Badge({ children, className, variant }: { children?: ReactNode; className?: string; variant?: string }) {
  const colorClass =
    variant === "destructive"
      ? "bg-danger/15 text-danger border-danger/40"
      : "bg-default-100 text-foreground border-default-200/80"
  return (
    <HeroChip size="sm" className={cx("rounded-full px-2 py-1 text-xs font-semibold", colorClass, className)}>
      {children}
    </HeroChip>
  )
}

function Card({ children, className, ...props }: { children?: ReactNode; className?: string;[key: string]: unknown }) {
  return (
    <HeroCard {...(props as Record<string, unknown>)} className={cx("border border-default-200/60 shadow-sm", className)}>
      {children}
    </HeroCard>
  )
}

function CardContent({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

function Checkbox({
  checked,
  onCheckedChange,
  className,
  ...props
}: {
  checked?: boolean
  onCheckedChange?: (value: boolean) => void
  className?: string
  [key: string]: unknown
}) {
  return (
    <HeroCheckbox
      {...(props as Record<string, unknown>)}
      isSelected={Boolean(checked)}
      onChange={(v: boolean | undefined) => onCheckedChange?.(Boolean(v))}
      className={className}
    />
  )
}

type SelectContextType = {
  value?: string
  onChange?: (value: string) => void
}
const SelectContext = React.createContext<SelectContextType>({})

function Table({ children }: { children?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-default-200/60">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  )
}
function TableHeader({ children }: { children?: ReactNode }) {
  return <thead>{children}</thead>
}
function TableBody({ children }: { children?: ReactNode }) {
  return <tbody>{children}</tbody>
}
function TableRow({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cx("border-t border-default-200/60", className)} {...props}>
      {children}
    </tr>
  )
}
function TableHead({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cx("px-3 py-2 font-semibold text-foreground/70", className)}>{children}</th>
}
function TableCell({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cx("px-3 py-2 align-middle text-sm text-foreground", className)} {...props}>
      {children}
    </td>
  )
}

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <HeroModal isOpen={open} onOpenChange={onOpenChange}>
      <HeroModal.Trigger className="hidden">
        <span />
      </HeroModal.Trigger>
      <HeroModal.Backdrop className="bg-black/60" />
      <HeroModal.Container className="p-3">
        <HeroModal.Dialog className="w-[min(90vw,32rem)] rounded-2xl border border-default-200/70 bg-content1 shadow-xl">
          {children}
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal>
  )
}

function DialogContent({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 p-6">{children}</div>
}
function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>
}
function DialogTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold">{children}</h3>
}
function DialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-foreground/70">{children}</p>
}
function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-3 pt-2">{children}</div>
}

function AnimatedListItem({
  children,
  index,
}: {
  children: ReactNode
  index: number
}) {
  return <div data-index={index}>{children}</div>
}

export default function PrecatoriosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userRole, setUserRole] = useState<string[] | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [responsaveis, setResponsaveis] = useState<{ id: string; nome: string }[]>([])
  const [searchInput, setSearchInput] = useState("")

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [deletingBatch, setDeletingBatch] = useState(false)

  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const isCalculoOnly = userRole?.includes("operador_calculo") && !userRole?.includes("admin") && !userRole?.includes("gestor")
  const excludedStatuses = useMemo(() => (isCalculoOnly ? ["em_calculo"] : []), [isCalculoOnly])
  const searchOptions = useMemo(
    () => ({ page: currentPage, pageSize, excludedStatuses }),
    [currentPage, pageSize, excludedStatuses]
  )

  // Usar hook de busca avancada
  const {
    filtros,
    updateFiltros,
    clearFiltros,
    removeFiltro,
    setTermo,
    loading,
    initialized,
    resultados: precatorios,
    total: totalPrecatorios,
    summary,
    filtrosAtivos,
    refetch,
  } = usePrecatoriosSearch({}, searchOptions)

  const calculadosCount = summary.calculados
  const emCalculoOuNovoCount = summary.emCalculoOuNovo

  const responsavelAtivo = useMemo(() => {
    if (!filtros.responsavel_id) return null
    const match = responsaveis.find((r) => r.id === filtros.responsavel_id)
    return match?.nome || filtros.responsavel_id
  }, [filtros.responsavel_id, responsaveis])

  const statusValues = useMemo(() => new Set(STATUS_OPTIONS.map((option) => option.value)), [])
  const statusSelectValue =
    filtros.status?.length === 1 && statusValues.has(filtros.status[0]) ? filtros.status[0] : "todos"

  useEffect(() => {
    if (!filtros.status || filtros.status.length === 0) return

    const validStatus = filtros.status.filter((value) => statusValues.has(value))
    if (validStatus.length === filtros.status.length) return

    updateFiltros({
      ...filtros,
      status: validStatus.length > 0 ? validStatus : undefined,
    })
  }, [filtros, statusValues, updateFiltros])

  const handleStatusFilterChange = (value: string) => {
    const nextStatus = value === "todos" || !statusValues.has(value) ? undefined : [value]
    updateFiltros({
      ...filtros,
      status: nextStatus,
    })
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [precatorioToDelete, setPrecatorioToDelete] = useState<Precatorio | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importJsonOpen, setImportJsonOpen] = useState(false)

  useEffect(() => {
    loadUserInfo()
  }, [])

  async function loadUserInfo() {
    try {
      const supabase = getSupabase()

      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        setAuthUserId(user.id)

        const { data: perfil } = await supabase.from("usuarios").select("role").eq("id", user.id).single()
        setUserRole(perfil?.role || null)
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error)
    }
  }

  useEffect(() => {
    if (!userRole?.includes("admin")) {
      setResponsaveis([])
      return
    }

    ; (async () => {
      try {
        const supabase = getSupabase()
        if (!supabase) return

        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nome, role, ativo")
          .eq("ativo", true)
          .order("nome", { ascending: true })

        if (error) throw error

        const allowedRoles = new Set([
          "admin",
          "gestor",
          "gestor_oficio",
          "gestor_certidoes",
          "gestor_escrituras",
          "operador",
          "operador_comercial",
          "operador_calculo",
        ])

        const list =
          data?.filter((user: any) => {
            const roles = Array.isArray(user?.role) ? user.role : [user?.role].filter(Boolean)
            return roles.some((r: string) => allowedRoles.has(r))
          }) || []

        setResponsaveis(
          list.map((user: any) => ({
            id: user.id,
            nome: user.nome || "Sem nome",
          }))
        )
      } catch (err) {
        console.error("Erro ao carregar responsaveis:", err)
        setResponsaveis([])
      }
    })()
  }, [userRole])



  const temFiltrosAtivos = filtrosAtivos.length > 0 || !!filtros.responsavel_id
  const searchTerm = filtros.termo || ""

  useEffect(() => {
    setSearchInput(searchTerm)
  }, [searchTerm])

  const handleRemoveFiltro = (key: string) => {
    if (key === "termo") {
      setSearchInput("")
    }
    removeFiltro(key)
  }

  const handleClearAllFiltros = () => {
    setSearchInput("")
    clearFiltros()
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalPrecatorios / pageSize)), [totalPrecatorios, pageSize])
  const rangeStart = totalPrecatorios === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = totalPrecatorios === 0 ? 0 : Math.min(rangeStart + precatorios.length - 1, totalPrecatorios)

  useEffect(() => {
    setCurrentPage(1)
  }, [filtros, isCalculoOnly])

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages))
  }, [totalPages])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [currentPage, filtros, isCalculoOnly])


  async function handleDeletePrecatorio() {
    if (!precatorioToDelete) return

    setDeleting(true)
    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error("Supabase não disponível")

      const { error } = await supabase.rpc("delete_precatorio", { p_precatorio_id: precatorioToDelete.id })

      if (error) throw error

      toast({
        title: "Precatório excluído",
        description: "O precatório foi excluído com sucesso",
      })

      await refetch()
      setDeleteDialogOpen(false)
      setPrecatorioToDelete(null)
    } catch (error: any) {
      console.error("Erro ao excluir precatório:", error)
      toast({
        title: "Erro ao excluir precatório",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const canDelete = (precatorio: Precatorio) => {
    if (userRole?.includes("admin") || userRole?.includes("gestor")) return true
    if (userRole?.includes("operador_comercial")) {
      return precatorio.criado_por === authUserId
    }
    return false
  }

  function toggleSelection(id: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  function toggleSelectAll() {
    if (selectedIds.size === precatorios.filter(p => canDelete(p)).length) {
      setSelectedIds(new Set())
    } else {
      const allDeletable = new Set(
        precatorios
          .filter(p => canDelete(p))
          .map(p => p.id)
      )
      setSelectedIds(allDeletable)
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return

    setDeletingBatch(true)
    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error("Supabase não disponível")

      let successCount = 0
      let errorCount = 0

      for (const id of Array.from(selectedIds)) {
        try {
          const { error } = await supabase.rpc("delete_precatorio", { p_precatorio_id: id })
          if (error) errorCount++
          else successCount++
        } catch (error) {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast({
          title: "Exclusão concluída",
          description: `${successCount} precatórios excluídos.`,
        })
      }

      if (errorCount > 0) {
        toast({
          title: "Erro na exclusão",
          description: `Falha ao excluir ${errorCount} precatórios.`,
          variant: "destructive",
        })
      }

      await refetch()
      setSelectedIds(new Set())
      setBatchDeleteDialogOpen(false)
    } catch (error: any) {
      console.error("Erro na exclusão em lote:", error)
      toast({
        title: "Erro na exclusão em lote",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeletingBatch(false)
    }
  }

  const deletableCount = precatorios.filter((p) => canDelete(p)).length

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 pb-24 md:p-6 space-y-6">
      {/* Header de Módulo */}
      <section className="relative overflow-hidden rounded-3xl border border-border dark:border-border bg-gradient-to-br from-white via-white to-orange-50/70 dark:from-zinc-950/90 dark:via-zinc-950/85 dark:to-orange-950/30 p-5 md:p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
        <div className="pointer-events-none absolute -top-16 right-4 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground dark:text-muted-foreground">Carteira ativa</p>
              <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 dark:from-orange-300 dark:via-amber-200 dark:to-orange-100 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(251,146,60,0.28)]">
                Precatórios
              </h1>
              <p className="mt-2 text-sm font-medium text-muted-foreground dark:text-muted-foreground max-w-2xl">
                Gerencie a carteira com visão operacional clara, atalhos rápidos e filtros inteligentes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:pt-1">
              <Button
                variant="outline"
                onClick={() => setImportJsonOpen(true)}
                className="h-10 rounded-xl border-border dark:border-border bg-background/85 dark:bg-muted shadow-sm"
              >
                <FileJson className="h-4 w-4 mr-2" />
                Importar
              </Button>
              <Button
                onClick={() => router.push("/precatorios/novo")}
                className="h-10 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-[0_14px_28px_-18px_rgba(251,146,60,0.95)] hover:from-orange-400 hover:to-amber-400"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Precatório
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-border dark:border-border bg-background/80 dark:bg-muted px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground dark:text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-muted-foreground dark:text-muted-foreground">{totalPrecatorios}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/35 dark:border-emerald-400/35 bg-emerald-500/12 dark:bg-emerald-400/12 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Calculados</p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-300">{calculadosCount}</p>
            </div>
            <div className="rounded-2xl border border-primary/40 dark:border-primary/40 bg-primary/15 dark:bg-primary/15 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary dark:text-primary">Em cálculo / Novo</p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-primary dark:text-primary">{emCalculoOuNovoCount}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar de Filtros e Busca */}
      <div className="relative overflow-hidden rounded-2xl border border-border dark:border-border bg-muted dark:bg-muted backdrop-blur-md shadow-[0_20px_50px_-40px_rgba(15,23,42,0.85)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-56 bg-gradient-to-l from-orange-500/10 to-transparent dark:from-orange-400/12" />
        <div className="relative p-4 md:p-5 space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex-1">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                onSubmit={(value) => {
                  setSearchInput(value)
                  setTermo(value)
                }}
                onClear={() => setSearchInput("")}
                placeholder="Busque por título, número, credor ou processo..."
                autoSearch={false}
                showButton={true}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <HeroDropdown>
                <HeroDropdownTrigger>
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex h-11 w-[190px] items-center justify-between rounded-xl border border-default-200/70 bg-content1 px-3 text-sm font-medium text-foreground shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {statusSelectValue === "todos"
                      ? "Todos os status"
                      : STATUS_OPTIONS.find((o) => o.value === statusSelectValue)?.label || "Status"}
                  </span>
                </HeroDropdownTrigger>
                <HeroDropdownPopover>
                  <HeroDropdownMenu aria-label="Filtro status">
                    <HeroDropdownItem
                      key="todos"
                      onPress={() => handleStatusFilterChange("todos")}
                    >
                      Todos
                    </HeroDropdownItem>
                    {STATUS_OPTIONS.map((option) => (
                      <HeroDropdownItem
                        key={option.value}
                        onPress={() => handleStatusFilterChange(option.value)}
                      >
                        {option.label}
                      </HeroDropdownItem>
                    ))}
                  </HeroDropdownMenu>
                </HeroDropdownPopover>
              </HeroDropdown>
              <AdvancedFilters
                filtros={filtros}
                onFilterChange={updateFiltros}
                onClearFilters={handleClearAllFiltros}
                totalFiltrosAtivos={filtrosAtivos.length + (filtros.responsavel_id ? 1 : 0)}
                responsaveis={responsaveis}
                showResponsavelFilter={!!userRole?.includes("admin")}
              />
            </div>
            <div className="flex items-center justify-between gap-3 xl:ml-auto">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ring-ring dark:ring-ring bg-background/80 dark:bg-muted text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                <span>{totalPrecatorios} registros</span>
                {loading && initialized && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Atualizando...
                  </span>
                )}
              </div>
              <div className="hidden md:inline-flex items-center rounded-full border border-border dark:border-border bg-background/80 dark:bg-muted p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${viewMode === "cards"
                    ? "bg-primary/15 text-white shadow-[0_8px_20px_-14px_rgba(249,115,22,0.9)]"
                    : "text-muted-foreground dark:text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground"
                    }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${viewMode === "table"
                    ? "bg-primary/15 text-white shadow-[0_8px_20px_-14px_rgba(249,115,22,0.9)]"
                    : "text-muted-foreground dark:text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground"
                    }`}
                >
                  <List className="h-3.5 w-3.5" />
                  Tabela
                </button>
              </div>
            </div>
          </div>

          {temFiltrosAtivos && (
            <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-border dark:border-border">
              <span className="text-[11px] font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-[0.2em] mr-1">Filtros</span>
              {responsavelAtivo && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border"
                >
                  <span className="font-semibold">Responsável:</span>
                  <span>{responsavelAtivo}</span>
                  <button
                    onClick={() => handleRemoveFiltro("responsavel_id")}
                    className="ml-1 hover:text-destructive transition-colors"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filtrosAtivos.map((filtro: any, index: number) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border"
                >
                  <span className="font-semibold">{filtro.label}:</span>
                  <span>{filtro.displayValue}</span>
                  <button
                    onClick={() => handleRemoveFiltro(filtro.key)}
                    className="ml-1 hover:text-destructive transition-colors"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllFiltros}
                className="h-7 rounded-full text-xs text-muted-foreground dark:text-muted-foreground hover:text-muted-foreground dark:hover:text-muted-foreground"
              >
                Limpar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Lista */}
      {
        precatorios.length === 0 ? (
          <div className="relative overflow-hidden flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-border dark:border-border bg-gradient-to-br from-white/90 to-zinc-50/70 dark:from-zinc-950/80 dark:to-zinc-900/75">
            <div className="pointer-events-none absolute -top-12 right-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative bg-background/85 dark:bg-muted p-4 rounded-2xl border border-border dark:border-border mb-4">
              {searchTerm || temFiltrosAtivos ? <Filter className="h-8 w-8 text-muted-foreground" /> : <FileText className="h-8 w-8 text-muted-foreground" />}
            </div>
            <h3 className="relative text-lg font-semibold text-muted-foreground dark:text-muted-foreground mb-2">
              {searchTerm || temFiltrosAtivos ? "Nenhum resultado encontrado" : "Sua lista está vazia"}
            </h3>
            <p className="relative text-muted-foreground dark:text-muted-foreground max-w-sm mb-6">
              {searchTerm || temFiltrosAtivos
                ? "Tente ajustar os filtros ou termo de busca para encontrar o que procura."
                : "Comece adicionando novos precatórios para gerenciá-los aqui."}
            </p>
            {!searchTerm && !temFiltrosAtivos && (
              <Button onClick={() => router.push("/precatorios/novo")}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Precatório
              </Button>
            )}
          </div>
        ) : (
          <>
            {deletableCount > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-muted-foreground rounded-xl border border-border dark:border-border bg-background/70 dark:bg-muted px-3 py-2">
                <label className="flex items-center gap-2 font-medium">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === deletableCount}
                    onCheckedChange={toggleSelectAll}
                  />
                  Selecionar página
                </label>
                {selectedIds.size > 0 && (
                  <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">{selectedIds.size} selecionado(s)</span>
                )}
              </div>
            )}

            {/* Cards sempre no mobile */}
            <div className="grid gap-4 md:hidden">
              {precatorios.map((precatorio, index) => {
                const valorAtualizado = Number(precatorio.valor_atualizado || 0)
                const valorPrincipal = Number(precatorio.valor_principal || 0)
                const valorExibido = valorAtualizado > 0 ? valorAtualizado : valorPrincipal
                const valorLabel = valorAtualizado > 0 ? "Atualizado" : "Principal"
                const valorColorClass = valorAtualizado > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-primary dark:text-primary"
                const valorLabelColorClass = valorAtualizado > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-primary dark:text-primary"
                const statusLabel = STATUS_LABELS[precatorio.status || ""] || precatorio.status?.replace(/_/g, " ") || "Novo"
                const responsavelNome = precatorio.responsavel_nome || precatorio.responsavel_calculo_nome

                return (
                  <AnimatedListItem key={precatorio.id} index={index}>
                    <Card
                      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-primary/20 bg-content1 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.9)] hover:shadow-[0_22px_50px_-32px_rgba(249,115,22,0.45)] hover:-translate-y-[1px] transition dark:bg-zinc-900/72"
                      onClick={() => router.push(`/precatorios/detalhes?id=${precatorio.id}`)}
                    >
                      <div className="pointer-events-none absolute inset-0 hidden dark:block dark:opacity-[0.16]">
                        <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-gradient-to-br from-primary/38 to-transparent blur-3xl" />
                        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,hsl(var(--primary)/0.16)_0%,transparent_58%)]" />
                      </div>
                      <CardContent className="relative z-10 p-5">
                        <div className="flex gap-4">
                          {canDelete(precatorio) && (
                            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.has(precatorio.id)}
                                onCheckedChange={() => toggleSelection(precatorio.id)}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            </div>
                          )}

                          <div className="flex-1 space-y-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-300 dark:to-amber-200 bg-clip-text text-transparent">
                                      {precatorio.credor_nome || precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                                    </h3>
                                    <Badge className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border">
                                      {statusLabel}
                                    </Badge>
                                    {precatorio.urgente && (
                                      <Badge variant="destructive" className="px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                        Urgente
                                      </Badge>
                                    )}
                                  </div>
                                  {precatorio.titulo && (
                                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">{precatorio.titulo}</p>
                                  )}
                                  {responsavelNome && (
                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                      Responsável: <span className="font-medium text-muted-foreground dark:text-muted-foreground">{responsavelNome}</span>
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className={`text-xl font-semibold font-mono tabular-nums ${valorColorClass}`}>
                                    {valorExibido > 0
                                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorExibido)
                                      : "Aguardando"}
                                  </div>
                                  <div className={`mt-1 text-[11px] uppercase tracking-wide font-semibold ${valorLabelColorClass}`}>
                                    {valorExibido > 0 ? valorLabel : "Valor"}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-3 text-[13px] text-muted-foreground dark:text-muted-foreground rounded-xl border border-border dark:border-border !bg-background/95 dark:!bg-muted/95 p-3">
                                {precatorio.tribunal && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Tribunal</div>
                                    <div className="font-medium text-muted-foreground dark:text-muted-foreground">{precatorio.tribunal}</div>
                                  </div>
                                )}
                                {precatorio.numero_precatorio && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Nº Precatório</div>
                                    <div className="font-medium text-muted-foreground dark:text-muted-foreground">{precatorio.numero_precatorio}</div>
                                  </div>
                                )}
                                {precatorio.numero_processo && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Nº Processo</div>
                                    <div className="font-medium text-muted-foreground dark:text-muted-foreground">{maskProcesso(precatorio.numero_processo)}</div>
                                  </div>
                                )}
                                {precatorio.devedor && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Devedor</div>
                                    <div className="font-medium text-muted-foreground dark:text-muted-foreground">{precatorio.devedor}</div>
                                  </div>
                                )}
                                {precatorio.data_base && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Data-base</div>
                                    <div className="font-medium text-muted-foreground dark:text-muted-foreground">
                                      {new Date(precatorio.data_base).toLocaleDateString("pt-BR")}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-3 pt-3 border-t border-border dark:border-border">
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {precatorio.prioridade && (
                                    <Badge className="bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border">
                                      Prioridade {precatorio.prioridade}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  {canDelete(precatorio) && (
                                    <HeroDropdown placement="bottom-end" disableAnimation>
                                      <HeroDropdownTrigger>
                                        <span
                                          role="button"
                                          tabIndex={0}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-default-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </span>
                                      </HeroDropdownTrigger>
                                      <HeroDropdownPopover className={deleteActionPopoverClassName}>
                                        <HeroDropdownMenu aria-label="Acoes do precatorio" className={deleteActionMenuClassName}>
                                          <HeroDropdownItem
                                            key="delete"
                                            className={deleteActionItemClassName}
                                            style={deleteActionItemStyle}
                                            textValue="Excluir item"
                                            onPress={() => {
                                              setPrecatorioToDelete(precatorio)
                                              setDeleteDialogOpen(true)
                                            }}
                                          >
                                            <div className={deleteActionContentClassName}>
                                              <div className="flex shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger w-8 h-8">
                                                <Trash2 className="w-4 h-4" />
                                              </div>
                                              <div className="flex flex-1 flex-col justify-center">
                                                <p className="text-sm font-semibold text-white">Excluir item</p>
                                              </div>
                                            </div>
                                          </HeroDropdownItem>
                                        </HeroDropdownMenu>
                                      </HeroDropdownPopover>
                                    </HeroDropdown>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedListItem>
                )
              })}
            </div>

            {/* Tabela no desktop */}
            <div className="hidden md:block">
              {viewMode === "table" ? (
                <div className="rounded-2xl border border-border dark:border-border bg-gradient-to-br from-white/90 to-zinc-50/80 dark:from-zinc-950/85 dark:to-zinc-900/80 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.9)] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted dark:bg-muted">
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Credor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tribunal</TableHead>
                        <TableHead>Processo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Atualização</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {precatorios.map((precatorio) => {
                        const valorAtualizado = Number(precatorio.valor_atualizado || 0)
                        const valorPrincipal = Number(precatorio.valor_principal || 0)
                        const valorExibido = valorAtualizado > 0 ? valorAtualizado : valorPrincipal
                        const valorLabel = valorAtualizado > 0 ? "Atualizado" : "Principal"
                        const valorColorClass = valorAtualizado > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-primary dark:text-primary"
                        const valorLabelColorClass = valorAtualizado > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-primary dark:text-primary"
                        const statusLabel = STATUS_LABELS[precatorio.status || ""] || precatorio.status?.replace(/_/g, " ") || "Novo"

                        return (
                          <TableRow
                            key={precatorio.id}
                            className="cursor-pointer hover:bg-primary/15 dark:hover:bg-muted"
                            onClick={() => router.push(`/precatorios/detalhes?id=${precatorio.id}`)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {canDelete(precatorio) && (
                                <Checkbox
                                  checked={selectedIds.has(precatorio.id)}
                                  onCheckedChange={() => toggleSelection(precatorio.id)}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-primary dark:text-primary">{precatorio.credor_nome || precatorio.titulo}</div>
                              {precatorio.numero_precatorio && (
                                <div className="text-xs text-muted-foreground dark:text-muted-foreground">{precatorio.numero_precatorio}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border">
                                {statusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground dark:text-muted-foreground">{precatorio.tribunal || "-"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground dark:text-muted-foreground">
                              {precatorio.numero_processo ? maskProcesso(precatorio.numero_processo) : "-"}
                            </TableCell>
                            <TableCell>
                              <div className={`font-mono tabular-nums ${valorColorClass}`}>
                                {valorExibido > 0
                                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorExibido)
                                  : "-"}
                              </div>
                              <div className={`text-[10px] uppercase tracking-wide font-semibold ${valorLabelColorClass}`}>{valorLabel}</div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground dark:text-muted-foreground">
                              {new Date(precatorio.updated_at || precatorio.created_at).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              {canDelete(precatorio) && (
                                <HeroDropdown placement="bottom-end" disableAnimation>
                                  <HeroDropdownTrigger>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-default-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </span>
                                  </HeroDropdownTrigger>
                                  <HeroDropdownPopover className={deleteActionPopoverClassName}>
                                    <HeroDropdownMenu aria-label="Acoes do precatorio" className={deleteActionMenuClassName}>
                                      <HeroDropdownItem
                                        key="delete"
                                        className={deleteActionItemClassName}
                                        style={deleteActionItemStyle}
                                        textValue="Excluir item"
                                        onPress={() => {
                                          setPrecatorioToDelete(precatorio)
                                          setDeleteDialogOpen(true)
                                        }}
                                      >
                                        <div className={deleteActionContentClassName}>
                                          <div className="flex shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger w-8 h-8">
                                            <Trash2 className="w-4 h-4" />
                                          </div>
                                          <div className="flex flex-1 flex-col justify-center">
                                            <p className="text-sm font-semibold text-white">Excluir item</p>
                                          </div>
                                        </div>
                                      </HeroDropdownItem>
                                    </HeroDropdownMenu>
                                  </HeroDropdownPopover>
                                </HeroDropdown>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid gap-4">
                  {precatorios.map((precatorio, index) => {
                    const valorAtualizado = Number(precatorio.valor_atualizado || 0)
                    const valorPrincipal = Number(precatorio.valor_principal || 0)
                    const valorExibido = valorAtualizado > 0 ? valorAtualizado : valorPrincipal
                    const valorLabel = valorAtualizado > 0 ? "Atualizado" : "Principal"
                    const valorColorClass = valorAtualizado > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-primary dark:text-primary"
                    const valorLabelColorClass = valorAtualizado > 0 ? "text-emerald-600 dark:text-emerald-500" : "text-primary dark:text-primary"
                    const statusLabel = STATUS_LABELS[precatorio.status || ""] || precatorio.status?.replace(/_/g, " ") || "Novo"
                    const responsavelNome = precatorio.responsavel_nome || precatorio.responsavel_calculo_nome

                    return (
                      <AnimatedListItem key={precatorio.id} index={index}>
                        <Card
                          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-primary/20 bg-content1 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.9)] hover:shadow-[0_22px_50px_-32px_rgba(249,115,22,0.45)] hover:-translate-y-[1px] transition dark:bg-zinc-900/72"
                          onClick={() => router.push(`/precatorios/detalhes?id=${precatorio.id}`)}
                        >
                          <div className="pointer-events-none absolute inset-0 hidden dark:block dark:opacity-[0.16]">
                            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-gradient-to-br from-primary/38 to-transparent blur-3xl" />
                            <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,hsl(var(--primary)/0.16)_0%,transparent_58%)]" />
                          </div>
                          <CardContent className="relative z-10 p-5">
                            <div className="flex gap-4">
                              {canDelete(precatorio) && (
                                <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedIds.has(precatorio.id)}
                                    onCheckedChange={() => toggleSelection(precatorio.id)}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                </div>
                              )}

                              <div className="flex-1 space-y-4">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-300 dark:to-amber-200 bg-clip-text text-transparent">
                                        {precatorio.credor_nome || precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                                      </h3>
                                      <Badge className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border">
                                        {statusLabel}
                                      </Badge>
                                      {precatorio.urgente && (
                                        <Badge variant="destructive" className="px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                          Urgente
                                        </Badge>
                                      )}
                                    </div>
                                    {precatorio.titulo && (
                                      <p className="text-sm text-muted-foreground dark:text-muted-foreground">{precatorio.titulo}</p>
                                    )}
                                    {responsavelNome && (
                                      <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                        Responsável: <span className="font-medium text-muted-foreground dark:text-muted-foreground">{responsavelNome}</span>
                                      </p>
                                    )}
                                  </div>

                                  <div className="text-left md:text-right">
                                    <div className={`text-2xl font-semibold font-mono tabular-nums ${valorColorClass}`}>
                                      {valorExibido > 0
                                        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorExibido)
                                        : "Aguardando"}
                                    </div>
                                    <div className={`mt-1 text-[11px] uppercase tracking-wide font-semibold ${valorLabelColorClass}`}>
                                      {valorExibido > 0 ? valorLabel : "Valor"}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[13px] text-muted-foreground dark:text-muted-foreground rounded-xl border border-border dark:border-border !bg-background/95 dark:!bg-muted/95 p-3">
                                  {precatorio.tribunal && (
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Tribunal</div>
                                      <div className="font-medium text-muted-foreground dark:text-muted-foreground">{precatorio.tribunal}</div>
                                    </div>
                                  )}
                                  {precatorio.numero_precatorio && (
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Nº Precatório</div>
                                      <div className="font-medium text-muted-foreground dark:text-muted-foreground">{precatorio.numero_precatorio}</div>
                                    </div>
                                  )}
                                  {precatorio.numero_processo && (
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Nº Processo</div>
                                      <div className="font-medium text-muted-foreground dark:text-muted-foreground">{maskProcesso(precatorio.numero_processo)}</div>
                                    </div>
                                  )}
                                  {precatorio.devedor && (
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Devedor</div>
                                      <div className="font-medium text-muted-foreground dark:text-muted-foreground">{precatorio.devedor}</div>
                                    </div>
                                  )}
                                  {precatorio.data_base && (
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Data-base</div>
                                      <div className="font-medium text-muted-foreground dark:text-muted-foreground">
                                        {new Date(precatorio.data_base).toLocaleDateString("pt-BR")}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border dark:border-border">
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    {precatorio.prioridade && (
                                      <Badge className="bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border">
                                        Prioridade {precatorio.prioridade}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    {canDelete(precatorio) && (
                                      <HeroDropdown placement="bottom-end" disableAnimation>
                                        <HeroDropdownTrigger>
                                          <span
                                            role="button"
                                            tabIndex={0}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-default-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                          </span>
                                        </HeroDropdownTrigger>
                                        <HeroDropdownPopover className={deleteActionPopoverClassName}>
                                          <HeroDropdownMenu aria-label="Acoes do precatorio" className={deleteActionMenuClassName}>
                                            <HeroDropdownItem
                                              key="delete"
                                              className={deleteActionItemClassName}
                                              style={deleteActionItemStyle}
                                              textValue="Excluir item"
                                              onPress={() => {
                                                setPrecatorioToDelete(precatorio)
                                                setDeleteDialogOpen(true)
                                              }}
                                            >
                                              <div className={deleteActionContentClassName}>
                                                <div className="flex shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger w-8 h-8">
                                                  <Trash2 className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-1 flex-col justify-center">
                                                  <p className="text-sm font-semibold text-white">Excluir item</p>
                                                </div>
                                              </div>
                                            </HeroDropdownItem>
                                          </HeroDropdownMenu>
                                        </HeroDropdownPopover>
                                      </HeroDropdown>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </AnimatedListItem>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-default-200/70 bg-content1 px-4 py-3">
              <span className="text-sm text-foreground/70">
                Exibindo {rangeStart}-{rangeEnd} de {totalPrecatorios} precatórios
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <span className="min-w-[110px] text-center text-xs font-medium text-foreground/70">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )
      }

      {
        selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex flex-wrap items-center gap-2 rounded-full border border-border dark:border-border bg-background/95 dark:bg-muted shadow-[0_20px_45px_-30px_rgba(15,23,42,0.9)] px-4 py-2 backdrop-blur">
              <span className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground">
                {selectedIds.size} selecionado(s)
              </span>
              <div className="h-6 w-px bg-muted" />
              <Button variant="outline" size="sm" disabled title="Em breve">
                Exportar
              </Button>
              <Button variant="outline" size="sm" disabled title="Em breve">
                Mover status
              </Button>
              <Button variant="outline" size="sm" disabled title="Em breve">
                Atribuir responsável
              </Button>
              <Button variant="outline" size="sm" disabled title="Em breve">
                Gerar PDF
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBatchDeleteDialogOpen(true)}
              >
                Excluir
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Limpar
              </Button>
            </div>
          </div>
        )
      }

      <AlertDialog isOpen={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger">
                  <Trash2 className="w-5 h-5" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>Excluir este item?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Tem certeza que deseja remover permanentemente o precatório <strong>{precatorioToDelete?.titulo || precatorioToDelete?.numero_precatorio}</strong>? Esta ação não pode ser desfeita.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <HeroButton slot="close" variant="tertiary" onPress={() => setDeleteDialogOpen(false)}>
                  Cancelar
                </HeroButton>
                <HeroButton slot="close" variant="danger" onPress={handleDeletePrecatorio} isLoading={deleting}>
                  Excluir item
                </HeroButton>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão em Lote</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} precatório{selectedIds.size !== 1 ? 's' : ''}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchDeleteDialogOpen(false)}
              disabled={deletingBatch}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={deletingBatch}
            >
              {deletingBatch ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                `Excluir ${selectedIds.size} Precatório${selectedIds.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportJsonModal
        open={importJsonOpen}
        onOpenChange={setImportJsonOpen}
        onSuccess={() => {
          refetch()
          setImportJsonOpen(false)
        }}
      />
    </div >
  )
}

