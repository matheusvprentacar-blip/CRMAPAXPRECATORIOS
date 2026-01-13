"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, Calendar, DollarSign, Percent, TrendingUp, Building2, FileCheck } from "lucide-react"

const formatCurrency = (value: number | string | undefined | null) => {
    if (value === undefined || value === null) return "R$ 0,00"
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(Number(value))
}

interface ResumoCalculoDetalhadoProps {
    precatorio: any
}

export function ResumoCalculoDetalhado({ precatorio }: ResumoCalculoDetalhadoProps) {
    if (!precatorio || !precatorio.dados_calculo || !precatorio.dados_calculo.resultadosEtapas) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <Calculator className="h-12 w-12 mb-4 opacity-50" />
                    <p>Cálculo ainda não realizado ou dados não disponíveis.</p>
                </CardContent>
            </Card>
        )
    }

    const resultados = precatorio.dados_calculo.resultadosEtapas
    const dadosBasicos = resultados[0] || {}
    const atualizacao = resultados[1] || {}
    const pss = resultados[2] || {}
    const irpf = resultados[3] || {}
    const honorarios = resultados[4] || {}
    const propostas = resultados[5] || {}

    const formatDate = (dateString: string) => {
        if (!dateString) return "—"
        return new Date(dateString).toLocaleDateString("pt-BR")
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Passo 1: Dados Básicos */}
                <Card>
                    <CardHeader className="pb-3 bg-muted/30">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            1. Dados Iniciais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Valor Principal Original</p>
                            <p className="font-semibold">{formatCurrency(dadosBasicos.valor_principal_original || precatorio.valor_principal)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Data Base</p>
                            <p className="font-semibold">{formatDate(dadosBasicos.data_base || precatorio.data_base)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Data Expedição</p>
                            <p className="font-semibold">{formatDate(dadosBasicos.data_expedicao || precatorio.data_expedicao)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Tipo de Juros</p>
                            <p className="font-semibold">{dadosBasicos.tipo_juros === "compensatorio" ? "Compensatórios" : "Moratórios"}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Passo 2: Atualização Monetária */}
                <Card>
                    <CardHeader className="pb-3 bg-muted/30">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            2. Atualização e Juros
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="col-span-2">
                            <p className="text-muted-foreground">Valor Principal Atualizado</p>
                            <p className="font-semibold text-primary text-lg">{formatCurrency(atualizacao.valorAtualizado)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Juros de Mora</p>
                            <p className="font-semibold text-green-600">{formatCurrency(atualizacao.valorJuros || atualizacao.juros_mora)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Percentual Juros</p>
                            <p className="font-mono text-xs mt-1">{atualizacao.taxa_juros_moratorios || atualizacao.taxaJuros}%</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">SELIC (se aplicável)</p>
                            <p className="font-semibold">{formatCurrency(atualizacao.valorSelic)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Coeficiente Correção</p>
                            <p className="font-mono text-xs mt-1">{atualizacao.indice_correcao || "—"}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Passo 3: Deduções Legais */}
                <Card>
                    <CardHeader className="pb-3 bg-muted/30">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            3. Deduções (PSS/IRPF)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">PSS Total</p>
                            <p className="font-semibold text-red-600">-{formatCurrency(pss.pss_valor || pss.pssTotal)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">PSS (Contribuição Patrominal)</p>
                            <p className="text-xs text-muted-foreground">{pss.pss_oficio_valor ? `Incluído (${formatCurrency(pss.pss_oficio_valor)})` : "Não aplicável"}</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t">
                            <p className="text-muted-foreground">IRPF Total</p>
                            <p className="font-semibold text-red-600">-{formatCurrency(irpf.valor_irpf || irpf.irTotal)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Alíquota Efetiva</p>
                            <p className="font-mono text-xs mt-1">{irpf.aliquota_efetiva ? `${irpf.aliquota_efetiva}%` : "Isento/RRA"}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Passo 4: Honorários */}
                <Card>
                    <CardHeader className="pb-3 bg-muted/30">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            4. Honorários Contratuais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Percentual</p>
                            <p className="font-semibold">{honorarios.honorarios?.honorarios_percentual || propostas.honorarios_percentual || 0}%</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Valor Honorários</p>
                            <p className="font-semibold">{formatCurrency(honorarios.honorarios?.honorarios_valor || propostas.honorarios_valor)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Percentual Adiant.</p>
                            <p className="font-semibold">{honorarios.honorarios?.adiantamento_percentual || propostas.adiantamento_percentual || 0}%</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Valor Adiantamento</p>
                            <p className="font-semibold">{formatCurrency(honorarios.honorarios?.adiantamento_valor || propostas.adiantamento_valor)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Passo Final: Propostas e Totais */}
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3 border-b border-primary/10">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-primary">
                        <FileCheck className="h-5 w-5" />
                        Resultado Final e Propostas
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Base Líquida Final (Cliente)</p>
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(propostas.base_liquida_final || precatorio.saldo_liquido)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Valor após descontos de PSS, IRPF e Honorários</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 border-l pl-6">
                        <div className="flex justify-between items-center p-2 rounded bg-background border">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Proposta Menor ({propostas.percentual_menor || precatorio.proposta_menor_percentual}%)</p>
                                <p className="text-lg font-bold text-green-700">{formatCurrency(propostas.menor_proposta || precatorio.proposta_menor_valor)}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-background border">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold">Proposta Maior ({propostas.percentual_maior || precatorio.proposta_maior_percentual}%)</p>
                                <p className="text-lg font-bold text-green-700">{formatCurrency(propostas.maior_proposta || precatorio.proposta_maior_valor)}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
