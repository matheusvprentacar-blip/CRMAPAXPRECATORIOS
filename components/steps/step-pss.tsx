"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { Switch } from "@/components/ui/switch"
import { BadgePercent, Calculator, CircleSlash, ShieldCheck } from "lucide-react"
import { StepFooter } from "@/components/ui/calc/StepFooter"

interface StepPSSProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  resultadosEtapas: any[]
  precatorioId?: string
}

export function StepPSS({ dados, setDados, onCompletar, voltar, resultadosEtapas }: StepPSSProps) {
  const [pssOficio, setPssOficio] = useState<number>(dados.pss_oficio_valor || 0)
  const [isento, setIsento] = useState<boolean>(dados.isento_pss || false)
  const [isManual, setIsManual] = useState<boolean>(dados.pss_manual || false)
  const [pssManualValor, setPssManualValor] = useState<number>(dados.pss_valor || 0)

  const [pssIPCA, setPssIPCA] = useState<number>(0)
  const [pssSelic, setPssSelic] = useState<number>(0)
  const [pssIpca2025, setPssIpca2025] = useState<number>(0)
  const [pssTotalAuto, setPssTotalAuto] = useState<number>(0)

  const [fatorIPCA, setFatorIPCA] = useState<number>(0)
  const [fatorSelic, setFatorSelic] = useState<number>(0)
  const [fatorIpca2025, setFatorIpca2025] = useState<number>(0)

  useEffect(() => {
    const indices = resultadosEtapas[1]

    let valIPCA = 0
    let valSelic = 0
    let valIpca2025 = 0
    let total = 0
    let fIPCA = 0
    let fSelic = 0
    let fIpca2025 = 0

    if (indices && pssOficio > 0) {
      if (indices.ipca_fator_inicial > 0 && indices.ipca_fator_final > 0) {
        const fInicial = indices.ipca_fator_inicial
        const fFinal = indices.ipca_fator_final

        valIPCA = (pssOficio / fInicial) * fFinal
        fIPCA = fFinal / fInicial
      } else {
        valIPCA = pssOficio
        fIPCA = 1
      }

      if (indices.selic_acumulada_percentual > 0) {
        fSelic = indices.selic_acumulada_percentual / 100
        valSelic = pssOficio * fSelic
      }

      const percIpca2025 = indices?.dados_ipca_2025?.percentualAcumulado ?? 0
      if (percIpca2025) {
        fIpca2025 = percIpca2025 / 100
        valIpca2025 = pssOficio * fIpca2025
      }

      total = valIPCA + valSelic + valIpca2025
    }

    setPssIPCA(valIPCA)
    setPssSelic(valSelic)
    setPssIpca2025(valIpca2025)
    setPssTotalAuto(total)
    setFatorIPCA(fIPCA)
    setFatorSelic(fSelic)
    setFatorIpca2025(fIpca2025)
  }, [pssOficio, resultadosEtapas, dados.valor_principal_original])

  const handleAvancar = () => {
    const valorFinal = isManual ? pssManualValor : pssTotalAuto

    const dadosAtualizados = {
      ...dados,
      pss_oficio_valor: isento ? 0 : pssOficio,
      isento_pss: isento,
      pss_manual: isManual,
      pss_valor: isento ? 0 : valorFinal,
      dados_calculo: {
        ...(dados.dados_calculo || {}),
        pss_detalhe: {
          base: pssOficio,
          correcao_ipca: pssIPCA,
          selic: pssSelic,
          fator_ipca: fatorIPCA,
          fator_selic: fatorSelic,
          ec136_2025: pssIpca2025,
          fator_ipca_2025: fatorIpca2025,
        },
      },
    }
    setDados(dadosAtualizados)

    onCompletar({
      pss_oficio_valor: isento ? 0 : pssOficio,
      pss_valor: isento ? 0 : valorFinal,
      pssTotal: isento ? 0 : valorFinal,
      pss_atualizado: isento ? 0 : valorFinal,
      tem_desconto_pss: !isento,
      isento_pss: isento,
      pss_manual: isManual,
    })
  }

  const formatarMoeda = (val: number) => val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  const totalExibido = isManual ? pssManualValor : pssTotalAuto

  return (
    <Card className="calc-card relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="calc-title">PSS - Previdência Social</CardTitle>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-full border border-border/60 bg-background/70 px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 px-2">
              <Switch
                id="isento-pss"
                checked={isento}
                onCheckedChange={(checked) => setIsento(!!checked)}
                className="border border-border/60 shadow-sm data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted [&>span]:bg-background"
              />
              <Label htmlFor="isento-pss" className="text-sm font-medium cursor-pointer">Isento</Label>
            </div>

            {!isento && (
              <>
                <div className="h-4 w-px bg-border/60" />
                <div className="flex items-center gap-2 px-2">
                  <Switch
                    id="manual-mode-pss"
                    checked={isManual}
                    onCheckedChange={(checked) => setIsManual(!!checked)}
                    className="border border-border/60 shadow-sm data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted [&>span]:bg-background"
                  />
                  <Label htmlFor="manual-mode-pss" className="text-sm font-medium cursor-pointer">Modo manual</Label>
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            label="PSS do Ofício"
            value={formatarMoeda(pssOficio)}
            helper="Base informada"
            tone="info"
            icon={<BadgePercent className="h-4 w-4" />}
          />
          <KpiCard
            label="Total PSS"
            value={formatarMoeda(totalExibido)}
            helper={isManual ? "Manual" : "Automático"}
            tone={isento ? "neutral" : "primary"}
            icon={<Calculator className="h-4 w-4" />}
          />
          <KpiCard
            label="Status"
            value={isento ? "Isento" : isManual ? "Manual" : "Automático"}
            helper={isento ? "Sem desconto" : "Com desconto"}
            tone={isento ? "warning" : "success"}
            icon={<CircleSlash className="h-4 w-4" />}
          />
        </div>

        {!isento ? (
          <div className="space-y-6">
            <SectionPanel
              title="Base e total do PSS"
              description="Informe o valor do ofício ou utilize o cálculo automático."
              tone="primary"
            >
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 space-y-2 md:col-span-8">
                  <Label className="text-sm text-muted-foreground">Valor do PSS no Ofício (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={pssOficio}
                    onChange={(e) => setPssOficio(Number.parseFloat(e.target.value) || 0)}
                    className="rounded-md text-base"
                  />
                  <p className="text-xs text-muted-foreground">Base informada no ofício para cálculo de PSS.</p>
                </div>

                <div className="col-span-12 rounded-2xl border border-border/60 bg-muted/20 p-4 md:col-span-4">
                  <p className="text-sm text-muted-foreground">Total PSS atualizado</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums value-total">{formatarMoeda(totalExibido)}</p>
                  <p className="text-xs text-muted-foreground">
                    {isManual ? "Valor definido manualmente." : "Cálculo automático com índices oficiais."}
                  </p>
                </div>
              </div>
            </SectionPanel>

            {!isManual ? (
              <SectionPanel
                title="Memória de cálculo (automático)"
                description="Resumo dos fatores aplicados ao valor do ofício."
                tone="info"
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">1. Correção (IPCA-E)</p>
                      <p className="text-xs text-muted-foreground">{formatarMoeda(pssOficio)} x {fatorIPCA.toFixed(6)}</p>
                    </div>
                    <span className="font-semibold tabular-nums value-main">{formatarMoeda(pssIPCA)}</span>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">2. SELIC (Proporcional)</p>
                      <p className="text-xs text-muted-foreground">{formatarMoeda(pssOficio)} x {fatorSelic.toFixed(6)}</p>
                    </div>
                    <span className="font-semibold tabular-nums value-main">{formatarMoeda(pssSelic)}</span>
                  </div>

                  <div className="flex flex-col gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">3. EC 136/2025 (IPCA 2025)</p>
                      <p className="text-xs text-muted-foreground">{formatarMoeda(pssOficio)} x {fatorIpca2025.toFixed(6)}</p>
                    </div>
                    <span className="font-semibold tabular-nums value-main">{formatarMoeda(pssIpca2025)}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <span className="text-sm text-muted-foreground">Total PSS atualizado</span>
                    <span className="text-lg font-semibold tabular-nums value-total">{formatarMoeda(pssTotalAuto)}</span>
                  </div>
                </div>
              </SectionPanel>
            ) : (
              <SectionPanel title="Valor PSS Manual" description="Você está definindo o valor final manualmente." tone="warning">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Valor PSS Manual (Total)</Label>
                  <Input
                    type="number"
                    className="rounded-md text-base"
                    value={pssManualValor}
                    onChange={(e) => setPssManualValor(Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
              </SectionPanel>
            )}
          </div>
        ) : (
          <SectionPanel title="Isenção" description="Sem desconto de PSS aplicado." tone="warning">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-muted-foreground">
              <p className="text-sm font-semibold">Isento de PSS</p>
              <p className="text-xs">Valor final: R$ 0,00.</p>
            </div>
          </SectionPanel>
        )}

        </div>
        <StepFooter onBack={voltar} onNext={handleAvancar} />
      </CardContent>
    </Card>
  )

}
