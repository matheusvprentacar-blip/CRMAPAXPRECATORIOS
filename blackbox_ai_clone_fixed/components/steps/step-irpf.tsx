"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Info, Calculator } from "lucide-react"
import { useState, useEffect } from "react"

interface StepIRPFProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  resultadosEtapas: any[]
  voltar: () => void
}

export function StepIRPF({ dados, setDados, onCompletar, resultadosEtapas, voltar }: StepIRPFProps) {
  const [preview, setPreview] = useState<any>(null)
  const [calculadoraSM, setCalculadoraSM] = useState<any>(null)

  useEffect(() => {
    if (dados.valor_principal_original && dados.taxa_juros_moratorios && dados.salario_minimo_referencia) {
      const valorJuros = dados.valor_principal_original * (dados.taxa_juros_moratorios / 100)
      const valorTotal = dados.valor_principal_original + valorJuros
      const qtdSalarios = dados.salario_minimo_referencia > 0 ? valorTotal / dados.salario_minimo_referencia : 0

      setCalculadoraSM({
        valorJuros,
        valorTotal,
        qtdSalarios,
      })
    } else {
      setCalculadoraSM(null)
    }
  }, [dados.valor_principal_original, dados.taxa_juros_moratorios, dados.salario_minimo_referencia])

  useEffect(() => {
    if (
      dados.meses_execucao_anterior &&
      dados.valor_principal_original &&
      dados.valor_juros_original !== undefined &&
      dados.multa !== undefined
    ) {
      const baseExecucao = dados.valor_principal_original + dados.valor_juros_original + dados.multa
      const baseMensal = baseExecucao / dados.meses_execucao_anterior

      console.log("[v0] ===== PREVIEW IRPF =====")
      console.log("[v0] Base Execução (P+J+M):", baseExecucao.toFixed(2))
      console.log("[v0] Meses:", dados.meses_execucao_anterior)
      console.log("[v0] Base Mensal:", baseMensal.toFixed(2))

      // Tabela IRPF mensal
      const faixas = [
        { limite: 1903.98, aliquota: 0, parcela_deduzir: 0, descricao: "Isento" },
        { limite: 2826.65, aliquota: 7.5, parcela_deduzir: 142.8, descricao: "7,5%" },
        { limite: 3751.05, aliquota: 15, parcela_deduzir: 354.8, descricao: "15%" },
        { limite: 4664.68, aliquota: 22.5, parcela_deduzir: 636.13, descricao: "22,5%" },
        { limite: Number.POSITIVE_INFINITY, aliquota: 27.5, parcela_deduzir: 869.36, descricao: "27,5%" },
      ]

      // Seleciona faixa baseado na base mensal
      let faixaAplicada = faixas[0]
      for (const faixa of faixas) {
        if (baseMensal <= faixa.limite) {
          faixaAplicada = faixa
          break
        }
      }

      console.log("[v0] Faixa aplicada:", faixaAplicada.descricao)

      const deducaoTotal = faixaAplicada.parcela_deduzir * dados.meses_execucao_anterior

      const resultadoAtualizacao = resultadosEtapas[1] // Step de atualização monetária (índice correto)

      // Tentar múltiplos caminhos para pegar o valor atualizado
      const valorAtualizado =
        resultadoAtualizacao?.valor_atualizado ??
        resultadoAtualizacao?.valorAtualizado ??
        resultadoAtualizacao?.atualizacao?.valor_atualizado ??
        resultadoAtualizacao?.atualizacao?.valorAtualizado ??
        baseExecucao // Fallback para base execução se não encontrar

      console.log("[v0] Valor Atualizado da etapa anterior:", valorAtualizado.toFixed(2))

      const irBruto = valorAtualizado * (faixaAplicada.aliquota / 100)
      const irpfTotal = Math.max(0, irBruto - deducaoTotal)

      console.log("[v0] IR Bruto:", irBruto.toFixed(2))
      console.log("[v0] Dedução Total:", deducaoTotal.toFixed(2))
      console.log("[v0] IRPF Total:", irpfTotal.toFixed(2))
      console.log("[v0] =========================")

      setPreview({
        baseExecucao,
        baseMensal,
        faixaAplicada,
        deducaoTotal,
        meses: dados.meses_execucao_anterior,
        valorAtualizado, // Usar valor atualizado em vez de saldoCredorSemDesconto
        irBruto,
        irpfTotal,
      })
    } else {
      setPreview(null)
    }
  }, [
    dados.valor_principal_original,
    dados.valor_juros_original,
    dados.multa,
    dados.meses_execucao_anterior,
    dados.adiantamento_recebido,
    resultadosEtapas,
  ])

  const handleChange = (field: string, value: any) => {
    setDados({ ...dados, [field]: value })
  }

  const handleChangeSalarioMinimo = (field: string, value: any) => {
    const novoDados = { ...dados, [field]: value }
    setDados(novoDados)
  }

  const handleAvancar = () => {
    const dadosAtualizados = calculadoraSM
      ? { ...dados, quantidade_salarios_minimos: calculadoraSM.qtdSalarios }
      : dados

    setDados(dadosAtualizados)

    onCompletar({
      quantidade_salarios_minimos: dadosAtualizados.quantidade_salarios_minimos,
      meses_execucao_anterior: dados.meses_execucao_anterior,
      valor_irpf: preview?.irpfTotal || 0,
      irTotal: preview?.irpfTotal || 0, // Alias
      irpf_valor: preview?.irpfTotal || 0, // Alias
      preview,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>IRPF - Imposto de Renda (Modelo RRA)</CardTitle>
        <CardDescription>
          Configure os parâmetros de desconto do IRPF usando o modelo RRA (Rendimentos Recebidos Acumuladamente)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {dados.taxa_juros_moratorios && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-600" />
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Calculadora de Salário Mínimo
              </h4>
            </div>
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-emerald-700 dark:text-emerald-300">Valor principal:</span>
                <span className="font-medium text-emerald-900 dark:text-emerald-100">
                  {dados.valor_principal_original?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ||
                    "R$ 0,00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 dark:text-emerald-300">Taxa total de juros moratórios:</span>
                <span className="font-medium text-emerald-900 dark:text-emerald-100">
                  {dados.taxa_juros_moratorios?.toFixed(4)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 dark:text-emerald-300">Salário mínimo vigente:</span>
                <span className="font-medium text-emerald-900 dark:text-emerald-100">
                  {dados.salario_minimo_referencia?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ||
                    "R$ 0,00"}
                </span>
              </div>
              {calculadoraSM && (
                <>
                  <div className="flex justify-between border-t border-emerald-300 dark:border-emerald-700 pt-2">
                    <span className="text-emerald-700 dark:text-emerald-300">Valor em juros de mora:</span>
                    <span className="font-medium text-emerald-900 dark:text-emerald-100">
                      {calculadoraSM.valorJuros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700 dark:text-emerald-300">Valor total (Principal + Juros):</span>
                    <span className="font-medium text-emerald-900 dark:text-emerald-100">
                      {calculadoraSM.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                      Equivalente em salários mínimos:
                    </span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {calculadoraSM.qtdSalarios.toFixed(2)} SM
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-start gap-1 text-xs text-emerald-700 dark:text-emerald-300 mt-2">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>Fórmula: (Valor Principal + Valor Juros Mora) ÷ Salário Mínimo</span>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Salário mínimo de referência</Label>
            <Input
              type="number"
              step="0.01"
              value={dados.salario_minimo_referencia || ""}
              onChange={(e) =>
                handleChangeSalarioMinimo("salario_minimo_referencia", Number.parseFloat(e.target.value) || 0)
              }
              placeholder="Ex: 1412.00"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Quantidade de salários mínimos (calculado)</Label>
            <Input
              type="number"
              step="0.01"
              value={calculadoraSM?.qtdSalarios?.toFixed(2) || dados.quantidade_salarios_minimos?.toFixed(2) || ""}
              onChange={(e) => handleChange("quantidade_salarios_minimos", Number.parseFloat(e.target.value) || 0)}
              placeholder="Calculado automaticamente"
              className="bg-muted"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Meses de execução anterior</Label>
          <Input
            type="number"
            value={dados.meses_execucao_anterior || ""}
            onChange={(e) => handleChange("meses_execucao_anterior", Number.parseInt(e.target.value) || 0)}
            placeholder="Ex: 93"
          />
          <p className="text-xs text-muted-foreground">Número de meses entre a data base e a data final do cálculo</p>
        </div>

        {preview && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm border border-border">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-blue-500" />
              <div className="space-y-2 flex-1">
                <p className="font-medium text-base">Cálculo de IRPF - Modelo RRA (Duas Bases)</p>
                <div className="grid gap-2 text-xs bg-background p-3 rounded border border-border">
                  <p className="font-semibold text-blue-600 mb-1">BASE 1: Para descobrir a faixa</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Principal + Juros + Multa:</span>
                    <span className="font-medium">
                      {preview.baseExecucao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número de meses:</span>
                    <span className="font-medium">{preview.meses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base mensal (define a faixa):</span>
                    <span className="font-medium">
                      {preview.baseMensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-border pt-2 mt-1">
                    <span className="text-muted-foreground">Faixa aplicada:</span>
                    <span className="font-semibold text-blue-600">{preview.faixaAplicada.descricao}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Alíquota:</span>
                    <span className="font-medium">{preview.faixaAplicada.aliquota}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parcela a deduzir (mensal):</span>
                    <span className="font-medium">
                      {preview.faixaAplicada.parcela_deduzir.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dedução total (parcela × meses):</span>
                    <span className="font-medium">
                      {preview.deducaoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>

                  <p className="font-semibold text-orange-600 mt-2 mb-1">BASE 2: Para calcular o IR</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Atualizado (após correção monetária):</span>
                    <span className="font-medium">
                      {preview.valorAtualizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IR bruto (valor atualizado × alíquota):</span>
                    <span className="font-medium">
                      {preview.irBruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>

                  <div className="flex justify-between border-t-2 border-border pt-2 mt-2">
                    <span className="font-semibold">IRPF Total (IR bruto - Dedução):</span>
                    <span className="text-lg font-bold text-blue-600">
                      {preview.irpfTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Fórmula RRA: IRPF = (Valor Atualizado × Alíquota) - (Parcela a Deduzir × Meses)
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-xs space-y-1">
          <p className="font-medium text-blue-900 dark:text-blue-100">Tabela IRPF (valores oficiais)</p>
          <ul className="space-y-0.5 text-blue-800 dark:text-blue-200">
            <li>Até R$ 1.903,98 - Isento</li>
            <li>De R$ 1.903,99 até R$ 2.826,65 - 7,5% (dedução R$ 142,80)</li>
            <li>De R$ 2.826,66 até R$ 3.751,05 - 15% (dedução R$ 354,80)</li>
            <li>De R$ 3.751,06 até R$ 4.664,68 - 22,5% (dedução R$ 636,13)</li>
            <li>Acima de R$ 4.664,68 - 27,5% (dedução R$ 869,36)</li>
          </ul>
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
