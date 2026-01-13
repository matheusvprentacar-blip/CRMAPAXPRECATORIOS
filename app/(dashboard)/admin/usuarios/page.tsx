"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Mail, Phone, Edit, Search, Shield, Loader2, CheckCircle2, UserPlus } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { RoleGuard } from "@/lib/auth/role-guard"
import { useToast } from "@/hooks/use-toast"
import { createNewUser, updateUserRole } from "./actions"
import { useState, useEffect } from "react"

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

interface Usuario {
  id: string
  nome: string
  email: string
  role: string[]  // Array de roles
  telefone: string | null
  foto_url: string | null
  ativo: boolean
  created_at: string
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [newRole, setNewRole] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
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
          setUsuarios(data)
        }
      }
    } catch (error) {
      console.error("[v0] Admin: Erro ao carregar usuários:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleEditarRole(usuario: Usuario) {
    setSaving(true)
    setError("")
    setSuccess(false)

    try {
      // Usar server action para atualizar role com service_role key
      const result = await updateUserRole(usuario.id, newRole)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Atualizar estado local
      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, role: newRole } : u)))

      toast({
        title: "Usuário atualizado com sucesso!",
        description: result.message,
        duration: 5000,
      })

      setSuccess(true)
      setTimeout(() => {
        setEditingUser(null)
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      console.error("[ADMIN] Erro ao atualizar role:", err)
      setError(err.message || "Erro ao atualizar usuário")
      toast({
        title: "Erro ao atualizar usuário",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  function toggleRole(roleValue: string, isEditing: boolean) {
    if (isEditing) {
      setNewRole(prev => {
        if (prev.includes(roleValue)) {
          // Prevent removing the last role (optional, but good UX)
          if (prev.length === 1) return prev
          return prev.filter(r => r !== roleValue)
        } else {
          if (prev.length >= 2) {
            toast({ title: "Limite atingido", description: "Máximo de 2 funções por usuário.", variant: "destructive" })
            return prev
          }
          return [...prev, roleValue]
        }
      })
    } else {
      setNewUserData(prev => {
        const currentRoles = prev.role
        if (currentRoles.includes(roleValue)) {
          if (currentRoles.length === 1) return prev
          return { ...prev, role: currentRoles.filter(r => r !== roleValue) }
        } else {
          if (currentRoles.length >= 2) {
            toast({ title: "Limite atingido", description: "Máximo de 2 funções por usuário.", variant: "destructive" })
            return prev
          }
          return { ...prev, role: [...currentRoles, roleValue] }
        }
      })
    }
  }

  async function handleCreateUser() {
    const now = Date.now()
    const timeSinceLastAttempt = now - lastCreateAttempt
    const minWaitTime = 3000 // 3 seconds

    if (timeSinceLastAttempt < minWaitTime) {
      const remainingTime = Math.ceil((minWaitTime - timeSinceLastAttempt) / 1000)
      toast({
        title: "Aguarde um momento",
        description: `Por segurança, aguarde ${remainingTime} segundo(s) antes de criar outro usuário.`,
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
        title: "Usuário criado com sucesso!",
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
      if (err.message?.includes("rate_limit") || err.message?.includes("3 seconds")) {
        toast({
          title: "Limite de segurança atingido",
          description: "Aguarde 3 segundos antes de criar outro usuário.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Falha ao criar usuário",
          description: err.message || "Erro desconhecido",
          variant: "destructive",
        })
      }
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
      case "operador_calculo":
        return "outline"
      case "juridico":
        return "default"
      case "gestor_certidoes":
        return "secondary"
      default:
        return "secondary"
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
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Gerencie usuários e suas permissões</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.length}</div>
              <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.filter((u) => u.role.includes("admin")).length}</div>
              <p className="text-xs text-muted-foreground">Com acesso total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.filter((u) => !u.role.includes("admin")).length}</div>
              <p className="text-xs text-muted-foreground">Comercial e Cálculo</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>Visualize e edite informações dos usuários</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Criar um novo usuário</DialogTitle>
                      <DialogDescription>
                        Preencha os dados abaixo para criar um novo usuário no sistema
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-nome">Nome Completo</Label>
                        <Input
                          id="new-nome"
                          placeholder="Ex: João Silva"
                          value={newUserData.nome}
                          onChange={(e) => setNewUserData((prev) => ({ ...prev, nome: e.target.value }))}
                          disabled={creatingUser}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-email">Endereço e-mail</Label>
                        <Input
                          id="new-email"
                          type="email"
                          placeholder="usuario@empresa.com"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData((prev) => ({ ...prev, email: e.target.value }))}
                          disabled={creatingUser}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Senha Usuário</Label>
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
                        <Label>Tipo de Conta (Máx 2)</Label>
                        <div className="grid grid-cols-2 gap-2 border p-4 rounded-md h-60 overflow-y-auto">
                          {AVAILABLE_ROLES.map((role) => (
                            <div key={role.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`create-role-${role.value}`}
                                checked={newUserData.role.includes(role.value)}
                                onCheckedChange={() => toggleRole(role.value, false)}
                                disabled={creatingUser}
                              />
                              <Label htmlFor={`create-role-${role.value}`}>{role.label}</Label>
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
                            <UserPlus className="w-4 h-4 mr-2" />
                            Criar usuário
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tipo de Conta</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={usuario.foto_url || "/placeholder.svg"} />
                              <AvatarFallback>{getInitials(usuario.nome)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{usuario.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                Desde {new Date(usuario.created_at).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{usuario.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {usuario.telefone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{usuario.telefone}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Não informado</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {usuario.role.map(r => (
                              <Badge key={r} variant={getRoleBadgeVariant(r)}>
                                {r.replace(/_/g, " ").toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog
                            open={editingUser?.id === usuario.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setEditingUser(usuario)
                                // Garantir que role seja array (compatibilidade com dados antigos)
                                const roleArray = Array.isArray(usuario.role)
                                  ? usuario.role
                                  : (usuario.role ? [usuario.role] : [])
                                setNewRole(roleArray)
                                setError("")
                                setSuccess(false)
                              } else {
                                setEditingUser(null)
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Usuário</DialogTitle>
                                <DialogDescription>Altere o tipo de conta do usuário</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-12 h-12">
                                    <AvatarImage src={usuario.foto_url || "/placeholder.svg"} />
                                    <AvatarFallback>{getInitials(usuario.nome)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{usuario.nome}</p>
                                    <p className="text-sm text-muted-foreground">{usuario.email}</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Tipo de Conta (Máx 2)</Label>
                                  <div className="grid grid-cols-2 gap-2 border p-4 rounded-md h-60 overflow-y-auto">
                                    {AVAILABLE_ROLES.map((role) => (
                                      <div key={role.value} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`edit-role-${role.value}`}
                                          checked={newRole.includes(role.value)}
                                          onCheckedChange={() => toggleRole(role.value, true)}
                                          disabled={saving}
                                        />
                                        <Label htmlFor={`edit-role-${role.value}`}>{role.label}</Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {error && (
                                  <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                  </Alert>
                                )}
                                {success && (
                                  <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-600">
                                      Usuário atualizado com sucesso!
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingUser(null)} disabled={saving}>
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={() => handleEditarRole(usuario)}
                                  disabled={saving || JSON.stringify(newRole.sort()) === JSON.stringify(usuario.role.sort())}
                                >
                                  {saving ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Salvando...
                                    </>
                                  ) : (
                                    "Salvar Alterações"
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
