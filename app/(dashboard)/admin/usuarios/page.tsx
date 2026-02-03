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
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Mail, Phone, Search, Shield, Loader2, CheckCircle2, UserPlus, FileText, ArrowRight } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { RoleGuard } from "@/lib/auth/role-guard"
import { useToast } from "@/hooks/use-toast"
import { createNewUser } from "./actions"
import { useState, useEffect } from "react"
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

export default function UsuariosPage() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [creatingUser, setCreatingUser] = useState(false)
  const [lastCreateAttempt, setLastCreateAttempt] = useState<number>(0)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    nome: "",
    role: ["operador_comercial"],
    autoConfirm: true,
  })
  const { toast } = useToast()

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
                    filteredUsuarios.map((usuario) => (
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
                              : new Date(usuario.created_at).toLocaleDateString("pt-BR") // Fallback
                            }
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/usuarios/detalhes?id=${usuario.id}`)
                          }}>
                            Gerenciar
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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
      </div>
    </RoleGuard>
  )
}
