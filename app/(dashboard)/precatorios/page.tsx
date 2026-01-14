"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Send, Trash2, X, FileJson, Loader2, Filter, FileText, MoreVertical } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchBar } from "@/components/precatorios/search-bar"
import { AdvancedFilters } from "@/components/precatorios/advanced-filters"
import { usePrecatoriosSearch } from "@/hooks/use-precatorios-search"
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

  // Usar hook de busca avançada
  const {
    filtros,
    updateFiltros,
    clearFiltros,
    removeFiltro,
    setTermo,
    loading,
    resultados: precatoriosRaw,
    total: totalResultados,
    filtrosAtivos,
    refetch,
  } = usePrecatoriosSearch()

  // Estado para seleção em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [deletingBatch, setDeletingBatch] = useState(false)

  // Filtrar precatórios em cálculo para operador de cálculo (exceto se for admin ou gestor)
  const isCalculoOnly = userRole?.includes("operador_calculo") && !userRole?.includes("admin") && !userRole?.includes("gestor")
  const precatorios = isCalculoOnly
    ? precatoriosRaw.filter(p => p.status !== "em_calculo")
    : precatoriosRaw

  // Atualizar total após filtro
  const totalPrecatorios = precatorios.length

  const [sendToCalculoOpen, setSendToCalculoOpen] = useState(false)
  const [selectedPrecatorio, setSelectedPrecatorio] = useState<Precatorio | null>(null)
  const [selectedCalculoOperador, setSelectedCalculoOperador] = useState("")
  const [operadoresCalculo, setOperadoresCalculo] = useState<any[]>([])
  const [sending, setSending] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [precatorioToDelete, setPrecatorioToDelete] = useState<Precatorio | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importJsonOpen, setImportJsonOpen] = useState(false)

  useEffect(() => {
    loadUserInfo()
    loadOperadoresCalculo()
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

  async function loadOperadoresCalculo() {
    try {
      const supabase = getSupabase()
      if (supabase) {
        const { data } = await supabase
          .from("usuarios")
          .select("id, nome")
          .contains("role", ["operador_calculo"])
          .eq("ativo", true)

        if (data) setOperadoresCalculo(data)
      }
    } catch (error) {
      console.error("Erro ao carregar operadores de cálculo:", error)
    }
  }

  const temFiltrosAtivos = filtrosAtivos.length > 0
  const searchTerm = filtros.termo || ""

  async function handleEnviarParaCalculo() {
    if (!selectedPrecatorio || !selectedCalculoOperador) {
      toast({
        title: "Operador de cálculo obrigatório",
        description: "Você deve selecionar um operador de cálculo",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error("Supabase não disponível")

      const { error } = await supabase
        .from("precatorios")
        .update({
          responsavel_calculo_id: selectedCalculoOperador,
          operador_calculo: selectedCalculoOperador,
          status: "em_calculo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPrecatorio.id)

      if (error) throw error

      const operador = operadoresCalculo.find((o) => o.id === selectedCalculoOperador)

      await supabase.from("atividades").insert([
        {
          precatorio_id: selectedPrecatorio.id,
          tipo: "mudanca_status",
          descricao: `Precatório enviado para cálculo - Operador: ${operador?.nome || "usuário"}`,
        },
      ])

      toast({
        title: "Enviado para cálculo!",
        description: `Atribuído para ${operador?.nome}`,
      })

      await refetch()
      setSendToCalculoOpen(false)
      setSelectedPrecatorio(null)
      setSelectedCalculoOperador("")
    } catch (error: any) {
      console.error("Erro ao enviar para cálculo:", error)
      toast({
        title: "Erro ao enviar para cálculo",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-8">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent w-fit">
            Precatórios
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie a carteira de precatórios com eficiência</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setImportJsonOpen(true)} className="shadow-sm">
            <FileJson className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => router.push("/precatorios/novo")} className="shadow-md hover:shadow-lg transition-all">
            <Plus className="h-4 w-4 mr-2" />
            Novo Precatório
          </Button>
        </div>
      </div>

      {/* Toolbar de Filtros e Busca */}
      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={searchTerm}
                onChange={setTermo}
                onClear={() => setTermo("")}
                placeholder="Busque por título, número, credor ou processo..."
              />
            </div>
            <AdvancedFilters
              filtros={filtros}
              onFilterChange={updateFiltros}
              onClearFilters={clearFiltros}
              totalFiltrosAtivos={filtrosAtivos.length}
            />
          </div>

          {/* Badges e Ações em Lote */}
          {(temFiltrosAtivos || (!loading && precatorios.length > 0)) && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 flex-wrap">
                {temFiltrosAtivos && (
                  <>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-2">Filtros:</span>
                    {filtrosAtivos.map((filtro: any, index: number) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1.5 px-2.5 py-1"
                      >
                        <span className="font-semibold">{filtro.label}:</span>
                        <span>{filtro.value}</span>
                        <button
                          onClick={() => removeFiltro(filtro.key)}
                          className="ml-1 hover:text-destructive transition-colors"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" onClick={clearFiltros} className="text-xs h-7">
                      Limpar
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {totalPrecatorios} registros
                </div>
                {precatorios.filter(p => canDelete(p)).length > 0 && (
                  <div className="flex items-center gap-3 pl-4 border-l border-border/50">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.size > 0 && selectedIds.size === precatorios.filter(p => canDelete(p)).length}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="text-sm text-muted-foreground">Todos</span>
                    </div>
                    {selectedIds.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setBatchDeleteDialogOpen(true)}
                        className="h-8 text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Excluir ({selectedIds.size})
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de Cards */}
      <div className="grid gap-4">
        {precatorios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/20">
            <div className="bg-muted/50 p-4 rounded-full mb-4">
              {searchTerm || temFiltrosAtivos ? <Filter className="h-8 w-8 text-muted-foreground" /> : <FileText className="h-8 w-8 text-muted-foreground" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm || temFiltrosAtivos ? "Nenhum resultado encontrado" : "Sua lista está vazia"}
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6">
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
          precatorios.map((precatorio) => (
            <Card
              key={precatorio.id}
              className="group cursor-pointer hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/30"
              onClick={() => {
                if (userRole?.includes("operador_comercial")) {
                  router.push(`/precatorios/detalhes?id=${precatorio.id}`)
                } else {
                  router.push(`/precatorios/visualizar?id=${precatorio.id}`)
                }
              }}
            >
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Checkbox de Seleção */}
                  {canDelete(precatorio) && (
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(precatorio.id)}
                        onCheckedChange={() => toggleSelection(precatorio.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </div>
                  )}

                  {/* Conteúdo Principal */}
                  <div className="flex-1 space-y-4">
                    {/* Linha Superior: Título e Valor */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                            {precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                          </h3>
                          {precatorio.urgente && (
                            <Badge variant="destructive" className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                              Urgente
                            </Badge>
                          )}
                          <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground border-transparent uppercase tracking-wider">
                            {precatorio.status?.replace(/_/g, " ") || "NOVO"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-foreground">Credor:</span>
                            {precatorio.credor_nome}
                          </span>
                          {precatorio.tribunal && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span>{precatorio.tribunal}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                          {(() => {
                            const va = Number(precatorio.valor_atualizado ?? 0)
                            const vp = Number(precatorio.valor_principal ?? 0)
                            if (va > 0) {
                              return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(va)
                            } else if (vp > 0) {
                              return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(vp)
                            }
                            return <span className="text-muted-foreground text-lg">Aguardando Valor</span>
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                          {Number(precatorio.valor_atualizado ?? 0) > 0 ? "Valor Atualizado" : "Valor Principal"}
                        </div>
                      </div>
                    </div>

                    {/* Linha Inferior: Detalhes e Ações */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40">
                      {/* Highlights */}
                      <div className="flex flex-wrap gap-4 text-sm w-full sm:w-auto">
                        {precatorio.numero_processo && (
                          <div className="bg-muted/30 px-2 py-1 rounded text-muted-foreground text-xs">
                            Proc: <span className="font-medium text-foreground">{precatorio.numero_processo}</span>
                          </div>
                        )}
                        {(precatorio.proposta_menor_valor_display || precatorio.proposta_maior_valor_display) && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Propostas:</span>
                            <div className="flex items-center gap-1 font-medium bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                              {precatorio.proposta_menor_valor_display || "-"}
                              <span className="text-muted-foreground mx-1">até</span>
                              {precatorio.proposta_maior_valor_display || "-"}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end" onClick={(e) => e.stopPropagation()}>
                        {userRole?.includes("operador_comercial") && precatorio.responsavel === authUserId && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPrecatorio(precatorio)
                              setSendToCalculoOpen(true)
                            }}
                            className="h-8 text-xs font-medium"
                          >
                            <Send className="h-3 w-3 mr-1.5" />
                            Enviar p/ Cálculo
                          </Button>
                        )}

                        {/* Menu de Mais Ações para não poluir */}
                        {(canDelete(precatorio) || (userRole?.includes("operador_comercial") && precatorio.responsavel === authUserId)) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {canDelete(precatorio) && (
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
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o precatório "
              {precatorioToDelete?.titulo || precatorioToDelete?.numero_precatorio}"? Esta ação não pode ser
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

      <Dialog open={sendToCalculoOpen} onOpenChange={setSendToCalculoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar para Cálculo</DialogTitle>
            <DialogDescription>
              Selecione o operador de cálculo que será responsável por este precatório
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="calculo-operador">Operador de Cálculo *</Label>
              <Select value={selectedCalculoOperador} onValueChange={setSelectedCalculoOperador}>
                <SelectTrigger id="calculo-operador">
                  <SelectValue placeholder="Selecione o operador de cálculo" />
                </SelectTrigger>
                <SelectContent>
                  {operadoresCalculo.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendToCalculoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEnviarParaCalculo} disabled={sending || !selectedCalculoOperador}>
              {sending ? "Enviando..." : "Enviar para Cálculo"}
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
    </div>
  )
}