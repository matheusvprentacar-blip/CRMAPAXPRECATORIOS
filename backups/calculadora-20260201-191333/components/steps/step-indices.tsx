"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Table as TableIcon } from "lucide-react"
import { TABELA_IPCA_FATORES_EC113, TABELA_SELIC_PERCENTUAL_EC113, FATOR_TETO_DEZ21 } from "@/lib/calculos/dados-ec113"
import { IPCA_E_MENSAL, TABELA_INDICES_COMPLETA } from "@/lib/calculos/indices"

const IPCA_TABELA_COMPLETA_MAP = new Map<string, number>()
for (const item of TABELA_INDICES_COMPLETA) {
  if (item.periodo.startsWith("IPCA")) {
    IPCA_TABELA_COMPLETA_MAP.set(item.dataRef.slice(0, 7), item.indice)
  }
}

const formatMesAno = (data: Date): string =>
  data.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })

const inicioMes = (data: Date): Date => new Date(data.getFullYear(), data.getMonth(), 1)

const getIndiceIpcaE = (mesAno: string): number => {
  const mapa = IPCA_E_MENSAL as Record<string, number>
  if (Object.prototype.hasOwnProperty.call(mapa, mesAno)) {
    return mapa[mesAno]
  }
  return IPCA_TABELA_COMPLETA_MAP.get(mesAno) ?? 0
}

interface StepIndicesProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  resultadosEtapas: any[]
  precatorioId?: string
}

export function StepIndices({ dados, setDados, onCompletar, voltar }: StepIndicesProps) {
  const [dataBase, setDataBase] = useState<string>(dados.data_base || new Date().toISOString().split("T")[0])
  const [dataFinal, setDataFinal] = useState<string>(dados.data_calculo || new Date().toISOString().split("T")[0])

  const [dadosIpca, setDadosIpca] = useState<{
    fatorNaData: number
    fatorTeto: number
    multiplicador: number
  } | null>(null)

  const [dadosSelic, setDadosSelic] = useState<{
    taxaAcumulada: number
    inicioPeriodo: string
    fimPeriodo: string
    regra: string
  } | null>(null)

  const [dadosIpca2025, setDadosIpca2025] = useState<{
    percentualAcumulado: number
    inicioPeriodo: string
    fimPeriodo: string
    regra: string
  } | null>(null)

  useEffect(() => {
    consultarIndices(dataBase, dataFinal)
  }, [dataBase, dataFinal])

  const getSumSELIC = (start: Date, end: Date): number => {
    let sum = 0
    let current = new Date(start.getFullYear(), start.getMonth(), 1)
    const endDate = new Date(end.getFullYear(), end.getMonth(), 1)

    while (current <= endDate) {
      const anoStr = current.getFullYear().toString()
      const mesIndex = current.getMonth()

      if (TABELA_SELIC_PERCENTUAL_EC113[anoStr]) {
        sum += TABELA_SELIC_PERCENTUAL_EC113[anoStr][mesIndex] || 0
      }

      current.setMonth(current.getMonth() + 1)
    }
    return sum
  }

  const consultarIndices = (dtBase: string, dtFinal: string) => {
    if (!dtBase || !dtFinal) return

    const [anoStr, mesStr] = dtBase.split("-")
    const ano = parseInt(anoStr)
    const mes = parseInt(mesStr) - 1
    const dataObj = new Date(ano, mes, 1)

    const dataCorteIpcaFator = new Date(2021, 11, 1) // 01/12/2021 (IPCA fator até Nov/2021)
    const dataInicioIpca2025 = new Date(2025, 0, 1) // 01/01/2025

    const [anoFim, mesFim] = dtFinal.split("-").map(Number)
    const dataFinalObj = new Date(anoFim, mesFim - 1, 1)

    if (dataObj < dataCorteIpcaFator) {
      const tabelaIpca = TABELA_IPCA_FATORES_EC113[anoStr]
      const fator = tabelaIpca ? tabelaIpca[mes] : 0
      const fatorTetoNov21 = TABELA_IPCA_FATORES_EC113["2021"]?.[10] ?? FATOR_TETO_DEZ21
      const multiplicador = fator > 0 ? fatorTetoNov21 / fator : 0

      setDadosIpca({
        fatorNaData: fator,
        fatorTeto: fatorTetoNov21,
        multiplicador,
      })
    } else {
      setDadosIpca(null)
    }

    const selicReferenciaInicio = new Date(2022, 0, 1)
    const selicReferenciaFim = new Date(2024, 11, 1)
    const selicInicio = dataObj > selicReferenciaInicio ? inicioMes(dataObj) : selicReferenciaInicio
    const selicFim = dataFinalObj < selicReferenciaFim ? dataFinalObj : selicReferenciaFim
    const aplicaSelic = selicInicio <= selicFim

    if (aplicaSelic) {
      const taxaAcumulada = getSumSELIC(selicInicio, selicFim)
      const regra = `Soma da SELIC acumulada de ${formatMesAno(selicInicio)} até ${formatMesAno(selicFim)}.`

      setDadosSelic({
        taxaAcumulada,
        inicioPeriodo: formatMesAno(selicInicio),
        fimPeriodo: formatMesAno(selicFim),
        regra,
      })
    } else {
      setDadosSelic(null)
    }

    const fimIpca2025 = inicioMes(new Date())
    const inicioIpca2025 = dataObj > dataInicioIpca2025 ? inicioMes(dataObj) : dataInicioIpca2025
    const aplicaIpca2025 = inicioIpca2025 <= fimIpca2025

    if (aplicaIpca2025) {
      let somaPercentual = 0
      let current = new Date(inicioIpca2025.getFullYear(), inicioIpca2025.getMonth(), 1)
      const endDate = new Date(fimIpca2025.getFullYear(), fimIpca2025.getMonth(), 1)

      while (current <= endDate) {
        const mesAno = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
        const indice = getIndiceIpcaE(mesAno)
        somaPercentual += indice
        current.setMonth(current.getMonth() + 1)
      }

      setDadosIpca2025({
        percentualAcumulado: somaPercentual,
        inicioPeriodo: formatMesAno(inicioIpca2025),
        fimPeriodo: formatMesAno(fimIpca2025),
        regra: "Soma dos índices IPCA-E mês a mês a partir da Data Base (>= 01/2025) até a Data Atual.",
      })
    } else {
      setDadosIpca2025(null)
    }
  }

  const handleAvancar = () => {
    const payload = {
      data_base: dataBase,
      data_final: dataFinal,
      dados_ipca: dadosIpca,
      dados_selic: dadosSelic,
      dados_ipca_2025: dadosIpca2025,
      ipca_fator_inicial: dadosIpca ? dadosIpca.fatorNaData : 0,
      ipca_fator_final: dadosIpca ? dadosIpca.fatorTeto : 0,
      selic_acumulada_percentual: dadosSelic ? dadosSelic.taxaAcumulada : 0,
    }

    setDados({
      ...dados,
      ...payload,
    })

    onCompletar(payload)
  }

  return (
    <Card className="border border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <TableIcon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Consulta de Índices (EC 113/21)</CardTitle>
            <CardDescription className="text-sm">
              Visualize a aplicação das regras de correção monetária e juros para o período informado.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Data Base (Início)</Label>
            <Input
              type="date"
              value={dataBase}
              onChange={(e) => setDataBase(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Data Final (Cálculo)</Label>
            <Input
              type="date"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dadosIpca ? (
            <div className="flex h-full flex-col gap-4 rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/20 p-4 shadow-sm dark:border-blue-900/50 dark:from-blue-950/40 dark:via-slate-950/30 dark:to-blue-950/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-200">1. IPCA-E</p>
                  <p className="text-xs text-blue-500 dark:text-blue-300">Até Nov/2021</p>
                </div>
                <span className="rounded-full border border-blue-200/60 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                  Fatores
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Fator Data Base</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-blue-700 dark:text-blue-200">
                    {dadosIpca.fatorNaData.toFixed(7)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fator Teto (Nov/21)</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {dadosIpca.fatorTeto.toFixed(7)}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-100/60 bg-white/70 p-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
                  <strong>Regra:</strong> Atualização proporcional até 11/2021 usando a razão entre fatores.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-center text-muted-foreground">
              <span className="text-sm font-semibold">IPCA-E não aplicável</span>
              <span className="text-xs">Data posterior a Nov/2021. Apenas SELIC e IPCA 2025 serão aplicados.</span>
            </div>
          )}

          {dadosSelic && (
            <div className="flex h-full flex-col gap-4 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 p-4 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-950/30 dark:to-emerald-950/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">2. SELIC</p>
                  <p className="text-xs text-emerald-500 dark:text-emerald-300">{dadosSelic.inicioPeriodo} a {dadosSelic.fimPeriodo}</p>
                </div>
                <span className="rounded-full border border-emerald-200/60 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Acumulada
                </span>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Taxa acumulada no período</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-200">
                  {dadosSelic.taxaAcumulada.toFixed(2)}%
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100/60 bg-white/70 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                <strong>Regra:</strong> {dadosSelic.regra}
              </div>
            </div>
          )}

          {dadosIpca2025 ? (
            <div className="flex h-full flex-col gap-4 rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/20 p-4 shadow-sm dark:border-purple-900/50 dark:from-purple-950/40 dark:via-slate-950/30 dark:to-purple-950/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-700 dark:text-purple-200">3. IPCA-E 2025</p>
                  <p className="text-xs text-purple-500 dark:text-purple-300">{dadosIpca2025.inicioPeriodo} a {dadosIpca2025.fimPeriodo}</p>
                </div>
                <span className="rounded-full border border-purple-200/60 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-200">
                  Projeção
                </span>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Soma acumulada no período</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-purple-700 dark:text-purple-200">
                  {dadosIpca2025.percentualAcumulado.toFixed(2)}%
                </p>
              </div>

              <div className="rounded-xl border border-purple-100/60 bg-white/70 p-3 text-xs text-purple-800 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-200">
                <strong>Regra:</strong> {dadosIpca2025.regra}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-center text-muted-foreground">
              <span className="text-sm font-semibold">IPCA-E 2025 não aplicável</span>
              <span className="text-xs">Data base anterior a Jan/2025. Nenhum IPCA 2025 acumulado.</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
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
