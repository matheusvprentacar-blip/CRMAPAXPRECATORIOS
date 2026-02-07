"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { SegmentedToggle } from "@/components/ui/segmented-toggle"
import { Calculator, CheckCircle2, AlertCircle } from "lucide-react"
import { StepFooter } from "@/components/ui/calc/StepFooter"
import { useState, useEffect, useCallback } from "react"

interface StepIRPFProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  resultadosEtapas: any[]
  voltar: () => void
}

const RRA_FAIXAS = [
  { limite: 2428.8, aliquota: 0, parcela: 0, label: "Isento" },
  { limite: 2826.65, aliquota: 0.075, parcela: 182.16, label: "7,5%" },
  { limite: 3751.05, aliquota: 0.15, parcela: 394.16, label: "15%" },
  { limite: 4664.68, aliquota: 0.225, parcela: 675.49, label: "22,5%" },
  { limite: Number.POSITIVE_INFINITY, aliquota: 0.275, parcela: 908.73, label: "27,5%" },
]

const getFaixaRRA = (baseMensal: number) => {
  if (baseMensal <= 0) return RRA_FAIXAS[0]
  for (const faixa of RRA_FAIXAS) {
    if (baseMensal <= faixa.limite) return faixa
  }
  return RRA_FAIXAS[RRA_FAIXAS.length - 1]
}

const fmt = (n: number) =>
  n?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00"

export function StepIRPF({ dados, setDados, onCompletar, resultadosEtapas, voltar }: StepIRPFProps) {
  const [isManual, setIsManual] = useState<boolean>(dados.irpf_manual || false)
  const [isIsentoIrpf, setIsIsentoIrpf] = useState<boolean>(dados.irpf_isento || false)
  const [valorManual, setValorManual] = useState<number>(dados.valor_irpf || 0)
  const [preview, setPreview] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])

  const executarAuditoria = useCallback(
    (
      valorPrincipal: number,
      mesesEntrada: number,
      fatorInicialEntrada?: number,
      fatorFinalEntrada?: number,
    ) => {
      const logsTemp: string[] = []

      const fatorInicial = Number(fatorInicialEntrada ?? 0)
      const fatorFinal = Number(fatorFinalEntrada ?? 0)
      const mesesRRA = mesesEntrada > 0 ? mesesEntrada : 1

      // Regra da etapa:
      // Correcao monetaria = (Valor Principal * Fator Inicial) / Fator Final
      // Base IR = Valor Principal + Correcao monetaria
      const valorCorrecaoMonetaria =
        fatorInicial > 0 && fatorFinal > 0 ? (valorPrincipal * fatorInicial) / fatorFinal : 0

      const baseIR = Math.max(0, valorPrincipal + valorCorrecaoMonetaria)
      const baseMensal = baseIR / mesesRRA
      const faixa = getFaixaRRA(baseMensal)
      const deducaoTotal = faixa.parcela * mesesRRA

      const impostoCalculado = Math.max(0, baseIR * faixa.aliquota - deducaoTotal)
      const impostoTotal = isIsentoIrpf ? 0 : impostoCalculado

      if (!(fatorInicial > 0 && fatorFinal > 0)) {
        logsTemp.push("Fator inicial/final nao informado. Correcao monetaria definida como R$ 0,00.")
      }
      logsTemp.push(`Correcao monetaria = (Principal * Fator Inicial) / Fator Final = ${fmt(valorCorrecaoMonetaria)}`)
      logsTemp.push(`Base IR = Principal (${fmt(valorPrincipal)}) + Correcao monetaria (${fmt(valorCorrecaoMonetaria)}) = ${fmt(baseIR)}`)
      logsTemp.push(`Base mensal = ${fmt(baseIR)} / ${mesesRRA} = ${fmt(baseMensal)}`)
      logsTemp.push(`Faixa aplicada: ${faixa.label}`)
      logsTemp.push(`Parcela a deduzir total: ${fmt(deducaoTotal)}`)
      if (isIsentoIrpf) {
        logsTemp.push("IRPF isento aplicado: imposto final R$ 0,00.")
      }

      setPreview({
        fatorInicial,
        fatorFinal,
        valorPrincipal,
        baseIR,
        valorCorrecaoMonetaria,
        meses: mesesRRA,
        baseMensal,
        faixa: faixa.label,
        aliquota: faixa.aliquota,
        parcelaDeduzirMensal: faixa.parcela,
        deducaoTotal,
        irpfTotal: impostoTotal,
      })

      setLogs(logsTemp)

      if (!isManual) {
        setValorManual(impostoTotal)
      }
    },
    [isManual, isIsentoIrpf],
  )

  useEffect(() => {
    if (isIsentoIrpf) {
      setIsManual(false)
      setValorManual(0)
    }
  }, [isIsentoIrpf])

  useEffect(() => {
    const valorPrincipal = Number(dados.valor_principal_original || 0)
    if (!valorPrincipal) {
      setPreview(null)
      return
    }

    const stepAtualizacao = resultadosEtapas?.[2] ?? resultadosEtapas?.[1]
    const fatorInicial = Number(
      dados.ipca_fator_inicial ?? stepAtualizacao?.memoriaCalculo?.ipca?.fatorInicial ?? 0,
    )
    const fatorFinal = Number(
      dados.ipca_fator_final ?? stepAtualizacao?.memoriaCalculo?.ipca?.fatorFinal ?? 0,
    )

    const mesesRRA = Number(dados.meses_execucao_anterior) || 1

    executarAuditoria(valorPrincipal, mesesRRA, fatorInicial, fatorFinal)
  }, [
    dados.valor_principal_original,
    dados.meses_execucao_anterior,
    dados.ipca_fator_inicial,
    dados.ipca_fator_final,
    resultadosEtapas,
    executarAuditoria,
  ])

  const handleChange = (field: string, value: any) => {
    setDados({ ...dados, [field]: value })
  }

  const handleAvancar = () => {
    const valorFinal = isIsentoIrpf ? 0 : isManual ? valorManual : preview?.irpfTotal || 0

    setDados({
      ...dados,
      irpf_manual: isManual,
      valor_irpf: valorFinal,
      irpf_isento: isIsentoIrpf,
    })

    onCompletar({
      meses_execucao_anterior: dados.meses_execucao_anterior,
      valor_irpf: valorFinal,
      irTotal: valorFinal,
      irpf_valor: valorFinal,
      irpf_manual: isManual,
      irpf_isento: isIsentoIrpf,
      audit_snapshot: preview,
    })
  }

  const hasModoSelecionado = isIsentoIrpf || isManual
  const modoSelecionado = isIsentoIrpf ? "irpf" : isManual ? "manual" : undefined

  return (
    <Card className="calc-card relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="calc-title flex items-center gap-2">
              IRPF RRA
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--chart-4))]" />
            </CardTitle>
            <CardDescription className="calc-subtitle">
              Base do IR: Valor Principal + Correcao monetaria.
            </CardDescription>
          </div>
          <SegmentedToggle
            value={modoSelecionado}
            onChange={(v) => {
              if (v === modoSelecionado) {
                setIsManual(false)
                setIsIsentoIrpf(false)
                return
              }
              if (v === "manual") {
                setIsManual(true)
                setIsIsentoIrpf(false)
                return
              }
              if (v === "irpf") {
                setIsIsentoIrpf(true)
                setIsManual(false)
                return
              }
              setIsManual(false)
              setIsIsentoIrpf(false)
            }}
            options={[
              { value: "manual", label: "Modo Manual" },
              { value: "irpf", label: "Isento de IRPF" },
            ]}
            className={`w-full max-w-md ${hasModoSelecionado ? "ring-1 ring-border" : "ring-2 ring-primary/40"}`}
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              label="Base IR"
              value={fmt(preview?.baseIR || 0)}
              helper="Principal + correcao monetaria"
              tone="primary"
              icon={<Calculator className="h-4 w-4" />}
            />
            <KpiCard
              label="Base Mensal"
              value={fmt(preview?.baseMensal || 0)}
              helper={`RRA em ${preview?.meses || 0} meses`}
              tone="info"
              icon={<Calculator className="h-4 w-4" />}
            />
            <KpiCard
              label="Imposto Devido"
              value={fmt(preview?.irpfTotal || 0)}
              helper="Resultado final"
              tone="danger"
              icon={<AlertCircle className="h-4 w-4" />}
            />
          </div>

          <SectionPanel
            title="Parametros do RRA"
            description="Somente dados necessarios para o calculo de IRPF."
            tone="info"
          >
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 space-y-2 md:col-span-4">
                <Label className="text-sm text-muted-foreground">Tipo de Beneficiario</Label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={dados.tipo_beneficiario || "credor"}
                  onChange={(e) => handleChange("tipo_beneficiario", e.target.value)}
                >
                  <option value="credor">Beneficiario Original (RRA)</option>
                  <option value="advogado">Advogado</option>
                </select>
              </div>

              <div className="col-span-12 space-y-2 md:col-span-4">
                <Label className="text-sm text-muted-foreground">Meses de Execucao (RRA)</Label>
                <Input
                  type="number"
                  value={dados.meses_execucao_anterior || ""}
                  onChange={(e) => handleChange("meses_execucao_anterior", Number(e.target.value))}
                  placeholder="Ex: 60"
                  className="font-mono"
                  disabled={dados.tipo_beneficiario === "advogado"}
                />
              </div>

              <div className="col-span-12 space-y-2 md:col-span-2">
                <Label className="text-sm text-muted-foreground">Fator Inicial</Label>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground">
                  {(preview?.fatorInicial ?? 0).toFixed(7)}
                </div>
              </div>

              <div className="col-span-12 space-y-2 md:col-span-2">
                <Label className="text-sm text-muted-foreground">Fator Final</Label>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground">
                  {(preview?.fatorFinal ?? 0).toFixed(7)}
                </div>
              </div>
            </div>
          </SectionPanel>

          {preview && (
            <SectionPanel
              title="Calculo fiscal"
              description="Base IR por principal somado a correcao monetaria."
              tone="danger"
            >
              <Card className="calc-card">
                <CardContent className="p-0 text-sm">
                  <div className="divide-y divide-border/60">
                    <div className="flex justify-between p-2 px-4">
                      <span className="text-muted-foreground">Valor principal</span>
                      <span>{fmt(preview.valorPrincipal)}</span>
                    </div>
                    <div className="flex justify-between p-2 px-4">
                      <span className="text-muted-foreground">Correcao monetaria = (Principal * Fator Inicial) / Fator Final</span>
                      <span>{fmt(preview.valorCorrecaoMonetaria)}</span>
                    </div>
                    <div className="flex justify-between p-2 px-4">
                      <span className="text-muted-foreground">Base IR = Principal + Correcao monetaria</span>
                      <span>{fmt(preview.baseIR)}</span>
                    </div>
                    <div className="flex justify-between p-2 px-4">
                      <span className="text-muted-foreground">Base mensal ({preview.meses} meses)</span>
                      <span>{fmt(preview.baseMensal)}</span>
                    </div>
                    <div className="flex justify-between p-2 px-4">
                      <span className="text-muted-foreground">Faixa</span>
                      <span>{preview.faixa}</span>
                    </div>
                    <div className="flex justify-between p-2 px-4">
                      <span className="text-muted-foreground">Parcela deduzir mensal</span>
                      <span>{fmt(preview.parcelaDeduzirMensal)}</span>
                    </div>
                    <div className="flex justify-between p-2 px-4">
                      <span className="text-muted-foreground">Parcela deduzir total</span>
                      <span>{fmt(preview.deducaoTotal)}</span>
                    </div>
                    <div className="flex justify-between p-2 px-4 bg-destructive/10">
                      <span className="font-semibold text-destructive">IMPOSTO DEVIDO</span>
                      <span className="font-bold text-destructive">{fmt(preview.irpfTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SectionPanel>
          )}

          {logs.length > 0 && (
            <SectionPanel title="Log de auditoria" description="Resumo tecnico da regra aplicada." tone="neutral">
              <div className="rounded-xl p-3 text-[10px] font-mono text-muted-foreground bg-muted/40 max-h-[120px] overflow-y-auto">
                {logs.map((l, i) => (
                  <div key={i}>{`> ${l}`}</div>
                ))}
              </div>
            </SectionPanel>
          )}

          {isManual && (
            <SectionPanel title="Valor manual do IRPF" description="Este valor sobrescreve o calculo acima." tone="warning">
              <Input
                type="number"
                value={valorManual}
                onChange={(e) => setValorManual(Number(e.target.value))}
                className="mt-1"
              />
            </SectionPanel>
          )}
        </div>

        <StepFooter onBack={voltar} onNext={handleAvancar} />
      </CardContent>
    </Card>
  )
}
