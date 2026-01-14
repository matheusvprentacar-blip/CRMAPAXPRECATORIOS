"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  FileText,
  Search,
  UserPlus,
  Send,
  CheckCircle2,
  Clock,
  Plus,
  Loader2,
  Trash2,
  User,
  TrendingUp,
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { RoleGuard } from "@/lib/auth/role-guard"
import { toast } from "sonner"
import { UploadOficiosModal } from "@/components/admin/upload-oficios-modal"
import { trackSupabaseError, trackError } from "@/lib/utils/error-tracker"
import { Checkbox } from "@/components/ui/checkbox"

interface Usuario {
  id: string
  nome: string
  email: string
  role: string[] // Array de roles
}

interface PrecatorioAdmin {
  id: string
  titulo: string
  numero_precatorio: string
  numero_processo: string
  credor_nome: string
  tribunal: string
  valor_principal: number
  valor_atualizado: number
  status_kanban: string
  prioridade: string
  dono_usuario_id: string
  responsavel_calculo_id: string
  usuario_dono?: Usuario
  usuario_calculo?: Usuario
}

const KANBAN_PROGRESS: Record<string, number> = {
  entrada: 5,
  triagem: 15,
  documentos_credor: 25,
  certidoes: 35,
  pronto_calculo: 50,
  em_calculo: 65,
  analise_juridica: 75,
  recalculo: 80,
  calculo_concluido: 90,
  proposta: 95,
  fechado: 100,
}

const KANBAN_LABELS: Record<string, string> = {
  entrada: "Entrada",
  triagem: "Triagem",
  documentos_credor: "Documentos",
  certidoes: "Certidões",
  pronto_calculo: "Pronto p/ Cálculo",
  em_calculo: "Em Cálculo",
  analise_juridica: "Análise Jurídica",
  recalculo: "Recálculo",
  calculo_concluido: "Cálculo Concluído",
  proposta: "Proposta",
  fechado: "Fechado",
}

export default function AdminPrecatoriosPage() {
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioAdmin[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTab, setFiltroTab] = useState<"todos" | "distribuidos" | "pendentes">("todos")

  const [uploadOficiosOpen, setUploadOficiosOpen] = useState(false)
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPrecatorio, setSelectedPrecatorio] = useState<PrecatorioAdmin | null>(null)
  const [saving, setSaving] = useState(false)

  // Bulk Deletion State
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const [distribuicao, setDistribuicao] = useState({
    dono_usuario_id: "",
    responsavel_calculo_id: "none",
    prioridade: "media" as "baixa" | "media" | "alta" | "urgente",
  })
  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) loadData()
  }, [currentUser])

  async function loadCurrentUser() {
    const supabase = createBrowserClient()
    if (!supabase) return

    const { data } = await supabase.auth.getUser()
    if (data.user) setCurrentUser({ id: data.user.id })
  }

  async function loadData() {
    if (!currentUser) return

    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      console.log('[Admin] Carregando precatórios do admin:', currentUser.id)

      const { data, error } = await supabase
        .from("precatorios")
        .select("*")
        .eq("criado_por", currentUser.id)
        .order("created_at", { ascending: false })

      if (error) {
        trackSupabaseError('select precatorios admin', error, {
          userId: currentUser.id
        })
        throw error
      }

      console.log('[Admin] Precatórios carregados:', data?.length || 0)

      // Carregar dados dos usuários separadamente
      const precatoriosComUsuarios = await Promise.all(
        (data || []).map(async (prec: any) => {
          let usuario_dono = null
          let usuario_calculo = null

          if (prec.dono_usuario_id) {
            const { data: dono } = await supabase
              .from("usuarios")
              .select("id, nome, email, role")
              .eq("id", prec.dono_usuario_id)
              .single()
            usuario_dono = dono
          }

          if (prec.responsavel_calculo_id) {
            const { data: calculo } = await supabase
              .from("usuarios")
              .select("id, nome, email, role")
              .eq("id", prec.responsavel_calculo_id)
              .single()
            usuario_calculo = calculo
          }

          return { ...prec, usuario_dono, usuario_calculo }
        })
      )

      setPrecatorios(precatoriosComUsuarios)
      const { data: users } = await supabase
        .from("usuarios")
        .select("id, nome, email, role")
        .eq("ativo", true)

      // Filtrar em memória é mais seguro para arrays e evita erros 400 do PostgREST
      // com queries complexas de OR/contains

      const filteredUsers = (users || []).filter(u =>
        u.role && (
          u.role.includes("operador_comercial") ||
          u.role.includes("operador_calculo")
        )
      )

      setUsuarios(filteredUsers)
    } catch (error: any) {
      console.error('[Admin] Erro ao carregar dados:', error)
      trackError('Erro ao carregar dados admin', {
        error,
        userId: currentUser?.id
      }, 'high')
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
      // Reset selections on reload
      setSelectedIds([])
    }
  }

  async function handleDistribuir() {
    if (!selectedPrecatorio || !distribuicao.dono_usuario_id) return


    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      const updates: any = {
        responsavel: distribuicao.dono_usuario_id,
        dono_usuario_id: distribuicao.dono_usuario_id,
        prioridade: distribuicao.prioridade,
        // status: "distribuido", // Removido pois viola check constraint constraint 'precatorios_status_check'
      }

      if (distribuicao.responsavel_calculo_id !== "none") {
        updates.responsavel_calculo_id = distribuicao.responsavel_calculo_id
      }

      const { error } = await supabase
        .from("precatorios")
        .update(updates)
        .eq("id", selectedPrecatorio.id)

      if (error) {
        trackSupabaseError('distribuir precatorio', error, {
          precatorioId: selectedPrecatorio.id,
          distribuicao
        })
        throw error
      }

      console.log('[Admin] Precatório distribuído com sucesso')
      toast.success("Distribuído com sucesso!")
      setDistributeDialogOpen(false)
      setSelectedPrecatorio(null)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "Erro ao distribuir")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedPrecatorio) return
    async function handleDelete() {
      if (!selectedPrecatorio) return

      setSaving(true)
      try {
        const supabase = createBrowserClient()
        if (!supabase) throw new Error("Supabase não disponível")

        const { error } = await supabase.rpc("delete_precatorio", {
          p_precatorio_id: selectedPrecatorio.id,
        })

        if (error) {
          trackSupabaseError('delete precatorio', error, {
            precatorioId: selectedPrecatorio.id
          })
          throw error
        }

        console.log('[Admin] Precatório excluído com sucesso')
        toast.success("Excluído com sucesso!")
        setDeleteDialogOpen(false)
        setSelectedPrecatorio(null)
        await loadData()
      } catch (error: any) {
        toast.error(error.message || "Erro ao excluir")
      } finally {
        setSaving(false)
      }
    }

    async function handleBulkDelete() {
      if (selectedIds.length === 0) return

      setSaving(true)
      try {
        const supabase = createBrowserClient()
        if (!supabase) throw new Error("Supabase não disponível")

        // Use the bulk delete RPC
        const { error } = await supabase.rpc("delete_precatorios_bulk", {
          p_ids: selectedIds,
        })

        if (error) throw error

        toast.success(`${selectedIds.length} precatórios excluídos com sucesso!`)
        setBulkDeleteDialogOpen(false)
        setSelectedIds([])
        await loadData()
      } catch (error: any) {
        console.error("Bulk delete error:", error)
        toast.error(error.message || "Erro ao excluir em lote")
      } finally {
        setSaving(false)
      }
    }

    const toggleSelection = (id: string) => {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      )
    }

    const formatCurrency = (value: number | null | undefined) => {
      if (!value) return "R$ 0,00"
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    }

    const getPrioridadeVariant = (p: string): "destructive" | "default" | "secondary" | "outline" => {
      if (p === "urgente") return "destructive"
      if (p === "alta") return "default"
      if (p === "baixa") return "outline"
      return "secondary"
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
    }

    const operadoresComerciais = usuarios.filter((u) => u.role.includes("operador_comercial"))
    const operadoresCalculo = usuarios.filter((u) => u.role.includes("operador_calculo"))
    const precatoriosDistribuidos = precatorios.filter((p) => p.dono_usuario_id)
    const precatoriosPendentes = precatorios.filter((p) => !p.dono_usuario_id)

    let precatoriosFiltrados = precatorios
    if (filtroTab === "distribuidos") precatoriosFiltrados = precatoriosDistribuidos
    if (filtroTab === "pendentes") precatoriosFiltrados = precatoriosPendentes

    if (searchTerm) {
      precatoriosFiltrados = precatoriosFiltrados.filter(
        (p) =>
          p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    const isAllSelected = precatoriosFiltrados.length > 0 && selectedIds.length === precatoriosFiltrados.length

    const toggleSelectAll = () => {
      if (isAllSelected) {
        setSelectedIds([])
      } else {
        setSelectedIds(precatoriosFiltrados.map(p => p.id))
      }
    }

    return (
      <RoleGuard allowedRoles={["admin"]}>
        <div className="space-y-6 p-6 pb-24 relative">
          {/* Bulk Actions Floating Bar */}
          {selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-popover border shadow-2xl rounded-lg px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
              <span className="text-sm font-medium">{selectedIds.length} selecionado(s)</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Selecionados
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
              >
                Cancelar
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestão de Precatórios</h1>
              <p className="text-muted-foreground">Gerencie seus precatórios e distribua para operadores</p>
            </div>
            <Button onClick={() => setUploadOficiosOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload de Ofícios
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{precatorios.length}</div>
                <p className="text-xs text-muted-foreground">Criados por você</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Distribuídos</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{precatoriosDistribuidos.length}</div>
                <p className="text-xs text-muted-foreground">Atribuídos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{precatoriosPendentes.length}</div>
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(precatorios.reduce((s, p) => s + (p.valor_atualizado || p.valor_principal || 0), 0))}
                </div>
                <p className="text-xs text-muted-foreground">Soma total</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Meus Precatórios</CardTitle>
                  <CardDescription>Precatórios criados e gerenciados por você</CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs value={filtroTab} onValueChange={(v: any) => setFiltroTab(v)}>
                <div className="flex flex-col gap-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="todos">Todos ({precatorios.length})</TabsTrigger>
                    <TabsTrigger value="distribuidos">Distribuídos ({precatoriosDistribuidos.length})</TabsTrigger>
                    <TabsTrigger value="pendentes">Pendentes ({precatoriosPendentes.length})</TabsTrigger>
                  </TabsList>

                  {precatoriosFiltrados.length > 0 && (
                    <div className="flex items-center gap-2 px-1">
                      <Checkbox
                        id="select-all"
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                      <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium">
                        Selecionar Todos ({precatoriosFiltrados.length})
                      </Label>
                    </div>
                  )}
                </div>

                <TabsContent value={filtroTab} className="mt-6">
                  {precatoriosFiltrados.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum precatório encontrado</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {filtroTab === "todos" && "Faça upload dos ofícios requisitórios"}
                      </p>
                      {filtroTab === "todos" && (
                        <Button onClick={() => setUploadOficiosOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Upload de Ofícios
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {precatoriosFiltrados.map((prec) => {
                        const progress = KANBAN_PROGRESS[prec.status_kanban || "entrada"] || 0
                        const statusLabel = KANBAN_LABELS[prec.status_kanban || "entrada"] || prec.status_kanban
                        const isSelected = selectedIds.includes(prec.id)

                        return (
                          <Card
                            key={prec.id}
                            className={`hover:shadow-lg transition-all duration-200 relative ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : ''
                              }`}
                          >
                            <div className="absolute top-4 right-4 z-10">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(prec.id)}
                              />
                            </div>

                            <CardHeader className="pb-3 pr-10">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-base line-clamp-1" title={prec.titulo || prec.numero_precatorio}>
                                    {prec.titulo || prec.numero_precatorio}
                                  </CardTitle>
                                  <CardDescription className="line-clamp-1">{prec.credor_nome}</CardDescription>
                                </div>
                              </div>
                              <div className="mt-2">
                                <Badge variant={getPrioridadeVariant(prec.prioridade)}>
                                  {prec.prioridade || "média"}
                                </Badge>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Progresso</span>
                                  <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
                                </div>
                                <Progress value={progress} className="h-2" />
                                <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs">Valor</p>
                                  <p className="font-semibold text-xs">
                                    {formatCurrency(prec.valor_atualizado || prec.valor_principal)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Tribunal</p>
                                  <p className="font-semibold truncate text-xs">{prec.tribunal || "—"}</p>
                                </div>
                              </div>

                              {prec.dono_usuario_id && (
                                <div className="space-y-1 pt-2 border-t">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Comercial:</span>
                                    <span className="font-medium text-xs truncate max-w-[120px]">{prec.usuario_dono?.nome || "—"}</span>
                                  </div>
                                  {prec.responsavel_calculo_id && (
                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">Cálculo:</span>
                                      <span className="font-medium text-xs truncate max-w-[120px]">{prec.usuario_calculo?.nome || "—"}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    setSelectedPrecatorio(prec)
                                    setDistribuicao({
                                      dono_usuario_id: prec.dono_usuario_id || "",
                                      responsavel_calculo_id: prec.responsavel_calculo_id || "none",
                                      prioridade: (prec.prioridade as any) || "media",
                                    })
                                    setDistributeDialogOpen(true)
                                  }}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  {prec.dono_usuario_id ? "Redistr." : "Distribuir"}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => router.push(`/precatorios/visualizar?id=${prec.id}`)}>
                                  <FileText className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedPrecatorio(prec)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Modal de Upload de Ofícios */}
          <UploadOficiosModal
            open={uploadOficiosOpen}
            onOpenChange={setUploadOficiosOpen}
            onSuccess={() => loadData()}
          />

          {/* Dialog de Distribuição */}
          <Dialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Distribuir Precatório</DialogTitle>
                <DialogDescription>Atribua a um operador comercial</DialogDescription>
              </DialogHeader>
              {selectedPrecatorio && (
                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="font-semibold">{selectedPrecatorio.titulo || selectedPrecatorio.numero_precatorio}</p>
                  <p className="text-sm text-muted-foreground">Credor: {selectedPrecatorio.credor_nome}</p>
                  <p className="text-sm text-muted-foreground">
                    Valor: {formatCurrency(selectedPrecatorio.valor_atualizado || selectedPrecatorio.valor_principal)}
                  </p>
                </div>
              )}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Operador Comercial *</Label>
                  <Select
                    value={distribuicao.dono_usuario_id}
                    onValueChange={(v) => setDistribuicao({ ...distribuicao, dono_usuario_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {operadoresComerciais.map((op) => (
                        <SelectItem key={op.id} value={op.id}>{op.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Responsável pela negociação e acompanhamento comercial</p>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={distribuicao.prioridade}
                    onValueChange={(v: any) => setDistribuicao({ ...distribuicao, prioridade: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Define a ordem de prioridade no processamento</p>
                </div>
                <div className="space-y-2">
                  <Label>Operador de Cálculo (Opcional)</Label>
                  <Select
                    value={distribuicao.responsavel_calculo_id}
                    onValueChange={(v) => setDistribuicao({ ...distribuicao, responsavel_calculo_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {operadoresCalculo.map((op) => (
                        <SelectItem key={op.id} value={op.id}>{op.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Responsável técnico pelos cálculos e atualização dos valores</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDistributeDialogOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleDistribuir} disabled={saving || !distribuicao.dono_usuario_id}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Distribuir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* AlertDialog de Exclusão Individual */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{selectedPrecatorio?.titulo}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={saving}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* AlertDialog de Exclusão em Lote */}
          <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão em Lote</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <b>{selectedIds.length}</b> precatórios? Esta ação é irreversível.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  disabled={saving}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Excluir {selectedIds.length} Itens
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </RoleGuard>
    )
  }
