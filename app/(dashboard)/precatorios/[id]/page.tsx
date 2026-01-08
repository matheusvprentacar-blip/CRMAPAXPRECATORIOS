"use client"
import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Gavel,
  User,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  Save,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { PdfUploadButton } from "@/components/pdf-upload-button"
import { PdfViewerModal } from "@/components/pdf-viewer-modal"
import { Timeline } from "@/components/precatorios/timeline"
import { DocumentosSection } from "@/components/precatorios/documentos-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BotaoProcessar } from "@/components/extracao/botao-processar"

const hasValue = (v: any): boolean => v !== null && v !== undefined

export default function PrecatorioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { profile } = useAuth()
  const [precatorio, setPrecatorio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const loadPrecatorio = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("precatorios")
        .select(`
          *,
          criado_por,
          responsavel,
          responsavel_calculo_id,
          operador_calculo,
          saldo_liquido,
          data_base,
          data_expedicao,
          data_calculo,
          pss_oficio_valor,
          pss_valor,
          irpf_valor,
          honorarios_valor,
          adiantamento_valor,
          proposta_menor_valor,
          proposta_menor_percentual,
          proposta_maior_valor,
          proposta_maior_percentual
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      console.log("[v0] Precatório carregado:", data)
      console.log("[v0] Valores normalizados:", {
        saldo_liquido: data.saldo_liquido,
        data_base: data.data_base,
        data_expedicao: data.data_expedicao,
        data_calculo: data.data_calculo,
        pss_valor: data.pss_valor,
        irpf_valor: data.irpf_valor,
        proposta_menor_valor: data.proposta_menor_valor,
        proposta_maior_valor: data.proposta_maior_valor,
      })

      setPrecatorio(data)
      setEditData(data)
    } catch (error: any) {
      console.error("[v0] Erro ao carregar precatório:", error)
      toast({
        title: "Erro ao carregar precatório",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrecatorio()
  }, [id])

  async function handleSaveEdit() {
    if (!precatorio) return

    setSaving(true)
    try {
      const supabase = createClient()
      if (!supabase) {
        setError("Sistema não disponível")
        return
      }

      const updateData: any = {
        titulo: editData.titulo,
        numero_precatorio: editData.numero_precatorio,
        numero_processo: editData.numero_processo,
        numero_oficio: editData.numero_oficio,
        devedor: editData.devedor,
        credor_nome: editData.credor_nome,
        credor_cpf_cnpj: editData.credor_cpf_cnpj,
        data_base: editData.data_base,
        data_expedicao: editData.data_expedicao,
        advogado_nome: editData.advogado_nome,
        advogado_oab: editData.advogado_oab,
        contatos: editData.contatos,
        observacoes: editData.observacoes,
        updated_at: new Date().toISOString(),
      }

      if (userRole === "admin" && editData.tribunal) {
        updateData.tribunal = editData.tribunal
      }

      const { error: updateError } = await supabase.from("precatorios").update(updateData).eq("id", id)

      if (updateError) {
        setError(updateError.message)
      } else {
        setError(null)
        setIsEditing(false)
        loadPrecatorio()
      }
    } catch (err) {
      console.error("Erro ao salvar:", err)
      setError("Erro ao salvar alterações")
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (!hasValue(value)) return "R$ 0,00"
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value!)
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "—"
    const [y, m, d] = String(date).split("-")
    if (!y || !m || !d) return "—"
    return `${d}/${m}/${y}`
  }

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case "novo":
        return <Clock className="h-4 w-4" />
      case "em_andamento":
        return <AlertCircle className="h-4 w-4" />
      case "concluido":
        return <CheckCircle2 className="h-4 w-4" />
      case "cancelado":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "novo":
        return "bg-blue-100 text-blue-800"
      case "em_andamento":
        return "bg-yellow-100 text-yellow-800"
      case "concluido":
        return "bg-green-100 text-green-800"
      case "cancelado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPrioridadeColor = (prioridade: string | undefined) => {
    switch (prioridade) {
      case "urgente":
        return "bg-red-100 text-red-800"
      case "alta":
        return "bg-orange-100 text-orange-800"
      case "media":
        return "bg-yellow-100 text-yellow-800"
      case "baixa":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || notFound || !precatorio) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-2xl font-bold">Erro ao carregar precatório</h2>
        <p className="text-muted-foreground">{error || "Precatório não encontrado"}</p>
        <Button onClick={() => router.push("/precatorios")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Lista
        </Button>
      </div>
    )
  }

  const canEdit =
    profile?.role === "admin" || profile?.role === "operador_comercial" || profile?.role === "operador_calculo"

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{precatorio.titulo}</h1>
            <p className="text-muted-foreground">Detalhes completos do precatório</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
          <Badge className={getPrioridadeColor(precatorio.prioridade)}>
            {precatorio.prioridade?.toUpperCase() || "MÉDIA"}
          </Badge>
          <Badge className={getStatusColor(precatorio.status)}>
            {getStatusIcon(precatorio.status)}
            <span className="ml-1">{precatorio.status?.replace("_", " ").toUpperCase() || "NOVO"}</span>
          </Badge>
        </div>
      </div>

      {/* Tabs: Detalhes | Documentos | Timeline */}
      <Tabs defaultValue="detalhes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Tab: Detalhes */}
        <TabsContent value="detalhes" className="space-y-6 mt-6">
          {/* Documento PDF */}
          {precatorio && userRole && ["admin", "operador_comercial", "operador_calculo"].includes(userRole) && (
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documento PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <PdfUploadButton
                precatorioId={id}
                currentPdfUrl={precatorio.pdf_url}
                onUploadSuccess={loadPrecatorio}
              />

              {precatorio.pdf_url && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowPdfModal(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Visualizar PDF
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/calcular?id=${id}`)}>
                    Abrir Calculadora
                  </Button>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Tamanho máximo: 20MB. Apenas arquivos PDF. O documento ficará disponível para visualização durante o
              cálculo.
            </p>
            </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Identificação */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Identificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label>Título</Label>
                  <Input
                    value={editData.titulo || ""}
                    onChange={(e) => setEditData({ ...editData, titulo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Número do Precatório</Label>
                  <Input
                    value={editData.numero_precatorio || ""}
                    onChange={(e) => setEditData({ ...editData, numero_precatorio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Número do Processo</Label>
                  <Input
                    value={editData.numero_processo || ""}
                    onChange={(e) => setEditData({ ...editData, numero_processo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Número do Ofício</Label>
                  <Input
                    value={editData.numero_oficio || ""}
                    onChange={(e) => setEditData({ ...editData, numero_oficio: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número do Precatório</label>
                  <p className="text-base font-semibold">{precatorio.numero_precatorio || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número do Processo</label>
                  <p className="text-base">{precatorio.numero_processo || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número do Ofício</label>
                  <p className="text-base">{precatorio.numero_oficio || "—"}</p>
                </div>
              </>
            )}
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <p className="text-base">{precatorio.status?.replace(/_/g, " ") || "—"}</p>
            </div>
            </CardContent>
            </Card>

            {/* Tribunal e Devedor */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Tribunal e Devedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                {userRole === "admin" && (
                  <div>
                    <Label>Tribunal</Label>
                    <Input
                      placeholder="Ex: TJ-SP, TRF-1, TRF-2, etc"
                      value={editData.tribunal || ""}
                      onChange={(e) => setEditData({ ...editData, tribunal: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <Label>Devedor</Label>
                  <Input
                    value={editData.devedor || ""}
                    onChange={(e) => setEditData({ ...editData, devedor: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Esfera do Devedor</Label>
                  <Input
                    value={editData.esfera_devedor || ""}
                    onChange={(e) => setEditData({ ...editData, esfera_devedor: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tribunal</label>
                  <p className="text-base font-semibold">{precatorio.tribunal || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Devedor</label>
                  <p className="text-base">{precatorio.devedor || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Esfera do Devedor</label>
                  <p className="text-base">{precatorio.esfera_devedor || "—"}</p>
                </div>
              </>
            )}
            </CardContent>
            </Card>

            {/* Credor */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Credor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label>Nome do Credor</Label>
                  <Input
                    value={editData.credor_nome || ""}
                    onChange={(e) => setEditData({ ...editData, credor_nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={editData.credor_cpf_cnpj || ""}
                    onChange={(e) => setEditData({ ...editData, credor_cpf_cnpj: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cessionário</Label>
                  <Input
                    value={editData.cessionario || ""}
                    onChange={(e) => setEditData({ ...editData, cessionario: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome do Credor</label>
                  <p className="text-base font-semibold">{precatorio.credor_nome || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CPF/CNPJ</label>
                  <p className="text-base">{precatorio.credor_cpf_cnpj || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Titular Falecido</label>
                  <Badge variant={precatorio.titular_falecido ? "destructive" : "secondary"}>
                    {precatorio.titular_falecido ? "Sim" : "Não"}
                  </Badge>
                </div>
                {precatorio.cessionario && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cessionário</label>
                    <p className="text-base">{precatorio.cessionario}</p>
                  </div>
                )}
              </>
            )}
            </CardContent>
            </Card>

            {/* Advogado */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Advogado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label>Nome do Advogado</Label>
                  <Input
                    value={editData.advogado_nome || ""}
                    onChange={(e) => setEditData({ ...editData, advogado_nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={editData.advogado_cpf_cnpj || ""}
                    onChange={(e) => setEditData({ ...editData, advogado_cpf_cnpj: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome do Advogado</label>
                  <p className="text-base font-semibold">{precatorio.advogado_nome || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CPF/CNPJ</label>
                  <p className="text-base">{precatorio.advogado_cpf_cnpj || "—"}</p>
                </div>
              </>
            )}
            </CardContent>
            </Card>

            {/* Valores - SEMPRE READ-ONLY */}
            <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valores (Somente Leitura)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Valor Principal</label>
                <p className="text-2xl font-bold text-primary">
                  {hasValue(precatorio.valor_principal) ? formatCurrency(precatorio.valor_principal) : "—"}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Valor Atualizado</label>
                <p className="text-2xl font-bold text-green-600">
                  {hasValue(precatorio.valor_atualizado) ? formatCurrency(precatorio.valor_atualizado) : "—"}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Valor Líquido do Credor</label>
                <p className="text-2xl font-bold text-blue-600">
                  {hasValue(precatorio.saldo_liquido) ? formatCurrency(precatorio.saldo_liquido) : "—"}
                </p>
              </div>
            </div>
            </CardContent>
            </Card>

            {/* Datas */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Datas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <Label>Data Base</Label>
                  <Input
                    type="date"
                    value={editData.data_base || ""}
                    onChange={(e) => setEditData({ ...editData, data_base: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data de Expedição</Label>
                  <Input
                    type="date"
                    value={editData.data_expedicao || ""}
                    onChange={(e) => setEditData({ ...editData, data_expedicao: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data Base</label>
                  <p className="text-base">
                    {precatorio.data_base ? formatDate(precatorio.data_base) : "Não informada"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Expedição</label>
                  <p className="text-base">
                    {precatorio.data_expedicao ? formatDate(precatorio.data_expedicao) : "Não informada"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Cálculo</label>
                  <p className="text-base">
                    {precatorio.data_calculo ? formatDate(precatorio.data_calculo) : "Não realizado"}
                  </p>
                </div>
              </>
            )}
            </CardContent>
            </Card>

            {/* Descontos - READ-ONLY */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Descontos e Honorários (Somente Leitura)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">PSS</label>
                <p className="text-base">
                  {hasValue(precatorio.pss_valor)
                    ? precatorio.pss_valor === 0
                      ? "R$ 0,00 (Isento)"
                      : formatCurrency(precatorio.pss_valor)
                    : "Não calculado"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">IRPF</label>
                <p className="text-base">
                  {hasValue(precatorio.irpf_valor)
                    ? formatCurrency(precatorio.irpf_valor)
                    : precatorio.irpf_isento
                      ? "Isento"
                      : "Não calculado"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Honorários</label>
                <p className="text-base">
                  {hasValue(precatorio.honorarios_valor)
                    ? `${precatorio.honorarios_percentual ? precatorio.honorarios_percentual + "% - " : ""}${formatCurrency(precatorio.honorarios_valor)}`
                    : "Não informado"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Adiantamento</label>
                <p className="text-base">
                  {hasValue(precatorio.adiantamento_valor)
                    ? `${precatorio.adiantamento_percentual ? precatorio.adiantamento_percentual + "% - " : ""}${formatCurrency(precatorio.adiantamento_valor)}`
                    : "Não informado"}
                </p>
              </div>
            </div>
            </CardContent>
            </Card>

            {/* Propostas - READ-ONLY */}
            <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Faixa de Propostas (Somente Leitura)</CardTitle>
          </CardHeader>
          <CardContent>
            {hasValue(precatorio.proposta_menor_valor) || hasValue(precatorio.proposta_maior_valor) ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Proposta Menor</label>
                  <p className="text-xl font-semibold">
                    {hasValue(precatorio.proposta_menor_percentual) &&
                      `${precatorio.proposta_menor_percentual!.toFixed(2)}% - `}
                    {formatCurrency(precatorio.proposta_menor_valor)}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Proposta Maior</label>
                  <p className="text-xl font-semibold">
                    {hasValue(precatorio.proposta_maior_percentual) &&
                      `${precatorio.proposta_maior_percentual!.toFixed(2)}% - `}
                    {formatCurrency(precatorio.proposta_maior_valor)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Aguardando cálculo</p>
            )}
            </CardContent>
            </Card>

            {/* Observações */}
            {isEditing ? (
              <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editData.contatos || ""}
                onChange={(e) => setEditData({ ...editData, contatos: e.target.value })}
                rows={4}
              />
            </CardContent>
              </Card>
            ) : (
              precatorio.contatos && (
                <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{precatorio.contatos}</p>
              </CardContent>
                </Card>
              )
            )}
          </div>
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documentos" className="mt-6">
          <div className="space-y-6">
            {/* Botão de Extração com IA */}
            {canEdit && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Extração Inteligente de Dados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Use a IA para extrair automaticamente dados de documentos PDF ou imagens do precatório.
                    A IA irá identificar e preencher campos como valores, datas, nomes, CPF/CNPJ e muito mais.
                  </p>
                  <BotaoProcessar 
                    precatorioId={id}
                    onSuccess={() => {
                      toast({
                        title: "Extração concluída!",
                        description: "Os dados foram extraídos com sucesso. Recarregando página...",
                      })
                      setTimeout(() => loadPrecatorio(), 2000)
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Dica: Faça upload de um documento PDF primeiro na seção abaixo para melhores resultados.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Seção de Documentos */}
            <DocumentosSection
              precatorioId={id}
              canEdit={canEdit}
              canDelete={canEdit}
            />
          </div>
        </TabsContent>

        {/* Tab: Timeline */}
        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Linha do Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline precatorioId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PDF Viewer Modal */}
      <PdfViewerModal
        open={showPdfModal}
        onOpenChange={setShowPdfModal}
        pdfUrl={precatorio?.pdf_url}
        titulo={precatorio?.titulo || precatorio?.numero_precatorio}
      />
    </div>
  )
}
