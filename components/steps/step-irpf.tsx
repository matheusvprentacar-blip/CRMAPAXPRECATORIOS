/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, type CSSProperties } from "react"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { StepFooter } from "@/components/ui/calc/StepFooter"

// ─── clay helpers ─────────────────────────────────────────────────────────────
const inputStyle: CSSProperties = {
  width: "100%", height: "38px", borderRadius: "11px",
  border: "1px solid rgba(0,0,0,0.09)", background: "#fff",
  padding: "0 12px", fontSize: "13px", color: "#0b0c10", outline: "none",
  boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.04),inset -2px -2px 4px rgba(255,255,255,0.8)",
}
const inputReadStyle: CSSProperties = {
  ...inputStyle, background: "#f0f1f5", color: "#6b7280", cursor: "default",
}
const labelStyle: CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.12em", color: "#9ca3af", marginBottom: "6px",
}

// ─── toggle ───────────────────────────────────────────────────────────────────
function Toggle({ id, label, checked, onCheckedChange }: { id: string; label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onCheckedChange(!checked)}>
      <div className="relative" style={{ width: 36, height: 20 }}>
        <div className="absolute inset-0 rounded-full transition-colors" style={{ background: checked ? "#0e4d6a" : "#e8eaef", border: "1px solid rgba(0,0,0,0.1)" }} />
        <div className="absolute top-[3px] rounded-full transition-all" style={{ width: 14, height: 14, background: "#fff", left: checked ? 19 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </div>
      <span className="text-[12.5px] font-semibold" style={{ color: "#374151" }}>{label}</span>
    </label>
  )
}

// ─── segmented toggle ─────────────────────────────────────────────────────────
function SegmentedToggle({ value, onChange, options }: {
  value?: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div className="flex rounded-[12px] p-[3px] gap-1" style={{ background: "#f0f1f5", border: "1px solid rgba(0,0,0,0.07)" }}>
      {options.map((opt) => (
        <button
          key={opt.value} type="button"
          onClick={() => onChange(opt.value)}
          className="flex-1 rounded-[9px] px-3 py-1.5 text-[12px] font-bold transition-all"
          style={value === opt.value
            ? { background: "#0e4d6a", color: "#fff", boxShadow: "2px 2px 6px rgba(14,77,106,0.3)" }
            : { background: "transparent", color: "#6b7280" }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── RRA data ─────────────────────────────────────────────────────────────────
const RRA_FAIXAS = [
  { limite: 2428.8, aliquota: 0, parcela: 0, label: "Isento" },
  { limite: 2826.65, aliquota: 0.075, parcela: 182.16, label: "7,5%" },
  { limite: 3751.05, aliquota: 0.15, parcela: 394.16, label: "15%" },
  { limite: 4664.68, aliquota: 0.225, parcela: 675.49, label: "22,5%" },
  { limite: Number.POSITIVE_INFINITY, aliquota: 0.275, parcela: 908.73, label: "27,5%" },
]

const getFaixaRRA = (baseMensal: number) => {
  if (baseMensal <= 0) return RRA_FAIXAS[0]
  for (const faixa of RRA_FAIXAS) { if (baseMensal <= faixa.limite) return faixa }
  return RRA_FAIXAS[RRA_FAIXAS.length - 1]
}

const fmt = (n: number) => n?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00"

// ─── icons ────────────────────────────────────────────────────────────────────
const ICCalc = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
  </svg>
)
const ICAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
)

interface StepIRPFProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  resultadosEtapas: any[]
  voltar: () => void
}

export function StepIRPF({ dados, setDados, onCompletar, resultadosEtapas, voltar }: StepIRPFProps) {
  const [isManual, setIsManual] = useState<boolean>(dados.irpf_manual || false)
  const [isIsentoIrpf, setIsIsentoIrpf] = useState<boolean>(dados.irpf_isento || false)
  const [valorManual, setValorManual] = useState<number>(dados.valor_irpf || 0)
  const [preview, setPreview] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])

  const executarAuditoria = useCallback(
    (valorPrincipal: number, mesesEntrada: number, fatorInicialEntrada?: number, fatorFinalEntrada?: number) => {
      const logsTemp: string[] = []
      const fatorInicial = Number(fatorInicialEntrada ?? 0)
      const fatorFinal = Number(fatorFinalEntrada ?? 0)
      const mesesRRA = mesesEntrada > 0 ? mesesEntrada : 1
      const valorCorrecaoMonetaria = fatorInicial > 0 && fatorFinal > 0 ? (valorPrincipal * fatorInicial) / fatorFinal : 0
      const baseIR = Math.max(0, valorPrincipal + valorCorrecaoMonetaria)
      const baseMensal = baseIR / mesesRRA
      const faixa = getFaixaRRA(baseMensal)
      const deducaoTotal = faixa.parcela * mesesRRA
      const impostoCalculado = Math.max(0, baseIR * faixa.aliquota - deducaoTotal)
      const impostoTotal = isIsentoIrpf ? 0 : impostoCalculado

      logsTemp.push(`Correcao monetaria = (Principal * Fator Inicial) / Fator Final = ${fmt(valorCorrecaoMonetaria)}`)
      logsTemp.push(`Base IR = Principal (${fmt(valorPrincipal)}) + Correcao monetaria (${fmt(valorCorrecaoMonetaria)}) = ${fmt(baseIR)}`)
      logsTemp.push(`Base mensal = ${fmt(baseIR)} / ${mesesRRA} = ${fmt(baseMensal)}`)
      logsTemp.push(`Faixa aplicada: ${faixa.label}`)
      logsTemp.push(`Parcela a deduzir total: ${fmt(deducaoTotal)}`)
      if (isIsentoIrpf) logsTemp.push("IRPF isento aplicado: imposto final R$ 0,00.")

      setPreview({ fatorInicial, fatorFinal, valorPrincipal, baseIR, valorCorrecaoMonetaria, meses: mesesRRA, baseMensal, faixa: faixa.label, aliquota: faixa.aliquota, parcelaDeduzirMensal: faixa.parcela, deducaoTotal, irpfTotal: impostoTotal })
      setLogs(logsTemp)
      if (!isManual) setValorManual(impostoTotal)
    },
    [isManual, isIsentoIrpf],
  )

  useEffect(() => { if (isIsentoIrpf) { setIsManual(false); setValorManual(0) } }, [isIsentoIrpf])

  useEffect(() => {
    const valorPrincipal = Number(dados.valor_principal_original || 0)
    if (!valorPrincipal) { setPreview(null); return }
    const stepAtualizacao = resultadosEtapas?.[2] ?? resultadosEtapas?.[1]
    const fatorInicial = Number(dados.ipca_fator_inicial ?? stepAtualizacao?.memoriaCalculo?.ipca?.fatorInicial ?? 0)
    const fatorFinal = Number(dados.ipca_fator_final ?? stepAtualizacao?.memoriaCalculo?.ipca?.fatorFinal ?? 0)
    const mesesRRA = Number(dados.meses_execucao_anterior) || 1
    executarAuditoria(valorPrincipal, mesesRRA, fatorInicial, fatorFinal)
  }, [dados.valor_principal_original, dados.meses_execucao_anterior, dados.ipca_fator_inicial, dados.ipca_fator_final, resultadosEtapas, executarAuditoria])

  const handleChange = (field: string, value: any) => setDados({ ...dados, [field]: value })

  const handleAvancar = () => {
    const valorFinal = isIsentoIrpf ? 0 : isManual ? valorManual : preview?.irpfTotal || 0
    setDados({ ...dados, irpf_manual: isManual, valor_irpf: valorFinal, irpf_isento: isIsentoIrpf })
    onCompletar({ meses_execucao_anterior: dados.meses_execucao_anterior, valor_irpf: valorFinal, irTotal: valorFinal, irpf_valor: valorFinal, irpf_manual: isManual, irpf_isento: isIsentoIrpf, audit_snapshot: preview })
  }

  const hasModoSelecionado = isIsentoIrpf || isManual
  const modoSelecionado = isIsentoIrpf ? "irpf" : isManual ? "manual" : undefined

  return (
    <div
      className="rounded-[22px] bg-white overflow-hidden"
      style={{
        border: "1.5px solid rgba(0,0,0,0.07)",
        boxShadow: "16px 16px 36px rgba(0,0,0,0.08),-8px -8px 20px rgba(255,255,255,0.94),inset 1px 1px 4px rgba(255,255,255,0.9),inset -1px -1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-wrap items-start justify-between gap-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div>
          <p className="text-[17px] font-black tracking-tight" style={{ color: "#0b0c10" }}>IRPF RRA</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>Base do IR: Valor Principal + Correção monetária.</p>
        </div>
        <SegmentedToggle
          value={modoSelecionado}
          onChange={(v) => {
            if (v === modoSelecionado) { setIsManual(false); setIsIsentoIrpf(false); return }
            if (v === "manual") { setIsManual(true); setIsIsentoIrpf(false); return }
            if (v === "irpf") { setIsIsentoIrpf(true); setIsManual(false); return }
            setIsManual(false); setIsIsentoIrpf(false)
          }}
          options={[{ value: "manual", label: "Modo Manual" }, { value: "irpf", label: "Isento de IRPF" }]}
        />
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="Base IR" value={fmt(preview?.baseIR || 0)} helper="Principal + correção monetária" tone="primary" icon={<ICCalc />} />
          <KpiCard label="Base Mensal" value={fmt(preview?.baseMensal || 0)} helper={`RRA em ${preview?.meses || 0} meses`} tone="info" icon={<ICCalc />} />
          <KpiCard label="Imposto Devido" value={fmt(preview?.irpfTotal || 0)} helper="Resultado final" tone="danger" icon={<ICAlert />} />
        </div>

        {/* Parâmetros */}
        <SectionPanel title="Parâmetros do RRA" description="Somente dados necessários para o cálculo de IRPF." tone="info">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4">
              <label style={labelStyle}>Tipo de Beneficiário</label>
              <select
                className="w-full h-[38px] rounded-[11px] text-[13px] px-3 outline-none appearance-none"
                style={{ border: "1px solid rgba(0,0,0,0.09)", background: "#fff", color: "#0b0c10", boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.04),inset -2px -2px 4px rgba(255,255,255,0.8)" }}
                value={dados.tipo_beneficiario || "credor"}
                onChange={(e) => handleChange("tipo_beneficiario", e.target.value)}
              >
                <option value="credor">Beneficiário Original (RRA)</option>
                <option value="advogado">Advogado</option>
              </select>
            </div>
            <div className="col-span-12 md:col-span-4">
              <label style={labelStyle}>Meses de Execução (RRA)</label>
              <input
                type="number" style={inputStyle}
                value={dados.meses_execucao_anterior || ""}
                onChange={(e) => handleChange("meses_execucao_anterior", Number(e.target.value))}
                placeholder="Ex: 60"
                disabled={dados.tipo_beneficiario === "advogado"}
              />
            </div>
            <div className="col-span-12 md:col-span-2">
              <label style={labelStyle}>Fator Inicial</label>
              <div style={inputReadStyle} className="flex items-center font-mono text-[12px]">{(preview?.fatorInicial ?? 0).toFixed(7)}</div>
            </div>
            <div className="col-span-12 md:col-span-2">
              <label style={labelStyle}>Fator Final</label>
              <div style={inputReadStyle} className="flex items-center font-mono text-[12px]">{(preview?.fatorFinal ?? 0).toFixed(7)}</div>
            </div>
          </div>
        </SectionPanel>

        {/* Cálculo fiscal */}
        {preview && (
          <SectionPanel title="Cálculo fiscal" description="Base IR por principal somado a correção monetária." tone="danger">
            <div
              className="overflow-hidden rounded-[14px]"
              style={{ border: "1px solid rgba(0,0,0,0.07)" }}
            >
              {[
                ["Valor principal", fmt(preview.valorPrincipal), false],
                ["Correção monetária = (Principal × Fator Inicial) / Fator Final", fmt(preview.valorCorrecaoMonetaria), false],
                ["Base IR = Principal + Correção monetária", fmt(preview.baseIR), false],
                [`Base mensal (${preview.meses} meses)`, fmt(preview.baseMensal), false],
                ["Faixa", preview.faixa, false],
                ["Parcela deduzir mensal", fmt(preview.parcelaDeduzirMensal), false],
                ["Parcela deduzir total", fmt(preview.deducaoTotal), false],
              ].map(([label, value, _], i) => (
                <div key={i} className="flex justify-between px-4 py-2 text-[12.5px]"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <span style={{ color: "#6b7280" }}>{label as string}</span>
                  <span style={{ color: "#0b0c10" }}>{value as string}</span>
                </div>
              ))}
              <div className="flex justify-between px-4 py-3 text-[13px]"
                style={{ background: "rgba(220,38,38,0.06)" }}>
                <span className="font-bold" style={{ color: "#dc2626" }}>IMPOSTO DEVIDO</span>
                <span className="font-black tabular-nums" style={{ color: "#dc2626" }}>{fmt(preview.irpfTotal)}</span>
              </div>
            </div>
          </SectionPanel>
        )}

        {/* Log de auditoria */}
        {logs.length > 0 && (
          <SectionPanel title="Log de auditoria" description="Resumo técnico da regra aplicada." tone="neutral">
            <div
              className="rounded-[12px] p-3 font-mono text-[10px] max-h-[120px] overflow-y-auto space-y-0.5"
              style={{ background: "#f0f1f5", color: "#9ca3af" }}
            >
              {logs.map((l, i) => <div key={i}>{`> ${l}`}</div>)}
            </div>
          </SectionPanel>
        )}

        {/* Manual */}
        {isManual && (
          <SectionPanel title="Valor manual do IRPF" description="Este valor sobrescreve o cálculo acima." tone="warning">
            <div>
              <label style={labelStyle}>Valor IRPF Manual (R$)</label>
              <input type="number" style={inputStyle} value={valorManual} onChange={(e) => setValorManual(Number(e.target.value))} />
            </div>
          </SectionPanel>
        )}
      </div>

      <StepFooter onBack={voltar} onNext={handleAvancar} />
    </div>
  )
}
