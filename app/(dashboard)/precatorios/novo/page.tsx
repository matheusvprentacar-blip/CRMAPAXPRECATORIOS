"use client"
/* eslint-disable */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import { ArrowLeft, Save, CheckCircle2, User, Users, FileText, Wallet, Sparkles, AlertCircle, ChevronRight, ChevronLeft, Trash2, Plus } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { savePrecatorio } from "@/lib/storage/local-storage"
import type { Precatorio } from "@/lib/types/database"
import { ModalImportarPrecatorio } from "@/components/admin/modal-importar-precatorio"
import { toast } from "sonner"
import { maskCNPJ, maskCPF, maskProcesso } from "@/lib/masks"
import { cn } from "@/lib/utils"
import { PDFViewer } from "@/components/pdf-viewer"

const STEPS = [
  { id: 1, title: "Dados Básicos", icon: FileText, description: "Informações do processo" },
  { id: 2, title: "Credor", icon: User, description: "Dados do beneficiário" },
  { id: 3, title: "Valores", icon: Wallet, description: "Valores e datas" },
  { id: 4, title: "Revisão", icon: CheckCircle2, description: "Confirmação final" },
]

export default function NovoPrecatorioPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [herdeiros, setHerdeiros] = useState<Array<{
    nome_completo: string
    cpf: string
    endereco: string
    telefone: string
  }>>([])

  const [formData, setFormData] = useState<Partial<Precatorio>>({
    status: "novo",
    prioridade: "media",
    tribunal: "",
    natureza: "Comum"
  })

  useEffect(() => {
    async function loadUserRole() {
      const supabase = getSupabase()
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
          const { data: perfil } = await supabase.from("usuarios").select("role").eq("id", userData.user.id).single()
          setUserRole(perfil?.role || null)
        }
      }
    }
    loadUserRole()
  }, [])

  const handleNext = () => {
    // Basic validation per step
    if (currentStep === 1) {
      if (!formData.titulo || !formData.numero_precatorio) {
        toast.error("Preencha o Título e o Número do Precatório")
        return
      }
    }
    if (currentStep === 2) {
      if (!formData.credor_nome || !formData.credor_cpf_cnpj) {
        toast.error("Preencha o Nome e CPF/CNPJ do Credor")
        return
      }
    }
    if (currentStep === 3) {
      if (!formData.valor_principal) {
        toast.error("Informe o Valor Principal")
        return
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleAiExtracted = (data: any) => {
    console.log("🤖 AI Data Received:", data)

    // Count defined keys
    const keysFound = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== "").length

    setFormData((prev) => ({
      ...prev,
      titulo: `Precatório ${(data.credor_nome?.split(' ')[0] || '').toUpperCase()} - ${(data.numero_precatorio || '').toUpperCase()}`,
      credor_nome: data.credor_nome?.toUpperCase(),
      credor_cpf_cnpj: data.credor_cpf_cnpj,
      credor_telefone: data.credor_telefone || prev.credor_telefone,
      valor_principal: data.valor_principal || prev.valor_principal,
      numero_precatorio: data.numero_precatorio?.toUpperCase(),
      numero_processo: data.numero_processo?.toUpperCase(),
      tribunal: data.tribunal?.toUpperCase(),
      natureza: (data.natureza?.toUpperCase().includes("ALIMENTAR") ? "Alimentar" : "Comum"),
      devedor: (data.devedor || prev.devedor)?.toUpperCase(),
      contatos: data.raw_text ? [data.raw_text.toUpperCase()] : (prev.contatos || []),
      pdf_url: data.file_url || prev.pdf_url,
    }))
    setAiModalOpen(false)
    toast.success(`Dados preenchidos! ${keysFound} campos identificados.`)
  }

  async function handleSubmit() {
    setSaving(true)
    const supabase = getSupabase()

    try {
      let currentUserId: string | undefined

      const herdeirosComDados = herdeiros.filter((h) =>
        [h.nome_completo, h.cpf, h.endereco, h.telefone].some((v) => v && v.trim().length > 0)
      )
      const herdeirosInvalidos = herdeirosComDados.filter((h) => !h.nome_completo?.trim())
      if (herdeirosInvalidos.length > 0) {
        toast.error("Preencha o nome de todos os herdeiros informados.")
        setSaving(false)
        return
      }

      if (supabase) {
        if (!currentUserId) {
          const { data: userData } = await supabase.auth.getUser()
          currentUserId = userData.user?.id
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const precatorioData: any = {
          ...formData, // Spread all form data
          criado_por: currentUserId,
          responsavel: currentUserId,
          dono_usuario_id: currentUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const { data: inserted, error } = await supabase
          .from("precatorios")
          .insert([precatorioData])
          .select("id")
        if (error) throw error

        const precatorioId = inserted?.[0]?.id
        if (precatorioId && herdeirosComDados.length > 0) {
          const herdeirosPayload = herdeirosComDados.map((h) => ({
            precatorio_id: precatorioId,
            nome_completo: h.nome_completo.trim().toUpperCase(),
            cpf: h.cpf?.trim() || null,
            telefone: h.telefone?.trim() || null,
            endereco: h.endereco?.trim() || null,
            percentual_participacao: 0,
          }))

          const { error: herdeirosError } = await supabase
            .from("precatorio_herdeiros")
            .insert(herdeirosPayload)

          if (herdeirosError) throw herdeirosError
        }
      } else {
        savePrecatorio(formData as Precatorio)
      }

      toast.success("Precatório salvo com sucesso!")
      router.push("/precatorios")
    } catch (error: any) {
      console.error("[Novo Precatorio] Erro Detalhado:", JSON.stringify(error, null, 2))
      console.error("Objeto erro full:", error)
      const msg = error?.message || (typeof error === 'string' ? error : "Erro desconhecido ao salvar")
      toast.error(`Erro: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Novo Precatório</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados do novo ativo judicial</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800"
            onClick={() => setAiModalOpen(true)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Preencher com IA
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-10" />
        <div className="flex justify-between">
          {STEPS.map((step) => {
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            const Icon = step.icon

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isActive ? "border-primary bg-primary text-primary-foreground scale-110 shadow-md" :
                      isCompleted ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground bg-background"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="text-center">
                  <p className={cn("text-sm font-medium", isActive ? "text-primary" : "text-muted-foreground")}>{step.title}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Form Content Wrapper with Global Split View */}
      <div className={cn("grid gap-8", formData.pdf_url ? "lg:grid-cols-2" : "")}>

        {/* Left Column: Form Steps + Navigation */}
        <div className="flex flex-col gap-6">
          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <div className="grid gap-6 slide-in-from-right-4 animate-in duration-300">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-500" /> Dados do Processo</CardTitle>
                    <CardDescription>Identificação jurídica do ativo</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Título Interno *</Label>
                      <Input
                        placeholder="Ex: Precatório Silva vs Estado"
                        value={formData.titulo || ""}
                        onChange={e => setFormData({ ...formData, titulo: e.target.value.toUpperCase() })}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número do Precatório *</Label>
                      <Input
                        placeholder="0000000-00.0000.0.00.0000"
                        value={formData.numero_precatorio || ""}
                        onChange={e => setFormData({ ...formData, numero_precatorio: maskProcesso(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número do Processo Originário</Label>
                      <Input
                        placeholder="0000000-00.0000.0.00.0000"
                        value={formData.numero_processo || ""}
                        onChange={e => setFormData({ ...formData, numero_processo: maskProcesso(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número do Ofício Requisitório</Label>
                      <Input
                        placeholder="00000/202X"
                        value={formData.numero_oficio || ""}
                        onChange={e => setFormData({ ...formData, numero_oficio: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vara de origem</Label>
                      <Input
                        placeholder="Ex: 2ª Vara Cível"
                        value={formData.tribunal || ""}
                        onChange={e => setFormData({ ...formData, tribunal: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ente Devedor (Réu)</Label>
                      <Input
                        placeholder="Ex: Fazenda do Estado de São Paulo"
                        value={formData.devedor || ""}
                        onChange={e => setFormData({ ...formData, devedor: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid gap-6 slide-in-from-right-4 animate-in duration-300">
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-green-500" /> Beneficiário</CardTitle>
                    <CardDescription>Dados de quem receberá o pagamento (Credor)</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        placeholder="Nome do credor"
                        value={formData.credor_nome || ""}
                        onChange={e => setFormData({ ...formData, credor_nome: e.target.value.toUpperCase() })}
                        autoFocus
                      />
                    </div>
                      <div className="space-y-2">
                        <Label>CPF / CNPJ *</Label>
                        <Input
                          placeholder="000.000.000-00"
                          value={formData.credor_cpf_cnpj || ""}
                          onChange={e => {
                            const val = e.target.value
                            setFormData({ ...formData, credor_cpf_cnpj: val.length > 14 ? maskCNPJ(val) : maskCPF(val) })
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input
                          placeholder="(00) 00000-0000"
                          value={formData.credor_telefone || ""}
                          onChange={e => setFormData({ ...formData, credor_telefone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input
                          placeholder="Cidade"
                          value={formData.credor_cidade || ""}
                        onChange={e => setFormData({ ...formData, credor_cidade: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado (UF)</Label>
                      <Input
                        placeholder="SP"
                        maxLength={2}
                        value={formData.credor_uf || ""}
                        onChange={e => setFormData({ ...formData, credor_uf: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-500" /> Herdeiros</CardTitle>
                    <CardDescription>Informe os herdeiros para o rateio do crédito</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {herdeiros.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Nenhum herdeiro adicionado.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {herdeiros.map((herdeiro, index) => (
                          <div key={index} className="relative grid md:grid-cols-2 gap-4 border rounded-lg p-4">
                            <div className="space-y-2 md:col-span-2">
                              <Label>Nome Completo</Label>
                              <Input
                                placeholder="Nome do herdeiro"
                                value={herdeiro.nome_completo}
                                onChange={(e) => {
                                  const updated = [...herdeiros]
                                  updated[index] = { ...updated[index], nome_completo: e.target.value.toUpperCase() }
                                  setHerdeiros(updated)
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>CPF</Label>
                              <Input
                                placeholder="000.000.000-00"
                                value={herdeiro.cpf}
                                onChange={(e) => {
                                  const updated = [...herdeiros]
                                  updated[index] = { ...updated[index], cpf: maskCPF(e.target.value) }
                                  setHerdeiros(updated)
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Telefone</Label>
                              <Input
                                placeholder="(00) 00000-0000"
                                value={herdeiro.telefone}
                                onChange={(e) => {
                                  const updated = [...herdeiros]
                                  updated[index] = { ...updated[index], telefone: e.target.value }
                                  setHerdeiros(updated)
                                }}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Endereço</Label>
                              <Input
                                placeholder="Rua, número, bairro, cidade/UF"
                                value={herdeiro.endereco}
                                onChange={(e) => {
                                  const updated = [...herdeiros]
                                  updated[index] = { ...updated[index], endereco: e.target.value.toUpperCase() }
                                  setHerdeiros(updated)
                                }}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-3 right-3 text-muted-foreground hover:text-red-600"
                              onClick={() => {
                                const updated = herdeiros.filter((_, i) => i !== index)
                                setHerdeiros(updated)
                              }}
                              aria-label="Remover herdeiro"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() =>
                        setHerdeiros((prev) => [
                          ...prev,
                          { nome_completo: "", cpf: "", endereco: "", telefone: "" },
                        ])
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar herdeiro
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid gap-6 slide-in-from-right-4 animate-in duration-300">
                <Card className="border-l-4 border-l-yellow-500 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-yellow-500" /> Valores e Datas</CardTitle>
                    <CardDescription>Informações financeiras do ativo</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="space-y-2">
                      <Label className="text-lg">Valor Principal *</Label>
                      <CurrencyInput
                        className="text-lg font-semibold h-12"
                        value={formData.valor_principal || 0}
                        onChange={val => setFormData({ ...formData, valor_principal: val })}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">Valor de face original</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data Base (Cálculo)</Label>
                        <Input
                          type="date"
                          value={formData.data_base || ""}
                          onChange={e => setFormData({ ...formData, data_base: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Expedição</Label>
                        <Input
                          type="date"
                          value={formData.data_expedicao || ""}
                          onChange={e => setFormData({ ...formData, data_expedicao: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Anotações importantes..."
                      rows={4}
                      value={Array.isArray(formData.contatos) ? formData.contatos.join('\n') : ""}
                      onChange={e => setFormData({ ...formData, contatos: e.target.value.toUpperCase().split('\n') })}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6 slide-in-from-right-4 animate-in duration-300">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg">Quase lá!</h3>
                    <p className="text-muted-foreground">Revise os dados abaixo antes de cadastrar o precatório.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Processo</CardTitle></CardHeader>
                    <CardContent>
                      <p className="font-semibold text-lg">{formData.titulo}</p>
                      <p className="text-sm">Precatório: {formData.numero_precatorio}</p>
                      <p className="text-sm">Vara de origem: {formData.tribunal}</p>
                      <p className="text-sm">Devedor: {formData.devedor}</p>
                    </CardContent>
                  </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Credor</CardTitle></CardHeader>
                      <CardContent>
                        <p className="font-semibold text-lg">{formData.credor_nome}</p>
                        <p className="text-sm">CPF/CNPJ: {formData.credor_cpf_cnpj}</p>
                        {formData.credor_telefone && (
                          <p className="text-sm">Telefone: {formData.credor_telefone}</p>
                        )}
                        <p className="text-sm">{formData.credor_cidade} - {formData.credor_uf}</p>
                      </CardContent>
                    </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Financeiro</CardTitle></CardHeader>
                    <CardContent>
                      <p className="font-semibold text-2xl text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.valor_principal || 0)}
                      </p>
                      <p className="text-sm">Data Base: {formData.data_base ? new Date(formData.data_base).toLocaleDateString('pt-BR') : '-'}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-6 border-t mt-auto">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1 || saving}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>

            {currentStep < 4 ? (
              <Button onClick={handleNext} className="gap-2">
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white gap-2 min-w-[150px]">
                {saving ? <Sparkles className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Salvando..." : "Finalizar Cadastro"}
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: PDF Viewer (Persistent) */}
        {formData.pdf_url && (
          <div className="hidden lg:block h-full min-h-[600px] sticky top-6">
            <Card className="h-full flex flex-col border-primary/20 shadow-lg">
              <CardHeader className="py-3 px-4 border-b bg-muted/20">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" />
                  Documento Original
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <PDFViewer pdfUrl={formData.pdf_url} />
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      <ModalImportarPrecatorio
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onExtracted={handleAiExtracted}
      />
    </div>
  )
}
