"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Table as TableIcon } from "lucide-react"
import { TABELA_IPCA_FATORES_EC113, TABELA_SELIC_PERCENTUAL_EC113, FATOR_TETO_DEZ21 } from "@/lib/calculos/dados-ec113"

interface StepIndicesProps {
    dados: any
    setDados: (dados: any) => void
    onCompletar: (resultado: any) => void
    voltar: () => void
    resultadosEtapas: any[]
}

export function StepIndices({ dados, setDados, onCompletar, voltar }: StepIndicesProps) {
    const [dataBase, setDataBase] = useState<string>(dados.data_base || new Date().toISOString().split('T')[0])
    const [dataFinal, setDataFinal] = useState<string>(dados.data_calculo || new Date().toISOString().split('T')[0])

    // State for separate sections
    const [dadosIpca, setDadosIpca] = useState<{
        fatorNaData: number,
        fatorTeto: number,
        multiplicador: number
    } | null>(null)

    const [dadosSelic, setDadosSelic] = useState<{
        taxaAcumulada: number,
        inicioPeriodo: string,
        fimPeriodo: string,
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
            const mesIndex = current.getMonth() // 0-based

            if (TABELA_SELIC_PERCENTUAL_EC113[anoStr]) {
                sum += TABELA_SELIC_PERCENTUAL_EC113[anoStr][mesIndex] || 0
            }

            current.setMonth(current.getMonth() + 1)
        }
        return sum
    }

    const consultarIndices = (dtBase: string, dtFinal: string) => {
        if (!dtBase || !dtFinal) return

        const [anoStr, mesStr] = dtBase.split('-')
        const ano = parseInt(anoStr)
        const mes = parseInt(mesStr) - 1 // 0-indexed for array access
        const dataObj = new Date(ano, mes, 1)
        const dataCorte = new Date(2022, 0, 1) // Jan 1st 2022

        // Final Date
        const [anoFim, mesFim] = dtFinal.split('-').map(Number)
        const dataFinalObj = new Date(anoFim, mesFim - 1, 1)

        // 1. Lógica IPCA-E
        if (dataObj < dataCorte) {
            const tabelaIpca = TABELA_IPCA_FATORES_EC113[anoStr]
            const fator = tabelaIpca ? tabelaIpca[mes] : 0
            const multiplicador = fator > 0 ? FATOR_TETO_DEZ21 / fator : 0

            setDadosIpca({
                fatorNaData: fator,
                fatorTeto: FATOR_TETO_DEZ21,
                multiplicador
            })
        } else {
            setDadosIpca(null)
        }

        // 2. Lógica SELIC
        let selicStart: Date
        let regra = ""

        if (dataObj < dataCorte) {
            // Se data base < 2022, SELIC começa em Jan/2022
            selicStart = new Date(2022, 0, 1)
            regra = "Soma da SELIC acumulada de 01/2022 até a Data Final."
        } else {
            // Se data base >= 2022, SELIC começa na data base
            selicStart = new Date(dataObj)
            regra = "Soma da SELIC acumulada da Data Base até a Data Final."
        }

        const taxaAcumulada = getSumSELIC(selicStart, dataFinalObj)

        setDadosSelic({
            taxaAcumulada,
            inicioPeriodo: selicStart.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
            fimPeriodo: dataFinalObj.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
            regra
        })
    }

    const handleAvancar = () => {
        const payload = {
            data_base: dataBase,
            data_final: dataFinal,
            dados_ipca: dadosIpca,
            dados_selic: dadosSelic,
            // [NEW] Flattened fields for calculation engine
            ipca_fator_inicial: dadosIpca ? dadosIpca.fatorNaData : 0,
            ipca_fator_final: dadosIpca ? dadosIpca.fatorTeto : 0,
            selic_acumulada_percentual: dadosSelic ? dadosSelic.taxaAcumulada : 0
        }

        // Update global context immediately so next step receives it
        setDados({
            ...dados,
            ...payload
        })

        onCompletar(payload)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TableIcon className="w-5 h-5" />
                    Consulta de Índices (EC 113/21)
                </CardTitle>
                <CardDescription>
                    Visualize a aplicação das regras de correção monetária e juros para o período informado.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Data Base (Início)</Label>
                        <Input
                            type="date"
                            value={dataBase}
                            onChange={(e) => setDataBase(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Data Final (Cálculo)</Label>
                        <Input
                            type="date"
                            value={dataFinal}
                            onChange={(e) => setDataFinal(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CARTÃO 1: IPCA-E (Condicional) */}
                    {dadosIpca ? (
                        <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-blue-200/50 pb-2">
                                <span className="font-bold text-lg text-blue-900 dark:text-blue-100">1. IPCA-E</span>
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                    Até Dez/2021
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Fator Data Base</Label>
                                        <div className="text-xl font-mono font-bold text-blue-700 dark:text-blue-400">
                                            {dadosIpca.fatorNaData.toFixed(7)}
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Fator Teto (Dez/21)</Label>
                                        <div className="text-xl font-mono font-bold text-slate-600 dark:text-slate-400">
                                            {dadosIpca.fatorTeto.toFixed(7)}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded text-xs text-blue-800 dark:text-blue-300">
                                    <strong>Regra:</strong> Atualização proporcional até 12/2021 usando a razão entre fatores.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg border border-dashed text-muted-foreground flex items-center justify-center flex-col gap-2 bg-muted/20">
                            <span className="font-medium">IPCA-E Não Aplicável</span>
                            <span className="text-xs text-center">Data posterior a Dez/2021.<br />Apenas SELIC será aplicada.</span>
                        </div>
                    )}

                    {/* CARTÃO 2: SELIC (Sempre presente) */}
                    {dadosSelic && (
                        <div className="p-4 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-green-200/50 pb-2">
                                <span className="font-bold text-lg text-green-900 dark:text-green-100">2. SELIC</span>
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                    {dadosSelic.inicioPeriodo} a {dadosSelic.fimPeriodo}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Taxa Acumulada no Período</Label>
                                    <div className="text-4xl font-mono font-bold text-green-700 dark:text-green-400">
                                        {dadosSelic.taxaAcumulada.toFixed(2)}%
                                    </div>
                                </div>

                                <div className="bg-white/50 dark:bg-black/20 p-2 rounded text-xs text-green-800 dark:text-green-300">
                                    <strong>Regra:</strong> {dadosSelic.regra}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between mt-8">
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
