"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { Switch } from "@/components/ui/switch"
import { BadgePercent, Info } from "lucide-react"
import { StepFooter } from "@/components/ui/calc/StepFooter"
import { useEffect, useState } from "react"

interface StepHonorariosProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  resultadosEtapas: any[]
  precatorioId?: string
}

export function StepHonorarios({ dados, setDados, onCompletar, voltar, resultadosEtapas }: StepHonorariosProps) {
  // steps: 0 dados, 1 índices, 2 atualização, 3 PSS, 4 IRPF, 5 honorários
  const honorariosSalvos = resultadosEtapas[5]?.honorarios || resultadosEtapas[5]

  const [isManual, setIsManual] = useState<boolean>(dados.honorarios_manual || false)

  const [honorariosPercentual, setHonorariosPercentual] = useState(
    honorariosSalvos?.honorarios_percentual || dados.honorarios_percentual || 0,
  )
  const [adiantamentoPercentual, setAdiantamentoPercentual] = useState(
    honorariosSalvos?.adiantamento_percentual || dados.adiantamento_percentual || 0,
  )

  // States for manual values
  const [honorariosValorManual, setHonorariosValorManual] = useState<number>(honorariosSalvos?.honorarios_valor || 0)
  const [adiantamentoValorManual, setAdiantamentoValorManual] = useState<number>(honorariosSalvos?.adiantamento_valor || 0)

  useEffect(() => {
    if (honorariosSalvos) {
      setHonorariosPercentual(honorariosSalvos.honorarios_percentual || 0)
      setAdiantamentoPercentual(honorariosSalvos.adiantamento_percentual || 0)
      if (isManual) {
        setHonorariosValorManual(honorariosSalvos.honorarios_valor || 0)
        setAdiantamentoValorManual(honorariosSalvos.adiantamento_valor || 0)
      }
    }
  }, [honorariosSalvos, isManual])

  const etapaAtualizacao = resultadosEtapas[2] || {}
  const etapaPss = resultadosEtapas[3] || {}
  const etapaIrpf = resultadosEtapas[4] || {}

  const totalBruto = Number(
    etapaAtualizacao.valor_atualizado ??
    etapaAtualizacao.valorAtualizado ??
    etapaAtualizacao.valor_corrigido_monetariamente ??
    etapaAtualizacao.valorCorrigido ??
    0,
  )
  const pssValor = Number(etapaPss.pss_valor ?? etapaPss.pssTotal ?? etapaPss.pss_atualizado ?? 0)
  const irpfValor = Number(etapaIrpf.irpf_valor ?? etapaIrpf.valor_irpf ?? etapaIrpf.irTotal ?? 0)
  const baseCalculo = Math.max(0, totalBruto - pssValor - irpfValor)

  // Calculate auto values
  const honorariosValorAuto = baseCalculo * (honorariosPercentual / 100)
  const adiantamentoValorAuto = baseCalculo * (adiantamentoPercentual / 100)

  const honorariosValorFinal = isManual ? honorariosValorManual : honorariosValorAuto
  const adiantamentoValorFinal = isManual ? adiantamentoValorManual : adiantamentoValorAuto

  const handleChange = (field: string, value: any) => {
    setDados({ ...dados, [field]: value })
  }

  const handlePercentualChange = (field: string, value: string) => {
    const numericValue = value === "" ? 0 : Number.parseFloat(value)
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
      if (field === "honorarios_percentual") {
        setHonorariosPercentual(numericValue)
      } else if (field === "adiantamento_percentual") {
        setAdiantamentoPercentual(numericValue)
      }
      handleChange(field, numericValue)
    }
  }

  const handleManualToggle = (checked: boolean) => {
    setIsManual(checked)
    if (checked) {
      // Initialize manual values with current auto values
      setHonorariosValorManual(honorariosValorAuto)
      setAdiantamentoValorManual(adiantamentoValorAuto)
    }
  }

  const handleAvancar = () => {
    const newHonPercent = isManual && baseCalculo > 0 ? (honorariosValorManual / baseCalculo) * 100 : honorariosPercentual
    const newAdiPercent = isManual && baseCalculo > 0 ? (adiantamentoValorManual / baseCalculo) * 100 : adiantamentoPercentual

    onCompletar({
      honorarios: {
        honorarios_percentual: newHonPercent,
        honorarios_valor: honorariosValorFinal,
        adiantamento_percentual: newAdiPercent,
        adiantamento_valor: adiantamentoValorFinal,
      },
      // Campos legados para compatibilidade
      honorarios_contratuais: honorariosValorFinal,
      adiantamento_recebido: adiantamentoValorFinal,
      honorariosTotal: honorariosValorFinal,
      adiantamentoValor: adiantamentoValorFinal,
      honorarios_manual: isManual
    })

    setDados({
      ...dados,
      honorarios_manual: isManual,
      honorarios_percentual: newHonPercent,
      adiantamento_percentual: newAdiPercent
    })
  }

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const formatarMoedaOpcional = (valor: any) => {
    if (valor === null || valor === undefined || valor === "") return "—"
    const parsed = Number(valor)
    if (!Number.isFinite(parsed)) return "—"
    return formatarMoeda(parsed)
  }

  const formatarPercentual = (valor: any) => {
    if (valor === null || valor === undefined || valor === "") return "—"
    const parsed = Number(valor)
    if (!Number.isFinite(parsed)) return "—"
    return parsed.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%"
  }

  const formatarSimNao = (valor: any) => {
    if (valor === true) return "Sim"
    if (valor === false) return "Não"
    return "Não informado"
  }

  const formatarHerdeiros = (valor: any) => {
    if (typeof valor === "string" && valor.trim()) return valor
    return formatarSimNao(valor)
  }

  const hasAnaliseInfo = [
    dados.analise_penhora_valor,
    dados.analise_penhora_percentual,
    dados.analise_cessao_valor,
    dados.analise_cessao_percentual,
    dados.analise_adiantamento_valor,
    dados.analise_adiantamento_percentual,
    dados.analise_honorarios_valor,
    dados.analise_honorarios_percentual,
    dados.analise_itcmd,
    dados.analise_itcmd_valor,
    dados.analise_itcmd_percentual,
    dados.analise_herdeiros,
    dados.analise_observacoes,
  ].some((valor) => valor !== null && valor !== undefined && valor !== "")

  return (
    <Card className="calc-card relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="calc-title">Honorários e Adiantamentos</CardTitle>
            <CardDescription className="calc-subtitle">Configure percentuais e valores sobre a base líquida.</CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-2 shadow-sm">
            <Switch
              id="manual-mode-honorarios"
              checked={isManual}
              onCheckedChange={handleManualToggle}
              className="border border-border/60 shadow-sm data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted [&>span]:bg-background"
            />
            <Label htmlFor="manual-mode-honorarios" className="text-sm font-medium cursor-pointer">
              Modo Manual
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <KpiCard
            label="Honorários"
            value={formatarMoeda(honorariosValorFinal)}
            helper={`${honorariosPercentual}%`}
            tone="primary"
            icon={<BadgePercent className="h-4 w-4" />}
          />
          <KpiCard
            label="Adiantamento"
            value={formatarMoeda(adiantamentoValorFinal)}
            helper={`${adiantamentoPercentual}%`}
            tone="warning"
            icon={<BadgePercent className="h-4 w-4" />}
          />
        </div>

        {baseCalculo === 0 ? (
          <SectionPanel title="Base de cálculo indisponível" description="Conclua as etapas anteriores para liberar os valores." tone="warning">
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Base de cálculo ainda não disponível</p>
                <p>Os valores em R$ serão calculados automaticamente após completar Atualização, PSS e IRPF.</p>
              </div>
            </div>
          </SectionPanel>
        ) : (
          <SectionPanel title="Base líquida" description="Valor líquido antes de honorários e adiantamentos." tone="info">
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">Base de cálculo (líquida)</p>
              <p className="text-sm font-medium">{formatarMoeda(baseCalculo)}</p>
            </div>
          </SectionPanel>
        )}

        <SectionPanel
          title="Observações da análise processual"
          description="Variáveis que podem impactar descontos no credor."
          tone="warning"
        >
          {hasAnaliseInfo ? (
            <div className="space-y-3">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Penhora (R$)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatarMoedaOpcional(dados.analise_penhora_valor)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Penhora (%)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatarPercentual(dados.analise_penhora_percentual)}
                  </p>
                </div>
                {dados.analise_cessao === true && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Cessão (R$)</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatarMoedaOpcional(dados.analise_cessao_valor)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Cessão (%)</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatarPercentual(dados.analise_cessao_percentual)}
                      </p>
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Adiantamento recebido (R$)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatarMoedaOpcional(dados.analise_adiantamento_valor)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Adiantamento recebido (%)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatarPercentual(dados.analise_adiantamento_percentual)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Honorários contratuais (R$)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatarMoedaOpcional(dados.analise_honorarios_valor)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Honorários contratuais (%)</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatarPercentual(dados.analise_honorarios_percentual)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Herdeiros habilitados</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatarHerdeiros(dados.analise_herdeiros)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">ITCMD</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatarSimNao(dados.analise_itcmd)}
                  </p>
                </div>
                {dados.analise_itcmd === true && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">ITCMD (R$)</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatarMoedaOpcional(dados.analise_itcmd_valor)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">ITCMD (%)</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatarPercentual(dados.analise_itcmd_percentual)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {dados.analise_observacoes && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm text-foreground whitespace-pre-line">
                    {dados.analise_observacoes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma observação registrada na análise processual.
            </p>
          )}
        </SectionPanel>

        <SectionPanel
          title="Percentuais e valores"
          description="Defina percentuais e, se necessário, substitua os valores manualmente."
          tone="primary"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Honorários Contratuais (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={honorariosPercentual || ""}
                  onChange={(e) => handlePercentualChange("honorarios_percentual", e.target.value)}
                  placeholder="0.00"
                  disabled={isManual}
                />
              </div>
              {isManual && (
                <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                  <Label className="text-sm text-muted-foreground mb-1 block">
                    Valor Honorários (R$)
                    {isManual && <span className="ml-1 text-muted-foreground">(Manual)</span>}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="font-bold text-foreground border-border"
                    value={honorariosValorManual}
                    onChange={(e) => setHonorariosValorManual(Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Adiantamento Recebido (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={adiantamentoPercentual || ""}
                  onChange={(e) => handlePercentualChange("adiantamento_percentual", e.target.value)}
                  placeholder="0.00"
                  disabled={isManual}
                />
              </div>
              {isManual && (
                <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                  <Label className="text-sm text-muted-foreground mb-1 block">
                    Valor Adiantamento (R$)
                    {isManual && <span className="ml-1 text-muted-foreground">(Manual)</span>}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="font-bold text-foreground border-border"
                    value={adiantamentoValorManual}
                    onChange={(e) => setAdiantamentoValorManual(Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
              )}
            </div>
          </div>
        </SectionPanel>

        </div>
        <StepFooter onBack={voltar} onNext={handleAvancar} />
      </CardContent>
    </Card>
  )

}
