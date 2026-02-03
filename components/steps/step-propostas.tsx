"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SegmentedToggle } from "@/components/ui/segmented-toggle"
import { BadgePercent, Info, Lock, Scale, Users } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { calcularSalariosMinimosJuros } from "@/lib/calculos/indices"
import { StepFooter } from "@/components/ui/calc/StepFooter"

interface StepPropostasProps {
  dados: any
  setDados: (dados: any) => void
  resultadosEtapas: any[]
  onCompletar: (resultado: any) => void
  voltar: () => void
  precatorioId?: string
}

const round2 = (value: number) => Math.round(value * 100) / 100

type Herdeiro = {
  id: string
  nome_completo: string
  cpf?: string | null
  percentual_participacao?: number | null
}

type ProposalKpiTone = "brand" | "amber" | "emerald"

const PROPOSTA_KPI_STYLES: Record<ProposalKpiTone, { bar: string; badge: string; icon: string; value: string }> = {
  brand: {
    bar: "bg-primary",
    badge: "bg-primary/15 text-primary border-primary/30",
    icon: "bg-primary/15 text-primary",
    value: "text-primary",
  },
  amber: {
    bar: "bg-amber-500",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: "bg-amber-500/15 text-amber-400",
    value: "text-amber-400",
  },
  emerald: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: "bg-emerald-500/15 text-emerald-400",
    value: "text-emerald-400",
  },
}

const ProposalKpiCard = ({
  label,
  value,
  helper,
  tone,
  icon,
  chip,
}: {
  label: string
  value: string
  helper?: string
  tone: ProposalKpiTone
  icon: ReactNode
  chip?: string
}) => {
  const styles = PROPOSTA_KPI_STYLES[tone]
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur transition-shadow hover:shadow-md">
      <div className={`absolute left-0 top-0 h-full w-1 ${styles.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`text-2xl font-semibold tabular-nums group-data-[pdf=open]:text-xl ${styles.value}`}>{value}</p>
          {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${styles.icon}`}>
          {icon}
        </div>
      </div>
      {chip && (
        <div className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles.badge}`}>
          {chip}
        </div>
      )}
    </div>
  )
}

// (Slider removido a pedido)

export function StepPropostas({
  dados,
  setDados,
  resultadosEtapas,
  onCompletar,
  voltar,
  precatorioId,
}: StepPropostasProps) {
  const [percentualMenorProposta, setPercentualMenorProposta] = useState(dados.percentual_menor_proposta || 0)
  const [percentualMaiorProposta, setPercentualMaiorProposta] = useState(dados.percentual_maior_proposta || 0)
  const [calculoFinal, setCalculoFinal] = useState<any>(null)

  const [isManual, setIsManual] = useState<boolean>(dados.propostas_manual || false)
  const [manualMenor, setManualMenor] = useState<number>(dados.menor_proposta_manual || 0)
  const [manualMaior, setManualMaior] = useState<number>(dados.maior_proposta_manual || 0)

  const [herdeiros, setHerdeiros] = useState<Herdeiro[]>([])
  const [loadingHerdeiros, setLoadingHerdeiros] = useState(false)
  const [savingHerdeiros, setSavingHerdeiros] = useState(false)

  const clampPercent = (value: number) => Math.min(100, Math.max(0, value))

  const handleMinPercentChange = (value: number) => {
    if (isManual) return
    const nextMin = clampPercent(Number.isFinite(value) ? value : 0)
    setPercentualMenorProposta(nextMin)
  }

  const handleMaxPercentChange = (value: number) => {
    if (isManual) return
    const nextMax = clampPercent(Number.isFinite(value) ? value : 0)
    setPercentualMaiorProposta(nextMax)
  }

  const totalCotas = herdeiros.reduce(
    (sum, h) => sum + Number(h.percentual_participacao || 0),
    0,
  )
  const hasHerdeiros = herdeiros.length > 0
  const cotasOk = Math.abs(totalCotas - 100) <= 0.01

  useEffect(() => {
    if (!precatorioId) return

    const loadHerdeiros = async () => {
      setLoadingHerdeiros(true)
      try {
        const supabase = getSupabase()
        if (!supabase) return

        const { data, error } = await supabase
          .from("precatorio_herdeiros")
          .select("id, nome_completo, cpf, percentual_participacao")
          .eq("precatorio_id", precatorioId)
          .order("created_at", { ascending: true })

        if (error) throw error
        setHerdeiros(data || [])
      } catch (error: any) {
        console.error("[StepPropostas] Erro ao carregar herdeiros:", error)
        toast.error(error.message || "Erro ao carregar herdeiros.")
      } finally {
        setLoadingHerdeiros(false)
      }
    }

    loadHerdeiros()
  }, [precatorioId])

  useEffect(() => {
    // Use posições fixas conforme fluxo: 0 dados, 1 índices, 2 atualização, 3 PSS, 4 IRPF, 5 honorários
    const etapaDados = resultadosEtapas[0] || {}
    const etapaAtualizacao = resultadosEtapas[2] || {}
    const etapaPss = resultadosEtapas[3] || {}
    const etapaIrpf = resultadosEtapas[4] || {}
    const etapaHonorarios = resultadosEtapas[5] || {}

    // Breakdown vindo do IRPF; fallback construído da Atualização Monetária
    let breakdown = etapaIrpf.breakdown || {}
    if (!breakdown.total_bruto) {
      const valorAtualizado = etapaAtualizacao.valor_atualizado || etapaAtualizacao.valorAtualizado || 0
      breakdown = {
        principal_original: dados.valor_principal_original || etapaDados.valor_principal_original || 0,
        correcao_monetaria: etapaAtualizacao.memoriaCalculo?.ipca?.resultado || 0,
        juros_pre_22: etapaAtualizacao.memoriaCalculo?.juros?.resultado || 0,
        selic: etapaAtualizacao.memoriaCalculo?.selic?.resultado || 0,
        ec136_2025: etapaAtualizacao.memoriaCalculo?.ipca2025?.resultado || 0,
        juros_moratorios_originais: dados.valor_juros_original || 0,
        total_bruto: valorAtualizado,
        base_irpf: etapaIrpf.baseIR || 0,
        descricao_faixa: etapaIrpf.faixa || "N/A"
      }
    }

    // Extract Values
    const totalBruto = breakdown.total_bruto || etapaAtualizacao.valor_atualizado || etapaAtualizacao.valorAtualizado || 0
    const valorPrincipal = breakdown.principal_original || dados.valor_principal_original || 0
    const correcaoMonetaria = breakdown.correcao_monetaria || 0
    const jurosPre22 = breakdown.juros_pre_22 || 0
    const valSelic = breakdown.selic || 0
    const valEc136 = breakdown.ec136_2025 || 0
    const jurosMoraOrig = breakdown.juros_moratorios_originais || dados.valor_juros_original || 0

    // Deductions
    const pssValor = etapaPss.pss_valor || etapaPss.pssTotal || 0
    const irpfValor = etapaIrpf.irpf_valor || etapaIrpf.valor_irpf || etapaIrpf.irTotal || 0

    const honorarios = etapaHonorarios.honorarios || etapaHonorarios || {}
    const honorariosPercentual = Number(honorarios.honorarios_percentual ?? dados.honorarios_percentual ?? 0)
    const adiantamentoPercentual = Number(honorarios.adiantamento_percentual ?? dados.adiantamento_percentual ?? 0)

    // Base Pré-descontos = bruto - PSS - IRPF
    const basePreDescontos = round2(totalBruto - pssValor - irpfValor)

    const honorariosValorAuto = round2(basePreDescontos * (honorariosPercentual / 100))
    const adiantamentoValorAuto = round2(basePreDescontos * (adiantamentoPercentual / 100))

    const isHonManual = honorarios.honorarios_manual || false
    const honorariosValorManual = Number(honorarios.honorarios_valor)
    const adiantamentoValorManual = Number(honorarios.adiantamento_valor)

    const honorariosValor = isHonManual && !Number.isNaN(honorariosValorManual)
      ? honorariosValorManual
      : honorariosValorAuto

    const adiantamentoValor = isHonManual && !Number.isNaN(adiantamentoValorManual)
      ? adiantamentoValorManual
      : adiantamentoValorAuto

    const baseLiquidaFinal = round2(basePreDescontos - honorariosValor - adiantamentoValor)

    const taxaJurosMoratoriosPercent = Number(
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
      etapaAtualizacao.salario_minimo_referencia ??
      etapaAtualizacao.salario_minimo_vigente ??
      0,
    )
    const { qtdSalarios: qtdSalariosMinimos } = calcularSalariosMinimosJuros(
      valorPrincipal,
      taxaJurosMoratoriosPercent,
      salarioMinimoReferencia,
    )

    const menorPropostaCalc = round2(baseLiquidaFinal * (percentualMenorProposta / 100))
    const maiorPropostaCalc = round2(baseLiquidaFinal * (percentualMaiorProposta / 100))

    let menorProposta = isManual ? manualMenor : menorPropostaCalc;
    let maiorProposta = isManual ? manualMaior : maiorPropostaCalc;

    if (!isManual) {
      menorProposta = menorPropostaCalc
      maiorProposta = maiorPropostaCalc
    }

    setCalculoFinal({
      breakdown, // Pass full breakdown for UI
      valor_atualizado: totalBruto,
      pss_valor: pssValor,
      irpf_valor: irpfValor,
      base_liquida_pre_descontos: basePreDescontos,
      honorarios_valor: honorariosValor,
      honorarios_percentual: honorariosPercentual,
      adiantamento_valor: adiantamentoValor,
      adiantamento_percentual: adiantamentoPercentual,
      base_liquida_final: baseLiquidaFinal,
      base_calculo_liquida: baseLiquidaFinal,
      valor_liquido_credor: baseLiquidaFinal,
      percentual_menor: percentualMenorProposta,
      percentual_maior: percentualMaiorProposta,
      menor_proposta: menorProposta,
      maior_proposta: maiorProposta,
      qtdSalariosMinimos,
      menorProposta: menorProposta,
      maiorProposta: maiorProposta,
    })
  }, [
    percentualMenorProposta,
    percentualMaiorProposta,
    resultadosEtapas,
    isManual,
    manualMenor,
    manualMaior
  ])

  const handleManualToggle = (checked: boolean) => {
    setIsManual(checked)
    if (checked && calculoFinal) {
      // Init manual values with current calculated values
      setManualMenor(calculoFinal.menor_proposta || 0)
      setManualMaior(calculoFinal.maior_proposta || 0)
    }
  }

  const handleHerdeiroPercentualChange = (id: string, value: string) => {
    const numericValue = Number(value)
    setHerdeiros((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, percentual_participacao: isNaN(numericValue) ? 0 : numericValue }
          : h,
      ),
    )
  }

  const salvarCotas = async () => {
    if (!precatorioId || !hasHerdeiros) return
    if (!cotasOk) {
      toast.error("As cotas dos herdeiros devem somar 100%.")
      return
    }

    setSavingHerdeiros(true)
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const updates = await Promise.all(
        herdeiros.map((h) =>
          supabase
            .from("precatorio_herdeiros")
            .update({ percentual_participacao: Number(h.percentual_participacao || 0) })
            .eq("id", h.id),
        ),
      )

      const firstError = updates.find((r) => r.error)?.error
      if (firstError) throw firstError

      toast.success("Cotas salvas com sucesso.")
    } catch (error: any) {
      console.error("[StepPropostas] Erro ao salvar cotas:", error)
      toast.error(error.message || "Erro ao salvar cotas.")
    } finally {
      setSavingHerdeiros(false)
    }
  }

  const handleAvancar = () => {
    if (hasHerdeiros && !cotasOk) {
      toast.error("As cotas dos herdeiros devem somar 100% antes de avancar.")
      return
    }

    if (!isManual && (percentualMenorProposta <= 0 || percentualMaiorProposta <= 0)) {
      toast.error("É necessário definir os percentuais das propostas (maior que zero).")
      return
    }

    setDados({
      ...dados,
      percentual_menor_proposta: percentualMenorProposta,
      percentual_maior_proposta: percentualMaiorProposta,
      propostas_manual: isManual,
      menor_proposta_manual: manualMenor,
      maior_proposta_manual: manualMaior
    })

    console.log("[v0] StepPropostas - Avançando com resultado final:", calculoFinal)

    if (calculoFinal) {
      onCompletar({
        ...calculoFinal,
        propostas_manual: isManual
      })
    } else {
      onCompletar({})
    }
  }

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  const baseLiquidaValor = calculoFinal?.base_liquida_final || 0
  const menorPropostaValor = calculoFinal?.menor_proposta || 0
  const maiorPropostaValor = calculoFinal?.maior_proposta || 0

  return (
    <Card className="calc-card relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="calc-title">Propostas</CardTitle>
            <CardDescription className="calc-subtitle">
              Defina a faixa de proposta mínima e máxima com base no valor líquido final do credor.
            </CardDescription>
          </div>
          <div className="space-y-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Modo</span>
            <SegmentedToggle
              value={isManual ? "manual" : "auto"}
              onChange={(value) => handleManualToggle(value === "manual")}
              options={[
                { value: "auto", label: "Automático" },
                { value: "manual", label: "Manual" },
              ]}
              className="w-full max-w-md"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <ProposalKpiCard
            label="Base líquida final"
            value={formatarMoeda(baseLiquidaValor)}
            helper="Base p/ propostas"
            tone="brand"
            icon={<Scale className="h-4 w-4" />}
            chip="Base p/ propostas"
          />
          <ProposalKpiCard
            label="Menor proposta"
            value={formatarMoeda(menorPropostaValor)}
            helper={`${percentualMenorProposta || 0}%`}
            tone="amber"
            icon={<BadgePercent className="h-4 w-4" />}
            chip="Mínimo"
          />
          <ProposalKpiCard
            label="Maior proposta"
            value={formatarMoeda(maiorPropostaValor)}
            helper={`${percentualMaiorProposta || 0}%`}
            tone="emerald"
            icon={<BadgePercent className="h-4 w-4" />}
            chip="Máximo"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Ajuste de percentuais</p>
                <p className="text-xs text-muted-foreground">Defina as faixas percentuais para as propostas.</p>
              </div>
              {isManual && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-400">
                  <Lock className="h-3 w-3" />
                  Percentuais bloqueados
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Percentual da menor proposta (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={percentualMenorProposta}
                  onChange={(e) => handleMinPercentChange(Number(e.target.value) || 0)}
                  disabled={isManual}
                  className="rounded-lg text-base transition focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 disabled:bg-muted/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Percentual da maior proposta (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={percentualMaiorProposta}
                  onChange={(e) => handleMaxPercentChange(Number(e.target.value) || 0)}
                  disabled={isManual}
                  className="rounded-lg text-base transition focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 disabled:bg-muted/40"
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {isManual
                ? "Modo manual ativo: os percentuais ficam bloqueados e os valores são definidos diretamente."
                : "Ajuste os percentuais para simular propostas automáticas com base na base líquida."}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Resumo das propostas</p>
                <p className="text-xs text-muted-foreground">Base líquida e valores resultantes.</p>
              </div>
              {isManual && (
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">
                  Manual ativo
                </span>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Base líquida final</p>
              <p className="text-xl font-semibold tabular-nums text-sky-300 group-data-[pdf=open]:text-lg">{formatarMoeda(baseLiquidaValor)}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-xs text-amber-200/80">Menor proposta</p>
              <p className="text-lg font-semibold tabular-nums text-amber-300 group-data-[pdf=open]:text-base">{formatarMoeda(menorPropostaValor)}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="text-xs text-emerald-200/80">Maior proposta</p>
              <p className="text-lg font-semibold tabular-nums text-emerald-300 group-data-[pdf=open]:text-base">{formatarMoeda(maiorPropostaValor)}</p>
              </div>
            </div>

            {isManual && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Valor manual da menor proposta</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-10 rounded-lg text-base transition focus-visible:ring-2 focus-visible:ring-primary/40"
                    value={manualMenor}
                    onChange={(e) => setManualMenor(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Valor manual da maior proposta</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-10 rounded-lg text-base transition focus-visible:ring-2 focus-visible:ring-primary/40"
                    value={manualMaior}
                    onChange={(e) => setManualMaior(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {loadingHerdeiros && (
          <div className="text-xs text-muted-foreground">Carregando herdeiros...</div>
        )}

        {hasHerdeiros && (
          <SectionPanel
            title="Herdeiros"
            description="Defina a cota de cada herdeiro (total 100%)."
            tone="info"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Distribuição de cotas</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={salvarCotas}
                disabled={savingHerdeiros || !cotasOk}
              >
                {savingHerdeiros ? "Salvando..." : "Salvar cotas"}
              </Button>
            </div>

            <div className="space-y-2">
              {herdeiros.map((h) => (
                <div key={h.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.nome_completo}</p>
                    <p className="text-xs text-muted-foreground truncate">{h.cpf || "CPF N/I"}</p>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={Number(h.percentual_participacao || 0)}
                      onChange={(e) => handleHerdeiroPercentualChange(h.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total: {totalCotas.toFixed(2)}%</span>
              {cotasOk ? <span className="value-main">Cotas OK</span> : <span className="value-negative">Deve somar 100%</span>}
            </div>
          </SectionPanel>
        )}

        {calculoFinal && (
          <SectionPanel title="Preview do cálculo final" description="Detalhamento completo da base líquida." tone="primary">
            <div className="grid gap-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor bruto</p>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">Total</span>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground"><span>Principal Original</span><span className="tabular-nums text-emerald-300">{formatarMoeda(calculoFinal.breakdown?.principal_original || 0)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Correção (IPCA-E/IPCA)</span><span className="tabular-nums text-emerald-300">{formatarMoeda(calculoFinal.breakdown?.correcao_monetaria || 0)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Juros Pré-22</span><span className="tabular-nums text-emerald-300">{formatarMoeda(calculoFinal.breakdown?.juros_pre_22 || 0)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>SELIC (Pós-22)</span><span className="tabular-nums text-emerald-300">{formatarMoeda(calculoFinal.breakdown?.selic || 0)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>EC 136/2025 (IPCA 2025)</span><span className="tabular-nums text-emerald-300">{formatarMoeda(calculoFinal.breakdown?.ec136_2025 || 0)}</span></div>
                  <div className="flex justify-between text-muted-foreground border-t border-border/60 pt-2"><span>Juros Originais</span><span className="tabular-nums text-emerald-300">{formatarMoeda(calculoFinal.breakdown?.juros_moratorios_originais || 0)}</span></div>
                  <div className="flex justify-between text-sm font-semibold text-foreground"><span>Total Bruto</span><span className="tabular-nums">{formatarMoeda(calculoFinal.valor_atualizado)}</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-rose-200/80">Descontos</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-rose-200/80"><span>(-) PSS</span><span className="tabular-nums text-rose-300">{formatarMoeda(calculoFinal.pss_valor)}</span></div>
                  <div className="flex justify-between text-rose-200/80"><span>(-) IRPF ({calculoFinal.breakdown?.descricao_faixa || "N/A"})</span><span className="tabular-nums text-rose-300">{formatarMoeda(calculoFinal.irpf_valor)}</span></div>
                  <div className="flex justify-between text-rose-200/80"><span>(-) Honorários ({calculoFinal.honorarios_percentual?.toFixed(2) || "0.00"}%)</span><span className="tabular-nums text-rose-300">{formatarMoeda(calculoFinal.honorarios_valor)}</span></div>
                  <div className="flex justify-between text-rose-200/80"><span>(-) Adiantamento ({calculoFinal.adiantamento_percentual?.toFixed(2) || "0.00"}%)</span><span className="tabular-nums text-rose-300">{formatarMoeda(calculoFinal.adiantamento_valor)}</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-200/80">Base líquida final</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-sky-200/80">Base para propostas</span>
                  <span className="text-lg font-semibold tabular-nums text-sky-300 group-data-[pdf=open]:text-base">{formatarMoeda(calculoFinal.base_liquida_final)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Base pré-descontos</span>
                  <span className="tabular-nums text-sky-200">{formatarMoeda(calculoFinal.base_liquida_pre_descontos)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Propostas</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm">
                    <span className="text-amber-200/80">Menor</span>
                    <span className="tabular-nums text-amber-300">{formatarMoeda(calculoFinal.menor_proposta)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm">
                    <span className="text-emerald-200/80">Maior</span>
                    <span className="tabular-nums text-emerald-300">{formatarMoeda(calculoFinal.maior_proposta)}</span>
                  </div>
                </div>
              </div>
            </div>
          </SectionPanel>
        )}

        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Observação</p>
              <p className="text-xs text-muted-foreground">
                As propostas são calculadas sobre a base líquida final (após descontar PSS, IRPF, honorários e adiantamento).
              </p>
            </div>
          </div>
        </div>

        </div>
        <StepFooter onBack={voltar} onNext={handleAvancar} />
      </CardContent>
    </Card>
  )

}

