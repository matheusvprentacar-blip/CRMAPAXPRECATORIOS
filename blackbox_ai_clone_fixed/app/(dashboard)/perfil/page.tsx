"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Mail, Phone, Camera, Save, Loader2, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { createBrowserClient } from "@/lib/supabase/client"

export default function PerfilPage() {
  const { profile, updateProfile } = useAuth()
  const [nome, setNome] = useState(profile?.nome || "")
  const [telefone, setTelefone] = useState(profile?.telefone || "")
  const [fotoUrl, setFotoUrl] = useState(profile?.foto_url || "")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingSenha, setLoadingSenha] = useState(false)
  const [success, setSuccess] = useState(false)
  const [successSenha, setSuccessSenha] = useState(false)
  const [error, setError] = useState("")
  const [errorSenha, setErrorSenha] = useState("")

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      await updateProfile({
        nome,
        telefone,
        foto_url: fotoUrl,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar perfil")
    } finally {
      setLoading(false)
    }
  }

  const handleAlterarSenha = async (e: React.FormEvent) => {
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
      }
    } catch (err: any) {
      setErrorSenha(err.message || "Erro ao alterar senha")
    } finally {
      setLoadingSenha(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações de Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e preferências</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Pessoais */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize suas informações de perfil</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalvarPerfil} className="space-y-6">
              <div className="flex flex-col items-center gap-4 pb-6 border-b">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={fotoUrl || profile?.foto_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-2xl">
                    {profile?.nome ? getInitials(profile.nome) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 w-full max-w-md">
                  <Label htmlFor="fotoUrl">URL da Foto</Label>
                  <div className="flex gap-2">
                    <Input
                      id="fotoUrl"
                      type="url"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                    />
                    <Button type="button" variant="outline" size="icon">
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Cole o link de uma imagem da internet</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Seu nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
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
                    value={profile?.role?.replace(/_/g, " ").toUpperCase() || ""}
                    className="bg-muted capitalize"
                    disabled
                  />
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
                  <AlertDescription className="text-green-600">Perfil atualizado com sucesso!</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full md:w-auto">
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
            </form>
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card className="md:col-span-2">
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
    </div>
  )
}
