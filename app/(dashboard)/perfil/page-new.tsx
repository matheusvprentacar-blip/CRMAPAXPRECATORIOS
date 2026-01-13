"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Mail,
  Phone,
  Save,
  Loader2,
  CheckCircle2,
  MapPin,
  Search,
  Briefcase,
  Bell,
  Palette,
  Shield,
} from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { createBrowserClient } from "@/lib/supabase/client"
import { UploadFoto } from "@/components/perfil/upload-foto"
import { buscarCEP, formatarCEP, validarCEP } from "@/lib/utils/cep"
import { toast } from "@/components/ui/use-toast"

// Descrições de permissões por role
const ROLE_DESCRIPTIONS = {
  admin: "Acesso total ao sistema. Pode criar usuários, gerenciar precatórios, visualizar relatórios e configurar o sistema.",
  operador_comercial:
    "Gerenciar precatórios comercialmente. Pode criar, editar, distribuir precatórios e enviar para cálculo.",
  operador_calculo:
    "Realizar cálculos de precatórios. Pode acessar a fila de cálculo, realizar cálculos e gerenciar seus precatórios.",
  operador: "Operador geral do sistema. Acesso básico às funcionalidades.",
  analista: "Analisar dados e gerar relatórios. Acesso de leitura aos dados do sistema.",
  gestor: "Gerenciar equipes e visualizar métricas. Acesso a dashboards e relatórios gerenciais.",
}

export default function PerfilPage() {
  const { profile, updateProfile } = useAuth()

  // Estados - Informações Pessoais
  const [nome, setNome] = useState(profile?.nome || "")
  const [telefone, setTelefone] = useState(profile?.telefone || "")
  const [fotoUrl, setFotoUrl] = useState(profile?.foto_url || "")

  // Estados - Endereço
  const [cep, setCep] = useState("")
  const [endereco, setEndereco] = useState("")
  const [numero, setNumero] = useState("")
  const [complemento, setComplemento] = useState("")
  const [bairro, setBairro] = useState("")
  const [cidade, setCidade] = useState("")
  const [estado, setEstado] = useState("")

  // Estados - Cargo
  const [cargo, setCargo] = useState("")
  const [descricaoCargo, setDescricaoCargo] = useState("")

  // Estados - Preferências
  const [notificacoesEmail, setNotificacoesEmail] = useState(true)
  const [tema, setTema] = useState("system")

  // Estados - Senha
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")

  // Estados - UI
  const [loading, setLoading] = useState(false)
  const [loadingSenha, setLoadingSenha] = useState(false)
  const [buscandoCEP, setBuscandoCEP] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successSenha, setSuccessSenha] = useState(false)
  const [error, setError] = useState("")
  const [errorSenha, setErrorSenha] = useState("")

  // Carregar dados do perfil
  useEffect(() => {
    if (profile) {
      loadPerfilCompleto()
    }
  }, [profile])

  async function loadPerfilCompleto() {
    try {
      const supabase = createBrowserClient()
      if (!supabase || !profile?.id) return

      const { data, error } = await supabase.from("usuarios").select("*").eq("id", profile.id).single()

      if (error) throw error

      if (data) {
        // Carregar todos os campos
        setNome(data.nome || "")
        setTelefone(data.telefone || "")
        setFotoUrl(data.foto_url || "")
        setCep(data.cep || "")
        setEndereco(data.endereco || "")
        setNumero(data.numero || "")
        setComplemento(data.complemento || "")
        setBairro(data.bairro || "")
        setCidade(data.cidade || "")
        setEstado(data.estado || "")
        setCargo(data.cargo || "")
        setDescricaoCargo(data.descricao_cargo || "")
        setNotificacoesEmail(data.notificacoes_email ?? true)
        setTema(data.tema || "system")
      }
    } catch (error) {
      console.error("[Perfil] Erro ao carregar:", error)
    }
  }

  async function handleBuscarCEP() {
    if (!validarCEP(cep)) {
      toast({
        title: "CEP inválido",
        description: "Digite um CEP válido com 8 dígitos",
        variant: "destructive",
      })
      return
    }

    setBuscandoCEP(true)

    try {
      const resultado = await buscarCEP(cep)

      if (!resultado) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado e tente novamente",
          variant: "destructive",
        })
        return
      }

      // Preencher campos automaticamente
      setEndereco(resultado.logradouro)
      setBairro(resultado.bairro)
      setCidade(resultado.localidade)
      setEstado(resultado.uf)
      setCep(formatarCEP(resultado.cep))

      toast({
        title: "Endereço encontrado",
        description: "Os campos foram preenchidos automaticamente",
      })
    } catch (error) {
      console.error("[CEP] Erro:", error)
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      })
    } finally {
      setBuscandoCEP(false)
    }
  }

  async function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const supabase = createBrowserClient()
      if (!supabase || !profile?.id) return

      const { error: updateError } = await supabase
        .from("usuarios")
        .update({
          nome,
          telefone,
          foto_url: fotoUrl,
          cep,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          cargo,
          descricao_cargo: descricaoCargo,
          notificacoes_email: notificacoesEmail,
          tema,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (updateError) throw updateError

      // Atualizar contexto
      await updateProfile({
        nome,
        telefone,
        foto_url: fotoUrl,
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso",
      })
    } catch (err: any) {
      console.error("[Perfil] Erro ao salvar:", err)
      setError(err.message || "Erro ao atualizar perfil")
    } finally {
      setLoading(false)
    }
  }

  async function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault()
    setLoadingSenha(true)
    setErrorSenha("")
    setSuccessSenha(false)

    if (novaSenha !== confirmarSenha) {
      setErrorSenha("As senhas não coincidem")
      setLoadingSenha(false)
      return
    }

    if (novaSenha.length < 6) {
      setErrorSenha("A senha deve ter pelo menos 6 caracteres")
      setLoadingSenha(false)
      return
    }

    try {
      const supabase = createBrowserClient()
      if (supabase) {
        const { error } = await supabase.auth.updateUser({
          password: novaSenha,
        })

        if (error) throw error

        setSuccessSenha(true)
        setNovaSenha("")
        setConfirmarSenha("")
        setTimeout(() => setSuccessSenha(false), 3000)

        toast({
          title: "Senha alterada",
          description: "Sua senha foi atualizada com sucesso",
        })
      }
    } catch (err: any) {
      console.error("[Senha] Erro:", err)
      setErrorSenha(err.message || "Erro ao alterar senha")
    } finally {
      setLoadingSenha(false)
    }
  }

  const roleDescription = profile?.role?.[0] ? ROLE_DESCRIPTIONS[profile.role[0] as keyof typeof ROLE_DESCRIPTIONS] : ""

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações de Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e preferências</p>
      </div>

      <form onSubmit={handleSalvarPerfil} className="space-y-6">
        {/* Foto de Perfil */}
        <Card>
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>Adicione uma foto para personalizar seu perfil</CardDescription>
          </CardHeader>
          <CardContent>
            <UploadFoto fotoAtual={fotoUrl} nome={nome} onFotoChange={setFotoUrl} />
          </CardContent>
        </Card>

        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>Seus dados básicos de identificação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  type="text"
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={profile?.email || ""} className="pl-10 bg-muted" disabled />
                </div>
                <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Tipo de Conta</Label>
                <Input
                  id="role"
                  value={profile?.role?.[0]?.replace(/_/g, " ").toUpperCase() || ""}
                  className="bg-muted capitalize"
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereço
            </CardTitle>
            <CardDescription>Seu endereço completo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="flex gap-2">
                  <Input
                    id="cep"
                    type="text"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    maxLength={9}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleBuscarCEP} disabled={buscandoCEP}>
                    {buscandoCEP ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endereco">Logradouro</Label>
                <Input
                  id="endereco"
                  type="text"
                  placeholder="Rua, Avenida, etc"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  type="text"
                  placeholder="123"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  type="text"
                  placeholder="Apto, Sala, Bloco, etc"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  type="text"
                  placeholder="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  type="text"
                  placeholder="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  type="text"
                  placeholder="UF"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value.toUpperCase())}
                  maxLength={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cargo e Função */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Cargo e Função
            </CardTitle>
            <CardDescription>Informações sobre seu cargo no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                type="text"
                placeholder="Ex: Gerente de Operações"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricaoCargo">Permissões e Responsabilidades</Label>
              <Textarea
                id="descricaoCargo"
                placeholder="Descreva suas responsabilidades..."
                value={descricaoCargo}
                onChange={(e) => setDescricaoCargo(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {roleDescription && (
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Permissões do seu perfil ({profile?.role?.[0]?.replace(/_/g, " ")}):</strong>
                  <br />
                  {roleDescription}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Preferências */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Preferências
            </CardTitle>
            <CardDescription>Personalize sua experiência no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notificacoes" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notificações por Email
                </Label>
                <p className="text-sm text-muted-foreground">Receber atualizações e alertas por email</p>
              </div>
              <Switch
                id="notificacoes"
                checked={notificacoesEmail}
                onCheckedChange={setNotificacoesEmail}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="tema">Tema da Interface</Label>
              <Select value={tema} onValueChange={setTema}>
                <SelectTrigger id="tema">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema (Automático)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Escolha o tema que será aplicado à interface do sistema
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">Perfil atualizado com sucesso!</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>Atualize sua senha de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAlterarSenha} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  placeholder="••••••••"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  placeholder="••••••••"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {errorSenha && (
              <Alert variant="destructive">
                <AlertDescription>{errorSenha}</AlertDescription>
              </Alert>
            )}

            {successSenha && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">Senha alterada com sucesso!</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loadingSenha} variant="outline">
              {loadingSenha ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                "Alterar Senha"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
