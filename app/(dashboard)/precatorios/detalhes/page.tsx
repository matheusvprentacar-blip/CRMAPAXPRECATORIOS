"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  Save,
  X,
  Calculator,
  Scale,
  CheckSquare,
  Percent,
  Trash2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { PdfUploadButton } from "@/components/pdf-upload-button"
import { PdfViewerModal } from "@/components/pdf-viewer-modal"
import { Timeline } from "@/components/precatorios/timeline"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChecklistDocumentos } from "@/components/kanban/checklist-documentos"
import { ChecklistCertidoes } from "@/components/kanban/checklist-certidoes"
import { FormSolicitarJuridico } from "@/components/kanban/form-solicitar-juridico"
import { FormParecerJuridico } from "@/components/kanban/form-parecer-juridico"
import { FormExportarCalculo } from "@/components/kanban/form-exportar-calculo"
import { FormInteresse } from "@/components/kanban/form-interesse"
import { HistoricoCalculos } from "@/components/kanban/historico-calculos"
import CalculadoraPrecatorios from "@/components/calculador-precatorios"
import { ResumoCalculoDetalhado } from "@/components/precatorios/resumo-calculo-detalhado"

import { AbaProposta } from "@/components/kanban/aba-proposta"
import { buscarCEP, formatarCEP } from "@/lib/utils/cep"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hasValue = (v: any): boolean => v !== null && v !== undefined

/* ======================================================
   SUPABASE SAFE HELPER (resolve "supabase is possibly null")
====================================================== */
type SupabaseClientType = NonNullable<ReturnType<typeof createClient>>

function requireSupabase(): SupabaseClientType {
  const supabase = createClient()
  if (!supabase) {
    throw new Error("Supabase não disponível. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }
  return supabase
}

/**
 * ✅ Versão compatível com `output: "export"`:
 * - Remove rota dinâmica `/precatorios/[id]`
 * - Usa querystring: `/precatorios/detalhes?id=<UUID>`
 */
export default function PrecatorioDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()

  const id = searchParams.get("id") || ""

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [precatorio, setPrecatorio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editData, setEditData] = useState<any>({})
  const [userRole, setUserRole] = useState<string[] | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState("detalhes")

  const loadPrecatorio = async () => {
    if (!id) return

    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const supabase = requireSupabase()

      const { data, error } = await supabase
        .from("precatorios")
        .select(
          `
          *,
          criado_por,
          responsavel,
          responsavel_calculo_id,
          operador_calculo,
          saldo_liquido,
          data_base,
          calculo_ultima_versao,
          dados_calculo,
          data_expedicao,
          pss_oficio_valor,
          pss_valor,
          irpf_valor,
          honorarios_valor,
          adiantamento_valor,
          proposta_menor_valor,
          proposta_menor_percentual,
          proposta_maior_valor,
          proposta_maior_percentual
        `,
        )
        .eq("id", id)
        .single()

      if (error) {
        // Se quiser tratar "não encontrado" especificamente:
        // if ((error as any)?.code === "PGRST116") setNotFound(true)
        throw error
      }

      setPrecatorio(data)
      setEditData(data)

      // define userRole a partir do profile (evita ficar null)
      setUserRole(profile?.role ?? null)

      setNotFound(false)
      setError(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("[v0] Erro ao carregar precatório:", err)
      setError(err?.message || "Erro ao carregar precatório")

      toast({
        title: "Erro ao carregar precatório",
        description: err?.message || "Não foi possível carregar",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Se não veio id na URL, não tem o que carregar.
    if (!id) {
      // Em alguns casos o searchParams pode vir vazio no 1º render.
      // Não marque erro aqui para não bloquear a renderização quando o id aparecer.
      setLoading(false)
      setNotFound(false)
      return
    }

    loadPrecatorio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    // mantém userRole sincronizado com profile (caso o profile carregue depois)
    setUserRole(profile?.role ?? null)
  }, [profile])

  async function handleSaveEdit() {
    if (!precatorio || !id) return

    setSaving(true)
    try {
      const supabase = requireSupabase()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        titulo: editData.titulo,
        numero_precatorio: editData.numero_precatorio,
        numero_processo: editData.numero_processo,
        numero_oficio: editData.numero_oficio,
        devedor: editData.devedor,
        esfera_devedor: editData.esfera_devedor,
        credor_nome: editData.credor_nome,
        credor_cpf_cnpj: editData.credor_cpf_cnpj,
        credor_cep: editData.credor_cep, // Added
        credor_cidade: editData.credor_cidade, // Added
        credor_uf: editData.credor_uf, // Added
        credor_endereco: editData.credor_endereco, // Added
        credor_telefone: editData.credor_telefone, // Added
        credor_email: editData.credor_email, // Added
        data_base: editData.data_base,
        data_expedicao: editData.data_expedicao,
        advogado_nome: editData.advogado_nome,
        advogado_cpf_cnpj: editData.advogado_cpf_cnpj,
        advogado_oab: editData.advogado_oab,
        advogado_telefone: editData.advogado_telefone,
        titular_falecido: editData.titular_falecido,
        herdeiro: editData.herdeiro,
        herdeiro_cpf: editData.herdeiro_cpf,
        herdeiro_telefone: editData.herdeiro_telefone,
        herdeiro_endereco: editData.herdeiro_endereco,
        cessionario: editData.cessionario,
        contatos: editData.contatos,
        observacoes: editData.observacoes,
        banco: editData.banco,
        agencia: editData.agencia,
        conta: editData.conta,
        tipo_conta: editData.tipo_conta,
        chave_pix: editData.chave_pix,
        tipo_chave_pix: editData.tipo_chave_pix,
        observacoes_bancarias: editData.observacoes_bancarias,
        updated_at: new Date().toISOString(),
      }

      if (userRole && userRole.includes("admin") && editData.tribunal) {
        updateData.tribunal = editData.tribunal
      }

      const { error: updateError } = await supabase.from("precatorios").update(updateData).eq("id", id)

      if (updateError) {
        setError(updateError.message)
        toast({
          title: "Erro ao salvar",
          description: updateError.message,
          variant: "destructive",
        })
      } else {
        setError(null)
        setIsEditing(false)
        await loadPrecatorio()
        toast({
          title: "Salvo com sucesso",
          description: "Alterações atualizadas no precatório",
        })
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Erro ao salvar:", err)
      setError(err?.message || "Erro ao salvar alterações")
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Erro ao salvar alterações",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const formattedValue = formatarCEP(rawValue)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEditData((prev: any) => ({ ...prev, credor_cep: formattedValue }))

    const cleanCep = rawValue.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      toast({
        title: "Buscando CEP...",
        description: "Aguarde um momento",
      })

      try {
        const data = await buscarCEP(cleanCep)
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setEditData((prev: any) => ({
            ...prev,
            credor_endereco: `${data.logradouro}${data.bairro ? ', ' + data.bairro : ''}`,
            credor_cidade: data.localidade,
            credor_uf: data.uf,
          }))
          toast({
            title: "Endereço encontrado!",
            description: `${data.localidade} - ${data.uf}`,
          })
        } else {
          toast({
            title: "CEP não encontrado",
            description: "Verifique o número digitado",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error(error)
        toast({
          title: "Erro na busca",
          description: "Não foi possível consultar o CEP",
          variant: "destructive"
        })
      }
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

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] space-y-2 px-4">
        <p className="text-sm text-muted-foreground">Nenhum ID informado na URL.</p>
        <p className="text-xs text-muted-foreground">Abra pela lista ou use: /precatorios/detalhes?id=&lt;UUID&gt;</p>
        <button
          type="button"
          onClick={() => router.push("/precatorios")}
          className="mt-2 px-4 py-2 rounded bg-primary text-primary-foreground"
        >
          Voltar para lista
        </button>
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

  if ((error || notFound) && !precatorio) {
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
    (profile?.role?.includes("admin") ||
      profile?.role?.includes("operador_comercial") ||
      profile?.role?.includes("operador_calculo")) ?? false

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b pb-6">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 hover:bg-muted/50 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {precatorio.titulo}
              </h1>
              <Badge className={getPrioridadeColor(precatorio.prioridade)}>
                {precatorio.prioridade?.toUpperCase() || "MÉDIA"}
              </Badge>
              <Badge className={getStatusColor(precatorio.status)}>
                {getStatusIcon(precatorio.status)}
                <span className="ml-1">{precatorio.status?.replace("_", " ").toUpperCase() || "NOVO"}</span>
              </Badge>
            </div>
            <p className="text-muted-foreground">Dados essenciais do precatório</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && !isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="shadow-sm">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving} size="sm" className="shadow-sm">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Layout Consolidado */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b mb-6">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            <TabsTrigger
              value="detalhes"
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
              value="juridico"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-primary transition-all hover:text-foreground"
            >
              <Scale className="h-4 w-4 mr-2" />
              Jurídico
            </TabsTrigger>
            <TabsTrigger
              value="calculo"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-primary transition-all hover:text-foreground"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Cálculo
            </TabsTrigger>
            <TabsTrigger
              value="propostas"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-primary transition-all hover:text-foreground"
            >
              <Percent className="h-4 w-4 mr-2" />
              Propostas
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

        {/* Tab: Detalhes */}
        <TabsContent value="detalhes" className="space-y-6">
          {/* Documento PDF - Exibe sempre para debug (e fallback) */}
          {precatorio && userRole && (
            userRole.includes("admin") ||
            userRole.includes("operador_comercial") ||
            userRole.includes("operador_calculo")
          ) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documento PDF
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <PdfUploadButton precatorioId={id} currentPdfUrl={precatorio.pdf_url} onUploadSuccess={loadPrecatorio} />

                    {precatorio.pdf_url && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setShowPdfModal(true)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Visualizar PDF
                        </Button>
                        {!userRole.includes("operador_comercial") && (
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/calcular?id=${id}`)}>
                            Abrir Calculadora
                          </Button>
                        )}
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

          {/* Triagem / Interesse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Triagem & Interesse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormInteresse
                precatorioId={id}
                precatorio={precatorio}
                onUpdate={loadPrecatorio}
              />
            </CardContent>
          </Card>

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
                      <Input value={editData.titulo || ""} onChange={(e) => setEditData({ ...editData, titulo: e.target.value })} />
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
                      <Input value={editData.numero_processo || ""} onChange={(e) => setEditData({ ...editData, numero_processo: e.target.value })} />
                    </div>
                    <div>
                      <Label>Número do Ofício</Label>
                      <Input value={editData.numero_oficio || ""} onChange={(e) => setEditData({ ...editData, numero_oficio: e.target.value })} />
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

            {/* Dados Bancários */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Dados Bancários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Banco</Label>
                        <Input
                          placeholder="Ex: Banco do Brasil"
                          value={editData.banco || ""}
                          onChange={(e) => setEditData({ ...editData, banco: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Tipo de Conta</Label>
                        <Select
                          value={editData.tipo_conta || "corrente"}
                          onValueChange={(value) => setEditData({ ...editData, tipo_conta: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corrente">Conta Corrente</SelectItem>
                            <SelectItem value="poupanca">Conta Poupança</SelectItem>
                            <SelectItem value="pagamento">Conta de Pagamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Agência</Label>
                        <Input
                          placeholder="Sem dígito"
                          value={editData.agencia || ""}
                          onChange={(e) => setEditData({ ...editData, agencia: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Conta</Label>
                        <Input
                          placeholder="Com dígito"
                          value={editData.conta || ""}
                          onChange={(e) => setEditData({ ...editData, conta: e.target.value })}
                        />
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo Chave PIX</Label>
                        <Select
                          value={editData.tipo_chave_pix || "cpf"}
                          onValueChange={(value) => setEditData({ ...editData, tipo_chave_pix: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cpf">CPF/CNPJ</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="telefone">Telefone</SelectItem>
                            <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Chave PIX</Label>
                        <Input
                          value={editData.chave_pix || ""}
                          onChange={(e) => setEditData({ ...editData, chave_pix: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Observações Bancárias</Label>
                      <Textarea
                        value={editData.observacoes_bancarias || ""}
                        onChange={(e) => setEditData({ ...editData, observacoes_bancarias: e.target.value })}
                        placeholder="Ex: Pagamento somente em nome do titular..."
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Banco</label>
                        <p className="text-base">{precatorio.banco || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                        <p className="text-base capitalize">{precatorio.tipo_conta || "—"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Agência</label>
                        <p className="text-base">{precatorio.agencia || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Conta</label>
                        <p className="text-base">{precatorio.conta || "—"}</p>
                      </div>
                    </div>
                    {precatorio.chave_pix && (
                      <div className="bg-muted/30 p-3 rounded-md border mt-2">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <ExternalLink className="h-3 w-3" /> PIX ({precatorio.tipo_chave_pix || "Chave"})
                        </label>
                        <p className="text-base font-mono mt-1 select-all">{precatorio.chave_pix}</p>
                      </div>
                    )}
                    {precatorio.observacoes_bancarias && (
                      <div className="mt-2">
                        <label className="text-sm font-medium text-muted-foreground">Observações</label>
                        <p className="text-sm mt-1">{precatorio.observacoes_bancarias}</p>
                      </div>
                    )}
                  </>
                )}
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
                    {userRole?.includes("admin") && (
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
                      <Input value={editData.devedor || ""} onChange={(e) => setEditData({ ...editData, devedor: e.target.value })} />
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
                      <Input value={editData.credor_nome || ""} onChange={(e) => setEditData({ ...editData, credor_nome: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CPF/CNPJ</Label>
                        <Input
                          value={editData.credor_cpf_cnpj || ""}
                          onChange={(e) => setEditData({ ...editData, credor_cpf_cnpj: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input value={editData.credor_telefone || ""} onChange={(e) => setEditData({ ...editData, credor_telefone: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={editData.credor_email || ""} onChange={(e) => setEditData({ ...editData, credor_email: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>CEP</Label>
                        <Input
                          value={editData.credor_cep || ""}
                          onChange={handleCepChange}
                          placeholder="00000-000"
                          maxLength={9}
                        />
                      </div>
                      <div>
                        <Label>Cidade</Label>
                        <Input value={editData.credor_cidade || ""} onChange={(e) => setEditData({ ...editData, credor_cidade: e.target.value })} />
                      </div>
                      <div>
                        <Label>UF</Label>
                        <Input value={editData.credor_uf || ""} onChange={(e) => setEditData({ ...editData, credor_uf: e.target.value })} maxLength={2} />
                      </div>
                    </div>
                    <div>
                      <Label>Endereço</Label>
                      <Input value={editData.credor_endereco || ""} onChange={(e) => setEditData({ ...editData, credor_endereco: e.target.value })} />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="titular-falecido"
                        checked={editData.titular_falecido || false}
                        onCheckedChange={(checked) => setEditData({ ...editData, titular_falecido: checked })}
                      />
                      <Label htmlFor="titular-falecido">Titular Falecido?</Label>
                    </div>

                    {editData.titular_falecido && (
                      <div className="bg-muted/30 p-4 rounded-md space-y-4 border mt-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Dados de Sucessão
                        </h4>
                        <div>
                          <Label>Herdeiro</Label>
                          <Input
                            value={editData.herdeiro || ""}
                            onChange={(e) => setEditData({ ...editData, herdeiro: e.target.value })}
                            placeholder="Nome do herdeiro"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>CPF do Herdeiro</Label>
                            <Input
                              value={editData.herdeiro_cpf || ""}
                              onChange={(e) => setEditData({ ...editData, herdeiro_cpf: e.target.value })}
                              placeholder="CPF"
                            />
                          </div>
                          <div>
                            <Label>Telefone do Herdeiro</Label>
                            <Input
                              value={editData.herdeiro_telefone || ""}
                              onChange={(e) => setEditData({ ...editData, herdeiro_telefone: e.target.value })}
                              placeholder="Telefone"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Endereço do Herdeiro</Label>
                          <Input
                            value={editData.herdeiro_endereco || ""}
                            onChange={(e) => setEditData({ ...editData, herdeiro_endereco: e.target.value })}
                            placeholder="Endereço completo"
                          />
                        </div>
                        <div>
                          <Label>Cessionário</Label>
                          <Input
                            value={editData.cessionario || ""}
                            onChange={(e) => setEditData({ ...editData, cessionario: e.target.value })}
                            placeholder="Nome do cessionário"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome do Credor</label>
                      <p className="text-base font-semibold">{precatorio.credor_nome || "—"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">CPF/CNPJ</label>
                        <p className="text-base">{precatorio.credor_cpf_cnpj || "—"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                        <p className="text-base">{precatorio.credor_telefone || "—"}</p>
                      </div>
                    </div>
                    {precatorio.credor_email && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-base">{precatorio.credor_email}</p>
                      </div>
                    )}
                    {(precatorio.credor_cidade || precatorio.credor_uf) && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Localização</label>
                        <p className="text-base">
                          {precatorio.credor_cidade ? precatorio.credor_cidade : ""}
                          {precatorio.credor_cidade && precatorio.credor_uf ? " - " : ""}
                          {precatorio.credor_uf ? precatorio.credor_uf : ""}
                          {precatorio.credor_cep ? ` (${precatorio.credor_cep})` : ""}
                        </p>
                      </div>
                    )}
                    {precatorio.credor_endereco && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                        <p className="text-base">{precatorio.credor_endereco}</p>
                      </div>
                    )}

                    <Separator className="my-2" />

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Titular Falecido</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={precatorio.titular_falecido ? "destructive" : "outline"}>
                          {precatorio.titular_falecido ? "Sim" : "Não"}
                        </Badge>
                      </div>
                    </div>

                    {precatorio.titular_falecido && (
                      <div className="bg-muted/30 p-3 rounded-md space-y-3 border text-sm">
                        {precatorio.herdeiro && (
                          <div className="space-y-2">
                            <div>
                              <label className="font-medium text-muted-foreground block text-xs uppercase">Herdeiro</label>
                              <p className="font-medium">{precatorio.herdeiro}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              {precatorio.herdeiro_cpf && (
                                <div>
                                  <span className="text-muted-foreground">CPF: </span>
                                  {precatorio.herdeiro_cpf}
                                </div>
                              )}
                              {precatorio.herdeiro_telefone && (
                                <div>
                                  <span className="text-muted-foreground">Tel: </span>
                                  {precatorio.herdeiro_telefone}
                                </div>
                              )}
                            </div>
                            {precatorio.herdeiro_endereco && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Endereço: </span>
                                {precatorio.herdeiro_endereco}
                              </div>
                            )}
                          </div>
                        )}
                        {precatorio.cessionario && (
                          <div>
                            <label className="font-medium text-muted-foreground block text-xs uppercase">Cessionário</label>
                            <p className="font-medium">{precatorio.cessionario}</p>
                          </div>
                        )}
                        {!precatorio.herdeiro && !precatorio.cessionario && (
                          <p className="text-muted-foreground italic">Nenhum dado de sucessão informado.</p>
                        )}
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
                      <Input value={editData.advogado_nome || ""} onChange={(e) => setEditData({ ...editData, advogado_nome: e.target.value })} />
                    </div>
                    <div>
                      <Label>CPF/CNPJ</Label>
                      <Input
                        value={editData.advogado_cpf_cnpj || ""}
                        onChange={(e) => setEditData({ ...editData, advogado_cpf_cnpj: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>OAB</Label>
                      <Input value={editData.advogado_oab || ""} onChange={(e) => setEditData({ ...editData, advogado_oab: e.target.value })} />
                    </div>
                    <div>
                      <Label>Telefone / Contato</Label>
                      <Input value={editData.advogado_telefone || ""} onChange={(e) => setEditData({ ...editData, advogado_telefone: e.target.value })} />
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
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">OAB</label>
                      <p className="text-base">{precatorio.advogado_oab || "—"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                      <p className="text-base">{precatorio.advogado_telefone || "—"}</p>
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
                  Valores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Valor Principal</label>
                    <p className="text-lg font-semibold text-foreground">
                      {hasValue(precatorio.valor_principal) ? formatCurrency(precatorio.valor_principal) : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Valor Atualizado</label>
                    <p className="text-lg font-bold text-foreground">
                      {hasValue(precatorio.valor_atualizado) ? formatCurrency(precatorio.valor_atualizado) : "—"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">PSS</label>
                    <p className="text-base text-foreground">
                      {hasValue(precatorio.pss_valor)
                        ? precatorio.pss_valor === 0
                          ? "Isento"
                          : formatCurrency(precatorio.pss_valor)
                        : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">IRPF</label>
                    <p className="text-base text-foreground">
                      {hasValue(precatorio.irpf_valor)
                        ? formatCurrency(precatorio.irpf_valor)
                        : precatorio.irpf_isento
                          ? "Isento"
                          : "—"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Honorários</label>
                    <p className="text-base text-foreground">
                      {hasValue(precatorio.honorarios_valor)
                        ? formatCurrency(precatorio.honorarios_valor)
                        : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Saldo Líquido</label>
                    <p className="text-xl font-bold text-green-600">
                      {hasValue(precatorio.saldo_liquido) ? formatCurrency(precatorio.saldo_liquido) : "—"}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Proposta Maior</label>
                  <p className="text-xl font-bold text-foreground">
                    {hasValue(precatorio.proposta_maior_valor) ? formatCurrency(precatorio.proposta_maior_valor) : "—"}
                  </p>
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
                      <Input type="date" value={editData.data_base || ""} onChange={(e) => setEditData({ ...editData, data_base: e.target.value })} />
                    </div>
                    <div>
                      <Label>Data de Expedição</Label>
                      <Input type="date" value={editData.data_expedicao || ""} onChange={(e) => setEditData({ ...editData, data_expedicao: e.target.value })} />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data Base</label>
                      <p className="text-base">{precatorio.data_base ? formatDate(precatorio.data_base) : "Não informada"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Expedição</label>
                      <p className="text-base">{precatorio.data_expedicao ? formatDate(precatorio.data_expedicao) : "Não informada"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Cálculo</label>
                      <p className="text-base">{precatorio.data_calculo ? formatDate(precatorio.data_calculo) : "Não realizado"}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>



            {/* Propostas - REMOVIDO (User Request) */}

            {/* Observações */}
            {isEditing ? (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea value={editData.contatos || ""} onChange={(e) => setEditData({ ...editData, contatos: e.target.value })} rows={4} />
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
        <TabsContent value="documentos" className="mt-0">
          <ChecklistDocumentos
            precatorioId={id}
            canEdit={canEdit}
            onUpdate={loadPrecatorio}
          />
        </TabsContent>

        {/* Tab: Certidões */}
        <TabsContent value="certidoes" className="mt-0">
          <ChecklistCertidoes
            precatorioId={id}
            canEdit={(userRole?.includes("admin") || userRole?.includes("gestor_certidoes")) ?? false}
            onUpdate={loadPrecatorio}
          />
        </TabsContent>

        {/* Tab: Jurídico */}
        <TabsContent value="juridico" className="mt-0 space-y-6">
          <div className="max-w-4xl">
            {precatorio.status_kanban === "analise_juridica" ? (
              // Se está em análise: Jurídico/Admin vê formulário de parecer, Outros veem aviso
              (userRole?.includes('admin') || userRole?.includes('juridico')) ? (
                <FormParecerJuridico
                  precatorioId={id}
                  precatorio={precatorio}
                  onUpdate={loadPrecatorio}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <Scale className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">Precatório em Análise Jurídica</p>
                    <p className="text-sm mt-1">Aguardando emissão de parecer pelo setor responsável.</p>
                  </CardContent>
                </Card>
              )
            ) : (
              // Se NÃO está em análise: Admin/Operadores podem solicitar. Jurídico vê aviso.
              (userRole?.includes('juridico') && !userRole?.includes('admin')) ? (
                <Card>
                  <CardContent className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <CheckSquare className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">Sem pendências jurídicas</p>
                    <p className="text-sm mt-1">Nenhuma solicitação de análise em aberto para este precatório.</p>
                  </CardContent>
                </Card>
              ) : (
                <FormSolicitarJuridico
                  precatorioId={id}
                  onUpdate={loadPrecatorio}
                />
              )
            )}
          </div>
        </TabsContent>

        {/* Tab: Cálculo */}
        <TabsContent value="calculo" className="mt-0 space-y-6">
          {/* Calculadora completa para admins e operadores de cálculo */}
          {(userRole?.includes('admin') || userRole?.includes('operador_calculo')) ? (
            <div className="space-y-6">
              <CalculadoraPrecatorios precatorioId={id} onUpdate={loadPrecatorio} />
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

        {/* Tab: Propostas */}
        <TabsContent value="propostas" className="mt-0">
          <AbaProposta
            precatorioId={id}
            precatorio={precatorio}
            onUpdate={loadPrecatorio}
            userRole={userRole && userRole.length > 0 ? userRole[0] : null}
          />
        </TabsContent>

        {/* Tab: Timeline */}
        <TabsContent value="timeline" className="mt-0">
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
      </Tabs >

      {/* Modal de PDF */}
      < PdfViewerModal
        open={showPdfModal}
        onOpenChange={setShowPdfModal}
        pdfUrl={precatorio?.pdf_url}
        titulo={precatorio?.titulo}
        precatorioId={id}
        canCalculate={userRole ? !userRole.includes("operador_comercial") : false}
      />
    </div >
  )
}
