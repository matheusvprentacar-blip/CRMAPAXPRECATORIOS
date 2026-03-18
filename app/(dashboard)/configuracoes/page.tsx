"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2, Image as ImageIcon, Save, X, Palette, Check } from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { RoleGuard } from "@/lib/auth/role-guard"
import Image from "next/image"
import { UpdateChecker } from "@/components/settings/update-checker"
import {
  DEFAULT_CUSTOM_THEME,
  DEFAULT_SYSTEM_THEME_CONFIG,
  getThemePresetOptions,
  resolveSystemThemePalette,
  sanitizeSystemThemeConfig,
  SYSTEM_THEME_CONFIG_STORAGE_KEY,
  SYSTEM_THEME_EVENT_NAME,
  type CustomThemeInput,
  type SystemThemeConfig,
} from "@/lib/theme/system-theme"

const CUSTOM_THEME_FIELDS: Array<{
  key: keyof CustomThemeInput
  label: string
  placeholder: string
  affects: string
}> = [
  {
    key: "primary",
    label: "Cor primaria",
    placeholder: "#ff8a00",
    affects: "Altera: botoes principais, titulos destacados, links e acoes ativas.",
  },
  {
    key: "secondary",
    label: "Cor secundaria",
    placeholder: "#f59e0b",
    affects: "Altera: superficies secundarias, chips neutros e areas de apoio.",
  },
  {
    key: "accent",
    label: "Cor de destaque",
    placeholder: "#fb923c",
    affects: "Altera: estados de hover, realces visuais e elementos de enfase.",
  },
]

export default function ConfiguracoesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingTheme, setSavingTheme] = useState(false)
  const [uploading, setUploading] = useState(false)
  const themePresets = getThemePresetOptions()

  const [config, setConfig] = useState({
    id: '',
    logo_url: '',
    nome_empresa: 'CRM APAX Precat\u00f3rios',
    subtitulo_empresa: 'Sistema de Gestao',
    tema_config: DEFAULT_SYSTEM_THEME_CONFIG as SystemThemeConfig,
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
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setConfig((prev) => ({
          ...prev,
          ...data,
          tema_config: sanitizeSystemThemeConfig((data as { tema_config?: unknown }).tema_config),
        }))
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

  function updateThemeConfig(next: SystemThemeConfig) {
    setConfig((prev) => ({
      ...prev,
      tema_config: sanitizeSystemThemeConfig(next),
    }))
  }

  function updateThemeMode(mode: SystemThemeConfig["mode"]) {
    updateThemeConfig({
      ...config.tema_config,
      mode,
    })
  }

  function updateThemePreset(preset: SystemThemeConfig["preset"]) {
    updateThemeConfig({
      ...config.tema_config,
      preset,
      mode: "preset",
    })
  }

  function updateCustomColor(field: keyof CustomThemeInput, value: string) {
    updateThemeConfig({
      ...config.tema_config,
      mode: "custom",
      custom: {
        ...(config.tema_config.custom || DEFAULT_CUSTOM_THEME),
        [field]: value,
      },
    })
  }

  function applyThemeLocally(themeConfig: SystemThemeConfig) {
    if (typeof window === "undefined") return
    const safeConfig = sanitizeSystemThemeConfig(themeConfig)
    window.localStorage.setItem(SYSTEM_THEME_CONFIG_STORAGE_KEY, JSON.stringify(safeConfig))
    window.dispatchEvent(new CustomEvent(SYSTEM_THEME_EVENT_NAME, { detail: { config: safeConfig } }))
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

  async function handleSaveThemeConfig() {
    setSavingTheme(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase nao disponivel")
      if (!config.id) throw new Error("Registro de configuracoes nao encontrado")

      const safeThemeConfig = sanitizeSystemThemeConfig(config.tema_config)

      const { error } = await supabase
        .from("configuracoes_sistema")
        .update({
          tema_config: safeThemeConfig,
        })
        .eq("id", config.id)

      if (error) throw error

      applyThemeLocally(safeThemeConfig)
      setConfig((prev) => ({
        ...prev,
        tema_config: safeThemeConfig,
      }))

      toast({
        title: "Tema atualizado!",
        description: "A nova paleta foi aplicada em todo o sistema.",
      })
    } catch (error: any) {
      console.error("Erro ao salvar tema:", error)
      toast({
        title: "Erro ao salvar tema",
        description: error?.message ?? "Nao foi possivel salvar o tema.",
        variant: "destructive",
      })
    } finally {
      setSavingTheme(false)
    }
  }

  const activeThemeConfig = sanitizeSystemThemeConfig(config.tema_config)
  const customTheme = activeThemeConfig.custom
  const previewPalette = resolveSystemThemePalette(activeThemeConfig)
  const lightPreview = previewPalette.light
  const darkPreview = previewPalette.dark

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Tema e Paleta Global
            </CardTitle>
            <CardDescription>
              Escolha um preset ou personalize textos e destaques do sistema. Fundos sao fixos e, no modo escuro, permanecem pretos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={activeThemeConfig.mode === "preset" ? "default" : "outline"}
                onClick={() => updateThemeMode("preset")}
              >
                {activeThemeConfig.mode === "preset" ? <Check className="h-4 w-4 mr-1" /> : null}
                Usar paleta predefinida
              </Button>
              <Button
                type="button"
                variant={activeThemeConfig.mode === "custom" ? "default" : "outline"}
                onClick={() => updateThemeMode("custom")}
              >
                {activeThemeConfig.mode === "custom" ? <Check className="h-4 w-4 mr-1" /> : null}
                Personalizar
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {themePresets.map((preset) => {
                const selected =
                  activeThemeConfig.mode === "preset" &&
                  activeThemeConfig.preset === (preset.id as SystemThemeConfig["preset"])

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateThemePreset(preset.id as SystemThemeConfig["preset"])}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      selected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-border/70 hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{preset.name}</div>
                      {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded-full border border-border/60"
                        style={{ backgroundColor: `hsl(${preset.light.primary})` }}
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-border/60"
                        style={{ backgroundColor: `hsl(${preset.light.secondary})` }}
                      />
                      <span
                        className="h-5 w-5 rounded-full border border-border/60"
                        style={{ backgroundColor: `hsl(${preset.dark.background})` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 md:p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold">Exemplo de como o sistema vai ficar</p>
                <p className="text-xs text-muted-foreground">
                  Pre-visualizacao rapida de fundo, cards, titulos, botoes e destaques com a paleta atual.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div
                  className="rounded-lg border p-3 space-y-3"
                  style={{
                    backgroundColor: `hsl(${lightPreview.background})`,
                    borderColor: `hsl(${lightPreview.border})`,
                    color: `hsl(${lightPreview.foreground})`,
                  }}
                >
                  <div className="text-xs font-medium opacity-80">Tema claro</div>
                  <div
                    className="rounded-md border p-3 space-y-2"
                    style={{
                      backgroundColor: `hsl(${lightPreview.card})`,
                      borderColor: `hsl(${lightPreview.border})`,
                    }}
                  >
                    <p
                      className="text-sm font-semibold"
                      style={{ color: `hsl(${lightPreview.primary})` }}
                    >
                      Titulo e destaque principal
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: `hsl(${lightPreview["muted-foreground"]})` }}
                    >
                      Texto auxiliar e informacoes secundarias.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `hsl(${lightPreview.primary})`,
                          color: `hsl(${lightPreview["primary-foreground"]})`,
                        }}
                      >
                        Botao primario
                      </button>
                      <span
                        className="rounded px-2 py-1 text-xs font-medium border"
                        style={{
                          borderColor: `hsl(${lightPreview.accent})`,
                          backgroundColor: `hsl(${lightPreview.accent})`,
                          color: `hsl(${lightPreview["accent-foreground"]})`,
                        }}
                      >
                        Destaque
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-lg border p-3 space-y-3"
                  style={{
                    backgroundColor: `hsl(${darkPreview.background})`,
                    borderColor: `hsl(${darkPreview.border})`,
                    color: `hsl(${darkPreview.foreground})`,
                  }}
                >
                  <div className="text-xs font-medium opacity-80">Tema escuro</div>
                  <div
                    className="rounded-md border p-3 space-y-2"
                    style={{
                      backgroundColor: `hsl(${darkPreview.card})`,
                      borderColor: `hsl(${darkPreview.border})`,
                    }}
                  >
                    <p
                      className="text-sm font-semibold"
                      style={{ color: `hsl(${darkPreview.primary})` }}
                    >
                      Titulo e destaque principal
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: `hsl(${darkPreview["muted-foreground"]})` }}
                    >
                      Texto auxiliar e informacoes secundarias.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `hsl(${darkPreview.primary})`,
                          color: `hsl(${darkPreview["primary-foreground"]})`,
                        }}
                      >
                        Botao primario
                      </button>
                      <span
                        className="rounded px-2 py-1 text-xs font-medium border"
                        style={{
                          borderColor: `hsl(${darkPreview.accent})`,
                          backgroundColor: `hsl(${darkPreview.accent})`,
                          color: `hsl(${darkPreview["accent-foreground"]})`,
                        }}
                      >
                        Destaque
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {activeThemeConfig.mode === "custom" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {CUSTOM_THEME_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <Label htmlFor={`theme-${field.key}`}>{field.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`theme-${field.key}`}
                        type="color"
                        value={customTheme[field.key]}
                        onChange={(e) => updateCustomColor(field.key, e.target.value)}
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={customTheme[field.key]}
                        onChange={(e) => updateCustomColor(field.key, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {field.affects}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                A paleta salva sera aplicada para todos os usuarios do sistema.
              </p>
              <Button onClick={handleSaveThemeConfig} disabled={savingTheme}>
                {savingTheme ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando tema...
                  </>
                ) : (
                  <>
                    <Palette className="h-4 w-4 mr-2" />
                    Salvar paleta
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:max-w-md">
          <CardHeader>
            <CardTitle>Atualizacao do Aplicativo</CardTitle>
            <CardDescription>
              Verifique, baixe e instale novas versoes sem reinstalacao manual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UpdateChecker />
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
