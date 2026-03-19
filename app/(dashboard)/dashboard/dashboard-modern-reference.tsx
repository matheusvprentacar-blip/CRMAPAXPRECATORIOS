"use client"

import { useEffect, useMemo, useRef, useState } from "react"

const PERIOD_OPTIONS = [
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "180d", label: "Últimos 6 meses" },
  { value: "365d", label: "Últimos 12 meses" },
] as const

type DashboardKpis = {
  resumo: { total_precatorios: number; total_principal: number; total_atualizado: number; total_saldo_liquido: number; total_credores: number; total_propostas: number }
  periodo_kpis: { novos_precatorios: number; propostas_criadas: number; atividades_periodo: number; mensagens_chat_periodo: number }
  kanban: { quantidade_por_status: Record<string, number>; valor_por_status: Record<string, number> }
  financeiro: { pss_total: number; honorarios_total: number; irpf_total: number; adiantamento_total: number }
  propostas: { valor_total: number; ticket_medio: number; desconto_medio: number; por_status: Record<string, number> }
  calculo: { pronto_calculo: number; em_calculo: number; concluido: number; desatualizado: number }
  sla: { no_prazo: number; atencao: number; atrasado: number; nao_iniciado: number; concluido: number }
  documentos_certidoes: { total_docs: number; docs_recebidos: number; total_certidoes: number; certidoes_recebidas: number; certidoes_vencidas: number }
  credores: { total_credores: number; valor_total_principal: number }
  oficios: { analise_processual_inicial: number; com_oficio: number }
  chat: { mensagens_nao_lidas: number }
  usuarios: { ativos_total: number }
}

type CriticalRow = { id: string; nome: string; responsavel: string; etapa: string; slaLabel: string; score: number }
type Props = { kpis: DashboardKpis; lastUpdated?: string | null; refreshing?: boolean; period?: string; periodLabel?: string; onRefresh?: () => void; onPeriodChange?: (p: string) => void; criticalRows?: CriticalRow[]; origemLeadData?: Record<string, number> }
type View = "overview" | "details" | "operation"

const HERO: Record<View, { title: string; text: string }> = {
  overview: { title: "Visão consolidada de precatórios: valor, SLA e ação em destaque.", text: "Painel integrado com leitura rápida de risco, gargalo e oportunidade. Acompanhe o fluxo operacional, alertas de SLA e movimentação financeira do portfólio." },
  details: { title: "Detalhes por status, proposta, cálculo e documentação.", text: "Distribuição completa por etapa do kanban, análise de propostas aceitas e em negociação, documentos recebidos e certidões pendentes." },
  operation: { title: "Operação: priorize riscos, SLA crítico e gargalos do fluxo.", text: "Foco em precatórios com SLA estourado, cálculos desatualizados, ofícios pendentes e mensagens não respondidas. Decisão imediata sem varrer a tela." },
}


const FALLBACK_VALUE_ROWS = [
  { label: "Entrada / Pré-cadastro", value: 1_390_000_000 },
  { label: "Cálculo concluído", value: 204_000_000 },
  { label: "Pausados", value: 135_000_000 },
  { label: "Triagem", value: 92_000_000 },
  { label: "Proposta / Negociação", value: 78_000_000 },
  { label: "Aguardando ofício", value: 65_000_000 },
]

const FALLBACK_QTD_ROWS = [
  { label: "Entrada / Pré-cadastro", value: 1184 },
  { label: "Reprovado / não elegível", value: 87 },
  { label: "Cálculo concluído", value: 87 },
  { label: "Triagem", value: 48 },
  { label: "Pausados", value: 41 },
]

const humanize = (v: string) => v.replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase())
const fmt = (v: number) => new Intl.NumberFormat("pt-BR").format(Number(v || 0))
const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(Number(v || 0))
const compact = (v: number) => (v >= 1_000_000_000 ? `R$ ${(v / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi` : v >= 1_000_000 ? `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : money(v))
const pct = (v: number, d = 0) => `${Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d })}%`
const initials = (n: string) => n.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "--"
const rows = (map: Record<string, number>, n: number) => Object.entries(map).map(([label, value]) => ({ label: humanize(label), value: Number(value || 0) })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, n)
const tone = (i: number) => ["from-orange-500 to-orange-300", "from-amber-500 to-amber-300", "from-emerald-500 to-emerald-300", "from-blue-500 to-blue-300", "from-violet-500 to-violet-300", "from-rose-500 to-rose-300"][i % 6]

export default function DashboardModernReference({ kpis, lastUpdated, refreshing = false, period = "30d", periodLabel = "Últimos 30 dias", onRefresh, onPeriodChange, criticalRows = [], origemLeadData = {} }: Props) {
  const [view, setView] = useState<View>("overview")
  const [showPeriodMenu, setShowPeriodMenu] = useState(false)
  const periodMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (periodMenuRef.current && !periodMenuRef.current.contains(e.target as Node)) {
        setShowPeriodMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function exportCSV() {
    const lines = [
      "Métrica,Valor",
      `Total precatórios,${kpis.resumo.total_precatorios}`,
      `Total credores,${kpis.credores.total_credores}`,
      `Valor principal,${kpis.resumo.total_principal}`,
      `Valor atualizado,${kpis.resumo.total_atualizado}`,
      `Saldo líquido,${kpis.resumo.total_saldo_liquido}`,
      `PSS total,${kpis.financeiro.pss_total}`,
      `Honorários total,${kpis.financeiro.honorarios_total}`,
      `IRPF total,${kpis.financeiro.irpf_total}`,
      `Adiantamento total,${kpis.financeiro.adiantamento_total}`,
      `Propostas aceitas (qtd),${propostasAceitasQtd}`,
      `Propostas aceitas (valor),${propostasAceitasValor}`,
      `SLA no prazo,${kpis.sla.no_prazo}`,
      `SLA em atenção,${kpis.sla.atencao}`,
      `SLA atrasados,${kpis.sla.atrasado}`,
      `SLA concluídos,${kpis.sla.concluido}`,
      `Chats não lidos,${kpis.chat.mensagens_nao_lidas}`,
      `Cálculos concluídos,${kpis.calculo.concluido}`,
      `Em cálculo,${kpis.calculo.em_calculo}`,
      `Prontos p/ cálculo,${kpis.calculo.pronto_calculo}`,
      `Cálculos desatualizados,${kpis.calculo.desatualizado}`,
      `Documentos recebidos,${kpis.documentos_certidoes.docs_recebidos}/${kpis.documentos_certidoes.total_docs}`,
      `Certidões recebidas,${kpis.documentos_certidoes.certidoes_recebidas}/${kpis.documentos_certidoes.total_certidoes}`,
      `Certidões vencidas,${kpis.documentos_certidoes.certidoes_vencidas}`,
      `Ofícios pendentes,${kpis.oficios.analise_processual_inicial}`,
      `Com ofício emitido,${kpis.oficios.com_oficio}`,
      "",
      "Status Kanban (valor),",
      ...Object.entries(kpis.kanban.valor_por_status).map(([k, v]) => `${k},${v}`),
      "",
      "Status Kanban (quantidade),",
      ...Object.entries(kpis.kanban.quantidade_por_status).map(([k, v]) => `${k},${v}`),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dashboard-precatorios-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const valueRows = useMemo(() => {
    const data = rows(kpis.kanban.valor_por_status, 6)
    return data.length ? data : FALLBACK_VALUE_ROWS
  }, [kpis.kanban.valor_por_status])
  const qtdRows = useMemo(() => {
    const data = rows(kpis.kanban.quantidade_por_status, 5)
    return data.length ? data : FALLBACK_QTD_ROWS
  }, [kpis.kanban.quantidade_por_status])
  const maxValue = Math.max(...valueRows.map((r) => r.value), 1)
  const maxQtd = Math.max(...qtdRows.map((r) => r.value), 1)
  const docs = kpis.documentos_certidoes.total_docs ? (kpis.documentos_certidoes.docs_recebidos / kpis.documentos_certidoes.total_docs) * 100 : 0
  const cert = kpis.documentos_certidoes.total_certidoes ? (kpis.documentos_certidoes.certidoes_recebidas / kpis.documentos_certidoes.total_certidoes) * 100 : 0
  const slaBase = kpis.sla.no_prazo + kpis.sla.atencao + kpis.sla.atrasado + kpis.sla.nao_iniciado + kpis.sla.concluido
  const slaHealthy = slaBase ? ((kpis.sla.no_prazo + kpis.sla.concluido) / slaBase) * 100 : 0
  const ring = Math.round((docs + cert + slaHealthy) / 3)
  const critical = criticalRows
  const bigger = Math.max(...Object.values(kpis.kanban.valor_por_status).map((v) => Number(v || 0)), 0)
  const variacaoAtualizado = kpis.resumo.total_principal > 0 ? ((kpis.resumo.total_atualizado - kpis.resumo.total_principal) / kpis.resumo.total_principal) * 100 : 0
  const totalAlertas = kpis.sla.atrasado + kpis.chat.mensagens_nao_lidas
  const calcTotal = kpis.calculo.pronto_calculo + kpis.calculo.em_calculo + kpis.calculo.concluido
  const calcPctConcluido = calcTotal > 0 ? (kpis.calculo.concluido / calcTotal) * 100 : 0
  const certVencidasAlerta = kpis.documentos_certidoes.certidoes_vencidas > 0
  const propostasAceitasQtd = Number(kpis.propostas.por_status?.proposta_aceita || 0)
  const propostasAceitasValor = Number(kpis.kanban.valor_por_status?.proposta_aceita || 0)

  return (
    <div className="space-y-5 rounded-3xl bg-[#f6f7fb] p-4 text-slate-900 md:p-6">
      {/* HERO */}
      <section className="hero rounded-[30px] border bg-white/80 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
        <div className="hero-grid grid gap-5 xl:grid-cols-[1.35fr_.9fr]">
          <div>
            <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">● CRM Precatórios · Dashboard estratégico</span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">{HERO[view].title}</h1>
            <p className="mt-2 max-w-4xl text-sm text-slate-500">{HERO[view].text}</p>
            <div className="toolbar mt-5 flex flex-wrap items-center gap-2">
              <div className="segmented rounded-2xl border bg-white p-1">
                {(["overview", "details", "operation"] as View[]).map((k) => (
                  <button key={k} className={`rounded-xl px-3 py-2 text-sm font-semibold ${view === k ? "bg-orange-500 text-white" : "text-slate-600"}`} onClick={() => setView(k)}>{k === "overview" ? "Visão geral" : k === "details" ? "Detalhes" : "Operação"}</button>
                ))}
              </div>
              <div className="min-w-[240px] flex-1 rounded-2xl border bg-white px-3 py-2 text-sm text-slate-500">⌕ Buscar credor, precatório, status, responsável...</div>
              <div className="relative" ref={periodMenuRef}>
                <button
                  className="rounded-2xl border bg-white px-3 py-2 text-sm font-medium"
                  onClick={() => setShowPeriodMenu((v) => !v)}
                >
                  {PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? periodLabel} ▾
                </button>
                {showPeriodMenu && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-2xl border bg-white shadow-lg">
                    {PERIOD_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${period === o.value ? "font-semibold text-orange-600" : "text-slate-700"}`}
                        onClick={() => { onPeriodChange?.(o.value); setShowPeriodMenu(false) }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="rounded-2xl border bg-white px-3 py-2 text-sm font-semibold" onClick={exportCSV}>Exportar</button>
              <button className="rounded-2xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={onRefresh} disabled={refreshing}>{refreshing ? "Atualizando..." : "Atualizar painel"}</button>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border bg-white/85 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Saldo líquido monitorado</h3>
                  <p className="text-xs text-slate-500">Valor final após honorários, PSS e IRPF.</p>
                </div>
                <span className="rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap">SLA {pct(slaHealthy)}</span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <strong className="text-3xl">{compact(kpis.resumo.total_saldo_liquido)}</strong>
                  <p className="text-xs text-slate-500">{variacaoAtualizado >= 0 ? "+" : ""}{pct(variacaoAtualizado, 1)} correção monetária vs. principal</p>
                </div>
                <span className="rounded-xl bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">↗ tendência positiva</span>
              </div>
            </div>
            <div className="rounded-2xl border bg-white/85 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Prioridades e alertas</h3>
                  <p className="text-xs text-slate-500">Itens que exigem ação imediata no portfólio.</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${totalAlertas > 0 ? "border-rose-200 bg-rose-50 text-rose-700" : ""}`}>{fmt(totalAlertas)} alertas</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">● SLA {pct(slaHealthy)} saudável</span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">● {fmt(kpis.oficios.analise_processual_inicial)} aguardando ofício</span>
                {kpis.chat.mensagens_nao_lidas > 0 && <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">● {fmt(kpis.chat.mensagens_nao_lidas)} chats pendentes</span>}
                <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">● {fmt(kpis.calculo.em_calculo)} em cálculo</span>
                {certVencidasAlerta && <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">● {fmt(kpis.documentos_certidoes.certidoes_vencidas)} certidões vencidas</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== VISÃO GERAL ===== */}
      {view === "overview" && (<>
        {/* KPIs principais */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Ativos monitorados</div>
                <div className="mt-2 text-3xl font-extrabold">{fmt(kpis.resumo.total_precatorios)}</div>
                <div className="text-xs text-slate-500">Total de precatórios na carteira</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl border text-lg">◫</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">+{fmt(kpis.periodo_kpis.novos_precatorios)} novos no período</span>
              {kpis.usuarios?.ativos_total > 0 && <span className="rounded-full border px-2 py-1 text-slate-600">{fmt(kpis.usuarios.ativos_total)} usuários ativos</span>}
            </div>
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Valor principal</div>
                <div className="mt-2 text-3xl font-extrabold">{compact(kpis.resumo.total_principal)}</div>
                <div className="text-xs text-slate-500">Soma dos valores nominais dos precatórios</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl border text-lg">◌</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">Atualizado: {compact(kpis.resumo.total_atualizado)}</span>
            </div>
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">SLA operacional</div>
                <div className="mt-2 text-3xl font-extrabold">{pct(slaHealthy)}</div>
                <div className="text-xs text-slate-500">Precatórios no prazo ou finalizados</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl border text-lg">⌁</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {kpis.sla.atrasado > 0 && <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">{fmt(kpis.sla.atrasado)} atrasados</span>}
              {kpis.sla.atencao > 0 && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">{fmt(kpis.sla.atencao)} em atenção</span>}
              {kpis.sla.atrasado === 0 && kpis.sla.atencao === 0 && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Todos no prazo</span>}
            </div>
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Mensagens / alertas</div>
                <div className={`mt-2 text-3xl font-extrabold ${kpis.chat.mensagens_nao_lidas > 0 ? "text-rose-600" : ""}`}>{fmt(kpis.chat.mensagens_nao_lidas)}</div>
                <div className="text-xs text-slate-500">Chats sem resposta no sistema</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl border text-lg">☰</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {kpis.chat.mensagens_nao_lidas > 0 ? <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Responder agora</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Nenhuma pendência</span>}
              {kpis.sla.atrasado > 0 && <span className="rounded-full border px-2 py-1 text-slate-600">{fmt(kpis.sla.atrasado)} SLAs urgentes</span>}
            </div>
          </article>
        </section>

        {/* Financeiro + Radar */}
        <section className="grid gap-4 xl:grid-cols-[1.3fr_.9fr]">
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Resumo financeiro consolidado</h2>
                <p className="text-xs text-slate-500">Principal, atualizado, saldo líquido e deduções do portfólio.</p>
              </div>
              <span className="rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap">Saldo líquido</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border bg-[#f4f5f8]">
              <svg viewBox="0 0 800 200" className="h-44 w-full" aria-hidden="true" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fillOrange" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,122,26,0.38)" />
                    <stop offset="100%" stopColor="rgba(255,122,26,0)" />
                  </linearGradient>
                  <linearGradient id="fillBlue" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(99,120,255,0.28)" />
                    <stop offset="100%" stopColor="rgba(99,120,255,0)" />
                  </linearGradient>
                </defs>
                {[40, 80, 120, 160].map((y) => (
                  <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="rgba(15,23,42,0.05)" strokeWidth="1" />
                ))}
                <path d="M0 148 C60 128, 105 95, 170 108 C235 121, 265 158, 330 142 C395 126, 435 72, 495 84 C555 96, 595 136, 655 114 C715 92, 760 65, 800 42 L800 200 L0 200 Z" fill="url(#fillOrange)" />
                <path d="M0 170 C60 164, 105 150, 170 154 C235 158, 265 174, 330 166 C395 158, 435 136, 495 144 C555 152, 595 166, 655 158 C715 150, 760 132, 800 118 L800 200 L0 200 Z" fill="url(#fillBlue)" />
                <path d="M0 148 C60 128, 105 95, 170 108 C235 121, 265 158, 330 142 C395 126, 435 72, 495 84 C555 96, 595 136, 655 114 C715 92, 760 65, 800 42" stroke="#ff7a1a" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M0 170 C60 164, 105 150, 170 154 C235 158, 265 174, 330 166 C395 158, 435 136, 495 144 C555 152, 595 166, 655 158 C715 150, 760 132, 800 118" stroke="#637cff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".95" />
              </svg>
              <div className="flex flex-wrap items-center gap-4 border-t bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ff7a1a]" /> Total atualizado</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#637cff]" /> Propostas aceitas</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#0db57a]" /> Meta financeira</span>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border bg-white p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Valor atualizado</div>
                <strong className="mt-1 block text-xl">{compact(kpis.resumo.total_atualizado)}</strong>
                <div className="text-xs text-slate-500">Com correção monetária</div>
              </div>
              <div className="rounded-2xl border bg-white p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">PSS total</div>
                <strong className="mt-1 block text-xl">{compact(kpis.financeiro.pss_total)}</strong>
                <div className="text-xs text-slate-500">Previdência dos servidores</div>
              </div>
              {kpis.financeiro.honorarios_total > 0 && (
                <div className="rounded-2xl border bg-white p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Honorários</div>
                  <strong className="mt-1 block text-xl">{compact(kpis.financeiro.honorarios_total)}</strong>
                  <div className="text-xs text-slate-500">Total de honorários contratuais</div>
                </div>
              )}
              {kpis.financeiro.irpf_total > 0 && (
                <div className="rounded-2xl border bg-white p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">IRPF total</div>
                  <strong className="mt-1 block text-xl">{compact(kpis.financeiro.irpf_total)}</strong>
                  <div className="text-xs text-slate-500">Imposto de renda retido</div>
                </div>
              )}
            </div>
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Radar operacional</h2>
                <p className="text-xs text-slate-500">Documentos, certidões, SLA e cálculo em andamento.</p>
              </div>
              <span className="rounded-full border px-2 py-1 text-xs font-semibold">Eficiência {pct(ring)}</span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative grid h-24 w-24 flex-shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#ff7a1a 0 ${ring}%, rgba(15,23,42,.1) ${ring}% 100%)` }}>
                <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-sm font-bold">{pct(ring)}</div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Eficiência do fluxo</div>
                <div className="text-xl font-extrabold">{ring >= 80 ? "Alta — operação saudável" : ring >= 60 ? "Moderada — pontos de atenção" : "Baixa — ação necessária"}</div>
                <div className="text-xs text-slate-500">Média entre docs, certidões e SLA</div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { l: "Documentos recebidos", v: docs, f: `${fmt(kpis.documentos_certidoes.docs_recebidos)}/${fmt(kpis.documentos_certidoes.total_docs)}` },
                { l: "Certidões recebidas", v: cert, f: `${fmt(kpis.documentos_certidoes.certidoes_recebidas)}/${fmt(kpis.documentos_certidoes.total_certidoes)}` },
                { l: "SLA saudável", v: slaHealthy, f: pct(slaHealthy) },
                { l: "Cálculo em andamento", v: Math.min(100, (kpis.calculo.em_calculo / Math.max(1, kpis.resumo.total_precatorios)) * 100), f: `${fmt(kpis.calculo.em_calculo)} itens` },
              ].map((p) => (
                <div key={p.l} className="rounded-2xl border bg-white p-3">
                  <div className="flex justify-between text-sm"><strong>{p.l}</strong><strong>{p.f}</strong></div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-300" style={{ width: `${Math.max(0, Math.min(100, p.v))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Valor por status + Gargalos + Pipeline */}
        <section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr_.8fr]">
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Valor por status (kanban)</h2>
                <p className="text-xs text-slate-500">Distribuição financeira por etapa do fluxo operacional.</p>
              </div>
              <span className="rounded-full border px-2 py-1 text-xs font-semibold">Top 6 por valor</span>
            </div>
            <div className="mt-4 space-y-3">
              {valueRows.map((r, i) => (
                <div key={r.label} className="grid items-center gap-2 text-sm md:grid-cols-[220px_1fr_96px]">
                  <div className="truncate">{r.label}</div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${tone(i)}`} style={{ width: `${(r.value / maxValue) * 100}%` }} />
                  </div>
                  <div className="text-right font-bold">{compact(r.value)}</div>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <h2 className="font-semibold">Gargalos e metas</h2>
            <p className="text-xs text-slate-500">Itens bloqueados ou aguardando ação externa.</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border bg-white p-3">
                <div className="flex items-center justify-between">
                  <strong>Ofícios pendentes</strong>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{fmt(kpis.oficios.analise_processual_inicial)} itens</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{kpis.oficios.com_oficio > 0 ? `${fmt(kpis.oficios.com_oficio)} já com ofício emitido.` : "Nenhum ofício emitido ainda."}</p>
              </div>
              <div className="rounded-2xl border bg-white p-3">
                <div className="flex items-center justify-between">
                  <strong>Pronto para cálculo</strong>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{fmt(kpis.calculo.pronto_calculo)} itens</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {kpis.calculo.em_calculo > 0 ? `${fmt(kpis.calculo.em_calculo)} em cálculo agora.` : "Nenhum em cálculo no momento."}
                  {kpis.calculo.concluido > 0 ? ` ${fmt(kpis.calculo.concluido)} concluídos.` : ""}
                </p>
              </div>
              <div className="rounded-2xl border bg-white p-3">
                <div className="flex items-center justify-between">
                  <strong>Mensagens não lidas</strong>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${kpis.chat.mensagens_nao_lidas > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {kpis.chat.mensagens_nao_lidas > 0 ? `${fmt(kpis.chat.mensagens_nao_lidas)} alertas` : "Sem pendências"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{kpis.periodo_kpis.mensagens_chat_periodo > 0 ? `${fmt(kpis.periodo_kpis.mensagens_chat_periodo)} mensagens no período.` : ""}</p>
              </div>
              {kpis.calculo.desatualizado > 0 && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                  <div className="flex items-center justify-between">
                    <strong>Cálculos desatualizados</strong>
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">{fmt(kpis.calculo.desatualizado)} itens</span>
                  </div>
                  <p className="mt-1 text-xs text-rose-600">Recalcular para garantir correção monetária.</p>
                </div>
              )}
            </div>
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <h2 className="font-semibold">Pipeline de cálculo</h2>
            <p className="text-xs text-slate-500">Status atual dos cálculos no portfólio.</p>
            <div className="mt-4 space-y-3">
              {[
                { l: "Concluídos", v: calcPctConcluido, n: kpis.calculo.concluido, color: "from-emerald-500 to-emerald-300" },
                { l: "Em cálculo", v: calcTotal > 0 ? (kpis.calculo.em_calculo / calcTotal) * 100 : 0, n: kpis.calculo.em_calculo, color: "from-blue-500 to-blue-300" },
                { l: "Prontos para cálculo", v: calcTotal > 0 ? (kpis.calculo.pronto_calculo / calcTotal) * 100 : 0, n: kpis.calculo.pronto_calculo, color: "from-orange-500 to-orange-300" },
                { l: "Desatualizados", v: calcTotal > 0 ? (kpis.calculo.desatualizado / calcTotal) * 100 : 0, n: kpis.calculo.desatualizado, color: "from-rose-500 to-rose-300" },
              ].filter((p) => p.n > 0).map((p) => (
                <div key={p.l} className="rounded-2xl border bg-white p-3">
                  <div className="flex justify-between text-sm"><strong>{p.l}</strong><strong>{fmt(p.n)}</strong></div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${p.color}`} style={{ width: `${Math.max(0, Math.min(100, p.v))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Cards secundários */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Credores</div>
            <div className="mt-2 text-3xl font-extrabold">{fmt(kpis.credores.total_credores)}</div>
            <div className="text-xs text-slate-500">Total de credores cadastrados</div>
            {kpis.credores.valor_total_principal > 0 && <div className="mt-2 text-xs font-semibold text-slate-600">{compact(kpis.credores.valor_total_principal)} em valor principal</div>}
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Propostas aceitas</div>
            <div className="mt-2 text-3xl font-extrabold">{compact(propostasAceitasValor)}</div>
            <div className="text-xs text-slate-500">Valor de propostas aceitas pelo cliente</div>
            {propostasAceitasQtd > 0 && <div className="mt-2 text-xs font-semibold text-emerald-700">{fmt(propostasAceitasQtd)} proposta{propostasAceitasQtd !== 1 ? "s" : ""} aceita{propostasAceitasQtd !== 1 ? "s" : ""}</div>}
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Maior proposta</div>
            <div className="mt-2 text-3xl font-extrabold">{compact(bigger)}</div>
            <div className="text-xs text-slate-500">Maior valor de proposta por kanban</div>
            {kpis.periodo_kpis.propostas_criadas > 0 && <div className="mt-2 text-xs font-semibold text-slate-600">+{fmt(kpis.periodo_kpis.propostas_criadas)} criadas no período</div>}
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Atividades no período</div>
            <div className="mt-2 text-3xl font-extrabold">{fmt(kpis.periodo_kpis.atividades_periodo)}</div>
            <div className="text-xs text-slate-500">Ações registradas no período selecionado</div>
            {kpis.propostas.desconto_medio > 0 && <div className="mt-2 text-xs font-semibold text-slate-600">Desconto médio: {pct(kpis.propostas.desconto_medio, 1)}</div>}
          </article>
        </section>

        {/* Quantidade por status + Precatórios críticos */}
        <section className="grid gap-4 xl:grid-cols-[1.3fr_.9fr]">
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Quantidade por status (kanban)</h2>
                <p className="text-xs text-slate-500">Distribuição de precatórios por etapa do fluxo.</p>
              </div>
              <span className="rounded-full border px-2 py-1 text-xs font-semibold">Top 5</span>
            </div>
            <div className="mt-4 space-y-3">
              {qtdRows.map((r, i) => (
                <div key={r.label} className="grid items-center gap-2 text-sm md:grid-cols-[220px_1fr_96px]">
                  <div className="truncate">{r.label}</div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${tone(i)}`} style={{ width: `${(r.value / maxQtd) * 100}%` }} />
                  </div>
                  <div className="text-right font-bold">{fmt(r.value)}</div>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Precatórios críticos</h2>
                <p className="text-xs text-slate-500">SLA estourado, risco alto e score de criticidade.</p>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="border-b py-2">Precatório</th>
                    <th className="border-b py-2">Responsável</th>
                    <th className="border-b py-2">SLA</th>
                    <th className="border-b py-2">Risco</th>
                    <th className="border-b py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {critical.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-xs text-slate-400">Nenhum precatório crítico encontrado.</td></tr>
                  ) : critical.map((r: CriticalRow) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="max-w-[140px] truncate py-3">{r.nome}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-200 to-orange-200 text-xs font-bold">{initials(r.responsavel)}</div>
                          <div className="truncate">{r.responsavel}</div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${r.slaLabel.toLowerCase().includes("atras") ? "bg-rose-100 text-rose-700" : r.slaLabel.toLowerCase().includes("aten") ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{r.slaLabel}</span>
                      </td>
                      <td className="py-3 text-xs text-slate-600">{r.etapa}</td>
                      <td className="py-3 font-bold">{fmt(r.score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        {/* Origem do Lead */}
        {Object.keys(origemLeadData).length > 0 && (() => {
          const origemEntries = Object.entries(origemLeadData).sort((a, b) => b[1] - a[1])
          const origemTotal = origemEntries.reduce((s, [, v]) => s + v, 0)
          const origemColors = ["from-orange-500 to-orange-300", "from-blue-500 to-blue-300", "from-violet-500 to-violet-300", "from-emerald-500 to-emerald-300", "from-amber-500 to-amber-300", "from-rose-500 to-rose-300", "from-cyan-500 to-cyan-300", "from-pink-500 to-pink-300", "from-teal-500 to-teal-300", "from-indigo-500 to-indigo-300"]
          return (
            <section>
              <article className="rounded-3xl border bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Origem do lead</h2>
                    <p className="text-xs text-slate-500">Canal de captação dos precatórios cadastrados.</p>
                  </div>
                  <span className="rounded-full border px-2 py-1 text-xs font-semibold">{fmt(origemTotal)} com origem</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {origemEntries.map(([label, value], i) => (
                    <div key={label} className="grid items-center gap-2 text-sm md:grid-cols-[160px_1fr_48px]">
                      <div className="truncate font-medium">{label}</div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className={`h-2 rounded-full bg-gradient-to-r ${origemColors[i % origemColors.length]}`} style={{ width: `${(value / origemTotal) * 100}%` }} />
                      </div>
                      <div className="text-right font-bold">{fmt(value)}</div>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )
        })()}
      </>)}

      {/* ===== DETALHES ===== */}
      {view === "details" && (<>
        {/* Financeiro detalhado + Radar */}
        <section className="grid gap-4 xl:grid-cols-[1.3fr_.9fr]">
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Financeiro detalhado</h2>
                <p className="text-xs text-slate-500">Todas as deduções e composição do saldo líquido.</p>
              </div>
              <span className="rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap">Saldo {compact(kpis.resumo.total_saldo_liquido)}</span>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { l: "Valor principal", v: kpis.resumo.total_principal, color: "from-slate-500 to-slate-300", desc: "Nominal dos precatórios" },
                { l: "Valor atualizado", v: kpis.resumo.total_atualizado, color: "from-orange-500 to-orange-300", desc: "Com correção monetária" },
                { l: "PSS total", v: kpis.financeiro.pss_total, color: "from-blue-500 to-blue-300", desc: "Previdência dos servidores" },
                { l: "Honorários", v: kpis.financeiro.honorarios_total, color: "from-violet-500 to-violet-300", desc: "Honorários contratuais" },
                { l: "IRPF retido", v: kpis.financeiro.irpf_total, color: "from-rose-500 to-rose-300", desc: "Imposto de renda" },
                { l: "Adiantamento", v: kpis.financeiro.adiantamento_total, color: "from-amber-500 to-amber-300", desc: "Valores adiantados" },
              ].filter((r) => r.v > 0).map((r) => {
                const max = Math.max(kpis.resumo.total_atualizado, 1)
                return (
                  <div key={r.l} className="rounded-2xl border bg-white p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div><strong>{r.l}</strong><span className="ml-2 text-xs text-slate-400">{r.desc}</span></div>
                      <strong>{compact(r.v)}</strong>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full bg-gradient-to-r ${r.color}`} style={{ width: `${Math.min(100, (r.v / max) * 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <h2 className="font-semibold">Documentos e certidões</h2>
            <p className="text-xs text-slate-500">Recebimento e pendências de documentação do portfólio.</p>
            <div className="mt-4 space-y-3">
              {[
                { l: "Documentos recebidos", v: docs, f: `${fmt(kpis.documentos_certidoes.docs_recebidos)} de ${fmt(kpis.documentos_certidoes.total_docs)}`, color: "from-blue-500 to-blue-300" },
                { l: "Certidões recebidas", v: cert, f: `${fmt(kpis.documentos_certidoes.certidoes_recebidas)} de ${fmt(kpis.documentos_certidoes.total_certidoes)}`, color: "from-orange-500 to-orange-300" },
                { l: "Certidões vencidas", v: kpis.documentos_certidoes.total_certidoes ? (kpis.documentos_certidoes.certidoes_vencidas / kpis.documentos_certidoes.total_certidoes) * 100 : 0, f: `${fmt(kpis.documentos_certidoes.certidoes_vencidas)} vencidas`, color: "from-rose-500 to-rose-300" },
              ].map((p) => (
                <div key={p.l} className="rounded-2xl border bg-white p-3">
                  <div className="flex justify-between text-sm"><strong>{p.l}</strong><strong>{p.f}</strong></div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${p.color}`} style={{ width: `${Math.max(0, Math.min(100, p.v))}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h3 className="font-semibold">Propostas por status</h3>
              <p className="text-xs text-slate-500">Distribuição das propostas no fluxo de negociação.</p>
              <div className="mt-3 space-y-3">
                {[
                  { key: "proposta_aceita", label: "Aceitas pelo cliente", color: "from-emerald-500 to-emerald-300" },
                  { key: "proposta_negociacao", label: "Em negociação", color: "from-blue-500 to-blue-300" },
                  { key: "proposta_calculada", label: "Calculadas / aguardando envio", color: "from-orange-500 to-orange-300" },
                ].map((s) => {
                  const n = Number(kpis.propostas.por_status?.[s.key] || 0)
                  const totalProp = Object.values(kpis.propostas.por_status || {}).reduce((a, b) => a + Number(b), 0)
                  const p = totalProp > 0 ? (n / totalProp) * 100 : 0
                  return (
                    <div key={s.key} className="rounded-2xl border bg-white p-3">
                      <div className="flex justify-between text-sm"><strong>{s.label}</strong><strong>{fmt(n)}</strong></div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div className={`h-2 rounded-full bg-gradient-to-r ${s.color}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </article>
        </section>

        {/* Kanban: valor + quantidade */}
        <section className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Valor por status (kanban)</h2>
                <p className="text-xs text-slate-500">Distribuição financeira por etapa do fluxo.</p>
              </div>
              <span className="rounded-full border px-2 py-1 text-xs font-semibold">Top 6</span>
            </div>
            <div className="mt-4 space-y-3">
              {valueRows.map((r, i) => (
                <div key={r.label} className="grid items-center gap-2 text-sm md:grid-cols-[220px_1fr_96px]">
                  <div className="truncate">{r.label}</div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${tone(i)}`} style={{ width: `${(r.value / maxValue) * 100}%` }} />
                  </div>
                  <div className="text-right font-bold">{compact(r.value)}</div>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Quantidade por status (kanban)</h2>
                <p className="text-xs text-slate-500">Distribuição de precatórios por etapa do fluxo.</p>
              </div>
              <span className="rounded-full border px-2 py-1 text-xs font-semibold">Top 5</span>
            </div>
            <div className="mt-4 space-y-3">
              {qtdRows.map((r, i) => (
                <div key={r.label} className="grid items-center gap-2 text-sm md:grid-cols-[220px_1fr_96px]">
                  <div className="truncate">{r.label}</div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${tone(i)}`} style={{ width: `${(r.value / maxQtd) * 100}%` }} />
                  </div>
                  <div className="text-right font-bold">{fmt(r.value)}</div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Pipeline de cálculo — largura total */}
        <section>
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Pipeline de cálculo</h2>
                <p className="text-xs text-slate-500">Status detalhado de todos os cálculos no portfólio.</p>
              </div>
              <span className="rounded-full border px-2 py-1 text-xs font-semibold">{fmt(calcTotal)} total</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { l: "Concluídos", v: calcPctConcluido, n: kpis.calculo.concluido, color: "from-emerald-500 to-emerald-300", bg: "bg-emerald-50 border-emerald-200" },
                { l: "Em cálculo", v: calcTotal > 0 ? (kpis.calculo.em_calculo / calcTotal) * 100 : 0, n: kpis.calculo.em_calculo, color: "from-blue-500 to-blue-300", bg: "bg-blue-50 border-blue-200" },
                { l: "Prontos para cálculo", v: calcTotal > 0 ? (kpis.calculo.pronto_calculo / calcTotal) * 100 : 0, n: kpis.calculo.pronto_calculo, color: "from-orange-500 to-orange-300", bg: "bg-orange-50 border-orange-200" },
                { l: "Desatualizados", v: calcTotal > 0 ? (kpis.calculo.desatualizado / calcTotal) * 100 : 0, n: kpis.calculo.desatualizado, color: "from-rose-500 to-rose-300", bg: "bg-rose-50 border-rose-200" },
              ].map((p) => (
                <div key={p.l} className={`rounded-2xl border p-4 ${p.bg}`}>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{p.l}</div>
                  <div className="mt-1 text-3xl font-extrabold">{fmt(p.n)}</div>
                  <div className="mt-2 h-2 rounded-full bg-white/60">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${p.color}`} style={{ width: `${Math.max(0, Math.min(100, p.v))}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{pct(p.v)} do total</div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </>)}

      {/* ===== OPERAÇÃO ===== */}
      {view === "operation" && (<>
        {/* Alertas críticos — cards coloridos grandes */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className={`rounded-3xl border p-5 ${kpis.sla.atrasado > 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">SLA Atrasado</div>
            <div className={`mt-2 text-4xl font-extrabold ${kpis.sla.atrasado > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmt(kpis.sla.atrasado)}</div>
            <div className="mt-1 text-xs text-slate-600">{kpis.sla.atrasado > 0 ? "Prazos estourados — ação imediata" : "Nenhum atrasado"}</div>
          </article>
          <article className={`rounded-3xl border p-5 ${kpis.sla.atencao > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Em Atenção</div>
            <div className={`mt-2 text-4xl font-extrabold ${kpis.sla.atencao > 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(kpis.sla.atencao)}</div>
            <div className="mt-1 text-xs text-slate-600">{kpis.sla.atencao > 0 ? "Prazos sob monitoramento" : "Nenhum em atenção"}</div>
          </article>
          <article className={`rounded-3xl border p-5 ${kpis.chat.mensagens_nao_lidas > 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Chats Pendentes</div>
            <div className={`mt-2 text-4xl font-extrabold ${kpis.chat.mensagens_nao_lidas > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmt(kpis.chat.mensagens_nao_lidas)}</div>
            <div className="mt-1 text-xs text-slate-600">{kpis.chat.mensagens_nao_lidas > 0 ? "Mensagens sem resposta" : "Sem chats pendentes"}</div>
          </article>
          <article className={`rounded-3xl border p-5 ${kpis.calculo.desatualizado > 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Cálculos Desatualizados</div>
            <div className={`mt-2 text-4xl font-extrabold ${kpis.calculo.desatualizado > 0 ? "text-rose-600" : "text-emerald-600"}`}>{fmt(kpis.calculo.desatualizado)}</div>
            <div className="mt-1 text-xs text-slate-600">{kpis.calculo.desatualizado > 0 ? "Recalcular imediatamente" : "Todos atualizados"}</div>
          </article>
        </section>

        {/* SLA breakdown + Gargalos */}
        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-3xl border bg-white p-5">
            <h2 className="font-semibold">SLA detalhado</h2>
            <p className="text-xs text-slate-500">Situação de prazo de todos os precatórios.</p>
            <div className="mt-4 space-y-3">
              {[
                { l: "No prazo", n: kpis.sla.no_prazo, color: "from-emerald-500 to-emerald-300", badge: "bg-emerald-100 text-emerald-700" },
                { l: "Atenção", n: kpis.sla.atencao, color: "from-amber-500 to-amber-300", badge: "bg-amber-100 text-amber-700" },
                { l: "Atrasado", n: kpis.sla.atrasado, color: "from-rose-500 to-rose-300", badge: "bg-rose-100 text-rose-700" },
                { l: "Não iniciado", n: kpis.sla.nao_iniciado, color: "from-slate-400 to-slate-200", badge: "bg-slate-100 text-slate-600" },
                { l: "Concluído", n: kpis.sla.concluido, color: "from-blue-500 to-blue-300", badge: "bg-blue-100 text-blue-700" },
              ].map((s) => {
                const pv = slaBase > 0 ? (s.n / slaBase) * 100 : 0
                return (
                  <div key={s.l} className="grid items-center gap-2 text-sm md:grid-cols-[160px_1fr_80px]">
                    <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${s.badge}`}>{s.l}</span>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full bg-gradient-to-r ${s.color}`} style={{ width: `${pv}%` }} />
                    </div>
                    <div className="text-right font-bold">{fmt(s.n)}</div>
                  </div>
                )
              })}
            </div>
          </article>
          <article className="rounded-3xl border bg-white p-5">
            <h2 className="font-semibold">Gargalos operacionais</h2>
            <p className="text-xs text-slate-500">Itens que travam o fluxo e exigem ação imediata.</p>
            <div className="mt-4 space-y-3">
              <div className={`rounded-2xl border p-3 ${kpis.oficios.analise_processual_inicial > 0 ? "border-amber-200 bg-amber-50" : ""}`}>
                <div className="flex items-center justify-between">
                  <strong>Ofícios pendentes</strong>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">{fmt(kpis.oficios.analise_processual_inicial)} itens</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{kpis.oficios.com_oficio > 0 ? `${fmt(kpis.oficios.com_oficio)} já com ofício emitido.` : "Nenhum ofício emitido ainda."}</p>
              </div>
              <div className={`rounded-2xl border p-3 ${kpis.calculo.pronto_calculo > 0 ? "border-blue-200 bg-blue-50" : ""}`}>
                <div className="flex items-center justify-between">
                  <strong>Prontos para cálculo</strong>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{fmt(kpis.calculo.pronto_calculo)} itens</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{kpis.calculo.em_calculo > 0 ? `${fmt(kpis.calculo.em_calculo)} em cálculo agora.` : "Nenhum em cálculo no momento."}</p>
              </div>
              {kpis.calculo.desatualizado > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-center justify-between">
                    <strong>Cálculos desatualizados</strong>
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">{fmt(kpis.calculo.desatualizado)} itens</span>
                  </div>
                  <p className="mt-1 text-xs text-rose-600">Recalcular para garantir correção monetária.</p>
                </div>
              )}
              {kpis.documentos_certidoes.certidoes_vencidas > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-center justify-between">
                    <strong>Certidões vencidas</strong>
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">{fmt(kpis.documentos_certidoes.certidoes_vencidas)} vencidas</span>
                  </div>
                  <p className="mt-1 text-xs text-rose-600">Renovar imediatamente para não bloquear o fluxo.</p>
                </div>
              )}
            </div>
          </article>
        </section>

        {/* Precatórios críticos — largura total */}
        <section>
          <article className="rounded-3xl border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Precatórios críticos</h2>
                <p className="text-xs text-slate-500">SLA estourado, risco alto e score de criticidade — priorize estes itens.</p>
              </div>
              <button className="rounded-xl border px-3 py-2 text-xs font-semibold" onClick={onRefresh}>Atualizar</button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="border-b py-2">Precatório</th>
                    <th className="border-b py-2">Responsável</th>
                    <th className="border-b py-2">Etapa</th>
                    <th className="border-b py-2">SLA</th>
                    <th className="border-b py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {critical.length === 0 ? (
                    <tr><td colSpan={5} className="py-6 text-center text-xs text-slate-400">Nenhum precatório crítico encontrado.</td></tr>
                  ) : critical.map((r: CriticalRow) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="max-w-[200px] truncate py-3 font-medium">{r.nome}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-200 to-orange-200 text-xs font-bold">{initials(r.responsavel)}</div>
                          <div className="truncate">{r.responsavel}</div>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-slate-600">{r.etapa}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${r.slaLabel.toLowerCase().includes("atras") ? "bg-rose-100 text-rose-700" : r.slaLabel.toLowerCase().includes("aten") ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{r.slaLabel}</span>
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-extrabold ${r.score >= 80 ? "bg-rose-100 text-rose-700" : r.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{fmt(r.score)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </>)}

      {/* Rodapé */}
      <div className="rounded-2xl border border-dashed bg-white/80 p-4 text-xs text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong>{fmt(kpis.resumo.total_precatorios)}</strong> precatórios ·{" "}
            <strong>{fmt(kpis.credores.total_credores)}</strong> credores ·{" "}
            <strong>{compact(kpis.resumo.total_saldo_liquido)}</strong> saldo líquido ·{" "}
            <strong>SLA {pct(slaHealthy)}</strong> saudável
          </span>
          {lastUpdated ? (
            <span className="text-slate-400">Atualizado em {new Date(lastUpdated).toLocaleString("pt-BR")}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}