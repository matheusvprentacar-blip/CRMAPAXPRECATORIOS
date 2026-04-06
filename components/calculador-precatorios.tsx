/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { StepDadosBasicos } from "./steps/step-dados-basicos"
import { StepIndices } from "./steps/step-indices"
import { StepAtualizacaoMonetaria } from "./steps/step-atualizacao-monetaria"
import { StepPSS } from "./steps/step-pss"
import { StepIRPF } from "./steps/step-irpf"
import { StepHonorarios } from "./steps/step-honorarios"
import { StepPropostas } from "./steps/step-propostas"
import { StepResumo } from "./steps/step-resumo"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
import { PdfUploadButton } from "./pdf-upload-button"
import { getPdfViewerUrl } from "@/lib/utils/pdf-upload"
import { DocumentosViewer } from "@/components/precatorios/documentos-viewer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { StepContainer } from "@/components/motion/StepContainer"
import React from "react"

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "calculadora_precatorios_progress"
const PENDING_UPDATE_KEY = "calculadora_precatorios_pending_update"

const safeNumber = (val: any) => {
  if (typeof val === "number") return val
  if (!val) return 0
  const num = Number(val)
  return Number.isNaN(num) ? 0 : num
}
const savePendingUpdate = (payload: any) => {
  if (typeof window === "undefined") return
  try { localStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify({ payload, savedAt: new Date().toISOString() })) } catch {}
}
const clearPendingUpdate = () => { if (typeof window !== "undefined") localStorage.removeItem(PENDING_UPDATE_KEY) }
const isFetchFailure = (error: any) => String(error?.message || "").includes("Failed to fetch") || String(error?.details || "").includes("Failed to fetch")

export interface CalculadoraProgress {
  precatorioId?: string; dados: any; etapaAtual: number; etapasCompletadas: number[]; pdfUrl: string | null; resultadosEtapas: any[]
}
interface CalculadoraPrecatoriosProps { precatorioId?: string; onUpdate?: () => void }

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  bg:        "hsl(30 20% 98%)",        // padrão do sistema
  sidebar:   "#ffffff",                // sidebar branca
  surface:   "#f0f1f5",               // superfícies
  border:    "rgba(0,0,0,0.07)",
  accent:    "#0e4d6a",               // azul petróleo clay
  accentDim: "rgba(14,77,106,0.08)",
  accentMid: "rgba(14,77,106,0.25)",
  textHi:    "#0b0c10",
  textMid:   "#374151",
  textLo:    "#9ca3af",
  danger:    "#dc2626",
  dangerBg:  "#fef2f2",
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IC = {
  check:   <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>,
  chevR:   <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>,
  chevL:   <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>,
  doc:     <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>,
  reset:   <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>,
  close:   <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  menu:    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>,
  calc:    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm2.25-4.5h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5V13.5zm0 2.25h.008v.008H10.5v-.008zm2.25-4.5h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75V13.5zm0 2.25h.008v.008H12.75v-.008zm2.25-4.5h.008v.008H15v-.008zm0 2.25h.008v.008H15V13.5zm0 2.25h.008v.008H15v-.008zM8.25 6h7.5v2.25h-7.5V6z"/></svg>,
  flag:    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"/></svg>,
}

// ─── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Dados básicos",         short: "Dados",       component: StepDadosBasicos },
  { label: "Índices",               short: "Índices",     component: StepIndices },
  { label: "Atualização monetária", short: "Atualização", component: StepAtualizacaoMonetaria },
  { label: "PSS",                   short: "PSS",         component: StepPSS },
  { label: "IRPF",                  short: "IRPF",        component: StepIRPF },
  { label: "Honorários",            short: "Honorários",  component: StepHonorarios },
  { label: "Propostas",             short: "Propostas",   component: StepPropostas },
  { label: "Resumo",                short: "Resumo",      component: StepResumo },
]

// ─── Sidebar step item ────────────────────────────────────────────────────────
function SideStep({ index, label, isActive, isDone, onClick, isLast }: {
  index: number; label: string; isActive: boolean; isDone: boolean; onClick: () => void; isLast: boolean
}) {
  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] w-px h-[calc(100%+2px)]"
          style={{ background: isDone ? `linear-gradient(to bottom,${T.accentMid},${T.accentDim})` : T.border }} />
      )}
      <button type="button" onClick={onClick}
        className="relative w-full flex items-center gap-2.5 px-2 py-2 rounded-[12px] text-left transition-all duration-150"
        style={{ background: isActive ? T.accentDim : "transparent" }}
      >
        {/* circle */}
        <div className="shrink-0 flex items-center justify-center w-[30px] h-[30px] rounded-full text-[10px] font-black transition-all duration-150"
          style={{
            background: isActive ? T.accent : isDone ? T.accentDim : "#f0f1f5",
            color: isActive ? "#ffffff" : isDone ? T.accent : T.textLo,
            border: `1px solid ${isActive ? T.accent : isDone ? T.accentMid : "rgba(0,0,0,0.09)"}`,
          }}>
          {isDone && !isActive ? IC.check : <span>{index + 1}</span>}
        </div>
        {/* label */}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold truncate leading-tight transition-colors"
            style={{ color: isActive ? T.accent : isDone ? T.textMid : T.textLo }}>
            {label}
          </p>
          <p className="text-[9.5px] font-medium uppercase tracking-[0.1em] mt-0.5"
            style={{ color: isActive ? T.accent : isDone ? T.accentMid : "#d1d5db" }}>
            {isActive ? "Em andamento" : isDone ? "Concluída" : "Pendente"}
          </p>
        </div>
        {isActive && <span style={{ color: T.accent }}>{IC.chevR}</span>}
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const CalculadoraPrecatorios = ({ precatorioId, onUpdate }: CalculadoraPrecatoriosProps) => {
  const reduceMotion = useReducedMotion()
  const [etapaAtual, setEtapaAtual]           = useState(0)
  const [dados, setDados]                     = useState<any>({})
  const [etapasCompletadas, setEtapasCompletadas] = useState<number[]>([])
  const [pdfUrl, setPdfUrl]                   = useState<string | null>(null)
  const [resultadosEtapas, setResultadosEtapas]   = useState<any[]>([])
  const [precatorioData, setPrecatorioData]   = useState<Precatorio | null>(null)
  const [loading, setLoading]                 = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showPdfDrawer, setShowPdfDrawer]     = useState(false)
  const [mobileSidebar, setMobileSidebar]     = useState(false)

  const fallbackDocs = useMemo(() => {
    if (!pdfUrl) return []
    return [{ id: "pdf-precatorio", titulo: "Ofício Requisitório", tipo: "oficio_requisitorio", viewUrl: pdfUrl, urlType: "legacy" }]
  }, [pdfUrl])

  useEffect(() => { if (pdfUrl) setShowPdfDrawer(true) }, [pdfUrl])
  useEffect(() => {
    if (precatorioId) loadPrecatorio(precatorioId)
    else loadLocalStorage()
  }, [precatorioId])

  // ── loaders ──────────────────────────────────────────────────────────────
  const loadPrecatorio = async (id: string) => {
    setLoading(true)
    try {
      const supabase = getSupabase(); if (!supabase) return
      const { data, error } = await supabase.from("precatorios").select("*").eq("id", id).single()
      if (error || !data) return
      setPrecatorioData(data as Precatorio)
      const prevAno = /^\d{4}$/.test(String(data.previsao_pagamento ?? "").slice(0,4)) ? String(data.previsao_pagamento).slice(0,4) : ""
      if (data.pdf_url) { const u = await getPdfViewerUrl(data.pdf_url); if (u) setPdfUrl(u) }
      setDados({
        valorPrincipal: data.valor_principal||0, valorJuros: data.valor_juros||0, valorSelic: data.valor_selic||0,
        dataBase: data.data_base||"", dataExpedicao: data.data_expedicao||"", dataCalculo: data.data_calculo||"",
        credor: data.credor_nome||"", numeroProcesso: data.numero_processo||"", tribunal: data.tribunal||"",
        loa: data.loa||"",
        ano_orcamentario: data.ano_orcamentario != null ? String(data.ano_orcamentario) : "",
        previsao_pagamento: prevAno,
        analise_penhora: data.analise_penhora??null, analise_cessao: data.analise_cessao??null,
        analise_herdeiros: data.analise_herdeiros??null, analise_viavel: data.analise_viavel??null,
        analise_observacoes: data.analise_observacoes??"",
        analise_penhora_valor: data.analise_penhora_valor??null, analise_penhora_percentual: data.analise_penhora_percentual??null,
        analise_cessao_valor: data.analise_cessao_valor??null, analise_cessao_percentual: data.analise_cessao_percentual??null,
        analise_adiantamento_valor: data.analise_adiantamento_valor??null, analise_adiantamento_percentual: data.analise_adiantamento_percentual??null,
        analise_honorarios_valor: data.analise_honorarios_valor??null, analise_honorarios_percentual: data.analise_honorarios_percentual??null,
        analise_itcmd: data.analise_itcmd??null, analise_itcmd_valor: data.analise_itcmd_valor??null, analise_itcmd_percentual: data.analise_itcmd_percentual??null,
      })
      if (data.dados_calculo?.resultadosEtapas) {
        setResultadosEtapas(data.dados_calculo.resultadosEtapas)
        setEtapasCompletadas(data.dados_calculo.etapasCompletadas||[])
      }
    } finally { setLoading(false) }
  }

  const loadLocalStorage = () => {
    const s = localStorage.getItem(STORAGE_KEY); if (!s) return
    try {
      const p: CalculadoraProgress = JSON.parse(s)
      setDados(p.dados||{}); setEtapaAtual(p.etapaAtual||0); setEtapasCompletadas(p.etapasCompletadas||[])
      setPdfUrl(p.pdfUrl||null); setResultadosEtapas(p.resultadosEtapas||[])
    } catch {}
  }

  useEffect(() => {
    if (!precatorioId) localStorage.setItem(STORAGE_KEY, JSON.stringify({ dados, etapaAtual, etapasCompletadas, pdfUrl, resultadosEtapas }))
  }, [dados, etapaAtual, etapasCompletadas, pdfUrl, resultadosEtapas, precatorioId])

  useEffect(() => {
    if (typeof window === "undefined") return
    const h = () => toast.info("Conexão restabelecida.")
    window.addEventListener("online", h); return () => window.removeEventListener("online", h)
  }, [])

  useEffect(() => {
    const pr = resultadosEtapas[5]; const ho = resultadosEtapas[4]
    if (pr?.base_calculo_liquida && ho?.honorarios) {
      const base = pr.base_calculo_liquida
      const hv = Math.round(base*(ho.honorarios.honorarios_percentual||0)/100*100)/100
      const av = Math.round(base*(ho.honorarios.adiantamento_percentual||0)/100*100)/100
      if (hv!==ho.honorarios.honorarios_valor||av!==ho.honorarios.adiantamento_valor)
        setResultadosEtapas(prev=>{ const n=[...prev]; n[4]={...n[4],honorarios:{...n[4].honorarios,honorarios_valor:hv,adiantamento_valor:av}}; return n })
    }
  }, [resultadosEtapas])

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleCompletarEtapa = useCallback((etapa: number, resultado?: any) => {
    if (!etapasCompletadas.includes(etapa)) setEtapasCompletadas(p=>[...p,etapa])
    if (resultado) setResultadosEtapas(p=>{ const n=[...p]; n[etapa]=resultado; return n })
    if (etapa < STEPS.length-1) setEtapaAtual(etapa+1)
  }, [etapasCompletadas])

  const voltar = () => { if (etapaAtual>0) setEtapaAtual(etapaAtual-1) }
  const irParaEtapa = (i: number) => { setEtapaAtual(i); setMobileSidebar(false) }

  const finalizarCalculo = async () => {
    if (!precatorioId) return
    setSaving(true)
    try {
      const supabase = getSupabase(); if (!supabase) return
      const db = resultadosEtapas[0], at = resultadosEtapas[2]||resultadosEtapas[1]
      const pss = resultadosEtapas[3]||resultadosEtapas[2], irpf = resultadosEtapas[4]||resultadosEtapas[3]
      const hon = resultadosEtapas[5]||resultadosEtapas[4], pr = resultadosEtapas[6]||resultadosEtapas[5]
      const rs = resultadosEtapas[6]||resultadosEtapas[7]||{}
      const toDate = (v:any)=>{ v=v||null; if(!v)return null; if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v; const m=String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m?`${m[3]}-${m[2]}-${m[1]}`:null }
      const toY = (v:any)=>{ const r=String(v??"").trim(); if(!/^\d{4}$/.test(r))return null; const y=Number(r); return y>=1900&&y<=2999?y:null }
      const toYD = (v:any)=>{ const y=toY(v); return y?`${y}-01-01`:null }
      const { data:{user} } = await supabase.auth.getUser()
      const vaF = safeNumber(pr?.valor_atualizado||at?.valorAtualizado||at?.valor_atualizado||rs?.valor_atualizado)
      const slF = safeNumber(pr?.base_liquida_final||rs?.base_liquida_final)
      const payload:any = {
        valor_principal: safeNumber(vaF>0?vaF:(db?.valor_principal_original||dados.valorPrincipal)),
        valor_juros: safeNumber(at?.valorJuros||at?.juros_mora), valor_selic: safeNumber(at?.valorSelic||at?.multa),
        valor_atualizado: vaF, saldo_liquido: slF,
        data_base: toDate(db?.data_base||dados.dataBase), data_expedicao: toDate(db?.data_expedicao||dados.dataExpedicao),
        data_calculo: toDate(db?.data_calculo||dados.dataCalculo),
        irpf_total: safeNumber(irpf?.irpf_valor??irpf?.irTotal??0), pss_total: safeNumber(pss?.pss_valor??pss?.pssTotal??0),
        pss_oficio_valor: pss?.pss_oficio_valor||0,
        honorarios_valor: safeNumber(pr?.honorarios_valor??hon?.honorarios?.honorarios_valor??0),
        adiantamento_valor: safeNumber(pr?.adiantamento_valor??hon?.honorarios?.adiantamento_valor??0),
        menor_proposta: safeNumber(pr?.menor_proposta??pr?.menorProposta??0),
        maior_proposta: safeNumber(pr?.maior_proposta??pr?.maiorProposta??0),
        taxa_juros_moratorios: safeNumber(at?.taxaJuros??at?.taxa_juros_moratorios??0),
        qtd_salarios_minimos: safeNumber(rs?.qtdSalariosMinimos??0),
        loa: String((db?.loa??dados.loa??"")).trim()||null,
        ano_orcamentario: toY(db?.ano_orcamentario??dados.ano_orcamentario),
        previsao_pagamento: toYD(db?.previsao_pagamento??dados.previsao_pagamento),
        status:"calculado", status_kanban:"calculo_concluido", localizacao_kanban:"calculo_concluido",
        dados_calculo:{ dados,resultadosEtapas,etapasCompletadas,dataCalculo:new Date().toISOString(),juros_mora_percentual:pss?.juros_mora_percentual||0 },
        updated_at: new Date().toISOString(),
      }
      const {error} = await supabase.from("precatorios").update(payload).eq("id",precatorioId)
      if (error) {
        if(isFetchFailure(error)){savePendingUpdate({precatorioId,payload});toast.error("Falha de conexão. Salvamos localmente.");return}
        toast.error(`Erro: ${error.message}`); return
      }
      clearPendingUpdate()
      const {count} = await supabase.from("precatorio_calculos").select("*",{count:"exact",head:true}).eq("precatorio_id",precatorioId)
      const v=(count||0)+1
      await supabase.from("precatorio_calculos").insert({precatorio_id:precatorioId,versao:v,data_base:db?.data_base,valor_atualizado:vaF,saldo_liquido:slF,premissas_json:payload.dados_calculo,premissas_resumo:`Cálculo finalizado v${v}`,created_by:user?.id,arquivo_pdf_url:null})
      await supabase.from("precatorios").update({calculo_ultima_versao:v}).eq("id",precatorioId)
      if(user) await supabase.from("atividades").insert({precatorio_id:precatorioId,usuario_id:user.id,tipo:"calculo",descricao:`Cálculo finalizado (v${v})`,dados_novos:{valor_principal:db?.valor_principal_original||0,maior_proposta:pr?.maior_proposta||0,valor_atualizado:vaF,calculo_ultima_versao:v}})
      toast.success("Cálculo finalizado com sucesso!")
      if(onUpdate) onUpdate()
    } catch(e) {
      if(isFetchFailure(e)){savePendingUpdate({precatorioId});toast.error("Falha de conexão.");return}
      toast.error("Erro ao finalizar cálculo")
    } finally { setSaving(false) }
  }

  const resetarCalculo = async () => {
    if (!precatorioId) return
    setSaving(true)
    try {
      const supabase = getSupabase(); if (!supabase) return
      const {data:{user}} = await supabase.auth.getUser()
      const {error} = await supabase.from("precatorios").update({dados_calculo:null,pdf_url:null,updated_at:new Date().toISOString()}).eq("id",precatorioId)
      if(error){toast.error("Erro ao resetar: "+error.message);return}
      if(user) await supabase.from("atividades").insert({precatorio_id:precatorioId,usuario_id:user.id,tipo:"refazer_calculo" as any,descricao:"Cálculo resetado"})
      setDados({}); setResultadosEtapas([]); setEtapasCompletadas([]); setPdfUrl(null); setEtapaAtual(0)
      toast.success("Cálculo resetado com sucesso!")
      setShowResetDialog(false)
    } catch { toast.error("Erro ao resetar") } finally { setSaving(false) }
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const StepComponent = STEPS[etapaAtual]?.component
  const pct = STEPS.length ? Math.min(100, Math.round(etapasCompletadas.length / STEPS.length * 100)) : 0
  const canFinalizar = !!precatorioId && !saving && etapasCompletadas.includes(6) && !!resultadosEtapas[6]

  if (loading) return (
    <div className="flex items-center justify-center py-24" style={{ background: T.bg }}>
      <div className="h-10 w-10 rounded-full border-[3px] animate-spin" style={{ borderColor: "rgba(14,77,106,0.15)", borderTopColor: T.accent }} />
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-76px)] overflow-hidden" style={{ background: T.bg }}>

      {/* ── Mobile sidebar overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {mobileSidebar && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" style={{ background: "rgba(0,0,0,0.6)" }}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={()=>setMobileSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-[220px] shrink-0 flex flex-col
        transition-transform duration-300 ease-in-out
        ${mobileSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
        style={{ background: T.sidebar, borderRight: `1px solid ${T.border}` }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.accentMid }}>Etapas</p>
            <p className="text-[10px] mt-0.5" style={{ color: T.textLo }}>
              {etapasCompletadas.length}/{STEPS.length} concluídas
            </p>
          </div>
          <button type="button" className="lg:hidden w-7 h-7 flex items-center justify-center rounded-[8px]"
            style={{ background: "rgba(255,255,255,0.05)", color: T.textMid }}
            onClick={()=>setMobileSidebar(false)}>
            {IC.close}
          </button>
        </div>

        {/* Steps */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
          {STEPS.map((step, i) => (
            <SideStep key={step.label} index={i} label={step.label}
              isActive={i===etapaAtual} isDone={etapasCompletadas.includes(i)}
              onClick={()=>irParaEtapa(i)} isLast={i===STEPS.length-1} />
          ))}
        </nav>

        {/* Progress bar + finalize button */}
        <div className="px-3 py-4 shrink-0" style={{ borderTop: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px]" style={{ color: T.textLo }}>Progresso</p>
            <p className="text-[10px] font-bold" style={{ color: T.accent }}>{pct}%</p>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "#e8eaef" }}>
            <motion.div className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg,${T.accent},#1a6080)` }}
              initial={false} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          {canFinalizar && (
            <button type="button" onClick={finalizarCalculo} disabled={saving}
              className="mt-3 w-full h-9 rounded-[12px] text-[12.5px] font-bold transition-all disabled:opacity-50"
              style={{ background: T.accent, color: "#ffffff", boxShadow: `0 4px 14px ${T.accentMid}` }}>
              {saving ? "Salvando..." : "Finalizar cálculo"}
            </button>
          )}
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-6 h-14 shrink-0"
          style={{ background: T.sidebar, borderBottom: `1px solid ${T.border}` }}>

          {/* Left: hamburger + credor + step info */}
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" className="lg:hidden flex items-center justify-center w-8 h-8 rounded-[10px]"
              style={{ background: "rgba(0,0,0,0.06)", color: T.textMid }}
              onClick={()=>setMobileSidebar(true)}>
              {IC.menu}
            </button>
            <div className="min-w-0">
              {precatorioData?.credor_nome && (
                <p className="text-[11px] font-bold truncate max-w-[220px]" style={{ color: T.textMid }}>
                  {precatorioData.credor_nome}
                </p>
              )}
              <p className="text-[12px] font-semibold" style={{ color: T.accent }}>
                <span style={{ color: T.textLo }}>Etapa {etapaAtual+1}/{STEPS.length} · </span>
                {STEPS[etapaAtual]?.label}
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Dots navigation */}
            <div className="hidden sm:flex items-center gap-1">
              {STEPS.map((_,i)=>(
                <button key={i} type="button" onClick={()=>irParaEtapa(i)}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: i===etapaAtual?"18px":"5px", height:"5px",
                    background: i===etapaAtual ? T.accent : etapasCompletadas.includes(i) ? T.accentMid : "#d1d5db",
                  }}/>
              ))}
            </div>

            <div className="hidden sm:block w-px h-6" style={{ background: T.border }} />

            {precatorioId && (
              <>
                <button type="button" onClick={()=>setShowPdfDrawer(!showPdfDrawer)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[9px] text-[11.5px] font-semibold transition-all"
                  style={{
                    background: showPdfDrawer ? T.accentDim : "rgba(255,255,255,0.05)",
                    color: showPdfDrawer ? T.accent : T.textMid,
                    border: `1px solid ${showPdfDrawer ? T.accentMid : T.border}`,
                  }}>
                  {IC.doc}
                  <span className="hidden md:inline">Documentos</span>
                </button>

                <div className="flex items-center">
                  <PdfUploadButton precatorioId={precatorioId} currentPdfUrl={pdfUrl}
                    onUploadSuccess={async()=>loadPrecatorio(precatorioId)} />
                </div>

                <button type="button" onClick={()=>setShowResetDialog(true)} disabled={saving}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[9px] text-[11.5px] font-semibold transition-all disabled:opacity-40"
                  style={{ background: T.dangerBg, color: T.danger, border: `1px solid rgba(239,68,68,0.2)` }}>
                  {IC.reset}
                  <span className="hidden md:inline">Resetar</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Step nav strip */}
        <div className="flex items-center gap-2 px-4 md:px-6 h-10 shrink-0"
          style={{ background: "#f0f1f5", borderBottom: `1px solid ${T.border}` }}>
          <button type="button" onClick={voltar} disabled={etapaAtual===0}
            className="flex items-center justify-center w-6 h-6 rounded-[7px] transition-colors disabled:opacity-20"
            style={{ background: "rgba(0,0,0,0.05)", color: T.textMid }}>
            {IC.chevL}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] truncate" style={{ color: T.textLo }}>
              Navegue pelas etapas ou clique na sidebar
            </p>
          </div>
          {canFinalizar && (
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold" style={{ color: T.accent }}>
              {IC.flag} Pronto para finalizar
            </div>
          )}
        </div>

        {/* Step content + PDF drawer */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Step content area */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="px-4 md:px-8 py-7 max-w-4xl">
              {StepComponent && (
                <StepContainer stepKey={`etapa-${etapaAtual}`}>
                  <StepComponent
                    dados={dados} setDados={setDados}
                    onCompletar={(resultado:any)=>handleCompletarEtapa(etapaAtual,resultado)}
                    resultadosEtapas={resultadosEtapas} voltar={voltar}
                    precatorioId={precatorioId} saving={saving}
                    onFinalizar={finalizarCalculo} canFinalizar={canFinalizar}
                  />
                </StepContainer>
              )}
            </div>
          </div>

          {/* PDF Drawer — slides in as right column */}
          <AnimatePresence>
            {showPdfDrawer && (
              <motion.div
                className="shrink-0 flex flex-col overflow-hidden"
                style={{
                  width: "min(420px, 42vw)",
                  borderLeft: `1px solid ${T.border}`,
                  background: "#ffffff",
                }}
                initial={reduceMotion?{opacity:1}:{width:0,opacity:0}}
                animate={reduceMotion?{opacity:1}:{width:"min(420px, 42vw)",opacity:1}}
                exit={reduceMotion?{opacity:0}:{width:0,opacity:0}}
                transition={{ duration: 0.28, ease: [0.32,0.72,0,1] }}
              >
                <DocumentosViewer
                  precatorioId={precatorioId}
                  onClose={()=>setShowPdfDrawer(false)}
                  fallbackDocs={fallbackDocs}
                  className="h-full"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Reset Dialog ──────────────────────────────────────────────── */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent style={{ background:"#ffffff", border:`1px solid ${T.border}`, color: T.textHi }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: T.textHi }}>Confirmar Reset</AlertDialogTitle>
            <AlertDialogDescription style={{ color: T.textMid }}>
              Todos os dados do cálculo serão perdidos. <strong style={{ color: T.textHi }}>Esta ação não pode ser desfeita.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ background:"rgba(0,0,0,0.04)", border:`1px solid ${T.border}`, color:T.textMid }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={resetarCalculo} style={{ background:"rgba(220,38,38,0.8)", color:"white" }}>
              Confirmar Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CalculadoraPrecatorios
