"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  FileText,
  Search,
  Send,
  CheckCircle2,
  Clock,
  Plus,
  Loader2,
  Trash2,
  User,
  TrendingUp,
  X,
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { RoleGuard } from "@/lib/auth/role-guard"
import { maskProcesso } from "@/lib/masks"
import { toast } from "sonner"

interface Usuario {
  id: string
  nome: string
  email: string
  role: string
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
  triagem_interesse: 15,
  analise_processual_inicial: 25,
  docs_credor: 35,
  pronto_calculo: 45,
  calculo_andamento: 55,
  juridico: 65,
  calculo_concluido: 75,
  proposta_negociacao: 85,
  proposta_aceita: 90,
  certidoes: 95,
  fechado: 100,
  pos_fechamento: 100,
  pausado_credor: 20,
  pausado_documentos: 30,
  sem_interesse: 100,
  reprovado: 100,
}

const KANBAN_LABELS: Record<string, string> = {
  entrada: "Entrada",
  triagem_interesse: "Triagem",
  analise_processual_inicial: "Análise Processual Inicial",
  docs_credor: "Documentos do credor",
  pronto_calculo: "Pronto para cálculo",
  calculo_andamento: "Cálculo em andamento",
  juridico: "Jurídico",
  calculo_concluido: "Cálculo concluído",
  proposta_negociacao: "Proposta / Negociação",
  proposta_aceita: "Proposta aceita",
  certidoes: "Certidões",
  fechado: "Fechado",
  pos_fechamento: "Pós-fechamento",
  pausado_credor: "Pausado (credor)",
  pausado_documentos: "Pausado (documentos)",
  sem_interesse: "Sem interesse",
  reprovado: "Reprovado / não elegível",
}

export default function AdminPrecatoriosPageImproved() {
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioAdmin[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTab, setFiltroTab] = useState<"todos" | "distribuidos" | "pendentes">("todos")

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPrecatorio, setSelectedPrecatorio] = useState<PrecatorioAdmin | null>(null)
  const [saving, setSaving] = useState(false)

  const [newPrecatorio, setNewPrecatorio] = useState({
    titulo: "",
    numero_precatorio: "",
    credor_nome: "",
    valor_principal: 0,
  })
  const [oficioFile, setOficioFile] = useState<File | null>(null)
  const [uploadingOficio, setUploadingOficio] = useState(false)

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

      const { data, error } = await supabase
        .from("precatorios")
        .select("*")
        .eq("created_by", currentUser.id)
        .order("created_at", { ascending: false })

      if (error) throw error

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
        .in("role", ["operador_comercial", "operador_calculo"])

      setUsuarios(users || [])
    } catch (error) {
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePrecatorio() {
    if (!currentUser || !newPrecatorio.credor_nome || !newPrecatorio.numero_precatorio) {
      toast.error("Preencha os campos obrigatórios")
      return
    }

    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      const { error } = await supabase.from("precatorios").insert({
        ...newPrecatorio,
        created_by: currentUser.id,
        responsavel: currentUser.id,
        status: "novo",
        status_kanban: "entrada",
      })

      if (error) throw error

      toast.success("Precatório criado!")
      setCreateDialogOpen(false)
      setNewPrecatorio({ titulo: "", numero_precatorio: "", credor_nome: "", valor_principal: 0 })
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar")
    } finally {
      setSaving(false)
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
        status: "distribuido",
      }

      if (distribuicao.responsavel_calculo_id !== "none") {
        updates.responsavel_calculo_id = distribuicao.responsavel_calculo_id
      }

      const { error } = await supabase
        .from("precatorios")
        .update(updates)
        .eq("id", selectedPrecatorio.id)

      if (error) throw error

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

    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      const { error } = await supabase.rpc("delete_precatorio", {
        p_precatorio_id: selectedPrecatorio.id,
      })

      if (error) throw error

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

  const operadoresComerciais = usuarios.filter((u) => u.role === "operador_comercial")
  const operadoresCalculo = usuarios.filter((u) => u.role === "operador_calculo")
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

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Precatórios</h1>
            <p className="text-muted-foreground">Gerencie seus precatórios e distribua para operadores</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Precatório
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="todos">Todos ({precatorios.length})</TabsTrigger>
                <TabsTrigger value="distribuidos">Distribuídos ({precatoriosDistribuidos.length})</TabsTrigger>
                <TabsTrigger value="pendentes">Pendentes ({precatoriosPendentes.length})</TabsTrigger>
              </TabsList>

              <TabsContent value={filtroTab} className="mt-6">
                {precatoriosFiltrados.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum precatório encontrado</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {filtroTab === "todos" && "Crie seu primeiro precatório"}
                    </p>
                    {filtroTab === "todos" && (
                      <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Precatório
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {precatoriosFiltrados.map((prec) => {
                      const progress = KANBAN_PROGRESS[prec.status_kanban || "entrada"] || 0
                      const statusLabel = KANBAN_LABELS[prec.status_kanban || "entrada"] || prec.status_kanban

                      return (
                        <Card key={prec.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base line-clamp-1">
                                  {prec.titulo || prec.numero_precatorio}
                                </CardTitle>
                                <CardDescription className="line-clamp-1">{prec.credor_nome}</CardDescription>
                              </div>
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
                                  <span className="font-medium text-xs">{prec.usuario_dono?.nome || "—"}</span>
                                </div>
                                {prec.responsavel_calculo_id && (
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Cálculo:</span>
                                    <span className="font-medium text-xs">{prec.usuario_calculo?.nome || "—"}</span>
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
                              <Button size="sm" variant="ghost" onClick={() => router.push(`/precatorios/${prec.id}`)}>
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

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Precatório</DialogTitle>
              <DialogDescription>
                Faça upload do ofício requisitório e atribua a um operador. O operador completará todas as informações.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Upload de Ofício */}
              <div className="space-y-2">
                <Label>Ofício Requisitório (Opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setOficioFile(file)
                    }}
                    className="flex-1"
                  />
                  {oficioFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOficioFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {oficioFile && (
                  <p className="text-xs text-muted-foreground">
                    Arquivo selecionado: {oficioFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Faça upload do ofício e o operador completará os dados do precatório
                </p>
              </div>

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={newPrecatorio.titulo}
                  onChange={(e) => setNewPrecatorio({ ...newPrecatorio, titulo: e.target.value })}
                  placeholder="Ex: Precatório João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label>Número do Precatório *</Label>
                <Input
                  value={newPrecatorio.numero_precatorio}
                  onChange={(e) => setNewPrecatorio({ ...newPrecatorio, numero_precatorio: maskProcesso(e.target.value) })}
                  placeholder="Ex: 0000132-37.2013.8.16.7000"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Credor *</Label>
                <Input
                  value={newPrecatorio.credor_nome}
                  onChange={(e) => setNewPrecatorio({ ...newPrecatorio, credor_nome: e.target.value })}
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Principal (R$)</Label>
                <Input
                  type="text"
                  value={newPrecatorio.valor_principal ? formatCurrency(newPrecatorio.valor_principal) : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.')
                    setNewPrecatorio({ ...newPrecatorio, valor_principal: parseFloat(value) || 0 })
                  }}
                  placeholder="R$ 0,00"
                />
                <p className="text-xs text-muted-foreground">
                  Opcional - pode ser preenchido depois pelo operador
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleCreatePrecatorio} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
      </div>
    </RoleGuard>
  )
}


