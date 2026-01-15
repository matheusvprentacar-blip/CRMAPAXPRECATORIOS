"use client"
/* eslint-disable */

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Edit, Save, X, ArrowLeft, FileText, Scale, Calculator, Clock, CheckSquare } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

// Supabase non-null helper
type SupabaseClientType = NonNullable<ReturnType<typeof createBrowserClient>>
function requireSupabase(): SupabaseClientType {
  const supabase = createBrowserClient()
  if (!supabase) {
    throw new Error(
      "Supabase não disponível. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    )
  }
  return supabase
}
import { ChecklistDocumentos } from "@/components/kanban/checklist-documentos"
import { ChecklistCertidoes } from "@/components/kanban/checklist-certidoes"
import { FormSolicitarJuridico } from "@/components/kanban/form-solicitar-juridico"
import { FormParecerJuridico } from "@/components/kanban/form-parecer-juridico"
import { FormExportarCalculo } from "@/components/kanban/form-exportar-calculo"
import { HistoricoCalculos } from "@/components/kanban/historico-calculos"
import { Timeline } from "@/components/precatorios/timeline"
import CalculadoraPrecatorios from "@/components/calculador-precatorios"
import { ResumoCalculoDetalhado } from "@/components/precatorios/resumo-calculo-detalhado"


function PrecatorioDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id") || ""

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [precatorio, setPrecatorio] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [notFound, setNotFound] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editData, setEditData] = useState<any>({})
  const [userRole, setUserRole] = useState<string[] | null>(null)

  async function loadPrecatorio() {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    try {
      const supabase = requireSupabase()

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from("usuarios")
          .select("role")
          .eq("id", user.id)
          .single()
        setUserRole(userData?.role || null)
      }

      const { data, error } = await supabase
        .from("precatorios")
        .select(`
          *,
          dados_calculo,
          responsavel_comercial:responsavel(id, nome, email),
          responsavel_calculo:responsavel_calculo_id(id, nome, email),
          responsavel_certidoes:responsavel_certidoes_id(id, nome, email),
          responsavel_oficio:responsavel_oficio_id(id, nome, email)
        `)
        .eq("id", id)
        .single()

      if (error || !data) {
        setNotFound(true)
        return
      }
      setPrecatorio(data)
    } catch (e) {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrecatorio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const formatBR = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  function startEditing() {
    setEditData({ ...precatorio })
    setIsEditing(true)
  }

  function cancelEditing() {
    setEditData({})
    setIsEditing(false)
  }

  async function saveEditing() {
    setSaving(true)
    try {
      const supabase = requireSupabase()

      // Remove campos de relacionamento (joins)
      const dataToUpdate = { ...editData }
      delete dataToUpdate.responsavel_comercial
      delete dataToUpdate.responsavel_calculo
      delete dataToUpdate.responsavel_certidoes
      delete dataToUpdate.responsavel_oficio
      delete dataToUpdate.dados_calculo // Geralmente não editamos o JSON inteiro aqui, se for o caso

      const { error } = await supabase
        .from("precatorios")
        .update(dataToUpdate)
        .eq("id", id)

      if (error) throw error

      toast.success("Precatório atualizado com sucesso!")
      setIsEditing(false)
      await loadPrecatorio()
    } catch (error) {
      console.error("Erro ao salvar:", error)
      toast.error("Erro ao salvar alterações")
    } finally {
      setSaving(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateEditField(field: string, value: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEditData((prev: any) => ({ ...prev, [field]: value }))
  }

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">ID Inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O ID do precatório não foi fornecido ou é inválido.
            </p>
            <Button onClick={() => router.push("/precatorios")} variant="secondary" className="mt-4 w-full">
              Voltar para Lista
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (notFound || !precatorio) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Precatório não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              O precatório solicitado não foi localizado. Verifique se o link está correto.
            </p>
            <Button onClick={() => router.push("/precatorios")} variant="default" className="w-full">
              Voltar para Lista
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-8">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b pb-6">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mt-1 hover:bg-muted/50 -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {precatorio.numero_precatorio || "Novo Precatório"}
              </h1>
              <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold">
                {precatorio.status?.replace(/_/g, " ") || "Rascunho"}
              </Badge>
            </div>
            <h2 className="text-lg text-muted-foreground font-medium mb-1">
              {precatorio.titulo || "Sem título definido"}
            </h2>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="font-medium text-foreground">Credor:</span> {precatorio.credor_nome || "-"}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              {precatorio.valor_atualizado
                ? formatBR(Number(precatorio.valor_atualizado))
                : precatorio.valor_principal
                  ? formatBR(Number(precatorio.valor_principal))
                  : "R$ 0,00"}
            </div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {precatorio.valor_atualizado ? "Valor Atualizado" : "Valor Principal"}
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            {!isEditing ? (
              <Button onClick={startEditing} variant="outline" size="sm" className="shadow-sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar Dados
              </Button>
            ) : (
              <>
                <Button onClick={cancelEditing} variant="ghost" size="sm" disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={saveEditing} disabled={saving} size="sm" className="shadow-sm">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card de Responsáveis - Visível apenas para Admin */}
      {userRole?.includes('admin') && (
        <Card className="border shadow-sm bg-muted/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Responsáveis pelo Precatório
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Responsável Comercial */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  Responsável Comercial
                </div>
                {precatorio.responsavel_comercial ? (
                  <>
                    <div className="text-sm font-semibold text-foreground truncate">
                      {precatorio.responsavel_comercial.nome}
                    </div>
                    {precatorio.responsavel_comercial.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {precatorio.responsavel_comercial.email}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    Não atribuído
                  </div>
                )}
              </div>
            </div>

            {/* Responsável Cálculo */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  Operador de Cálculo
                </div>
                {precatorio.responsavel_calculo ? (
                  <>
                    <div className="text-sm font-semibold text-foreground truncate">
                      {precatorio.responsavel_calculo.nome}
                    </div>
                    {precatorio.responsavel_calculo.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {precatorio.responsavel_calculo.email}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    Não atribuído
                  </div>
                )}
              </div>
            </div>

            {/* Gestor de Certidões */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  Gestor de Certidões
                </div>
                {precatorio.responsavel_certidoes ? (
                  <>
                    <div className="text-sm font-semibold text-foreground truncate">
                      {precatorio.responsavel_certidoes.nome}
                    </div>
                    {precatorio.responsavel_certidoes.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {precatorio.responsavel_certidoes.email}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    Não atribuído
                  </div>
                )}
              </div>
            </div>

            {/* Gestor de Ofícios */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                  Gestor de Ofícios
                </div>
                {precatorio.responsavel_oficio ? (
                  <>
                    <div className="text-sm font-semibold text-foreground truncate">
                      {precatorio.responsavel_oficio.nome}
                    </div>
                    {precatorio.responsavel_oficio.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {precatorio.responsavel_oficio.email}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    Não atribuído
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}

      {/* Main Content */}
      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Tabs defaultValue="geral" className="w-full">
            <div className="border-b px-6 pt-2">
              <TabsList className="bg-transparent h-auto p-0 gap-6">
                <TabsTrigger
                  value="geral"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-primary transition-all hover:text-foreground"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Geral
                </TabsTrigger>
                <TabsTrigger
                  value="documentos"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-primary transition-all hover:text-foreground"

                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Documentos
                </TabsTrigger>
                <TabsTrigger
                  value="certidoes"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-primary transition-all hover:text-foreground"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Certidões
                </TabsTrigger>

                <TabsTrigger
                  value="calculo"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-primary transition-all hover:text-foreground"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Cálculo
                </TabsTrigger>
                <TabsTrigger
                  value="timeline"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-primary transition-all hover:text-foreground"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Timeline
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 bg-muted/5 min-h-[500px]">
              <TabsContent value="geral" className="mt-0 space-y-6">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-base font-semibold">Dados do Precatório</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Informações Principais</h3>
                      <div className="grid gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Título</Label>
                          {isEditing ? (
                            <Input
                              value={editData.titulo || ""}
                              onChange={(e) => updateEditField("titulo", e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <div className="p-2 bg-muted/30 rounded text-sm font-medium border border-transparent">{precatorio.titulo || "-"}</div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nº Precatório</Label>
                            {isEditing ? (
                              <Input
                                value={editData.numero_precatorio || ""}
                                onChange={(e) => updateEditField("numero_precatorio", e.target.value)}
                                className="h-9"
                              />
                            ) : (
                              <div className="p-2 bg-muted/30 rounded text-sm border border-transparent">{precatorio.numero_precatorio || "-"}</div>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Nº Processo</Label>
                            {isEditing ? (
                              <Input
                                value={editData.numero_processo || ""}
                                onChange={(e) => updateEditField("numero_processo", e.target.value)}
                                className="h-9"
                              />
                            ) : (
                              <div className="p-2 bg-muted/30 rounded text-sm border border-transparent">{precatorio.numero_processo || "-"}</div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Tribunal</Label>
                          {isEditing ? (
                            <Input
                              value={editData.tribunal || ""}
                              onChange={(e) => updateEditField("tribunal", e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <div className="p-2 bg-muted/30 rounded text-sm border border-transparent">{precatorio.tribunal || "-"}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Dados do Credor</h3>
                      <div className="grid gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nome do Credor</Label>
                          {isEditing ? (
                            <Input
                              value={editData.credor_nome || ""}
                              onChange={(e) => updateEditField("credor_nome", e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <div className="p-2 bg-muted/30 rounded text-sm font-medium border border-transparent">{precatorio.credor_nome || "-"}</div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">CPF/CNPJ do Credor</Label>
                          {isEditing ? (
                            <Input
                              value={editData.credor_cpf_cnpj || ""}
                              onChange={(e) => updateEditField("credor_cpf_cnpj", e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <div className="p-2 bg-muted/30 rounded text-sm border border-transparent font-mono">{precatorio.credor_cpf_cnpj || "-"}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-base font-semibold">Valores do Cálculo</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Valor Principal</Label>
                          <div className="text-sm font-medium">{precatorio.valor_principal ? formatBR(Number(precatorio.valor_principal)) : "-"}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Valor Atualizado</Label>
                          <div className="text-sm font-bold text-primary">{precatorio.valor_atualizado ? formatBR(Number(precatorio.valor_atualizado)) : "-"}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">PSS</Label>
                          <div className="text-sm font-medium">{precatorio.pss_valor ? formatBR(Number(precatorio.pss_valor)) : "-"}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">IRPF</Label>
                          <div className="text-sm font-medium">{precatorio.irpf_valor ? formatBR(Number(precatorio.irpf_valor)) : "-"}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Honorários</Label>
                          <div className="text-sm font-medium">{precatorio.honorarios_valor ? formatBR(Number(precatorio.honorarios_valor)) : "-"}</div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Saldo Líquido</Label>
                          <div className="text-sm font-bold text-green-600">{precatorio.saldo_liquido ? formatBR(Number(precatorio.saldo_liquido)) : "-"}</div>
                        </div>
                      </div>
                      <div className="space-y-1 pt-4 border-t">
                        <Label className="text-xs text-muted-foreground">Proposta Maior</Label>
                        <div className="text-lg font-bold text-foreground">
                          {precatorio.proposta_maior_valor ? formatBR(Number(precatorio.proposta_maior_valor)) : "-"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                      <CardTitle className="text-base font-semibold">Dados Bancários</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Banco</Label>
                          {isEditing ? (
                            <Input
                              value={editData.banco || ""}
                              onChange={(e) => updateEditField("banco", e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <div className="text-sm font-medium">{precatorio.banco || "-"}</div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Agência</Label>
                          {isEditing ? (
                            <Input
                              value={editData.agencia || ""}
                              onChange={(e) => updateEditField("agencia", e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <div className="text-sm">{precatorio.agencia || "-"}</div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Conta</Label>
                          {isEditing ? (
                            <Input
                              value={editData.conta || ""}
                              onChange={(e) => updateEditField("conta", e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <div className="text-sm">{precatorio.conta || "-"}</div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tipo de Conta</Label>
                          {isEditing ? (
                            <Input
                              value={editData.tipo_conta || ""}
                              onChange={(e) => updateEditField("tipo_conta", e.target.value)}
                              className="h-9"
                            />
                          ) : (
                            <div className="text-sm">{precatorio.tipo_conta || "-"}</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border shadow-sm">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-base font-semibold">Observações</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {isEditing ? (
                      <Textarea
                        value={editData.observacoes || ""}
                        onChange={(e) => updateEditField("observacoes", e.target.value)}
                        rows={4}
                        className="resize-none"
                        placeholder="Adicione observações importantes sobre o precatório..."
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {precatorio.observacoes || "Nenhuma observação registrada."}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documentos" className="mt-0">
                <ChecklistDocumentos
                  precatorioId={id}
                  canEdit={true}
                  onUpdate={loadPrecatorio}
                />
              </TabsContent>

              <TabsContent value="certidoes" className="mt-0">
                <ChecklistCertidoes
                  precatorioId={id}
                  canEdit={userRole?.includes('admin') || userRole?.includes('gestor_certidoes') || false}
                  onUpdate={loadPrecatorio}
                />
              </TabsContent>



              <TabsContent value="calculo" className="mt-0 space-y-6">
                {/* Calculadora completa para admins e operadores de cálculo */}
                {(userRole?.includes('admin') || userRole?.includes('operador_calculo')) ? (
                  <div className="space-y-6">
                    <CalculadoraPrecatorios precatorioId={id} />
                    <div className="mt-8 border-t pt-8">
                      <h3 className="text-lg font-semibold mb-4">Histórico de Versões</h3>
                      <HistoricoCalculos precatorioId={id} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Detalhamento do Cálculo
                    </h3>
                    <ResumoCalculoDetalhado precatorio={precatorio} />

                    <div className="mt-8 border-t pt-8">
                      <h3 className="text-lg font-semibold mb-4">Histórico de Versões</h3>
                      <HistoricoCalculos precatorioId={id} />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-0">
                <div className="max-w-3xl">
                  <Timeline precatorioId={id} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div >
  )
}

export default function PrecatorioDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    }>
      <PrecatorioDetailContent />
    </Suspense>
  )
}
