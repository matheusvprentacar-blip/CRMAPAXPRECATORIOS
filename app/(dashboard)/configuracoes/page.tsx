"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2, Image as ImageIcon, Save, X } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { RoleGuard } from "@/lib/auth/role-guard"
import Image from "next/image"

export default function ConfiguracoesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [config, setConfig] = useState({
    id: '',
    logo_url: '',
    nome_empresa: 'CRM Precatórios',
    subtitulo_empresa: 'Sistema de Gestão',
  })

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .single()

      if (error) throw error

      if (data) {
        setConfig(data)
        if (data.logo_url) {
          setPreviewUrl(data.logo_url)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem (PNG, JPG, etc.)",
        variant: "destructive",
      })
      return
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O logo deve ter no máximo 2MB",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)

    // Criar preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleUploadLogo() {
    if (!selectedFile) return

    setUploading(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      // Gerar nome único para o arquivo
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Fazer upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      // Atualizar configuração com a nova URL
      const { error: updateError } = await supabase
        .from('configuracoes_sistema')
        .update({ logo_url: publicUrl })
        .eq('id', config.id)

      if (updateError) throw updateError

      setConfig({ ...config, logo_url: publicUrl })
      setSelectedFile(null)

      toast({
        title: "Logo atualizado!",
        description: "O logo foi atualizado com sucesso",
      })

      // Recarregar a página para atualizar o logo no sidebar
      setTimeout(() => window.location.reload(), 1000)

    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoveLogo() {
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      // Atualizar configuração removendo a URL
      const { error } = await supabase
        .from('configuracoes_sistema')
        .update({ logo_url: null })
        .eq('id', config.id)

      if (error) throw error

      setConfig({ ...config, logo_url: '' })
      setPreviewUrl(null)
      setSelectedFile(null)

      toast({
        title: "Logo removido",
        description: "O logo foi removido com sucesso",
      })

      // Recarregar a página para atualizar o sidebar
      setTimeout(() => window.location.reload(), 1000)

    } catch (error: any) {
      console.error('Erro ao remover logo:', error)
      toast({
        title: "Erro ao remover logo",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleSaveConfig() {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      const { error } = await supabase
        .from('configuracoes_sistema')
        .update({
          nome_empresa: config.nome_empresa,
          subtitulo_empresa: config.subtitulo_empresa,
        })
        .eq('id', config.id)

      if (error) throw error

      toast({
        title: "Configurações salvas!",
        description: "As configurações foram atualizadas com sucesso",
      })

      // Recarregar a página para atualizar o sidebar
      setTimeout(() => window.location.reload(), 1000)

    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error)
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
          <p className="text-muted-foreground">Personalize a aparência e informações do sistema</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Logo da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle>Logo da Empresa</CardTitle>
              <CardDescription>
                Faça upload do logo da sua empresa (PNG, JPG - máx. 2MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview do Logo */}
              <div className="flex items-center justify-center w-full h-48 border-2 border-dashed rounded-lg bg-muted/50">
                {previewUrl ? (
                  <div className="relative w-full h-full p-4">
                    <Image
                      src={previewUrl}
                      alt="Logo preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Nenhum logo selecionado</p>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="logo-upload"
                />
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Logo
                </Button>

                {selectedFile && (
                  <Button
                    onClick={handleUploadLogo}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Logo
                      </>
                    )}
                  </Button>
                )}

                {config.logo_url && !selectedFile && (
                  <Button
                    variant="destructive"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Recomendado: Logo quadrado ou horizontal, fundo transparente
              </p>
            </CardContent>
          </Card>

          {/* Informações da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Personalize o nome e subtítulo exibidos no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_empresa">Nome da Empresa</Label>
                <Input
                  id="nome_empresa"
                  value={config.nome_empresa}
                  onChange={(e) => setConfig({ ...config, nome_empresa: e.target.value })}
                  placeholder="Ex: Minha Empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitulo_empresa">Subtítulo</Label>
                <Input
                  id="subtitulo_empresa"
                  value={config.subtitulo_empresa}
                  onChange={(e) => setConfig({ ...config, subtitulo_empresa: e.target.value })}
                  placeholder="Ex: Sistema de Gestão"
                />
              </div>

              <Button
                onClick={handleSaveConfig}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Informações
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                As alterações serão aplicadas após salvar
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  )
}
