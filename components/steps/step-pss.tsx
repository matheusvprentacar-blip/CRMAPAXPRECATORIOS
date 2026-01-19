"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, ArrowRight, Calculator } from "lucide-react"
import { useEffect, useState } from "react"

interface StepPSSProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  resultadosEtapas: any[]
}

export function StepPSS({ dados, setDados, onCompletar, voltar, resultadosEtapas }: StepPSSProps) {
  // Estados de Entrada
  const [pssOficio, setPssOficio] = useState<number>(dados.pss_oficio_valor || 0)
  const [isento, setIsento] = useState<boolean>(dados.isento_pss || false)
  const [isManual, setIsManual] = useState<boolean>(dados.pss_manual || false)
  const [pssManualValor, setPssManualValor] = useState<number>(dados.pss_valor || 0)

  // Estados Calculados (Breakdown)
  const [pssIPCA, setPssIPCA] = useState<number>(0)
  const [pssSelic, setPssSelic] = useState<number>(0)
  const [pssTotalAuto, setPssTotalAuto] = useState<number>(0)

  // Fatores (para exibição)
  const [fatorIPCA, setFatorIPCA] = useState<number>(0)
  const [fatorSelic, setFatorSelic] = useState<number>(0)

  // EFFECT: Calcular
  useEffect(() => {
    // Etapa 1 = Índices (Fatores Puros)
    const indices = resultadosEtapas[1]

    let valIPCA = 0
    let valSelic = 0
    let total = 0
    let fIPCA = 0
    let fSelic = 0

    if (indices && pssOficio > 0) {
      // 1. Calcular IPCA-E: (Valor / FatorData) * FatorTeto
      // Se o fator inicial for válido ( > 0), aplica a regra. Se não (pós-2022), não tem IPCA.
      if (indices.ipca_fator_inicial > 0 && indices.ipca_fator_final > 0) {
        const fInicial = indices.ipca_fator_inicial
        const fFinal = indices.ipca_fator_final

        valIPCA = (pssOficio / fInicial) * fFinal

        // Fator efetivo para exibição
        fIPCA = fFinal / fInicial
      } else {
        // Sem IPCA, o valor base permanece o mesmo? 
        // Não, se não tem correção IPCA (ex: pós 2022), o valor "base" corrigido é o próprio original
        // (Se a regra for IPCA + Selic, e IPCA for 0%, é Original + Selic)
        valIPCA = pssOficio
        fIPCA = 1
      }

      // 2. Calcular SELIC: Valor * (Percentual / 100)
      if (indices.selic_acumulada_percentual > 0) {
        fSelic = indices.selic_acumulada_percentual / 100
        valSelic = pssOficio * fSelic
      }

      // 3. Total = (Valor Corrigido pelo IPCA) + (Juros Selic sobre o Principal)
      // [ATENÇÃO]: O usuário disse "pss atualizado = valor principal de pss + ipca pss + selic pss"
      // Se valIPCA já é (Principal * Correção), ele já contém o "valor principal + ipca pss".
      // Então Total = valIPCA + valSelic está correto.
      total = valIPCA + valSelic
    }

    setPssIPCA(valIPCA)
    setPssSelic(valSelic)
    setPssTotalAuto(total)
    setFatorIPCA(fIPCA)
    setFatorSelic(fSelic)

  }, [pssOficio, resultadosEtapas, dados.valor_principal_original])

  // Handlers
  const handleAvancar = () => {
    const valorFinal = isManual ? pssManualValor : pssTotalAuto

    const dadosAtualizados = {
      ...dados,
      pss_oficio_valor: isento ? 0 : pssOficio,
      isento_pss: isento,
      pss_manual: isManual,
      pss_valor: isento ? 0 : valorFinal,
      dados_calculo: {
        ...(dados.dados_calculo || {}),
        pss_detalhe: {
          base: pssOficio,
          correcao_ipca: pssIPCA,
          selic: pssSelic,
          fator_ipca: fatorIPCA,
          fator_selic: fatorSelic
        }
      },
    }
    setDados(dadosAtualizados)

    onCompletar({
      pss_oficio_valor: isento ? 0 : pssOficio,
      pss_valor: isento ? 0 : valorFinal,
      pssTotal: isento ? 0 : valorFinal,
      pss_atualizado: isento ? 0 : valorFinal,
      tem_desconto_pss: !isento,
      isento_pss: isento,
      pss_manual: isManual,
    })
  }

  const formatarMoeda = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>PSS - Previdência Social</CardTitle>
            <CardDescription>
              Informe o valor original do PSS. O cálculo seguirá as mesmas etapas do principal (IPCA + SELIC).
            </CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="isento-pss" checked={isento} onCheckedChange={(c) => setIsento(!!c)} />
              <Label htmlFor="isento-pss">Isento</Label>
            </div>
            {!isento && (
              <div className="flex items-center space-x-2 bg-secondary/50 p-2 rounded-lg text-xs font-semibold">
                <Switch id="manual-mode-pss" checked={isManual} onCheckedChange={(c) => setIsManual(!!c)} />
                <Label htmlFor="manual-mode-pss">Modo Manual</Label>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isento ? (
          <>
            {/* Input PSS Ofício */}
            <div className="max-w-xs">
              <Label className="text-sm font-semibold">Valor do PSS no Ofício (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={pssOficio}
                onChange={(e) => setPssOficio(Number.parseFloat(e.target.value) || 0)}
                className="text-lg mt-1"
              />
            </div>

            {/* Detalhamento do Cálculo Automático - Estilo "Cartão de Memória" */}
            {!isManual && (
              <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
                <div className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-300">
                  <Calculator className="w-4 h-4" />
                  <h4 className="text-sm font-bold">Memória de Cálculo (Automático)</h4>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2 text-sm border-b pb-2">
                  <span className="text-muted-foreground">1. Correção (IPCA-E)</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {formatarMoeda(pssOficio)} × {fatorIPCA.toFixed(6)} = {formatarMoeda(pssIPCA)}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2 text-sm border-b pb-2">
                  <span className="text-muted-foreground">2. SELIC (Proporcional)</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatarMoeda(pssOficio)} × {fatorSelic.toFixed(6)} = {formatarMoeda(pssSelic)}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2 items-center pt-1">
                  <span className="font-bold uppercase text-xs">Total PSS Atualizado</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatarMoeda(pssTotalAuto)}
                  </span>
                </div>
              </div>
            )}

            {/* Input Manual Override */}
            {isManual && (
              <div className="space-y-2 p-4 border border-amber-200 bg-amber-50 rounded-md">
                <Label className="text-amber-700 font-bold">Valor PSS Manual (Total)</Label>
                <Input
                  type="number"
                  className="font-bold text-lg border-amber-400"
                  value={pssManualValor}
                  onChange={(e) => setPssManualValor(Number.parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-amber-600">Você está definindo o valor final manualmente.</p>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center bg-muted/20 rounded border border-dashed text-muted-foreground">
            Isento de PSS. Valor: R$ 0,00.
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={voltar}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handleAvancar}>
            Avançar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
