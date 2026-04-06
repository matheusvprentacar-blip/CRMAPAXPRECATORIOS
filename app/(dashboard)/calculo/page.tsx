"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase/client"
import { ModalAtraso } from "@/components/calculo/modal-atraso"
import { ModalEnviarJuridico } from "@/components/calculo/modal-enviar-juridico"
import { ModalCalculoManual } from "@/components/precatorios/modal-calculo-manual"
import { toast } from "sonner"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
interface PrecatorioCalculo {
  id: string
  titulo: string | null
  numero_processo: string | null
  numero_precatorio: string | null
  credor_nome: string | null
  advogado_nome: string | null
  valor_principal: number | null
  valor_atualizado: number | null
  status: string | null
  localizacao_kanban?: string | null
  created_at: string
  urgente?: boolean
  tribunal?: string | null
  criador_nome?: string | null
  responsavel_nome?: string | null
  responsavel_calculo_nome?: string | null
  motivo_atraso_calculo?: string | null
  data_atraso_calculo?: string | null
  score_complexidade?: number
  nivel_complexidade?: "baixa" | "media" | "alta"
  data_entrada_calculo?: string | null
  sla_horas?: number
  sla_status?: "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido"
  calculo_externo?: boolean
  saldo_liquido?: number | null
  proposta_maior_valor?: number | null
  proposta_menor_valor?: number | null
}

// ─── Clay shadows ─────────────────────────────────────────────────────────────
const SH_CARD: React.CSSProperties = {
  boxShadow:
    "16px 16px 36px rgba(0,0,0,.08),-8px -8px 20px rgba(255,255,255,.94),inset 1px 1px 4px rgba(255,255,255,.9),inset -1px -1px 2px rgba(0,0,0,.04)",
}
const SH_BTN_AC: React.CSSProperties = {
  boxShadow:
    "8px 8px 20px rgba(14,77,106,.42),-3px -3px 8px rgba(255,255,255,.3),inset 1px 1px 3px rgba(255,255,255,.14),inset -1px -1px 2px rgba(8,40,60,.3)",
}
const SH_BTN_GHOST: React.CSSProperties = {
  boxShadow:
    "5px 5px 12px rgba(0,0,0,.07),-3px -3px 8px rgba(255,255,255,.92),inset 1px 1px 2px rgba(255,255,255,.87),inset -1px -1px 2px rgba(0,0,0,.04)",
}
const SH_BTN_DANGER: React.CSSProperties = {
  boxShadow:
    "8px 8px 20px rgba(220,38,38,.28),-3px -3px 8px rgba(255,255,255,.3),inset 1px 1px 3px rgba(255,255,255,.14),inset -1px -1px 2px rgba(120,10,10,.2)",
}
const SH_INSET: React.CSSProperties = {
  boxShadow:
    "inset 5px 5px 12px rgba(0,0,0,.07),inset -4px -4px 10px rgba(255,255,255,.87)",
}

// ─── Style constants ──────────────────────────────────────────────────────────
const C_CARD = "bg-white rounded-[24px] border border-black/[0.07] overflow-hidden transition-all duration-300"
const C_BTN_AC =
  "inline-flex items-center gap-1.5 h-9 px-4 rounded-[13px] bg-[#0e4d6a] text-white text-[12px] font-bold cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
const C_BTN_GHOST =
  "inline-flex items-center gap-1.5 h-9 px-4 rounded-[13px] bg-gradient-to-b from-white to-[#f2f3f7] border border-black/[0.08] text-[#374151] text-[12px] font-bold cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 whitespace-nowrap disabled:opacity-50"
const C_BTN_DANGER =
  "inline-flex items-center gap-1.5 h-9 px-4 rounded-[13px] bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-[12px] font-bold cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 whitespace-nowrap"
const C_BTN_BLUE =
  "inline-flex items-center gap-1.5 h-9 px-4 rounded-[13px] bg-[#1d4ed8] text-white text-[12px] font-bold cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 whitespace-nowrap"
const C_BADGE =
  "inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-bold border whitespace-nowrap"
const C_LABEL =
  "block text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#9ca3af] mb-1"

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "aguardando", label: "Aguardando" },
  { id: "iniciado",   label: "Em andamento" },
  { id: "atrasados",  label: "Em atraso" },
  { id: "juridico",   label: "Jurídico" },
  { id: "concluidos", label: "Concluídos" },
] as const

type TabId = typeof TABS[number]["id"]

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IC = {
  calculator: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm2.25-4.5h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5V13.5zm0 2.25h.008v.008H10.5v-.008zm2.25-4.5h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75V13.5zm0 2.25h.008v.008H12.75v-.008zm2.25-4.5h.008v.008H15v-.008zm0 2.25h.008v.008H15V13.5zm0 2.25h.008v.008H15v-.008zm2.25-4.5h.008v.008H17.25v-.008zm0 2.25h.008v.008H17.25V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.616 4.5 4.667V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.667c0-1.051-.807-1.967-1.907-2.095A48.507 48.507 0 0012 2.25z" />
    </svg>
  ),
  calcSm: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm2.25-4.5h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5V13.5zm2.25-4.5h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75V13.5zM8.25 6h7.5v2.25h-7.5V6z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  gavel: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  dollar: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  xmark: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (value?: number | null) =>
  `R$ ${(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function getStatusLabel(status?: string | null): string {
  switch (status) {
    case "pronto_calculo":     return "Aguardando"
    case "calculo_andamento":
    case "em_calculo":         return "Em cálculo"
    case "calculo_concluido":
    case "calculado":          return "Concluído"
    case "juridico":           return "Jurídico"
    default:                   return status ? status.replace(/_/g, " ") : "N/I"
  }
}

type SlaInfo = { label: string; progress: number; barColor: string; textCls: string }

function getSlaInfo(slaStatus?: PrecatorioCalculo["sla_status"] | null): SlaInfo {
  switch (slaStatus) {
    case "concluido":  return { label: "Concluído",   progress: 100, barColor: "#15803d", textCls: "text-[#15803d]" }
    case "atrasado":   return { label: "Atrasado",    progress: 100, barColor: "#dc2626", textCls: "text-[#dc2626]" }
    case "atencao":    return { label: "Atenção",     progress: 80,  barColor: "#92400e", textCls: "text-[#92400e]" }
    case "no_prazo":   return { label: "No prazo",    progress: 55,  barColor: "#0e4d6a", textCls: "text-[#0e4d6a]" }
    default:           return { label: "Não iniciado",progress: 10,  barColor: "#9ca3af", textCls: "text-[#9ca3af]" }
  }
}

const getTabEmptyMsg = (tab: TabId) => {
  switch (tab) {
    case "aguardando":  return "Não há precatórios aguardando cálculo"
    case "iniciado":    return "Nenhum cálculo em andamento"
    case "atrasados":   return "Nenhum cálculo em atraso registrado"
    case "juridico":    return "Nenhum precatório em análise jurídica"
    case "concluidos":  return "Nenhum cálculo concluído encontrado"
  }
}

// ─── PrecatorioCard ───────────────────────────────────────────────────────────
function PrecatorioCard({
  precatorio,
  index,
  activeTab,
  isInteresse,
  onCalcular,
  onFinalizar,
  onRetornarJuridico,
  onReportarAtraso,
  onRemoverAtraso,
  onEnviarJuridico,
  onManual,
  onRecalcular,
  recalculoOpen,
  onRecalculoOpenChange,
  onNavigate,
}: {
  precatorio: PrecatorioCalculo
  index: number
  activeTab: TabId
  isInteresse: boolean
  onCalcular: () => void
  onFinalizar: () => void
  onRetornarJuridico: () => void
  onReportarAtraso: () => void
  onRemoverAtraso: () => void
  onEnviarJuridico: () => void
  onManual: () => void
  onRecalcular: () => void
  recalculoOpen: boolean
  onRecalculoOpenChange: (v: boolean) => void
  onNavigate: () => void
}) {
  const statusAtual = precatorio.localizacao_kanban || precatorio.status || null
  const isJuridico  = statusAtual === "juridico"
  const isEmCalculo = statusAtual === "calculo_andamento" || statusAtual === "em_calculo"
  const isConcluido = statusAtual === "calculo_concluido" || statusAtual === "calculado"
  const isCalculado = isConcluido || !!precatorio.calculo_externo
  const titulo      = precatorio.titulo || precatorio.numero_precatorio || "Precatório sem título"
  const sla         = getSlaInfo(precatorio.sla_status)
  const responsavel = precatorio.responsavel_calculo_nome || precatorio.criador_nome || "Não atribuído"

  // Status badge color
  const statusBadgeCls = isConcluido
    ? "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]"
    : isJuridico
    ? "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"
    : isEmCalculo
    ? "bg-[#fffbeb] text-[#92400e] border-[#fde68a]"
    : "bg-[#f0f1f5] text-[#374151] border-black/[0.07]"

  return (
    <div
      className={`${C_CARD} flex flex-col cursor-pointer group ${activeTab === "atrasados" ? "border-[#fecaca]" : ""}`}
      style={SH_CARD}
      onClick={onNavigate}
    >
      {/* Stripe top */}
      <div className={`h-1 w-full ${isJuridico ? "bg-[#1d4ed8]" : isConcluido ? "bg-[#15803d]" : activeTab === "atrasados" ? "bg-[#dc2626]" : "bg-[#0e4d6a]"}`} />

      <div className="flex flex-col flex-1 p-5 gap-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#9ca3af]">
                #{String(index + 1).padStart(2, "0")}
              </span>
              <span className={`${C_BADGE} ${statusBadgeCls}`}>
                {getStatusLabel(statusAtual)}
              </span>
              {precatorio.urgente && (
                <span className={`${C_BADGE} bg-[#fef2f2] text-[#dc2626] border-[#fecaca]`}>
                  Urgente
                </span>
              )}
              {isInteresse && (
                <span className={`${C_BADGE} bg-[#fffbeb] text-[#92400e] border-[#fde68a] gap-1`}>
                  {IC.star} Admin
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-[14px] font-bold leading-snug text-[#0b0c10] group-hover:text-[#0e4d6a] transition-colors">
              {titulo}
            </p>
            <p className="line-clamp-1 text-[12px] text-[#6b7280]">
              {precatorio.credor_nome || "Credor não informado"}
            </p>
          </div>
        </div>

        {/* Processo / Precatório */}
        <div className="rounded-[14px] px-3 py-2.5 space-y-1" style={SH_INSET}>
          <p className="text-[11px] text-[#6b7280]">{precatorio.advogado_nome || "Advogado N/I"}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-[#374151]">
            <span>{precatorio.numero_processo || "Sem processo"}</span>
            <span className="text-[#9ca3af]">·</span>
            <span>{precatorio.numero_precatorio || "Sem precatório"}</span>
          </div>
        </div>

        {/* SLA Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-[#6b7280]">
              {IC.clock}
              <span>SLA</span>
            </div>
            <span className={`text-[11px] font-bold ${sla.textCls}`}>{sla.label}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#e8eaef] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${sla.progress}%`, backgroundColor: sla.barColor }}
            />
          </div>
        </div>

        {/* Valores */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[14px] px-3 py-2.5" style={SH_INSET}>
            <p className={C_LABEL}>Valor principal</p>
            <p className="text-[13px] font-bold tabular-nums text-[#0b0c10]">
              {formatCurrency(precatorio.valor_principal)}
            </p>
          </div>
          <div className="rounded-[14px] px-3 py-2.5" style={SH_INSET}>
            <p className={C_LABEL}>Valor atualizado</p>
            <p className={`text-[13px] font-bold tabular-nums ${isConcluido ? "text-[#15803d]" : "text-[#0e4d6a]"}`}>
              {formatCurrency(precatorio.valor_atualizado ?? precatorio.valor_principal)}
            </p>
          </div>
        </div>

        {/* Propostas (se calculado) */}
        {isCalculado && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[14px] px-3 py-2.5" style={SH_INSET}>
              <p className={C_LABEL}>Mín proposta</p>
              <p className="text-[13px] font-bold tabular-nums text-[#374151]">
                {precatorio.proposta_menor_valor ? formatCurrency(precatorio.proposta_menor_valor) : "—"}
              </p>
            </div>
            <div className="rounded-[14px] px-3 py-2.5" style={SH_INSET}>
              <p className={C_LABEL}>Máx proposta</p>
              <p className="text-[13px] font-bold tabular-nums text-[#374151]">
                {precatorio.proposta_maior_valor ? formatCurrency(precatorio.proposta_maior_valor) : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Responsável */}
        <div className="flex items-center gap-2 text-[12px] text-[#374151]">
          {IC.user}
          <span>{responsavel}</span>
        </div>

        {/* Atraso */}
        {activeTab === "atrasados" && precatorio.motivo_atraso_calculo && (
          <div className="rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-[#dc2626]">{IC.alert}</span>
            <span className="text-[11.5px] text-[#dc2626]">{precatorio.motivo_atraso_calculo}</span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto border-t border-black/[0.05] pt-3 space-y-2" onClick={(e) => e.stopPropagation()}>

          {/* Row 1 — secundárias */}
          <div className="flex flex-wrap gap-2">
            {!isJuridico && activeTab !== "juridico" && activeTab !== "concluidos" && (
              <button type="button" className={C_BTN_GHOST} style={SH_BTN_GHOST} onClick={onEnviarJuridico}>
                {IC.gavel} Jurídico
              </button>
            )}
            {(activeTab === "aguardando" || activeTab === "iniciado") && !isJuridico && !precatorio.motivo_atraso_calculo && (
              <button type="button" className={C_BTN_DANGER} onClick={onReportarAtraso}>
                {IC.alert} Reportar atraso
              </button>
            )}
            {activeTab === "atrasados" && precatorio.motivo_atraso_calculo && (
              <button type="button" className={C_BTN_GHOST} style={SH_BTN_GHOST} onClick={onRemoverAtraso}>
                {IC.check} Resolver atraso
              </button>
            )}
            {isJuridico && (
              <button type="button" className={C_BTN_GHOST} style={SH_BTN_GHOST} onClick={onRetornarJuridico}>
                Retornar jurídico
              </button>
            )}
          </div>

          {/* Row 2 — primárias */}
          <div className="flex flex-wrap gap-2">
            {!isConcluido && !isJuridico && (
              <button type="button" className={`${C_BTN_AC} flex-1`} style={SH_BTN_AC} onClick={onCalcular}>
                {IC.calcSm}
                {isEmCalculo ? "Abrir cálculo" : "Iniciar cálculo"}
              </button>
            )}
            {isEmCalculo && (
              <button type="button" className={`${C_BTN_GHOST} flex-1`} style={SH_BTN_GHOST} onClick={onFinalizar}>
                {IC.check} Finalizar
              </button>
            )}
            {!isJuridico && !isConcluido && (
              <button type="button" className={`${C_BTN_BLUE} flex-1`} onClick={onManual}>
                {IC.dollar} Inserir manual
              </button>
            )}
            {isConcluido && !isJuridico && (
              <div className="relative flex-1">
                <button
                  type="button"
                  className={`${C_BTN_GHOST} w-full`}
                  style={SH_BTN_GHOST}
                  onClick={() => onRecalculoOpenChange(!recalculoOpen)}
                >
                  {IC.refresh} Recalcular
                </button>
                {recalculoOpen && (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-72 z-50 rounded-[18px] bg-white border border-black/[0.08] p-4 space-y-3"
                    style={SH_CARD}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-[13px] font-bold text-[#0b0c10]">Realizar o cálculo novamente?</p>
                    <p className="text-[12px] text-[#6b7280]">
                      Isso irá excluir todas as informações atuais do cálculo.
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={C_BTN_GHOST}
                        style={SH_BTN_GHOST}
                        onClick={() => onRecalculoOpenChange(false)}
                      >
                        {IC.xmark} Cancelar
                      </button>
                      <button
                        type="button"
                        className={C_BTN_AC}
                        style={SH_BTN_AC}
                        onClick={() => { onRecalculoOpenChange(false); onRecalcular() }}
                      >
                        {IC.check} Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FilaCalculoPage() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  const [filaCalculo, setFilaCalculo] = useState<PrecatorioCalculo[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [adminInteresseIds, setAdminInteresseIds] = useState<Set<string>>(new Set())
  const [modalAtrasoOpen, setModalAtrasoOpen] = useState(false)
  const [modalJuridicoOpen, setModalJuridicoOpen] = useState(false)
  const [modalManualOpen, setModalManualOpen] = useState(false)
  const [precatorioParaManual, setPrecatorioParaManual] = useState<PrecatorioCalculo | null>(null)
  const [precatorioSelecionado, setPrecatorioSelecionado] = useState<PrecatorioCalculo | null>(null)
  const [calculando, setCalculando] = useState<string | null>(null)
  const [recalculoPopoverId, setRecalculoPopoverId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("aguardando")
  const [tabCounts, setTabCounts] = useState<Record<TabId, number>>({ aguardando: 0, iniciado: 0, atrasados: 0, juridico: 0, concluidos: 0 })

  useEffect(() => { loadData() }, [activeTab])
  useEffect(() => { loadCounts() }, [])

  async function loadCounts() {
    try {
      const supabase = getSupabase()
      if (!supabase) return
      const [aguardando, iniciado, atrasados, juridico, concluidos] = await Promise.all([
        supabase.from("precatorios_cards").select("id", { count: "exact", head: true })
          .or("status.in.(pronto_calculo),localizacao_kanban.in.(pronto_calculo,fila_calculo)").is("motivo_atraso_calculo", null),
        supabase.from("precatorios_cards").select("id", { count: "exact", head: true })
          .or("status.in.(calculo_andamento,em_calculo),localizacao_kanban.in.(calculo_andamento,em_calculo)").is("motivo_atraso_calculo", null),
        supabase.from("precatorios_cards").select("id", { count: "exact", head: true })
          .not("motivo_atraso_calculo", "is", null),
        supabase.from("precatorios_cards").select("id", { count: "exact", head: true })
          .or("status.eq.juridico,localizacao_kanban.eq.juridico"),
        supabase.from("precatorios_cards").select("id", { count: "exact", head: true })
          .or("status.in.(calculo_concluido,calculado),localizacao_kanban.eq.calculo_concluido").not("saldo_liquido", "is", null),
      ])
      setTabCounts({
        aguardando: aguardando.count ?? 0,
        iniciado:   iniciado.count ?? 0,
        atrasados:  atrasados.count ?? 0,
        juridico:   juridico.count ?? 0,
        concluidos: concluidos.count ?? 0,
      })
    } catch {}
  }

  async function loadData() {
    setLoading(true)
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("usuarios").select("role").eq("id", user.id).single()

      let query = supabase
        .from("precatorios_cards")
        .select(`id,titulo,numero_processo,numero_precatorio,credor_nome,advogado_nome,valor_principal,valor_atualizado,saldo_liquido,calculo_externo,status,localizacao_kanban,created_at,urgente,tribunal,criador_nome,responsavel_nome,responsavel_calculo_nome,responsavel_calculo_id,motivo_atraso_calculo,data_atraso_calculo,score_complexidade,nivel_complexidade,data_entrada_calculo,sla_horas,sla_status,proposta_maior_valor,proposta_menor_valor`)

      if (activeTab === "aguardando") {
        query = query.or("status.in.(pronto_calculo),localizacao_kanban.in.(pronto_calculo,fila_calculo)").is("motivo_atraso_calculo", null)
      } else if (activeTab === "iniciado") {
        query = query.or("status.in.(calculo_andamento,em_calculo),localizacao_kanban.in.(calculo_andamento,em_calculo)").is("motivo_atraso_calculo", null)
      } else if (activeTab === "atrasados") {
        query = query.not("motivo_atraso_calculo", "is", null)
      } else if (activeTab === "juridico") {
        query = query.or("status.eq.juridico,localizacao_kanban.eq.juridico")
      } else {
        query = query.or("status.in.(calculo_concluido,calculado),localizacao_kanban.eq.calculo_concluido").not("saldo_liquido", "is", null)
      }

      const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
      const isAdmin = roles.includes("admin") || roles.includes("gestor")
      if (roles.includes("operador_calculo") && !isAdmin) {
        query = query.or(`responsavel_calculo_id.eq.${user.id},responsavel_calculo_id.is.null`)
      }

      const { data, error } = await query.order("urgente", { ascending: false }).order("created_at", { ascending: true })
      if (error) throw error
      setFilaCalculo((data as PrecatorioCalculo[]) || [])

      try {
        const { data: interestRows } = await supabase
          .from("notifications").select("entity_id")
          .eq("user_id", user.id).eq("event_type", "interesse_calculo_admin").is("read_at", null)
        setAdminInteresseIds(new Set((interestRows || []).map((r: any) => r.entity_id).filter(Boolean)))
      } catch {}
    } catch (e) {
      console.error("[FILA CALCULO]", e)
    } finally {
      setLoading(false)
    }
  }

  async function handleCalcular(precatorioId: string) {
    setCalculando(precatorioId)
    try {
      const supabase = getSupabase()
      if (supabase) {
        const { error } = await supabase.from("precatorios").update({
          status: "calculo_andamento",
          status_kanban: "calculo_andamento",
          localizacao_kanban: "calculo_andamento",
          updated_at: new Date().toISOString(),
        }).eq("id", precatorioId)
        if (!error) {
          await supabase.from("atividades").insert({ precatorio_id: precatorioId, tipo: "mudanca_status", descricao: "Cálculo iniciado na fila de cálculo" })
        }
      }
    } catch (e) { console.error(e) }
    router.push(`/calcular?id=${precatorioId}`)
  }

  async function handleFinalizarCalculo(precatorioId: string) {
    try {
      const supabase = getSupabase()
      if (!supabase) return
      const { error } = await supabase.from("precatorios").update({
        status: "calculado", status_kanban: "calculo_concluido", localizacao_kanban: "calculo_concluido", updated_at: new Date().toISOString(),
      }).eq("id", precatorioId)
      if (error) throw error
      await supabase.from("atividades").insert({ precatorio_id: precatorioId, tipo: "mudanca_status", descricao: "Cálculo finalizado na fila de cálculo" })
      toast.success("Cálculo finalizado.")
      loadData()
    } catch (error: any) {
      toast.error(error?.message || "Erro ao finalizar cálculo.")
    }
  }

  async function handleRetornarJuridico(precatorioId: string) {
    try {
      const supabase = getSupabase()
      if (!supabase) return
      const { error } = await supabase.from("precatorios").update({
        status: "pronto_calculo", status_kanban: "pronto_calculo", localizacao_kanban: "pronto_calculo", updated_at: new Date().toISOString(),
      }).eq("id", precatorioId)
      if (error) throw error
      await supabase.from("atividades").insert({ precatorio_id: precatorioId, tipo: "mudanca_status", descricao: "Retorno da análise jurídica para fila de cálculo" })
      toast.success("Retornado para a fila de cálculo.")
      loadData()
    } catch (error: any) {
      toast.error(error?.message || "Erro ao retornar do jurídico.")
    }
  }

  async function handleRemoverAtraso(precatorioId: string) {
    try {
      const supabase = getSupabase()
      if (!supabase) return
      const { error } = await supabase.from("precatorios").update({
        motivo_atraso_calculo: null, data_atraso_calculo: null, tipo_atraso: null, impacto_atraso: null,
      }).eq("id", precatorioId)
      if (error) throw error
      await supabase.from("atividades").insert({ precatorio_id: precatorioId, tipo: "atualizacao", descricao: "Atraso removido - precatório retomado" })
      loadData()
    } catch (e) { console.error(e) }
  }

  const filteredFila = searchTerm
    ? filaCalculo.filter((p) =>
        p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : filaCalculo

  const tabCountLabel = {
    aguardando: "na fila",
    iniciado:   "em andamento",
    atrasados:  "em atraso",
    juridico:   "no jurídico",
    concluidos: "concluídos",
  }[activeTab]

  return (
    <div className="min-h-screen bg-[#f0f1f5] p-4 md:p-6 space-y-5">

      {/* ── Hero Title ──────────────────────────────────────────────── */}
      <div className="pt-2 pb-1">
        <span className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full bg-primary/10 px-3 py-1.5 text-[13px] font-bold tracking-wide text-primary">
          <span className="shrink-0">●</span>
          <span className="truncate">CRM Precatórios · operações</span>
        </span>
        <p className="mt-3 text-[clamp(1.55rem,6vw,4rem)] font-black leading-none tracking-[-0.05em] text-primary">
          Fila de Cálculo
        </p>
        <h1 className="mt-3 text-[clamp(1rem,3vw,1.9rem)] font-bold leading-[1.1] tracking-[-0.03em] text-foreground">
          Precatórios em processamento.
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#6b7280]">
          Gerencie a fila de cálculo, acompanhe SLAs e inicie análises diretamente por aqui.
        </p>

        {/* Contador */}
        <div className="mt-5 flex items-center gap-3">
          <div
            className="inline-flex items-center gap-2.5 h-12 px-5 rounded-[18px] bg-white border border-black/[0.07]"
            style={SH_CARD}
          >
            <span className="text-[#6b7280]">{IC.calculator}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${activeTab}-${filteredFila.length}`}
                className="text-[24px] font-black text-[#0e4d6a] tabular-nums"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.88, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 1.05, y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {filteredFila.length}
              </motion.span>
            </AnimatePresence>
            <span className="text-[12.5px] text-[#6b7280]">{tabCountLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-[13px] text-[12.5px] font-bold whitespace-nowrap transition-all duration-200 ${
                active
                  ? "bg-[#0e4d6a] text-white"
                  : "bg-white text-[#374151] border border-black/[0.08] hover:text-[#0e4d6a]"
              }`}
              style={active ? SH_BTN_AC : SH_BTN_GHOST}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black tabular-nums ${
                  active ? "bg-white/20 text-white" : "bg-[#0e4d6a]/10 text-[#0e4d6a]"
                }`}>
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
          {IC.search}
        </span>
        <input
          type="text"
          placeholder="Buscar por título, número ou credor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-11 rounded-[18px] border border-black/[0.08] bg-white pl-10 pr-4 text-[13.5px] text-[#0b0c10] placeholder:text-[#9ca3af] outline-none focus:border-[#0e4d6a] focus:ring-2 focus:ring-[#0e4d6a]/20 transition-all"
          style={SH_BTN_GHOST}
        />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-10 w-10 rounded-full border-[3px] border-[#0e4d6a]/20 border-t-[#0e4d6a] animate-spin" />
            </div>
          ) : filteredFila.length === 0 ? (
            <div className={`${C_CARD} px-6 py-20 text-center`} style={SH_CARD}>
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#f0f1f5] text-[#6b7280]"
                style={{ boxShadow: "inset 5px 5px 12px rgba(0,0,0,.07),inset -4px -4px 10px rgba(255,255,255,.87)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm2.25-4.5h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5V13.5zm2.25-4.5h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75V13.5zM8.25 6h7.5v2.25h-7.5V6z" />
                </svg>
              </div>
              <h3 className="text-[15px] font-bold text-[#0b0c10]">
                {searchTerm ? "Nenhum precatório encontrado" : "Lista vazia"}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-[#6b7280]">
                {searchTerm ? "Tente ajustar os termos da busca." : getTabEmptyMsg(activeTab)}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false} mode="popLayout">
                {filteredFila.map((precatorio, index) => (
                  <motion.div
                    key={`${activeTab}-${precatorio.id}`}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut", delay: reduceMotion ? 0 : Math.min(index * 0.02, 0.14) }}
                    className="h-full"
                  >
                    <PrecatorioCard
                      precatorio={precatorio}
                      index={index}
                      activeTab={activeTab}
                      isInteresse={adminInteresseIds.has(precatorio.id)}
                      onNavigate={() => router.push(`/precatorios/detalhes?id=${precatorio.id}`)}
                      onCalcular={() => handleCalcular(precatorio.id)}
                      onFinalizar={() => handleFinalizarCalculo(precatorio.id)}
                      onRetornarJuridico={() => handleRetornarJuridico(precatorio.id)}
                      onReportarAtraso={() => { setPrecatorioSelecionado(precatorio); setModalAtrasoOpen(true) }}
                      onRemoverAtraso={() => handleRemoverAtraso(precatorio.id)}
                      onEnviarJuridico={() => { setPrecatorioSelecionado(precatorio); setModalJuridicoOpen(true) }}
                      onManual={() => { setPrecatorioParaManual(precatorio); setModalManualOpen(true) }}
                      onRecalcular={() => handleCalcular(precatorio.id)}
                      recalculoOpen={recalculoPopoverId === precatorio.id}
                      onRecalculoOpenChange={(v) => setRecalculoPopoverId(v ? precatorio.id : null)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Modais ──────────────────────────────────────────────────── */}
      {precatorioSelecionado && (
        <ModalAtraso
          open={modalAtrasoOpen}
          onOpenChange={setModalAtrasoOpen}
          precatorioId={precatorioSelecionado.id}
          precatorioTitulo={precatorioSelecionado.titulo || precatorioSelecionado.numero_precatorio || "Sem título"}
          onSuccess={() => loadData()}
        />
      )}
      {precatorioSelecionado && (
        <ModalEnviarJuridico
          open={modalJuridicoOpen}
          onOpenChange={setModalJuridicoOpen}
          precatorioId={precatorioSelecionado.id}
          precatorioTitulo={precatorioSelecionado.titulo || precatorioSelecionado.numero_precatorio || "Sem título"}
          onSuccess={() => loadData()}
        />
      )}
      {precatorioParaManual && (
        <ModalCalculoManual
          open={modalManualOpen}
          onOpenChange={setModalManualOpen}
          precatorio={precatorioParaManual as any}
          onSuccess={() => { setModalManualOpen(false); setPrecatorioParaManual(null); loadData() }}
        />
      )}
    </div>
  )
}
