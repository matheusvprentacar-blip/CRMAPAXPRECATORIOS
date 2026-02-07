"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Info, Landmark, ShieldCheck, TrendingDown, Trophy } from "lucide-react"
import { StepFooter } from "@/components/ui/calc/StepFooter"
import { calcularSalariosMinimosJuros } from "@/lib/calculos/indices"

interface StepResumoProps {
  dados: any
  resultadosEtapas: any[]
  voltar: () => void
  precatorioId?: string
  onFinalizar?: () => void | Promise<void>
  canFinalizar?: boolean
  saving?: boolean
}

type SummaryKpiTone = "primary" | "rose" | "emerald" | "indigo"

const SUMMARY_KPI_STYLES: Record<
  SummaryKpiTone,
  { bar: string; badge: string; icon: string; value: string }
> = {
  primary: {
    bar: "bg-primary",
    badge: "bg-primary/12 border-primary/25 text-primary",
    icon: "bg-primary/15 text-primary",
    value: "text-primary",
  },
  rose: {
    bar: "bg-rose-500",
    badge: "bg-rose-500/10 border-rose-500/25 text-rose-300",
    icon: "bg-rose-500/15 text-rose-300",
    value: "text-rose-300",
  },
  emerald: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300",
    icon: "bg-emerald-500/15 text-emerald-300",
    value: "text-emerald-300",
  },
  indigo: {
    bar: "bg-indigo-500",
    badge: "bg-indigo-500/10 border-indigo-500/25 text-indigo-300",
    icon: "bg-indigo-500/15 text-indigo-300",
    value: "text-indigo-300",
  },
}

const SummaryKpiCard = ({
  label,
  value,
  helper,
  tone,
  icon,
}: {
  label: string
  value: string
  helper?: string
  tone: SummaryKpiTone
  icon: ReactNode
}) => {
  const styles = SUMMARY_KPI_STYLES[tone]
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur transition-shadow hover:shadow-md">
      <div className={`absolute left-0 top-0 h-full w-1 ${styles.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`text-2xl font-semibold tabular-nums ${styles.value}`}>{value}</p>
          {helper && (
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles.badge}`}>
              {helper}
            </span>
          )}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${styles.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export function StepResumo({ dados, resultadosEtapas, voltar, onFinalizar, canFinalizar, saving }: StepResumoProps) {
  console.log("[v0] ========== STEP RESUMO - DEBUG COMPLETO ==========")
  console.log("[v0] Step Resumo - dados recebidos:", dados)
  console.log("[v0] Step Resumo - resultadosEtapas completo:", resultadosEtapas)
  console.log("[v0] Número de resultados:", resultadosEtapas.length)

  resultadosEtapas.forEach((resultado, index) => {
    console.log(`[v0] Resultado etapa ${index}:`, resultado)
  })

  // steps: 0 dados, 1 índices, 2 atualização, 3 PSS, 4 IRPF, 5 honorários, 6 propostas
  const etapaAtualizacao = resultadosEtapas[2] || {}
  const etapaPss = resultadosEtapas[3] || {}
  const etapaIrpf = resultadosEtapas[4] || {}
  const etapaHonorarios = resultadosEtapas[5] || {}
  const resumo = resultadosEtapas[6] || {}

  const isentoPss = etapaPss.isento_pss === true || etapaPss.isento === true

  const formatarMoeda = (valor: number | null | undefined) => {
    if (valor == null) return "R$ 0,00"
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const etapasConcluidas = resultadosEtapas.filter(Boolean).length
  const valorAtualizado = resumo.valor_atualizado ?? etapaAtualizacao.valor_atualizado ?? etapaAtualizacao.valorAtualizado ?? 0
  const basePreDescontos = resumo.base_liquida_pre_descontos ?? 0
  const baseLiquidaFinal = resumo.base_liquida_final ?? 0
  const pssValor = isentoPss ? 0 : (resumo.pss_valor ?? etapaPss.pss_valor ?? 0)
  const irpfValor = resumo.irpf_valor || 0
  const honorariosValor = resumo.honorarios_valor ?? etapaHonorarios.honorarios_valor ?? 0
  const adiantamentoValor = resumo.adiantamento_valor ?? etapaHonorarios.adiantamento_valor ?? 0
  const totalDescontos = irpfValor + pssValor + honorariosValor + adiantamentoValor
  const menorProposta = resumo.menor_proposta ?? resumo.menorProposta ?? 0
  const maiorProposta = resumo.maior_proposta ?? resumo.maiorProposta ?? 0
  const faixaPropostasLabel =
    menorProposta > 0 && maiorProposta > 0 ? `${formatarMoeda(menorProposta)} • ${formatarMoeda(maiorProposta)}` : "—"
  const principalOriginal = dados.valor_principal_original ?? 0
  const correcaoMonetaria = etapaAtualizacao.memoriaCalculo?.ipca?.resultado ?? 0
  const jurosPre22 = etapaAtualizacao.memoriaCalculo?.juros?.resultado ?? 0
  const selic = etapaAtualizacao.memoriaCalculo?.selic?.resultado ?? 0
  const ec136 = etapaAtualizacao.memoriaCalculo?.ipca2025?.resultado ?? 0
  const taxaJurosMoratoriosPercent = Number(
    resumo.taxa_juros_moratorios ??
    etapaAtualizacao.taxa_juros_moratorios ??
    etapaAtualizacao.taxa_juros_mora ??
    etapaAtualizacao.taxa_juros_pre_22_acumulada ??
    dados.taxa_juros_moratorios ??
    dados.taxa_juros_mora ??
    (dados.juros_mora_percentual ? dados.juros_mora_percentual * 100 : 0) ??
    0,
  )
  const salarioMinimoReferencia = Number(
    dados.salario_minimo_referencia ??
    dados.salario_minimo_vigente ??
    resumo.salario_minimo_referencia ??
    resumo.salario_minimo_vigente ??
    0,
  )
  const qtdSalariosMinimos =
    resumo.qtdSalariosMinimos ??
    resumo.quantidade_salarios_minimos ??
    calcularSalariosMinimosJuros(
      principalOriginal,
      taxaJurosMoratoriosPercent,
      salarioMinimoReferencia,
    ).qtdSalarios

  const handleExportarJSON = () => {
    const dataStr = JSON.stringify({ dados, resultadosEtapas }, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `calculo-precatorio-${Date.now()}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  return (
    <Card className="calc-card relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-foreground">Resumo final</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Revise os valores e finalize para salvar e gerar histórico.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 font-semibold text-foreground">
              {etapasConcluidas}/8
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 font-semibold ${
                canFinalizar
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-300"
              }`}
            >
              {canFinalizar ? "Pronto para finalizar" : "Em revisão"}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
        {!resumo || Object.keys(resumo).length === 0 ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-muted-foreground">
            <p className="text-foreground font-semibold">Resumo indisponível</p>
            <p>Complete todas as etapas anteriores.</p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryKpiCard
            label="Valor atualizado (bruto)"
            value={formatarMoeda(valorAtualizado)}
            helper="Bruto"
            tone="primary"
            icon={<Landmark className="h-4 w-4" />}
          />
          <SummaryKpiCard
            label="Total descontos"
            value={formatarMoeda(totalDescontos)}
            helper="IRPF + PSS + Honorários"
            tone="rose"
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <SummaryKpiCard
            label="Base líquida final"
            value={formatarMoeda(baseLiquidaFinal)}
            helper="Resultado final"
            tone="emerald"
            icon={<Trophy className="h-4 w-4" />}
          />
          <SummaryKpiCard
            label="Faixa propostas"
            value={faixaPropostasLabel}
            helper="Min • Max"
            tone="indigo"
            icon={<ShieldCheck className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Composição do cálculo</p>
                  <p className="text-xs text-muted-foreground">Bruto, descontos e resultado final.</p>
                </div>
                <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                  Fechamento
                </span>
              </div>

              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Bruto</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Principal</span>
                      <span className={`tabular-nums ${principalOriginal ? "text-emerald-300" : "text-muted-foreground"}`}>
                        {formatarMoeda(principalOriginal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Correção (IPCA)</span>
                      <span className={`tabular-nums ${correcaoMonetaria ? "text-emerald-300" : "text-muted-foreground"}`}>
                        {formatarMoeda(correcaoMonetaria)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Juros pré-22</span>
                      <span className={`tabular-nums ${jurosPre22 ? "text-emerald-300" : "text-muted-foreground"}`}>
                        {formatarMoeda(jurosPre22)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>SELIC (pós-22)</span>
                      <span className={`tabular-nums ${selic ? "text-emerald-300" : "text-muted-foreground"}`}>
                        {formatarMoeda(selic)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>EC 136/2025 (IPCA 2025)</span>
                      <span className={`tabular-nums ${ec136 ? "text-emerald-300" : "text-muted-foreground"}`}>
                        {formatarMoeda(ec136)}
                      </span>
                    </div>
                    <div className="flex justify-between text-foreground font-semibold">
                      <span>Total bruto</span>
                      <span className="tabular-nums">{formatarMoeda(valorAtualizado)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3">
                  <p className="text-xs uppercase tracking-wide text-rose-200/80">Descontos</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>PSS</span>
                      <span className={`tabular-nums ${pssValor ? "text-rose-300" : "text-muted-foreground"}`}>
                        {isentoPss ? "Isento" : formatarMoeda(pssValor)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>IRPF</span>
                      <span className={`tabular-nums ${irpfValor ? "text-rose-300" : "text-muted-foreground"}`}>
                        {formatarMoeda(irpfValor)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Honorários</span>
                      <span className={`tabular-nums ${honorariosValor ? "text-rose-300" : "text-muted-foreground"}`}>
                        {formatarMoeda(honorariosValor)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Adiantamento</span>
                      <span className={`tabular-nums ${adiantamentoValor ? "text-rose-300" : "text-muted-foreground"}`}>
                        {formatarMoeda(adiantamentoValor)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-200/80">Resultado final</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Base líquida final</span>
                    <span className="text-xl font-semibold tabular-nums text-emerald-300">{formatarMoeda(baseLiquidaFinal)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Base pré-descontos</span>
                    <span className="tabular-nums text-emerald-200">{formatarMoeda(basePreDescontos)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
              <p className="text-sm font-semibold text-foreground">Descontos e status</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    pssValor
                      ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                      : "border-border/60 bg-muted/20 text-muted-foreground"
                  }`}
                >
                  PSS {isentoPss ? "(Isento)" : formatarMoeda(pssValor)}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    irpfValor
                      ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                      : "border-border/60 bg-muted/20 text-muted-foreground"
                  }`}
                >
                  IRPF {formatarMoeda(irpfValor)}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    honorariosValor
                      ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                      : "border-border/60 bg-muted/20 text-muted-foreground"
                  }`}
                >
                  Honorários {formatarMoeda(honorariosValor)}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    adiantamentoValor
                      ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                      : "border-border/60 bg-muted/20 text-muted-foreground"
                  }`}
                >
                  Adiantamento {formatarMoeda(adiantamentoValor)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
              <p className="text-sm font-semibold text-foreground">Informações adicionais</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Base pré-descontos</span>
                  <span className="tabular-nums text-foreground">{formatarMoeda(basePreDescontos)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Salários mínimos</span>
                  <span className="tabular-nums text-foreground">{qtdSalariosMinimos.toLocaleString("pt-BR")}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Observações</p>
                  <p className="text-xs text-muted-foreground">
                    As propostas são calculadas sobre a base líquida final (após descontar PSS, IRPF, honorários e adiantamento).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>
        <StepFooter
          onBack={voltar}
          onNext={() => onFinalizar?.()}
          nextLabel="Finalizar cálculo"
          nextDisabled={!canFinalizar || saving}
          nextLoading={saving}
          rightExtra={
            <Button
              variant="ghost"
              className="w-full rounded-xl sm:w-auto"
              onClick={handleExportarJSON}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar JSON
            </Button>
          }
        />
      </CardContent>
    </Card>
  )

}
