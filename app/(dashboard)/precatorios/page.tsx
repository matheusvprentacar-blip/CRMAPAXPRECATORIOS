"use client"
/* eslint-disable */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2, X, FileJson, Loader2, Filter, FileText, MoreVertical, LayoutGrid, List } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
import { maskProcesso } from "@/lib/masks"
import { useToast } from "@/hooks/use-toast"
import { ImportJsonModal } from "@/components/import/import-json-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SearchBar } from "@/components/precatorios/search-bar"
import { AdvancedFilters } from "@/components/precatorios/advanced-filters"
import { usePrecatoriosSearch } from "@/hooks/use-precatorios-search"
import { STATUS_LABELS, STATUS_OPTIONS } from "@/lib/types/filtros"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function PrecatoriosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userRole, setUserRole] = useState<string[] | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [responsaveis, setResponsaveis] = useState<{ id: string; nome: string }[]>([])

  // Usar hook de busca avançada
  const {
    filtros,
    updateFiltros,
    clearFiltros,
    removeFiltro,
    setTermo,
    loading,
    initialized,
    resultados: precatoriosRaw,
    filtrosAtivos,
    refetch,
  } = usePrecatoriosSearch()

  const [searchInput, setSearchInput] = useState("")

  // Estado para seleção em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [deletingBatch, setDeletingBatch] = useState(false)

  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")

  // Filtrar precatórios em cálculo para operador de cálculo (exceto se for admin ou gestor)
  const isCalculoOnly = userRole?.includes("operador_calculo") && !userRole?.includes("admin") && !userRole?.includes("gestor")
  const precatorios = isCalculoOnly
    ? precatoriosRaw.filter(p => p.status !== "em_calculo")
    : precatoriosRaw

  // Atualizar total após filtro
  const totalPrecatorios = precatorios.length

  const calculadosCount = useMemo(() => {
    return precatorios.filter((precatorio: any) => {
      const status = String(precatorio.status || "").toLowerCase()
      const statusKanban = String(precatorio.status_kanban || "").toLowerCase()
      return status === "calculado" || status === "concluido" || statusKanban === "calculo_concluido"
    }).length
  }, [precatorios])

  const emCalculoOuNovoCount = useMemo(() => {
    return precatorios.filter((precatorio: any) => {
      const status = String(precatorio.status || "").toLowerCase()
      const statusKanban = String(precatorio.status_kanban || "").toLowerCase()
      return status === "em_calculo" || status === "novo" || statusKanban === "calculo_andamento" || statusKanban === "entrada"
    }).length
  }, [precatorios])

  const responsavelAtivo = useMemo(() => {
    if (!filtros.responsavel_id) return null
    const match = responsaveis.find((r) => r.id === filtros.responsavel_id)
    return match?.nome || filtros.responsavel_id
  }, [filtros.responsavel_id, responsaveis])

  const statusSelectValue = filtros.status?.length === 1 ? filtros.status[0] : "todos"

  const handleStatusFilterChange = (value: string) => {
    updateFiltros({
      ...filtros,
      status: value === "todos" ? undefined : [value],
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

    ;(async () => {
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
          "operador",
          "operador_comercial",
          "operador_calculo",
        ])

        const list =
          data?.filter((user: any) => {
            const roles = Array.isArray(user?.role) ? user.role : [user?.role].filter(Boolean)
            return roles.some((r: string) => allowedRoles.has(r))
          }) ?? []

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
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/70 bg-gradient-to-br from-white via-white to-orange-50/70 dark:from-zinc-950/90 dark:via-zinc-950/85 dark:to-orange-950/30 p-5 md:p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
        <div className="pointer-events-none absolute -top-16 right-4 h-44 w-44 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">Carteira ativa</p>
              <h1 className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 dark:from-orange-300 dark:via-amber-200 dark:to-orange-100 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(251,146,60,0.28)]">
                Precatórios
              </h1>
              <p className="mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 max-w-2xl">
                Gerencie a carteira com visão operacional clara, atalhos rápidos e filtros inteligentes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:pt-1">
              <Button
                variant="outline"
                onClick={() => setImportJsonOpen(true)}
                className="h-10 rounded-xl border-zinc-300/80 dark:border-zinc-700/70 bg-white/85 dark:bg-zinc-900/70 shadow-sm"
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
            <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/80 dark:bg-zinc-900/65 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Total</p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">{totalPrecatorios}</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/50 dark:border-emerald-700/40 bg-emerald-50/70 dark:bg-emerald-950/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Calculados</p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">{calculadosCount}</p>
            </div>
            <div className="rounded-2xl border border-orange-300/50 dark:border-orange-700/40 bg-orange-50/70 dark:bg-orange-950/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">Em cálculo / Novo</p>
              <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-orange-700 dark:text-orange-300">{emCalculoOuNovoCount}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar de Filtros e Busca */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-zinc-50/90 dark:bg-zinc-950/85 backdrop-blur-md shadow-[0_20px_50px_-40px_rgba(15,23,42,0.85)]">
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
              <Select value={statusSelectValue} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="h-11 w-[190px] rounded-xl border-zinc-200/80 dark:border-zinc-700/60 bg-white/85 dark:bg-zinc-900/75">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ring-zinc-200/80 dark:ring-zinc-800/70 bg-white/80 dark:bg-zinc-900/70 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                <span>{totalPrecatorios} registros</span>
                {loading && initialized && (
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Atualizando...
                  </span>
                )}
              </div>
              <div className="hidden md:inline-flex items-center rounded-full border border-zinc-200/80 dark:border-zinc-700/70 bg-white/80 dark:bg-zinc-900/70 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "cards"
                      ? "bg-orange-500 text-white shadow-[0_8px_20px_-14px_rgba(249,115,22,0.9)]"
                      : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "table"
                      ? "bg-orange-500 text-white shadow-[0_8px_20px_-14px_rgba(249,115,22,0.9)]"
                      : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  Tabela
                </button>
              </div>
            </div>
          </div>

          {temFiltrosAtivos && (
            <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-zinc-200/70 dark:border-zinc-800/70">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] mr-1">Filtros</span>
              {responsavelAtivo && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-zinc-100/90 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-700/60"
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
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-zinc-100/90 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-700/60"
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
                className="h-7 rounded-full text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
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
          <div className="relative overflow-hidden flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-zinc-300/70 dark:border-zinc-700/70 bg-gradient-to-br from-white/90 to-zinc-50/70 dark:from-zinc-950/80 dark:to-zinc-900/75">
            <div className="pointer-events-none absolute -top-12 right-10 h-32 w-32 rounded-full bg-orange-400/15 blur-3xl" />
            <div className="relative bg-white/85 dark:bg-zinc-900/80 p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-700/70 mb-4">
              {searchTerm || temFiltrosAtivos ? <Filter className="h-8 w-8 text-muted-foreground" /> : <FileText className="h-8 w-8 text-muted-foreground" />}
            </div>
            <h3 className="relative text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {searchTerm || temFiltrosAtivos ? "Nenhum resultado encontrado" : "Sua lista está vazia"}
            </h3>
            <p className="relative text-zinc-600 dark:text-zinc-300 max-w-sm mb-6">
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
              <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-300 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/70 dark:bg-zinc-900/60 px-3 py-2">
                <label className="flex items-center gap-2 font-medium">
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === deletableCount}
                    onCheckedChange={toggleSelectAll}
                  />
                  Selecionar todos
                </label>
                {selectedIds.size > 0 && (
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{selectedIds.size} selecionado(s)</span>
                )}
              </div>
            )}

            {/* Cards sempre no mobile */}
            <div className="grid gap-4 md:hidden">
              {precatorios.map((precatorio) => {
                const valorAtualizado = Number(precatorio.valor_atualizado ?? 0)
                const valorPrincipal = Number(precatorio.valor_principal ?? 0)
                const valorExibido = valorAtualizado > 0 ? valorAtualizado : valorPrincipal
                const valorLabel = valorAtualizado > 0 ? "Atualizado" : "Principal"
                const valorColorClass = valorAtualizado > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"
                const statusLabel = STATUS_LABELS[precatorio.status ?? ""] || precatorio.status?.replace(/_/g, " ") || "Novo"
                const responsavelNome = precatorio.responsavel_nome || precatorio.responsavel_calculo_nome

                return (
                  <Card
                    key={precatorio.id}
                    className="group cursor-pointer rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-gradient-to-br from-white/90 to-zinc-50/80 dark:from-zinc-950/85 dark:to-zinc-900/80 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.9)] hover:shadow-[0_20px_45px_-30px_rgba(249,115,22,0.45)] hover:-translate-y-[1px] transition"
                    onClick={() => router.push(`/precatorios/detalhes?id=${precatorio.id}`)}
                  >
                    <CardContent className="p-5">
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
                                  <Badge className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-800/60">
                                    {statusLabel}
                                  </Badge>
                                  {precatorio.urgente && (
                                    <Badge variant="destructive" className="px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                      Urgente
                                    </Badge>
                                  )}
                                </div>
                                {precatorio.titulo && (
                                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{precatorio.titulo}</p>
                                )}
                                {responsavelNome && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Responsável: <span className="font-medium text-zinc-700 dark:text-zinc-200">{responsavelNome}</span>
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`text-xl font-semibold font-mono tabular-nums ${valorColorClass}`}>
                                  {valorExibido > 0
                                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorExibido)
                                    : "Aguardando"}
                                </div>
                                <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mt-1">
                                  {valorExibido > 0 ? valorLabel : "Valor"}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 text-[13px] text-zinc-600 dark:text-zinc-300 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/70 dark:bg-zinc-900/60 p-3">
                              {precatorio.tribunal && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Tribunal</div>
                                  <div className="font-medium text-zinc-800 dark:text-zinc-200">{precatorio.tribunal}</div>
                                </div>
                              )}
                              {precatorio.numero_precatorio && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Nº Precatório</div>
                                  <div className="font-medium text-zinc-800 dark:text-zinc-200">{precatorio.numero_precatorio}</div>
                                </div>
                              )}
                              {precatorio.numero_processo && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Nº Processo</div>
                                  <div className="font-medium text-zinc-800 dark:text-zinc-200">{maskProcesso(precatorio.numero_processo)}</div>
                                </div>
                              )}
                              {precatorio.devedor && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Devedor</div>
                                  <div className="font-medium text-zinc-800 dark:text-zinc-200">{precatorio.devedor}</div>
                                </div>
                              )}
                              {precatorio.data_base && (
                                <div>
                                  <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Data-base</div>
                                  <div className="font-medium text-zinc-800 dark:text-zinc-200">
                                    {new Date(precatorio.data_base).toLocaleDateString("pt-BR")}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-200/70 dark:border-zinc-800/60">
                              <div className="flex flex-wrap gap-2 text-xs">
                                {precatorio.prioridade && (
                                  <Badge className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-800/60">
                                    Prioridade {precatorio.prioridade}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {canDelete(precatorio) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive cursor-pointer"
                                        onClick={() => {
                                          setPrecatorioToDelete(precatorio)
                                          setDeleteDialogOpen(true)
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir Precatório
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Tabela no desktop */}
            <div className="hidden md:block">
              {viewMode === "table" ? (
                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-gradient-to-br from-white/90 to-zinc-50/80 dark:from-zinc-950/85 dark:to-zinc-900/80 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.9)] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-100/70 dark:bg-zinc-900/80">
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
                        const valorAtualizado = Number(precatorio.valor_atualizado ?? 0)
                        const valorPrincipal = Number(precatorio.valor_principal ?? 0)
                        const valorExibido = valorAtualizado > 0 ? valorAtualizado : valorPrincipal
                        const valorLabel = valorAtualizado > 0 ? "Atualizado" : "Principal"
                        const statusLabel = STATUS_LABELS[precatorio.status ?? ""] || precatorio.status?.replace(/_/g, " ") || "Novo"

                        return (
                          <TableRow
                            key={precatorio.id}
                            className="cursor-pointer hover:bg-orange-50/60 dark:hover:bg-zinc-900/60"
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
                              <div className="font-medium text-orange-500 dark:text-orange-400">{precatorio.credor_nome || precatorio.titulo}</div>
                              {precatorio.numero_precatorio && (
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">{precatorio.numero_precatorio}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-800/60">
                                {statusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">{precatorio.tribunal || "-"}</TableCell>
                            <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                              {precatorio.numero_processo ? maskProcesso(precatorio.numero_processo) : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                                {valorExibido > 0
                                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorExibido)
                                  : "-"}
                              </div>
                              <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{valorLabel}</div>
                            </TableCell>
                            <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                              {new Date(precatorio.updated_at || precatorio.created_at).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              {canDelete(precatorio) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive cursor-pointer"
                                      onClick={() => {
                                        setPrecatorioToDelete(precatorio)
                                        setDeleteDialogOpen(true)
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir Precatório
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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
                  {precatorios.map((precatorio) => {
                    const valorAtualizado = Number(precatorio.valor_atualizado ?? 0)
                    const valorPrincipal = Number(precatorio.valor_principal ?? 0)
                    const valorExibido = valorAtualizado > 0 ? valorAtualizado : valorPrincipal
                    const valorLabel = valorAtualizado > 0 ? "Atualizado" : "Principal"
                    const valorColorClass = valorAtualizado > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"
                    const statusLabel = STATUS_LABELS[precatorio.status ?? ""] || precatorio.status?.replace(/_/g, " ") || "Novo"
                    const responsavelNome = precatorio.responsavel_nome || precatorio.responsavel_calculo_nome

                    return (
                      <Card
                        key={precatorio.id}
                        className="group cursor-pointer rounded-2xl border border-zinc-200/80 dark:border-zinc-800/70 bg-gradient-to-br from-white/90 to-zinc-50/80 dark:from-zinc-950/85 dark:to-zinc-900/80 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.9)] hover:shadow-[0_22px_50px_-32px_rgba(249,115,22,0.45)] hover:-translate-y-[1px] transition"
                        onClick={() => router.push(`/precatorios/detalhes?id=${precatorio.id}`)}
                      >
                        <CardContent className="p-5">
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
                                    <Badge className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-800/60">
                                      {statusLabel}
                                    </Badge>
                                    {precatorio.urgente && (
                                      <Badge variant="destructive" className="px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                        Urgente
                                      </Badge>
                                    )}
                                  </div>
                                  {precatorio.titulo && (
                                    <p className="text-sm text-zinc-600 dark:text-zinc-300">{precatorio.titulo}</p>
                                  )}
                                  {responsavelNome && (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      Responsável: <span className="font-medium text-zinc-700 dark:text-zinc-200">{responsavelNome}</span>
                                    </p>
                                  )}
                                </div>

                                <div className="text-left md:text-right">
                                  <div className={`text-2xl font-semibold font-mono tabular-nums ${valorColorClass}`}>
                                    {valorExibido > 0
                                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorExibido)
                                      : "Aguardando"}
                                  </div>
                                  <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mt-1">
                                    {valorExibido > 0 ? valorLabel : "Valor"}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[13px] text-zinc-600 dark:text-zinc-300 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/70 dark:bg-zinc-900/60 p-3">
                                {precatorio.tribunal && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Tribunal</div>
                                    <div className="font-medium text-zinc-800 dark:text-zinc-200">{precatorio.tribunal}</div>
                                  </div>
                                )}
                                {precatorio.numero_precatorio && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Nº Precatório</div>
                                    <div className="font-medium text-zinc-800 dark:text-zinc-200">{precatorio.numero_precatorio}</div>
                                  </div>
                                )}
                                {precatorio.numero_processo && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Nº Processo</div>
                                    <div className="font-medium text-zinc-800 dark:text-zinc-200">{maskProcesso(precatorio.numero_processo)}</div>
                                  </div>
                                )}
                                {precatorio.devedor && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Devedor</div>
                                    <div className="font-medium text-zinc-800 dark:text-zinc-200">{precatorio.devedor}</div>
                                  </div>
                                )}
                                {precatorio.data_base && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Data-base</div>
                                    <div className="font-medium text-zinc-800 dark:text-zinc-200">
                                      {new Date(precatorio.data_base).toLocaleDateString("pt-BR")}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-200/70 dark:border-zinc-800/60">
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {precatorio.prioridade && (
                                    <Badge className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-800/60">
                                      Prioridade {precatorio.prioridade}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  {canDelete(precatorio) && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive cursor-pointer"
                                          onClick={() => {
                                            setPrecatorioToDelete(precatorio)
                                            setDeleteDialogOpen(true)
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir Precatório
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )
      }

      {
        selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex flex-wrap items-center gap-2 rounded-full border border-zinc-200/80 dark:border-zinc-800/70 bg-white/95 dark:bg-zinc-900/90 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.9)] px-4 py-2 backdrop-blur">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedIds.size} selecionado(s)
              </span>
              <div className="h-6 w-px bg-zinc-200" />
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o precatório &quot;
              {precatorioToDelete?.titulo || precatorioToDelete?.numero_precatorio}&quot;? Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeletePrecatorio} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir Precatório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

