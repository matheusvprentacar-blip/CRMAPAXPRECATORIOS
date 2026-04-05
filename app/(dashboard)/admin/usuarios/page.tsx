"use client"
/* eslint-disable */

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Users, Mail, Search, Shield, Loader2, CheckCircle2,
  UserPlus, ArrowRight, MoreHorizontal, UserCheck, UserX,
  Trash2, Shuffle, AlertTriangle,
} from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { RoleGuard } from "@/lib/auth/role-guard"
import { useAuth } from "@/lib/auth/auth-context"
import { useToast } from "@/hooks/use-toast"
import {
  createNewUser, deleteUser, getUserCreditAssignments, setUserActiveStatus,
  type CreditRedistributionAssignment,
} from "./actions"
import { useState, useEffect, useMemo } from "react"
import { Usuario } from "@/lib/types/database"
import { useRouter } from "next/navigation"

// ─── constants ────────────────────────────────────────────────────────────────

const AVAILABLE_ROLES = [
  { value: "admin",              label: "Administrador" },
  { value: "tecnico_ti",         label: "Técnico de T.I" },
  { value: "operador_comercial", label: "Operador Comercial" },
  { value: "operador_calculo",   label: "Operador de Cálculo" },
  { value: "operador",           label: "Operador" },
  { value: "analista",           label: "Analista" },
  { value: "gestor",             label: "Gestor" },
  { value: "gestor_certidoes",   label: "Gestor de Certidões" },
  { value: "gestor_oficio",      label: "Gestor de Ofícios" },
  { value: "gestor_escrituras",    label: "Gestor de Escrituras" },
  { value: "juridico",             label: "Jurídico" },
  { value: "agente_atendimento",   label: "Agente de Atendimento" },
]

const ROLE_COLORS: Record<string, string> = {
  admin:               "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25",
  gestor:              "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  gestor_certidoes:    "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  gestor_oficio:       "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  gestor_escrituras:   "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  juridico:            "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/25",
  analista:            "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25",
  operador_comercial:  "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  operador_calculo:    "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
  tecnico_ti:          "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
  operador:            "bg-foreground/8 text-foreground/55 border-border/40",
  agente_atendimento:  "bg-orange-500/12 text-orange-700 dark:text-orange-300 border-orange-500/25",
}

const ROLE_LABELS: Record<string, string> = {
  admin:              "Admin",
  tecnico_ti:         "T.I",
  operador_comercial: "Comercial",
  operador_calculo:   "Cálculo",
  operador:           "Operador",
  analista:           "Analista",
  gestor:             "Gestor",
  gestor_certidoes:   "Certidões",
  gestor_oficio:      "Ofícios",
  gestor_escrituras:  "Escrituras",
  juridico:           "Jurídico",
  agente_atendimento: "Atendimento",
}

const AVATAR_PALETTE: [string, string][] = [
  ["#8b5cf6", "#6d28d9"],
  ["#3b82f6", "#1d4ed8"],
  ["#10b981", "#059669"],
  ["#f43f5e", "#be123c"],
  ["#f59e0b", "#b45309"],
  ["#6366f1", "#4338ca"],
  ["#ec4899", "#be185d"],
  ["#06b6d4", "#0e7490"],
  ["#84cc16", "#4d7c0f"],
  ["#fb923c", "#c2410c"],
]

function getAvatarColors(name: string): [string, string] {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

// ─── types ────────────────────────────────────────────────────────────────────

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

// ─── helpers ──────────────────────────────────────────────────────────────────

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
      outliers: [], eligible: [], total: 0, target: 0,
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
  recipientIds.forEach((id) => { assignments[id] = []; sums[id] = 0 })
  eligible.forEach((credit) => {
    const minValue = Math.min(...recipientIds.map((id) => sums[id]))
    const candidates = recipientIds.filter((id) => Math.abs(sums[id] - minValue) < 0.0001).sort()
    const selectedRecipient = candidates[0]
    assignments[selectedRecipient].push(credit.id)
    sums[selectedRecipient] += getCreditValue(credit)
  })
  return { assignments, sums, outliers, eligible, total, target }
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { toast } = useToast()

  const [usuarios, setUsuarios]             = useState<Usuario[]>([])
  const [loading, setLoading]               = useState(true)
  const [searchTerm, setSearchTerm]         = useState("")
  const [creatingUser, setCreatingUser]     = useState(false)
  const [lastCreateAttempt, setLastCreateAttempt] = useState<number>(0)
  const [createUserOpen, setCreateUserOpen] = useState(false)

  const [actionLoading, setActionLoading]       = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser]         = useState<Usuario | null>(null)
  const [selectedAction, setSelectedAction]     = useState<ActionType | null>(null)

  const [redistributionDialogOpen, setRedistributionDialogOpen] = useState(false)
  const [redistributionLoading, setRedistributionLoading]       = useState(false)
  const [redistributionSaving, setRedistributionSaving]         = useState(false)
  const [creditsToRedistribute, setCreditsToRedistribute]       = useState<AffectedCredit[]>([])
  const [recipientOptions, setRecipientOptions]                 = useState<RecipientOption[]>([])
  const [recommendedRecipientIds, setRecommendedRecipientIds]   = useState<string[]>([])
  const [selectedRecipientIds, setSelectedRecipientIds]         = useState<string[]>([])
  const [outlierMultiplier, setOutlierMultiplier]               = useState<number>(2)
  const [outlierAssignments, setOutlierAssignments]             = useState<Record<string, string>>({})

  const [newUserData, setNewUserData] = useState({
    email: "", password: "", nome: "",
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

  useEffect(() => { loadUsuarios() }, [])

  async function loadUsuarios() {
    try {
      const supabase = createBrowserClient()
      if (supabase) {
        const { data, error } = await supabase.from("usuarios").select("*").order("created_at", { ascending: false })
        if (!error && data) setUsuarios(data as unknown as Usuario[])
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
    if (!open) { setSelectedUser(null); setSelectedAction(null) }
  }

  function closeRedistributionDialog(open: boolean, force = false) {
    if ((redistributionLoading || redistributionSaving || actionLoading) && !force) return
    setRedistributionDialogOpen(open)
    if (!open) { resetRedistributionState(); setSelectedUser(null); setSelectedAction(null) }
  }

  function setRecipients(nextRecipientIds: string[]) {
    setSelectedRecipientIds(nextRecipientIds)
    setOutlierAssignments((prev) => {
      const cleaned: Record<string, string> = {}
      Object.entries(prev).forEach(([creditId, userId]) => {
        if (nextRecipientIds.includes(userId)) cleaned[creditId] = userId
      })
      return cleaned
    })
  }

  async function prepareUserAction(user: Usuario, action: ActionType) {
    if (actionLoading || redistributionLoading || redistributionSaving) return
    setSelectedUser(user)
    setSelectedAction(action)
    const requiresRedistribution = action === "delete" || (action === "toggle-status" && user.ativo)
    if (!requiresRedistribution) { resetRedistributionState(); setActionDialogOpen(true); return }
    setRedistributionLoading(true)
    try {
      const result = await getUserCreditAssignments(user.id)
      if (!result?.success) throw new Error(result?.error || "Falha ao carregar creditos para redistribuicao")
      const affectedCredits = Array.isArray(result.affectedCredits) ? (result.affectedCredits as AffectedCredit[]) : []
      if (affectedCredits.length === 0) { resetRedistributionState(); setActionDialogOpen(true); return }
      const recipientsRaw = Array.isArray(result.eligibleRecipients)
        ? (result.eligibleRecipients as Array<{ id: string; nome?: string; email?: string; role?: unknown }>)
        : []
      const recipients: RecipientOption[] = recipientsRaw.map((r) => ({
        id: r.id,
        nome: r.nome || r.email || r.id,
        email: r.email || "",
        role: Array.isArray(r.role) ? r.role.filter((x): x is string => typeof x === "string") : [],
      }))
      if (recipients.length === 0) throw new Error("Nao ha usuarios ativos para receber os creditos deste colaborador.")
      const recommendedFromResponse = Array.isArray(result.recommendedRecipientIds)
        ? result.recommendedRecipientIds
            .filter((id: unknown): id is string => typeof id === "string")
            .filter((id: string) => recipients.some((r) => r.id === id))
        : []
      const initialRecipients = recommendedFromResponse.length > 0 ? recommendedFromResponse : recipients.map((r) => r.id)
      setCreditsToRedistribute(affectedCredits)
      setRecipientOptions(recipients)
      setRecommendedRecipientIds(recommendedFromResponse)
      setRecipients(initialRecipients)
      setOutlierMultiplier(2)
      setRedistributionDialogOpen(true)
    } catch (error: any) {
      toast({ title: "Falha ao preparar redistribuicao", description: error.message || "Erro desconhecido", variant: "destructive" })
      setSelectedUser(null); setSelectedAction(null); resetRedistributionState()
    } finally {
      setRedistributionLoading(false)
    }
  }

  function buildRedistributionAssignments() {
    if (!redistributionPreview) throw new Error("Selecione ao menos um destinatario para distribuir os creditos.")
    const assignments: CreditRedistributionAssignment[] = []
    Object.entries(redistributionPreview.assignments).forEach(([userId, creditIds]) => {
      creditIds.forEach((creditId) => assignments.push({ precatorioId: creditId, newUserId: userId }))
    })
    redistributionPreview.outliers.forEach((credit) => {
      const chosenRecipient = outlierAssignments[credit.id]
      if (!chosenRecipient) throw new Error(`Selecione o destinatario para o credito "${getCreditLabel(credit)}".`)
      assignments.push({ precatorioId: credit.id, newUserId: chosenRecipient })
    })
    const uniqueCreditIds = new Set(assignments.map((item) => item.precatorioId))
    if (uniqueCreditIds.size !== creditsToRedistribute.length)
      throw new Error("A redistribuicao precisa definir um destinatario para todos os creditos.")
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
        toast({ title: nextStatus ? "Usuario reativado" : "Usuario desativado", description: result.message || "Status atualizado com sucesso." })
      }
      if (selectedAction === "delete") {
        const result = await deleteUser(selectedUser.id, redistributionAssignments)
        if (!result?.success) throw new Error(result?.error || "Falha ao excluir usuario")
        toast({ title: "Usuario excluido", description: result.message || "Conta removida com sucesso." })
      }
      await loadUsuarios()
      closeActionDialog(false, true)
      closeRedistributionDialog(false, true)
    } catch (error: any) {
      toast({ title: "Falha ao executar acao", description: error.message || "Erro desconhecido", variant: "destructive" })
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
      toast({ title: "Falha na redistribuicao", description: error.message || "Erro desconhecido", variant: "destructive" })
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
    if (now - lastCreateAttempt < 3000) {
      toast({ title: "Aguarde um momento", description: "Por segurança, aguarde alguns segundos antes de criar outro usuário.", variant: "destructive" })
      return
    }
    setCreatingUser(true)
    setLastCreateAttempt(now)
    try {
      if (!newUserData.email || !newUserData.password || !newUserData.nome) throw new Error("Preencha todos os campos obrigatórios")
      if (newUserData.password.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres")
      const result = await createNewUser({
        email: newUserData.email, password: newUserData.password,
        nome: newUserData.nome, role: newUserData.role, autoConfirm: newUserData.autoConfirm,
      })
      if (!result.success) throw new Error(result.error)
      toast({ title: "Colaborador adicionado!", description: result.message })
      await loadUsuarios()
      setNewUserData({ email: "", password: "", nome: "", role: ["operador_comercial"], autoConfirm: true })
      setCreateUserOpen(false)
    } catch (err: any) {
      toast({ title: "Falha ao criar usuário", description: err.message || "Erro desconhecido", variant: "destructive" })
    } finally {
      setCreatingUser(false)
    }
  }

  function getInitials(nome: string) {
    return nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const filteredUsuarios = usuarios.filter(
    (u) => u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const ativos   = usuarios.filter(u => u.ativo).length
  const gestores = usuarios.filter(u => u.role.includes("gestor") || u.role.includes("admin")).length
  const novos    = usuarios.filter(u => {
    const d = new Date(u.created_at), n = new Date()
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
  }).length

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

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 mb-1">Administração</p>
            <h1 className="text-2xl font-bold tracking-tight">Recursos Humanos</h1>
            <p className="text-sm text-foreground/50 mt-0.5">Gestão de colaboradores, permissões e acessos.</p>
          </div>
          <button
            onClick={() => setCreateUserOpen(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 text-sm font-semibold text-white shadow-[0_6px_20px_-8px_rgba(249,115,22,0.70)] transition hover:from-orange-400 hover:to-amber-500"
          >
            <UserPlus className="h-4 w-4" />
            Novo Colaborador
          </button>
        </div>

        {/* ── STATS STRIP ────────────────────────────────────────────────────── */}
        <div className="flex items-stretch divide-x divide-border/50 rounded-2xl border border-border/55 bg-card overflow-hidden">
          {([
            { label: "Total",    value: usuarios.length, sub: "colaboradores",    icon: Users,        color: "text-foreground" },
            { label: "Ativos",   value: ativos,          sub: "em atividade",     icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Gestores", value: gestores,        sub: "e administradores",icon: Shield,       color: "text-amber-600 dark:text-amber-400" },
            { label: "Novos",    value: novos,           sub: "este mês",         icon: UserPlus,     color: "text-blue-600 dark:text-blue-400" },
          ] as const).map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="flex-1 px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/35">{label}</p>
                  <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                  <p className="text-xs text-foreground/40 mt-0.5">{sub}</p>
                </div>
                <Icon className="h-4 w-4 text-foreground/20 mt-1 shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* ── USER LIST ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/55 bg-card overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                className="pl-9 h-9 bg-content2/30 border-border/50 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="text-xs tabular-nums text-foreground/35 ml-auto shrink-0">
              {filteredUsuarios.length}/{usuarios.length} registros
            </span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2.5rem_1fr_auto_auto_auto] items-center gap-4 px-4 py-2.5 border-b border-border/40">
            <div />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Colaborador</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 w-52">Funções</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 w-24 text-center">Admissão</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30 w-36 text-right">Ações</span>
          </div>

          {/* Rows */}
          {filteredUsuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="rounded-2xl border border-border/50 bg-content2/30 p-4">
                <Search className="h-8 w-8 text-foreground/25" />
              </div>
              <p className="text-sm font-medium text-foreground/50">Nenhum colaborador encontrado</p>
              <p className="text-xs text-foreground/35">Ajuste o termo de busca</p>
            </div>
          ) : (
            <div className="divide-y divide-border/35">
              {filteredUsuarios.map((usuario) => {
                const isSelf    = usuario.id === profile?.id
                const [c1, c2]  = getAvatarColors(usuario.nome)
                const dateStr   = usuario.admission_date
                  ? new Date(usuario.admission_date).toLocaleDateString("pt-BR")
                  : new Date(usuario.created_at).toLocaleDateString("pt-BR")

                return (
                  <div
                    key={usuario.id}
                    className="group grid grid-cols-[2.5rem_1fr_auto_auto_auto] items-center gap-4 px-4 py-3.5 hover:bg-content2/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/usuarios/detalhes?id=${usuario.id}`)}
                  >
                    {/* Avatar */}
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                    >
                      {getInitials(usuario.nome)}
                    </div>

                    {/* Name + email */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{usuario.nome}</p>
                        <span
                          className={[
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            usuario.ativo ? "bg-emerald-500" : "bg-foreground/20",
                          ].join(" ")}
                        />
                      </div>
                      <p className="text-xs text-foreground/45 truncate">{usuario.email}</p>
                    </div>

                    {/* Roles */}
                    <div className="w-52 flex flex-wrap gap-1">
                      {usuario.role.slice(0, 3).map(r => (
                        <span
                          key={r}
                          className={[
                            "inline-flex items-center rounded-full border px-2 py-0 text-[10px] font-semibold",
                            ROLE_COLORS[r] ?? "bg-foreground/8 text-foreground/55 border-border/40",
                          ].join(" ")}
                        >
                          {ROLE_LABELS[r] ?? r.replace(/_/g, " ")}
                        </span>
                      ))}
                      {usuario.role.length > 3 && (
                        <span className="inline-flex items-center rounded-full border border-border/40 bg-foreground/8 px-2 py-0 text-[10px] font-semibold text-foreground/50">
                          +{usuario.role.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <span className="w-24 text-center text-xs tabular-nums text-foreground/45">{dateStr}</span>

                    {/* Actions */}
                    <div
                      className="w-36 flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => router.push(`/admin/usuarios/detalhes?id=${usuario.id}`)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-3 text-[11px] font-semibold text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:from-orange-400 hover:to-amber-500"
                      >
                        Gerenciar
                        <ArrowRight className="h-3 w-3" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/35 hover:bg-content2 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                            aria-label={`Ações para ${usuario.nome}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
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
                            className="text-destructive focus:text-destructive"
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
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer count */}
          {filteredUsuarios.length > 0 && (
            <div className="border-t border-border/40 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-foreground/35">
                {filteredUsuarios.length} {filteredUsuarios.length === 1 ? "colaborador" : "colaboradores"}
              </span>
              <span className="text-xs text-foreground/35">
                {ativos} ativos · {usuarios.length - ativos} inativos
              </span>
            </div>
          )}
        </div>

        {/* ── MODAL: CRIAR USUÁRIO ───────────────────────────────────────────── */}
        <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
          <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden gap-0">
            {/* Colored header */}
            <div className="px-6 pt-6 pb-5 border-b border-border/50 bg-blue-500/[0.04]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Recursos Humanos</p>
                  <DialogTitle className="text-base font-bold leading-tight">Novo Colaborador</DialogTitle>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Nome Completo</Label>
                  <Input
                    placeholder="Ex: Ana Souza"
                    value={newUserData.nome}
                    onChange={(e) => setNewUserData((prev) => ({ ...prev, nome: e.target.value }))}
                    disabled={creatingUser}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">E-mail Corporativo</Label>
                  <Input
                    type="email"
                    placeholder="ana@empresa.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={creatingUser}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Senha Inicial</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData((prev) => ({ ...prev, password: e.target.value }))}
                  disabled={creatingUser}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Permissões</Label>
                <div className="flex flex-wrap gap-2 rounded-xl border border-border/50 bg-content2/20 p-3">
                  {AVAILABLE_ROLES.map((role) => {
                    const isSelected = newUserData.role.includes(role.value)
                    const color = ROLE_COLORS[role.value] ?? "bg-foreground/8 text-foreground/55 border-border/40"
                    return (
                      <button
                        key={role.value}
                        type="button"
                        disabled={creatingUser}
                        onClick={() => toggleRole(role.value)}
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                          isSelected
                            ? color
                            : "border-border/50 text-foreground/40 hover:text-foreground hover:border-border",
                        ].join(" ")}
                      >
                        {role.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Auto-confirm toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={creatingUser}
                  onClick={() => setNewUserData(prev => ({ ...prev, autoConfirm: !prev.autoConfirm }))}
                  className={[
                    "relative h-5 w-9 rounded-full transition-colors shrink-0",
                    newUserData.autoConfirm ? "bg-primary" : "bg-foreground/20",
                  ].join(" ")}
                >
                  <div className={[
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    newUserData.autoConfirm ? "translate-x-4" : "translate-x-0.5",
                  ].join(" ")} />
                </button>
                <span className="text-sm text-foreground/60">Auto confirmar e-mail (não exige verificação)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 pb-5">
              <button
                type="button"
                onClick={() => setCreateUserOpen(false)}
                disabled={creatingUser}
                className="h-10 rounded-xl border border-border/70 px-4 text-sm font-medium text-foreground/60 transition-colors hover:bg-content2/60 hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={creatingUser || !newUserData.email || !newUserData.password || !newUserData.nome || newUserData.password.length < 6}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-5 text-sm font-semibold text-white shadow-[0_6px_20px_-8px_rgba(249,115,22,0.70)] transition hover:from-orange-400 hover:to-amber-500 disabled:opacity-50"
              >
                {creatingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                {creatingUser ? "Criando..." : "Cadastrar Colaborador"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── REDISTRIBUTION DIALOG ────────────────────────────────────────── */}
        <Dialog open={redistributionDialogOpen} onOpenChange={closeRedistributionDialog}>
          <DialogContent className="!w-[96vw] !max-w-[1200px] max-h-[92vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Redistribuição de créditos
              </DialogTitle>
              <DialogDescription>
                Antes de {selectedAction === "delete" ? "excluir" : "desativar"} {selectedUser?.nome || "este usuário"},
                selecione para quem os créditos serão redistribuídos por valor.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {redistributionLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {/* Summary bar */}
                  <div className="rounded-xl border border-border/60 bg-content2/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/35">Créditos</p>
                        <p className="font-bold">{creditsToRedistribute.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/35">Valor total</p>
                        <p className="font-bold">{formatCurrency(creditsToRedistribute.reduce((acc, c) => acc + getCreditValue(c), 0))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/35">Alvo por destinatário</p>
                        <p className="font-bold">{redistributionPreview ? formatCurrency(redistributionPreview.target) : formatCurrency(0)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Recipients list */}
                    <div className="space-y-2">
                      <Label>Destinatários ativos</Label>
                      {recommendedRecipientIds.length > 0 && (
                        <p className="text-xs text-foreground/45">
                          {recommendedRecipientIds.length} destinatário(s) com perfil comercial recomendado(s).
                        </p>
                      )}
                      <div className="max-h-56 overflow-y-auto rounded-xl border border-border/60 p-3 space-y-2">
                        {recipientOptions.length === 0 && (
                          <p className="text-xs text-foreground/45">Nenhum usuário disponível para redistribuição.</p>
                        )}
                        {recipientOptions.map((recipient) => (
                          <label key={recipient.id} className="flex items-center gap-2 text-sm cursor-pointer">
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
                              <span className="truncate font-medium">{recipient.nome}</span>
                              <span className="text-xs text-foreground/45 truncate">{recipient.email}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Distribution preview + outlier multiplier */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Limite de disparidade (×{outlierMultiplier})</Label>
                        <Input
                          type="number" min="1" step="0.1"
                          value={outlierMultiplier}
                          onChange={(e) => setOutlierMultiplier(Number(e.target.value) || 1)}
                          className="h-9"
                        />
                        <p className="text-xs text-foreground/45">
                          Créditos acima de {outlierMultiplier}× do alvo ficam para atribuição manual.
                        </p>
                      </div>

                      {redistributionPreview && (
                        <div className="rounded-xl border border-border/60 bg-content2/20 p-3 text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-xs uppercase tracking-wide text-foreground/45">Prévia da distribuição</p>
                            <p className="text-xs text-foreground/40">
                              {redistributionPreview.eligible.length} elegíveis · {redistributionPreview.outliers.length} destoantes
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            {selectedRecipientIds.map((recipientId) => {
                              const recipient = recipientOptions.find((item) => item.id === recipientId)
                              const count = redistributionPreview.assignments[recipientId]?.length || 0
                              const sum   = redistributionPreview.sums[recipientId] || 0
                              return (
                                <div key={recipientId} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/60 px-3 py-2">
                                  <div>
                                    <p className="text-xs text-foreground/45">{recipient?.nome || "Usuário"}</p>
                                    <p className="text-xs font-medium">{count} crédito(s)</p>
                                  </div>
                                  <p className="text-xs font-bold tabular-nums">{formatCurrency(sum)}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Outliers manual assignment */}
                  {redistributionPreview && redistributionPreview.outliers.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm space-y-3">
                      <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4" />
                        Créditos destoantes — atribuição manual necessária
                      </div>
                      <div className="space-y-2">
                        {redistributionPreview.outliers.map((credit) => (
                          <div key={credit.id} className="rounded-lg border border-amber-500/20 bg-background/70 p-2.5">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="truncate font-medium text-xs">{getCreditLabel(credit)}</span>
                              <span className="text-xs font-bold tabular-nums shrink-0">{formatCurrency(getCreditValue(credit))}</span>
                            </div>
                            <select
                              value={outlierAssignments[credit.id] || ""}
                              onChange={(e) => setOutlierAssignments((prev) => ({ ...prev, [credit.id]: e.target.value }))}
                              className="h-8 w-full rounded-lg border border-border/60 bg-background text-xs px-2"
                            >
                              <option value="">Selecionar destinatário...</option>
                              {selectedRecipientIds.map((recipientId) => {
                                const r = recipientOptions.find((item) => item.id === recipientId)
                                return r ? <option key={recipientId} value={recipientId}>{r.nome}</option> : null
                              })}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border/50 pt-4">
              <button
                type="button"
                onClick={() => closeRedistributionDialog(false)}
                disabled={redistributionSaving || actionLoading}
                className="h-10 rounded-xl border border-border/70 px-4 text-sm font-medium text-foreground/60 transition-colors hover:bg-content2/60 hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRedistributionAndAction}
                disabled={redistributionSaving || actionLoading || !redistributionPreview || selectedRecipientIds.length === 0 || hasUnassignedOutliers}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-5 text-sm font-semibold text-white shadow-[0_6px_20px_-8px_rgba(249,115,22,0.70)] transition hover:from-orange-400 hover:to-amber-500 disabled:opacity-50"
              >
                {(redistributionSaving || actionLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
                Redistribuir e {selectedAction === "delete" ? "excluir usuário" : "desativar usuário"}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── ACTION CONFIRMATION DIALOG ────────────────────────────────────── */}
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
                onClick={(e) => { e.preventDefault(); handleConfirmUserAction() }}
                disabled={actionLoading}
                className={selectedAction === "delete" ? "bg-destructive/15 hover:bg-destructive/15" : undefined}
              >
                {actionLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>
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
