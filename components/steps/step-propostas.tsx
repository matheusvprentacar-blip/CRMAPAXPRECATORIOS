"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, ArrowRight, Info } from "lucide-react"

interface StepPropostasProps {
  dados: any
  setDados: (dados: any) => void
  resultadosEtapas: any[]
  onCompletar: (resultado: any) => void
  voltar: () => void
}

const round2 = (value: number) => Math.round(value * 100) / 100

export function StepPropostas({ dados, setDados, resultadosEtapas, onCompletar, voltar }: StepPropostasProps) {
  const [percentualMenorProposta, setPercentualMenorProposta] = useState(dados.percentual_menor_proposta || 60)
  const [percentualMaiorProposta, setPercentualMaiorProposta] = useState(dados.percentual_maior_proposta || 65)
  const [calculoFinal, setCalculoFinal] = useState<any>(null)

  const [isManual, setIsManual] = useState<boolean>(dados.propostas_manual || false)
  const [manualMenor, setManualMenor] = useState<number>(dados.menor_proposta_manual || 0)
  const [manualMaior, setManualMaior] = useState<number>(dados.maior_proposta_manual || 0)

  useEffect(() => {
    // ROBUST DATA EXTRACTION
    // Instead of relying on hardcoded indices (which might shift), we try to find the relevant steps
    // based on their content structure or known properties.

    // Find Atualizacao Step (looks for 'valorAtualizado' or 'memoriaCalculo')
    // We filter for objects that are NOT null/undefined first
    const validSteps = resultadosEtapas.filter(r => r);

    const etapaAtualizacao = validSteps.find(r => r.valorAtualizado !== undefined || r.memoriaCalculo) || {}

    // Find IRPF Step (looks for 'irpf_valor' or 'breakdown')
    const etapaIrpf = validSteps.find(r => r.irpf_valor !== undefined || r.breakdown) || {}

    // Find PSS Step (looks for 'pss_valor')
    const etapaPss = validSteps.find(r => r.pss_valor !== undefined || r.pssTotal !== undefined) || {}

    // Find Honorarios Step (looks for 'honorarios' object or percentual)
    const etapaHonorarios = validSteps.find(r => r.honorarios || r.honorarios_percentual !== undefined) || {}

    console.log("[v2] StepPropostas - Detected Steps:", {
      atualizacao: etapaAtualizacao,
      irpf: etapaIrpf,
      pss: etapaPss,
      honorarios: etapaHonorarios
    })

    const etapaDados = validSteps[0] || {} // Dados Basicos usually 0

    // The Auditor (Step IRPF) now returns a 'breakdown' object.
    // IF MISSING (user didn't re-run Auditor), construct fallback from Atualizacao
    let breakdown = etapaIrpf.breakdown || {}

    // FALLBACK: If total_bruto is missing, use Atualizacao
    if (!breakdown.total_bruto) {
      // Try to pull from Atualizacao
      const valorAtualizado = etapaAtualizacao.valorAtualizado || etapaAtualizacao.valor_atualizado || 0
      if (valorAtualizado > 0) {
        console.log("[v2] Breakdown missing, constructing fallback from Atualizacao...", valorAtualizado)
        breakdown = {
          principal_original: dados.valor_principal_original || etapaDados.valor_principal_original || 0,
          correcao_monetaria: etapaAtualizacao.memoriaCalculo?.ipca?.resultado || 0,
          juros_pre_22: etapaAtualizacao.memoriaCalculo?.juros?.resultado || 0,
          selic: etapaAtualizacao.memoriaCalculo?.selic?.resultado || 0,
          juros_moratorios_originais: dados.valor_juros_original || 0,
          total_bruto: valorAtualizado,
          base_irpf: 0,
          descricao_faixa: "N/A (Legado)"
        }
      }
    }

    // Extract Values
    const totalBruto = breakdown.total_bruto || etapaAtualizacao.valorAtualizado || 0
    const valorPrincipal = breakdown.principal_original || dados.valor_principal_original || 0
    const correcaoMonetaria = breakdown.correcao_monetaria || 0
    const jurosPre22 = breakdown.juros_pre_22 || 0
    const valSelic = breakdown.selic || 0
    const jurosMoraOrig = breakdown.juros_moratorios_originais || dados.valor_juros_original || 0

    // Deductions
    const pssValor = etapaPss.pss_valor || etapaPss.pssTotal || 0
    const irpfValor = etapaIrpf.irpf_valor || etapaIrpf.valor_irpf || etapaIrpf.irTotal || 0

    const honorarios = etapaHonorarios.honorarios || etapaHonorarios || {}
    const honorariosPercentual = Number(honorarios.honorarios_percentual || 0)
    const adiantamentoPercentual = Number(honorarios.adiantamento_percentual || 0)

    // Check manual overrides for Honorarios
    let honorariosValor = 0;
    let adiantamentoValor = 0;
    const isHonManual = etapaHonorarios.honorarios_manual || honorarios.honorarios_manual || false;

    // Base Pre Descontos Logic
    const basePreDescontos = round2(totalBruto - pssValor - irpfValor)

    if (isHonManual || (honorarios.honorarios_valor !== undefined && honorarios.honorarios_valor !== null)) {
      honorariosValor = Number(honorarios.honorarios_valor)
      adiantamentoValor = Number(honorarios.adiantamento_valor)
    } else {
      honorariosValor = round2(basePreDescontos * (honorariosPercentual / 100))
      adiantamentoValor = round2(basePreDescontos * (adiantamentoPercentual / 100))
    }

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

  const handleAvancar = () => {
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
          <div className="flex items-center space-x-2 bg-secondary/50 p-2 rounded-lg border border-secondary">
            <Switch id="manual-mode-propostas" checked={isManual} onCheckedChange={handleManualToggle} />
            <Label htmlFor="manual-mode-propostas" className="cursor-pointer font-semibold">
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

        {calculoFinal && (
          <div className="space-y-2 p-4 bg-muted rounded-lg border">
            <p className="text-sm font-medium mb-2 border-b pb-1">Preview do Cálculo Final (Detalhado)</p>
            <div className="grid gap-1 text-xs">

              <div className="flex justify-between text-slate-500"><span>Principal Original:</span> <span>{formatarMoeda(calculoFinal.breakdown?.principal_original || 0)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Correção (IPCA-E/IPCA):</span> <span>{formatarMoeda(calculoFinal.breakdown?.correcao_monetaria || 0)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Juros Pré-22:</span> <span>{formatarMoeda(calculoFinal.breakdown?.juros_pre_22 || 0)}</span></div>
              <div className="flex justify-between text-slate-500"><span>SELIC (Pós-22):</span> <span>{formatarMoeda(calculoFinal.breakdown?.selic || 0)}</span></div>
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

        {/* DEBUG SENSOR - REMOVE AFTER FIX */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-mono text-yellow-800">
          <p className="font-bold border-b border-yellow-200 pb-1 mb-2">🕵️ DEBUG DATA (Tire Print se os valores estiverem errados)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>Principal Raw: {dados.valor_principal_original}</div>
            <div>Principal Calculo: {calculoFinal?.breakdown?.principal_original}</div>
            <div>Bruto (Proposta): {calculoFinal?.valor_atualizado}</div>
            <div>IPCA Inicial: {dados.ipca_fator_inicial}</div>
            <div>IPCA Final: {dados.ipca_fator_final}</div>
            <div className="col-span-2 overflow-hidden truncate">Breakdown: {JSON.stringify(calculoFinal?.breakdown || "N/A")}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
