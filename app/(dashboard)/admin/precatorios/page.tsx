"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import { FileText, Search, UserPlus, Send, CheckCircle2, Clock, Plus, Loader2, Trash2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { RoleGuard } from "@/lib/auth/role-guard"
import { useToast } from "@/hooks/use-toast"
import type { Precatorio } from "@/lib/types/database"

interface Usuario {
  id: string
  nome: string
  email: string
  role: string
}

interface PrecatorioComDistribuicao extends Precatorio {
  usuario_dono?: Usuario
  usuario_calculo?: Usuario
  criador?: Usuario
  ja_distribuido: boolean
}

export default function AdminPrecatoriosPage() {
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioComDistribuicao[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPrecatorio, setSelectedPrecatorio] = useState<PrecatorioComDistribuicao | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [newPrecatorio, setNewPrecatorio] = useState({
    titulo: "",
    numero_precatorio: "",
    numero_processo: "",
    tribunal: "",
    devedor: "",
    credor_nome: "",
    credor_cpf_cnpj: "",
    valor_principal: 0,
    data_base: "",
    data_expedicao: "",
    data_calculo: "",
    contatos: "",
  })

  const [distribuicao, setDistribuicao] = useState({
    dono_usuario_id: "",
    responsavel_calculo_id: "none", // Changed to "none" for no selection
    prioridade: "media" as const,
  })

  const operadoresComerciais = usuarios.filter((u) => u.role === "operador_comercial")
  const operadoresCalculo = usuarios.filter((u) => u.role === "operador_calculo")

  useEffect(() => {
    loadData()
    loadCurrentUser()
  }, [])

  async function loadCurrentUser() {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase.from("usuarios").select("id, role").eq("id", user.id).single()

      if (userData) {
        setCurrentUser({ id: userData.id, role: userData.role })
      }
    } catch (error) {
      console.error("Erro ao carregar usuário:", error)
    }
  }

  async function loadData() {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      console.log("[v0] Admin Precatórios - Iniciando loadData")

      // Não é possível usar FK notation em uma VIEW. Usar select simples.
      const { data: precatoriosData, error: precError } = await supabase
        .from("precatorios_cards")
        .select("*")
        .order("created_at", { ascending: false })

      console.log("[v0] Admin Precatórios - Query result:", {
        success: !precError,
        count: precatoriosData?.length || 0,
        error: precError,
        errorDetails: precError ? JSON.stringify(precError, null, 2) : null,
      })

      if (precError) {
        console.error("[v0] Admin Precatórios - Erro na query:", precError)
        toast({
          title: "Erro ao carregar precatórios",
          description: precError.message || "Erro ao buscar dados",
          variant: "destructive",
        })
        throw precError
      }

      console.log("[v0] Admin Precatórios - Dados carregados:", precatoriosData)

      // Adicionar flag de distribuição
      const precatoriosComFlag = (precatoriosData || []).map((p: any) => ({
        ...p,
        ja_distribuido: !!(p.dono_usuario_id || p.responsavel_calculo_id),
        usuario_dono: p.responsavel_nome
          ? {
              id: p.responsavel,
              nome: p.responsavel_nome,
              email: "",
              role: "",
            }
          : undefined,
        usuario_calculo: p.responsavel_calculo_nome
          ? {
              id: p.responsavel_calculo_id,
              nome: p.responsavel_calculo_nome,
              email: "",
              role: "",
            }
          : undefined,
        criador: p.criador_nome
          ? {
              id: p.criado_por,
              nome: p.criador_nome,
              email: p.criador_email || "",
              role: "",
            }
          : undefined,
      }))

      setPrecatorios(precatoriosComFlag)

      // Carregar usuários
      const { data: usuariosData, error: usersError } = await supabase
        .from("usuarios")
        .select("id, nome, email, role")
        .eq("ativo", true)
        .order("nome")

      if (usersError) throw usersError

      setUsuarios(usuariosData || [])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os precatórios",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePrecatorio() {
    setSaving(true)
    try {
      const emptyToNull = (v: any) => (v === "" || v === undefined ? null : v)

      // Converte DD/MM/AAAA -> AAAA-MM-DD (se já for ISO, mantém)
      const toISODate = (v: any) => {
        v = emptyToNull(v)
        if (!v) return null
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v

        const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (m) return `${m[3]}-${m[2]}-${m[1]}`

        return null // evita mandar data inválida
      }

      // Limpa "" -> null em todo o objeto
      const cleanEmptyStrings = (obj: any) =>
        Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === "" ? null : v]))

      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      const { data: userData } = await supabase.auth.getUser()

      const payload = cleanEmptyStrings({
        ...newPrecatorio,
        criado_por: userData.user?.id,
        status: "novo",

        // Datas (date) - converte para formato ISO YYYY-MM-DD
        data_base: toISODate(newPrecatorio.data_base),
        data_expedicao: toISODate(newPrecatorio.data_expedicao),
        data_calculo: toISODate(newPrecatorio.data_calculo),

        // Não envie created_at/updated_at no insert (deixe o banco preencher)
        created_at: undefined,
        updated_at: undefined,
      })

      // remove undefined (pra não enviar campos)
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

      console.log("[v0] Payload limpo:", payload)

      const { data, error } = await supabase.from("precatorios").insert([payload]).select()

      if (error) {
        console.error("[v0] Erro insert precatorios:", JSON.stringify(error, null, 2))
        throw error
      }

      toast({
        title: "Precatório criado com sucesso!",
        description: "O precatório foi adicionado ao sistema",
      })

      await loadData()
      setCreateDialogOpen(false)
      setNewPrecatorio({
        titulo: "",
        numero_precatorio: "",
        numero_processo: "",
        tribunal: "",
        devedor: "",
        credor_nome: "",
        credor_cpf_cnpj: "",
        valor_principal: 0,
        data_base: "",
        data_expedicao: "",
        data_calculo: "",
        contatos: "",
      })
    } catch (error: any) {
      console.log("[v0] Erro ao criar precatório:", error)
      toast({
        title: "Erro ao criar precatório",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDistribuir() {
    if (!selectedPrecatorio || !distribuicao.dono_usuario_id) return

    const supabase = createBrowserClient()
    setSaving(true)

    try {
      const updates: any = {
        responsavel: distribuicao.dono_usuario_id,
        dono_usuario_id: distribuicao.dono_usuario_id,
        prioridade: distribuicao.prioridade,
        status: "novo",
        updated_at: new Date().toISOString(),
      }

      // If operador de cálculo is assigned, send directly to calculation
      if (distribuicao.responsavel_calculo_id && distribuicao.responsavel_calculo_id !== "none") {
        updates.responsavel_calculo_id = distribuicao.responsavel_calculo_id
        updates.operador_calculo = distribuicao.responsavel_calculo_id
        updates.status = "em_calculo"
      }

      const { error } = await supabase.from("precatorios").update(updates).eq("id", selectedPrecatorio.id)

      if (error) throw error

      toast({
        title: "Precatório distribuído",
        description: "O precatório foi distribuído com sucesso",
      })

      setDistributeDialogOpen(false)
      setSelectedPrecatorio(null)
      await loadData()
    } catch (error: any) {
      console.error("[ADMIN] Erro ao distribuir:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível distribuir o precatório",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePrecatorio() {
    if (!selectedPrecatorio) return
    setSaving(true)

    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      console.log("[DELETE] id:", selectedPrecatorio.id)

      const { error } = await supabase.rpc("delete_precatorio", {
        p_precatorio_id: selectedPrecatorio.id,
      })

      if (error) {
        console.error("[DELETE] rpc error:", error)
        throw error
      }

      toast({
        title: "Precatório excluído com sucesso!",
        description: "O precatório foi removido do sistema",
      })

      await loadData()
      setDeleteDialogOpen(false)
      setSelectedPrecatorio(null)
    } catch (error: any) {
      toast({
        title: "Erro ao excluir precatório",
        description: error.message || "Não foi possível excluir o precatório",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleMarcarUrgente(precatorioId: string, urgente: boolean) {
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      const { error } = await supabase.from("precatorios").update({ urgente }).eq("id", precatorioId)

      if (error) throw error

      await supabase.from("atividades").insert([
        {
          precatorio_id: precatorioId,
          tipo: "mudanca_status",
          descricao: urgente ? "Precatório marcado como urgente" : "Urgência removida do precatório",
        },
      ])

      toast({
        title: urgente ? "Marcado como urgente" : "Urgência removida",
        description: urgente ? "O precatório será priorizado na fila" : "O precatório voltou à ordem normal",
      })

      await loadData()
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar urgência",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  function canDeletePrecatorio(precatorio: PrecatorioComDistribuicao): boolean {
    if (!currentUser) return false

    // Admin can delete any
    if (currentUser.role === "admin") return true

    // Operador comercial can delete if they are the creator or responsible
    if (currentUser.role === "operador_comercial") {
      return precatorio.criado_por === currentUser.id || precatorio.dono_usuario_id === currentUser.id
    }

    return false
  }

  const filteredPrecatorios = precatorios.filter(
    (p) =>
      p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const precatoriosDistribuidos = precatorios.filter((p) => p.ja_distribuido)
  const precatoriosPendentes = precatorios.filter((p) => !p.ja_distribuido)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando precatórios...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Precatórios (Admin)</h1>
          <p className="text-muted-foreground">Crie e distribua precatórios para operadores</p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Precatórios</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{precatorios.length}</div>
              <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distribuídos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{precatoriosDistribuidos.length}</div>
              <p className="text-xs text-muted-foreground">Atribuídos a operadores</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{precatoriosPendentes.length}</div>
              <p className="text-xs text-muted-foreground">Aguardando distribuição</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operadores Ativos</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.length}</div>
              <p className="text-xs text-muted-foreground">Disponíveis para atribuição</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Precatórios */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Precatórios</CardTitle>
                <CardDescription>Gerencie e distribua precatórios</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Precatório
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Precatório</DialogTitle>
                      <DialogDescription>Preencha os dados básicos do precatório</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="titulo">Título *</Label>
                          <Input
                            id="titulo"
                            value={newPrecatorio.titulo}
                            onChange={(e) => setNewPrecatorio({ ...newPrecatorio, titulo: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="numero">Número do Precatório *</Label>
                          <Input
                            id="numero"
                            value={newPrecatorio.numero_precatorio}
                            onChange={(e) => setNewPrecatorio({ ...newPrecatorio, numero_precatorio: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="processo">Número do Processo</Label>
                          <Input
                            id="processo"
                            value={newPrecatorio.numero_processo}
                            onChange={(e) => setNewPrecatorio({ ...newPrecatorio, numero_processo: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tribunal">Tribunal *</Label>
                          <Input
                            id="tribunal"
                            placeholder="Ex: TJ-SP, TRF-1, TRF-2, etc"
                            value={newPrecatorio.tribunal}
                            onChange={(e) => setNewPrecatorio({ ...newPrecatorio, tribunal: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="devedor">Devedor *</Label>
                        <Input
                          id="devedor"
                          value={newPrecatorio.devedor}
                          onChange={(e) => setNewPrecatorio({ ...newPrecatorio, devedor: e.target.value })}
                          disabled={saving}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="credor">Nome do Credor *</Label>
                          <Input
                            id="credor"
                            value={newPrecatorio.credor_nome}
                            onChange={(e) => setNewPrecatorio({ ...newPrecatorio, credor_nome: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cpf">CPF/CNPJ do Credor *</Label>
                          <Input
                            id="cpf"
                            value={newPrecatorio.credor_cpf_cnpj}
                            onChange={(e) => setNewPrecatorio({ ...newPrecatorio, credor_cpf_cnpj: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="valor">Valor Principal *</Label>
                          <CurrencyInput
                            id="valor"
                            value={newPrecatorio.valor_principal}
                            onChange={(value) => setNewPrecatorio({ ...newPrecatorio, valor_principal: value })}
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="data_base">Data Base</Label>
                          <Input
                            id="data_base"
                            type="date"
                            value={newPrecatorio.data_base}
                            onChange={(e) => setNewPrecatorio({ ...newPrecatorio, data_base: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="data_expedicao">Data Expedição</Label>
                          <Input
                            id="data_expedicao"
                            type="date"
                            value={newPrecatorio.data_expedicao}
                            onChange={(e) => setNewPrecatorio({ ...newPrecatorio, data_expedicao: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="data_calculo">Data de Cálculo</Label>
                          <Input
                            id="data_calculo"
                            type="date"
                            value={newPrecatorio.data_calculo}
                            onChange={(e) => setNewPrecatorio({ ...newPrecatorio, data_calculo: e.target.value })}
                            disabled={saving}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contatos">Observações</Label>
                        <Textarea
                          id="contatos"
                          value={newPrecatorio.contatos}
                          onChange={(e) => setNewPrecatorio({ ...newPrecatorio, contatos: e.target.value })}
                          disabled={saving}
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={saving}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreatePrecatorio}
                        disabled={
                          saving ||
                          !newPrecatorio.titulo ||
                          !newPrecatorio.numero_precatorio ||
                          !newPrecatorio.tribunal ||
                          !newPrecatorio.devedor ||
                          !newPrecatorio.credor_nome ||
                          !newPrecatorio.credor_cpf_cnpj
                        }
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Precatório
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar precatórios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, número ou credor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Credor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsáveis</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrecatorios.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum precatório encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPrecatorios.map((precatorio) => (
                        <TableRow key={precatorio.id}>
                          <TableCell className="font-medium">{precatorio.titulo}</TableCell>
                          <TableCell>{precatorio.numero_precatorio}</TableCell>
                          <TableCell>{precatorio.credor_nome}</TableCell>
                          <TableCell>
                            {precatorio.proposta_menor_valor_display ||
                              new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(precatorio.valor_principal || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={precatorio.ja_distribuido ? "default" : "secondary"} className="capitalize">
                              {precatorio.ja_distribuido ? "Distribuído" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              {precatorio.usuario_dono && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  <span>{precatorio.usuario_dono.nome}</span>
                                </div>
                              )}
                              {precatorio.usuario_calculo && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                  <span>{precatorio.usuario_calculo.nome}</span>
                                </div>
                              )}
                              {!precatorio.usuario_dono && !precatorio.usuario_calculo && (
                                <span className="text-muted-foreground">Não atribuído</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPrecatorio(precatorio)
                                  setDistribuicao({
                                    dono_usuario_id: precatorio.dono_usuario_id || "",
                                    responsavel_calculo_id: precatorio.responsavel_calculo_id || "none",
                                    prioridade: precatorio.prioridade || "media",
                                  })
                                  setDistributeDialogOpen(true)
                                }}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Distribuir
                              </Button>
                              {canDeletePrecatorio(precatorio) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPrecatorio(precatorio)
                                    setDeleteDialogOpen(true)
                                  }}
                                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarcarUrgente(precatorio.id, !precatorio.urgente)}
                              >
                                {precatorio.urgente ? "Desmarcar como Urgente" : "Marcar como Urgente"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Dialog */}
        <Dialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Distribuir Precatório</DialogTitle>
              <DialogDescription>Atribua operadores e defina a prioridade do precatório</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="dono-operador">Operador Comercial *</Label>
                <Select
                  value={distribuicao.dono_usuario_id}
                  onValueChange={(value) =>
                    setDistribuicao((prev) => ({
                      ...prev,
                      dono_usuario_id: value,
                    }))
                  }
                >
                  <SelectTrigger id="dono-operador">
                    <SelectValue placeholder="Selecione o operador comercial" />
                  </SelectTrigger>
                  <SelectContent>
                    {operadoresComerciais.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select
                  value={distribuicao.prioridade}
                  onValueChange={(value: "baixa" | "media" | "alta" | "urgente") =>
                    setDistribuicao((prev) => ({
                      ...prev,
                      prioridade: value,
                    }))
                  }
                >
                  <SelectTrigger id="prioridade">
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
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDistributeDialogOpen(false)
                  setSelectedPrecatorio(null)
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleDistribuir} disabled={saving || !distribuicao.dono_usuario_id}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Salvar Distribuição
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Existing dialogs */}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o precatório "{selectedPrecatorio?.titulo}"? Esta ação não pode ser
                desfeita e todos os dados relacionados serão marcados como excluídos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePrecatorio}
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
