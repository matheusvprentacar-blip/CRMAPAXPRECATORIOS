"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, ArrowRight, Info, Calculator, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
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

export function StepIRPF({ dados, setDados, onCompletar, resultadosEtapas, voltar }: StepIRPFProps) {
  // DB State
  const [loadingDB, setLoadingDB] = useState(true)
  const [dbStatus, setDbStatus] = useState<"connecting" | "connected" | "error">("connecting")
  const [indicesSelic, setIndicesSelic] = useState<IndiceEconomico[]>([])
  const [indicesIpca, setIndicesIpca] = useState<IndiceEconomico[]>([])

  // Logic State
  const [isManual, setIsManual] = useState<boolean>(dados.irpf_manual || false)
  const [valorManual, setValorManual] = useState<number>(dados.valor_irpf || 0)
  const [preview, setPreview] = useState<any>(null)

  // Logs
  const [logs, setLogs] = useState<string[]>([])

  // --- CARREGAR DADOS DO DB ---
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
    indicesSelic
  ])

  const log = (msg: string) => {
    // console.log("[IRPF AUDITOR]", msg)
    setLogs(prev => [...prev.slice(-49), msg]) // Keep last 50 logs
  }

  const executarAuditoria = (
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
      const taxasFiltradas = indicesSelic.filter(i => {
        const d = new Date(i.reference_date + "T00:00:00")
        const inicioReal = dtBaseLocal > dtCorteLocal ? dtBaseLocal : dtCorteLocal
        return d >= inicioReal && d <= dtFinalLocal
      })

      taxasFiltradas.forEach(t => selicAcumulada += Number(t.value))
      logsTemp.push(`SELIC: ${taxasFiltradas.length} taxas somadas. Total: ${selicAcumulada.toFixed(2)}%`)
    }

    const val_Selic = baseParaSelic * (selicAcumulada / 100)

    // Total Bruto Atualizado (Principal Corrigido + Juros Mora + Selic + Juros Originais)
    // Nota: O Auditor original somava Juros Originais ao final.
    const totalBruto = baseParaSelic + val_JurosPre22 + val_Selic + valJuros

    // 3. IRPF RRA
    // Base de cálculo = Total Bruto - Deduções (PSS + Honorários) - Juros Moratórios (Pré-22 + Originais)
    // Ajuste Business Rule: Juros Moratórios são indenizatórios e não incidem IR.
    const baseIR = Math.max(0, totalBruto - valDeducoes - val_JurosPre22 - valJuros)
    logsTemp.push(`Base IR Ajustada: Total Bruto (${fmt(totalBruto)}) - Deduções (${fmt(valDeducoes)}) - Juros Pré-22 (${fmt(val_JurosPre22)}) - Juros Originais (${fmt(valJuros)}) = ${fmt(baseIR)}`)

    // Calcular
    const baseMensal = numMeses > 0 ? baseIR / numMeses : 0

    let deducao = 0
    let aliquota = 0
    let descricaoFaixa = "Isento"

    if (baseMensal <= 2259.20) { aliquota = 0; descricaoFaixa = "Isento" }
    else if (baseMensal <= 2826.65) { aliquota = 0.075; deducao = 169.44; descricaoFaixa = "7,5%" }
    else if (baseMensal <= 3751.05) { aliquota = 0.15; deducao = 381.44; descricaoFaixa = "15%" }
    else if (baseMensal <= 4664.68) { aliquota = 0.225; deducao = 662.77; descricaoFaixa = "22,5%" }
    else { aliquota = 0.275; deducao = 896.00; descricaoFaixa = "27,5%" }

    const impostoTotal = Math.max(0, ((baseMensal * aliquota) - deducao) * numMeses)

    logsTemp.push(`RRA: Base ${fmt(baseIR)} / ${numMeses} meses = ${fmt(baseMensal)}/mês. Faixa: ${descricaoFaixa}`)

    // Update State
    setLogs(logsTemp)

    setPreview({
      totalBruto,
      baseIR,
      baseMensal,
      aliquota,
      deducao,
      irpfTotal: impostoTotal,
      faixa: descricaoFaixa,
      fatorIPCA: fatorAcumulado,
      selicAcumulada,
      val_IPCA,
      val_JurosPre22,
      val_Selic,
      valDeducoes
    })

    if (!isManual) {
      setValorManual(impostoTotal)
    }
  }

  const handleChange = (field: string, value: any) => {
    setDados({ ...dados, [field]: value })
  }

  const handleAvancar = () => {
    const valorFinal = isManual ? valorManual : (preview?.irpfTotal || 0)

    setDados({
      ...dados,
      irpf_manual: isManual,
      valor_irpf: valorFinal
    })

    onCompletar({
      meses_execucao_anterior: dados.meses_execucao_anterior,
      valor_irpf: valorFinal,
      irTotal: valorFinal,
      irpf_valor: valorFinal,
      irpf_manual: isManual,
      // Save audit details to verify later
      audit_snapshot: preview
    })
  }

  const fmt = (n: number) => n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || "R$ 0,00"

  return (
    <Card className="border-t-4 border-t-blue-600 shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              🏛️ Auditoria Fiscal (RRA)
              {loadingDB ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> :
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              }
            </CardTitle>
            <CardDescription>
              Cálculo auditado utilizando índices oficiais (IPCA Mensal + SELIC) diretamente do Banco de Dados.
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 bg-secondary/50 p-2 rounded-lg border border-secondary">
            <Switch id="manual-mode-irpf" checked={isManual} onCheckedChange={(c) => setIsManual(c)} />
            <Label htmlFor="manual-mode-irpf" className="cursor-pointer font-semibold">
              Modo Manual
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* PARAMS */}
        <div className="grid gap-4 md:grid-cols-2 bg-slate-50 p-4 rounded-lg border">
          <div className="space-y-2">
            <Label>Tipo de Beneficiário</Label>
            <select
              className="w-full p-2 border rounded-md text-sm"
              value={dados.tipo_beneficiario || "credor"}
              onChange={(e) => handleChange("tipo_beneficiario", e.target.value)}
            >
              <option value="credor">Beneficiário Original (RRA)</option>
              <option value="advogado">Advogado (Taxa Fixa 27,5%)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Meses de Execução (RRA)</Label>
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

          <div className="space-y-2">
            <Label>Deduções (PSS/Honorários)</Label>
            <div className="p-2 border rounded bg-slate-100 text-slate-600 font-mono">
              {fmt(preview?.valDeducoes || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Valor importado das etapas anteriores.</p>
          </div>
        </div>



        {/* RESULTS AUDITOR */}
        {preview && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* COLUNA ESQUERDA: CÁLCULO BASE */}
              <Card className="bg-white border-blue-100 shadow-sm">
                <CardHeader className="py-3 bg-blue-50/50 border-b border-blue-100">
                  <CardTitle className="text-sm font-semibold text-blue-800">1. Composição do Valor Bruto</CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-sm">
                  <div className="divide-y divide-slate-100">
                    <div className="flex justify-between p-2 px-4"><span className="text-slate-500">Principal</span> <span>{fmt(dados.valor_principal_original)}</span></div>
                    <div className="flex justify-between p-2 px-4"><span className="text-slate-500">Correção (IPCA)</span> <span>{fmt(preview.val_IPCA - dados.valor_principal_original)}</span></div>
                    <div className="flex justify-between p-2 px-4 bg-slate-50/50"><span className="text-slate-700 font-medium">Valor Atualizado (Princ + IPCA)</span> <span className="font-medium">{fmt(preview.val_IPCA)}</span></div>

                    <div className="flex justify-between p-2 px-4"><span className="text-slate-500">SELIC (Pós-22)</span> <span>{fmt(preview.val_Selic)}</span></div>

                    <div className="bg-amber-50/30">
                      <div className="flex justify-between p-2 px-4"><span className="text-amber-700">Juros Pré-22 (Isento)</span> <span className="text-amber-700">{fmt(preview.val_JurosPre22)}</span></div>
                      {Number(dados.valor_juros_original) > 0 && (
                        <div className="flex justify-between p-2 px-4"><span className="text-amber-700">Juros Originais (Isento)</span> <span className="text-amber-700">{fmt(dados.valor_juros_original)}</span></div>
                      )}
                    </div>

                    <div className="flex justify-between p-2 px-4 bg-slate-100 border-t border-slate-200 mt-1"><span className="font-bold text-slate-800">Total Bruto da Execução</span> <span className="font-bold text-slate-900">{fmt(preview.totalBruto)}</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* COLUNA DIREITA: FISCAL */}
              <Card className="bg-white border-red-100 shadow-sm">
                <CardHeader className="py-3 bg-red-50/50 border-b border-red-100">
                  <CardTitle className="text-sm font-semibold text-red-800">2. Cálculo Fiscal (RRA)</CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-sm">
                  <div className="divide-y divide-slate-100">
                    <div className="flex justify-between p-2 px-4"><span className="text-slate-500">Base Bruta</span> <span>{fmt(preview.totalBruto)}</span></div>
                    <div className="flex justify-between p-2 px-4"><span className="text-slate-500">(-) Deduções</span> <span className="text-red-500">({fmt(preview.valDeducoes)})</span></div>
                    {preview.val_JurosPre22 > 0 && (
                      <div className="flex justify-between p-2 px-4"><span className="text-slate-500">(-) Juros Pré-22</span> <span className="text-red-500">({fmt(preview.val_JurosPre22)})</span></div>
                    )}
                    {Number(dados.valor_juros_original) > 0 && (
                      <div className="flex justify-between p-2 px-4"><span className="text-slate-500">(-) Juros Originais</span> <span className="text-red-500">({fmt(dados.valor_juros_original)})</span></div>
                    )}
                    <div className="flex justify-between p-2 px-4 border-t border-slate-50 pt-1"><span className="text-slate-700 font-medium">Base de Cálculo</span> <span className="font-medium">{fmt(preview.baseIR)}</span></div>
                    <div className="flex justify-between p-2 px-4"><span className="text-slate-500">Base Mensal (/{dados.meses_execucao_anterior} m)</span> <span>{fmt(preview.baseMensal)}</span></div>
                    <div className="flex justify-between p-2 px-4 bg-red-50"><span className="font-semibold text-red-900">IMPOSTO DEVIDO</span> <span className="font-bold text-red-600">{fmt(preview.irpfTotal)}</span></div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* DEBUG LOG SMALL */}
            <div className="bg-slate-900 rounded p-3 text-[10px] font-mono text-slate-400 max-h-[100px] overflow-y-auto">
              {logs.map((l, i) => <div key={i}>{`> ${l}`}</div>)}
            </div>
          </div>
        )}

        {/* VALOR MANUAL OVERRIDE */}
        {isManual && (
          <div className="bg-amber-50 p-4 rounded border border-amber-200">
            <Label className="text-amber-800">Valor Manual do IRPF</Label>
            <Input
              type="number"
              value={valorManual}
              onChange={(e) => setValorManual(Number(e.target.value))}
              className="mt-1 border-amber-300 focus-visible:ring-amber-500"
            />
            <p className="text-xs text-amber-600 mt-1">Este valor sobrescreverá o cálculo auditado acima.</p>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex justify-between mt-4">
          <Button variant="outline" size="sm" onClick={voltar}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button size="sm" onClick={handleAvancar} className="bg-blue-600 hover:bg-blue-700">
            Avançar
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card >
  )
}
