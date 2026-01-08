"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Send, AlertCircle, Trash2, X, FileJson } from "lucide-react"
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

export default function PrecatoriosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  // Usar hook de busca avançada
  const {
    filtros,
    updateFiltros,
    clearFiltros,
    removeFiltro,
    setTermo,
    loading,
    resultados: precatorios,
    total: totalResultados,
    filtrosAtivos,
    refetch,
  } = usePrecatoriosSearch()

  const [sendToCalculoOpen, setSendToCalculoOpen] = useState(false)
  const [selectedPrecatorio, setSelectedPrecatorio] = useState<Precatorio | null>(null)
  const [selectedCalculoOperador, setSelectedCalculoOperador] = useState("")
  const [operadoresCalculo, setOperadoresCalculo] = useState<any[]>([])
  const [sending, setSending] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [precatorioToDelete, setPrecatorioToDelete] = useState<Precatorio | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importJsonOpen, setImportJsonOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

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
      console.error("[Precatorios] Erro ao carregar usuário:", error)
    }
  }

  async function loadOperadoresCalculo() {
    try {
      const supabase = getSupabase()
      if (supabase) {
        const { data } = await supabase
          .from("usuarios")
          .select("id, nome")
          .eq("role", "operador_calculo")
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
      toast({
        title: "Erro ao excluir precatório",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return

    setBulkDeleting(true)
    try {
      const supabase = getSupabase()
      if (!supabase) throw new Error("Supabase não disponível")

      let sucessos = 0
      let erros = 0

      for (const id of selectedIds) {
        try {
          const { error } = await supabase.rpc("delete_precatorio", { p_precatorio_id: id })
          if (error) throw error
          sucessos++
        } catch (error) {
          erros++
        }
      }

      toast({
        title: "Exclusão em lote concluída",
        description: `${sucessos} excluídos, ${erros} com erro`,
      })

      await refetch()
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
    } catch (error: any) {
      toast({
        title: "Erro ao excluir precatórios",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setBulkDeleting(false)
    }
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
    if (selectedIds.size === precatorios.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(precatorios.map(p => p.id)))
    }
  }

  const canDelete = (precatorio: Precatorio) => {
    if (userRole === "admin") return true
    if (userRole === "operador_comercial" || userRole === "operador_calculo") {
      return precatorio.criado_por === authUserId || precatorio.responsavel === authUserId
    }
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Precatórios</h1>
          <p className="text-muted-foreground">Gerencie todos os precatórios cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir {selectedIds.size} Selecionados
            </Button>
          )}
          <Button variant="outline" onClick={() => setImportJsonOpen(true)}>
            <FileJson className="h-4 w-4 mr-2" />
            Importar JSON
          </Button>
          <Button onClick={() => router.push("/precatorios/novo")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Precatório
          </Button>
        </div>
      </div>

      {/* Busca e Filtros */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <SearchBar 
            value={searchTerm} 
            onChange={setTermo}
            onClear={() => setTermo("")}
          />
          <AdvancedFilters
            filtros={filtros}
            onFilterChange={updateFiltros}
            onClearFilters={clearFiltros}
            totalFiltrosAtivos={filtrosAtivos.length}
          />
        </div>

        {/* Badges de filtros ativos */}
        {temFiltrosAtivos && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>
            {filtrosAtivos.map((filtro: any, index: number) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <span className="font-medium">{filtro.label}:</span>
                <span>{filtro.displayValue}</span>
                <button
                  onClick={() => removeFiltro(filtro.key)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFiltros}>
              Limpar todos
            </Button>
          </div>
        )}

        {/* Contador de resultados */}
        {!loading && (
          <div className="text-sm text-muted-foreground">
            {totalResultados} {totalResultados === 1 ? "precatório encontrado" : "precatórios encontrados"}
          </div>
        )}
      </div>

      {precatorios.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={selectedIds.size === precatorios.length}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span>
            {selectedIds.size === 0 
              ? "Selecionar todos" 
              : `${selectedIds.size} selecionados`}
          </span>
        </div>
      )}

      <div className="grid gap-4">
        {precatorios.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchTerm || temFiltrosAtivos ? "Nenhum precatório encontrado com os filtros aplicados" : "Nenhum precatório cadastrado"}
              </p>
              {!searchTerm && !temFiltrosAtivos && (
                <Button onClick={() => router.push("/precatorios/novo")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Precatório
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          precatorios.map((precatorio) => (
            <Card
              key={precatorio.id}
              className={`transition-colors ${selectedIds.has(precatorio.id) ? 'ring-2 ring-primary' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(precatorio.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleSelection(precatorio.id)
                    }}
                    className="h-5 w-5 rounded border-gray-300 mt-1"
                  />
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => router.push(`/precatorios/${precatorio.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                    <h3 className="font-semibold text-lg">
                      {precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                    </h3>
                    {precatorio.urgente && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertCircle className="h-3 w-3" />
                        Urgente
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">Credor: {precatorio.credor_nome}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      {precatorio.numero_processo && <span>Processo: {precatorio.numero_processo}</span>}
                      {precatorio.tribunal && <span>Tribunal: {precatorio.tribunal}</span>}
                    </div>
                    {(precatorio.proposta_menor_valor_display || precatorio.proposta_maior_valor_display) && (
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <span className="text-muted-foreground">Propostas:</span>
                        {precatorio.proposta_menor_valor_display && (
                          <span className="font-medium">
                            {precatorio.proposta_menor_valor_display}
                            {precatorio.proposta_menor_percentual && ` (${precatorio.proposta_menor_percentual}%)`}
                          </span>
                        )}
                        {precatorio.proposta_menor_valor_display && precatorio.proposta_maior_valor_display && (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {precatorio.proposta_maior_valor_display && (
                          <span className="font-medium">
                            {precatorio.proposta_maior_valor_display}
                            {precatorio.proposta_maior_percentual && ` (${precatorio.proposta_maior_percentual}%)`}
                          </span>
                        )}
                      </div>
                    )}
                        {precatorio.data_calculo_display && (
                          <div className="text-sm text-muted-foreground">Cálculo: {precatorio.data_calculo_display}</div>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                    <div className="text-lg font-bold">
                      {(() => {
                        const va = Number(precatorio.valor_atualizado ?? 0)
                        const vp = Number(precatorio.valor_principal ?? 0)
                        if (va > 0) {
                          return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(va)
                        } else if (vp > 0) {
                          return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(vp)
                        }
                        return "Aguardando"
                      })()}
                    </div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {precatorio.status?.replace(/_/g, " ") || "Novo"}
                    </div>
                    {userRole === "operador_comercial" && precatorio.responsavel === authUserId && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedPrecatorio(precatorio)
                          setSendToCalculoOpen(true)
                        }}
                        className="mt-2"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Enviar p/ Cálculo
                      </Button>
                    )}
                        {canDelete(precatorio) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPrecatorioToDelete(precatorio)
                              setDeleteDialogOpen(true)
                            }}
                            className="mt-2"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Excluir
                          </Button>
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

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão em Lote</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} precatórios selecionados? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? "Excluindo..." : `Excluir ${selectedIds.size} Precatórios`}
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
