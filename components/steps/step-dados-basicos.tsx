/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type { CSSProperties } from "react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { StepFooter } from "@/components/ui/calc/StepFooter"

// ─── Clay input styles ─────────────────────────────────────────────────────────
const inputStyle: CSSProperties = {
  width: "100%",
  height: "38px",
  borderRadius: "11px",
  border: "1px solid rgba(0,0,0,0.09)",
  background: "#fff",
  padding: "0 12px",
  fontSize: "13px",
  color: "#0b0c10",
  outline: "none",
  boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.04),inset -2px -2px 4px rgba(255,255,255,0.8)",
}

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#9ca3af",
  marginBottom: "6px",
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ICBanknote = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
)
const ICPercent = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-4.125-2.063-4.125 2.063L7.125 19.688l-4.125 2.062V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
)
const ICCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
)

interface StepDadosBasicosProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  precatorioId?: string
}

export function StepDadosBasicos({ dados, setDados, onCompletar, voltar }: StepDadosBasicosProps) {
  const principal = Number(dados.valor_principal_original || 0)
  const juros = Number(dados.valor_juros_original || 0)
  const multa = Number(dados.multa || 0)

  const fmt = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const formatarMoedaOpcional = (valor: any) => {
    if (valor === null || valor === undefined || valor === "") return "—"
    const parsed = Number(valor)
    if (!Number.isFinite(parsed)) return "—"
    return fmt(parsed)
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
    dados.analise_penhora_valor, dados.analise_penhora_percentual,
    dados.analise_cessao_valor, dados.analise_cessao_percentual,
    dados.analise_adiantamento_valor, dados.analise_adiantamento_percentual,
    dados.analise_honorarios_valor, dados.analise_honorarios_percentual,
    dados.analise_itcmd, dados.analise_itcmd_valor, dados.analise_itcmd_percentual,
    dados.analise_herdeiros, dados.analise_observacoes,
  ].some((v) => v !== null && v !== undefined && v !== "")

  const handleChange = (field: string, value: any) => setDados({ ...dados, [field]: value })

  const handleAvancar = () => {
    const principalValor = Number(dados.valor_principal_original || 0)
    const jurosValor = Number(dados.valor_juros_original || 0)
    const multaValor = Number(dados.multa || 0)
    const principalSomado = principalValor + jurosValor + multaValor
    onCompletar({
      ...dados,
      valor_principal_original: principalSomado,
      valor_juros_original: 0,
      multa: 0,
      principal_informado: principalValor,
      juros_informados: jurosValor,
      multa_informada: multaValor,
    })
  }

  return (
    <div
      className="rounded-[22px] bg-white overflow-hidden"
      style={{
        border: "1.5px solid rgba(0,0,0,0.07)",
        boxShadow: "16px 16px 36px rgba(0,0,0,0.08),-8px -8px 20px rgba(255,255,255,0.94),inset 1px 1px 4px rgba(255,255,255,0.9),inset -1px -1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <p className="text-[17px] font-black tracking-tight" style={{ color: "#0b0c10" }}>
          Dados Básicos do Precatório
        </p>
        <p className="text-[12px] mt-1" style={{ color: "#9ca3af" }}>
          Informe apenas os valores financeiros essenciais para iniciar o cálculo.
        </p>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="Valor Principal" value={fmt(principal)} helper="Base informada" tone="primary" icon={<ICBanknote />} />
          <KpiCard label="Juros + Multa" value={fmt(juros + multa)} helper="Itens incorporados" tone="warning" icon={<ICPercent />} />
          <KpiCard
            label="Data Base"
            value={dados.data_base ? new Date(dados.data_base + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
            helper="Início do período"
            tone="info"
            icon={<ICCalendar />}
          />
        </div>

        {/* Informações financeiras */}
        <SectionPanel title="Informações financeiras" description="Preencha os valores conforme o ofício do precatório." tone="primary">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6">
              <label style={labelStyle}>Valor Principal</label>
              <CurrencyInput value={dados.valor_principal_original || 0} onChange={(v) => handleChange("valor_principal_original", v)} />
            </div>
            <div className="col-span-12 md:col-span-6">
              <label style={labelStyle}>Data Base</label>
              <input type="date" style={inputStyle} value={dados.data_base || ""} onChange={(e) => handleChange("data_base", e.target.value)} />
            </div>
            <div className="col-span-12 md:col-span-6">
              <label style={labelStyle}>Juros</label>
              <CurrencyInput value={dados.valor_juros_original || 0} onChange={(v) => handleChange("valor_juros_original", v)} />
            </div>
            <div className="col-span-12 md:col-span-6">
              <label style={labelStyle}>Multa / Selic</label>
              <CurrencyInput value={dados.multa || 0} onChange={(v) => handleChange("multa", v)} />
            </div>
          </div>
        </SectionPanel>

        {/* Informações orçamentárias */}
        <SectionPanel title="Informações orçamentárias" description="Campos de planejamento do pagamento." tone="info">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-4">
              <label style={labelStyle}>LOA (Lei Orçamentária Anual)</label>
              <input style={inputStyle} value={dados.loa || ""} onChange={(e) => handleChange("loa", e.target.value)} placeholder="Ex: LOA 2027" />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label style={labelStyle}>Ano Orçamentário</label>
              <input
                type="number" min={1900} max={2999} step={1} inputMode="numeric" style={inputStyle}
                value={dados.ano_orcamentario === null || dados.ano_orcamentario === undefined || dados.ano_orcamentario === "" ? "" : String(dados.ano_orcamentario)}
                onChange={(e) => handleChange("ano_orcamentario", e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                placeholder="Ex: 2027"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label style={labelStyle}>Previsão de Pagamento (Ano)</label>
              <input
                type="number" min={1900} max={2999} step={1} inputMode="numeric" style={inputStyle}
                value={dados.previsao_pagamento || ""}
                onChange={(e) => handleChange("previsao_pagamento", e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                placeholder="Ex: 2028"
              />
            </div>
          </div>
        </SectionPanel>

        {/* Observações da análise */}
        <SectionPanel title="Observações da análise processual" description="Dados registrados na análise para apoiar o cálculo." tone="warning">
          {hasAnaliseInfo ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["Penhora (R$)", formatarMoedaOpcional(dados.analise_penhora_valor)],
                  ["Penhora (%)", formatarPercentual(dados.analise_penhora_percentual)],
                  ...(dados.analise_cessao === true ? [
                    ["Cessão (R$)", formatarMoedaOpcional(dados.analise_cessao_valor)],
                    ["Cessão (%)", formatarPercentual(dados.analise_cessao_percentual)],
                  ] : []),
                  ["Adiantamento recebido (R$)", formatarMoedaOpcional(dados.analise_adiantamento_valor)],
                  ["Adiantamento recebido (%)", formatarPercentual(dados.analise_adiantamento_percentual)],
                  ["Honorários contratuais (R$)", formatarMoedaOpcional(dados.analise_honorarios_valor)],
                  ["Honorários contratuais (%)", formatarPercentual(dados.analise_honorarios_percentual)],
                  ["Herdeiros habilitados", formatarHerdeiros(dados.analise_herdeiros)],
                  ["ITCMD", formatarSimNao(dados.analise_itcmd)],
                  ...(dados.analise_itcmd === true ? [
                    ["ITCMD (R$)", formatarMoedaOpcional(dados.analise_itcmd_valor)],
                    ["ITCMD (%)", formatarPercentual(dados.analise_itcmd_percentual)],
                  ] : []),
                ].map(([k, v]) => (
                  <div key={k} className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#9ca3af" }}>{k}</p>
                    <p className="text-[13px] font-semibold" style={{ color: "#0b0c10" }}>{v}</p>
                  </div>
                ))}
              </div>
              {dados.analise_observacoes && (
                <div className="rounded-[12px] p-3" style={{ background: "#f8f9fc", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9ca3af" }}>Observações</p>
                  <p className="text-[13px] whitespace-pre-line" style={{ color: "#374151" }}>{dados.analise_observacoes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: "#9ca3af" }}>Nenhuma observação registrada na análise processual.</p>
          )}
        </SectionPanel>
      </div>

      <StepFooter onBack={voltar} onNext={handleAvancar} />
    </div>
  )
}
