"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { SegmentedToggle } from "@/components/ui/segmented-toggle"
import { BadgePercent, Calculator, CheckCircle2, Info, Loader2, AlertCircle } from "lucide-react"
import { StepFooter } from "@/components/ui/calc/StepFooter"
import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "@/lib/supabase/client"

interface StepIRPFProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  resultadosEtapas: any[]
  voltar: () => void
}

type IndiceEconomico = {
  id: number
  type: string
  reference_date: string
  value: number
}

const INICIO_EC136 = new Date(2025, 0, 1)
const FIM_SELIC_2024 = new Date(2024, 11, 1)

const RRA_FAIXAS = [
  { limite: 2259.20, aliquota: 0, parcela: 0, label: "Isento" },
  { limite: 2826.65, aliquota: 0.075, parcela: 169.44, label: "7,5%" },
  { limite: 3751.05, aliquota: 0.15, parcela: 381.44, label: "15%" },
  { limite: 4664.68, aliquota: 0.225, parcela: 662.77, label: "22,5%" },
  { limite: Number.POSITIVE_INFINITY, aliquota: 0.275, parcela: 896.00, label: "27,5%" }
]

const getFaixaRRA = (baseMensal: number) => {
  if (baseMensal <= 0) {
    return RRA_FAIXAS[0]
  }

  for (const faixa of RRA_FAIXAS) {
    if (baseMensal <= faixa.limite) {
      return faixa
    }
  }

  return RRA_FAIXAS[RRA_FAIXAS.length - 1]
}

const toMesAno = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

const fmt = (n: number) => n?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00"

export function StepIRPF({ dados, setDados, onCompletar, resultadosEtapas, voltar }: StepIRPFProps) {
  // DB State
  const [loadingDB, setLoadingDB] = useState(true)
  const [dbStatus, setDbStatus] = useState<"connecting" | "connected" | "error">("connecting")
  const [indicesSelic, setIndicesSelic] = useState<IndiceEconomico[]>([])
  const [indicesIpca, setIndicesIpca] = useState<IndiceEconomico[]>([])

  // Logic State
  const [isManual, setIsManual] = useState<boolean>(dados.irpf_manual || false)
  const [isIsentoIrpf, setIsIsentoIrpf] = useState<boolean>(dados.irpf_isento || false)
  const [valorManual, setValorManual] = useState<number>(dados.valor_irpf || 0)
  const [preview, setPreview] = useState<any>(null)

  // Logs
  const [logs, setLogs] = useState<string[]>([])

  // --- CARREGAR DADOS DO DB ---
  const executarAuditoria = useCallback((
    valPrincipal: number,
    valJuros: number,
    valDeducoes: number,
    dtBaseStr: string,
    dtFinalStr: string,
    numMeses: number
  ) => {

    const logsTemp: string[] = []

    const dtBaseLocal = new Date(dtBaseStr + "T00:00:00")
    const dtFinalLocal = new Date(dtFinalStr + "T00:00:00")
    const dtCorteLocal = new Date("2022-01-01T00:00:00")

    // 1. IPCA (Mensal Acumulado)
    let val_IPCA = valPrincipal
    let val_JurosPre22 = 0
    let fatorAcumulado = 1.0

    if (dtBaseLocal < dtCorteLocal) {
      const indicesPeriodo = indicesIpca.filter(i => {
        const d = new Date(i.reference_date + "T00:00:00")
        return d >= dtBaseLocal && d < dtCorteLocal
      })

      if (indicesPeriodo.length > 0) {
        indicesPeriodo.forEach(idx => {
          fatorAcumulado = fatorAcumulado * (1 + (Number(idx.value) / 100))
        })
        val_IPCA = valPrincipal * fatorAcumulado
        logsTemp.push(`IPCA: ${indicesPeriodo.length} meses acumulados. Fator: ${fatorAcumulado.toFixed(6)}`)
      } else {
        logsTemp.push("IPCA: Nenhum índice no período.")
      }

      // Juros Simples 0.5% a.m.
      const diffTime = Math.abs(dtCorteLocal.getTime() - dtBaseLocal.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const mesesPre22 = Math.floor(diffDays / 30)

      val_JurosPre22 = val_IPCA * (mesesPre22 * 0.005)
      logsTemp.push(`Juros Pré-22: ${mesesPre22} meses (0.5%). Valor: ${fmt(val_JurosPre22)}`)
    }

    const baseParaSelic = val_IPCA

    // 2. SELIC
    let selicAcumulada = 0

    if (dtFinalLocal >= dtCorteLocal) {
      const fimSelic = dtFinalLocal < FIM_SELIC_2024 ? dtFinalLocal : FIM_SELIC_2024
      const taxasFiltradas = indicesSelic.filter(i => {
        const d = new Date(i.reference_date + "T00:00:00")
        const inicioReal = dtBaseLocal > dtCorteLocal ? dtBaseLocal : dtCorteLocal
        return d >= inicioReal && d <= fimSelic
      })

      taxasFiltradas.forEach(t => selicAcumulada += Number(t.value))
      logsTemp.push(`SELIC: ${taxasFiltradas.length} taxas somadas. Total: ${selicAcumulada.toFixed(2)}%`)
    }

    let val_Selic = baseParaSelic * (selicAcumulada / 100)

    // 3. EC136/2025 (IPCA 2025)
    const baseMes = new Date(dtBaseLocal.getFullYear(), dtBaseLocal.getMonth(), 1)
    const fimMesEc136 = new Date(dtFinalLocal.getFullYear(), dtFinalLocal.getMonth(), 1)
    const inicioEc136 = baseMes > INICIO_EC136 ? baseMes : INICIO_EC136
    let ec136Percentual = 0
    let ec136Meses = 0

    if (inicioEc136 <= fimMesEc136) {
      const mesInicio = toMesAno(inicioEc136)
      const mesFim = toMesAno(fimMesEc136)
      indicesIpca.forEach(idx => {
        const mesAno = toMesAno(new Date(idx.reference_date + "T00:00:00"))
        if (mesAno >= mesInicio && mesAno <= mesFim) {
          ec136Percentual += Number(idx.value)
          ec136Meses += 1
        }
      })
    }

    let val_EC136 = valPrincipal * (ec136Percentual / 100)
    logsTemp.push(`EC136/2025: ${ec136Meses} meses. Total: ${ec136Percentual.toFixed(2)}% (${fmt(val_EC136)})`)

    const stepAtualizacao = resultadosEtapas?.[2] ?? resultadosEtapas?.[1]
    if (stepAtualizacao) {
      const valorCorrigido = Number(
        stepAtualizacao.valor_corrigido_monetariamente ??
        stepAtualizacao.valorCorrigido ??
        stepAtualizacao.memoriaCalculo?.ipca?.resultado ??
        val_IPCA
      )
      const valorJurosPre22 = Number(
        stepAtualizacao.valorJurosPre22 ??
        stepAtualizacao.valorJuros ??
        stepAtualizacao.juros_mora_aplicados ??
        stepAtualizacao.juros_mora ??
        val_JurosPre22
      )
      const valorSelic = Number(
        stepAtualizacao.valorSelic ??
        stepAtualizacao.memoriaCalculo?.selic?.resultado ??
        val_Selic
      )
      const valorEc136 = Number(
        stepAtualizacao.correcaoIPCA2025 ??
        stepAtualizacao.memoriaCalculo?.ipca2025?.resultado ??
        val_EC136
      )

      if (!Number.isNaN(valorCorrigido)) {
        val_IPCA = valorCorrigido
      }
      if (!Number.isNaN(valorJurosPre22)) {
        val_JurosPre22 = valorJurosPre22
      }
      if (!Number.isNaN(valorSelic)) {
        val_Selic = valorSelic
      }
      if (!Number.isNaN(valorEc136)) {
        val_EC136 = valorEc136
      }

      logsTemp.push("Usando valores da etapa de atualização monetária.")
    }

    const baseCorrecoes = val_IPCA + val_Selic + val_EC136
    const totalBruto = baseCorrecoes + val_JurosPre22 + valJuros
    const baseIR = Math.max(0, totalBruto - valDeducoes - val_JurosPre22 - valJuros)
    logsTemp.push(`Base IR Ajustada: Total Bruto (${fmt(totalBruto)}) - Deduções (${fmt(valDeducoes)}) - Juros Pré-22 (${fmt(val_JurosPre22)}) - Juros Originais (${fmt(valJuros)}) = ${fmt(baseIR)}`)

    const mesesRRA = numMeses > 0 ? numMeses : 1
    const baseMensal = mesesRRA > 0 ? baseIR / mesesRRA : 0
    const faixa = getFaixaRRA(baseMensal)
    const deducaoTotal = faixa.parcela * mesesRRA
    const impostoCalculado = Math.max(0, ((baseMensal * faixa.aliquota) - faixa.parcela) * mesesRRA)
    const impostoTotal = isIsentoIrpf ? 0 : impostoCalculado

    logsTemp.push(`RRA: Base ${fmt(baseIR)} / ${mesesRRA} meses = ${fmt(baseMensal)}/mês. Faixa: ${faixa.label} / Parcela: ${fmt(faixa.parcela * mesesRRA)}`)
    logsTemp.push(`Base (Princ + IPCA + SELIC + EC136): ${fmt(baseCorrecoes)}`)
    if (isIsentoIrpf) {
      logsTemp.push("IRPF isento aplicado: imposto definido como R$ 0,00.")
    }

    setLogs(logsTemp)

    setPreview({
      totalBruto,
      baseIR,
      baseMensal,
      aliquota: faixa.aliquota,
      deducao: faixa.parcela,
      deducaoTotal,
      irpfTotal: impostoTotal,
      faixa: faixa.label,
      fatorIPCA: fatorAcumulado,
      selicAcumulada,
      val_IPCA,
      val_JurosPre22,
      val_Selic,
      valDeducoes,
      val_EC136,
      ec136Percentual,
      baseCorrecoes,
      meses: mesesRRA,
      parcelaDeduzirMensal: faixa.parcela
    })

    if (!isManual) {
      setValorManual(impostoTotal)
    }
  }, [indicesIpca, indicesSelic, isManual, isIsentoIrpf, resultadosEtapas])

  useEffect(() => {
    if (isIsentoIrpf) {
      setIsManual(false)
      setValorManual(0)
    }
  }, [isIsentoIrpf])

  useEffect(() => {
    async function init() {
      try {
        const supabase = getSupabase()
        if (!supabase) return // Fallback gracefully if not configured

        // 1. Buscar SELIC
        const { data: selicData, error: errSelic } = await supabase
          .from('economic_indices')
          .select('*')
          .eq('type', 'selic')
          .order('reference_date', { ascending: true })

        if (errSelic) throw errSelic

        // 2. Buscar IPCA (Mensal)
        const { data: ipcaData, error: errIpca } = await supabase
          .from('economic_indices')
          .select('*')
          .eq('type', 'ipca_mensal')

        if (errIpca) throw errIpca

        setIndicesSelic(selicData || [])
        setIndicesIpca(ipcaData || [])
        setDbStatus("connected")
      } catch (error) {
        console.error(error)
        setDbStatus("error")
      } finally {
        setLoadingDB(false)
      }
    }
    init()
  }, [])

  // --- REAGIR A MUDANÇAS E CALCULAR AUTOMATICAMENTE ---
  useEffect(() => {
    if (loadingDB) return

    // Mapeamento de Props para Auditor Logic
    const valPrincipal = Number(dados.valor_principal_original || 0)
    // Juros: Se tiver Step de Atualização prévias, OK. Se não, usa do dado basico
    // No Auditor original, Juros Originais era input. Aqui vem do Step 1 ou 2.
    const valJuros = Number(dados.valor_juros_original || 0)

    // Deduções: Honorarios + PSS
    // Tentar pegar do Step PSS
    const stepPSS = resultadosEtapas[2]
    const valPSS = Number(stepPSS?.pss_valor || 0)

    // Deduções Contratuais: Se houver (Step Honorarios é posterior? Não, Step Honorarios é 5)
    // IRPF é Step 4. Então Honorarios ainda não existem.
    // Mas o usuário pode ter preenchido "Honorários Contratuais" no Step 1 (Dados Básicos)
    const valHonorarios = Number(dados.honorarios_contratuais || 0)

    const valDeducoes = valPSS + valHonorarios

    const dtBaseStr = dados.data_base
    const dtFinalStr = dados.data_calculo || dados.data_final_calculo || new Date().toISOString().slice(0, 10)

    if (!dtBaseStr) return // wait for data

    const numMeses = Number(dados.meses_execucao_anterior) || 1

    executarAuditoria(valPrincipal, valJuros, valDeducoes, dtBaseStr, dtFinalStr, numMeses)

  }, [
    dados.valor_principal_original,
    dados.valor_juros_original,
    dados.honorarios_contratuais,
    dados.data_base,
    dados.meses_execucao_anterior,
    resultadosEtapas,
    loadingDB,
    indicesIpca, // Re-run if loaded
    indicesSelic,
    executarAuditoria
  ])

  const handleChange = (field: string, value: any) => {
    setDados({ ...dados, [field]: value })
  }

  const handleAvancar = () => {
    const valorFinal = isIsentoIrpf ? 0 : (isManual ? valorManual : (preview?.irpfTotal || 0))

    setDados({
      ...dados,
      irpf_manual: isManual,
      valor_irpf: valorFinal,
      irpf_isento: isIsentoIrpf
    })

    onCompletar({
      meses_execucao_anterior: dados.meses_execucao_anterior,
      valor_irpf: valorFinal,
      irTotal: valorFinal,
      irpf_valor: valorFinal,
      irpf_manual: isManual,
      irpf_isento: isIsentoIrpf,
      // Save audit details to verify later
      audit_snapshot: preview
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
              Auditoria Fiscal (RRA)
              {loadingDB ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <CheckCircle2 className="h-4 w-4 text-[hsl(var(--chart-4))]" />}
            </CardTitle>
            <CardDescription className="calc-subtitle">
              Cálculo auditado utilizando índices oficiais (IPCA Mensal + SELIC) diretamente do Banco de Dados.
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
            label="Base Bruta"
            value={fmt(preview?.totalBruto || 0)}
            helper="Principal + correções"
            tone="info"
            icon={<BadgePercent className="h-4 w-4" />}
          />
          <KpiCard
            label="Base IR"
            value={fmt(preview?.baseIR || 0)}
            helper="Após deduções"
            tone="primary"
            icon={<Calculator className="h-4 w-4" />}
          />
          <KpiCard
            label="Imposto Devido"
            value={fmt(preview?.irpfTotal || 0)}
            helper="Resultado RRA"
            tone="danger"
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </div>

        <SectionPanel
          title="Parâmetros do RRA"
          description="Definições necessárias para o cálculo do imposto."
          tone="info"
        >
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-2 md:col-span-4">
              <Label className="text-sm text-muted-foreground">Tipo de Beneficiário</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 text-sm"
                value={dados.tipo_beneficiario || "credor"}
                onChange={(e) => handleChange("tipo_beneficiario", e.target.value)}
              >
                <option value="credor">Beneficiário Original (RRA)</option>
                <option value="advogado">Advogado (Taxa Fixa 27,5%)</option>
              </select>
            </div>

            <div className="col-span-12 space-y-2 md:col-span-4">
              <Label className="text-sm text-muted-foreground">Meses de Execução (RRA)</Label>
              <Input
                type="number"
                value={dados.meses_execucao_anterior || ""}
                onChange={(e) => handleChange("meses_execucao_anterior", Number(e.target.value))}
                placeholder="Ex: 60"
                className="font-mono"
                disabled={dados.tipo_beneficiario === "advogado"}
              />
              <p className="text-xs text-muted-foreground">Fundamental para definir a alíquota RRA.</p>
            </div>

            <div className="col-span-12 space-y-2 md:col-span-4">
              <Label className="text-sm text-muted-foreground">Deduções (PSS/Honorários)</Label>
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-sm text-foreground">
                {fmt(preview?.valDeducoes || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Valor importado das etapas anteriores.</p>
            </div>
          </div>
        </SectionPanel>

        {preview && (
          <SectionPanel
            title="Resumo do cálculo fiscal"
            description="Composição do valor bruto e cálculo do imposto."
            tone="danger"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="calc-card">
                <CardHeader className="py-3 bg-muted/20 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold text-foreground">1. Composição do Valor Bruto</CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-sm">
                  <div className="divide-y divide-border/60">
                    <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">Principal</span> <span>{fmt(dados.valor_principal_original)}</span></div>
                    <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">Correção (IPCA)</span> <span>{fmt(preview.val_IPCA - dados.valor_principal_original)}</span></div>
                    <div className="flex justify-between p-2 px-4 bg-muted/20"><span className="text-foreground font-medium">Valor Atualizado (Princ + IPCA)</span> <span className="font-medium">{fmt(preview.val_IPCA)}</span></div>

                    <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">SELIC (até 2024)</span> <span>{fmt(preview.val_Selic)}</span></div>
                    <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">EC 136/2025 (IPCA 2025)</span> <span>{fmt(preview.val_EC136)}</span></div>

                    <div className="bg-muted/20">
                      <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">Juros Pré-22 (Isento)</span> <span className="text-muted-foreground">{fmt(preview.val_JurosPre22)}</span></div>
                      {Number(dados.valor_juros_original) > 0 && (
                        <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">Juros Originais (Isento)</span> <span className="text-muted-foreground">{fmt(dados.valor_juros_original)}</span></div>
                      )}
                    </div>

                    <div className="flex justify-between p-2 px-4 bg-muted/30 border-t border-border/60 mt-1"><span className="font-bold text-foreground">Total Bruto da Execução</span> <span className="font-bold text-foreground">{fmt(preview.totalBruto)}</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="calc-card">
                <CardHeader className="py-3 bg-muted/20 border-b border-border/60">
                  <CardTitle className="text-sm font-semibold text-foreground">2. Cálculo Fiscal (RRA)</CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-sm">
                  <div className="divide-y divide-border/60">
                    <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">Base Bruta</span> <span>{fmt(preview.totalBruto)}</span></div>
                    <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">Base (Princ + IPCA + SELIC + EC136)</span> <span>{fmt(preview.baseCorrecoes)}</span></div>
                    <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">(-) Deduções</span> <span className="value-negative">({fmt(preview.valDeducoes)})</span></div>
                    {preview.val_JurosPre22 > 0 && (
                      <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">(-) Juros Pré-22</span> <span className="value-negative">({fmt(preview.val_JurosPre22)})</span></div>
                    )}
                    {Number(dados.valor_juros_original) > 0 && (
                      <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">(-) Juros Originais</span> <span className="value-negative">({fmt(dados.valor_juros_original)})</span></div>
                    )}
                    <div className="flex justify-between p-2 px-4 border-t border-border/60 pt-1"><span className="text-foreground font-medium">Base de Cálculo</span> <span className="font-medium">{fmt(preview.baseIR)}</span></div>
                    <div className="flex justify-between p-2 px-4"><span className="text-muted-foreground">Base Mensal (/{dados.meses_execucao_anterior} m)</span> <span>{fmt(preview.baseMensal)}</span></div>
                    <div className="flex justify-between p-2 px-4 bg-destructive/10"><span className="font-semibold text-destructive">IMPOSTO DEVIDO</span> <span className="font-bold text-destructive">{fmt(preview.irpfTotal)}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SectionPanel>
        )}

        {logs.length > 0 && (
          <SectionPanel title="Log de auditoria" description="Resumo técnico do cálculo." tone="neutral">
            <div className="rounded-xl p-3 text-[10px] font-mono text-muted-foreground bg-muted/40 max-h-[120px] overflow-y-auto">
              {logs.map((l, i) => <div key={i}>{`> ${l}`}</div>)}
            </div>
          </SectionPanel>
        )}

        {isManual && (
          <SectionPanel title="Valor Manual do IRPF" description="Este valor sobrescreverá o cálculo auditado acima." tone="warning">
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
