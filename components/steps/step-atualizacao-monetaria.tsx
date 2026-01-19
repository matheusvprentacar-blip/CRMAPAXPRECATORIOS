"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Info } from "lucide-react"
import { calcularPrecatorio } from "@/lib/calculos/calcular-precatorio"
import { calcularJurosMoratoriosAcumulados } from "@/lib/calculos/indices"

interface StepAtualizacaoMonetariaProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
}

export function StepAtualizacaoMonetaria({ dados, setDados, onCompletar, voltar }: StepAtualizacaoMonetariaProps) {
  const [resultado, setResultado] = useState<any>(null)
  const [taxaJurosMora, setTaxaJurosMora] = useState<number>(0)

  useEffect(() => {
    if (!dados.data_final_calculo) {
      const hoje = new Date().toISOString().split("T")[0]
      setDados({ ...dados, data_final_calculo: hoje })
    }
  }, [])

  // Effect for Juros Calculation (remains active for reference)
  useEffect(() => {
    if (dados.data_base) {
      const resultado = calcularJurosMoratoriosAcumulados(dados.data_base)
      setTaxaJurosMora(resultado.taxaTotal)
    }
  }, [dados.data_base])

  // AUTOMATIC CALCULATION EFFECT
  useEffect(() => {
    // Only calculate if we have minimal data
    if (dados.data_base && dados.valor_principal_original) {
      try {
        console.log("[v0] Auto-calculating in StepAtualizacaoMonetaria...", dados);
        const calc = calcularPrecatorio({
          ...dados,
          taxa_juros_mora: taxaJurosMora,
          taxa_juros_moratorios: taxaJurosMora,
          juros_mora_percentual: taxaJurosMora / 100,
          taxa_juros_pre_22_acumulada: taxaJurosMora, // Pass pre-calculated rate
          aliquota_irpf: 0,
          aliquota_pss: 0,
          tem_desconto_pss: true,
          percentual_menor_proposta: 65,
          percentual_maior_proposta: 66,
          salario_minimo_vigente: 1412,
        })
        setResultado(calc)
      } catch (error) {
        console.error("[v0] Erro ao calcular:", error)
      }
    }
  }, [dados, taxaJurosMora])

  const handleAvancar = () => {
    if (!resultado) return;

    const finalResult = {
      ...resultado,
      taxa_juros_mora: taxaJurosMora,
      // Ensure we pass the calculated values
      valorJuros: resultado.valorJuros,
      juros_mora: resultado.valorJuros,
      multa: dados.multa || 0,
    }

    console.log("[v0] StepAtualizacaoMonetaria (AUTO) - Salvando:", finalResult)

    setDados({
      ...dados,
      taxa_juros_mora: taxaJurosMora,
      taxa_juros_moratorios: taxaJurosMora,
      juros_mora_percentual: taxaJurosMora / 100,
    })

    onCompletar(finalResult)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Atualização Monetária (Automática)</CardTitle>
            <CardDescription>
              Cálculo realizado com base nos índices e datas configurados.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Read-only Data Summary */}
        <div className="grid gap-4 md:grid-cols-3 p-4 bg-muted/20 rounded-lg border border-dashed">
          <div>
            <Label className="text-xs text-muted-foreground">Data Base</Label>
            <div className="font-medium text-sm">{dados.data_base ? new Date(dados.data_base + 'T12:00:00').toLocaleDateString("pt-BR") : "-"}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Data Cálculo Final</Label>
            <div className="font-medium text-sm">{dados.data_final_calculo ? new Date(dados.data_final_calculo + 'T12:00:00').toLocaleDateString("pt-BR") : "-"}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Principal Original</Label>
            <div className="font-medium text-sm">{(dados.valor_principal_original || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
          </div>
        </div>

        {/* MEMÓRIA DE CÁLCULO DETALHADA */}
        {resultado?.memoriaCalculo ? (
          <div className="space-y-3 border rounded-md p-3 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 border-b pb-2 mb-2">
              <Info className="w-4 h-4" />
              <h4 className="text-sm font-bold">Memória de Cálculo (Detalhamento)</h4>
            </div>

            <div className="grid gap-3 text-xs">
              {/* Etapa 1: IPCA */}
              {resultado.memoriaCalculo.ipca && (
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <div>
                    <span className="font-semibold text-blue-700 dark:text-blue-400 block">1. Correção Monetária (IPCA-E)</span>
                    <span className="text-muted-foreground font-mono">
                      {resultado.memoriaCalculo.ipca.formula}
                    </span>
                    <div className="text-slate-500 mt-1">
                      {resultado.memoriaCalculo.ipca.base ? (
                        <>
                          ({resultado.memoriaCalculo.ipca.principalOriginal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ÷ {resultado.memoriaCalculo.ipca.fatorInicial?.toFixed(7)}) × {resultado.memoriaCalculo.ipca.fatorFinal?.toFixed(7)}
                        </>
                      ) : (
                        <>Fator In: {resultado.memoriaCalculo.ipca.fatorInicial?.toFixed(7)} | Fator Out: {resultado.memoriaCalculo.ipca.fatorFinal?.toFixed(7)}</>
                      )}
                    </div>
                  </div>
                  <div className="font-bold font-mono text-base text-blue-800 dark:text-blue-300">
                    {resultado.memoriaCalculo.ipca.resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              )}

              {/* Etapa 2: Juros */}
              {resultado.memoriaCalculo.juros && (
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center border-t border-dashed pt-2">
                  <div>
                    <span className="font-semibold text-orange-700 dark:text-orange-400 block">2. Juros Moratórios (Pré-2022)</span>
                    <span className="text-muted-foreground font-mono">
                      {resultado.memoriaCalculo.juros.formula}
                    </span>
                    <div className="text-slate-500 mt-1">
                      {resultado.memoriaCalculo.juros.base?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} × {resultado.memoriaCalculo.juros.percentual?.toFixed(4)}%
                    </div>
                  </div>
                  <div className="font-bold font-mono text-base text-orange-800 dark:text-orange-300">
                    {resultado.memoriaCalculo.juros.resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              )}

              {/* Etapa 3: SELIC */}
              {resultado.memoriaCalculo.selic && (
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center border-t border-dashed pt-2">
                  <div>
                    <span className="font-semibold text-green-700 dark:text-green-400 block">3. SELIC Acumulada (Pós-2022)</span>
                    <span className="text-muted-foreground font-mono">
                      {resultado.memoriaCalculo.selic.formula}
                    </span>
                    <div className="text-slate-500 mt-1">
                      {resultado.memoriaCalculo.selic.base?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} × {resultado.memoriaCalculo.selic.percentual?.toFixed(4)}%
                    </div>
                  </div>
                  <div className="font-bold font-mono text-base text-green-800 dark:text-green-300">
                    {resultado.memoriaCalculo.selic.resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              )}

              {/* Total Calculation */}
              <div className="border-t-2 border-slate-300 pt-3 mt-2 flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded">
                <div>
                  <span className="font-bold uppercase text-xs text-muted-foreground block">Valor Atualizado Final</span>
                  <span className="text-[10px] text-muted-foreground">(Soma dos itens 1, 2 e 3)</span>
                </div>
                <span className="font-bold text-2xl text-slate-900 dark:text-white">
                  {(resultado.memoriaCalculo.ipca.resultado + resultado.memoriaCalculo.juros.resultado + resultado.memoriaCalculo.selic.resultado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground bg-muted/10 rounded-lg flex flex-col items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <p>Calculando atualização monetária...</p>
          </div>
        )}

        <div className="flex justify-between mt-4">
          <Button variant="outline" size="sm" onClick={voltar}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button size="sm" onClick={handleAvancar} disabled={!resultado}>
            Avançar
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
