"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, ArrowRight, Info } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { toast } from "sonner"

interface StepPropostasProps {
  dados: any
  setDados: (dados: any) => void
  resultadosEtapas: any[]
  onCompletar: (resultado: any) => void
  voltar: () => void
  precatorioId?: string
}

const round2 = (value: number) => Math.round(value * 100) / 100

type Herdeiro = {
  id: string
  nome_completo: string
  cpf?: string | null
  percentual_participacao?: number | null
}

export function StepPropostas({
  dados,
  setDados,
  resultadosEtapas,
  onCompletar,
  voltar,
  precatorioId,
}: StepPropostasProps) {
  const [percentualMenorProposta, setPercentualMenorProposta] = useState(dados.percentual_menor_proposta || 0)
  const [percentualMaiorProposta, setPercentualMaiorProposta] = useState(dados.percentual_maior_proposta || 0)
  const [calculoFinal, setCalculoFinal] = useState<any>(null)

  const [isManual, setIsManual] = useState<boolean>(dados.propostas_manual || false)
  const [manualMenor, setManualMenor] = useState<number>(dados.menor_proposta_manual || 0)
  const [manualMaior, setManualMaior] = useState<number>(dados.maior_proposta_manual || 0)

  const [herdeiros, setHerdeiros] = useState<Herdeiro[]>([])
  const [loadingHerdeiros, setLoadingHerdeiros] = useState(false)
  const [savingHerdeiros, setSavingHerdeiros] = useState(false)

  const totalCotas = herdeiros.reduce(
    (sum, h) => sum + Number(h.percentual_participacao || 0),
    0,
  )
  const hasHerdeiros = herdeiros.length > 0
  const cotasOk = Math.abs(totalCotas - 100) <= 0.01

  useEffect(() => {
    if (!precatorioId) return

    const loadHerdeiros = async () => {
      setLoadingHerdeiros(true)
      try {
        const supabase = getSupabase()
        if (!supabase) return

        const { data, error } = await supabase
          .from("precatorio_herdeiros")
          .select("id, nome_completo, cpf, percentual_participacao")
          .eq("precatorio_id", precatorioId)
          .order("created_at", { ascending: true })

        if (error) throw error
        setHerdeiros(data || [])
      } catch (error: any) {
        console.error("[StepPropostas] Erro ao carregar herdeiros:", error)
        toast.error(error.message || "Erro ao carregar herdeiros.")
      } finally {
        setLoadingHerdeiros(false)
      }
    }

    loadHerdeiros()
  }, [precatorioId])

  useEffect(() => {
    // Use posições fixas conforme fluxo: 0 dados, 1 índices, 2 atualização, 3 PSS, 4 IRPF, 5 honorários
    const etapaDados = resultadosEtapas[0] || {}
    const etapaAtualizacao = resultadosEtapas[2] || {}
    const etapaPss = resultadosEtapas[3] || {}
    const etapaIrpf = resultadosEtapas[4] || {}
    const etapaHonorarios = resultadosEtapas[5] || {}

    // Breakdown vindo do IRPF; fallback construído da Atualização Monetária
    let breakdown = etapaIrpf.breakdown || {}
    if (!breakdown.total_bruto) {
      const valorAtualizado = etapaAtualizacao.valor_atualizado || etapaAtualizacao.valorAtualizado || 0
      breakdown = {
        principal_original: dados.valor_principal_original || etapaDados.valor_principal_original || 0,
        correcao_monetaria: etapaAtualizacao.memoriaCalculo?.ipca?.resultado || 0,
        juros_pre_22: etapaAtualizacao.memoriaCalculo?.juros?.resultado || 0,
        selic: etapaAtualizacao.memoriaCalculo?.selic?.resultado || 0,
        ec136_2025: etapaAtualizacao.memoriaCalculo?.ipca2025?.resultado || 0,
        juros_moratorios_originais: dados.valor_juros_original || 0,
        total_bruto: valorAtualizado,
        base_irpf: etapaIrpf.baseIR || 0,
        descricao_faixa: etapaIrpf.faixa || "N/A"
      }
    }

    // Extract Values
    const totalBruto = breakdown.total_bruto || etapaAtualizacao.valor_atualizado || etapaAtualizacao.valorAtualizado || 0
    const valorPrincipal = breakdown.principal_original || dados.valor_principal_original || 0
    const correcaoMonetaria = breakdown.correcao_monetaria || 0
    const jurosPre22 = breakdown.juros_pre_22 || 0
    const valSelic = breakdown.selic || 0
    const valEc136 = breakdown.ec136_2025 || 0
    const jurosMoraOrig = breakdown.juros_moratorios_originais || dados.valor_juros_original || 0

    // Deductions
    const pssValor = etapaPss.pss_valor || etapaPss.pssTotal || 0
    const irpfValor = etapaIrpf.irpf_valor || etapaIrpf.valor_irpf || etapaIrpf.irTotal || 0

    const honorarios = etapaHonorarios.honorarios || etapaHonorarios || {}
    const honorariosPercentual = Number(honorarios.honorarios_percentual ?? dados.honorarios_percentual ?? 0)
    const adiantamentoPercentual = Number(honorarios.adiantamento_percentual ?? dados.adiantamento_percentual ?? 0)

    // Base Pré-descontos = bruto - PSS - IRPF
    const basePreDescontos = round2(totalBruto - pssValor - irpfValor)

    const honorariosValorAuto = round2(basePreDescontos * (honorariosPercentual / 100))
    const adiantamentoValorAuto = round2(basePreDescontos * (adiantamentoPercentual / 100))

    const isHonManual = honorarios.honorarios_manual || false
    const honorariosValorManual = Number(honorarios.honorarios_valor)
    const adiantamentoValorManual = Number(honorarios.adiantamento_valor)

    const honorariosValor = isHonManual && !Number.isNaN(honorariosValorManual)
      ? honorariosValorManual
      : honorariosValorAuto

    const adiantamentoValor = isHonManual && !Number.isNaN(adiantamentoValorManual)
      ? adiantamentoValorManual
      : adiantamentoValorAuto

    const baseLiquidaFinal = round2(basePreDescontos - honorariosValor - adiantamentoValor)

    const menorPropostaCalc = round2(baseLiquidaFinal * (percentualMenorProposta / 100))
    const maiorPropostaCalc = round2(baseLiquidaFinal * (percentualMaiorProposta / 100))

    let menorProposta = isManual ? manualMenor : menorPropostaCalc;
    let maiorProposta = isManual ? manualMaior : maiorPropostaCalc;

    if (!isManual) {
      menorProposta = menorPropostaCalc
      maiorProposta = maiorPropostaCalc
    }

    setCalculoFinal({
      breakdown, // Pass full breakdown for UI
      valor_atualizado: totalBruto,
      pss_valor: pssValor,
      irpf_valor: irpfValor,
      base_liquida_pre_descontos: basePreDescontos,
      honorarios_valor: honorariosValor,
      honorarios_percentual: honorariosPercentual,
      adiantamento_valor: adiantamentoValor,
      adiantamento_percentual: adiantamentoPercentual,
      base_liquida_final: baseLiquidaFinal,
      base_calculo_liquida: baseLiquidaFinal,
      valor_liquido_credor: baseLiquidaFinal,
      percentual_menor: percentualMenorProposta,
      percentual_maior: percentualMaiorProposta,
      menor_proposta: menorProposta,
      maior_proposta: maiorProposta,
      menorProposta: menorProposta,
      maiorProposta: maiorProposta,
    })
  }, [
    percentualMenorProposta,
    percentualMaiorProposta,
    resultadosEtapas,
    isManual,
    manualMenor,
    manualMaior
  ])

  const handleManualToggle = (checked: boolean) => {
    setIsManual(checked)
    if (checked && calculoFinal) {
      // Init manual values with current calculated values
      setManualMenor(calculoFinal.menor_proposta || 0)
      setManualMaior(calculoFinal.maior_proposta || 0)
    }
  }

  const handleHerdeiroPercentualChange = (id: string, value: string) => {
    const numericValue = Number(value)
    setHerdeiros((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, percentual_participacao: isNaN(numericValue) ? 0 : numericValue }
          : h,
      ),
    )
  }

  const salvarCotas = async () => {
    if (!precatorioId || !hasHerdeiros) return
    if (!cotasOk) {
      toast.error("As cotas dos herdeiros devem somar 100%.")
      return
    }

    setSavingHerdeiros(true)
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const updates = await Promise.all(
        herdeiros.map((h) =>
          supabase
            .from("precatorio_herdeiros")
            .update({ percentual_participacao: Number(h.percentual_participacao || 0) })
            .eq("id", h.id),
        ),
      )

      const firstError = updates.find((r) => r.error)?.error
      if (firstError) throw firstError

      toast.success("Cotas salvas com sucesso.")
    } catch (error: any) {
      console.error("[StepPropostas] Erro ao salvar cotas:", error)
      toast.error(error.message || "Erro ao salvar cotas.")
    } finally {
      setSavingHerdeiros(false)
    }
  }

  const handleAvancar = () => {
    if (hasHerdeiros && !cotasOk) {
      toast.error("As cotas dos herdeiros devem somar 100% antes de avancar.")
      return
    }

    if (!isManual && (percentualMenorProposta <= 0 || percentualMaiorProposta <= 0)) {
      toast.error("É necessário definir os percentuais das propostas (maior que zero).")
      return
    }

    setDados({
      ...dados,
      percentual_menor_proposta: percentualMenorProposta,
      percentual_maior_proposta: percentualMaiorProposta,
      propostas_manual: isManual,
      menor_proposta_manual: manualMenor,
      maior_proposta_manual: manualMaior
    })

    console.log("[v0] StepPropostas - Avançando com resultado final:", calculoFinal)

    if (calculoFinal) {
      onCompletar({
        ...calculoFinal,
        propostas_manual: isManual
      })
    } else {
      onCompletar({})
    }
  }

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Propostas</CardTitle>
            <CardDescription>
              Defina a faixa de proposta mínima e máxima com base no valor líquido final do credor
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2 shadow-sm">
            <Switch
              id="manual-mode-propostas"
              checked={isManual}
              onCheckedChange={handleManualToggle}
              className="
                border border-border/60 shadow-sm
                data-[state=checked]:bg-orange-500
                data-[state=unchecked]:bg-slate-300
                dark:data-[state=unchecked]:bg-slate-700
                [&>span]:bg-white
                dark:[&>span]:bg-slate-100
              "
            />
            <Label htmlFor="manual-mode-propostas" className="text-sm font-medium cursor-pointer">
              Modo Manual
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Percentual da menor proposta (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={percentualMenorProposta}
              onChange={(e) => setPercentualMenorProposta(Number(e.target.value) || 0)}
              disabled={isManual}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Percentual da maior proposta (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={percentualMaiorProposta}
              onChange={(e) => setPercentualMaiorProposta(Number(e.target.value) || 0)}
              disabled={isManual}
            />
          </div>
        </div>

        {loadingHerdeiros && (
          <div className="text-xs text-muted-foreground">Carregando herdeiros...</div>
        )}

        {hasHerdeiros && (
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Herdeiros</p>
                <p className="text-xs text-muted-foreground">
                  Defina a cota de cada herdeiro (total 100%).
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={salvarCotas}
                disabled={savingHerdeiros || !cotasOk}
              >
                {savingHerdeiros ? "Salvando..." : "Salvar cotas"}
              </Button>
            </div>

            <div className="space-y-2">
              {herdeiros.map((h) => (
                <div key={h.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.nome_completo}</p>
                    <p className="text-xs text-muted-foreground truncate">{h.cpf || "CPF N/I"}</p>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={Number(h.percentual_participacao || 0)}
                      onChange={(e) => handleHerdeiroPercentualChange(h.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total: {totalCotas.toFixed(2)}%</span>
              {cotasOk ? (
                <span className="text-emerald-600">Cotas OK</span>
              ) : (
                <span className="text-red-600">Deve somar 100%</span>
              )}
            </div>
          </div>
        )}

        {calculoFinal && (
          <div className="space-y-2 p-4 bg-muted rounded-lg border">
            <p className="text-sm font-medium mb-2 border-b pb-1">Preview do Cálculo Final (Detalhado)</p>
            <div className="grid gap-1 text-xs">

              <div className="flex justify-between text-slate-500"><span>Principal Original:</span> <span>{formatarMoeda(calculoFinal.breakdown?.principal_original || 0)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Correção (IPCA-E/IPCA):</span> <span>{formatarMoeda(calculoFinal.breakdown?.correcao_monetaria || 0)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Juros Pré-22:</span> <span>{formatarMoeda(calculoFinal.breakdown?.juros_pre_22 || 0)}</span></div>
              <div className="flex justify-between text-slate-500"><span>SELIC (Pós-22):</span> <span>{formatarMoeda(calculoFinal.breakdown?.selic || 0)}</span></div>
              <div className="flex justify-between text-slate-500"><span>EC 136/2025 (IPCA 2025):</span> <span>{formatarMoeda(calculoFinal.breakdown?.ec136_2025 || 0)}</span></div>
              <div className="flex justify-between text-slate-500 border-b pb-1 mb-1"><span>Juros Originais:</span> <span>{formatarMoeda(calculoFinal.breakdown?.juros_moratorios_originais || 0)}</span></div>

              <div className="flex justify-between font-bold text-sm">
                <span>Total Bruto:</span>
                <span>{formatarMoeda(calculoFinal.valor_atualizado)}</span>
              </div>

              <div className="flex justify-between text-red-600 mt-2">
                <span>(-) PSS:</span>
                <span>{formatarMoeda(calculoFinal.pss_valor)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>(-) IRPF ({calculoFinal.breakdown?.descricao_faixa || "N/A"}):</span>
                <span>{formatarMoeda(calculoFinal.irpf_valor)}</span>
              </div>

              <div className="flex justify-between border-t pt-2 font-medium">
                <span>Base pré-descontos:</span>
                <span>{formatarMoeda(calculoFinal.base_liquida_pre_descontos)}</span>
              </div>

              <div className="flex justify-between text-red-600">
                <span>(-) Honorários ({calculoFinal.honorarios_percentual?.toFixed(2) || "0.00"}%):</span>
                <span>{formatarMoeda(calculoFinal.honorarios_valor)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>(-) Adiantamento ({calculoFinal.adiantamento_percentual?.toFixed(2) || "0.00"}%):</span>
                <span>{formatarMoeda(calculoFinal.adiantamento_valor)}</span>
              </div>

              <div className="flex justify-between border-t pt-2 font-bold text-blue-600 text-sm">
                <span>Base líquida final (para propostas):</span>
                <span>{formatarMoeda(calculoFinal.base_liquida_final)}</span>
              </div>

              <div className="flex justify-between border-t border-blue-200 dark:border-blue-800 pt-3 mt-2 items-center">
                <span className="text-muted-foreground">
                  Menor proposta
                  {isManual ? <span className="text-amber-600 ml-1">(Manual)</span> : ` (${percentualMenorProposta}%)`}:
                </span>
                {isManual ? (
                  <Input
                    type="number"
                    step="0.01"
                    className="w-32 font-medium text-emerald-600 h-8"
                    value={manualMenor}
                    onChange={(e) => setManualMenor(Number(e.target.value) || 0)}
                  />
                ) : (
                  <span className="font-medium text-emerald-600">{formatarMoeda(calculoFinal.menor_proposta)}</span>
                )}
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className="text-muted-foreground">
                  Maior proposta
                  {isManual ? <span className="text-amber-600 ml-1">(Manual)</span> : ` (${percentualMaiorProposta}%)`}:
                </span>
                {isManual ? (
                  <Input
                    type="number"
                    step="0.01"
                    className="w-32 font-medium text-orange-600 h-8"
                    value={manualMaior}
                    onChange={(e) => setManualMaior(Number(e.target.value) || 0)}
                  />
                ) : (
                  <span className="font-medium text-orange-600">{formatarMoeda(calculoFinal.maior_proposta)}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>
            As propostas são calculadas sobre a base líquida final (após descontar PSS, IRPF, honorários e adiantamento)
          </span>
        </div>

        <div className="flex justify-between mt-4">
          <Button variant="outline" size="sm" onClick={voltar}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button size="sm" onClick={handleAvancar}>
            Avançar
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

      </CardContent>
    </Card>
  )
}
