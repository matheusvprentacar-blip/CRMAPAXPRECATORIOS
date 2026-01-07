"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Search, Filter, Send, AlertCircle, Trash2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
import { useToast } from "@/hooks/use-toast"
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

export default function PrecatoriosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [precatorios, setPrecatorios] = useState<Precatorio[]>([])
  const [filteredPrecatorios, setFilteredPrecatorios] = useState<Precatorio[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  const [sendToCalculoOpen, setSendToCalculoOpen] = useState(false)
  const [selectedPrecatorio, setSelectedPrecatorio] = useState<Precatorio | null>(null)
  const [selectedCalculoOperador, setSelectedCalculoOperador] = useState("")
  const [operadoresCalculo, setOperadoresCalculo] = useState<any[]>([])
  const [sending, setSending] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [precatorioToDelete, setPrecatorioToDelete] = useState<Precatorio | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadPrecatorios()
    loadOperadoresCalculo()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = precatorios.filter(
        (p) =>
          p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.numero_processo?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredPrecatorios(filtered)
    } else {
      setFilteredPrecatorios(precatorios)
    }
  }, [searchTerm, precatorios])

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

  async function loadPrecatorios() {
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

        let query = supabase.from("precatorios_cards").select("*").order("created_at", { ascending: false })

        if (perfil?.role === "operador_comercial") {
          query = query.or(`criado_por.eq.${user.id},responsavel.eq.${user.id}`)
        } else if (perfil?.role === "operador_calculo") {
          query = query.or(`criado_por.eq.${user.id},responsavel_calculo_id.eq.${user.id}`)
        }
        // Admin vê todos (sem filtro)

        const { data, error } = await query

        if (!error && data) {
          setPrecatorios(data as Precatorio[])
          setFilteredPrecatorios(data as Precatorio[])
        }
      }
    } catch (error) {
      console.error("[Precatorios] Erro ao carregar:", error)
    } finally {
      setLoading(false)
    }
  }

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

      await loadPrecatorios()
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

      console.log("[DELETE] id:", precatorioToDelete.id)

      const { error } = await supabase.rpc("delete_precatorio", { p_precatorio_id: precatorioToDelete.id })

      if (error) {
        console.error("[DELETE] rpc error:", error)
        throw error
      }

      toast({
        title: "Precatório excluído",
        description: "O precatório foi excluído com sucesso",
      })

      await loadPrecatorios()
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
        <Button onClick={() => router.push("/precatorios/novo")}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Precatório
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, número, credor ou processo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredPrecatorios.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Nenhum precatório encontrado" : "Nenhum precatório cadastrado"}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push("/precatorios/novo")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Precatório
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPrecatorios.map((precatorio) => (
            <Card
              key={precatorio.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push(`/precatorios/${precatorio.id}`)}
            >
              <CardContent className="p-6">
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
    </div>
  )
}
