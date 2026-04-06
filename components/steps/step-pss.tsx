/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { StepFooter } from "@/components/ui/calc/StepFooter"

// ─── clay helpers ─────────────────────────────────────────────────────────────
const labelStyle: CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.12em", color: "#9ca3af", marginBottom: "6px",
}

// ─── toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ id, label, checked, onCheckedChange }: { id: string; label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
      <div
        className="relative"
        style={{ width: 36, height: 20 }}
        onClick={() => onCheckedChange(!checked)}
      >
        <div
          className="absolute inset-0 rounded-full transition-colors"
          style={{ background: checked ? "#0e4d6a" : "#e8eaef", border: "1px solid rgba(0,0,0,0.1)" }}
        />
        <div
          className="absolute top-[3px] rounded-full transition-all"
          style={{ width: 14, height: 14, background: "#fff", left: checked ? 19 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
        />
      </div>
      <span className="text-[12.5px] font-semibold" style={{ color: "#374151" }}>{label}</span>
    </label>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ICBadgePercent = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-4.125-2.063-4.125 2.063L7.125 19.688l-4.125 2.062V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
)
const ICCalc = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
  </svg>
)
const ICShield = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
)
const ICCircleSlash = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
)

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

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
    let valIPCA = 0, valSelic = 0, valIpca2025 = 0, total = 0
    let fIPCA = 0, fSelic = 0, fIpca2025 = 0

    if (indices && pssOficio > 0) {
      if (indices.ipca_fator_inicial > 0 && indices.ipca_fator_final > 0) {
        valIPCA = (pssOficio / indices.ipca_fator_inicial) * indices.ipca_fator_final
        fIPCA = indices.ipca_fator_final / indices.ipca_fator_inicial
      } else { valIPCA = pssOficio; fIPCA = 1 }
      if (indices.selic_acumulada_percentual > 0) {
        fSelic = indices.selic_acumulada_percentual / 100
        valSelic = pssOficio * fSelic
      }
      const percIpca2025 = indices?.dados_ipca_2025?.percentualAcumulado ?? 0
      if (percIpca2025) { fIpca2025 = percIpca2025 / 100; valIpca2025 = pssOficio * fIpca2025 }
      total = valIPCA + valSelic + valIpca2025
    }
    setPssIPCA(valIPCA); setPssSelic(valSelic); setPssIpca2025(valIpca2025); setPssTotalAuto(total)
    setFatorIPCA(fIPCA); setFatorSelic(fSelic); setFatorIpca2025(fIpca2025)
  }, [pssOficio, resultadosEtapas, dados.valor_principal_original])

  const handleAvancar = () => {
    const valorFinal = isManual ? pssManualValor : pssTotalAuto
    const dadosAtualizados = {
      ...dados,
      pss_oficio_valor: isento ? 0 : pssOficio,
      isento_pss: isento, pss_manual: isManual,
      pss_valor: isento ? 0 : valorFinal,
      dados_calculo: { ...(dados.dados_calculo || {}), pss_detalhe: { base: pssOficio, correcao_ipca: pssIPCA, selic: pssSelic, fator_ipca: fatorIPCA, fator_selic: fatorSelic, ec136_2025: pssIpca2025, fator_ipca_2025: fatorIpca2025 } },
    }
    setDados(dadosAtualizados)
    onCompletar({ pss_oficio_valor: isento ? 0 : pssOficio, pss_valor: isento ? 0 : valorFinal, pssTotal: isento ? 0 : valorFinal, pss_atualizado: isento ? 0 : valorFinal, tem_desconto_pss: !isento, isento_pss: isento, pss_manual: isManual })
  }

  const totalExibido = isManual ? pssManualValor : pssTotalAuto

  const CalcRow = ({ label, formula, value }: { label: string; formula: string; value: string }) => (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-[12px] p-3"
      style={{ background: "rgba(14,77,106,0.04)", border: "1px solid rgba(14,77,106,0.1)" }}>
      <div>
        <p className="text-[12px] font-semibold" style={{ color: "#0b0c10" }}>{label}</p>
        <p className="text-[10.5px] font-mono" style={{ color: "#9ca3af" }}>{formula}</p>
      </div>
      <span className="text-[14px] font-bold tabular-nums shrink-0" style={{ color: "#0e4d6a" }}>{value}</span>
    </div>
  )

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
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
            style={{ background: "rgba(14,77,106,0.08)", border: "1px solid rgba(14,77,106,0.15)", color: "#0e4d6a" }}>
            <ICShield />
          </div>
          <p className="text-[17px] font-black tracking-tight mt-2" style={{ color: "#0b0c10" }}>PSS — Previdência Social</p>
        </div>
        {/* Toggle controls */}
        <div className="flex items-center gap-4 rounded-[14px] px-4 py-2.5"
          style={{ background: "#f8f9fc", border: "1px solid rgba(0,0,0,0.07)" }}>
          <Toggle id="isento-pss" label="Isento" checked={isento} onCheckedChange={setIsento} />
          {!isento && (
            <>
              <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.1)" }} />
              <Toggle id="manual-pss" label="Modo manual" checked={isManual} onCheckedChange={setIsManual} />
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="PSS do Ofício" value={fmt(pssOficio)} helper="Base informada" tone="info" icon={<ICBadgePercent />} />
          <KpiCard label="Total PSS" value={fmt(totalExibido)} helper={isManual ? "Manual" : "Automático"} tone={isento ? "neutral" : "primary"} icon={<ICCalc />} />
          <KpiCard label="Status" value={isento ? "Isento" : isManual ? "Manual" : "Automático"} helper={isento ? "Sem desconto" : "Com desconto"} tone={isento ? "warning" : "success"} icon={<ICCircleSlash />} />
        </div>

        {!isento ? (
          <div className="space-y-6">
            <SectionPanel title="Base e total do PSS" description="Informe o valor do ofício ou utilize o cálculo automático." tone="primary">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-8">
                  <label style={labelStyle}>Valor do PSS no Ofício (R$)</label>
                  <CurrencyInput placeholder="R$ 0,00" value={pssOficio} onValueChange={(v) => setPssOficio(v || 0)} className="rounded-[11px]" />
                  <p className="text-[11px] mt-1" style={{ color: "#9ca3af" }}>Base informada no ofício para cálculo de PSS.</p>
                </div>
                <div className="col-span-12 md:col-span-4 rounded-[14px] p-4 flex flex-col justify-center"
                  style={{ background: "#f0f1f5", border: "1.5px solid rgba(0,0,0,0.07)" }}>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "#9ca3af" }}>Total PSS atualizado</p>
                  <p className="text-[22px] font-black tabular-nums mt-1" style={{ color: "#0e4d6a" }}>{fmt(totalExibido)}</p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: "#9ca3af" }}>{isManual ? "Valor definido manualmente." : "Cálculo automático."}</p>
                </div>
              </div>
            </SectionPanel>

            {!isManual ? (
              <SectionPanel title="Memória de cálculo (automático)" description="Resumo dos fatores aplicados ao valor do ofício." tone="info">
                <div className="space-y-2">
                  <CalcRow label="1. Correção (IPCA-E)" formula={`${fmt(pssOficio)} × ${fatorIPCA.toFixed(6)}`} value={fmt(pssIPCA)} />
                  <CalcRow label="2. SELIC (Proporcional)" formula={`${fmt(pssOficio)} × ${fatorSelic.toFixed(6)}`} value={fmt(pssSelic)} />
                  <CalcRow label="3. EC 136/2025 (IPCA 2025)" formula={`${fmt(pssOficio)} × ${fatorIpca2025.toFixed(6)}`} value={fmt(pssIpca2025)} />
                  <div className="flex items-center justify-between rounded-[12px] p-3"
                    style={{ background: "#f0f1f5", border: "1.5px solid rgba(0,0,0,0.07)" }}>
                    <span className="text-[12px] font-semibold" style={{ color: "#374151" }}>Total PSS atualizado</span>
                    <span className="text-[16px] font-black tabular-nums" style={{ color: "#0e4d6a" }}>{fmt(pssTotalAuto)}</span>
                  </div>
                </div>
              </SectionPanel>
            ) : (
              <SectionPanel title="Valor PSS Manual" description="Você está definindo o valor final manualmente." tone="warning">
                <div>
                  <label style={labelStyle}>Valor PSS Manual (Total)</label>
                  <CurrencyInput className="rounded-[11px]" value={pssManualValor} onValueChange={(v) => setPssManualValor(v || 0)} />
                </div>
              </SectionPanel>
            )}
          </div>
        ) : (
          <SectionPanel title="Isenção" description="Sem desconto de PSS aplicado." tone="warning">
            <div className="flex flex-col items-center gap-2 rounded-[14px] p-8 text-center"
              style={{ border: "1.5px dashed rgba(0,0,0,0.1)", background: "rgba(0,0,0,0.02)" }}>
              <p className="text-[13px] font-bold" style={{ color: "#374151" }}>Isento de PSS</p>
              <p className="text-[11px]" style={{ color: "#9ca3af" }}>Valor final: R$ 0,00.</p>
            </div>
          </SectionPanel>
        )}
      </div>

      <StepFooter onBack={voltar} onNext={handleAvancar} />
    </div>
  )
}
