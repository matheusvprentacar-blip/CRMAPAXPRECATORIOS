"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  useEffect(() => {
    const etapaAtualizacao = resultadosEtapas[1] || {}
    const etapaPss = resultadosEtapas[2] || {}
    const etapaIrpf = resultadosEtapas[3] || {}
    const etapaHonorarios = resultadosEtapas[4] || {}

    console.log("[v0] StepPropostas - Etapa Atualização:", etapaAtualizacao)
    console.log("[v0] StepPropostas - Etapa PSS:", etapaPss)
    console.log("[v0] StepPropostas - Etapa IRPF:", etapaIrpf)
    console.log("[v0] StepPropostas - Etapa Honorários:", etapaHonorarios)

    // Extrair valor atualizado (com fallbacks para diferentes nomes)
    const valorAtualizado =
      etapaAtualizacao.valor_atualizado ||
      etapaAtualizacao.valorAtualizado ||
      etapaAtualizacao.valor_corrigido_monetariamente ||
      0

    // Extrair PSS
    const pssValor = etapaPss.pss_valor || etapaPss.pssTotal || etapaPss.pss_atualizado || 0

    // Extrair IRPF
    const irpfValor = etapaIrpf.valor_irpf || etapaIrpf.irTotal || etapaIrpf.irpf_valor || 0

    console.log("[v0] Valores extraídos - Atualizado:", valorAtualizado, "PSS:", pssValor, "IRPF:", irpfValor)

    const basePreDescontos = round2(valorAtualizado - pssValor - irpfValor)
    console.log("[v0] Base pré-descontos calculada:", basePreDescontos)

    const honorarios = etapaHonorarios.honorarios || etapaHonorarios || {}
    const honorariosPercentual = Number(honorarios.honorarios_percentual || 0)
    const adiantamentoPercentual = Number(honorarios.adiantamento_percentual || 0)

    console.log("[v0] Percentuais - Honorários:", honorariosPercentual, "% Adiantamento:", adiantamentoPercentual, "%")

    const honorariosValor = round2(basePreDescontos * (honorariosPercentual / 100))
    const adiantamentoValor = round2(basePreDescontos * (adiantamentoPercentual / 100))

    console.log("[v0] Valores calculados - Honorários:", honorariosValor, "Adiantamento:", adiantamentoValor)

    const baseLiquidaFinal = round2(basePreDescontos - honorariosValor - adiantamentoValor)
    console.log("[v0] Base líquida final:", baseLiquidaFinal)

    const menorProposta = round2(baseLiquidaFinal * (percentualMenorProposta / 100))
    const maiorProposta = round2(baseLiquidaFinal * (percentualMaiorProposta / 100))

    console.log("[v0] Propostas - Menor:", menorProposta, "Maior:", maiorProposta)

    setCalculoFinal({
      valor_atualizado: valorAtualizado,
      pss_valor: pssValor,
      irpf_valor: irpfValor,
      base_liquida_pre_descontos: basePreDescontos,
      honorarios_valor: honorariosValor,
      honorarios_percentual: honorariosPercentual,
      adiantamento_valor: adiantamentoValor,
      adiantamento_percentual: adiantamentoPercentual,
      base_liquida_final: baseLiquidaFinal,
      base_calculo_liquida: baseLiquidaFinal, // Alias para compatibilidade
      valor_liquido_credor: baseLiquidaFinal, // Alias para compatibilidade
      percentual_menor: percentualMenorProposta,
      percentual_maior: percentualMaiorProposta,
      menor_proposta: menorProposta,
      maior_proposta: maiorProposta,
      menorProposta: menorProposta, // Alias camelCase
      maiorProposta: maiorProposta, // Alias camelCase
    })
  }, [percentualMenorProposta, percentualMaiorProposta, resultadosEtapas])

  const handleAvancar = () => {
    setDados({
      ...dados,
      percentual_menor_proposta: percentualMenorProposta,
      percentual_maior_proposta: percentualMaiorProposta,
    })

    console.log("[v0] StepPropostas - Avançando com resultado final:", calculoFinal)

    if (calculoFinal) {
      onCompletar(calculoFinal)
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
        <CardTitle>Propostas</CardTitle>
        <CardDescription>
          Defina a faixa de proposta mínima e máxima com base no valor líquido final do credor
        </CardDescription>
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
            />
          </div>
        </div>

        {calculoFinal && (
          <div className="space-y-2 p-4 bg-muted rounded-lg border">
            <p className="text-sm font-medium mb-2">Preview do Cálculo Final</p>
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor atualizado:</span>
                <span className="font-medium">{formatarMoeda(calculoFinal.valor_atualizado)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>(-) PSS:</span>
                <span>{formatarMoeda(calculoFinal.pss_valor)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>(-) IRPF:</span>
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
              <div className="flex justify-between border-t pt-2 font-bold text-blue-600">
                <span>Base líquida final (para propostas):</span>
                <span>{formatarMoeda(calculoFinal.base_liquida_final)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-muted-foreground">Menor proposta ({percentualMenorProposta}%):</span>
                <span className="font-medium text-emerald-600">{formatarMoeda(calculoFinal.menor_proposta)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maior proposta ({percentualMaiorProposta}%):</span>
                <span className="font-medium text-orange-600">{formatarMoeda(calculoFinal.maior_proposta)}</span>
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
