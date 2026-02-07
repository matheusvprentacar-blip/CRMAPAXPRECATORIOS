"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { StepDadosBasicos } from "./steps/step-dados-basicos"
import { StepIndices } from "./steps/step-indices"
import { StepAtualizacaoMonetaria } from "./steps/step-atualizacao-monetaria"
import { StepPSS } from "./steps/step-pss"
import { StepIRPF } from "./steps/step-irpf"
import { StepHonorarios } from "./steps/step-honorarios"
import { StepPropostas } from "./steps/step-propostas"
import { StepResumo } from "./steps/step-resumo"
import { Card } from "./ui/card"
import { Check, RotateCcw, Eye } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
import { PdfUploadButton } from "./pdf-upload-button"
import { getPdfViewerUrl } from "@/lib/utils/pdf-upload"
import { DocumentosViewer } from "@/components/precatorios/documentos-viewer"
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
const PENDING_UPDATE_KEY = "calculadora_precatorios_pending_update"

const safeNumber = (val: any) => {
  if (typeof val === "number") return val
  if (!val) return 0
  const num = Number(val)
  return Number.isNaN(num) ? 0 : num
}

const savePendingUpdate = (payload: any) => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      PENDING_UPDATE_KEY,
      JSON.stringify({ payload, savedAt: new Date().toISOString() })
    )
  } catch (error) {
    console.error("[v0] Falha ao salvar payload pendente:", error)
  }
}

const clearPendingUpdate = () => {
  if (typeof window === "undefined") return
  localStorage.removeItem(PENDING_UPDATE_KEY)
}

const isFetchFailure = (error: any) => {
  const message = String(error?.message || "")
  const details = String(error?.details || "")
  return message.includes("Failed to fetch") || details.includes("Failed to fetch")
}

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
  const fallbackDocs = useMemo(() => {
    if (!pdfUrl) return []
    return [
      {
        id: "pdf-precatorio",
        titulo: "Ofício Requisitório",
        tipo: "oficio_requisitorio",
        viewUrl: pdfUrl,
        urlType: "legacy",
      },
    ]
  }, [pdfUrl])

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
          analise_penhora: data.analise_penhora ?? null,
          analise_cessao: data.analise_cessao ?? null,
          analise_herdeiros: data.analise_herdeiros ?? null,
          analise_viavel: data.analise_viavel ?? null,
          analise_observacoes: data.analise_observacoes ?? "",
          analise_penhora_valor: data.analise_penhora_valor ?? null,
          analise_penhora_percentual: data.analise_penhora_percentual ?? null,
          analise_cessao_valor: data.analise_cessao_valor ?? null,
          analise_cessao_percentual: data.analise_cessao_percentual ?? null,
          analise_adiantamento_valor: data.analise_adiantamento_valor ?? null,
          analise_adiantamento_percentual: data.analise_adiantamento_percentual ?? null,
          analise_honorarios_valor: data.analise_honorarios_valor ?? null,
          analise_honorarios_percentual: data.analise_honorarios_percentual ?? null,
          analise_itcmd: data.analise_itcmd ?? null,
          analise_itcmd_valor: data.analise_itcmd_valor ?? null,
          analise_itcmd_percentual: data.analise_itcmd_percentual ?? null,
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
    if (typeof window === "undefined") return
    const handler = () => {
      toast.info("Conexão restabelecida. Você pode salvar o cálculo novamente.")
    }
    window.addEventListener("online", handler)
    return () => window.removeEventListener("online", handler)
  }, [])

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
      const honorarios = resultadosEtapas[4]
      const irpf = resultadosEtapas[4] || resultadosEtapas[3] // compat
      const pss = resultadosEtapas[3] || resultadosEtapas[2] // compat
      const atualizacao = resultadosEtapas[2] || resultadosEtapas[1]

      const { error } = await supabase
        .from("precatorios")
        .update({
          valor_principal: safeNumber(
            dados.valor_principal_original ?? dados.valorPrincipal ?? atualizacao?.valorPrincipal ?? 0,
          ),
          valor_atualizado: safeNumber(
            atualizacao?.valorAtualizado ?? atualizacao?.valor_atualizado ?? resumoFinal?.valor_atualizado ?? 0,
          ),
          saldo_liquido: safeNumber(
            resumoFinal?.valorLiquidoCredor ?? resumoFinal?.base_liquida_final ?? 0,
          ),
          irpf_total: safeNumber(irpf?.irpf_valor ?? irpf?.irTotal ?? 0),
          pss_total: safeNumber(pss?.pss_valor ?? pss?.pssTotal ?? 0),
          pss_oficio_valor: pss?.pss_oficio_valor || 0,
          honorarios_valor: safeNumber(
            propostas?.honorarios_valor ??
              honorarios?.honorarios?.honorarios_valor ??
              honorarios?.honorarios_valor ??
              0,
          ),
          adiantamento_valor: safeNumber(
            propostas?.adiantamento_valor ??
              honorarios?.honorarios?.adiantamento_valor ??
              honorarios?.adiantamento_valor ??
              0,
          ),
          menor_proposta: safeNumber(propostas?.menor_proposta ?? propostas?.menorProposta ?? 0),
          maior_proposta: safeNumber(propostas?.maior_proposta ?? propostas?.maiorProposta ?? 0),
          taxa_juros_moratorios: safeNumber(
            atualizacao?.taxaJuros ?? atualizacao?.taxa_juros_moratorios ?? 0,
          ),
          qtd_salarios_minimos: safeNumber(resumoFinal?.qtdSalariosMinimos ?? 0),
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
        if (isFetchFailure(error)) {
          savePendingUpdate({ precatorioId, dados, resultadosEtapas, etapasCompletadas })
          toast.error("Falha de conexão com o Supabase. Salvamos localmente para você tentar novamente.")
          return
        }
        toast.error("Erro ao salvar cálculo: " + error.message)
      } else {
        clearPendingUpdate()
        console.log("[v0] Cálculo salvo com sucesso!")
        toast.success("Cálculo salvo com sucesso!")
      }
    } catch (error) {
      console.error("[v0] Erro ao salvar:", error)
      if (isFetchFailure(error)) {
        savePendingUpdate({ precatorioId, dados, resultadosEtapas, etapasCompletadas })
        toast.error("Falha de conexão com o Supabase. Salvamos localmente para você tentar novamente.")
        return
      }
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

    let updatePayload: any = null
    setSaving(true)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        console.error("[v0] Supabase não está configurado")
        return
      }

      const dadosBasicos = resultadosEtapas[0]
      // Ordem ajustada: 0 Dados, 1 Índices, 2 Atualização, 3 PSS, 4 IRPF, 5 Honorários, 6 Propostas, 7 Resumo (compat)
      const atualizacao = resultadosEtapas[2] || resultadosEtapas[1]
      const pss = resultadosEtapas[3] || resultadosEtapas[2]
      const irpf = resultadosEtapas[4] || resultadosEtapas[3]
      const honorarios = resultadosEtapas[5] || resultadosEtapas[4]
      const propostas = resultadosEtapas[6] || resultadosEtapas[5]
      const resumoFinal = resultadosEtapas[6] || resultadosEtapas[7] || {}

      const emptyToNull = (v: any) => (v === "" || v === undefined ? null : v)
      const toISODate = (v: any) => {
        v = emptyToNull(v)
        if (!v) return null
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
        const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (m) return `${m[3]}-${m[2]}-${m[1]}`
        return null
      }

      const { data: { user } } = await supabase.auth.getUser()

      const valorAtualizadoFinal = safeNumber(
        propostas?.valor_atualizado ||
        atualizacao?.valorAtualizado ||
        atualizacao?.valor_atualizado ||
        resumoFinal?.valor_atualizado ||
        resumoFinal?.valor_atualizado_final
      )
      const saldoLiquidoFinal = safeNumber(propostas?.base_liquida_final || resumoFinal?.base_liquida_final)

      updatePayload = {
        valor_principal: safeNumber(
          valorAtualizadoFinal > 0
            ? valorAtualizadoFinal
            : (dadosBasicos?.valor_principal_original || dados.valorPrincipal)
        ),
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
          resumoFinal: {
            ...resumoFinal,
            valor_atualizado: valorAtualizadoFinal,
            base_liquida_final: saldoLiquidoFinal,
          },
          resultadosEtapas,
          juros_mora_percentual: safeNumber(pss?.juros_mora_percentual || atualizacao?.taxa_juros_moratorios),
          observacoes: dados.observacoes || resumoFinal?.observacoes || "",
        },
        status: "calculado",
        status_kanban: "calculo_concluido",
        localizacao_kanban: "calculo_concluido",
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
        if (isFetchFailure(error)) {
          savePendingUpdate({ precatorioId, updatePayload })
          toast.error("Falha de conexão com o Supabase. Salvamos localmente para você tentar novamente.")
          return
        }
        toast.error(`Erro ao salvar cálculo: ${error.message || error.details || "Erro desconhecido"}`)
      } else {
        clearPendingUpdate()
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
      if (isFetchFailure(error)) {
        savePendingUpdate({ precatorioId, updatePayload })
        toast.error("Falha de conexão com o Supabase. Salvamos localmente para você tentar novamente.")
        return
      }
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
  const progressoPercentual = steps.length
    ? Math.min(100, Math.round((etapasCompletadas.length / steps.length) * 100))
    : 0
  const etapaAtualLabel = steps[etapaAtual]?.label ?? ""
  const canFinalizar =
    !!precatorioId && !saving && etapasCompletadas.includes(6) && !!resultadosEtapas[6]

  const irParaEtapa = (index: number) => {
    setEtapaAtual(index)
  }

  if (loading) {
    return (
      <Card className="p-8 border border-border/60 bg-card/80 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.4)]">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="ml-4 text-muted-foreground">Carregando dados do precatório...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative space-y-6 calc-scope calc-container px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <Card className="calc-card relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 right-0 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-0 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="border-b border-border/60">
          <div className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Calculadora de Precatórios</h2>
                  <p className="text-sm text-muted-foreground">Sistema completo de cálculo com validação por etapas e auditoria fiscal.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {precatorioData?.credor_nome && (
                    <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                      <span className="font-semibold text-foreground">Credor:</span> {precatorioData.credor_nome}
                    </span>
                  )}
                  {precatorioData?.numero_processo && (
                    <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                      <span className="font-semibold text-foreground">Processo:</span> {precatorioData.numero_processo}
                    </span>
                  )}
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-primary">
                    {etapaAtualLabel || "Etapa em andamento"}
                  </span>
                </div>
              </div>

              {precatorioId && (
                <div className="flex w-full flex-col gap-3 sm:items-end lg:w-auto">
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      onClick={() => setShowPdfSide(!showPdfSide)}
                      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold shadow-sm transition-all sm:text-sm ${
                        showPdfSide
                          ? "border-primary/40 bg-primary/10 text-primary shadow-primary/10"
                          : "border-border/60 bg-background/70 text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      {showPdfSide ? "Ocultar documentos" : "Visualizar documentos"}
                    </button>

                    <div className="inline-flex items-center">
                      <PdfUploadButton
                        precatorioId={precatorioId}
                        currentPdfUrl={pdfUrl}
                        onUploadSuccess={async () => loadPrecatorioFromSupabase(precatorioId)}
                      />
                    </div>

                    <button
                      onClick={() => setShowResetDialog(true)}
                      disabled={saving}
                      className="inline-flex h-9 items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/5 px-3 text-xs font-semibold text-rose-500 shadow-sm transition hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed sm:text-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Resetar
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-primary/10 via-transparent to-emerald-500/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Progresso</p>
              <p className="text-lg font-semibold text-foreground">{etapaAtualLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{progressoPercentual}%</p>
              <p className="text-xs text-muted-foreground">{etapasCompletadas.length} de {steps.length} etapas</p>
            </div>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-muted/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-[hsl(var(--chart-2))] to-emerald-500 transition-all"
              style={{ width: `${progressoPercentual}%` }}
            />
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Etapas</p>
              <p className="text-xs text-muted-foreground">Navegue pela linha do tempo</p>
            </div>
            <span className="text-xs font-semibold text-foreground">{etapasCompletadas.length}/{steps.length}</span>
          </div>

          <div className="relative mt-4">
            <div className="absolute left-3 right-3 top-1/2 h-px bg-border/60" />
            <div className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar">
              {steps.map((step, index) => {
                const isActive = index === etapaAtual
                const isCompleted = etapasCompletadas.includes(index)
                const statusLabel = isCompleted ? "Concluída" : isActive ? "Em andamento" : "Pendente"

                return (
                  <button
                    key={step.label}
                    type="button"
                    aria-current={isActive ? "step" : undefined}
                    onClick={() => irParaEtapa(index)}
                    className={`relative z-10 flex min-w-[220px] items-center gap-3 rounded-full border px-4 py-2 text-left transition-all ${
                      isActive
                        ? "border-primary/40 bg-primary/15 text-primary shadow-lg shadow-primary/10 ring-1 ring-primary/30"
                        : isCompleted
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 shadow-sm"
                          : "border-border/60 bg-background/70 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCompleted
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-border/60 bg-background text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isActive || isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                      <span
                        className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          isActive
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : isCompleted
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                              : "border-border/60 bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className={`grid gap-6 ${showPdfSide ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]" : ""}`}>
        <div
          className="min-w-0 animate-in fade-in-50 group"
          data-pdf={showPdfSide ? "open" : "closed"}
        >
          {StepComponent && (
            <StepComponent
              dados={dados}
              setDados={setDados}
              onCompletar={(resultado: any) => handleCompletarEtapa(etapaAtual, resultado)}
              resultadosEtapas={resultadosEtapas}
              voltar={voltar}
              precatorioId={precatorioId}
              saving={saving}
              onFinalizar={finalizarCalculo}
              canFinalizar={canFinalizar}
            />
          )}
        </div>
        {showPdfSide && (
          <div className="h-[calc(100vh-12rem)] rounded-2xl border border-border/60 bg-card/80 backdrop-blur overflow-hidden shadow-sm xl:sticky xl:top-28 transition-all duration-300 animate-in fade-in slide-in-from-right-10">
            <DocumentosViewer
              precatorioId={precatorioId}
              onClose={() => setShowPdfSide(false)}
              fallbackDocs={fallbackDocs}
              className="h-full"
            />
          </div>
        )}
      </div>
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="bg-background text-foreground border border-border shadow-xl">
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
