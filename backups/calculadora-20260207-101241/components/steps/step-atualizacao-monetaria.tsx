"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { Banknote, CalendarDays, Info, Sparkles } from "lucide-react"
import { StepFooter } from "@/components/ui/calc/StepFooter"
import { calcularPrecatorio } from "@/lib/calculos/calcular-precatorio"
import { getIndiceIpcaPre2022 } from "@/lib/calculos/indices"

const inicioMes = (data: Date): Date => new Date(data.getFullYear(), data.getMonth(), 1)

const forEachMesInclusivo = (inicio: Date, fim: Date, fn: (mes: Date) => void): void => {
  if (inicio > fim) return
  const current = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
  const end = new Date(fim.getFullYear(), fim.getMonth(), 1)

  while (current <= end) {
    fn(new Date(current))
    current.setMonth(current.getMonth() + 1)
  }
}

const somarIpcaPre22 = (dataBase: string): number => {
  const inicio = inicioMes(new Date(`${dataBase}T12:00:00`))
  const fim = new Date(2021, 10, 1) // Nov/2021
  let soma = 0

  forEachMesInclusivo(inicio, fim, (mes) => {
    const mesAno = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`
    soma += getIndiceIpcaPre2022(mesAno)
  })

  return soma
}

interface StepAtualizacaoMonetariaProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  precatorioId?: string
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

  useEffect(() => {
    if (dados.data_base) {
      const taxa = somarIpcaPre22(dados.data_base)
      setTaxaJurosMora(taxa)
    }
  }, [dados.data_base])

  useEffect(() => {
    if (dados.data_base && dados.valor_principal_original) {
      try {
        console.log("[v0] Auto-calculating in StepAtualizacaoMonetaria...", dados)
        const calc = calcularPrecatorio({
          ...dados,
          taxa_juros_mora: taxaJurosMora,
          taxa_juros_moratorios: taxaJurosMora,
          juros_mora_percentual: taxaJurosMora / 100,
          taxa_juros_pre_22_acumulada: taxaJurosMora,
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
    if (!resultado) return

    const finalResult = {
      ...resultado,
      taxa_juros_mora: taxaJurosMora,
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
    <Card className="calc-card relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="calc-title">Atualização Monetária (Automática)</CardTitle>
            <CardDescription className="calc-subtitle">Cálculo realizado com base nos índices e datas configurados.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label="Data Base"
            value={dados.data_base ? new Date(dados.data_base + "T12:00:00").toLocaleDateString("pt-BR") : "?"}
            helper="Início da correção"
            tone="info"
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <KpiCard
            label="Data Final"
            value={dados.data_final_calculo ? new Date(dados.data_final_calculo + "T12:00:00").toLocaleDateString("pt-BR") : "?"}
            helper="Data de cálculo"
            tone="primary"
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <KpiCard
            label="Principal Original"
            value={(dados.valor_principal_original || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            helper="Base inicial"
            tone="warning"
            icon={<Banknote className="h-4 w-4" />}
          />
        </div>

        {resultado?.memoriaCalculo ? (
          <SectionPanel
            title="Memória de Cálculo (Detalhamento)"
            description="Composição da atualização monetária mês a mês."
            tone="primary"
          >
            {resultado.memoriaCalculo.ipca && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">1. Correção Monetária (IPCA-E)</p>
                    <p className="text-xs text-muted-foreground font-mono break-words">
                      {resultado.memoriaCalculo.ipca.formula}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resultado.memoriaCalculo.ipca.base ? (
                        <>
                          ({resultado.memoriaCalculo.ipca.principalOriginal?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ÷ {resultado.memoriaCalculo.ipca.fatorInicial?.toFixed(7)}) × {resultado.memoriaCalculo.ipca.fatorFinal?.toFixed(7)}
                        </>
                      ) : (
                        <>Fator In: {resultado.memoriaCalculo.ipca.fatorInicial?.toFixed(7)} | Fator Out: {resultado.memoriaCalculo.ipca.fatorFinal?.toFixed(7)}</>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-base font-semibold tabular-nums text-amber-400">
                    {resultado.memoriaCalculo.ipca.resultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </div>
            )}

            {resultado.memoriaCalculo.juros && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">2. Juros Moratórios (Pré-2022)</p>
                    <p className="text-xs text-muted-foreground font-mono break-words">
                      {resultado.memoriaCalculo.juros.formula}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resultado.memoriaCalculo.juros.base?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} × {resultado.memoriaCalculo.juros.percentual?.toFixed(4)}%
                    </p>
                  </div>
                  <div className="text-right text-base font-semibold tabular-nums text-amber-400">
                    {resultado.memoriaCalculo.juros.resultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </div>
            )}

            {resultado.memoriaCalculo.selic && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">3. SELIC Acumulada (Pós-2022)</p>
                    <p className="text-xs text-muted-foreground font-mono break-words">
                      {resultado.memoriaCalculo.selic.formula}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resultado.memoriaCalculo.selic.base?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} × {resultado.memoriaCalculo.selic.percentual?.toFixed(4)}%
                    </p>
                  </div>
                  <div className="text-right text-base font-semibold tabular-nums text-amber-400">
                    {resultado.memoriaCalculo.selic.resultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </div>
            )}

            {resultado.memoriaCalculo.ipca2025 && (
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">4. EC 136/2025 (IPCA 2025)</p>
                    <p className="text-xs text-muted-foreground font-mono break-words">
                      {resultado.memoriaCalculo.ipca2025.formula}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resultado.memoriaCalculo.ipca2025.base?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} × {resultado.memoriaCalculo.ipca2025.percentual?.toFixed(4)}%
                    </p>
                  </div>
                  <div className="text-right text-base font-semibold tabular-nums text-amber-400">
                    {resultado.memoriaCalculo.ipca2025.resultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor atualizado final</p>
                  <p className="text-xs text-muted-foreground">(Soma dos itens 1, 2, 3 e 4)</p>
                </div>
                <p className="text-2xl font-semibold tabular-nums text-emerald-400">
                  {(resultado.memoriaCalculo.ipca.resultado + resultado.memoriaCalculo.juros.resultado + resultado.memoriaCalculo.selic.resultado + (resultado.memoriaCalculo.ipca2025?.resultado || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          </SectionPanel>
        ) : (
          <SectionPanel title="Memória de cálculo" description="Processando índices oficiais." tone="info">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p>Calculando atualização monetária...</p>
            </div>
          </SectionPanel>
        )}

        </div>
        <StepFooter onBack={voltar} onNext={handleAvancar} nextDisabled={!resultado} />
      </CardContent>
    </Card>
  )

}
