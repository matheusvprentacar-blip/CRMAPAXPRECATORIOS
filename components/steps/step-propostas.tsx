/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, type CSSProperties } from "react"
import type { ReactNode } from "react"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { StepFooter } from "@/components/ui/calc/StepFooter"
import { getSupabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { calcularSalariosMinimosJuros } from "@/lib/calculos/indices"
import {
  deveDistribuirIgualAutomaticamente,
  distribuirPercentuaisHerdeiros,
  formatPercentualInput,
  inferHerdeirosComCotaManual,
  normalizePercentualParticipacao,
  normalizarPercentuaisHerdeiros,
  percentuaisHerdeirosSomamCem,
  somaPercentuaisHerdeiros,
} from "@/lib/herdeiros/percentuais"

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

// ─── segmented toggle ─────────────────────────────────────────────────────────
function SegmentedToggle({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div className="flex rounded-[12px] p-[3px] gap-1" style={{ background: "#f0f1f5", border: "1px solid rgba(0,0,0,0.07)" }}>
      {options.map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className="flex-1 rounded-[9px] px-3 py-1.5 text-[12px] font-bold transition-all"
          style={value === opt.value
            ? { background: "#0e4d6a", color: "#fff", boxShadow: "2px 2px 6px rgba(14,77,106,0.3)" }
            : { background: "transparent", color: "#6b7280" }}>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
const ProposalKpi = ({ label, value, helper, chip, icon }: { label: string; value: string; helper?: string; chip?: string; icon: ReactNode }) => (
  <div className="relative overflow-hidden rounded-[18px] bg-white p-4"
    style={{ border: "1.5px solid rgba(14,77,106,0.12)", boxShadow: "8px 8px 20px rgba(0,0,0,0.05),-4px -4px 12px rgba(255,255,255,0.9),inset 1px 1px 3px rgba(255,255,255,0.9)" }}>
    <span className="pointer-events-none absolute left-0 top-0 h-full w-1.5 rounded-l-[17px]" style={{ background: "#0e4d6a" }} />
    <div className="flex items-start justify-between gap-3 pl-1">
      <div className="min-w-0 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#9ca3af" }}>{label}</p>
        <p className="truncate text-[clamp(1rem,2.2vw,1.45rem)] font-bold leading-tight tabular-nums" style={{ color: "#0e4d6a" }}>{value}</p>
        {helper && <p className="text-[11px]" style={{ color: "#9ca3af" }}>{helper}</p>}
        {chip && <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: "rgba(14,77,106,0.08)", border: "1px solid rgba(14,77,106,0.18)", color: "#0e4d6a" }}>{chip}</span>}
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full shrink-0" style={{ background: "rgba(14,77,106,0.1)", color: "#0e4d6a" }}>{icon}</div>
    </div>
  </div>
)

// ─── icons ────────────────────────────────────────────────────────────────────
const ICScale = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.97z" />
  </svg>
)
const ICPercent = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-4.125-2.063-4.125 2.063L7.125 19.688l-4.125 2.062V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
)
const ICLock = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-3 w-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
)
const ICUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)
const ICInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
)

const round2 = (v: number) => Math.round(v * 100) / 100
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

type Herdeiro = { id: string; nome_completo: string; cpf?: string | null; percentual_participacao?: number | null }

interface StepPropostasProps {
  dados: any
  setDados: (dados: any) => void
  resultadosEtapas: any[]
  onCompletar: (resultado: any) => void
  voltar: () => void
  precatorioId?: string
}

export function StepPropostas({ dados, setDados, resultadosEtapas, onCompletar, voltar, precatorioId }: StepPropostasProps) {
  const [percentualMenorProposta, setPercentualMenorProposta] = useState(dados.percentual_menor_proposta || 0)
  const [percentualMaiorProposta, setPercentualMaiorProposta] = useState(dados.percentual_maior_proposta || 0)
  const [calculoFinal, setCalculoFinal] = useState<any>(null)
  const [isManual, setIsManual] = useState<boolean>(dados.propostas_manual || false)
  const [manualMenor, setManualMenor] = useState<number>(dados.menor_proposta_manual || 0)
  const [manualMaior, setManualMaior] = useState<number>(dados.maior_proposta_manual || 0)
  const [herdeiros, setHerdeiros] = useState<Herdeiro[]>([])
  const [loadingHerdeiros, setLoadingHerdeiros] = useState(false)
  const [savingHerdeiros, setSavingHerdeiros] = useState(false)
  const [cotasManuaisIds, setCotasManuaisIds] = useState<string[]>([])
  const [percentualInputs, setPercentualInputs] = useState<Record<string, string>>({})

  const clamp = (v: number) => Math.min(100, Math.max(0, v))
  const buildPercentualInputs = (items: Herdeiro[]) =>
    Object.fromEntries(items.map((item) => [item.id, formatPercentualInput(item.percentual_participacao)]))

  useEffect(() => {
    if (!precatorioId) return
    const load = async () => {
      setLoadingHerdeiros(true)
      try {
        const supabase = getSupabase(); if (!supabase) return
        const { data, error } = await supabase.from("precatorio_herdeiros").select("id, nome_completo, cpf, percentual_participacao").eq("precatorio_id", precatorioId).order("created_at", { ascending: true })
        if (error) throw error
        const herdeirosCarregados = (data || []) as Herdeiro[]
        const herdeirosNormalizados = deveDistribuirIgualAutomaticamente(herdeirosCarregados)
          ? distribuirPercentuaisHerdeiros(herdeirosCarregados)
          : normalizarPercentuaisHerdeiros(herdeirosCarregados)
        setHerdeiros(herdeirosNormalizados)
        setPercentualInputs(buildPercentualInputs(herdeirosNormalizados))
        setCotasManuaisIds(inferHerdeirosComCotaManual(herdeirosNormalizados))
      } catch (error: any) { toast.error(error.message || "Erro ao carregar herdeiros.") }
      finally { setLoadingHerdeiros(false) }
    }
    load()
  }, [precatorioId])

  useEffect(() => {
    const etapaDados = resultadosEtapas[0] || {}
    const etapaAtualizacao = resultadosEtapas[2] || {}
    const etapaPss = resultadosEtapas[3] || {}
    const etapaIrpf = resultadosEtapas[4] || {}
    const etapaHonorarios = resultadosEtapas[5] || {}

    let breakdown = etapaIrpf.breakdown || {}
    if (!breakdown.total_bruto) {
      const valorAtualizado = etapaAtualizacao.valor_atualizado || etapaAtualizacao.valorAtualizado || 0
      breakdown = { principal_original: dados.valor_principal_original || etapaDados.valor_principal_original || 0, correcao_monetaria: etapaAtualizacao.memoriaCalculo?.ipca?.resultado || 0, juros_pre_22: etapaAtualizacao.memoriaCalculo?.juros?.resultado || 0, selic: etapaAtualizacao.memoriaCalculo?.selic?.resultado || 0, ec136_2025: etapaAtualizacao.memoriaCalculo?.ipca2025?.resultado || 0, juros_moratorios_originais: dados.valor_juros_original || 0, total_bruto: valorAtualizado, base_irpf: etapaIrpf.baseIR || 0, descricao_faixa: etapaIrpf.faixa || "N/A" }
    }

    const totalBruto = breakdown.total_bruto || etapaAtualizacao.valor_atualizado || 0
    const pssValor = etapaPss.pss_valor || etapaPss.pssTotal || 0
    const irpfValor = etapaIrpf.irpf_valor || etapaIrpf.valor_irpf || etapaIrpf.irTotal || 0
    const honorarios = etapaHonorarios.honorarios || etapaHonorarios || {}
    const honorariosPercentual = Number(honorarios.honorarios_percentual || dados.honorarios_percentual || 0)
    const adiantamentoPercentual = Number(honorarios.adiantamento_percentual || dados.adiantamento_percentual || 0)
    const basePreDescontos = round2(totalBruto - pssValor - irpfValor)
    const isHonManual = honorarios.honorarios_manual || false
    const honorariosValor = isHonManual && !Number.isNaN(Number(honorarios.honorarios_valor)) ? Number(honorarios.honorarios_valor) : round2(basePreDescontos * (honorariosPercentual / 100))
    const adiantamentoValor = isHonManual && !Number.isNaN(Number(honorarios.adiantamento_valor)) ? Number(honorarios.adiantamento_valor) : round2(basePreDescontos * (adiantamentoPercentual / 100))
    const baseLiquidaFinal = round2(basePreDescontos - honorariosValor - adiantamentoValor)
    const taxaJurosMoratoriosPercent = Number(etapaAtualizacao.taxa_juros_moratorios ?? etapaAtualizacao.taxa_juros_mora ?? dados.taxa_juros_moratorios ?? (dados.juros_mora_percentual ? dados.juros_mora_percentual * 100 : 0) ?? 0)
    const salarioMinimoReferencia = Number(dados.salario_minimo_referencia ?? dados.salario_minimo_vigente ?? 0)
    const { qtdSalarios: qtdSalariosMinimos } = calcularSalariosMinimosJuros(breakdown.principal_original || dados.valor_principal_original || 0, taxaJurosMoratoriosPercent, salarioMinimoReferencia)
    const menorProposta = isManual ? manualMenor : round2(baseLiquidaFinal * (percentualMenorProposta / 100))
    const maiorProposta = isManual ? manualMaior : round2(baseLiquidaFinal * (percentualMaiorProposta / 100))

    setCalculoFinal({ breakdown, valor_atualizado: totalBruto, pss_valor: pssValor, irpf_valor: irpfValor, base_liquida_pre_descontos: basePreDescontos, honorarios_valor: honorariosValor, honorarios_percentual: honorariosPercentual, adiantamento_valor: adiantamentoValor, adiantamento_percentual: adiantamentoPercentual, base_liquida_final: baseLiquidaFinal, base_calculo_liquida: baseLiquidaFinal, valor_liquido_credor: baseLiquidaFinal, percentual_menor: percentualMenorProposta, percentual_maior: percentualMaiorProposta, menor_proposta: menorProposta, maior_proposta: maiorProposta, qtdSalariosMinimos, menorProposta, maiorProposta })
  }, [percentualMenorProposta, percentualMaiorProposta, resultadosEtapas, isManual, manualMenor, manualMaior])

  const totalCotas = somaPercentuaisHerdeiros(herdeiros)
  const hasHerdeiros = herdeiros.length > 0
  const cotasOk = percentuaisHerdeirosSomamCem(herdeiros)

  const aplicarHerdeirosComInputs = (items: Herdeiro[]) => {
    setHerdeiros(items)
    setPercentualInputs(buildPercentualInputs(items))
  }

  const distribuirCotasIgualmente = () => {
    const herdeirosDistribuidos = distribuirPercentuaisHerdeiros(herdeiros)
    setCotasManuaisIds([])
    aplicarHerdeirosComInputs(herdeirosDistribuidos)
  }

  const handlePercentualHerdeiroChange = (id: string, value: string) => {
    const percentual = normalizePercentualParticipacao(value)

    if (percentual === null) {
      setPercentualInputs((prev) => ({ ...prev, [id]: value }))
      setHerdeiros((prev) =>
        prev.map((herdeiro) =>
          herdeiro.id === id ? { ...herdeiro, percentual_participacao: null } : herdeiro
        )
      )
      return
    }

    const nextManualIds = Array.from(new Set([...cotasManuaisIds, id]))
    const herdeirosAtualizados = herdeiros.map((herdeiro) =>
      herdeiro.id === id ? { ...herdeiro, percentual_participacao: percentual } : herdeiro
    )
    const herdeirosDistribuidos = distribuirPercentuaisHerdeiros(herdeirosAtualizados, nextManualIds)
    const nextInputs = buildPercentualInputs(herdeirosDistribuidos)

    nextInputs[id] = value
    setCotasManuaisIds(nextManualIds)
    setHerdeiros(herdeirosDistribuidos)
    setPercentualInputs(nextInputs)
  }

  const handlePercentualHerdeiroBlur = (id: string) => {
    const herdeiro = herdeiros.find((item) => item.id === id)
    setPercentualInputs((prev) => ({
      ...prev,
      [id]: formatPercentualInput(herdeiro?.percentual_participacao),
    }))
  }

  const salvarCotas = async () => {
    if (!precatorioId || !hasHerdeiros) return
    if (!cotasOk) { toast.error("As cotas dos herdeiros devem somar 100%."); return }
    setSavingHerdeiros(true)
    try {
      const supabase = getSupabase(); if (!supabase) return
      const cotasParaSalvar = normalizarPercentuaisHerdeiros(herdeiros)
      const updates = await Promise.all(cotasParaSalvar.map((h) => supabase.from("precatorio_herdeiros").update({ percentual_participacao: h.percentual_participacao }).eq("id", h.id)))
      const firstError = updates.find((r) => r.error)?.error
      if (firstError) throw firstError
      aplicarHerdeirosComInputs(cotasParaSalvar)
      toast.success("Cotas salvas com sucesso.")
    } catch (error: any) { toast.error(error.message || "Erro ao salvar cotas.") }
    finally { setSavingHerdeiros(false) }
  }

  const handleAvancar = () => {
    if (hasHerdeiros && !cotasOk) { toast.error("As cotas dos herdeiros devem somar 100% antes de avançar."); return }
    if (!isManual && (percentualMenorProposta <= 0 || percentualMaiorProposta <= 0)) { toast.error("É necessário definir os percentuais das propostas (maior que zero)."); return }
    setDados({ ...dados, percentual_menor_proposta: percentualMenorProposta, percentual_maior_proposta: percentualMaiorProposta, propostas_manual: isManual, menor_proposta_manual: manualMenor, maior_proposta_manual: manualMaior })
    onCompletar(calculoFinal ? { ...calculoFinal, propostas_manual: isManual } : {})
  }

  const baseLiquidaValor = calculoFinal?.base_liquida_final || 0
  const menorPropostaValor = calculoFinal?.menor_proposta || 0
  const maiorPropostaValor = calculoFinal?.maior_proposta || 0

  return (
    <div
      className="rounded-[22px] bg-white overflow-hidden"
      style={{ border: "1.5px solid rgba(0,0,0,0.07)", boxShadow: "16px 16px 36px rgba(0,0,0,0.08),-8px -8px 20px rgba(255,255,255,0.94),inset 1px 1px 4px rgba(255,255,255,0.9),inset -1px -1px 2px rgba(0,0,0,0.04)" }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div>
          <p className="text-[17px] font-black tracking-tight" style={{ color: "#0b0c10" }}>Propostas</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>Defina a faixa de proposta mínima e máxima com base no valor líquido final do credor.</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9ca3af" }}>Modo</p>
          <SegmentedToggle value={isManual ? "manual" : "auto"} onChange={(v) => { setIsManual(v === "manual"); if (v === "manual" && calculoFinal) { setManualMenor(calculoFinal.menor_proposta || 0); setManualMaior(calculoFinal.maior_proposta || 0) } }} options={[{ value: "auto", label: "Automático" }, { value: "manual", label: "Manual" }]} />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <ProposalKpi label="Base líquida final" value={fmt(baseLiquidaValor)} helper="Base p/ propostas" chip="Base p/ propostas" icon={<ICScale />} />
          <ProposalKpi label="Menor proposta" value={fmt(menorPropostaValor)} helper={`${percentualMenorProposta || 0}%`} chip="Mínimo" icon={<ICPercent />} />
          <ProposalKpi label="Maior proposta" value={fmt(maiorPropostaValor)} helper={`${percentualMaiorProposta || 0}%`} chip="Máximo" icon={<ICPercent />} />
        </div>

        {/* Percentuais */}
        <div className="rounded-[18px] bg-white p-5 space-y-4" style={{ border: "1.5px solid rgba(0,0,0,0.07)", boxShadow: "6px 6px 16px rgba(0,0,0,0.04),-3px -3px 10px rgba(255,255,255,0.9)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold" style={{ color: "#0b0c10" }}>Ajuste de percentuais</p>
              <p className="text-[11px]" style={{ color: "#9ca3af" }}>Defina as faixas percentuais para as propostas.</p>
            </div>
            {isManual && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold" style={{ background: "rgba(14,77,106,0.08)", border: "1px solid rgba(14,77,106,0.2)", color: "#0e4d6a" }}>
                <ICLock /> Percentuais bloqueados
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label style={labelStyle}>Percentual da menor proposta (%)</label>
              <input type="number" step="0.01" min="0" max="100" style={{ ...inputStyle, opacity: isManual ? 0.5 : 1 }}
                value={percentualMenorProposta} onChange={(e) => { if (!isManual) setPercentualMenorProposta(clamp(Number(e.target.value) || 0)) }} disabled={isManual} />
            </div>
            <div>
              <label style={labelStyle}>Percentual da maior proposta (%)</label>
              <input type="number" step="0.01" min="0" max="100" style={{ ...inputStyle, opacity: isManual ? 0.5 : 1 }}
                value={percentualMaiorProposta} onChange={(e) => { if (!isManual) setPercentualMaiorProposta(clamp(Number(e.target.value) || 0)) }} disabled={isManual} />
            </div>
          </div>
          <p className="text-[11px]" style={{ color: "#9ca3af" }}>{isManual ? "Modo manual ativo: percentuais bloqueados, valores definidos diretamente." : "Ajuste os percentuais para simular propostas com base na base líquida."}</p>
        </div>

        {/* Manual values */}
        {isManual && (
          <div className="rounded-[18px] bg-white p-5" style={{ border: "1.5px solid rgba(0,0,0,0.07)", boxShadow: "6px 6px 16px rgba(0,0,0,0.04),-3px -3px 10px rgba(255,255,255,0.9)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold" style={{ color: "#0b0c10" }}>Ajuste manual</p>
              <span className="rounded-full px-2 py-1 text-[11px] font-bold" style={{ background: "rgba(14,77,106,0.08)", border: "1px solid rgba(14,77,106,0.18)", color: "#0e4d6a" }}>Manual ativo</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label style={labelStyle}>Valor manual da menor proposta</label>
                <input type="number" step="0.01" style={inputStyle} value={manualMenor} onChange={(e) => setManualMenor(Number(e.target.value) || 0)} />
              </div>
              <div>
                <label style={labelStyle}>Valor manual da maior proposta</label>
                <input type="number" step="0.01" style={inputStyle} value={manualMaior} onChange={(e) => setManualMaior(Number(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        )}

        {/* Herdeiros */}
        {loadingHerdeiros && <p className="text-[12px]" style={{ color: "#9ca3af" }}>Carregando herdeiros...</p>}
        {hasHerdeiros && (
          <SectionPanel title="Herdeiros" description="Defina a cota de cada herdeiro (total 100%)." tone="info">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ICUsers />
                <p className="text-[13px] font-bold" style={{ color: "#0b0c10" }}>Distribuição de cotas</p>
              </div>
              <div className="flex items-center gap-2">
                {herdeiros.length > 1 && (
                  <button type="button" onClick={distribuirCotasIgualmente} disabled={savingHerdeiros}
                    className="rounded-[10px] px-3 py-1.5 text-[12px] font-bold transition-all disabled:opacity-50"
                    style={{ background: "#f0f1f5", color: "#0b0c10", border: "1px solid rgba(0,0,0,0.07)" }}>
                    Ratear igual
                  </button>
                )}
                <button type="button" onClick={salvarCotas} disabled={savingHerdeiros || !cotasOk}
                  className="rounded-[10px] px-3 py-1.5 text-[12px] font-bold transition-all disabled:opacity-50"
                  style={{ background: "#0e4d6a", color: "#fff", border: "none", boxShadow: "4px 4px 10px rgba(14,77,106,0.3)" }}>
                  {savingHerdeiros ? "Salvando..." : "Salvar cotas"}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {herdeiros.map((h) => (
                <div key={h.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "#0b0c10" }}>{h.nome_completo}</p>
                    <p className="text-[11px] truncate" style={{ color: "#9ca3af" }}>{h.cpf || "CPF N/I"}</p>
                  </div>
                  <div style={{ width: 128 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      style={inputStyle}
                      placeholder="0,00"
                      value={percentualInputs[h.id] ?? formatPercentualInput(h.percentual_participacao)}
                      onChange={(e) => handlePercentualHerdeiroChange(h.id, e.target.value)}
                      onBlur={() => handlePercentualHerdeiroBlur(h.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span style={{ color: "#9ca3af" }}>Total: {totalCotas.toFixed(2)}%</span>
              {cotasOk ? <span style={{ color: "#15803d", fontWeight: 700 }}>Cotas OK</span> : <span style={{ color: "#dc2626", fontWeight: 700 }}>Deve somar 100%</span>}
            </div>
          </SectionPanel>
        )}

        {/* Preview */}
        {calculoFinal && (
          <SectionPanel title="Preview do cálculo final" description="Detalhamento completo da base líquida." tone="primary">
            <div className="space-y-3">
              {/* Bruto */}
              <div className="rounded-[13px] p-4" style={{ background: "#f8f9fc", border: "1px solid rgba(0,0,0,0.06)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#9ca3af" }}>Valor bruto</p>
                  <span className="rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider" style={{ background: "rgba(14,77,106,0.08)", border: "1px solid rgba(14,77,106,0.2)", color: "#0e4d6a" }}>Total</span>
                </div>
                <div className="space-y-1.5 text-[12.5px]">
                  {[["Principal Original", calculoFinal.breakdown?.principal_original || 0], ["Correção (IPCA-E/IPCA)", calculoFinal.breakdown?.correcao_monetaria || 0], ["Juros Pré-22", calculoFinal.breakdown?.juros_pre_22 || 0], ["SELIC (Pós-22)", calculoFinal.breakdown?.selic || 0], ["EC 136/2025 (IPCA 2025)", calculoFinal.breakdown?.ec136_2025 || 0]].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between">
                      <span style={{ color: "#6b7280" }}>{k as string}</span>
                      <span className="tabular-nums font-semibold" style={{ color: "#0e4d6a" }}>{fmt(v as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
                    <span className="font-bold" style={{ color: "#0b0c10" }}>Total Bruto</span>
                    <span className="tabular-nums font-black" style={{ color: "#0b0c10" }}>{fmt(calculoFinal.valor_atualizado)}</span>
                  </div>
                </div>
              </div>

              {/* Descontos */}
              <div className="rounded-[13px] p-4" style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#dc2626" }}>Descontos</p>
                <div className="space-y-1.5 text-[12.5px]">
                  {[["(-) PSS", calculoFinal.pss_valor], [`(-) IRPF (${calculoFinal.breakdown?.descricao_faixa || "N/A"})`, calculoFinal.irpf_valor], [`(-) Honorários (${calculoFinal.honorarios_percentual?.toFixed(2) || "0.00"}%)`, calculoFinal.honorarios_valor], [`(-) Adiantamento (${calculoFinal.adiantamento_percentual?.toFixed(2) || "0.00"}%)`, calculoFinal.adiantamento_valor]].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between">
                      <span style={{ color: "#dc2626" }}>{k as string}</span>
                      <span className="tabular-nums font-semibold" style={{ color: "#dc2626" }}>{fmt(v as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Base líquida */}
              <div className="rounded-[13px] p-4" style={{ background: "rgba(14,77,106,0.05)", border: "1px solid rgba(14,77,106,0.15)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: "#0e4d6a" }}>Base líquida final</p>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px]" style={{ color: "#0e4d6a" }}>Base para propostas</span>
                  <span className="text-[18px] font-black tabular-nums" style={{ color: "#0e4d6a" }}>{fmt(calculoFinal.base_liquida_final)}</span>
                </div>
              </div>

              {/* Propostas */}
              <div className="grid gap-2 sm:grid-cols-2">
                {[["Menor", calculoFinal.menor_proposta], ["Maior", calculoFinal.maior_proposta]].map(([k, v]) => (
                  <div key={k as string} className="flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[12.5px]"
                    style={{ background: "rgba(14,77,106,0.06)", border: "1px solid rgba(14,77,106,0.15)" }}>
                    <span style={{ color: "#0e4d6a" }}>{k as string}</span>
                    <span className="tabular-nums font-bold" style={{ color: "#0e4d6a" }}>{fmt(v as number)}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionPanel>
        )}

        {/* Nota */}
        <div className="flex items-start gap-3 rounded-[14px] p-4" style={{ background: "rgba(14,77,106,0.04)", border: "1px solid rgba(14,77,106,0.12)" }}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(14,77,106,0.12)", color: "#0e4d6a" }}><ICInfo /></div>
          <div>
            <p className="text-[13px] font-bold" style={{ color: "#0b0c10" }}>Observação</p>
            <p className="text-[11.5px] mt-0.5" style={{ color: "#9ca3af" }}>As propostas são calculadas sobre a base líquida final (após descontar PSS, IRPF, honorários e adiantamento).</p>
          </div>
        </div>
      </div>

      <StepFooter onBack={voltar} onNext={handleAvancar} />
    </div>
  )
}
