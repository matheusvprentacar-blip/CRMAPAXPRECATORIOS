"use client"
/* eslint-disable */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState, useRef, useCallback, useDeferredValue, memo, type RefObject, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Lock, LockOpen, Kanban, ChevronLeft, ChevronRight } from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "@/components/ui/use-toast"
import { maskProcesso } from "@/lib/masks"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

import { SearchBar } from "@/components/precatorios/search-bar"
import { AdvancedFilters } from "@/components/precatorios/advanced-filters"
import { ModalSemInteresse } from "@/components/kanban/modal-sem-interesse"
import { KANBAN_COLUMNS } from "./columns"
import { KpiCard } from "@/components/kanban/kpi-card"
import { useSidebar } from "@/components/ui/sidebar"
import { X } from "@/components/icons"
import type { FiltrosPrecatorios } from "@/lib/types/filtros"
import { usePersistedFilters } from "@/hooks/use-persisted-filters"

// Colunas do Kanban com Gates (Base)
const COLUNAS_BASE = KANBAN_COLUMNS.filter((coluna) => coluna.id !== "entrada")

// Colunas que permitem acesso à área de cálculos
const COLUNAS_CALCULO_PERMITIDO = [
  "pronto_calculo",
  "calculo_andamento",
  "calculo_concluido",
]

const ENCERRADOS_STATUS = [
  "pos_fechamento",
  "pausado_credor",
  "pausado_documentos",
  "sem_interesse",
  "reprovado",
  "nao_elegivel",
] as const

const ENCERRADOS_LABELS: Record<string, string> = {
  pos_fechamento: "Pós-fechamento",
  pausado_credor: "Pausado (credor)",
  pausado_documentos: "Pausado (documentos)",
  sem_interesse: "Sem interesse",
  reprovado: "Reprovado",
  nao_elegivel: "Não elegível",
}

const TRIAGEM_STATUS_OPTIONS = [
  { value: "SEM_CONTATO", label: "Sem contato" },
  { value: "CONTATO_EM_ANDAMENTO", label: "Contato em andamento" },
  { value: "PEDIR_RETORNO", label: "Pedir retorno" },
  { value: "SEM_INTERESSE", label: "Sem interesse" },
  { value: "TEM_INTERESSE", label: "Tem interesse" },
]

type TriagemDestinoReprovacao = "none" | "reprovado" | "nao_elegivel" | "credito_vendido"

const TRIAGEM_DESTINO_OPTIONS: Array<{ value: TriagemDestinoReprovacao; label: string }> = [
  { value: "none", label: "Fluxo normal" },
  { value: "reprovado", label: "Reprovado" },
  { value: "nao_elegivel", label: "Não elegível" },
  { value: "credito_vendido", label: "Credor vendeu o crédito (Reprovado / não elegível)" },
]

const PAUSA_STATUS = ["pausado_credor", "pausado_documentos"] as const

type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

const stringifySupabaseError = (error: unknown): string => {
  if (!error) return "Erro desconhecido"
  if (typeof error === "string") return error
  if (error instanceof Error) return error.message
  if (typeof error === "object") {
    const err = error as SupabaseLikeError
    return err.message || err.details || err.hint || JSON.stringify(error)
  }
  return String(error)
}

const isEscriturasSchemaMismatch = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false
  const err = error as SupabaseLikeError
  const blob = `${err.code || ""} ${err.message || ""} ${err.details || ""} ${err.hint || ""}`.toLowerCase()
  return (
    blob.includes("precatorios_status_check") ||
    blob.includes("precatorios_status_kanban_check") ||
    blob.includes("responsavel_escrituras_id") ||
    blob.includes("status_escrituras") ||
    blob.includes("schema cache")
  )
}

interface PrecatorioCard {
  id: string
  titulo: string | null
  numero_precatorio: string | null
  credor_nome: string | null
  devedor: string | null
  tribunal: string | null
  status_kanban: string
  interesse_status: string | null
  interesse_observacao?: string | null

  juridico_motivo?: string | null
  juridico_descricao_bloqueio?: string | null
  juridico_parecer_status?: string | null
  juridico_resultado_final?: string | null

  calculo_desatualizado: boolean
  calculo_ultima_versao: number

  valor_principal: number | null
  valor_atualizado: number | null
  saldo_liquido: number | null

  prioridade?: number | null

  responsavel?: string | null
  criado_por?: string | null
  dono_usuario_id?: string | null
  responsavel_certidoes_id?: string | null
  responsavel_escrituras_id?: string | null
  responsavel_juridico_id?: string | null
  responsavel_calculo_id: string | null

  created_at: string
  updated_at?: string | null

  file_url?: string | null

  nivel_complexidade?: "baixa" | "media" | "alta" | null
  sla_status?: "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido" | null
  tipo_atraso?: string | null
  impacto_atraso?: "baixo" | "medio" | "alto" | null
  urgente?: boolean
  titular_falecido?: boolean
  motivo_atraso_calculo?: string | null
  motivo_sem_interesse?: string | null
  data_recontato?: string | null
  data_entrada_calculo?: string | null
  status?: string

  resumo_itens?: {
    total_docs: number
    docs_recebidos: number
    total_certidoes: number
    certidoes_recebidas: number
    certidoes_nao_aplicavel: number
    percentual_docs: number
    percentual_certidoes: number
  } | null

  responsavel_perfil?: { nome: string } | null
  search_index?: string
  distribuido_por_admin?: boolean
}

const useHorizontalAutoScroll = (isDragging: boolean, containerRef: RefObject<HTMLDivElement | null>) => {
  useEffect(() => {
    if (!isDragging) return
    const container = containerRef.current
    if (!container) return

    const EDGE_ZONE = 160
    const MAX_SCROLL_SPEED = 26
    const VERTICAL_TOLERANCE = 48

    let frameId: number | null = null
    let pointerX = window.innerWidth / 2
    let pointerY = window.innerHeight / 2

    const updatePointer = (clientX?: number | null, clientY?: number | null) => {
      if (typeof clientX === "number") pointerX = clientX
      if (typeof clientY === "number") pointerY = clientY
    }

    const handlePointerMove = (e: PointerEvent) => updatePointer(e.clientX, e.clientY)
    const handleMouseMove = (e: MouseEvent) => updatePointer(e.clientX, e.clientY)
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches?.[0]
      if (!touch) return
      updatePointer(touch.clientX, touch.clientY)
    }
    const handleDragOver = (e: DragEvent) => updatePointer(e.clientX, e.clientY)

    const loop = () => {
      const rect = container.getBoundingClientRect()
      const withinVerticalBand =
        pointerY >= rect.top - VERTICAL_TOLERANCE && pointerY <= rect.bottom + VERTICAL_TOLERANCE

      if (withinVerticalBand) {
        const leftDistance = Math.max(0, EDGE_ZONE - (pointerX - rect.left))
        const rightDistance = Math.max(0, EDGE_ZONE - (rect.right - pointerX))

        let delta = 0
        if (leftDistance > 0) {
          const intensity = Math.min(1, leftDistance / EDGE_ZONE)
          delta = -MAX_SCROLL_SPEED * intensity
        } else if (rightDistance > 0) {
          const intensity = Math.min(1, rightDistance / EDGE_ZONE)
          delta = MAX_SCROLL_SPEED * intensity
        }

        if (delta !== 0) {
          const nextScroll = container.scrollLeft + delta
          const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth)
          container.scrollLeft = Math.min(maxScroll, Math.max(0, nextScroll))
        }
      }

      frameId = window.requestAnimationFrame(loop)
    }

    document.addEventListener("pointermove", handlePointerMove, { passive: true, capture: true })
    document.addEventListener("mousemove", handleMouseMove, { passive: true, capture: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: true, capture: true })
    document.addEventListener("dragover", handleDragOver, { passive: true, capture: true })

    frameId = window.requestAnimationFrame(loop)

    return () => {
      document.removeEventListener("pointermove", handlePointerMove, true as any)
      document.removeEventListener("mousemove", handleMouseMove, true as any)
      document.removeEventListener("touchmove", handleTouchMove, true as any)
      document.removeEventListener("dragover", handleDragOver, true as any)
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [isDragging, containerRef])
}

// Listener nativo de wheel (passive:false) — ESSENCIAL em desktop/webview
const useWheelToHorizontalScroll = (containerRef: RefObject<HTMLDivElement | null>) => {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return

      const target = e.target as HTMLElement | null

      const scrollArea = target?.closest?.("[data-kanban-scroll]") as HTMLElement | null
      if (scrollArea) {
        const canScrollY = scrollArea.scrollHeight > scrollArea.clientHeight + 1
        if (canScrollY) {
          const atTop = scrollArea.scrollTop <= 0
          const atBottom = scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 1

          if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
            return
          }
        }
      }

      if (e.shiftKey) {
        container.scrollLeft += e.deltaY
        e.preventDefault()
        return
      }

      const absX = Math.abs(e.deltaX || 0)
      const absY = Math.abs(e.deltaY || 0)

      if (absX > absY) {
        container.scrollLeft += e.deltaX
        e.preventDefault()
        return
      }

      container.scrollLeft += e.deltaY
      e.preventDefault()
    }

    container.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      container.removeEventListener("wheel", onWheel as any)
    }
  }, [containerRef])
}

const formatBR = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const formatM = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`
    : v >= 1_000
      ? `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}K`
      : formatBR(v)

const getParecerLabel = (status?: string | null) => {
  switch (status) {
    case "APROVADO": return "Aprovado"
    case "AJUSTAR_DADOS": return "Ajustar dados"
    case "RISCO_ALTO": return "Risco alto"
    case "IMPEDIMENTO": return "Impedimento"
    case "NAO_ELEGIVEL": return "Não elegível"
    default: return status || "Parecer"
  }
}

type KanbanColumn = (typeof KANBAN_COLUMNS)[number]

type KanbanCardItemProps = {
  precatorio: PrecatorioCard
  colunaId: string
  isAtualizado: boolean
  podeCalculos: boolean
  isDragging: boolean
  compacto: boolean
  onOpenDetails: (precatorioId: string, updatedAt?: string | null) => void
  onOpenCalculo: (precatorioId: string) => void
}

// Helpers para chips de interesse
function getInteresseChip(status: string | null) {
  switch (status) {
    case "TEM_INTERESSE":
      return { label: "Tem interesse", variant: "green" as const }
    case "SEM_INTERESSE":
      return { label: "Sem interesse", variant: "red" as const }
    case "PEDIR_RETORNO":
      return { label: "Pedir retorno", variant: "amber" as const }
    case "CONTATO_EM_ANDAMENTO":
      return { label: "Contato em andamento", variant: "blue" as const }
    case "SEM_CONTATO":
      return { label: "Sem contato", variant: "gray" as const }
    default:
      return null
  }
}

function getSlaChip(status: string | null | undefined) {
  switch (status) {
    case "atrasado":
      return { label: "Em atraso", variant: "red" as const }
    case "atencao":
      return { label: "Atenção SLA", variant: "amber" as const }
    case "no_prazo":
      return { label: "No prazo", variant: "green" as const }
    default:
      return null
  }
}

type ChipVariant = "green" | "amber" | "blue" | "red" | "gray"

const CHIP_CLASSES: Record<ChipVariant, string> = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  amber: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  blue: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  red: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  gray: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700",
}

function MiniPill({ label, variant }: { label: string; variant: ChipVariant }) {
  return (
    <span className={`inline-flex items-center min-h-[25px] px-2.5 rounded-full text-[10px] font-bold border whitespace-nowrap shadow-[3px_3px_8px_rgba(0,0,0,.05),-2px_-2px_5px_rgba(255,255,255,.9)] ${CHIP_CLASSES[variant]}`}>
      {label}
    </span>
  )
}

const KanbanCardItem = memo(function KanbanCardItem({
  precatorio,
  colunaId,
  isAtualizado,
  podeCalculos,
  isDragging,
  compacto,
  onOpenDetails,
  onOpenCalculo,
}: KanbanCardItemProps) {
  const numeroPrecatorio = precatorio.numero_precatorio ? maskProcesso(precatorio.numero_precatorio) : null
  const valorExibido =
    (precatorio.valor_atualizado && precatorio.valor_atualizado > 0
      ? precatorio.valor_atualizado
      : precatorio.valor_principal) ?? 0
  const temValor = valorExibido > 0
  const nomeResponsavel = precatorio.responsavel_perfil?.nome?.split(" ")[0] || "—"
  const nomeCompletoResponsavel = precatorio.responsavel_perfil?.nome || "—"
  const initiais = (precatorio.responsavel_perfil?.nome || "?")
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()

  const interesseChip = getInteresseChip(precatorio.interesse_status)
  const slaChip = getSlaChip(precatorio.sla_status)

  // Gate bars: docs e certidões
  const totalDocs = precatorio.resumo_itens?.total_docs ?? 0
  const docsFilled = precatorio.resumo_itens?.docs_recebidos ?? 0
  const totalCerts = precatorio.resumo_itens?.total_certidoes ?? 0
  const certsFilled = precatorio.resumo_itens?.certidoes_recebidas ?? 0
  const totalGates = totalDocs + totalCerts
  const gatesFilled = docsFilled + certsFilled
  const temGates = totalGates > 0

  // Próxima ação contextual
  const proximaAcao = (() => {
    if (precatorio.motivo_atraso_calculo) return `Resolver atraso: ${precatorio.motivo_atraso_calculo}`
    if (precatorio.interesse_status === "PEDIR_RETORNO" && precatorio.data_recontato)
      return `Recontato em ${new Date(precatorio.data_recontato).toLocaleDateString("pt-BR")}`
    if (precatorio.interesse_status === "SEM_CONTATO") return "Realizar primeiro contato com o credor"
    if ((colunaId === "juridico" || precatorio.status_kanban === "juridico") && !precatorio.juridico_parecer_status) {
      return "Aguardando parecer jurídico"
    }
    if (colunaId === "pronto_calculo") return "Abrir área de cálculo e iniciar atualização"
    return null
  })()

  const temBloqueio =
    precatorio.juridico_parecer_status === "IMPEDIMENTO" ||
    precatorio.juridico_parecer_status === "RISCO_ALTO" ||
    !!precatorio.motivo_atraso_calculo

  return (
    <div
      onClick={() => onOpenDetails(precatorio.id, precatorio.updated_at)}
      className={[
        "cursor-grab active:cursor-grabbing select-none",
        "rounded-[22px] border bg-white dark:bg-zinc-900",
        "transition-all duration-200",
        "hover:-translate-y-1 hover:scale-[1.01]",
        isDragging
          ? "opacity-95 rotate-[1.4deg] scale-[1.02] shadow-[22px_22px_44px_rgba(0,0,0,.16),-8px_-8px_22px_rgba(255,255,255,.98),inset_1px_1px_3px_rgba(255,255,255,.96),inset_-1px_-1px_2px_rgba(0,0,0,.03)] ring-2 ring-[rgba(14,77,106,.12)] z-10"
          : "shadow-[14px_14px_30px_rgba(0,0,0,.10),-6px_-6px_16px_rgba(255,255,255,.98),inset_1px_1px_3px_rgba(255,255,255,.92),inset_-1px_-1px_2px_rgba(0,0,0,.03)]",
        temBloqueio
          ? "border-red-300/80 dark:border-red-700/60"
          : isAtualizado
            ? "border-blue-300/70 dark:border-blue-600/50"
            : "border-[rgba(14,77,106,.10)]",
      ].join(" ")}
    >
      <div className="p-[15px] space-y-3">

        {/* Cabeçalho: nome + prioridade */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <h4 className="text-[14.5px] font-black leading-tight tracking-[-0.025em] text-foreground line-clamp-2 break-words">
              {precatorio.credor_nome || precatorio.titulo || "Sem nome"}
            </h4>
            {numeroPrecatorio && (
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground mt-0.5 truncate">
                {numeroPrecatorio}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {precatorio.urgente && (
              <span className="inline-flex items-center min-w-[40px] h-[34px] px-2.5 rounded-xl text-[11px] font-bold border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 shadow-[3px_3px_8px_rgba(0,0,0,.05),-2px_-2px_5px_rgba(255,255,255,.9)]">
                Alta
              </span>
            )}
            {!precatorio.urgente && precatorio.prioridade && precatorio.prioridade >= 3 && (
              <span className="inline-flex items-center min-w-[40px] h-[34px] px-2.5 rounded-xl text-[11px] font-bold border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-[3px_3px_8px_rgba(0,0,0,.05),-2px_-2px_5px_rgba(255,255,255,.9)]">
                Média
              </span>
            )}
          </div>
        </div>

        {/* Subtitle: tribunal + devedor */}
        {(precatorio.tribunal || precatorio.devedor) && (
          <p className="text-[12px] text-muted-foreground leading-snug line-clamp-2">
            {[precatorio.tribunal, precatorio.devedor].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Chips de status */}
        {(interesseChip || slaChip || precatorio.titular_falecido || colunaId === "encerrados" || precatorio.calculo_desatualizado || (precatorio.status_kanban === "pronto_calculo" && precatorio.juridico_parecer_status)) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {interesseChip && <MiniPill label={interesseChip.label} variant={interesseChip.variant} />}
            {slaChip && <MiniPill label={slaChip.label} variant={slaChip.variant} />}
            {precatorio.titular_falecido && (
              <MiniPill label="Titular falecido" variant="gray" />
            )}
            {colunaId === "encerrados" && (
              <MiniPill
                label={
                  precatorio.status_kanban === "reprovado"
                    ? ENCERRADOS_LABELS[precatorio.juridico_resultado_final || "reprovado"] || ENCERRADOS_LABELS.reprovado
                    : ENCERRADOS_LABELS[precatorio.status_kanban] || "Encerrado"
                }
                variant="gray"
              />
            )}
            {precatorio.calculo_desatualizado && (
              <MiniPill label="Cálculo desatualizado" variant="amber" />
            )}
            {precatorio.status_kanban === "pronto_calculo" && precatorio.juridico_parecer_status && (
              <MiniPill
                label={`Jurídico: ${getParecerLabel(precatorio.juridico_parecer_status)}`}
                variant="red"
              />
            )}
          </div>
        )}

        {/* Info panel: responsável + valor */}
        {!compacto && (
          <div
            className="mt-3 p-3 rounded-2xl grid grid-cols-2 gap-2.5"
            style={{
              background: "var(--muted-lt, #f4f5f8)",
              boxShadow: "inset 5px 5px 12px rgba(0,0,0,.07),inset -4px -4px 10px rgba(255,255,255,.87)",
            }}
          >
            <div>
              <span className="block mb-1 text-[9.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
                Responsável
              </span>
              <strong className="block text-[12px] font-bold text-foreground leading-snug truncate">
                {nomeResponsavel}
              </strong>
            </div>
            {temValor && (
              <div>
                <span className="block mb-1 text-[9.5px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
                  {precatorio.valor_atualizado && precatorio.valor_atualizado > 0 ? "Valor atualizado" : "Valor principal"}
                </span>
                <strong className={`block text-[12px] font-bold leading-snug truncate ${precatorio.valor_atualizado && precatorio.valor_atualizado > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                  {formatBR(valorExibido)}
                </strong>
              </div>
            )}
          </div>
        )}

        {/* Gate bars */}
        {temGates && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.13em] uppercase text-muted-foreground">
              <span>Leitura de gates</span>
              <strong>{gatesFilled}/{totalGates}</strong>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: totalDocs }).map((_, i) => (
                <span
                  key={`doc-${i}`}
                  className="flex-1 h-2 rounded-full"
                  style={{
                    background: i < docsFilled
                      ? "linear-gradient(90deg, #22c55e, #0e4d6a)"
                      : "rgba(0,0,0,.06)",
                  }}
                />
              ))}
              {totalDocs > 0 && totalCerts > 0 && <span className="w-1" />}
              {Array.from({ length: totalCerts }).map((_, i) => (
                <span
                  key={`cert-${i}`}
                  className="flex-1 h-2 rounded-full"
                  style={{
                    background: i < certsFilled
                      ? "linear-gradient(90deg, #f59e0b, #f97316)"
                      : "rgba(0,0,0,.06)",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Próxima ação */}
        {!compacto && proximaAcao && (
          <div
            className="mt-3 px-3 py-3 rounded-[15px]"
            style={{
              background: "linear-gradient(180deg,#f7fbff,#eef5fb)",
              border: "1px solid rgba(14,77,106,.12)",
              boxShadow: "inset 1px 1px 2px rgba(255,255,255,.8),4px 4px 10px rgba(0,0,0,.04)",
            }}
          >
            <strong className="block mb-1 text-[9.5px] font-black tracking-[0.14em] uppercase text-[#0e4d6a]">
              Próxima ação segura
            </strong>
            <span className="text-[11.5px] text-foreground/80 leading-snug line-clamp-2">{proximaAcao}</span>
          </div>
        )}

        {/* Rodapé: avatar + lock badge */}
        <div className="flex items-center justify-between gap-2.5 mt-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-[11px] flex items-center justify-center text-white text-[11px] font-black shrink-0"
              style={{
                background: "#0e4d6a",
                boxShadow: "4px 4px 10px rgba(14,77,106,.34),-2px -2px 6px rgba(255,255,255,.35)",
              }}
            >
              {initiais}
            </div>
            <div className="min-w-0">
              <strong className="block text-[11.5px] font-bold text-foreground leading-tight truncate max-w-[120px]">
                {nomeCompletoResponsavel}
              </strong>
            </div>
          </div>

          {podeCalculos ? (
            <span
              className="inline-flex items-center gap-1.5 min-h-[30px] px-3 rounded-full text-[10px] font-black border whitespace-nowrap"
              style={{
                background: "#f0fdf4",
                color: "#15803d",
                borderColor: "#bbf7d0",
              }}
            >
              <LockOpen className="h-3 w-3" />
              Cálculo liberado
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 min-h-[30px] px-3 rounded-full text-[10px] font-black border whitespace-nowrap"
              style={{
                background: "#fffbeb",
                color: "#92400e",
                borderColor: "#fde68a",
              }}
            >
              <Lock className="h-3 w-3" />
              Bloqueado
            </span>
          )}
        </div>

      </div>
    </div>
  )
})

type KanbanColumnProps = {
  coluna: KanbanColumn
  precatorios: PrecatorioCard[]
  totalColuna: number
  totalCards: number
  columnWidthClass: string
  isDragging: boolean
  compacto: boolean
  updatedPrecatorios: Set<string>
  matchFiltroRapido: (p: PrecatorioCard) => boolean
  podeAcessarCalculos: (precatorio: PrecatorioCard) => boolean
  onOpenDetails: (precatorioId: string, updatedAt?: string | null) => void
  onOpenCalculo: (precatorioId: string) => void
}

const KanbanColumn = memo(function KanbanColumn({
  coluna,
  precatorios,
  totalColuna,
  totalCards,
  columnWidthClass,
  isDragging,
  compacto,
  updatedPrecatorios,
  matchFiltroRapido,
  podeAcessarCalculos,
  onOpenDetails,
  onOpenCalculo,
}: KanbanColumnProps) {
  const progressValue = totalCards > 0 ? Math.round((precatorios.length / totalCards) * 100) : 0
  const c = coluna.color

  return (
    <div
      data-kanban-column="true"
      className={`flex-shrink-0 ${columnWidthClass} flex flex-col ${isDragging ? "" : "snap-start"}`}
    >
      <Droppable droppableId={coluna.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col h-full rounded-[22px] overflow-clip"
            style={{
              border: snapshot.isDraggingOver
                ? "1.5px solid rgba(14,77,106,.18)"
                : "1.5px solid rgba(0,0,0,.06)",
              background: "linear-gradient(180deg,#fcfcfd,#f7f8fb)",
              boxShadow: snapshot.isDraggingOver
                ? "18px 18px 38px rgba(0,0,0,.08),-8px -8px 20px rgba(255,255,255,.96),inset 1px 1px 4px rgba(255,255,255,.92),inset -1px -1px 2px rgba(0,0,0,.04),0 0 0 2px rgba(14,77,106,.08)"
                : "16px 16px 36px rgba(0,0,0,.08),-8px -8px 20px rgba(255,255,255,.94),inset 1px 1px 4px rgba(255,255,255,.9),inset -1px -1px 2px rgba(0,0,0,.04)",
            }}
          >
            {/* Column Header */}
            <div
              className="sticky top-0 z-10 px-4 pb-3.5 pt-4"
              style={{
                borderBottom: "1px solid #e8eaef",
                background: "linear-gradient(180deg,rgba(255,255,255,.97),rgba(248,249,251,.97))",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  {/* Kicker */}
                  <div
                    className={`inline-flex items-center gap-2 mb-1.5 text-[9.5px] font-bold tracking-[0.16em] uppercase ${c.text}`}
                  >
                    <span className={`h-[7px] w-[7px] rounded-full ${c.dot} opacity-90`} />
                    {coluna.kicker}
                  </div>
                  <h3 className="text-[15px] font-black text-foreground tracking-[-0.02em] leading-tight">
                    {coluna.titulo}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                    {coluna.meta}
                  </p>
                </div>
                {/* Count badge */}
                <span
                  className="shrink-0 inline-flex items-center justify-center min-w-[40px] h-8 px-2.5 rounded-full text-[12px] font-black"
                  style={{
                    background: "#fff",
                    border: "1.5px solid rgba(0,0,0,.06)",
                    color: "#0e4d6a",
                    boxShadow: "7px 7px 16px rgba(0,0,0,.07),-4px -4px 10px rgba(255,255,255,.92),inset 1px 1px 2px rgba(255,255,255,.88),inset -1px -1px 2px rgba(0,0,0,.03)",
                  }}
                >
                  {precatorios.length}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1.5">
                  <span>
                    {totalCards > 0 ? "Prontos para avançar" : "Sem cards"}
                    {totalColuna > 0 && ` · ${formatM(totalColuna)}`}
                  </span>
                  <strong>{progressValue}%</strong>
                </div>
                <div
                  className="h-[5px] rounded-full overflow-hidden"
                  style={{
                    background: "#e8eaef",
                    boxShadow: "inset 2px 2px 4px rgba(0,0,0,.05),inset -1px -1px 3px rgba(255,255,255,.75)",
                  }}
                >
                  <span
                    className={`block h-full rounded-full ${c.bar}`}
                    style={{ width: `${progressValue}%`, transition: "width .5s ease" }}
                  />
                </div>
              </div>
            </div>

            {/* Column body */}
            <div
              data-kanban-scroll
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3.5 max-h-[65vh] md:max-h-[68vh] xl:max-h-[72vh]"
              style={{
                background: snapshot.isDraggingOver
                  ? "linear-gradient(180deg,#e8edf5,#f0f4fa)"
                  : "linear-gradient(180deg,#eef1f6,#f4f6fa)",
                boxShadow: "inset 5px 5px 12px rgba(0,0,0,.07),inset -4px -4px 10px rgba(255,255,255,.87)",
                outline: snapshot.isDraggingOver ? "2px dashed rgba(14,77,106,.22)" : "none",
                outlineOffset: "-6px",
              }}
            >
              {precatorios.map((precatorio, index) => {
                const podeCalculos = podeAcessarCalculos(precatorio)
                const isAtualizado = updatedPrecatorios.has(precatorio.id)
                const visivelNoFiltro = matchFiltroRapido(precatorio)

                return (
                  <Draggable draggableId={precatorio.id} index={index} key={precatorio.id}>
                    {(provided, snapshot) => {
                      const dragStyle = provided.draggableProps.style as any
                      return (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          data-kanban-item="true"
                          className={snapshot.isDragging ? "pointer-events-none" : ""}
                          style={{
                            ...dragStyle,
                            zIndex: snapshot.isDragging ? 20 : "auto",
                            opacity: visivelNoFiltro ? 1 : 0.18,
                            pointerEvents: visivelNoFiltro ? "auto" : "none",
                            transition: "opacity .2s ease",
                          }}
                        >
                          <KanbanCardItem
                            precatorio={precatorio}
                            colunaId={coluna.id}
                            isAtualizado={isAtualizado}
                            podeCalculos={podeCalculos}
                            isDragging={snapshot.isDragging}
                            compacto={compacto}
                            onOpenDetails={onOpenDetails}
                            onOpenCalculo={onOpenCalculo}
                          />
                        </div>
                      )
                    }}
                  </Draggable>
                )
              })}
              {provided.placeholder}
              {precatorios.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 opacity-50">
                  <div
                    className="rounded-2xl p-3 mb-2"
                    style={{ border: "2px dashed rgba(0,0,0,.12)" }}
                  >
                    <Kanban className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Arraste aqui</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  )
})

export default function KanbanPageNewGates() {
  const { profile } = useAuth()
  const { state: sidebarState, isMobile } = useSidebar()
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [precatorios, setPrecatorios] = useState<PrecatorioCard[]>([])
  const [totalReal, setTotalReal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [compacto, setCompacto] = useState(false)
  const [filtroRapido, setFiltroRapido] = useState<"all" | "blocked" | "legal" | "calc" | "high">("all")
  const { filtros, updateFiltros, clearFiltros, filtrosAtivos } = usePersistedFilters("filtros:kanban")
  const [updatedPrecatorios, setUpdatedPrecatorios] = useState<Set<string>>(new Set())
  const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as string[]
  const canEnviarCalculoRoles = roles.some((role) =>
    ["admin", "juridico", "analista", "analista_processual"].includes(role)
  )

  const isOperadorComercial = roles.includes("operador_comercial")
  const colunasVisiveis = useMemo(() => COLUNAS_BASE, [])

  const [moveDialog, setMoveDialog] = useState<{
    open: boolean
    precatorioId: string | null
    colunaDestino: string | null
    validacao: any
  }>({
    open: false,
    precatorioId: null,
    colunaDestino: null,
    validacao: null,
  })

  const [triagemModal, setTriagemModal] = useState<{
    open: boolean
    precatorioId: string | null
    status: string
    observacao: string
    destinoReprovacao: TriagemDestinoReprovacao
  }>({
    open: false,
    precatorioId: null,
    status: "SEM_CONTATO",
    observacao: "",
    destinoReprovacao: "none",
  })

  const [triagemSaving, setTriagemSaving] = useState(false)
  const [motivoFechamento, setMotivoFechamento] = useState("")
  const [semInteresseDialog, setSemInteresseDialog] = useState<{
    open: boolean
    precatorioId: string | null
    mode: "sem_interesse" | "pausa"
    destinoStatus: string
  }>({
    open: false,
    precatorioId: null,
    mode: "sem_interesse",
    destinoStatus: "sem_interesse",
  })

  const [encerradosDialog, setEncerradosDialog] = useState<{
    open: boolean
    precatorioId: string | null
    colunaDestino: string
  }>({
    open: false,
    precatorioId: null,
    colunaDestino: "pos_fechamento",
  })

  const [isDragging, setIsDragging] = useState(false)
  const escriturasSchemaReadyRef = useRef<boolean | null>(null)

  type LoadPrecatoriosOptions = {
    showLoading?: boolean
    preserveHorizontalScroll?: boolean
  }

  useEffect(() => {
    if (profile) {
      loadPrecatorios()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const UPDATES_STORAGE_KEY = "kanban_precatorio_last_seen_v1"

  const readLastSeenMap = () => {
    if (typeof window === "undefined") return {} as Record<string, string>
    try {
      const raw = window.localStorage.getItem(UPDATES_STORAGE_KEY)
      if (!raw) return {} as Record<string, string>
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === "object" ? parsed : ({} as Record<string, string>)
    } catch {
      return {} as Record<string, string>
    }
  }

  const writeLastSeenMap = (map: Record<string, string>) => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(UPDATES_STORAGE_KEY, JSON.stringify(map))
    } catch {
      return
    }
  }

  const updateUpdatedFlags = (items: PrecatorioCard[]) => {
    const lastSeen = readLastSeenMap()
    const hasSeed = Object.keys(lastSeen).length > 0

    if (!hasSeed) {
      const seeded: Record<string, string> = { ...lastSeen }
      items.forEach((prec) => {
        const stamp = prec.updated_at || prec.created_at
        if (stamp) seeded[prec.id] = stamp
      })
      writeLastSeenMap(seeded)
      setUpdatedPrecatorios(new Set())
      return
    }

    const updated = new Set<string>()
    items.forEach((prec) => {
      const stamp = prec.updated_at || prec.created_at
      if (!stamp) return
      const last = lastSeen[prec.id]
      if (!last || new Date(stamp).getTime() > new Date(last).getTime()) {
        updated.add(prec.id)
      }
    })
    setUpdatedPrecatorios(updated)
  }

  const markPrecatorioUpdateSeen = useCallback((precatorioId: string, updatedAt?: string | null) => {
    const lastSeen = readLastSeenMap()
    const current =
      updatedAt ||
      precatorios.find((p) => p.id === precatorioId)?.updated_at ||
      precatorios.find((p) => p.id === precatorioId)?.created_at
    if (!current) return
    lastSeen[precatorioId] = current
    writeLastSeenMap(lastSeen)
    setUpdatedPrecatorios((prev) => {
      const next = new Set(prev)
      next.delete(precatorioId)
      return next
    })
  }, [precatorios])

  const normalizeString = useCallback((str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  }, [])

  const buildSearchIndex = useCallback(
    (precatorio: Partial<PrecatorioCard>) => {
      const raw = [
        precatorio.titulo,
        precatorio.numero_precatorio,
        precatorio.credor_nome,
        precatorio.devedor,
        precatorio.tribunal,
      ]
        .filter(Boolean)
        .join(" ")

      return normalizeString(raw)
    },
    [normalizeString]
  )

  async function loadPrecatorios(options: LoadPrecatoriosOptions = {}) {
    const { showLoading = true, preserveHorizontalScroll = false } = options
    const savedScrollLeft =
      preserveHorizontalScroll && scrollContainerRef.current
        ? scrollContainerRef.current.scrollLeft
        : null

    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      if (showLoading) {
        setLoading(true)
      }

      // Conta o total real sem limite de 1000
      supabase
        .from("precatorios")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .then(({ count }) => {
          if (count !== null) setTotalReal(count)
        })

      const selectFieldsLegacy = `
        id,
        titulo,
        numero_precatorio,
        credor_nome,
        devedor,
        tribunal,
        status_kanban,
        interesse_status,
        interesse_observacao,
        juridico_motivo,
        juridico_descricao_bloqueio,
        juridico_parecer_status,
        juridico_resultado_final,
        calculo_desatualizado,
        calculo_ultima_versao,
        valor_principal,
        valor_atualizado,
        saldo_liquido,
        prioridade,
        responsavel,
        criado_por,
        dono_usuario_id,
        responsavel_certidoes_id,
        responsavel_juridico_id,
        responsavel_calculo_id,
        created_at,
        updated_at,
        nivel_complexidade,
        sla_status,
        tipo_atraso,
        impacto_atraso,
        urgente,
        titular_falecido,
        status,
        file_url,
        motivo_atraso_calculo,
        motivo_sem_interesse,
        data_recontato,
        responsavel_perfil:usuarios!responsavel(nome)
      `

      const selectFieldsWithEscrituras = `
        ${selectFieldsLegacy.trim().replace("responsavel_certidoes_id,", "responsavel_certidoes_id,\n        responsavel_escrituras_id,")}
      `

      const selectFields = escriturasSchemaReadyRef.current === false
        ? selectFieldsLegacy
        : selectFieldsWithEscrituras

      let precatoriosData: any[] | null = null
      const { data, error } = await supabase
        .from("precatorios")
        .select(selectFields)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (error) {
        if (escriturasSchemaReadyRef.current !== false && isEscriturasSchemaMismatch(error)) {
          console.warn("[Kanban] Schema de escrituras não encontrado no banco. Usando query legada até aplicar migrations 221/222.")
          escriturasSchemaReadyRef.current = false

          const { data: retryData, error: retryError } = await supabase
            .from("precatorios")
            .select(selectFieldsLegacy)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })

          if (retryError) throw retryError
          precatoriosData = retryData
        } else {
          console.warn("[Kanban] Falha no select detalhado, tentando fallback:", error)
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("precatorios")
            .select(selectFieldsLegacy)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
          if (fallbackError) throw fallbackError
          precatoriosData = fallbackData
        }
      } else {
        if (escriturasSchemaReadyRef.current === null) {
          escriturasSchemaReadyRef.current = true
        }
        precatoriosData = data
      }

      const precatoriosEnriquecidos = (precatoriosData || []).map((p: any) => ({
        ...p,
        resumo_itens: null,
        search_index: buildSearchIndex(p),
      }))

      const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
      const isAdmin = roles.includes("admin") || roles.includes("gestor")
      const userId = profile?.id

      const precatoriosFiltrados = precatoriosEnriquecidos.filter((p: any) => {
        if (isAdmin) return true

        const fasesCalculo = ["pronto_calculo", "calculo_andamento", "calculo_concluido"]

        return (
          (roles.includes("operador_comercial") && p.responsavel === userId) ||
          (roles.includes("gestor_certidoes") && p.responsavel_certidoes_id === userId) ||
          (roles.includes("gestor_escrituras") && p.responsavel_escrituras_id === userId) ||
          (roles.includes("juridico") &&
            (p.responsavel_juridico_id === userId ||
              p.responsavel === userId ||
              p.criado_por === userId ||
              p.dono_usuario_id === userId)) ||
          (roles.includes("operador_calculo") &&
            (p.responsavel_calculo_id === userId ||
              (!p.responsavel_calculo_id && fasesCalculo.includes(p.status_kanban))))
        )
      })

      setPrecatorios(precatoriosFiltrados as PrecatorioCard[])
      updateUpdatedFlags(precatoriosFiltrados as PrecatorioCard[])

      if (savedScrollLeft !== null) {
        window.requestAnimationFrame(() => {
          const container = scrollContainerRef.current
          if (!container) return
          container.scrollLeft = savedScrollLeft
        })
      }
    } catch (error) {
      console.error("[Kanban] Erro ao carregar:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error)
      toast({
        title: "Erro",
        description: errorMessage || "Não foi possível carregar os precatórios",
        variant: "destructive",
      })
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const getFilteredPrecatorios = useCallback(
    (items: PrecatorioCard[], filtrosAtuais: FiltrosPrecatorios) => {
      return items.filter((p) => {
        if (filtrosAtuais.termo) {
          const term = normalizeString(filtrosAtuais.termo)
          if (!p.search_index?.includes(term)) return false
        }

        if (filtrosAtuais.responsavel_id) {
          const responsavelSelecionado = filtrosAtuais.responsavel_id
          const pertenceAoResponsavel =
            p.responsavel === responsavelSelecionado || p.dono_usuario_id === responsavelSelecionado
          if (!pertenceAoResponsavel) return false
        }

        if (filtrosAtuais.status && filtrosAtuais.status.length > 0) {
          if (!filtrosAtuais.status.includes(p.status || "")) return false
        }

        if (filtrosAtuais.complexidade && filtrosAtuais.complexidade.length > 0) {
          if (!p.nivel_complexidade || !filtrosAtuais.complexidade.includes(p.nivel_complexidade)) return false
        }

        if (filtrosAtuais.sla_status && filtrosAtuais.sla_status.length > 0) {
          if (!p.sla_status || !filtrosAtuais.sla_status.includes(p.sla_status)) return false
        }

        if (filtrosAtuais.tipo_atraso && filtrosAtuais.tipo_atraso.length > 0) {
          if (!p.tipo_atraso || !filtrosAtuais.tipo_atraso.includes(p.tipo_atraso as any)) return false
        }

        if (filtrosAtuais.impacto_atraso && filtrosAtuais.impacto_atraso.length > 0) {
          if (!p.impacto_atraso || !filtrosAtuais.impacto_atraso.includes(p.impacto_atraso)) return false
        }

        if (filtrosAtuais.data_criacao_inicio) {
          if (new Date(p.created_at) < new Date(filtrosAtuais.data_criacao_inicio)) return false
        }
        if (filtrosAtuais.data_criacao_fim) {
          const endDate = new Date(filtrosAtuais.data_criacao_fim)
          endDate.setHours(23, 59, 59, 999)
          if (new Date(p.created_at) > endDate) return false
        }

        const valor = (p.valor_atualizado && p.valor_atualizado > 0) ? p.valor_atualizado : (p.valor_principal || 0)
        if (filtrosAtuais.valor_min && valor < filtrosAtuais.valor_min) return false
        if (filtrosAtuais.valor_max && valor > filtrosAtuais.valor_max) return false

        if (filtrosAtuais.urgente && !p.urgente) return false
        if (filtrosAtuais.titular_falecido && !p.titular_falecido) return false

        return true
      })
    },
    [normalizeString]
  )

  const removeFiltro = (key: string) => {
    const newFiltros = { ...filtros }
    delete newFiltros[key as keyof FiltrosPrecatorios]
    updateFiltros(newFiltros)
  }
  const deferredFiltros = useDeferredValue(filtros)
  const filteredPrecatorios = useMemo(
    () => getFilteredPrecatorios(precatorios, deferredFiltros),
    [precatorios, deferredFiltros, getFilteredPrecatorios]
  )

  // Filtro rápido — aplicado por card no render (mantém colunas visíveis, apenas esconde cards)
  const matchFiltroRapido = useCallback((p: PrecatorioCard): boolean => {
    switch (filtroRapido) {
      case "all": return true
      case "blocked":
        return (
          p.juridico_parecer_status === "IMPEDIMENTO" ||
          p.juridico_parecer_status === "RISCO_ALTO" ||
          !!p.motivo_atraso_calculo ||
          p.sla_status === "atrasado"
        )
      case "legal":
        return (
          p.status_kanban === "juridico" ||
          p.status_kanban === "analise_processual_inicial" ||
          p.status_kanban === "proposta_aceita"
        )
      case "calc":
        return COLUNAS_CALCULO_PERMITIDO.includes(p.status_kanban)
      case "high":
        return p.urgente === true || (typeof p.prioridade === "number" && p.prioridade >= 3)
      default:
        return true
    }
  }, [filtroRapido])
  const responsaveisFiltro = useMemo(() => {
    const ids = new Set<string>()
    const nomesPorId = new Map<string, string>()

    precatorios.forEach((precatorio) => {
      if (precatorio.responsavel) {
        ids.add(precatorio.responsavel)
        const nomeResponsavel = precatorio.responsavel_perfil?.nome?.trim()
        if (nomeResponsavel) {
          nomesPorId.set(precatorio.responsavel, nomeResponsavel)
        }
      }

      if (precatorio.dono_usuario_id) {
        ids.add(precatorio.dono_usuario_id)
      }
    })

    return Array.from(ids)
      .map((id) => ({
        id,
        nome: nomesPorId.get(id) || `Operador ${id.slice(0, 8)}`,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  }, [precatorios])

  const responsavelAtivo = useMemo(() => {
    if (!filtros.responsavel_id) return null
    const responsavel = responsaveisFiltro.find((item) => item.id === filtros.responsavel_id)
    return responsavel?.nome || filtros.responsavel_id
  }, [filtros.responsavel_id, responsaveisFiltro])

  const setSearchTerm = (term: string) => {
    updateFiltros({ ...filtros, termo: term || undefined })
  }

  const { grupos, totaisColuna } = useMemo(() => {
    const grouped: Record<string, PrecatorioCard[]> = {}
    const totals: Record<string, number> = {}
    const statusToColumns = new Map<string, string[]>()

    colunasVisiveis.forEach((coluna) => {
      grouped[coluna.id] = []
      totals[coluna.id] = 0
      const statusIds = coluna.statusIds ?? [coluna.id]
      statusIds.forEach((statusId) => {
        const columnsForStatus = statusToColumns.get(statusId) || []
        columnsForStatus.push(coluna.id)
        statusToColumns.set(statusId, columnsForStatus)
      })
    })

    filteredPrecatorios.forEach((precatorio) => {
      let statusToUse = precatorio.status_kanban

      if (
        statusToUse === "entrada" &&
        precatorio.distribuido_por_admin &&
        isOperadorComercial
      ) {
        statusToUse = "triagem_interesse"
      }

      const matchedColumns = statusToColumns.get(statusToUse)
      if (!matchedColumns || matchedColumns.length === 0) return

      const valor =
        precatorio.valor_atualizado && precatorio.valor_atualizado > 0
          ? precatorio.valor_atualizado
          : (precatorio.valor_principal ?? 0)

      matchedColumns.forEach((columnId) => {
        grouped[columnId].push(precatorio)
        totals[columnId] += valor
      })
    })

    return { grupos: grouped, totaisColuna: totals }
  }, [filteredPrecatorios])

  function abrirTriagemModal(precatorioId: string) {
    const precatorio = precatorios.find((p) => p.id === precatorioId)
    const destinoAtual =
      precatorio?.status_kanban === "reprovado" &&
        (precatorio?.juridico_resultado_final === "reprovado" || precatorio?.juridico_resultado_final === "nao_elegivel")
        ? (precatorio.juridico_resultado_final as TriagemDestinoReprovacao)
        : "none"
    setTriagemModal({
      open: true,
      precatorioId,
      status: precatorio?.interesse_status || "SEM_CONTATO",
      observacao: precatorio?.interesse_observacao || "",
      destinoReprovacao: destinoAtual,
    })
  }

  const podeEnviarParaCalculo = (precatorioId: string, colunaDestino: string) => {
    if (colunaDestino !== "pronto_calculo") return true
    const precatorioAtual = precatorios.find((p) => p.id === precatorioId)
    const colunaAtual = precatorioAtual?.status_kanban || precatorioAtual?.status
    if (!["analise_processual_inicial", "juridico"].includes(String(colunaAtual))) return true
    return canEnviarCalculoRoles
  }

  async function moverPrecatorio(precatorioId: string, colunaDestino: string) {
    if (!podeEnviarParaCalculo(precatorioId, colunaDestino)) {
      toast({
        title: "Movimentação restrita",
        description: "Somente jurídico, admin ou analista processual podem enviar para cálculo.",
        variant: "destructive",
      })
      return
    }

    if (colunaDestino === "juridico") {
      const precatorio = precatorios.find((p) => p.id === precatorioId)
      const possuiSolicitacaoFormal =
        Boolean(precatorio?.juridico_motivo?.trim()) &&
        Boolean(precatorio?.juridico_descricao_bloqueio?.trim())

      if (!possuiSolicitacaoFormal) {
        toast({
          title: "Movimentacao bloqueada",
          description:
            "Para enviar ao Juridico, registre primeiro a solicitacao formal (motivo e descricao do bloqueio).",
          variant: "destructive",
        })
        return
      }
    }

    if (colunaDestino === "pronto_calculo") {
      const precatorio = precatorios.find(p => p.id === precatorioId)
      if (!precatorio?.file_url) {
        toast({
          title: "Bloqueado",
          description: "É necessário anexar/extrair o Ofício antes de mover para Pronto p/ Cálculo.",
          variant: "destructive"
        })
        return
      }
    }

    const precatorioAtual = precatorios.find(p => p.id === precatorioId)
    if (precatorioAtual?.status_kanban === "proposta_aceita" && colunaDestino === "certidoes") {
      const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
      if (!roles.includes("juridico")) {
        toast({
          title: "Movimentação restrita",
          description: "Somente o Jurídico pode liberar de Jurídico de fechamento para Certidões.",
          variant: "destructive",
        })
        return
      }
    }

    if (colunaDestino === "sem_interesse") {
      setSemInteresseDialog({
        open: true,
        precatorioId,
        mode: "sem_interesse",
        destinoStatus: "sem_interesse",
      })
      return
    }

    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const { data: validacao, error: validacaoError } = await supabase
        .rpc("validar_movimentacao_kanban", {
          p_precatorio_id: precatorioId,
          p_coluna_destino: colunaDestino
        })

      if (validacaoError) throw validacaoError

      if (!validacao.valido) {
        setMoveDialog({
          open: true,
          precatorioId,
          colunaDestino,
          validacao,
        })
        return
      }

      const statusMapping: Record<string, string> = {
        pronto_calculo: "pronto_calculo",
        calculo_andamento: "calculo_andamento",
        calculo_concluido: "calculo_concluido",
      }

      const updateData: any = {
        status_kanban: colunaDestino,
        localizacao_kanban: colunaDestino,
        updated_at: new Date().toISOString(),
      }

      if (statusMapping[colunaDestino]) updateData.status = statusMapping[colunaDestino]

      const { error: updateError } = await supabase
        .from("precatorios")
        .update(updateData)
        .eq("id", precatorioId)

      if (updateError) throw updateError

      toast({
        title: "Movido com sucesso",
        description: `Precatório movido para ${colunaDestino}`,
      })

      await loadPrecatorios({ showLoading: false, preserveHorizontalScroll: true })
    } catch (error) {
      const rawMessage = stringifySupabaseError(error)
      const detailedMessage =
        !rawMessage || rawMessage === "{}"
          ? "Não foi possível mover o precatório (resposta vazia do backend)."
          : rawMessage
      const migrationHint = isEscriturasSchemaMismatch(error)
        ? "Banco desatualizado: aplique as migrations 221, 222 e 223 (escrituras)."
        : ""
      if (process.env.NODE_ENV === "development") {
        console.warn("[Kanban] Erro ao mover:", {
          precatorioId,
          colunaDestino,
          message: detailedMessage,
          raw: error,
        })
      }
      toast({
        title: "Erro",
        description: [detailedMessage, migrationHint].filter(Boolean).join(" "),
        variant: "destructive",
      })
    }
  }

  async function onDragEnd(result: any) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const colunaDestino = destination.droppableId
    const precatorioAtual = precatorios.find((p) => p.id === draggableId)
    const statusOrigem = String(precatorioAtual?.status_kanban || "")

    if (colunaDestino === "encerrados") {
      setEncerradosDialog({
        open: true,
        precatorioId: draggableId,
        colunaDestino: ENCERRADOS_STATUS[0],
      })
      return
    }

    if (colunaDestino === "triagem_interesse") {
      const retornoAnaliseParaTriagem =
        source.droppableId === "analise_processual_inicial" ||
        ["analise_processual_inicial", "juridico", "analise_juridica"].includes(statusOrigem)

      if (retornoAnaliseParaTriagem) {
        await moverPrecatorio(draggableId, colunaDestino)
        return
      }

      abrirTriagemModal(draggableId)
      return
    }

    await moverPrecatorio(draggableId, colunaDestino)
  }

  async function confirmarEncerrados() {
    if (!encerradosDialog.precatorioId) return

    const destino = encerradosDialog.colunaDestino || ENCERRADOS_STATUS[0]

    if (
      destino === "sem_interesse" ||
      PAUSA_STATUS.includes(destino as (typeof PAUSA_STATUS)[number])
    ) {
      setEncerradosDialog((prev) => ({ ...prev, open: false }))
      setSemInteresseDialog({
        open: true,
        precatorioId: encerradosDialog.precatorioId,
        mode: destino === "sem_interesse" ? "sem_interesse" : "pausa",
        destinoStatus: destino,
      })
      return
    }

    setEncerradosDialog((prev) => ({ ...prev, open: false }))
    await moverPrecatorio(encerradosDialog.precatorioId, destino)
  }

  async function confirmarMovimentacao() {
    if (!moveDialog.precatorioId || !moveDialog.colunaDestino) return
    if (!podeEnviarParaCalculo(moveDialog.precatorioId, moveDialog.colunaDestino)) {
      toast({
        title: "Movimentação restrita",
        description: "Somente jurídico, admin ou analista processual podem enviar para cálculo.",
        variant: "destructive",
      })
      setMoveDialog({ open: false, precatorioId: null, colunaDestino: null, validacao: null })
      return
    }

    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const updateData: any = {
        status_kanban: moveDialog.colunaDestino,
        localizacao_kanban: moveDialog.colunaDestino,
        updated_at: new Date().toISOString(),
      }

      const statusMapping: Record<string, string> = {
        pronto_calculo: "pronto_calculo",
        calculo_andamento: "calculo_andamento",
        calculo_concluido: "calculo_concluido",
      }

      if (statusMapping[moveDialog.colunaDestino]) {
        updateData.status = statusMapping[moveDialog.colunaDestino]
      }

      if (moveDialog.colunaDestino === "fechado" && motivoFechamento) {
        updateData.interesse_observacao = motivoFechamento
      }

      const { error } = await supabase
        .from("precatorios")
        .update(updateData)
        .eq("id", moveDialog.precatorioId)

      if (error) throw error

      toast({
        title: "Movido com sucesso",
        description: "Precatório movido com sucesso.",
      })

      setMoveDialog({ open: false, precatorioId: null, colunaDestino: null, validacao: null })
      setMotivoFechamento("")
      await loadPrecatorios({ showLoading: false, preserveHorizontalScroll: true })
    } catch (error) {
      console.error("[Kanban] Erro:", error)
      toast({
        title: "Erro",
        description: "Não foi possível mover o precatório",
        variant: "destructive",
      })
    }
  }

  async function confirmarTriagemModal() {
    if (!triagemModal.precatorioId) return

    const destinoReprovacaoSelecionado = triagemModal.destinoReprovacao !== "none"
    const resultadoFinalTriagem =
      triagemModal.destinoReprovacao === "credito_vendido"
        ? "nao_elegivel"
        : triagemModal.destinoReprovacao
    const observacaoTriagem = triagemModal.observacao.trim()
    const observacaoCreditoVendido = "Credor informou que vendeu o credito para outra pessoa ou empresa."

    if (triagemModal.status === "SEM_INTERESSE" && !destinoReprovacaoSelecionado) {
      setTriagemModal({
        open: false,
        precatorioId: null,
        status: "SEM_CONTATO",
        observacao: "",
        destinoReprovacao: "none",
      })
      setSemInteresseDialog({
        open: true,
        precatorioId: triagemModal.precatorioId,
        mode: "sem_interesse",
        destinoStatus: "sem_interesse",
      })
      return
    }

    setTriagemSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const colunaDestinoTriagem = destinoReprovacaoSelecionado ? "reprovado" : "triagem_interesse"

      const { data: validacao, error: validacaoError } = await supabase.rpc("validar_movimentacao_kanban", {
        p_precatorio_id: triagemModal.precatorioId,
        p_coluna_destino: colunaDestinoTriagem,
      })

      if (validacaoError) throw validacaoError

      if (validacao && !validacao.valido) {
        setTriagemModal((prev) => ({ ...prev, open: false }))
        setMoveDialog({
          open: true,
          precatorioId: triagemModal.precatorioId,
          colunaDestino: colunaDestinoTriagem,
          validacao,
        })
        return
      }

      const precatorioAtual = precatorios.find((p) => p.id === triagemModal.precatorioId)
      const updateData: any = {
        status_kanban: colunaDestinoTriagem,
        localizacao_kanban: colunaDestinoTriagem,
        interesse_status: triagemModal.status,
        interesse_observacao:
          triagemModal.destinoReprovacao === "credito_vendido"
            ? observacaoTriagem
              ? `${observacaoTriagem}\n${observacaoCreditoVendido}`
              : observacaoCreditoVendido
            : observacaoTriagem || null,
        updated_at: new Date().toISOString(),
      }
      if (destinoReprovacaoSelecionado) {
        updateData.juridico_resultado_final = resultadoFinalTriagem
      } else if (precatorioAtual?.status_kanban === "reprovado") {
        updateData.juridico_resultado_final = null
      }

      const { error: updateError } = await supabase
        .from("precatorios")
        .update(updateData)
        .eq("id", triagemModal.precatorioId)

      if (updateError) throw updateError

      toast({
        title: "Triagem registrada",
        description: destinoReprovacaoSelecionado
          ? "Registro salvo e crédito enviado para Reprovado / não elegível."
          : "O interesse do credor foi registrado com sucesso.",
      })

      setTriagemModal({
        open: false,
        precatorioId: null,
        status: "SEM_CONTATO",
        observacao: "",
        destinoReprovacao: "none",
      })

      await loadPrecatorios({ showLoading: false, preserveHorizontalScroll: true })
    } catch (error: any) {
      console.error("[Kanban] Erro na triagem:", error)
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível registrar a triagem.",
        variant: "destructive",
      })
    } finally {
      setTriagemSaving(false)
    }
  }

  const podeAcessarCalculos = useCallback((precatorio: PrecatorioCard): boolean => {
    if (!COLUNAS_CALCULO_PERMITIDO.includes(precatorio.status_kanban)) return false

    const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
    if (roles.includes("admin") || roles.includes("gestor")) return true
    if (roles.includes("operador_calculo")) return true
    return false
  }, [profile?.role])

  const abrirDetalhe = useCallback((precatorioId: string, updatedAt?: string | null) => {
    void markPrecatorioUpdateSeen(precatorioId, updatedAt)

    const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
    if (roles.includes("operador_comercial")) {
      router.push(`/precatorios/detalhes?id=${precatorioId}`)
    } else {
      router.push(`/precatorios/detalhes?id=${precatorioId}`)
    }
  }, [markPrecatorioUpdateSeen, profile?.role, router])

  const abrirAreaCalculos = useCallback(async (precatorioId: string) => {
    router.push(`/calcular?id=${precatorioId}`)
  }, [router])

  const semInteressePrecatorio = semInteresseDialog.precatorioId
    ? precatorios.find((p) => p.id === semInteresseDialog.precatorioId)
    : undefined

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const isSidebarCollapsed = !isMobile && sidebarState === "collapsed"
  const columnWidthClass = isSidebarCollapsed
    ? "min-w-[282px] w-[282px] md:min-w-[308px] md:w-[308px] xl:min-w-[334px] xl:w-[334px]"
    : "min-w-[260px] w-[260px] md:min-w-[286px] md:w-[286px] xl:min-w-[320px] xl:w-[320px]"

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const maxScroll = container.scrollWidth - container.clientWidth
    setCanScrollLeft(container.scrollLeft > 8)
    setCanScrollRight(container.scrollLeft < maxScroll - 8)
  }, [])

  const scrollByViewport = useCallback((direction: "left" | "right") => {
    const container = scrollContainerRef.current
    if (!container) return
    const delta = container.clientWidth * 0.85
    container.scrollBy({
      left: direction === "right" ? delta : -delta,
      behavior: "smooth",
    })
  }, [])

  const scrollToAdjacentColumn = useCallback((direction: "left" | "right") => {
    const container = scrollContainerRef.current
    if (!container) return

    const columns = Array.from(
      container.querySelectorAll<HTMLElement>("[data-kanban-column='true']")
    )
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth)
    const current = container.scrollLeft

    if (columns.length === 0) {
      scrollByViewport(direction)
      return
    }

    const offsets = columns.map((column) => column.offsetLeft).sort((a, b) => a - b)
    let target = current

    if (direction === "right") {
      target = offsets.find((offset) => offset > current + 16) ?? maxScroll
    } else {
      for (let index = offsets.length - 1; index >= 0; index -= 1) {
        if (offsets[index] < current - 16) {
          target = offsets[index]
          break
        }
      }
      if (target === current) target = 0
    }

    container.scrollTo({
      left: Math.min(maxScroll, Math.max(0, target)),
      behavior: "smooth",
    })
  }, [scrollByViewport])

  const handleKanbanKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    const tag = target.tagName
    if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return

    if (event.key === "ArrowRight") {
      event.preventDefault()
      scrollToAdjacentColumn("right")
      return
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      scrollToAdjacentColumn("left")
      return
    }
    if (event.key === "PageDown") {
      event.preventDefault()
      scrollByViewport("right")
      return
    }
    if (event.key === "PageUp") {
      event.preventDefault()
      scrollByViewport("left")
      return
    }
    if (event.key === "Home") {
      event.preventDefault()
      scrollContainerRef.current?.scrollTo({ left: 0, behavior: "smooth" })
      return
    }
    if (event.key === "End") {
      event.preventDefault()
      const container = scrollContainerRef.current
      if (!container) return
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth)
      container.scrollTo({ left: maxScroll, behavior: "smooth" })
    }
  }, [scrollByViewport, scrollToAdjacentColumn])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    updateScrollButtons()

    const handleScroll = () => updateScrollButtons()
    container.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)

    return () => {
      container.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [updateScrollButtons])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(() => updateScrollButtons())
    observer.observe(container)
    return () => observer.disconnect()
  }, [updateScrollButtons])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => updateScrollButtons())
    const timeout = window.setTimeout(() => updateScrollButtons(), 220)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timeout)
    }
  }, [isSidebarCollapsed, updateScrollButtons])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => updateScrollButtons())
    return () => window.cancelAnimationFrame(frame)
  }, [updateScrollButtons, filteredPrecatorios.length])

  useWheelToHorizontalScroll(scrollContainerRef)
  useHorizontalAutoScroll(isDragging, scrollContainerRef)

  // ---- KPIs ----
  const totalVisivel = filteredPrecatorios.length

  const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const kpiContagens = useMemo(() => {
    const ativos = filteredPrecatorios.filter(p =>
      ![
        "encerrados",
        "pos_fechamento",
        "pausado_credor",
        "pausado_documentos",
        "sem_interesse",
        "reprovado",
        "nao_elegivel",
        "fechado",
      ].includes(p.status_kanban)
    ).length
    const semResponsavel = filteredPrecatorios.filter(p => !p.responsavel).length
    const comUrgencia = filteredPrecatorios.filter(p => p.urgente === true || (typeof p.prioridade === "number" && p.prioridade >= 3)).length
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const atualizadosHoje = filteredPrecatorios.filter(p => {
      const d = p.updated_at ? new Date(p.updated_at) : null
      return d && d >= hoje
    }).length
    return [
      { label: "Total de precatórios", value: totalReal ?? totalVisivel, sub: "Base completa no sistema" },
      { label: "Ativos no board", value: ativos, sub: "Excluindo pausados e encerrados" },
      { label: "Sem responsável", value: semResponsavel, sub: "Aguardando atribuição" },
      { label: "Atualizados hoje", value: atualizadosHoje, sub: "Movimentados ou editados hoje" },
      { label: "Com urgência", value: comUrgencia, sub: "Marcados como urgente ou prioridade alta" },
    ]
  }, [filteredPrecatorios, totalReal, totalVisivel])

  const kpiStatus = useMemo(() => {
    const travados = filteredPrecatorios.filter(p =>
      p.juridico_parecer_status === "IMPEDIMENTO" ||
      p.juridico_parecer_status === "RISCO_ALTO" ||
      !!p.motivo_atraso_calculo ||
      p.sla_status === "atrasado"
    ).length
    const emTriagem = grupos.triagem_interesse?.length || 0
    const emJuridico = filteredPrecatorios.filter((p) => p.status_kanban === "juridico").length
    const juridFechamento = grupos.proposta_aceita?.length || 0
    const pausados = filteredPrecatorios.filter((p) =>
      ["pos_fechamento", "pausado_credor", "pausado_documentos", "sem_interesse"].includes(p.status_kanban)
    ).length
    const reprovados = filteredPrecatorios.filter((p) =>
      p.status_kanban === "reprovado" || p.status_kanban === "nao_elegivel"
    ).length
    return [
      { label: "Travados por gate", value: String(travados).padStart(2, "0"), sub: "Docs, certidões ou parecer pendente" },
      { label: "Em triagem", value: String(emTriagem).padStart(2, "0"), sub: "Aguardando interesse do credor" },
      { label: "Em jurídico", value: String(emJuridico).padStart(2, "0"), sub: "Análise jurídica em andamento" },
      { label: "Jurídico de fechamento", value: String(juridFechamento).padStart(2, "0"), sub: "Proposta aceita, preparando fechamento" },
      { label: "Pausados", value: String(pausados).padStart(2, "0"), sub: "Sem interesse ou aguardando credor" },
      { label: "Reprovados", value: String(reprovados).padStart(2, "0"), sub: "Não elegíveis ou reprovados" },
    ]
  }, [filteredPrecatorios, grupos])

  const kpiCalculo = useMemo(() => {
    const prontos = grupos.pronto_calculo?.length || 0
    const emAndamento = grupos.calculo_andamento?.length || 0
    const concluidos = grupos.calculo_concluido?.length || 0
    const semResp = filteredPrecatorios.filter(p =>
      COLUNAS_CALCULO_PERMITIDO.includes(p.status_kanban) && !p.responsavel_calculo_id
    ).length
    return [
      { label: "Pronto p/ cálculo", value: String(prontos).padStart(2, "0"), sub: "Liberados para abertura da área" },
      { label: "Cálculo em andamento", value: String(emAndamento).padStart(2, "0"), sub: "Atualização monetária em execução" },
      { label: "Cálculo concluído", value: String(concluidos).padStart(2, "0"), sub: "Valores calculados e validados" },
      { label: "Sem responsável de cálculo", value: String(semResp).padStart(2, "0"), sub: "Nas etapas de cálculo sem atribuição" },
    ]
  }, [filteredPrecatorios, grupos])

  const kpiValores = useMemo(() => {
    const soma = (status?: string[]) => filteredPrecatorios
      .filter(p => !status || status.includes(p.status_kanban))
      .reduce((acc, p) => {
        const v = (p.valor_atualizado && p.valor_atualizado > 0 ? p.valor_atualizado : p.valor_principal) ?? 0
        return acc + v
      }, 0)
    const somaAtualizado = filteredPrecatorios
      .filter(p => p.valor_atualizado && p.valor_atualizado > 0)
      .reduce((acc, p) => acc + (p.valor_atualizado ?? 0), 0)
    return [
      { label: "Valor em esteira", value: formatBRL(soma()), sub: "Todos os precatórios ativos" },
      { label: "Valor em triagem", value: formatBRL(soma(["triagem_interesse"])), sub: "Etapa de triagem de interesse" },
      { label: "Valor p/ cálculo", value: formatBRL(soma(COLUNAS_CALCULO_PERMITIDO)), sub: "Nas etapas de cálculo" },
      { label: "Valor atualizado", value: formatBRL(somaAtualizado), sub: "Com valor_atualizado preenchido" },
      { label: "Valor em negociação", value: formatBRL(soma(["proposta_negociacao"])), sub: "Proposta enviada ou em negociação" },
      { label: "Valor fechado", value: formatBRL(soma(["fechado"])), sub: "Operações finalizadas" },
    ]
  }, [filteredPrecatorios])

  if (loading) {
    return (
      <div className="min-w-0 w-full max-w-full overflow-hidden flex flex-col h-full">
        {/* Skeleton header */}
        <div
          className="px-4 py-3.5 border-b"
          style={{
            background: "linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,250,253,.97))",
            borderColor: "rgba(14,77,106,.10)",
          }}
        >
          <div className="h-7 w-56 rounded-xl bg-muted/50 animate-pulse mb-2" />
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        </div>
        {/* Skeleton board */}
        <div className="flex-1 min-h-0 overflow-hidden flex gap-3 p-3">
          {colunasVisiveis.slice(0, 5).map((coluna) => (
            <div key={coluna.id} className={`${columnWidthClass} flex-shrink-0`}>
              <div className="h-full min-h-[520px] rounded-[22px] bg-muted/30 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 w-full max-w-full overflow-hidden flex flex-col h-full">

      {/* ====== HEADER FIXO ESTILO CONCEITUAL ====== */}
      <div
        className="z-10 px-4 pb-3 pt-3.5 border-b flex-shrink-0"
        style={{
          background: "linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,250,253,.97))",
          borderColor: "rgba(14,77,106,.10)",
          boxShadow: "0 4px 24px rgba(0,0,0,.08),0 1px 4px rgba(0,0,0,.04)",
        }}
      >
        {/* Top row: título + ações */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-2 mb-1.5 text-[9.5px] font-black tracking-[0.18em] uppercase"
              style={{ color: "#9ca3af" }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "linear-gradient(180deg,#0e4d6a,#2d74a1)", boxShadow: "0 0 0 4px rgba(14,77,106,.08)" }}
              />
              Painel operacional
            </div>
            <h1
              className="no-route-shiny text-[26px] font-black leading-none tracking-[-0.06em]"
              style={{ color: "#0e4d6a", textShadow: "0 1px 0 rgba(255,255,255,.7)" }}
            >
              Kanban de Operação
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* SearchBar */}
            <div className="min-w-[240px]">
              <SearchBar
                value={filtros.termo || ""}
                onChange={setSearchTerm}
                onClear={() => setSearchTerm("")}
                placeholder="Buscar por credor, processo, devedor..."
                autoSearch={true}
                showButton={false}
              />
            </div>
            {/* AdvancedFilters */}
            <AdvancedFilters
              filtros={filtros}
              onFilterChange={updateFiltros}
              onClearFilters={clearFiltros}
              totalFiltrosAtivos={filtrosAtivos.length + (filtros.responsavel_id ? 1 : 0)}
              responsaveis={responsaveisFiltro}
              showResponsavelFilter={responsaveisFiltro.length > 0}
              showDistribuicaoFilter={true}
            />
            {/* Modo compacto toggle */}
            <button
              type="button"
              onClick={() => setCompacto((v) => !v)}
              className={[
                "h-9 px-3.5 rounded-[13px] text-[12.5px] font-bold inline-flex items-center gap-1.5 transition-all duration-200",
                compacto
                  ? "text-white"
                  : "border text-foreground/80 hover:-translate-y-px",
              ].join(" ")}
              style={
                compacto
                  ? {
                    background: "#0e4d6a",
                    boxShadow: "8px 8px 20px rgba(14,77,106,.42),-3px -3px 8px rgba(255,255,255,.28),inset 1px 1px 3px rgba(255,255,255,.14),inset -1px -1px 2px rgba(8,40,60,.28)",
                  }
                  : {
                    background: "linear-gradient(145deg,#fff,#f4f5f8)",
                    borderColor: "rgba(0,0,0,.08)",
                    boxShadow: "7px 7px 16px rgba(0,0,0,.07),-4px -4px 10px rgba(255,255,255,.92),inset 1px 1px 2px rgba(255,255,255,.88),inset -1px -1px 2px rgba(0,0,0,.03)",
                  }
              }
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" stroke="currentColor" fill="none" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              {compacto ? "Expandido" : "Compacto"}
            </button>
          </div>
        </div>

        {/* KPIs 4 cards rotativos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <KpiCard
            metrics={kpiContagens}
            colors={{
              bg: "linear-gradient(180deg,#ffffff,#f8fafc)",
              border: "rgba(14,77,106,.08)",
              label: "#7b8794",
              value: "#07131d",
              sub: "#5f6b7a",
              dot: "#0e4d6a",
            }}
          />
          <KpiCard
            metrics={kpiStatus}
            colors={{
              bg: "linear-gradient(145deg,#fef3e2,#fffbf0)",
              border: "rgba(180,83,9,.18)",
              label: "#92400e",
              value: "#b45309",
              sub: "#92400e",
              dot: "#b45309",
            }}
          />
          <KpiCard
            metrics={kpiCalculo}
            colors={{
              bg: "linear-gradient(145deg,#e0effe,#eef6ff)",
              border: "rgba(14,77,106,.18)",
              label: "#0e4d6a",
              value: "#1a6080",
              sub: "#0e4d6a",
              dot: "#1a6080",
            }}
          />
          <KpiCard
            metrics={kpiValores}
            colors={{
              bg: "linear-gradient(145deg,#e8fdf0,#f3fef7)",
              border: "rgba(21,128,61,.18)",
              label: "#166534",
              value: "#15803d",
              sub: "#166534",
              dot: "#15803d",
            }}
          />
        </div>

        {/* Filtros ativos */}
        {(filtrosAtivos.length > 0 || !!filtros.responsavel_id) && (
          <div className="flex items-center gap-2 flex-wrap mt-2.5">
            <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground mr-1">Filtros:</span>
            {filtros.responsavel_id && (
              <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1 text-xs">
                <span className="font-semibold">Responsável:</span>
                <span>{responsavelAtivo}</span>
                <button onClick={() => removeFiltro("responsavel_id")} className="ml-1 hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filtrosAtivos.map((filtro, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1 text-xs">
                <span className="font-semibold">{filtro.label}:</span>
                <span>{filtro.displayValue}</span>
                <button onClick={() => removeFiltro(filtro.key)} className="ml-1 hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFiltros} className="text-xs h-7">
              Limpar
            </Button>
          </div>
        )}
      </div>

      {/* ====== FILTER CHIPS RÁPIDOS ====== */}
      <div
        className="px-4 py-2 border-b flex-shrink-0 flex flex-wrap items-center gap-2"
        style={{ borderColor: "rgba(14,77,106,.07)", background: "rgba(248,250,253,.95)" }}
      >
        {([
          { id: "all", label: "Todos" },
          { id: "blocked", label: "Travados" },
          { id: "legal", label: "Jurídico" },
          { id: "calc", label: "Pronto p/ cálculo" },
          { id: "high", label: "Alta prioridade" },
        ] as const).map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFiltroRapido(chip.id)}
            className="h-[34px] px-3.5 rounded-full text-[11.5px] font-bold transition-all duration-200"
            style={
              filtroRapido === chip.id
                ? {
                    background: "#0e4d6a",
                    color: "#fff",
                    border: "1.5px solid transparent",
                    boxShadow: "8px 8px 20px rgba(14,77,106,.42),-3px -3px 8px rgba(255,255,255,.28),inset 1px 1px 3px rgba(255,255,255,.14),inset -1px -1px 2px rgba(8,40,60,.28)",
                  }
                : {
                    background: "linear-gradient(145deg,#fff,#f4f5f8)",
                    color: "#374151",
                    border: "1.5px solid rgba(0,0,0,.06)",
                    boxShadow: "7px 7px 16px rgba(0,0,0,.07),-4px -4px 10px rgba(255,255,255,.92),inset 1px 1px 2px rgba(255,255,255,.88),inset -1px -1px 2px rgba(0,0,0,.03)",
                  }
            }
          >
            {chip.label}
          </button>
        ))}
        <span
          className="ml-auto text-[10px] font-semibold"
          style={{ color: "#9ca3af" }}
        >
          {filtroRapido === "all"
            ? filteredPrecatorios.length
            : filteredPrecatorios.filter(matchFiltroRapido).length
          } card{filteredPrecatorios.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ====== BOARD ====== */}
      {filteredPrecatorios.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            className="rounded-2xl border-2 border-dashed p-8 text-center max-w-sm"
            style={{ borderColor: "rgba(0,0,0,.08)" }}
          >
            <Kanban className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              Nenhum precatório encontrado com os filtros atuais.
            </p>
            <p className="text-xs text-muted-foreground mt-1 opacity-70">
              Ajuste os filtros ou limpe a busca para ver todos.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <DragDropContext
            onDragEnd={(result) => {
              setIsDragging(false)
              void onDragEnd(result)
            }}
            onDragStart={() => setIsDragging(true)}
          >
            <div
              ref={scrollContainerRef}
              id="kanban-scroll-container"
              tabIndex={0}
              onKeyDown={handleKanbanKeyDown}
              aria-label="Painel kanban com navegação horizontal"
              className={`w-full h-full overflow-x-auto overflow-y-hidden overscroll-x-contain pb-3 px-3 ${isDragging ? "snap-none" : "snap-x snap-proximity"}`}
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehaviorX: "contain",
                scrollbarGutter: "stable both-edges",
              }}
            >
              <div className="flex min-w-max h-full gap-3 pt-3">
                {colunasVisiveis.map((coluna) => {
                  const precatoriosColuna = grupos[coluna.id] || []
                  const totalColuna = totaisColuna[coluna.id] || 0

                  return (
                    <KanbanColumn
                      key={coluna.id}
                      coluna={coluna}
                      precatorios={precatoriosColuna}
                      totalColuna={totalColuna}
                      totalCards={filteredPrecatorios.length}
                      columnWidthClass={columnWidthClass}
                      isDragging={isDragging}
                      compacto={compacto}
                      updatedPrecatorios={updatedPrecatorios}
                      matchFiltroRapido={matchFiltroRapido}
                      podeAcessarCalculos={podeAcessarCalculos}
                      onOpenDetails={abrirDetalhe}
                      onOpenCalculo={abrirAreaCalculos}
                    />
                  )
                })}
              </div>
            </div>

            {/* Gradients de scroll */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-background via-background/85 to-transparent" />
            )}
            {canScrollRight && (
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-background via-background/85 to-transparent" />
            )}

            {/* Nav arrows */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollToAdjacentColumn("left")}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full inline-flex items-center justify-center transition-all duration-200 hover:-translate-y-[calc(50%+2px)]"
                style={{
                  background: "rgba(255,255,255,.88)",
                  border: "1.5px solid rgba(0,0,0,.07)",
                  color: "#6b7280",
                  boxShadow: "7px 7px 16px rgba(0,0,0,.07),-4px -4px 10px rgba(255,255,255,.92),inset 1px 1px 2px rgba(255,255,255,.88),inset -1px -1px 2px rgba(0,0,0,.03)",
                }}
                aria-label="Ir para a coluna anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollToAdjacentColumn("right")}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full inline-flex items-center justify-center transition-all duration-200 hover:-translate-y-[calc(50%+2px)]"
                style={{
                  background: "rgba(255,255,255,.88)",
                  border: "1.5px solid rgba(0,0,0,.07)",
                  color: "#6b7280",
                  boxShadow: "7px 7px 16px rgba(0,0,0,.07),-4px -4px 10px rgba(255,255,255,.92),inset 1px 1px 2px rgba(255,255,255,.88),inset -1px -1px 2px rgba(0,0,0,.03)",
                }}
                aria-label="Ir para a próxima coluna"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </DragDropContext>
        </div>
      )}

      {/* ====== MODAIS ====== */}

      <Dialog open={encerradosDialog.open} onOpenChange={(open) => setEncerradosDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir status do encerramento</DialogTitle>
            <DialogDescription>Escolha em qual status esse precatório deve ficar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={encerradosDialog.colunaDestino}
              onValueChange={(value) => setEncerradosDialog((prev) => ({ ...prev, colunaDestino: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {ENCERRADOS_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {ENCERRADOS_LABELS[status] || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {encerradosDialog.colunaDestino === "sem_interesse" && (
              <p className="text-xs text-muted-foreground">
                Ao confirmar, você preencherá o motivo e o recontato no próximo modal.
              </p>
            )}
            {PAUSA_STATUS.includes(encerradosDialog.colunaDestino as (typeof PAUSA_STATUS)[number]) && (
              <p className="text-xs text-muted-foreground">
                Ao confirmar, será obrigatório informar motivo da pausa e data de retorno.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncerradosDialog((prev) => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button onClick={confirmarEncerrados}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveDialog.open} onOpenChange={(open) => !open && setMoveDialog({ ...moveDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moveDialog.validacao?.valido ? "Confirmar Movimentação" : "Movimentação Bloqueada"}
            </DialogTitle>
            <DialogDescription>{moveDialog.validacao?.mensagem}</DialogDescription>
          </DialogHeader>

          {moveDialog.colunaDestino === "fechado" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo do Fechamento *</label>
              <Textarea
                value={motivoFechamento}
                onChange={(e) => setMotivoFechamento(e.target.value)}
                placeholder="Descreva o motivo do fechamento..."
                rows={3}
              />
            </div>
          )}

          {moveDialog.validacao && !moveDialog.validacao.valido && (
            <div className="space-y-2">
              {moveDialog.validacao.docs_pendentes && (
                <div>
                  <p className="text-sm font-medium">Documentos Pendentes:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {moveDialog.validacao.docs_pendentes.map((doc: string, i: number) => (
                      <li key={i}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}
              {moveDialog.validacao.certidoes_pendentes && (
                <div>
                  <p className="text-sm font-medium">Certidões Pendentes:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {moveDialog.validacao.certidoes_pendentes.map((cert: string, i: number) => (
                      <li key={i}>{cert}</li>
                    ))}
                  </ul>
                </div>
              )}
              {moveDialog.validacao.campos_faltando && (
                <div>
                  <p className="text-sm font-medium">Campos Faltando:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {moveDialog.validacao.campos_faltando.map((campo: string, i: number) => (
                      <li key={i}>{campo}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog({ ...moveDialog, open: false })}>
              {moveDialog.validacao?.valido ? "Cancelar" : "Fechar"}
            </Button>
            {moveDialog.validacao?.valido && (
              <Button
                onClick={confirmarMovimentacao}
                disabled={moveDialog.colunaDestino === "fechado" && !motivoFechamento}
              >
                Confirmar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalSemInteresse
        open={semInteresseDialog.open}
        onOpenChange={(open) =>
          setSemInteresseDialog((prev) =>
            open
              ? { ...prev, open }
              : {
                  open: false,
                  precatorioId: null,
                  mode: "sem_interesse",
                  destinoStatus: "sem_interesse",
                }
          )
        }
        precatorioId={semInteresseDialog.precatorioId || ""}
        mode={semInteresseDialog.mode}
        onConfirm={async (motivo, dataRecontato) => {
          const supabase = createBrowserClient()
          if (!supabase) return

          const precatorioId = semInteresseDialog.precatorioId
          const mode = semInteresseDialog.mode
          const destinoStatus = semInteresseDialog.destinoStatus || "sem_interesse"
          const isPausa = mode === "pausa"
          const precatorioInfo = precatorios.find((p) => p.id === precatorioId)
          const precatorioLabel =
            precatorioInfo?.titulo ||
            precatorioInfo?.numero_precatorio ||
            precatorioInfo?.credor_nome ||
            "Precatório"

          if (isPausa && !dataRecontato) {
            throw new Error("A data de retorno é obrigatória para status pausado.")
          }

          const dataRecontatoIso = dataRecontato ? dataRecontato.toISOString() : null

          const updateData: any = {
            status_kanban: destinoStatus,
            localizacao_kanban: destinoStatus,
            data_recontato: dataRecontatoIso,
            updated_at: new Date().toISOString(),
          }

          if (isPausa) {
            updateData.interesse_status = "PEDIR_RETORNO"
            updateData.interesse_observacao = motivo
          } else {
            updateData.interesse_status = "SEM_INTERESSE"
            updateData.motivo_sem_interesse = motivo
          }

          const { error } = await supabase
            .from("precatorios")
            .update(updateData)
            .eq("id", semInteresseDialog.precatorioId)

          if (error) throw error

          if (dataRecontato && profile?.id && precatorioId) {
            const dateLabel = dataRecontato.toLocaleDateString("pt-BR")
            const { error: notificationError } = await supabase
              .from("notifications")
              .insert({
                user_id: profile.id,
                title: isPausa ? `Retorno de pausa - ${precatorioLabel}` : `Recontato agendado - ${precatorioLabel}`,
                body: isPausa
                  ? `Retomar contato com o credor em ${dateLabel}.`
                  : `Recontato marcado para ${dateLabel}.`,
                kind: "warn",
                link_url: `/precatorios/detalhes?id=${precatorioId}&tab=detalhes`,
                entity_type: "precatorio",
                entity_id: precatorioId,
                event_type: "recontato",
              })

            if (notificationError) {
              console.warn("Erro ao criar notificação de recontato:", notificationError)
            }
          }

          setPrecatorios((prev) =>
            prev.map((p) =>
              p.id === semInteresseDialog.precatorioId
                ? {
                    ...p,
                    status_kanban: destinoStatus,
                    interesse_status: isPausa ? "PEDIR_RETORNO" : "SEM_INTERESSE",
                    interesse_observacao: isPausa ? motivo : p.interesse_observacao,
                    motivo_sem_interesse: isPausa ? p.motivo_sem_interesse : motivo,
                    data_recontato: dataRecontatoIso,
                  }
                : p
            )
          )
          toast({
            title: "Atualizado",
            description: isPausa
              ? "Precatório pausado com data de retorno agendada."
              : "Precatório movido para Sem Interesse.",
          })

          await loadPrecatorios({ showLoading: false, preserveHorizontalScroll: true })
        }}
        initialMotivo={
          semInteresseDialog.mode === "pausa"
            ? semInteressePrecatorio?.interesse_observacao ?? semInteressePrecatorio?.motivo_sem_interesse ?? ""
            : semInteressePrecatorio?.motivo_sem_interesse ?? ""
        }
        initialDataRecontato={
          semInteressePrecatorio?.data_recontato
            ? new Date(semInteressePrecatorio.data_recontato)
            : null
        }
      />

      <Dialog
        open={triagemModal.open}
        onOpenChange={(open) => !open && setTriagemModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Triagem</DialogTitle>
            <DialogDescription>Informe o interesse do credor antes de mover para a triagem.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={triagemModal.status}
              onValueChange={(value) => setTriagemModal((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status de interesse" />
              </SelectTrigger>
              <SelectContent>
                {TRIAGEM_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={triagemModal.destinoReprovacao}
              onValueChange={(value) =>
                setTriagemModal((prev) => ({ ...prev, destinoReprovacao: value as TriagemDestinoReprovacao }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o destino" />
              </SelectTrigger>
              <SelectContent>
                {TRIAGEM_DESTINO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={triagemModal.observacao}
              onChange={(e) => setTriagemModal((prev) => ({ ...prev, observacao: e.target.value }))}
              placeholder="Observações (opcional)"
              rows={3}
            />
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setTriagemModal((prev) => ({ ...prev, open: false }))}>
              Cancelar
            </Button>
            <Button onClick={confirmarTriagemModal} disabled={triagemSaving}>
              {triagemSaving ? "Registrando..." : "Confirmar triagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
