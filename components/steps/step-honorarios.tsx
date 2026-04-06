/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, type CSSProperties } from "react"
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

// ─── icons ────────────────────────────────────────────────────────────────────
const ICBadgePercent = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-4.125-2.063-4.125 2.063L7.125 19.688l-4.125 2.062V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
)
const ICInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
)

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtOpc = (v: any) => { if (v === null || v === undefined || v === "") return "—"; const n = Number(v); return Number.isFinite(n) ? fmt(n) : "—" }
const fmtPct = (v: any) => { if (v === null || v === undefined || v === "") return "—"; const n = Number(v); return Number.isFinite(n) ? n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%" : "—" }
const fmtSN = (v: any) => v === true ? "Sim" : v === false ? "Não" : "Não informado"
const fmtHerd = (v: any) => (typeof v === "string" && v.trim()) ? v : fmtSN(v)

interface StepHonorariosProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  resultadosEtapas: any[]
  precatorioId?: string
}

export function StepHonorarios({ dados, setDados, onCompletar, voltar, resultadosEtapas }: StepHonorariosProps) {
  const honorariosSalvos = resultadosEtapas[5]?.honorarios || resultadosEtapas[5]
  const [isManual, setIsManual] = useState<boolean>(dados.honorarios_manual || false)
  const [honorariosPercentual, setHonorariosPercentual] = useState(honorariosSalvos?.honorarios_percentual || dados.honorarios_percentual || 0)
  const [adiantamentoPercentual, setAdiantamentoPercentual] = useState(honorariosSalvos?.adiantamento_percentual || dados.adiantamento_percentual || 0)
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
  const totalBruto = Number(etapaAtualizacao.valor_atualizado ?? etapaAtualizacao.valorAtualizado ?? etapaAtualizacao.valor_corrigido_monetariamente ?? etapaAtualizacao.valorCorrigido ?? 0)
  const pssValor = Number(etapaPss.pss_valor ?? etapaPss.pssTotal ?? etapaPss.pss_atualizado ?? 0)
  const irpfValor = Number(etapaIrpf.irpf_valor ?? etapaIrpf.valor_irpf ?? etapaIrpf.irTotal ?? 0)
  const baseCalculo = Math.max(0, totalBruto - pssValor - irpfValor)

  const honorariosValorAuto = baseCalculo * (honorariosPercentual / 100)
  const adiantamentoValorAuto = baseCalculo * (adiantamentoPercentual / 100)
  const honorariosValorFinal = isManual ? honorariosValorManual : honorariosValorAuto
  const adiantamentoValorFinal = isManual ? adiantamentoValorManual : adiantamentoValorAuto

  const handleChange = (field: string, value: any) => setDados({ ...dados, [field]: value })

  const handlePercentualChange = (field: string, value: string) => {
    const n = value === "" ? 0 : Number.parseFloat(value)
    if (!isNaN(n) && n >= 0 && n <= 100) {
      if (field === "honorarios_percentual") setHonorariosPercentual(n)
      else if (field === "adiantamento_percentual") setAdiantamentoPercentual(n)
      handleChange(field, n)
    }
  }

  const handleManualToggle = (checked: boolean) => {
    setIsManual(checked)
    if (checked) { setHonorariosValorManual(honorariosValorAuto); setAdiantamentoValorManual(adiantamentoValorAuto) }
  }

  const handleAvancar = () => {
    const newHonPercent = isManual && baseCalculo > 0 ? (honorariosValorManual / baseCalculo) * 100 : honorariosPercentual
    const newAdiPercent = isManual && baseCalculo > 0 ? (adiantamentoValorManual / baseCalculo) * 100 : adiantamentoPercentual
    onCompletar({ honorarios: { honorarios_percentual: newHonPercent, honorarios_valor: honorariosValorFinal, adiantamento_percentual: newAdiPercent, adiantamento_valor: adiantamentoValorFinal }, honorarios_contratuais: honorariosValorFinal, adiantamento_recebido: adiantamentoValorFinal, honorariosTotal: honorariosValorFinal, adiantamentoValor: adiantamentoValorFinal, honorarios_manual: isManual })
    setDados({ ...dados, honorarios_manual: isManual, honorarios_percentual: newHonPercent, adiantamento_percentual: newAdiPercent })
  }

  const hasAnaliseInfo = [dados.analise_penhora_valor, dados.analise_penhora_percentual, dados.analise_cessao_valor, dados.analise_cessao_percentual, dados.analise_adiantamento_valor, dados.analise_adiantamento_percentual, dados.analise_honorarios_valor, dados.analise_honorarios_percentual, dados.analise_itcmd, dados.analise_itcmd_valor, dados.analise_itcmd_percentual, dados.analise_herdeiros, dados.analise_observacoes].some((v) => v !== null && v !== undefined && v !== "")

  return (
    <div
      className="rounded-[22px] bg-white overflow-hidden"
      style={{
        border: "1.5px solid rgba(0,0,0,0.07)",
        boxShadow: "16px 16px 36px rgba(0,0,0,0.08),-8px -8px 20px rgba(255,255,255,0.94),inset 1px 1px 4px rgba(255,255,255,0.9),inset -1px -1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div>
          <p className="text-[17px] font-black tracking-tight" style={{ color: "#0b0c10" }}>Honorários e Adiantamentos</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>Configure percentuais e valores sobre a base líquida.</p>
        </div>
        <div className="flex items-center gap-3 rounded-[14px] px-4 py-2.5"
          style={{ background: "#f8f9fc", border: "1px solid rgba(0,0,0,0.07)" }}>
          <Toggle id="manual-mode-honorarios" label="Modo Manual" checked={isManual} onCheckedChange={handleManualToggle} />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2">
          <KpiCard label="Honorários" value={fmt(honorariosValorFinal)} helper={`${honorariosPercentual}%`} tone="primary" icon={<ICBadgePercent />} />
          <KpiCard label="Adiantamento" value={fmt(adiantamentoValorFinal)} helper={`${adiantamentoPercentual}%`} tone="warning" icon={<ICBadgePercent />} />
        </div>

        {/* Base de cálculo */}
        {baseCalculo === 0 ? (
          <SectionPanel title="Base de cálculo indisponível" description="Conclua as etapas anteriores para liberar os valores." tone="warning">
            <div className="flex items-start gap-2 rounded-[12px] p-3"
              style={{ background: "rgba(146,64,14,0.05)", border: "1px solid rgba(146,64,14,0.15)" }}>
              <ICInfo />
              <div className="text-[12px]" style={{ color: "#6b7280" }}>
                <p className="font-bold mb-0.5" style={{ color: "#374151" }}>Base de cálculo ainda não disponível</p>
                <p>Os valores em R$ serão calculados automaticamente após completar Atualização, PSS e IRPF.</p>
              </div>
            </div>
          </SectionPanel>
        ) : (
          <SectionPanel title="Base líquida" description="Valor líquido antes de honorários e adiantamentos." tone="info">
            <div className="flex items-center justify-between rounded-[12px] p-3"
              style={{ background: "#f0f1f5", border: "1.5px solid rgba(0,0,0,0.07)" }}>
              <p className="text-[12px] font-semibold" style={{ color: "#374151" }}>Base de cálculo (líquida)</p>
              <p className="text-[16px] font-black tabular-nums" style={{ color: "#0e4d6a" }}>{fmt(baseCalculo)}</p>
            </div>
          </SectionPanel>
        )}

        {/* Observações análise */}
        <SectionPanel title="Observações da análise processual" description="Variáveis que podem impactar descontos no credor." tone="warning">
          {hasAnaliseInfo ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["Penhora (R$)", fmtOpc(dados.analise_penhora_valor)],
                  ["Penhora (%)", fmtPct(dados.analise_penhora_percentual)],
                  ...(dados.analise_cessao === true ? [["Cessão (R$)", fmtOpc(dados.analise_cessao_valor)], ["Cessão (%)", fmtPct(dados.analise_cessao_percentual)]] : []),
                  ["Adiantamento recebido (R$)", fmtOpc(dados.analise_adiantamento_valor)],
                  ["Adiantamento recebido (%)", fmtPct(dados.analise_adiantamento_percentual)],
                  ["Honorários contratuais (R$)", fmtOpc(dados.analise_honorarios_valor)],
                  ["Honorários contratuais (%)", fmtPct(dados.analise_honorarios_percentual)],
                  ["Herdeiros habilitados", fmtHerd(dados.analise_herdeiros)],
                  ["ITCMD", fmtSN(dados.analise_itcmd)],
                  ...(dados.analise_itcmd === true ? [["ITCMD (R$)", fmtOpc(dados.analise_itcmd_valor)], ["ITCMD (%)", fmtPct(dados.analise_itcmd_percentual)]] : []),
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#9ca3af" }}>{k}</p>
                    <p className="text-[13px] font-semibold" style={{ color: "#0b0c10" }}>{v}</p>
                  </div>
                ))}
              </div>
              {dados.analise_observacoes && (
                <div className="rounded-[12px] p-3" style={{ background: "#f8f9fc", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>Observações</p>
                  <p className="text-[12.5px] whitespace-pre-line" style={{ color: "#374151" }}>{dados.analise_observacoes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: "#9ca3af" }}>Nenhuma observação registrada na análise processual.</p>
          )}
        </SectionPanel>

        {/* Percentuais e valores */}
        <SectionPanel title="Percentuais e valores" description="Defina percentuais e, se necessário, substitua os valores manualmente." tone="primary">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Honorários */}
            <div className="space-y-3">
              <div>
                <label style={labelStyle}>Honorários Contratuais (%)</label>
                <input type="number" min="0" max="100" step="0.01" style={{ ...inputStyle, opacity: isManual ? 0.5 : 1 }}
                  value={honorariosPercentual || ""} onChange={(e) => handlePercentualChange("honorarios_percentual", e.target.value)}
                  placeholder="0.00" disabled={isManual} />
              </div>
              {isManual && (
                <div className="rounded-[13px] p-3" style={{ background: "#f8f9fc", border: "1px solid rgba(0,0,0,0.07)" }}>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Valor Honorários (R$) <span style={{ textTransform: "none", fontWeight: 400 }}>(Manual)</span></label>
                  <input type="number" step="0.01" style={{ ...inputStyle, fontWeight: 700 }}
                    value={honorariosValorManual} onChange={(e) => setHonorariosValorManual(Number.parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>

            {/* Adiantamento */}
            <div className="space-y-3">
              <div>
                <label style={labelStyle}>Adiantamento Recebido (%)</label>
                <input type="number" min="0" max="100" step="0.01" style={{ ...inputStyle, opacity: isManual ? 0.5 : 1 }}
                  value={adiantamentoPercentual || ""} onChange={(e) => handlePercentualChange("adiantamento_percentual", e.target.value)}
                  placeholder="0.00" disabled={isManual} />
              </div>
              {isManual && (
                <div className="rounded-[13px] p-3" style={{ background: "#f8f9fc", border: "1px solid rgba(0,0,0,0.07)" }}>
                  <label style={{ ...labelStyle, marginBottom: 4 }}>Valor Adiantamento (R$) <span style={{ textTransform: "none", fontWeight: 400 }}>(Manual)</span></label>
                  <input type="number" step="0.01" style={{ ...inputStyle, fontWeight: 700 }}
                    value={adiantamentoValorManual} onChange={(e) => setAdiantamentoValorManual(Number.parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>
          </div>
        </SectionPanel>
      </div>

      <StepFooter onBack={voltar} onNext={handleAvancar} />
    </div>
  )
}
