"use client"

import { useState, useEffect, useCallback } from "react"
import { StepDadosBasicos } from "./steps/step-dados-basicos"
import { StepIndices } from "./steps/step-indices"
import { StepAtualizacaoMonetaria } from "./steps/step-atualizacao-monetaria"
import { StepPSS } from "./steps/step-pss"
import { StepIRPF } from "./steps/step-irpf"
import { StepHonorarios } from "./steps/step-honorarios"
import { StepPropostas } from "./steps/step-propostas"
import { StepResumo } from "./steps/step-resumo"
import { Card } from "./ui/card"
import { Check, RotateCcw, Eye, Upload, ChevronsRight } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
import { PdfUploadButton } from "./pdf-upload-button"
import { getPdfViewerUrl } from "@/lib/utils/pdf-upload"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

const STORAGE_KEY = "calculadora_precatorios_progress"

export interface CalculadoraProgress {
  precatorioId?: string
  dados: any
  etapaAtual: number
  etapasCompletadas: number[]
  pdfUrl: string | null
  resultadosEtapas: any[]
}

interface CalculadoraPrecatoriosProps {
  precatorioId?: string
  onUpdate?: () => void
}

const CalculadoraPrecatorios = ({ precatorioId, onUpdate }: CalculadoraPrecatoriosProps) => {
  const [etapaAtual, setEtapaAtual] = useState(0)
  const [dados, setDados] = useState<any>({})
  const [etapasCompletadas, setEtapasCompletadas] = useState<number[]>([])
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [resultadosEtapas, setResultadosEtapas] = useState<any[]>([])
  const [precatorioData, setPrecatorioData] = useState<Precatorio | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showPdfSide, setShowPdfSide] = useState(false)

  // Auto-open PDF side view when URL is loaded
  useEffect(() => {
    if (pdfUrl) {
      setShowPdfSide(true)
    }
  }, [pdfUrl])

  useEffect(() => {
    if (precatorioId) {
      loadPrecatorioFromSupabase(precatorioId)
    } else {
      loadFromLocalStorage()
    }
  }, [precatorioId])

  const loadPrecatorioFromSupabase = async (id: string) => {
    setLoading(true)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        console.error("[v0] Supabase não está configurado")
        return
      }

      const { data, error } = await supabase.from("precatorios").select("*").eq("id", id).single()

      if (error) {
        console.error("[v0] Erro ao carregar precatório:", error)
        return
      }

      if (data) {
        console.log("[v0] Precatório carregado do Supabase:", data)
        setPrecatorioData(data as Precatorio)

        if (data.pdf_url) {
          console.log("[v0] PDF encontrado (raw):", data.pdf_url)
          // Resolver URL assinada se for storage:
          const signedUrl = await getPdfViewerUrl(data.pdf_url)
          if (signedUrl) {
            console.log("[v0] PDF URL resolvida:", signedUrl)
            setPdfUrl(signedUrl)
          } else {
            console.error("[v0] Falha ao resolver URL do PDF")
          }
        }

        setDados({
          valorPrincipal: data.valor_principal || 0,
          valorJuros: data.valor_juros || 0,
          valorSelic: data.valor_selic || 0,
          dataBase: data.data_base || "",
          dataExpedicao: data.data_expedicao || "",
          dataCalculo: data.data_calculo || "",
          credor: data.credor_nome || "",
          numeroProcesso: data.numero_processo || "",
          tribunal: data.tribunal || "",
        })

        if (data.dados_calculo) {
          try {
            const calculoSalvo = data.dados_calculo as any
            console.log("[v0] Cálculo salvo encontrado:", calculoSalvo)
            if (calculoSalvo.resultadosEtapas) {
              console.log("[v0] Restaurando resultados das etapas:", calculoSalvo.resultadosEtapas)
              setResultadosEtapas(calculoSalvo.resultadosEtapas)
              setEtapasCompletadas(calculoSalvo.etapasCompletadas || [])
              console.log("[v0] Cálculo restaurado com sucesso!")
            }
          } catch (e) {
            console.error("[v0] Erro ao restaurar cálculo salvo:", e)
          }
        }
      }
    } catch (error) {
      console.error("[v0] Erro ao buscar precatório:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadFromLocalStorage = () => {
    const savedProgress = localStorage.getItem(STORAGE_KEY)
    if (savedProgress) {
      try {
        const progress: CalculadoraProgress = JSON.parse(savedProgress)
        setDados(progress.dados || {})
        setEtapaAtual(progress.etapaAtual || 0)
        setEtapasCompletadas(progress.etapasCompletadas || [])
        setPdfUrl(progress.pdfUrl || null)
        setResultadosEtapas(progress.resultadosEtapas || [])
      } catch (e) {
        console.error("[v0] Erro ao carregar progresso da calculadora:", e)
      }
    }
  }

  useEffect(() => {
    if (!precatorioId) {
      const progress: CalculadoraProgress = {
        dados,
        etapaAtual,
        etapasCompletadas,
        pdfUrl,
        resultadosEtapas,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    }
  }, [dados, etapaAtual, etapasCompletadas, pdfUrl, resultadosEtapas, precatorioId])

  useEffect(() => {
    const propostas = resultadosEtapas[5]
    const honorarios = resultadosEtapas[4]

    if (propostas?.base_calculo_liquida && honorarios?.honorarios) {
      const baseCalculo = propostas.base_calculo_liquida
      const honorariosPercentual = honorarios.honorarios.honorarios_percentual || 0
      const adiantamentoPercentual = honorarios.honorarios.adiantamento_percentual || 0
      const honorariosValor = Math.round(baseCalculo * (honorariosPercentual / 100) * 100) / 100
      const adiantamentoValor = Math.round(baseCalculo * (adiantamentoPercentual / 100) * 100) / 100

      if (
        honorariosValor !== honorarios.honorarios.honorarios_valor ||
        adiantamentoValor !== honorarios.honorarios.adiantamento_valor
      ) {
        setResultadosEtapas((prev) => {
          const novos = [...prev]
          novos[4] = {
            ...novos[4],
            honorarios: {
              ...novos[4].honorarios,
              honorarios_valor: honorariosValor,
              adiantamento_valor: adiantamentoValor,
            },
          }
          return novos
        })
      }
    }
  }, [resultadosEtapas])

  const handleCompletarEtapa = useCallback(
    (etapa: number, resultado?: any) => {
      console.log("[v0] ========== handleCompletarEtapa CHAMADO ==========")
      console.log("[v0] Etapa:", etapa)
      console.log("[v0] Resultado recebido:", resultado)

      if (!etapasCompletadas.includes(etapa)) {
        setEtapasCompletadas((prev) => [...prev, etapa])
      }

      if (resultado) {
        setResultadosEtapas((prev) => {
          const novos = [...prev]
          novos[etapa] = resultado
          console.log("[v0] Resultado salvo na posição", etapa, ":", novos[etapa])
          return novos
        })
      }

      if (etapa < steps.length - 1) {
        setEtapaAtual(etapa + 1)
      }
    },
    [etapasCompletadas],
  )

  const salvarCalculoNoSupabase = async () => {
    if (!precatorioId) {
      console.error("[v0] Nenhum precatorioId definido")
      return
    }

    setSaving(true)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        console.error("[v0] Supabase não está configurado")
        return
      }

      const resumoFinal = resultadosEtapas[6]
      const propostas = resultadosEtapas[5]
      const irpf = resultadosEtapas[3]
      const pss = resultadosEtapas[2]
      const atualizacao = resultadosEtapas[1]

      const { error } = await supabase
        .from("precatorios")
        .update({
          valor_principal: dados.valor_principal_original || dados.valorPrincipal || 0,
          irpf_total: irpf?.irTotal || 0,
          pss_total: pss?.pss_valor || pss?.pssTotal || 0,
          pss_oficio_valor: pss?.pss_oficio_valor || 0,
          valor_atualizado: atualizacao?.valorAtualizado || dados.valorPrincipal || 0,
          saldo_liquido: resumoFinal?.valorLiquidoCredor || 0,
          menor_proposta: propostas?.menor_proposta || 0,
          maior_proposta: propostas?.maior_proposta || 0,
          taxa_juros_moratorios: atualizacao?.taxaJuros || 0,
          qtd_salarios_minimos: resumoFinal?.qtdSalariosMinimos || 0,
          dados_calculo: {
            dados,
            resultadosEtapas,
            etapasCompletadas,
            dataCalculo: new Date().toISOString(),
            juros_mora_percentual: pss?.juros_mora_percentual || 0,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (error) {
        console.error("[v0] Erro ao salvar cálculo:", error)
        toast.error("Erro ao salvar cálculo: " + error.message)
      } else {
        console.log("[v0] Cálculo salvo com sucesso!")
        toast.success("Cálculo salvo com sucesso!")
      }
    } catch (error) {
      console.error("[v0] Erro ao salvar:", error)
      toast.error("Erro ao salvar cálculo")
    } finally {
      setSaving(false)
    }
  }

  const finalizarCalculo = async () => {
    if (!precatorioId) {
      console.error("[v0] Nenhum precatorioId definido")
      return
    }

    setSaving(true)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        console.error("[v0] Supabase não está configurado")
        return
      }

      const dadosBasicos = resultadosEtapas[0]
      const atualizacao = resultadosEtapas[1]
      const pss = resultadosEtapas[2]
      const irpf = resultadosEtapas[3]
      const honorarios = resultadosEtapas[4]
      const propostas = resultadosEtapas[5]
      const resumoFinal = resultadosEtapas[6]

      const emptyToNull = (v: any) => (v === "" || v === undefined ? null : v)
      const toISODate = (v: any) => {
        v = emptyToNull(v)
        if (!v) return null
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
        const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (m) return `${m[3]}-${m[2]}-${m[1]}`
        return null
      }

      const safeNumber = (val: any) => {
        if (typeof val === 'number') return val
        if (!val) return 0
        const num = Number(val)
        return isNaN(num) ? 0 : num
      }

      const { data: { user } } = await supabase.auth.getUser()

      const valorAtualizadoFinal = safeNumber(propostas?.valor_atualizado || atualizacao?.valorAtualizado)
      const saldoLiquidoFinal = safeNumber(propostas?.base_liquida_final)

      const updatePayload = {
        valor_principal: safeNumber(dadosBasicos?.valor_principal_original || dados.valorPrincipal),
        valor_juros: safeNumber(atualizacao?.valorJuros || atualizacao?.juros_mora),
        valor_selic: safeNumber(atualizacao?.valorSelic || atualizacao?.multa),
        valor_atualizado: valorAtualizadoFinal,
        saldo_liquido: saldoLiquidoFinal,
        data_base:
          toISODate(dadosBasicos?.data_base || dados.dataBase) || toISODate(new Date().toISOString().slice(0, 10)),
        data_expedicao:
          toISODate(dadosBasicos?.data_expedicao || dados.dataExpedicao) ||
          toISODate(new Date().toISOString().slice(0, 10)),
        data_calculo: toISODate(new Date().toISOString().slice(0, 10)),
        pss_valor: safeNumber(propostas?.pss_valor || pss?.pss_valor),
        pss_oficio_valor: safeNumber(pss?.pss_oficio_valor),
        irpf_valor: safeNumber(propostas?.irpf_valor || irpf?.valor_irpf || irpf?.irTotal),
        honorarios_valor: safeNumber(propostas?.honorarios_valor),
        adiantamento_valor: safeNumber(propostas?.adiantamento_valor),
        proposta_menor_valor: safeNumber(propostas?.menor_proposta),
        proposta_maior_valor: safeNumber(propostas?.maior_proposta),
        proposta_menor_percentual: safeNumber(propostas?.percentual_menor),
        proposta_maior_percentual: safeNumber(propostas?.percentual_maior),
        dados_calculo: {
          dadosBasicos,
          atualizacao: {
            ...atualizacao,
            valorJuros: safeNumber(atualizacao?.valorJuros || atualizacao?.juros_mora),
            valorSelic: safeNumber(atualizacao?.valorSelic || atualizacao?.multa),
          },
          pss,
          irpf,
          honorarios: {
            honorarios_percentual: safeNumber(propostas?.honorarios_percentual),
            honorarios_valor: safeNumber(propostas?.honorarios_valor),
            adiantamento_percentual: safeNumber(propostas?.adiantamento_percentual),
            adiantamento_valor: safeNumber(propostas?.adiantamento_valor),
          },
          propostas: {
            base_liquida_pre_descontos: safeNumber(propostas?.base_liquida_pre_descontos),
            honorarios_valor: safeNumber(propostas?.honorarios_valor),
            adiantamento_valor: safeNumber(propostas?.adiantamento_valor),
            base_liquida_final: safeNumber(propostas?.base_liquida_final),
            percentual_menor: safeNumber(propostas?.percentual_menor),
            percentual_maior: safeNumber(propostas?.percentual_maior),
            menor_proposta: safeNumber(propostas?.menor_proposta),
            maior_proposta: safeNumber(propostas?.maior_proposta),
            menorProposta: safeNumber(propostas?.menor_proposta),
            maiorProposta: safeNumber(propostas?.maior_proposta),
            valor_atualizado: safeNumber(propostas?.valor_atualizado),
            saldo_liquido: safeNumber(propostas?.base_liquida_final),
          },
          resumoFinal,
          resultadosEtapas,
          juros_mora_percentual: safeNumber(pss?.juros_mora_percentual || atualizacao?.taxa_juros_moratorios),
          observacoes: resumoFinal?.observacoes || "",
        },
        status: "certidoes",
        status_kanban: "certidoes", // FIXED: Ensure kanban position updates
        localizacao_kanban: "certidoes",
        responsavel_calculo_id: null,
        updated_at: new Date().toISOString(),
      }

      console.log("[v0] Enviando payload de atualização:", updatePayload)

      const { error } = await supabase
        .from("precatorios")
        .update(updatePayload)
        .eq("id", precatorioId)

      if (error) {
        console.error("[v0] Erro detalhado ao finalizar cálculo:", JSON.stringify(error, null, 2))
        toast.error(`Erro ao salvar cálculo: ${error.message || error.details || "Erro desconhecido"}`)
      } else {
        console.log("[v0] Cálculo finalizado com sucesso!")

        // 1. Determinar próxima versão
        const { count } = await supabase
          .from("precatorio_calculos")
          .select("*", { count: "exact", head: true })
          .eq("precatorio_id", precatorioId)

        const novaVersao = (count || 0) + 1

        // 2. Salvar Histórico
        const { error: histError } = await supabase.from("precatorio_calculos").insert({
          precatorio_id: precatorioId,
          versao: novaVersao,
          data_base: dadosBasicos?.data_base,
          valor_atualizado: valorAtualizadoFinal,
          saldo_liquido: saldoLiquidoFinal,
          premissas_json: updatePayload.dados_calculo,
          premissas_resumo: `Cálculo finalizado v${novaVersao}`,
          created_by: user?.id,
          arquivo_pdf_url: null // Se tiver URL de PDF gerado, passar aqui. Por enquanto null.
        })

        if (histError) console.error("Erro ao salvar histórico:", histError)

        // 3. Atualizar Precatório com nova versão
        await supabase.from("precatorios").update({
          calculo_ultima_versao: novaVersao
        }).eq("id", precatorioId)

        if (user) {
          await supabase.from("atividades").insert({
            precatorio_id: precatorioId,
            usuario_id: user.id,
            tipo: "calculo",
            descricao: `Cálculo finalizado (v${novaVersao}) e salvo com sucesso`,
            dados_novos: {
              valor_principal: dadosBasicos?.valor_principal_original || dados.valorPrincipal || 0,
              maior_proposta: propostas?.maior_proposta || 0,
              valor_atualizado: propostas?.valor_atualizado || atualizacao?.valorAtualizado || 0,
              percentual_maior: propostas?.percentual_maior || 0,
              calculo_ultima_versao: novaVersao
            }
          })
        }

        toast.success("Cálculo finalizado! Status alterado para 'Calculado'.")

        // Remove redirect and call onUpdate if provided
        if (onUpdate) {
          onUpdate()
        }
      }
    } catch (error) {
      console.error("[v0] Erro ao finalizar:", error)
      toast.error("Erro ao finalizar cálculo")
    } finally {
      setSaving(false)
    }
  }

  const voltar = () => {
    if (etapaAtual > 0) {
      setEtapaAtual(etapaAtual - 1)
    }
  }

  const resetarCalculo = async () => {
    if (!precatorioId) {
      console.error("[v0] Nenhum precatorioId definido")
      toast.error("Erro: ID do precatório não encontrado")
      return
    }

    setSaving(true)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        console.error("[v0] Supabase não está configurado")
        toast.error("Erro: Configuração do banco de dados inválida")
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      const { error: updateError } = await supabase
        .from("precatorios")
        .update({
          dados_calculo: null,
          pdf_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (updateError) {
        console.error("[v0] Erro ao resetar cálculo:", updateError)
        toast.error("Erro ao resetar cálculo: " + updateError.message)
        return
      }

      if (user) {
        await supabase.from("atividades").insert({
          precatorio_id: precatorioId,
          usuario_id: user.id,
          tipo: "refazer_calculo" as any,
          descricao: "Cálculo resetado - todos os dados foram limpos (inclusive PDF)",
        })
      }

      setDados({})
      setResultadosEtapas([])
      setEtapasCompletadas([])
      setPdfUrl(null)
      setEtapaAtual(0)

      console.log("[v0] Cálculo resetado com sucesso!")
      toast.success("Cálculo e PDF resetados com sucesso!")
      setShowResetDialog(false)
    } catch (error) {
      console.error("[v0] Erro ao resetar cálculo:", error)
      toast.error("Erro ao resetar cálculo")
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    { label: "Dados básicos", component: StepDadosBasicos },
    { label: "Índices", component: StepIndices },
    { label: "Atualização monetária", component: StepAtualizacaoMonetaria },
    { label: "PSS", component: StepPSS },
    { label: "IRPF", component: StepIRPF },
    { label: "Honorários", component: StepHonorarios },
    { label: "Propostas", component: StepPropostas },
    { label: "Resumo", component: StepResumo },
  ]

  const StepComponent = steps[etapaAtual]?.component

  const irParaEtapa = (index: number) => {
    setEtapaAtual(index)
  }

  if (loading) {
    return (
      <Card className="p-8 border-none shadow-md bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="ml-4 text-muted-foreground">Carregando dados do precatório...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6 relative">
      <Card className="border-none shadow-md bg-card/95 backdrop-blur-sm sticky top-4 z-40 transition-all duration-200">
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent w-fit">
                Calculadora de Precatórios
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Sistema completo de cálculo com validação por etapas</p>
              {precatorioData && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                  <span className="font-medium text-foreground">Credor:</span> {precatorioData.credor_nome}
                </div>
              )}
            </div>

            {precatorioId && (
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setShowPdfSide(!showPdfSide)}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2 ${showPdfSide
                    ? "bg-blue-100 text-blue-800 border-blue-300"
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                >
                  <Eye className="w-4 h-4" />
                  {showPdfSide ? "Ocultar PDF" : "Visualizar PDF"}
                </button>

                <div className="inline-block">
                  <PdfUploadButton
                    precatorioId={precatorioId}
                    currentPdfUrl={pdfUrl}
                    onUploadSuccess={async () => loadPrecatorioFromSupabase(precatorioId)}
                  />
                </div>

                <button
                  onClick={() => setShowResetDialog(true)}
                  disabled={saving}
                  className="px-4 py-2 bg-background text-foreground border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resetar
                </button>
                <button
                  onClick={salvarCalculoNoSupabase}
                  disabled={saving || resultadosEtapas.filter(Boolean).length < 6}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {saving ? "..." : "Salvar"}
                </button>
                <button
                  onClick={finalizarCalculo}
                  disabled={saving || resultadosEtapas.filter(Boolean).length < 6}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {saving ? "..." : "Finalizar"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-muted/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Progresso do Cálculo</span>
            <span className="text-sm font-semibold text-primary">{etapasCompletadas.length} / {steps.length} etapas</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => {
              const isActive = index === etapaAtual
              const isCompleted = etapasCompletadas.includes(index)
              return (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => irParaEtapa(index)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-all ${isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                    : isCompleted
                      ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900"
                      : "bg-background text-foreground border-border hover:bg-accent hover:border-accent-foreground"
                    }`}
                >
                  {isCompleted && <Check className="h-4 w-4" />}
                  <span className="font-medium">{step.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${showPdfSide ? "lg:grid-cols-2" : ""} gap-6 p-6`}>
          <div className="transition-all duration-300">
            {StepComponent && (
              <StepComponent
                dados={dados}
                setDados={setDados}
                onCompletar={(resultado: any) => handleCompletarEtapa(etapaAtual, resultado)}
                resultadosEtapas={resultadosEtapas}
                voltar={voltar}
              />
            )}
          </div>

          {showPdfSide && (
            <div className={`h-[calc(100vh-12rem)] border rounded-lg bg-muted/10 overflow-hidden sticky top-24 transition-all duration-300 animate-in fade-in slide-in-from-right-10`}>
              <div className="flex items-center justify-between p-2 bg-muted border-b">
                <span className="text-sm font-medium ml-2">Documento do Precatório</span>
                <button
                  onClick={() => setShowPdfSide(false)}
                  className="p-1 hover:bg-background rounded-full"
                  title="Fechar visualizador"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title="Documento do Precatório"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-6 text-center">
                  <div className="bg-muted p-4 rounded-full">
                    <Eye className="h-8 w-8 opacity-50" />
                  </div>
                  <p>Nenhum documento PDF anexado/visualizável.</p>
                  <p className="text-sm">Use o botão "Anexar PDF" acima para adicionar um arquivo.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reset do Cálculo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá limpar todos os dados do cálculo atual. Todas as etapas preenchidas serão perdidas.
              <br />
              <strong>Esta ação não pode ser desfeita.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={resetarCalculo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CalculadoraPrecatorios
