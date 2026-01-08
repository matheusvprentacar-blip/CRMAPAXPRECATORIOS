"use client"

import { useState, useEffect, useCallback } from "react"
import { StepDadosBasicos } from "./steps/step-dados-basicos"
import { StepAtualizacaoMonetaria } from "./steps/step-atualizacao-monetaria"
import { StepPSS } from "./steps/step-pss"
import { StepIRPF } from "./steps/step-irpf"
import { StepHonorarios } from "./steps/step-honorarios"
import { StepPropostas } from "./steps/step-propostas"
import { StepResumo } from "./steps/step-resumo"
import { Card } from "./ui/card"
import { Check } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"

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
}

const CalculadoraPrecatorios = ({ precatorioId }: CalculadoraPrecatoriosProps) => {
  const [etapaAtual, setEtapaAtual] = useState(0)
  const [dados, setDados] = useState<any>({})
  const [etapasCompletadas, setEtapasCompletadas] = useState<number[]>([])
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [resultadosEtapas, setResultadosEtapas] = useState<any[]>([])
  const [precatorioData, setPrecatorioData] = useState<Precatorio | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (precatorioId) {
      loadPrecatorioFromSupabase(precatorioId)
    } else {
      // Sem precatorioId, carregar do localStorage
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

        // Preencher dados da calculadora com os dados do banco
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
          // Carregar mais campos conforme necessário
        })

        // Se houver cálculo salvo, restaurar resultados
        if (data.calculo_json) {
          try {
            const calculoSalvo = data.calculo_json as any
            if (calculoSalvo.resultadosEtapas) {
              setResultadosEtapas(calculoSalvo.resultadosEtapas)
              setEtapasCompletadas(calculoSalvo.etapasCompletadas || [])
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

      // Atualizar valores calculados nos resultados apenas se mudaram
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

      // Avança automaticamente para próxima etapa
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

      const resumoFinal = resultadosEtapas[6] // Step Resumo (was 7)
      const propostas = resultadosEtapas[5] // Step Propostas (was 6)
      const irpf = resultadosEtapas[3] // Step IRPF (was 4)
      const pss = resultadosEtapas[2] // Step PSS (was 3)
      const atualizacao = resultadosEtapas[1] // Step Atualização (was 2)

      console.log("[v0] Salvando cálculo no Supabase...")
      console.log("[v0] Propostas:", propostas)
      console.log("[v0] Resumo:", resumoFinal)
      console.log("[v0] PSS:", pss)

      const { error } = await supabase
        .from("precatorios")
        .update({
          irpf_total: irpf?.irTotal || 0,
          pss_total: pss?.pss_valor || pss?.pssTotal || 0,
          pss_oficio_valor: pss?.pss_oficio_valor || 0, // PSS do Ofício
          valor_atualizado: atualizacao?.valorAtualizado || dados.valorPrincipal || 0,
          valor_liquido_credor: resumoFinal?.valorLiquidoCredor || 0,
          menor_proposta: propostas?.menor_proposta || 0,
          maior_proposta: propostas?.maior_proposta || 0,
          taxa_juros_moratorios: atualizacao?.taxaJuros || 0,
          qtd_salarios_minimos: resumoFinal?.qtdSalariosMinimos || 0,
          dados_calculo: {
            dados,
            resultadosEtapas,
            etapasCompletadas,
            dataCalculo: new Date().toISOString(),
            juros_mora_percentual: pss?.juros_mora_percentual || 0, // Para o trigger calcular
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (error) {
        console.error("[v0] Erro ao salvar cálculo:", error)
        alert("Erro ao salvar cálculo: " + error.message)
      } else {
        console.log("[v0] Cálculo salvo com sucesso!")
        alert("Cálculo salvo com sucesso!")
      }
    } catch (error) {
      console.error("[v0] Erro ao salvar:", error)
      alert("Erro ao salvar cálculo")
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

      const dadosBasicos = resultadosEtapas[0] // Step Dados Básicos
      const atualizacao = resultadosEtapas[1] // Step Atualização
      const pss = resultadosEtapas[2] // Step PSS
      const irpf = resultadosEtapas[3] // Step IRPF
      const honorarios = resultadosEtapas[4] // Step Honorários
      const propostas = resultadosEtapas[5] // Step Propostas
      const resumoFinal = resultadosEtapas[6] // Step Resumo

      console.log("[v0] Finalizando cálculo no Supabase...")
      console.log("[v0] Dados Básicos:", dadosBasicos)
      console.log("[v0] Atualização:", atualizacao)
      console.log("[v0] PSS:", pss)
      console.log("[v0] IRPF:", irpf)
      console.log("[v0] Honorários:", honorarios)
      console.log("[v0] Propostas:", propostas)
      console.log("[v0] Resumo:", resumoFinal)

      const emptyToNull = (v: any) => (v === "" || v === undefined ? null : v)
      const toISODate = (v: any) => {
        v = emptyToNull(v)
        if (!v) return null
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
        const m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (m) return `${m[3]}-${m[2]}-${m[1]}`
        return null
      }

      const { error } = await supabase
        .from("precatorios")
        .update({
          valor_principal: dadosBasicos?.valor_principal_original || dados.valorPrincipal || 0,
          valor_juros: atualizacao?.valorJuros || atualizacao?.juros_mora || 0,
          valor_selic: atualizacao?.valorSelic || atualizacao?.multa || 0,
          valor_atualizado: propostas?.valor_atualizado || atualizacao?.valorAtualizado || 0,
          saldo_liquido: propostas?.base_liquida_final || 0, // Base líquida final (após descontos)
          data_base:
            toISODate(dadosBasicos?.data_base || dados.dataBase) || toISODate(new Date().toISOString().slice(0, 10)),
          data_expedicao:
            toISODate(dadosBasicos?.data_expedicao || dados.dataExpedicao) ||
            toISODate(new Date().toISOString().slice(0, 10)),
          data_calculo: toISODate(new Date().toISOString().slice(0, 10)),
          pss_valor: propostas?.pss_valor || pss?.pss_valor || 0, // PSS Atualizado
          pss_oficio_valor: pss?.pss_oficio_valor || 0, // PSS do Ofício
          irpf_valor: propostas?.irpf_valor || irpf?.valor_irpf || irpf?.irTotal || 0,
          honorarios_valor: propostas?.honorarios_valor || 0,
          adiantamento_valor: propostas?.adiantamento_valor || 0,
          proposta_menor_valor: propostas?.menor_proposta || 0,
          proposta_maior_valor: propostas?.maior_proposta || 0,
          proposta_menor_percentual: propostas?.percentual_menor || 0,
          proposta_maior_percentual: propostas?.percentual_maior || 0,
          dados_calculo: {
            dadosBasicos,
            atualizacao: {
              ...atualizacao,
              valorJuros: atualizacao?.valorJuros || atualizacao?.juros_mora || 0,
              valorSelic: atualizacao?.valorSelic || atualizacao?.multa || 0,
            },
            pss,
            irpf,
            honorarios: {
              honorarios_percentual: propostas?.honorarios_percentual || 0,
              honorarios_valor: propostas?.honorarios_valor || 0,
              adiantamento_percentual: propostas?.adiantamento_percentual || 0,
              adiantamento_valor: propostas?.adiantamento_valor || 0,
            },
            propostas: {
              base_liquida_pre_descontos: propostas?.base_liquida_pre_descontos || 0,
              honorarios_valor: propostas?.honorarios_valor || 0,
              adiantamento_valor: propostas?.adiantamento_valor || 0,
              base_liquida_final: propostas?.base_liquida_final || 0,
              percentual_menor: propostas?.percentual_menor || 0,
              percentual_maior: propostas?.percentual_maior || 0,
              menor_proposta: propostas?.menor_proposta || 0,
              maior_proposta: propostas?.maior_proposta || 0,
              menorProposta: propostas?.menor_proposta || 0,
              maiorProposta: propostas?.maior_proposta || 0,
              valor_atualizado: propostas?.valor_atualizado || 0,
              valor_liquido_credor: propostas?.base_liquida_final || 0,
            },
            resumoFinal,
            resultadosEtapas,
            juros_mora_percentual: pss?.juros_mora_percentual || atualizacao?.taxa_juros_moratorios || 0,
            observacoes: resumoFinal?.observacoes || "",
          },
          status: "calculado",
          localizacao_kanban: "calculado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (error) {
        console.error("[v0] Erro ao finalizar cálculo:", error)
        alert("Erro ao finalizar cálculo: " + error.message)
      } else {
        console.log("[v0] Cálculo finalizado com sucesso!")
        alert(
          "Cálculo finalizado! Status alterado para 'Calculado'. O precatório aparecerá na coluna 'Cálculo Realizado' do Kanban.",
        )
        setTimeout(() => {
          window.location.href = "/painel-calculos"
        }, 1500)
      }
    } catch (error) {
      console.error("[v0] Erro ao finalizar:", error)
      alert("Erro ao finalizar cálculo")
    } finally {
      setSaving(false)
    }
  }

  const voltar = () => {
    if (etapaAtual > 0) {
      setEtapaAtual(etapaAtual - 1)
    }
  }

  const steps = [
    {
      label: "Dados básicos",
      component: StepDadosBasicos,
    },
    {
      label: "Atualização monetária",
      component: StepAtualizacaoMonetaria,
    },
    {
      label: "PSS",
      component: StepPSS,
    },
    {
      label: "IRPF",
      component: StepIRPF,
    },
    {
      label: "Honorários",
      component: StepHonorarios,
    },
    {
      label: "Propostas",
      component: StepPropostas,
    },
    {
      label: "Resumo",
      component: StepResumo,
    },
  ]

  const StepComponent = steps[etapaAtual]?.component

  const irParaEtapa = (index: number) => {
    setEtapaAtual(index)
  }

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="ml-4 text-muted-foreground">Carregando dados do precatório...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-2 p-2 bg-muted rounded text-xs space-y-1">
          <p>
            Debug: Etapa {etapaAtual} | Resultados: {resultadosEtapas.filter(Boolean).length}
          </p>
          {precatorioId && <p className="text-blue-600">Precatório ID: {precatorioId}</p>}
          {precatorioData && <p className="text-emerald-600">Credor: {precatorioData.credor_nome}</p>}
          {resultadosEtapas[5] && (
            <p className="text-emerald-600">
              ✓ Propostas: Menor = {resultadosEtapas[5].menor_proposta?.toFixed(2)} | Maior ={" "}
              {resultadosEtapas[5].maior_proposta?.toFixed(2)}
            </p>
          )}
          {precatorioId && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={salvarCalculoNoSupabase}
                disabled={saving || resultadosEtapas.filter(Boolean).length < 6}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Salvando..." : "💾 Salvar Rascunho"}
              </button>
              <button
                onClick={finalizarCalculo}
                disabled={saving || resultadosEtapas.filter(Boolean).length < 6}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving ? "Finalizando..." : "✅ Finalizar Cálculo"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {steps.map((step, index) => {
            const isActive = index === etapaAtual
            const isCompleted = etapasCompletadas.includes(index)
            return (
              <button
                key={step.label}
                type="button"
                onClick={() => irParaEtapa(index)}
                className={`flex items-center gap-2 px-3 py-1 text-xs rounded-full border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-accent"
                }`}
              >
                {isCompleted && <Check className="h-3 w-3" />}
                <span>{step.label}</span>
              </button>
            )
          })}
        </div>

        {StepComponent && (
          <StepComponent
            dados={dados}
            setDados={setDados}
            onCompletar={(resultado: any) => handleCompletarEtapa(etapaAtual, resultado)}
            pdfUrl={pdfUrl}
            setPdfUrl={setPdfUrl}
            resultadosEtapas={resultadosEtapas}
            setResultadosEtapas={setResultadosEtapas}
            voltar={voltar}
          />
        )}
      </Card>
    </div>
  )
}

export default CalculadoraPrecatorios
