"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Calculator, Info } from "lucide-react"
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
  const [periodosJuros, setPeriodosJuros] = useState<Array<{ periodo: string; indice: number }>>([])

  useEffect(() => {
    if (!dados.data_final_calculo) {
      const hoje = new Date().toISOString().split("T")[0]
      setDados({ ...dados, data_final_calculo: hoje })
    }
  }, [])

  const handleChange = (field: string, value: any) => {
    setDados({ ...dados, [field]: value })
  }

  useEffect(() => {
    if (dados.data_base) {
      const resultado = calcularJurosMoratoriosAcumulados(dados.data_base)
      setTaxaJurosMora(resultado.taxaTotal)
      setPeriodosJuros(resultado.periodos)
    }
  }, [dados.data_base])

  useEffect(() => {
    if (dados.data_base && dados.data_inicial_calculo && dados.data_final_calculo && dados.valor_principal_original) {
      try {
        const calc = calcularPrecatorio({
          ...dados,
          taxa_juros_mora: taxaJurosMora, // Usar a taxa calculada
          taxa_juros_moratorios: taxaJurosMora,
          juros_mora_percentual: taxaJurosMora / 100,
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
  }, [dados, taxaJurosMora]) // Adicionar taxaJurosMora como dependência

  // Cálculos locais para consistência com a visualização
  const valorPrincipal = dados.valor_principal_original || 0
  const valorJurosOrig = dados.valor_juros_original || 0
  const valorSelicOrig = dados.multa || 0
  const totalBase = valorPrincipal + valorJurosOrig + valorSelicOrig
  const valorJurosMoraCalculado = (totalBase * taxaJurosMora) / 100
  const valorAtualizadoCalculado = totalBase + valorJurosMoraCalculado

  const handleAvancar = () => {
    const dadosAtualizados = {
      ...dados,
      taxa_juros_mora: taxaJurosMora,
      taxa_juros_moratorios: taxaJurosMora,
      juros_mora_percentual: taxaJurosMora / 100,
    }
    setDados(dadosAtualizados)

    console.log("[v0] StepAtualizacaoMonetaria - Salvando valor_atualizado:", valorAtualizadoCalculado)

    onCompletar({
      ...resultado,
      taxa_juros_mora: taxaJurosMora,
      taxa_juros_moratorios: taxaJurosMora,
      valorAtualizado: valorAtualizadoCalculado,
      valor_atualizado: valorAtualizadoCalculado,
      valorJuros: valorJurosMoraCalculado, // Atualiza juros também
      juros_mora: valorJurosMoraCalculado,
      multa: valorSelicOrig, // Garante que multa/selic seja passada
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atualização Monetária</CardTitle>
        <CardDescription>
          Configure as datas para cálculo da atualização monetária (SELIC até 12/2021, IPCA-E depois)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs">Data Base</Label>
            <Input
              type="date"
              value={dados.data_base || ""}
              onChange={(e) => handleChange("data_base", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Data Inicial do Cálculo</Label>
            <Input
              type="date"
              value={dados.data_inicial_calculo || ""}
              onChange={(e) => handleChange("data_inicial_calculo", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Data Final do Cálculo</Label>
            <Input
              type="date"
              value={dados.data_final_calculo || ""}
              onChange={(e) => handleChange("data_final_calculo", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Data atual preenchida automaticamente</p>
          </div>
        </div>

        {dados.data_base && taxaJurosMora > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Calculadora de Juros Moratórios
              </h4>
            </div>
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">Data base do crédito:</span>
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {new Date(dados.data_base).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700 dark:text-blue-300">Período considerado:</span>
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {new Date(dados.data_base).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })} até{" "}
                  {periodosJuros.length > 0
                    ? periodosJuros[periodosJuros.length - 1].periodo.split(" - ")[1]
                    : new Date().toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between border-t border-blue-300 dark:border-blue-700 pt-2">
                <span className="font-semibold text-blue-900 dark:text-blue-100">Taxa total de juros moratórios:</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{taxaJurosMora.toFixed(4)}%</span>
              </div>
              {dados.valor_principal_original && (
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Juros sobre Total (P+J+S):</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    {(((dados.valor_principal_original + (dados.valor_juros_original || 0) + (dados.multa || 0)) * taxaJurosMora) / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-start gap-1 text-xs text-blue-700 dark:text-blue-300 mt-2">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>
                Soma acumulada dos índices SELIC/IPCA-E da tabela oficial desde a data base até o período atual.
              </span>
            </div>
          </div>
        )}

        {resultado && (
          <div className="space-y-2 p-3 bg-muted rounded-md">
            <h4 className="text-sm font-medium">Resultado da Atualização</h4>
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">Valor Original (P+J+S): </span>
                <span className="font-medium">
                  {totalBase.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Valor Atualizado: </span>
                <span className="font-medium">
                  {valorAtualizadoCalculado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Juros de Mora (sobre Total): </span>
                <span className="font-medium">
                  {valorJurosMoraCalculado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          </div>
        )}

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
