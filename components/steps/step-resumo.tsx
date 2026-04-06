/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type { ReactNode } from "react"
import { StepFooter } from "@/components/ui/calc/StepFooter"
import { calcularSalariosMinimosJuros } from "@/lib/calculos/indices"

// ─── icons ────────────────────────────────────────────────────────────────────
const ICLandmark = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
  </svg>
)
const ICTrendDown = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
  </svg>
)
const ICTrophy = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
  </svg>
)
const ICShield = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
)
const ICInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
)
const ICDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)

// ─── sub KPI ──────────────────────────────────────────────────────────────────
type KpiTone = "primary" | "danger" | "success" | "neutral"
const kpiColors: Record<KpiTone, { bar: string; value: string; badge: string; bdr: string }> = {
  primary: { bar: "#0e4d6a", value: "#0e4d6a", badge: "rgba(14,77,106,0.08)", bdr: "rgba(14,77,106,0.15)" },
  danger:  { bar: "#dc2626", value: "#dc2626", badge: "rgba(220,38,38,0.08)", bdr: "rgba(220,38,38,0.15)" },
  success: { bar: "#15803d", value: "#15803d", badge: "rgba(21,128,61,0.08)", bdr: "rgba(21,128,61,0.15)" },
  neutral: { bar: "#9ca3af", value: "#374151", badge: "#f0f1f5", bdr: "rgba(0,0,0,0.1)" },
}

const SummaryKpi = ({ label, value, helper, tone, icon }: { label: string; value: string; helper?: string; tone: KpiTone; icon: ReactNode }) => {
  const c = kpiColors[tone]
  return (
    <div className="relative overflow-hidden rounded-[18px] bg-white p-4"
      style={{ border: `1.5px solid ${c.bdr}`, boxShadow: "8px 8px 20px rgba(0,0,0,0.05),-4px -4px 12px rgba(255,255,255,0.9),inset 1px 1px 3px rgba(255,255,255,0.9)" }}>
      <span className="pointer-events-none absolute left-0 top-0 h-full w-1.5 rounded-l-[17px]" style={{ background: c.bar }} />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#9ca3af" }}>{label}</p>
          <p className="text-[clamp(1rem,2.2vw,1.45rem)] font-bold tabular-nums leading-tight" style={{ color: c.value }}>{value}</p>
          {helper && <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: c.badge, border: `1px solid ${c.bdr}`, color: c.value }}>{helper}</span>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full shrink-0" style={{ background: c.badge, color: c.value }}>{icon}</div>
      </div>
    </div>
  )
}

interface StepResumoProps {
  dados: any
  resultadosEtapas: any[]
  voltar: () => void
  precatorioId?: string
  onFinalizar?: () => void | Promise<void>
  canFinalizar?: boolean
  saving?: boolean
}

export function StepResumo({ dados, resultadosEtapas, voltar, onFinalizar, canFinalizar, saving }: StepResumoProps) {
  const etapaAtualizacao = resultadosEtapas[2] || {}
  const etapaPss = resultadosEtapas[3] || {}
  const etapaHonorarios = resultadosEtapas[5] || {}
  const resumo = resultadosEtapas[6] || {}

  const isentoPss = etapaPss.isento_pss === true || etapaPss.isento === true
  const fmt = (v: number | null | undefined) => (v == null ? "R$ 0,00" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))

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
  const principalOriginal = dados.valor_principal_original ?? 0
  const correcaoMonetaria = etapaAtualizacao.memoriaCalculo?.ipca?.resultado ?? 0
  const jurosPre22 = etapaAtualizacao.memoriaCalculo?.juros?.resultado ?? 0
  const selic = etapaAtualizacao.memoriaCalculo?.selic?.resultado ?? 0
  const ec136 = etapaAtualizacao.memoriaCalculo?.ipca2025?.resultado ?? 0
  const taxaJurosMoratoriosPercent = Number(resumo.taxa_juros_moratorios ?? etapaAtualizacao.taxa_juros_moratorios ?? dados.taxa_juros_moratorios ?? (dados.juros_mora_percentual ? dados.juros_mora_percentual * 100 : 0) ?? 0)
  const salarioMinimoReferencia = Number(dados.salario_minimo_referencia ?? dados.salario_minimo_vigente ?? resumo.salario_minimo_referencia ?? 0)
  const qtdSalariosMinimos = resumo.qtdSalariosMinimos ?? resumo.quantidade_salarios_minimos ?? calcularSalariosMinimosJuros(principalOriginal, taxaJurosMoratoriosPercent, salarioMinimoReferencia).qtdSalarios

  const handleExportarJSON = () => {
    const dataStr = JSON.stringify({ dados, resultadosEtapas }, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const a = document.createElement("a")
    a.setAttribute("href", dataUri)
    a.setAttribute("download", `calculo-precatorio-${Date.now()}.json`)
    a.click()
  }

  const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <div className={`flex justify-between ${highlight ? "pt-2" : ""}`} style={highlight ? { borderTop: "1px solid rgba(0,0,0,0.07)" } : {}}>
      <span className="text-[12.5px]" style={{ color: highlight ? "#0b0c10" : "#6b7280", fontWeight: highlight ? 700 : 400 }}>{label}</span>
      <span className="text-[12.5px] tabular-nums" style={{ color: highlight ? "#0b0c10" : "#6b7280", fontWeight: highlight ? 700 : 400 }}>{value}</span>
    </div>
  )

  const DiscountBadge = ({ label, value, active }: { label: string; value: string; active: boolean }) => (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={active
        ? { background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }
        : { background: "#f0f1f5", border: "1px solid rgba(0,0,0,0.08)", color: "#9ca3af" }}>
      {label} {value}
    </span>
  )

  return (
    <div
      className="rounded-[22px] bg-white overflow-hidden"
      style={{ border: "1.5px solid rgba(0,0,0,0.07)", boxShadow: "16px 16px 36px rgba(0,0,0,0.08),-8px -8px 20px rgba(255,255,255,0.94),inset 1px 1px 4px rgba(255,255,255,0.9),inset -1px -1px 2px rgba(0,0,0,0.04)" }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div>
          <p className="text-[20px] font-black tracking-tight" style={{ color: "#0b0c10" }}>Resumo final</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>Revise os valores e finalize para salvar e gerar histórico.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full px-2.5 py-1 font-bold" style={{ background: "#f0f1f5", border: "1px solid rgba(0,0,0,0.08)", color: "#374151" }}>{etapasConcluidas}/8</span>
          <span className="rounded-full px-2.5 py-1 font-bold" style={{ background: canFinalizar ? "rgba(14,77,106,0.08)" : "#f0f1f5", border: canFinalizar ? "1px solid rgba(14,77,106,0.2)" : "1px solid rgba(0,0,0,0.08)", color: canFinalizar ? "#0e4d6a" : "#9ca3af" }}>
            {canFinalizar ? "Pronto para finalizar" : "Em revisão"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* Incomplete warning */}
        {(!resumo || Object.keys(resumo).length === 0) && (
          <div className="rounded-[14px] p-4" style={{ background: "rgba(14,77,106,0.05)", border: "1px solid rgba(14,77,106,0.15)" }}>
            <p className="text-[13px] font-bold" style={{ color: "#0b0c10" }}>Resumo indisponível</p>
            <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>Complete todas as etapas anteriores.</p>
          </div>
        )}

        {/* Top KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryKpi label="Valor atualizado (bruto)" value={fmt(valorAtualizado)} helper="Bruto" tone="primary" icon={<ICLandmark />} />
          <SummaryKpi label="Total descontos" value={fmt(totalDescontos)} helper="IRPF + PSS + Honorários" tone="danger" icon={<ICTrendDown />} />
          <SummaryKpi label="Base líquida final" value={fmt(baseLiquidaFinal)} helper="Resultado final" tone="success" icon={<ICTrophy />} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryKpi label="Menor proposta" value={fmt(menorProposta)} helper="Mínima" tone="neutral" icon={<ICShield />} />
          <SummaryKpi label="Maior proposta" value={fmt(maiorProposta)} helper="Máxima" tone="neutral" icon={<ICShield />} />
        </div>

        {/* Detail panels */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          {/* Composição */}
          <div className="rounded-[18px] bg-white p-5 space-y-4"
            style={{ border: "1.5px solid rgba(0,0,0,0.07)", boxShadow: "6px 6px 16px rgba(0,0,0,0.04),-3px -3px 10px rgba(255,255,255,0.9)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold" style={{ color: "#0b0c10" }}>Composição do cálculo</p>
                <p className="text-[11px]" style={{ color: "#9ca3af" }}>Bruto, descontos e resultado final.</p>
              </div>
              <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: "rgba(14,77,106,0.08)", border: "1px solid rgba(14,77,106,0.18)", color: "#0e4d6a" }}>Fechamento</span>
            </div>

            {/* Bruto */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#9ca3af" }}>Bruto</p>
              <div className="space-y-1.5">
                <Row label="Principal" value={fmt(principalOriginal)} />
                <Row label="Correção (IPCA)" value={fmt(correcaoMonetaria)} />
                <Row label="Juros pré-22" value={fmt(jurosPre22)} />
                <Row label="SELIC (pós-22)" value={fmt(selic)} />
                <Row label="EC 136/2025 (IPCA 2025)" value={fmt(ec136)} />
                <Row label="Total bruto" value={fmt(valorAtualizado)} highlight />
              </div>
            </div>

            {/* Descontos */}
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 12 }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#dc2626" }}>Descontos</p>
              <div className="space-y-1.5">
                <Row label="PSS" value={isentoPss ? "Isento" : fmt(pssValor)} />
                <Row label="IRPF" value={fmt(irpfValor)} />
                <Row label="Honorários" value={fmt(honorariosValor)} />
                <Row label="Adiantamento" value={fmt(adiantamentoValor)} />
              </div>
            </div>

            {/* Final */}
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 12 }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#0e4d6a" }}>Resultado final</p>
              <div className="flex items-center justify-between">
                <span className="text-[13px]" style={{ color: "#6b7280" }}>Base líquida final</span>
                <span className="text-[20px] font-black tabular-nums" style={{ color: "#0e4d6a" }}>{fmt(baseLiquidaFinal)}</span>
              </div>
              <div className="flex items-start justify-between gap-2 text-[12.5px] mt-1">
                <span style={{ color: "#9ca3af" }}>Base pré-descontos</span>
                <span className="tabular-nums" style={{ color: "#0e4d6a" }}>{fmt(basePreDescontos)}</span>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Badges */}
            <div className="rounded-[18px] bg-white p-5"
              style={{ border: "1.5px solid rgba(0,0,0,0.07)", boxShadow: "6px 6px 16px rgba(0,0,0,0.04),-3px -3px 10px rgba(255,255,255,0.9)" }}>
              <p className="text-[13px] font-bold mb-3" style={{ color: "#0b0c10" }}>Descontos e status</p>
              <div className="flex flex-wrap gap-2">
                <DiscountBadge label="PSS" value={isentoPss ? "(Isento)" : fmt(pssValor)} active={!isentoPss && pssValor > 0} />
                <DiscountBadge label="IRPF" value={fmt(irpfValor)} active={irpfValor > 0} />
                <DiscountBadge label="Honorários" value={fmt(honorariosValor)} active={honorariosValor > 0} />
                <DiscountBadge label="Adiantamento" value={fmt(adiantamentoValor)} active={adiantamentoValor > 0} />
              </div>
            </div>

            {/* Info adicional */}
            <div className="rounded-[18px] bg-white p-5"
              style={{ border: "1.5px solid rgba(0,0,0,0.07)", boxShadow: "6px 6px 16px rgba(0,0,0,0.04),-3px -3px 10px rgba(255,255,255,0.9)" }}>
              <p className="text-[13px] font-bold mb-3" style={{ color: "#0b0c10" }}>Informações adicionais</p>
              <div className="space-y-2">
                <Row label="Base pré-descontos" value={fmt(basePreDescontos)} />
                <Row label="Salários mínimos" value={qtdSalariosMinimos.toLocaleString("pt-BR")} />
              </div>
            </div>

            {/* Nota */}
            <div className="flex items-start gap-3 rounded-[14px] p-4"
              style={{ background: "rgba(14,77,106,0.04)", border: "1px solid rgba(14,77,106,0.12)" }}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5"
                style={{ background: "rgba(14,77,106,0.12)", color: "#0e4d6a" }}><ICInfo /></div>
              <div>
                <p className="text-[13px] font-bold" style={{ color: "#0b0c10" }}>Observações</p>
                <p className="text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>As propostas são calculadas sobre a base líquida final (após descontar PSS, IRPF, honorários e adiantamento).</p>
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
          <button type="button" onClick={handleExportarJSON}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[13px] px-4 text-[12.5px] font-bold transition-all sm:w-auto"
            style={{ background: "#f0f1f5", border: "1.5px solid rgba(0,0,0,0.07)", color: "#374151", boxShadow: "4px 4px 10px rgba(0,0,0,0.05),-2px -2px 6px rgba(255,255,255,0.9)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#e8eaef" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f1f5" }}>
            <ICDownload />
            Exportar JSON
          </button>
        }
      />
    </div>
  )
}
