"use client"
/* eslint-disable */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Users,
  Mail,
  Phone,
  Search,
  Shield,
  Loader2,
  CheckCircle2,
  UserPlus,
  FileText,
  ArrowRight,
  MoreHorizontal,
  UserCheck,
  UserX,
  Trash2,
  Shuffle,
  AlertTriangle,
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { RoleGuard } from "@/lib/auth/role-guard"
import { useAuth } from "@/lib/auth/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  createNewUser,
  deleteUser,
  getUserCreditAssignments,
  setUserActiveStatus,
  type CreditRedistributionAssignment,
} from "./actions"
import { useState, useEffect, useMemo } from "react"
import { Usuario } from "@/lib/types/database"
import { useRouter } from "next/navigation"

const AVAILABLE_ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "operador_comercial", label: "Operador Comercial" },
  { value: "operador_calculo", label: "Operador de Cálculo" },
  { value: "operador", label: "Operador" },
  { value: "analista", label: "Analista" },
  { value: "gestor", label: "Gestor" },
  { value: "gestor_certidoes", label: "Gestor de Certidões" },
  { value: "gestor_oficio", label: "Gestor de Ofícios" },
  { value: "juridico", label: "Jurídico" },
]

type ActionType = "toggle-status" | "delete"

type AffectedCredit = {
  id: string
  titulo?: string | null
  numero_precatorio?: string | null
  credor_nome?: string | null
  valor_principal?: number | null
  valor_atualizado?: number | null
}

type RecipientOption = {
  id: string
  nome: string
  email?: string
  role: string[]
}

type DistributionPreview = {
  assignments: Record<string, string[]>
  sums: Record<string, number>
  outliers: AffectedCredit[]
  eligible: AffectedCredit[]
  total: number
  target: number
}

function getCreditValue(credit: AffectedCredit) {
  const valorAtualizado = Number(credit.valor_atualizado ?? 0)
  if (valorAtualizado > 0) return valorAtualizado
  return Number(credit.valor_principal ?? 0) || 0
}

function getCreditLabel(credit: AffectedCredit) {
  return credit.titulo || credit.numero_precatorio || credit.credor_nome || credit.id
}

function buildValueDistribution(
  credits: AffectedCredit[],
  recipientIds: string[],
  outlierMultiplier: number,
): DistributionPreview | null {
  if (recipientIds.length === 0) return null

  if (credits.length === 0) {
    return {
      assignments: Object.fromEntries(recipientIds.map((id) => [id, []])),
      sums: Object.fromEntries(recipientIds.map((id) => [id, 0])),
      outliers: [],
      eligible: [],
      total: 0,
      target: 0,
    }
  }

  const total = credits.reduce((acc, credit) => acc + getCreditValue(credit), 0)
  const target = total / recipientIds.length
  const multiplier = Number.isFinite(outlierMultiplier) && outlierMultiplier > 0 ? outlierMultiplier : 1
  const limit = target > 0 ? target * multiplier : Number.POSITIVE_INFINITY

  const sorted = [...credits].sort((a, b) => getCreditValue(b) - getCreditValue(a))
  const outliers = sorted.filter((credit) => getCreditValue(credit) > limit)
  const outlierIds = new Set(outliers.map((credit) => credit.id))
  const eligible = sorted.filter((credit) => !outlierIds.has(credit.id))

  const assignments: Record<string, string[]> = {}
  const sums: Record<string, number> = {}
  recipientIds.forEach((id) => {
    assignments[id] = []
    sums[id] = 0
  })

  eligible.forEach((credit) => {
    const minValue = Math.min(...recipientIds.map((id) => sums[id]))
    const candidates = recipientIds.filter((id) => Math.abs(sums[id] - minValue) < 0.0001).sort()
    const selectedRecipient = candidates[0]
    assignments[selectedRecipient].push(credit.id)
    sums[selectedRecipient] += getCreditValue(credit)
  })

  return {
    assignments,
    sums,
    outliers,
    eligible,
    total,
    target,
  }
}

export default function UsuariosPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { toast } = useToast()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [creatingUser, setCreatingUser] = useState(false)
  const [lastCreateAttempt, setLastCreateAttempt] = useState<number>(0)
  const [createUserOpen, setCreateUserOpen] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)

  const [redistributionDialogOpen, setRedistributionDialogOpen] = useState(false)
  const [redistributionLoading, setRedistributionLoading] = useState(false)
  const [redistributionSaving, setRedistributionSaving] = useState(false)
  const [creditsToRedistribute, setCreditsToRedistribute] = useState<AffectedCredit[]>([])
  const [recipientOptions, setRecipientOptions] = useState<RecipientOption[]>([])
  const [recommendedRecipientIds, setRecommendedRecipientIds] = useState<string[]>([])
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([])
  const [outlierMultiplier, setOutlierMultiplier] = useState<number>(2)
  const [outlierAssignments, setOutlierAssignments] = useState<Record<string, string>>({})

  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    nome: "",
    role: ["operador_comercial"],
    autoConfirm: true,
  })

  const redistributionPreview = useMemo(
    () => buildValueDistribution(creditsToRedistribute, selectedRecipientIds, outlierMultiplier),
    [creditsToRedistribute, selectedRecipientIds, outlierMultiplier],
  )

  const hasUnassignedOutliers = useMemo(() => {
    if (!redistributionPreview) return false
    return redistributionPreview.outliers.some((credit) => !outlierAssignments[credit.id])
  }, [redistributionPreview, outlierAssignments])

  useEffect(() => {
    loadUsuarios()
  }, [])

  async function loadUsuarios() {
    try {
      const supabase = createBrowserClient()

      if (supabase) {
        const { data, error } = await supabase.from("usuarios").select("*").order("created_at", { ascending: false })

        if (!error && data) {
          setUsuarios(data as unknown as Usuario[])
        }
      }
    } catch (error) {
      console.error("[v0] HR: Erro ao carregar usuários:", error)
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(value: number | null | undefined) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0))
  }

  function resetRedistributionState() {
    setRedistributionDialogOpen(false)
    setCreditsToRedistribute([])
    setRecipientOptions([])
    setRecommendedRecipientIds([])
    setSelectedRecipientIds([])
    setOutlierAssignments({})
    setOutlierMultiplier(2)
  }

  function closeActionDialog(open: boolean, force = false) {
    if ((actionLoading || redistributionSaving) && !force) return

    setActionDialogOpen(open)
    if (!open) {
      setSelectedUser(null)
      setSelectedAction(null)
    }
  }

  function closeRedistributionDialog(open: boolean, force = false) {
    if ((redistributionLoading || redistributionSaving || actionLoading) && !force) return

    setRedistributionDialogOpen(open)
    if (!open) {
      resetRedistributionState()
      setSelectedUser(null)
      setSelectedAction(null)
    }
  }

  function setRecipients(nextRecipientIds: string[]) {
    setSelectedRecipientIds(nextRecipientIds)
    setOutlierAssignments((prev) => {
      const cleaned: Record<string, string> = {}
      Object.entries(prev).forEach(([creditId, userId]) => {
        if (nextRecipientIds.includes(userId)) {
          cleaned[creditId] = userId
        }
      })
      return cleaned
    })
  }

  async function prepareUserAction(user: Usuario, action: ActionType) {
    if (actionLoading || redistributionLoading || redistributionSaving) return

    setSelectedUser(user)
    setSelectedAction(action)

    const requiresRedistribution = action === "delete" || (action === "toggle-status" && user.ativo)
    if (!requiresRedistribution) {
      resetRedistributionState()
      setActionDialogOpen(true)
      return
    }

    setRedistributionLoading(true)
    try {
      const result = await getUserCreditAssignments(user.id)
      if (!result?.success) {
        throw new Error(result?.error || "Falha ao carregar creditos para redistribuicao")
      }

      const affectedCredits = Array.isArray(result.affectedCredits)
        ? (result.affectedCredits as AffectedCredit[])
        : []

      if (affectedCredits.length === 0) {
        resetRedistributionState()
        setActionDialogOpen(true)
        return
      }

      const recipientsRaw = Array.isArray(result.eligibleRecipients)
        ? (result.eligibleRecipients as Array<{ id: string; nome?: string; email?: string; role?: unknown }>)
        : []

      const recipients: RecipientOption[] = recipientsRaw.map((recipient) => ({
        id: recipient.id,
        nome: recipient.nome || recipient.email || recipient.id,
        email: recipient.email || "",
        role: Array.isArray(recipient.role) ? recipient.role.filter((r): r is string => typeof r === "string") : [],
      }))

      if (recipients.length === 0) {
        throw new Error("Nao ha usuarios ativos para receber os creditos deste colaborador.")
      }

      const recommendedFromResponse = Array.isArray(result.recommendedRecipientIds)
        ? result.recommendedRecipientIds
            .filter((id: unknown): id is string => typeof id === "string")
            .filter((id: string) => recipients.some((recipient) => recipient.id === id))
        : []

      const initialRecipients = recommendedFromResponse.length > 0
        ? recommendedFromResponse
        : recipients.map((recipient) => recipient.id)

      setCreditsToRedistribute(affectedCredits)
      setRecipientOptions(recipients)
      setRecommendedRecipientIds(recommendedFromResponse)
      setRecipients(initialRecipients)
      setOutlierMultiplier(2)
      setRedistributionDialogOpen(true)
    } catch (error: any) {
      toast({
        title: "Falha ao preparar redistribuicao",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      })
      setSelectedUser(null)
      setSelectedAction(null)
      resetRedistributionState()
    } finally {
      setRedistributionLoading(false)
    }
  }

  function buildRedistributionAssignments() {
    if (!redistributionPreview) {
      throw new Error("Selecione ao menos um destinatario para distribuir os creditos.")
    }

    const assignments: CreditRedistributionAssignment[] = []

    Object.entries(redistributionPreview.assignments).forEach(([userId, creditIds]) => {
      creditIds.forEach((creditId) => {
        assignments.push({
          precatorioId: creditId,
          newUserId: userId,
        })
      })
    })

    redistributionPreview.outliers.forEach((credit) => {
      const chosenRecipient = outlierAssignments[credit.id]
      if (!chosenRecipient) {
        throw new Error(`Selecione o destinatario para o credito "${getCreditLabel(credit)}".`)
      }
      assignments.push({
        precatorioId: credit.id,
        newUserId: chosenRecipient,
      })
    })

    const uniqueCreditIds = new Set(assignments.map((item) => item.precatorioId))
    if (uniqueCreditIds.size !== creditsToRedistribute.length) {
      throw new Error("A redistribuicao precisa definir um destinatario para todos os creditos.")
    }

    return assignments
  }

  async function handleConfirmUserAction(redistributionAssignments?: CreditRedistributionAssignment[]) {
    if (!selectedUser || !selectedAction) return

    setActionLoading(true)
    try {
      if (selectedAction === "toggle-status") {
        const nextStatus = !selectedUser.ativo
        const result = await setUserActiveStatus(selectedUser.id, nextStatus, redistributionAssignments)
        if (!result?.success) throw new Error(result?.error || "Falha ao atualizar status do usuario")

        toast({
          title: nextStatus ? "Usuario reativado" : "Usuario desativado",
          description: result.message || "Status atualizado com sucesso.",
        })
      }

      if (selectedAction === "delete") {
        const result = await deleteUser(selectedUser.id, redistributionAssignments)
        if (!result?.success) throw new Error(result?.error || "Falha ao excluir usuario")

        toast({
          title: "Usuario excluido",
          description: result.message || "Conta removida com sucesso.",
        })
      }

      await loadUsuarios()
      closeActionDialog(false, true)
      closeRedistributionDialog(false, true)
    } catch (error: any) {
      toast({
        title: "Falha ao executar acao",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleConfirmRedistributionAndAction() {
    if (!selectedUser || !selectedAction) return

    setRedistributionSaving(true)
    try {
      const assignments = buildRedistributionAssignments()
      await handleConfirmUserAction(assignments)
    } catch (error: any) {
      toast({
        title: "Falha na redistribuicao",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setRedistributionSaving(false)
    }
  }

  function toggleRole(roleValue: string) {
    setNewUserData(prev => {
      const currentRoles = prev.role
      if (currentRoles.includes(roleValue)) {
        if (currentRoles.length === 1) return prev
        return { ...prev, role: currentRoles.filter(r => r !== roleValue) }
      } else {
        return { ...prev, role: [...currentRoles, roleValue] }
      }
    })
  }

  async function handleCreateUser() {
    const now = Date.now()
    const timeSinceLastAttempt = now - lastCreateAttempt
    const minWaitTime = 3000 // 3 seconds

    if (timeSinceLastAttempt < minWaitTime) {
      toast({
        title: "Aguarde um momento",
        description: `Por segurança, aguarde alguns segundos antes de criar outro usuário.`,
        variant: "destructive",
      })
      return
    }

    setCreatingUser(true)
    setLastCreateAttempt(now)

    try {
      if (!newUserData.email || !newUserData.password || !newUserData.nome) {
        throw new Error("Preencha todos os campos obrigatórios")
      }

      if (newUserData.password.length < 6) {
        throw new Error("A senha deve ter no mínimo 6 caracteres")
      }

      const result = await createNewUser({
        email: newUserData.email,
        password: newUserData.password,
        nome: newUserData.nome,
        role: newUserData.role,
        autoConfirm: newUserData.autoConfirm,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      toast({
        title: "Colaborador adicionado!",
        description: result.message,
      })

      await loadUsuarios()

      setNewUserData({
        email: "",
        password: "",
        nome: "",
        role: ["operador_comercial"],
        autoConfirm: true,
      })
      setCreateUserOpen(false)
    } catch (err: any) {
      toast({
        title: "Falha ao criar usuário",
        description: err.message || "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setCreatingUser(false)
    }
  }

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default"
      case "operador_comercial":
        return "secondary"
      case "gestor":
        return "destructive" // Highlight Manager
      default:
        return "outline"
    }
  }

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["admin", "gestor"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Recursos Humanos</h1>
            <p className="text-muted-foreground">Gestão completa de colaboradores, documentos e pagamentos.</p>
          </div>
          <Button onClick={() => setCreateUserOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Colaborador
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Colaboradores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gestores</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.filter((u) => u.role.includes("gestor") || u.role.includes("admin")).length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos este Mês</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usuarios.filter(u => {
                  const date = new Date(u.created_at)
                  const now = new Date()
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
                }).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documentos Pendentes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">-</div>
              <p className="text-xs text-muted-foreground">Implementar checklist</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Quadro de Funcionários</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo / Funções</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        Nenhum colaborador encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsuarios.map((usuario) => {
                      const isSelf = usuario.id === profile?.id

                      return (
                        <TableRow key={usuario.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/admin/usuarios/detalhes?id=${usuario.id}`)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={"/placeholder.svg"} />
                                <AvatarFallback>{getInitials(usuario.nome)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-base">{usuario.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {usuario.ativo ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ativo</span> : "Inativo"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {usuario.position && <span className="font-medium text-sm">{usuario.position}</span>}
                              <div className="flex flex-wrap gap-1">
                                {usuario.role.slice(0, 3).map(r => (
                                  <Badge key={r} variant={getRoleBadgeVariant(r)} className="text-[10px] px-1 py-0 h-5">
                                    {r.replace(/_/g, " ").toUpperCase()}
                                  </Badge>
                                ))}
                                {usuario.role.length > 3 && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">+{usuario.role.length - 3}</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span>{usuario.email}</span>
                              </div>
                              {usuario.telefone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span>{usuario.telefone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {usuario.admission_date
                                ? new Date(usuario.admission_date).toLocaleDateString("pt-BR")
                                : new Date(usuario.created_at).toLocaleDateString("pt-BR")
                              }
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/usuarios/detalhes?id=${usuario.id}`)}>
                                Gerenciar
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações para ${usuario.nome}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/admin/usuarios/detalhes?id=${usuario.id}`)}>
                                    Gerenciar usuário
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    disabled={isSelf || actionLoading || redistributionLoading || redistributionSaving}
                                    onClick={() => prepareUserAction(usuario, "toggle-status")}
                                  >
                                    {usuario.ativo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                    {usuario.ativo ? "Desativar usuário" : "Reativar usuário"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={isSelf || actionLoading || redistributionLoading || redistributionSaving}
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => prepareUserAction(usuario, "delete")}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Excluir usuário
                                  </DropdownMenuItem>
                                  {isSelf && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem disabled>Você não pode se alterar aqui</DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal Create User */}
        <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Novo Colaborador</DialogTitle>
              <DialogDescription>
                Cadastre um novo funcionário. Você poderá adicionar documentos e dados financeiros após a criação.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-nome">Nome Completo</Label>
                  <Input
                    id="new-nome"
                    placeholder="Ex: Ana Souza"
                    value={newUserData.nome}
                    onChange={(e) => setNewUserData((prev) => ({ ...prev, nome: e.target.value }))}
                    disabled={creatingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">E-mail Corporativo</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="ana.souza@empresa.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={creatingUser}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Senha Inicial</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={creatingUser}
                />
              </div>

              <div className="space-y-2">
                <Label>Permissões e Funções</Label>
                <div className="grid grid-cols-2 gap-2 border p-4 rounded-md h-40 overflow-y-auto">
                  {AVAILABLE_ROLES.map((role) => (
                    <div key={role.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`create-role-${role.value}`}
                        checked={newUserData.role.includes(role.value)}
                        onCheckedChange={() => toggleRole(role.value)}
                        disabled={creatingUser}
                      />
                      <Label htmlFor={`create-role-${role.value}`} className="cursor-pointer">{role.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-confirm"
                  checked={newUserData.autoConfirm}
                  onCheckedChange={(checked) =>
                    setNewUserData((prev) => ({ ...prev, autoConfirm: checked as boolean }))
                  }
                  disabled={creatingUser}
                />
                <Label htmlFor="auto-confirm" className="text-sm font-normal cursor-pointer">
                  Auto Confirmar Usuário? (não exige confirmação de email)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateUserOpen(false)} disabled={creatingUser}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={
                  creatingUser ||
                  !newUserData.email ||
                  !newUserData.password ||
                  !newUserData.nome ||
                  newUserData.password.length < 6
                }
              >
                {creatingUser ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Cadastrar Colaborador
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={redistributionDialogOpen} onOpenChange={closeRedistributionDialog}>
          <DialogContent className="!w-[96vw] !max-w-[1200px] max-h-[92vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Redistribuição manual de créditos
              </DialogTitle>
              <DialogDescription>
                Antes de {selectedAction === "delete" ? "excluir" : "desativar"} {selectedUser?.nome || "este usuário"},
                selecione para quem os créditos serão redistribuídos por valor.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {redistributionLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Créditos atribuídos</p>
                      <p className="font-semibold">{creditsToRedistribute.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor total</p>
                      <p className="font-semibold">
                        {formatCurrency(creditsToRedistribute.reduce((acc, credit) => acc + getCreditValue(credit), 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Alvo por destinatário</p>
                      <p className="font-semibold">
                        {redistributionPreview ? formatCurrency(redistributionPreview.target) : formatCurrency(0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Destinatários ativos</Label>
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60 p-3 space-y-2">
                      {recipientOptions.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhum usuário disponível para redistribuição.</p>
                      )}
                      {recipientOptions.map((recipient) => (
                        <label key={recipient.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedRecipientIds.includes(recipient.id)}
                            onCheckedChange={(checked) => {
                              const isChecked = Boolean(checked)
                              const next = isChecked
                                ? Array.from(new Set([...selectedRecipientIds, recipient.id]))
                                : selectedRecipientIds.filter((id) => id !== recipient.id)
                              setRecipients(next)
                            }}
                          />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{recipient.nome}</span>
                            <span className="text-xs text-muted-foreground truncate">{recipient.email}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    {recommendedRecipientIds.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Recomendados: {recommendedRecipientIds.length} destinatário(s) com perfil comercial.
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Limite de disparidade (x do alvo)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.1"
                        value={outlierMultiplier}
                        onChange={(e) => setOutlierMultiplier(Number(e.target.value) || 1)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Créditos acima de {outlierMultiplier}x do alvo ficam para atribuição manual.
                      </p>
                    </div>

                    {redistributionPreview && (
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Prévia da distribuição</p>
                          <p className="text-xs text-muted-foreground">
                            Elegíveis: {redistributionPreview.eligible.length} | Destoantes: {redistributionPreview.outliers.length}
                          </p>
                        </div>
                        <div className="grid gap-2">
                          {selectedRecipientIds.map((recipientId) => {
                            const recipient = recipientOptions.find((item) => item.id === recipientId)
                            const count = redistributionPreview.assignments[recipientId]?.length || 0
                            const sum = redistributionPreview.sums[recipientId] || 0
                            return (
                              <div
                                key={recipientId}
                                className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2"
                              >
                                <div>
                                  <p className="text-xs text-muted-foreground">{recipient?.nome || "Usuário"}</p>
                                  <p className="text-sm font-medium">{count} crédito(s)</p>
                                </div>
                                <p className="text-sm font-semibold">{formatCurrency(sum)}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {redistributionPreview && redistributionPreview.outliers.length > 0 && (
                  <div className="rounded-lg border border-amber-300/40 bg-amber-50/40 p-3 text-sm text-amber-800">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Créditos destoantes exigem atribuição manual.
                    </div>
                    <div className="mt-3 space-y-2">
                      {redistributionPreview.outliers.map((credit) => (
                        <div key={credit.id} className="rounded-md border border-amber-400/30 bg-background/70 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{getCreditLabel(credit)}</span>
                            <span>{formatCurrency(getCreditValue(credit))}</span>
                          </div>
                          <div className="mt-2">
                            <select
                              value={outlierAssignments[credit.id] || ""}
                              onChange={(e) =>
                                setOutlierAssignments((prev) => ({
                                  ...prev,
                                  [credit.id]: e.target.value,
                                }))
                              }
                              className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
                            >
                              <option value="">Selecionar destinatário</option>
                              {selectedRecipientIds.map((recipientId) => {
                                const recipient = recipientOptions.find((item) => item.id === recipientId)
                                return (
                                  <option key={recipientId} value={recipientId}>
                                    {recipient?.nome || recipientId}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => closeRedistributionDialog(false)}
                disabled={redistributionSaving || actionLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmRedistributionAndAction}
                disabled={
                  redistributionSaving ||
                  actionLoading ||
                  !redistributionPreview ||
                  selectedRecipientIds.length === 0 ||
                  hasUnassignedOutliers
                }
              >
                {redistributionSaving || actionLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4 mr-2" />
                )}
                Redistribuir e {selectedAction === "delete" ? "excluir usuário" : "desativar usuário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={actionDialogOpen} onOpenChange={closeActionDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedAction === "delete"
                  ? "Confirmar exclusão de usuário"
                  : selectedUser?.ativo
                    ? "Confirmar desativação de usuário"
                    : "Confirmar reativação de usuário"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedAction === "delete"
                  ? `Essa ação removerá o usuário ${selectedUser?.nome || ""} e não poderá ser desfeita.`
                  : selectedUser?.ativo
                    ? `O usuário ${selectedUser?.nome || ""} ficará sem acesso ao sistema até ser reativado.`
                    : `O usuário ${selectedUser?.nome || ""} voltará a ter acesso ao sistema.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleConfirmUserAction()
                }}
                disabled={actionLoading}
                className={selectedAction === "delete" ? "bg-red-600 hover:bg-red-700" : undefined}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : selectedAction === "delete" ? (
                  "Excluir usuário"
                ) : selectedUser?.ativo ? (
                  "Desativar usuário"
                ) : (
                  "Reativar usuário"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  )
}
