"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, SlidersHorizontal, X } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { FiltrosPrecatorios } from "@/lib/types/filtros"
import {
  COMPLEXIDADE_OPTIONS,
  DISTRIBUICAO_OPTIONS,
  IMPACTO_OPTIONS,
  SLA_OPTIONS,
  TIPO_ATRASO_OPTIONS,
} from "@/lib/types/filtros"

// ─── Props ───────────────────────────────────────────────────────────────────

interface AdvancedFiltersProps {
  filtros: FiltrosPrecatorios
  onFilterChange: (filtros: FiltrosPrecatorios) => void
  onClearFilters: () => void
  totalFiltrosAtivos: number
  responsaveis?: { id: string; nome: string }[]
  showResponsavelFilter?: boolean
  showDistribuicaoFilter?: boolean
}

type ComplexidadeValue = NonNullable<FiltrosPrecatorios["complexidade"]>[number]
type SlaValue         = NonNullable<FiltrosPrecatorios["sla_status"]>[number]
type TipoAtrasoValue  = NonNullable<FiltrosPrecatorios["tipo_atraso"]>[number]
type ImpactoAtrasoValue = NonNullable<FiltrosPrecatorios["impacto_atraso"]>[number]

// ─── Status do Kanban agrupados ───────────────────────────────────────────────

const STATUS_GROUPS = [
  {
    label: "Entrada",
    dot: "#3b82f6",
    items: [
      { value: "entrada",           label: "Entrada / Pré-cadastro",  active: "bg-blue-50   border-blue-400   text-blue-800   dark:bg-blue-950/60  dark:border-blue-500  dark:text-blue-200",  inactive: "border-blue-200/60   text-blue-600/70   dark:border-blue-800/50  dark:text-blue-400/60"  },
      { value: "triagem_interesse", label: "Triagem (interesse)",     active: "bg-indigo-50 border-indigo-400 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-500 dark:text-indigo-200", inactive: "border-indigo-200/60 text-indigo-600/70 dark:border-indigo-800/50 dark:text-indigo-400/60" },
    ],
  },
  {
    label: "Análise",
    dot: "#06b6d4",
    items: [
      { value: "analise_processual_inicial", label: "Pré Análise Jurídica", active: "bg-cyan-50  border-cyan-400  text-cyan-800  dark:bg-cyan-950/60  dark:border-cyan-500  dark:text-cyan-200",  inactive: "border-cyan-200/60  text-cyan-600/70  dark:border-cyan-800/50  dark:text-cyan-400/60"  },
      { value: "juridico",                  label: "Jurídico",              active: "bg-rose-50  border-rose-400  text-rose-800  dark:bg-rose-950/60  dark:border-rose-500  dark:text-rose-200",  inactive: "border-rose-200/60  text-rose-600/70  dark:border-rose-800/50  dark:text-rose-400/60"  },
    ],
  },
  {
    label: "Cálculo",
    dot: "#f97316",
    items: [
      { value: "pronto_calculo",   label: "Pronto para cálculo",   active: "bg-orange-50 border-orange-400 text-orange-800 dark:bg-orange-950/60 dark:border-orange-500 dark:text-orange-200", inactive: "border-orange-200/60 text-orange-600/70 dark:border-orange-800/50 dark:text-orange-400/60" },
      { value: "calculo_andamento", label: "Cálculo em andamento", active: "bg-amber-50  border-amber-400  text-amber-800  dark:bg-amber-950/60  dark:border-amber-500  dark:text-amber-200",  inactive: "border-amber-200/60  text-amber-600/70  dark:border-amber-800/50  dark:text-amber-400/60"  },
      { value: "calculo_concluido", label: "Cálculo concluído",    active: "bg-green-50  border-green-400  text-green-800  dark:bg-green-950/60  dark:border-green-500  dark:text-green-200",  inactive: "border-green-200/60  text-green-600/70  dark:border-green-800/50  dark:text-green-400/60"  },
    ],
  },
  {
    label: "Negociação",
    dot: "#eab308",
    items: [
      { value: "proposta_negociacao", label: "Proposta / Negociação",    active: "bg-yellow-50  border-yellow-400  text-yellow-800  dark:bg-yellow-950/60  dark:border-yellow-500  dark:text-yellow-200",  inactive: "border-yellow-200/60  text-yellow-600/70  dark:border-yellow-800/50  dark:text-yellow-400/60"  },
      { value: "proposta_aceita",     label: "Jurídico de fechamento",   active: "bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-500 dark:text-emerald-200", inactive: "border-emerald-200/60 text-emerald-600/70 dark:border-emerald-800/50 dark:text-emerald-400/60" },
    ],
  },
  {
    label: "Fechamento",
    dot: "#a855f7",
    items: [
      { value: "certidoes", label: "Certidões",   active: "bg-purple-50  border-purple-400  text-purple-800  dark:bg-purple-950/60  dark:border-purple-500  dark:text-purple-200",  inactive: "border-purple-200/60  text-purple-600/70  dark:border-purple-800/50  dark:text-purple-400/60"  },
      { value: "escrituras", label: "Escrituras", active: "bg-fuchsia-50 border-fuchsia-400 text-fuchsia-800 dark:bg-fuchsia-950/60 dark:border-fuchsia-500 dark:text-fuchsia-200", inactive: "border-fuchsia-200/60 text-fuchsia-600/70 dark:border-fuchsia-800/50 dark:text-fuchsia-400/60" },
      { value: "fechado",   label: "Fechado",     active: "bg-zinc-100   border-zinc-500    text-zinc-800    dark:bg-zinc-800/60    dark:border-zinc-500   dark:text-zinc-200",     inactive: "border-zinc-300/60    text-zinc-500/70    dark:border-zinc-700/50   dark:text-zinc-500/60"    },
    ],
  },
  {
    label: "Encerrados",
    dot: "#64748b",
    items: [
      { value: "encerrados", label: "Pausados",                  active: "bg-slate-100 border-slate-400 text-slate-700 dark:bg-slate-800/60 dark:border-slate-500 dark:text-slate-300", inactive: "border-slate-300/60 text-slate-500/70 dark:border-slate-700/50 dark:text-slate-500/60" },
      { value: "reprovado",  label: "Reprovado / não elegível",  active: "bg-zinc-100  border-zinc-400  text-zinc-700  dark:bg-zinc-800/60  dark:border-zinc-500  dark:text-zinc-300",  inactive: "border-zinc-300/60  text-zinc-500/70  dark:border-zinc-700/50  dark:text-zinc-500/60"  },
    ],
  },
]

// ─── Paletas semânticas ───────────────────────────────────────────────────────

const COMPLEXIDADE_STYLE: Record<string, { active: string; inactive: string; dot: string }> = {
  baixa: { dot: "#22c55e", active: "bg-green-50   border-green-500   text-green-800   dark:bg-green-950/60  dark:border-green-500  dark:text-green-200",  inactive: "border-green-200/50  text-green-600/60  dark:border-green-800/40  dark:text-green-500/50"  },
  media: { dot: "#eab308", active: "bg-yellow-50  border-yellow-500  text-yellow-800  dark:bg-yellow-950/60 dark:border-yellow-500 dark:text-yellow-200", inactive: "border-yellow-200/50 text-yellow-600/60 dark:border-yellow-800/40 dark:text-yellow-500/50" },
  alta:  { dot: "#ef4444", active: "bg-red-50     border-red-500     text-red-800     dark:bg-red-950/60    dark:border-red-500    dark:text-red-200",    inactive: "border-red-200/50    text-red-600/60    dark:border-red-800/40    dark:text-red-500/50"    },
}

const SLA_STYLE: Record<string, { active: string; inactive: string }> = {
  nao_iniciado: { active: "bg-zinc-100   border-zinc-500   text-zinc-800   dark:bg-zinc-800/60  dark:border-zinc-500  dark:text-zinc-200",  inactive: "border-zinc-300/50  text-zinc-500/60  dark:border-zinc-700/40  dark:text-zinc-500/50"  },
  no_prazo:     { active: "bg-green-50   border-green-500  text-green-800  dark:bg-green-950/60 dark:border-green-500 dark:text-green-200", inactive: "border-green-200/50 text-green-600/60 dark:border-green-800/40 dark:text-green-500/50" },
  atencao:      { active: "bg-yellow-50  border-yellow-500 text-yellow-800 dark:bg-yellow-950/60 dark:border-yellow-500 dark:text-yellow-200", inactive: "border-yellow-200/50 text-yellow-600/60 dark:border-yellow-800/40 dark:text-yellow-500/50" },
  atrasado:     { active: "bg-red-50     border-red-500    text-red-800    dark:bg-red-950/60   dark:border-red-500   dark:text-red-200",   inactive: "border-red-200/50   text-red-600/60   dark:border-red-800/40   dark:text-red-500/50"   },
  concluido:    { active: "bg-blue-50    border-blue-500   text-blue-800   dark:bg-blue-950/60  dark:border-blue-500  dark:text-blue-200",  inactive: "border-blue-200/50  text-blue-600/60  dark:border-blue-800/40  dark:text-blue-500/50"  },
}

const IMPACTO_STYLE: Record<string, { active: string; inactive: string }> = {
  baixo: { active: "bg-green-50  border-green-500  text-green-800  dark:bg-green-950/60  dark:border-green-500  dark:text-green-200",  inactive: "border-green-200/50  text-green-600/60  dark:border-green-800/40  dark:text-green-500/50"  },
  medio: { active: "bg-yellow-50 border-yellow-500 text-yellow-800 dark:bg-yellow-950/60 dark:border-yellow-500 dark:text-yellow-200", inactive: "border-yellow-200/50 text-yellow-600/60 dark:border-yellow-800/40 dark:text-yellow-500/50" },
  alto:  { active: "bg-red-50    border-red-500    text-red-800    dark:bg-red-950/60    dark:border-red-500    dark:text-red-200",    inactive: "border-red-200/50    text-red-600/60    dark:border-red-800/40    dark:text-red-500/50"    },
}

// ─── Primitivos de UI ─────────────────────────────────────────────────────────

/** Cabeçalho de seção com número, título e linha */
function SectionHeader({ index, title, count }: { index: number; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground tabular-nums">
        {index}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </span>
      {count !== undefined && count > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-border/40" />
    </div>
  )
}

/** Chip clicável com estado ativo/inativo */
function StatusChip({
  label,
  active,
  activeClass,
  inactiveClass,
  onClick,
}: {
  label: string
  active: boolean
  activeClass: string
  inactiveClass: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1
        text-[11.5px] font-medium leading-none transition-all duration-100
        cursor-pointer select-none
        ${active ? `${activeClass} shadow-sm` : `bg-transparent ${inactiveClass} hover:opacity-90`}
      `}
    >
      {active && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" className="shrink-0">
          <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {label}
    </button>
  )
}

/** Pill semântico (complexidade / SLA / impacto) */
function SemanticPill({
  label,
  active,
  dot,
  activeClass,
  inactiveClass,
  onClick,
}: {
  label: string
  active: boolean
  dot?: string
  activeClass: string
  inactiveClass: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 rounded-full border px-3 py-1.5
        text-[12px] font-semibold leading-none transition-all duration-100
        cursor-pointer select-none flex-1 justify-center
        ${active ? `${activeClass} shadow-sm` : `bg-transparent ${inactiveClass} hover:opacity-90`}
      `}
    >
      {dot && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: active ? "currentColor" : dot, opacity: active ? 1 : 0.5 }}
        />
      )}
      {label}
    </button>
  )
}

/** Toggle switch estilo premium */
function ToggleFlag({
  label,
  sublabel,
  checked,
  onToggle,
  accentColor: _accentColor = "primary",
}: {
  label: string
  sublabel?: string
  checked: boolean
  onToggle: () => void
  accentColor?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        group flex w-full items-center justify-between gap-3
        rounded-lg border px-3.5 py-3 text-left
        transition-all duration-100 cursor-pointer
        ${checked
          ? "border-primary/30 bg-primary/8 dark:bg-primary/10"
          : "border-border/50 bg-transparent hover:border-border hover:bg-muted/30"
        }
      `}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-medium leading-tight ${checked ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </p>
        {sublabel && (
          <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground/60">{sublabel}</p>
        )}
      </div>
      {/* Switch track */}
      <div className={`relative h-[18px] w-[32px] shrink-0 rounded-full transition-colors duration-150 ${checked ? "bg-primary" : "bg-muted-foreground/25"}`}>
        <div className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-150 ${checked ? "translate-x-[14px]" : "translate-x-[2px]"}`} />
      </div>
    </button>
  )
}

/** Par de inputs de valor (min / max) */
function ValueRange({
  label,
  minId,
  maxId,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string
  minId: string
  maxId: string
  minValue: number | undefined
  maxValue: number | undefined
  onMinChange: (v: number | undefined) => void
  onMaxChange: (v: number | undefined) => void
}) {
  const hasValue = minValue !== undefined || maxValue !== undefined
  return (
    <div className={`rounded-lg border p-3 transition-colors ${hasValue ? "border-primary/25 bg-primary/5" : "border-border/40 bg-muted/10"}`}>
      <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${hasValue ? "text-primary" : "text-muted-foreground/70"}`}>
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[10px] text-muted-foreground/60">Mínimo</p>
          <CurrencyInput id={minId} placeholder="R$ 0" value={minValue} onValueChange={onMinChange} />
        </div>
        <div>
          <p className="mb-1 text-[10px] text-muted-foreground/60">Máximo</p>
          <CurrencyInput id={maxId} placeholder="Sem limite" value={maxValue} onValueChange={onMaxChange} />
        </div>
      </div>
    </div>
  )
}

/** Par de inputs de data */
function DateRange({
  label,
  startId,
  endId,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
}: {
  label: string
  startId: string
  endId: string
  startValue: string | undefined
  endValue: string | undefined
  onStartChange: (v: string | undefined) => void
  onEndChange: (v: string | undefined) => void
}) {
  const hasValue = !!startValue || !!endValue
  return (
    <div className={`rounded-lg border p-3 transition-colors ${hasValue ? "border-primary/25 bg-primary/5" : "border-border/40 bg-muted/10"}`}>
      <p className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${hasValue ? "text-primary" : "text-muted-foreground/70"}`}>
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[10px] text-muted-foreground/60">De</p>
          <Input
            id={startId}
            type="date"
            value={startValue || ""}
            onChange={(e) => onStartChange(e.target.value || undefined)}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <p className="mb-1 text-[10px] text-muted-foreground/60">Até</p>
          <Input
            id={endId}
            type="date"
            value={endValue || ""}
            onChange={(e) => onEndChange(e.target.value || undefined)}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdvancedFilters({
  filtros,
  onFilterChange,
  onClearFilters,
  totalFiltrosAtivos,
  responsaveis = [],
  showResponsavelFilter = false,
  showDistribuicaoFilter = true,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState<FiltrosPrecatorios>(filtros)
  const [responsavelTerm, setResponsavelTerm] = useState("")

  useEffect(() => { setLocal(filtros) }, [filtros])

  const responsaveisFiltrados = useMemo(() => {
    const t = responsavelTerm.trim().toLowerCase()
    return t ? responsaveis.filter((r) => r.nome.toLowerCase().includes(t)) : responsaveis
  }, [responsaveis, responsavelTerm])

  const apply = () => { onFilterChange(local); setOpen(false) }
  const clear  = () => { setLocal({}); setResponsavelTerm(""); onClearFilters(); setOpen(false) }

  const toggleArr = <T extends string>(key: keyof FiltrosPrecatorios, value: T) => {
    const cur = (local[key] as T[]) || []
    const next = cur.includes(value) ? cur.filter((i) => i !== value) : [...cur, value]
    setLocal({ ...local, [key]: next.length ? next : undefined })
  }

  const setFlag = (key: keyof FiltrosPrecatorios, val: boolean) =>
    setLocal({ ...local, [key]: val ? true : undefined })

  // contadores por seção para badge dinâmico
  const countStatus      = local.status?.length ?? 0
  const countPrioridade  = (local.complexidade?.length ?? 0) + (local.sla_status?.length ?? 0)
  const countAtrasos     = (local.tipo_atraso?.length ?? 0) + (local.impacto_atraso?.length ?? 0)
  const countValores     = [local.valor_min, local.valor_max, local.valor_atualizado_min, local.valor_atualizado_max, local.valor_sem_atualizacao_min, local.valor_sem_atualizacao_max].filter(Boolean).length
  const countDatas       = [local.data_criacao_inicio, local.data_criacao_fim, local.data_entrada_calculo_inicio, local.data_entrada_calculo_fim].filter(Boolean).length
  const countFlags       = [local.urgente, local.titular_falecido, local.valor_calculado, local.calculo_em_andamento, local.calculo_finalizado].filter(Boolean).length
  const countGeral       = (local.distribuicao ? 1 : 0) + (local.responsavel_id ? 1 : 0) + (local.tribunal ? 1 : 0)

  // contagem total no estado local (para badge do "Aplicar")
  const localCount = Object.entries(local).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)).length

  // índice de seções visíveis
  let sectionIndex = 0
  const nextIndex = () => { sectionIndex += 1; return sectionIndex }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="relative h-10 gap-2 rounded-xl border-border bg-background text-sm text-muted-foreground shadow-sm transition hover:bg-muted"
        >
          <SlidersHorizontal className="h-[15px] w-[15px]" />
          <span>Filtros</span>
          {totalFiltrosAtivos > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {totalFiltrosAtivos}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        className="flex w-full flex-col p-0 sm:max-w-[480px] border-l border-border bg-background overflow-hidden"
        style={{ fontFamily: "inherit" }}
      >
        <SheetTitle className="sr-only">Filtros avançados</SheetTitle>
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-border/60 bg-muted/20 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background">
                <SlidersHorizontal className="h-[15px] w-[15px] text-muted-foreground" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">Filtros avançados</p>
                <p className="text-[11px] text-muted-foreground/70 leading-tight">
                  {totalFiltrosAtivos === 0 ? "Nenhum filtro ativo" : `${totalFiltrosAtivos} filtro${totalFiltrosAtivos > 1 ? "s" : ""} ativo${totalFiltrosAtivos > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            {totalFiltrosAtivos > 0 && (
              <button
                type="button"
                onClick={clear}
                className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/8 hover:text-destructive"
              >
                <X className="h-3 w-3" />
                Limpar tudo
              </button>
            )}
          </div>
        </div>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-0 divide-y divide-border/30">

            {/* ── 1. VISÃO GERAL ─────────────────────────────────────────── */}
            {(showDistribuicaoFilter || (showResponsavelFilter && responsaveis.length > 0)) && (
              <div className="px-5 py-5">
                <SectionHeader index={nextIndex()} title="Visão geral" count={countGeral} />
                <div className="space-y-4">

                  {showDistribuicaoFilter && (
                    <div>
                      <p className="mb-2 text-[11px] font-medium text-muted-foreground/80">Distribuição</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[{ value: undefined as undefined, label: "Todos" }, ...DISTRIBUICAO_OPTIONS].map((opt) => {
                          const active = local.distribuicao === opt.value
                          return (
                            <button
                              key={String(opt.value ?? "todos")}
                              type="button"
                              onClick={() => setLocal({ ...local, distribuicao: opt.value })}
                              className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
                                active
                                  ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                                  : "border-border/50 bg-transparent text-muted-foreground hover:border-border hover:text-foreground"
                              }`}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {showResponsavelFilter && responsaveis.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-medium text-muted-foreground/80">Responsável</p>
                        {local.responsavel_id && (
                          <button type="button" onClick={() => setLocal({ ...local, responsavel_id: undefined })} className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground">
                            limpar
                          </button>
                        )}
                      </div>
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground/50" />
                        <Input value={responsavelTerm} onChange={(e) => setResponsavelTerm(e.target.value)} placeholder="Buscar responsável" className="h-8 pl-8 text-xs" />
                      </div>
                      <div className="max-h-32 overflow-auto rounded-lg border border-border/40 bg-muted/10">
                        {responsaveisFiltrados.length === 0 ? (
                          <p className="px-3 py-2 text-[11px] text-muted-foreground/60">Nenhum encontrado.</p>
                        ) : (
                          responsaveisFiltrados.map((r) => {
                            const active = local.responsavel_id === r.id
                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => setLocal({ ...local, responsavel_id: active ? undefined : r.id })}
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] transition first:rounded-t-lg last:rounded-b-lg ${active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
                              >
                                <span className="truncate">{r.nome}</span>
                                {active && <span className="ml-2 shrink-0 text-[9px] font-bold uppercase tracking-widest text-primary">ativo</span>}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-[11px] font-medium text-muted-foreground/80">Tribunal</p>
                    <Input
                      value={local.tribunal || ""}
                      onChange={(e) => setLocal({ ...local, tribunal: e.target.value || undefined })}
                      placeholder="Ex: TJSP, TRF1, TRF3"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── 2. STATUS ──────────────────────────────────────────────── */}
            <div className="px-5 py-5">
              <SectionHeader index={nextIndex()} title="Status do processo" count={countStatus} />
              <div className="space-y-3">
                {STATUS_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: group.dot }} />
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">{group.label}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => {
                        const active = local.status?.includes(item.value) ?? false
                        return (
                          <StatusChip
                            key={item.value}
                            label={item.label}
                            active={active}
                            activeClass={item.active}
                            inactiveClass={item.inactive}
                            onClick={() => toggleArr("status", item.value)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3. PRIORIDADE ──────────────────────────────────────────── */}
            <div className="px-5 py-5">
              <SectionHeader index={nextIndex()} title="Prioridade" count={countPrioridade} />
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground/80">Complexidade</p>
                  <div className="flex gap-2">
                    {COMPLEXIDADE_OPTIONS.map((opt) => {
                      const s = COMPLEXIDADE_STYLE[opt.value]
                      const active = local.complexidade?.includes(opt.value as ComplexidadeValue) ?? false
                      return (
                        <SemanticPill
                          key={opt.value}
                          label={opt.label}
                          active={active}
                          dot={s.dot}
                          activeClass={s.active}
                          inactiveClass={s.inactive}
                          onClick={() => toggleArr("complexidade", opt.value as ComplexidadeValue)}
                        />
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground/80">SLA</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SLA_OPTIONS.map((opt) => {
                      const s = SLA_STYLE[opt.value]
                      const active = local.sla_status?.includes(opt.value as SlaValue) ?? false
                      return (
                        <StatusChip
                          key={opt.value}
                          label={opt.label}
                          active={active}
                          activeClass={s.active}
                          inactiveClass={s.inactive}
                          onClick={() => toggleArr("sla_status", opt.value as SlaValue)}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4. ATRASOS ─────────────────────────────────────────────── */}
            <div className="px-5 py-5">
              <SectionHeader index={nextIndex()} title="Atrasos" count={countAtrasos} />
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground/80">Tipo de atraso</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TIPO_ATRASO_OPTIONS.map((opt) => {
                      const active = local.tipo_atraso?.includes(opt.value as TipoAtrasoValue) ?? false
                      return (
                        <StatusChip
                          key={opt.value}
                          label={opt.label}
                          active={active}
                          activeClass="bg-orange-50 border-orange-400 text-orange-800 dark:bg-orange-950/60 dark:border-orange-500 dark:text-orange-200"
                          inactiveClass="border-orange-200/50 text-orange-600/60 dark:border-orange-800/40 dark:text-orange-500/50"
                          onClick={() => toggleArr("tipo_atraso", opt.value as TipoAtrasoValue)}
                        />
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground/80">Impacto do atraso</p>
                  <div className="flex gap-2">
                    {IMPACTO_OPTIONS.map((opt) => {
                      const s = IMPACTO_STYLE[opt.value]
                      const active = local.impacto_atraso?.includes(opt.value as ImpactoAtrasoValue) ?? false
                      return (
                        <SemanticPill
                          key={opt.value}
                          label={opt.label}
                          active={active}
                          activeClass={s.active}
                          inactiveClass={s.inactive}
                          onClick={() => toggleArr("impacto_atraso", opt.value as ImpactoAtrasoValue)}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5. VALORES ─────────────────────────────────────────────── */}
            <div className="px-5 py-5">
              <SectionHeader index={nextIndex()} title="Valores" count={countValores > 0 ? 1 : 0} />
              <div className="space-y-2.5">
                <ValueRange
                  label="Valor base"
                  minId="v-base-min" maxId="v-base-max"
                  minValue={local.valor_min} maxValue={local.valor_max}
                  onMinChange={(v) => setLocal({ ...local, valor_min: v })}
                  onMaxChange={(v) => setLocal({ ...local, valor_max: v })}
                />
                <ValueRange
                  label="Valor atualizado"
                  minId="v-atualizado-min" maxId="v-atualizado-max"
                  minValue={local.valor_atualizado_min} maxValue={local.valor_atualizado_max}
                  onMinChange={(v) => setLocal({ ...local, valor_atualizado_min: v })}
                  onMaxChange={(v) => setLocal({ ...local, valor_atualizado_max: v })}
                />
                <ValueRange
                  label="Sem atualização"
                  minId="v-sem-min" maxId="v-sem-max"
                  minValue={local.valor_sem_atualizacao_min} maxValue={local.valor_sem_atualizacao_max}
                  onMinChange={(v) => setLocal({ ...local, valor_sem_atualizacao_min: v })}
                  onMaxChange={(v) => setLocal({ ...local, valor_sem_atualizacao_max: v })}
                />
              </div>
            </div>

            {/* ── 6. DATAS ───────────────────────────────────────────────── */}
            <div className="px-5 py-5">
              <SectionHeader index={nextIndex()} title="Datas" count={countDatas > 0 ? 1 : 0} />
              <div className="space-y-2.5">
                <DateRange
                  label="Data de criação"
                  startId="dc-inicio" endId="dc-fim"
                  startValue={local.data_criacao_inicio} endValue={local.data_criacao_fim}
                  onStartChange={(v) => setLocal({ ...local, data_criacao_inicio: v })}
                  onEndChange={(v) => setLocal({ ...local, data_criacao_fim: v })}
                />
                <DateRange
                  label="Entrada em cálculo"
                  startId="dcc-inicio" endId="dcc-fim"
                  startValue={local.data_entrada_calculo_inicio} endValue={local.data_entrada_calculo_fim}
                  onStartChange={(v) => setLocal({ ...local, data_entrada_calculo_inicio: v })}
                  onEndChange={(v) => setLocal({ ...local, data_entrada_calculo_fim: v })}
                />
              </div>
            </div>

            {/* ── 7. MARCADORES ──────────────────────────────────────────── */}
            <div className="px-5 py-5">
              <SectionHeader index={nextIndex()} title="Marcadores" count={countFlags} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <ToggleFlag
                  label="Apenas urgentes"
                  sublabel="Processos marcados como urgente"
                  checked={local.urgente ?? false}
                  onToggle={() => setFlag("urgente", !local.urgente)}
                />
                <ToggleFlag
                  label="Titular falecido"
                  checked={local.titular_falecido ?? false}
                  onToggle={() => setFlag("titular_falecido", !local.titular_falecido)}
                />
                <ToggleFlag
                  label="Valor calculado"
                  sublabel="Possui ao menos um cálculo"
                  checked={local.valor_calculado ?? false}
                  onToggle={() => setFlag("valor_calculado", !local.valor_calculado)}
                />
                <ToggleFlag
                  label="Cálculo em andamento"
                  checked={local.calculo_em_andamento ?? false}
                  onToggle={() => setFlag("calculo_em_andamento", !local.calculo_em_andamento)}
                />
                <ToggleFlag
                  label="Cálculo finalizado"
                  checked={local.calculo_finalizado ?? false}
                  onToggle={() => setFlag("calculo_finalizado", !local.calculo_finalizado)}
                />
              </div>
            </div>

          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border/60 bg-muted/10 px-5 py-4">
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={clear}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-background text-[13px] font-medium text-muted-foreground transition hover:border-destructive/30 hover:bg-destructive/8 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </button>
            <button
              type="button"
              onClick={apply}
              className="flex h-10 flex-[2] items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-[0.98]"
            >
              Aplicar filtros
              {localCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
                  {localCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
