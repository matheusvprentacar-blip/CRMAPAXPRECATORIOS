"use client"
/* eslint-disable */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState, useRef, useCallback, memo, type RefObject } from "react"
import { useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Lock, LockOpen, CheckCircle2, Clock, Kanban, FileText, User, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
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
import type { FiltrosPrecatorios } from "@/lib/types/filtros"
import { getFiltrosAtivos } from "@/lib/types/filtros"
import { X } from "lucide-react"

// Colunas do Kanban com Gates
const COLUNAS = KANBAN_COLUMNS

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
]

const ENCERRADOS_LABELS: Record<string, string> = {
  pos_fechamento: "Pós-fechamento",
  pausado_credor: "Pausado (credor)",
  pausado_documentos: "Pausado (documentos)",
  sem_interesse: "Sem interesse",
}

const TRIAGEM_STATUS_OPTIONS = [
  { value: "SEM_CONTATO", label: "Sem contato" },
  { value: "CONTATO_EM_ANDAMENTO", label: "Contato em andamento" },
  { value: "PEDIR_RETORNO", label: "Pedir retorno" },
  { value: "SEM_INTERESSE", label: "Sem interesse" },
  { value: "TEM_INTERESSE", label: "Tem interesse" },
]

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

  juridico_parecer_status?: string | null
  juridico_resultado_final?: string | null

  calculo_desatualizado: boolean
  calculo_ultima_versao: number

  valor_principal: number | null
  valor_atualizado: number | null
  saldo_liquido: number | null

  prioridade?: number | null

  responsavel?: string | null
  responsavel_certidoes_id?: string | null
  responsavel_juridico_id?: string | null
  responsavel_calculo_id: string | null

  created_at: string
  updated_at?: string | null

  file_url?: string | null // Campo de Ofício

  // Campos para filtros avançados
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
}

const useHorizontalAutoScroll = (isDragging: boolean, containerRef: RefObject<HTMLDivElement>) => {
  useEffect(() => {
    if (!isDragging) return
    const container = containerRef.current
    if (!container) return

    const SCROLL_ZONE = 120
    const SCROLL_SPEED = 14

    let frameId: number | null = null
    let pointerX = container.getBoundingClientRect().left + container.getBoundingClientRect().width / 2

    const updatePointer = (clientX?: number | null) => {
      if (typeof clientX === "number") pointerX = clientX
    }

    const handlePointerMove = (e: PointerEvent) => updatePointer(e.clientX)
    const handleMouseMove = (e: MouseEvent) => updatePointer(e.clientX)
    const handleTouchMove = (e: TouchEvent) => updatePointer(e.touches?.[0]?.clientX ?? null)
    const handleDragOver = (e: DragEvent) => updatePointer(e.clientX)

    const loop = () => {
      const rect = container.getBoundingClientRect()
      const leftZone = rect.left + SCROLL_ZONE
      const rightZone = rect.right - SCROLL_ZONE

      let delta = 0
      if (pointerX < leftZone) {
        const intensity = Math.min(1, (leftZone - pointerX) / SCROLL_ZONE)
        delta = -SCROLL_SPEED * intensity
      } else if (pointerX > rightZone) {
        const intensity = Math.min(1, (pointerX - rightZone) / SCROLL_ZONE)
        delta = SCROLL_SPEED * intensity
      }

      if (delta !== 0) {
        container.scrollLeft += delta
        container.dispatchEvent(new Event("scroll"))
      }

      frameId = window.requestAnimationFrame(loop)
    }

    // capture:true ajuda quando o DnD “segura” eventos
    window.addEventListener("pointermove", handlePointerMove, { passive: true, capture: true })
    window.addEventListener("mousemove", handleMouseMove, { passive: true, capture: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: true, capture: true })
    window.addEventListener("dragover", handleDragOver, { passive: true, capture: true })

    frameId = window.requestAnimationFrame(loop)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true as any)
      window.removeEventListener("mousemove", handleMouseMove, true as any)
      window.removeEventListener("touchmove", handleTouchMove, true as any)
      window.removeEventListener("dragover", handleDragOver, true as any)
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [isDragging, containerRef])
}

// Listener nativo de wheel (passive:false) — ESSENCIAL em desktop/webview
const useWheelToHorizontalScroll = (containerRef: RefObject<HTMLDivElement>) => {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      // pinch-zoom/ctrl+scroll: deixa passar
      if (e.ctrlKey) return

      const target = e.target as HTMLElement | null

      // Se o wheel está sobre uma coluna com scroll vertical e ainda dá pra scrollar, deixa o vertical funcionar.
      const scrollArea = target?.closest?.("[data-kanban-scroll]") as HTMLElement | null
      if (scrollArea) {
        const canScrollY = scrollArea.scrollHeight > scrollArea.clientHeight + 1
        if (canScrollY) {
          const atTop = scrollArea.scrollTop <= 0
          const atBottom = scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 1

          // ainda tem espaço pra scroll vertical? deixa o browser cuidar.
          if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
            return
          }
        }
      }

      // Shift+wheel -> horizontal (padrão de muitos sistemas)
      if (e.shiftKey) {
        container.scrollLeft += e.deltaY
        e.preventDefault()
        return
      }

      const absX = Math.abs(e.deltaX || 0)
      const absY = Math.abs(e.deltaY || 0)

      // Trackpad com gesto horizontal real
      if (absX > absY) {
        container.scrollLeft += e.deltaX
        e.preventDefault()
        return
      }

      // Mouse wheel normal (vertical) vira horizontal
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

const getParecerLabel = (status?: string | null) => {
  switch (status) {
    case "APROVADO":
      return "Aprovado"
    case "AJUSTAR_DADOS":
      return "Ajustar dados"
    case "RISCO_ALTO":
      return "Risco alto"
    case "IMPEDIMENTO":
      return "Impedimento"
    case "NAO_ELEGIVEL":
      return "Não elegível"
    default:
      return status || "Parecer"
  }
}

type KanbanColumn = (typeof KANBAN_COLUMNS)[number]

type KanbanCardItemProps = {
  precatorio: PrecatorioCard
  colunaId: string
  isAtualizado: boolean
  podeCalculos: boolean
  isDragging: boolean
  onOpenDetails: (precatorioId: string, updatedAt?: string | null) => void
  onOpenCalculo: (precatorioId: string) => void
}

const KanbanCardItem = memo(function KanbanCardItem({
  precatorio,
  colunaId,
  isAtualizado,
  podeCalculos,
  isDragging,
  onOpenDetails,
  onOpenCalculo,
}: KanbanCardItemProps) {
  const numeroPrecatorio = precatorio.numero_precatorio ? maskProcesso(precatorio.numero_precatorio) : null

  return (
    <Card
      className={`cursor-pointer rounded-xl border bg-zinc-50/90 dark:bg-zinc-900/70 shadow-sm group hover:shadow-md hover:border-primary/30 transition ${isDragging
        ? "shadow-xl ring-2 ring-primary/50"
        : precatorio.motivo_atraso_calculo
          ? "border-red-500 dark:border-red-500 ring-1 ring-red-500/20"
          : "border-zinc-200/80 dark:border-zinc-800/70"
        }`}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4
              className="font-semibold text-sm flex-1 leading-snug text-foreground line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors"
              onClick={() => onOpenDetails(precatorio.id, precatorio.updated_at)}
            >
              {precatorio.titulo || numeroPrecatorio || "Sem título"}
            </h4>
            {isAtualizado && (
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/15 text-red-600"
                title="Atualizado"
              >
                <Bell className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          {numeroPrecatorio && (
            <div className="text-[11px] font-medium text-muted-foreground">
              Precatório: <span className="text-foreground/90">{numeroPrecatorio}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground line-clamp-1">{precatorio.credor_nome}</p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {colunaId === "encerrados" && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {ENCERRADOS_LABELS[precatorio.status_kanban] || "Encerrado"}
              </Badge>
            )}
            {precatorio.urgente && (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                Urgente
              </Badge>
            )}
            {precatorio.titular_falecido && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                Titular falecido
              </Badge>
            )}
            {precatorio.calculo_desatualizado && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 border-amber-300 text-amber-700 dark:text-amber-300"
              >
                Cálculo desatualizado
              </Badge>
            )}
            {precatorio.interesse_status && (
              <Badge
                variant={precatorio.interesse_status === "TEM_INTERESSE" ? "default" : "secondary"}
                className="text-[10px] h-5 px-1.5"
              >
                {precatorio.interesse_status === "TEM_INTERESSE" ? (
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                ) : (
                  <Clock className="h-2.5 w-2.5 mr-1" />
                )}
                {precatorio.interesse_status === "TEM_INTERESSE" ? "Interesse" : "Análise"}
              </Badge>
            )}

            {precatorio.calculo_ultima_versao > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                v{precatorio.calculo_ultima_versao}
              </Badge>
            )}

            {precatorio.file_url && (
              <a
                href={precatorio.file_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 px-1.5 gap-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-blue-200 text-blue-700 dark:text-blue-400"
                >
                  <FileText className="h-2.5 w-2.5" />
                  Ofício
                </Badge>
              </a>
            )}

            {precatorio.status_kanban === "pronto_calculo" && precatorio.juridico_parecer_status && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 border-red-200 text-red-700 dark:text-red-300"
              >
                Jurídico: {getParecerLabel(precatorio.juridico_parecer_status)}
              </Badge>
            )}

            {precatorio.motivo_atraso_calculo && (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5 animate-pulse">
                <AlertCircle className="h-2.5 w-2.5 mr-1" />
                Em Atraso
              </Badge>
            )}
          </div>

          {((precatorio.valor_atualizado && precatorio.valor_atualizado > 0) || (precatorio.valor_principal && precatorio.valor_principal > 0)) && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground">
                {precatorio.valor_atualizado && precatorio.valor_atualizado > 0 ? "Atualizado:" : "Principal:"}
              </span>
              <span className="text-xs font-bold text-foreground">
                {formatBR((precatorio.valor_atualizado && precatorio.valor_atualizado > 0 ? precatorio.valor_atualizado : precatorio.valor_principal) ?? 0)}
              </span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-2">
            {precatorio.responsavel_perfil?.nome && (
              <div
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-zinc-100 dark:bg-zinc-800/50 px-2 py-1 rounded-md max-w-[55%] truncate shrink-0"
                title={`Responsável: ${precatorio.responsavel_perfil.nome}`}
              >
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{precatorio.responsavel_perfil.nome.split(" ")[0]}</span>
              </div>
            )}

            <Button
              variant={podeCalculos ? "secondary" : "ghost"}
              size="sm"
              className={`flex-1 text-[10px] h-7 ${!podeCalculos ? "opacity-50" : "hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"}`}
              disabled={!podeCalculos}
              onClick={(e) => {
                e.stopPropagation()
                if (podeCalculos) onOpenCalculo(precatorio.id)
              }}
            >
              {podeCalculos ? (
                <>
                  <LockOpen className="h-3 w-3 mr-1.5" />
                  Cálculo
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 mr-1.5" />
                  Bloqueado
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

type KanbanColumnProps = {
  coluna: KanbanColumn
  precatorios: PrecatorioCard[]
  totalColuna: number
  isDragging: boolean
  updatedPrecatorios: Set<string>
  podeAcessarCalculos: (precatorio: PrecatorioCard) => boolean
  onOpenDetails: (precatorioId: string, updatedAt?: string | null) => void
  onOpenCalculo: (precatorioId: string) => void
}

const KanbanColumn = memo(function KanbanColumn({
  coluna,
  precatorios,
  totalColuna,
  isDragging,
  updatedPrecatorios,
  podeAcessarCalculos,
  onOpenDetails,
  onOpenCalculo,
}: KanbanColumnProps) {
  const c = coluna.color

  return (
    <div className="flex-shrink-0 min-w-[340px] w-[340px] lg:min-w-[360px] lg:w-[360px] h-full flex flex-col snap-start">
      <Droppable droppableId={coluna.id}>
        {(provided) => (
          <Card
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col h-full rounded-2xl ring-1 ${c.ring} bg-zinc-100/90 dark:bg-zinc-900/75 border border-zinc-300/60 dark:border-zinc-800/70 shadow-sm`}
          >
            <CardHeader className={`pb-3 z-10 rounded-t-2xl sticky top-0 shadow-sm ring-1 ${c.ring} ${c.bg} border-b border-zinc-200/70 dark:border-zinc-800/70 backdrop-blur`}>
              <div className="flex items-center gap-2">
                <span className={`h-4 w-1.5 rounded-full ${c.bar}`} />
                <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                <CardTitle className={`text-sm font-semibold ${c.text}`}>{coluna.titulo}</CardTitle>
                <span className="ml-auto text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-50/90 dark:bg-zinc-900/70 px-1.5 py-0.5 rounded-full ring-1 ring-zinc-200/70 dark:ring-zinc-800/70">
                  {precatorios.length}
                </span>
              </div>
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 mt-1 flex justify-between items-center">
                <span>Total:</span>
                <span className="font-mono tabular-nums">{formatBR(totalColuna)}</span>
              </div>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
              <div
                data-kanban-scroll
                className={`space-y-3 p-3 h-full min-h-[120px] ${isDragging ? "overflow-y-hidden" : "overflow-y-auto"} overscroll-contain rounded-b-2xl bg-zinc-100/40 dark:bg-zinc-900/40`}
              >
                {precatorios.map((precatorio, index) => {
                  const podeCalculos = podeAcessarCalculos(precatorio)
                  const isAtualizado = updatedPrecatorios.has(precatorio.id)

                  return (
                    <Draggable draggableId={precatorio.id} index={index} key={precatorio.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.9 : 1,
                          }}
                        >
                          <KanbanCardItem
                            precatorio={precatorio}
                            colunaId={coluna.id}
                            isAtualizado={isAtualizado}
                            podeCalculos={podeCalculos}
                            isDragging={snapshot.isDragging}
                            onOpenDetails={onOpenDetails}
                            onOpenCalculo={onOpenCalculo}
                          />
                        </div>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
                {precatorios.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-60">
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-3 mb-2">
                      <Kanban className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-xs text-muted-foreground">Arraste aqui</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </Droppable>
    </div>
  )
})

export default function KanbanPageNewGates() {
  const { profile } = useAuth()
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioCard[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<FiltrosPrecatorios>({})
  const [updatedPrecatorios, setUpdatedPrecatorios] = useState<Set<string>>(new Set())
  const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as string[]
  const canEnviarCalculoRoles = roles.some((role) =>
    ["admin", "juridico", "analista", "analista_processual"].includes(role)
  )

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
  }>({
    open: false,
    precatorioId: null,
    status: "SEM_CONTATO",
    observacao: "",
  })

  const [triagemSaving, setTriagemSaving] = useState(false)
  const [motivoFechamento, setMotivoFechamento] = useState("")
  const [semInteresseDialog, setSemInteresseDialog] = useState<{
    open: boolean
    precatorioId: string | null
  }>({
    open: false,
    precatorioId: null,
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

  async function loadPrecatorios() {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      setLoading(true)

      const selectFields = `
        id,
        titulo,
        numero_precatorio,
        credor_nome,
        devedor,
        tribunal,
        status_kanban,
        interesse_status,
        interesse_observacao,
        juridico_parecer_status,
        juridico_resultado_final,
        calculo_desatualizado,
        calculo_ultima_versao,
        valor_principal,
        valor_atualizado,
        saldo_liquido,
        prioridade,
        responsavel,
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

      let precatoriosData: any[] | null = null
      const { data, error } = await supabase
        .from("precatorios")
        .select(selectFields)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (error) {
        console.warn("[Kanban] Falha no select detalhado, tentando fallback:", error)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("precatorios")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
        if (fallbackError) throw fallbackError
        precatoriosData = fallbackData
      } else {
        precatoriosData = data
      }

      const precatoriosComResumo = await Promise.all(
        (precatoriosData || []).map(async (p) => {
          const { data: resumo } = await supabase
            .from("view_resumo_itens_precatorio")
            .select("*")
            .eq("precatorio_id", p.id)
            .single()

          return {
            ...p,
            resumo_itens: resumo || null
          }
        })
      )

      const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
      const isAdmin = roles.includes("admin") || roles.includes("gestor")
      const userId = profile?.id

      const precatoriosFiltrados = precatoriosComResumo.filter((p: any) => {
        if (isAdmin) return true

        if (roles.includes("operador_comercial")) {
          return p.responsavel === userId
        }
        if (roles.includes("gestor_certidoes")) {
          return p.responsavel_certidoes_id === userId
        }
        if (roles.includes("juridico")) {
          return p.responsavel_juridico_id === userId
        }
        if (roles.includes("operador_calculo")) {
          const fasesCalculo = ["pronto_calculo", "calculo_andamento", "calculo_concluido"]
          return p.responsavel_calculo_id === userId || (!p.responsavel_calculo_id && fasesCalculo.includes(p.status_kanban))
        }

        return false
      })

      setPrecatorios(precatoriosFiltrados as PrecatorioCard[])
      updateUpdatedFlags(precatoriosFiltrados as PrecatorioCard[])
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
      setLoading(false)
    }
  }

  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  }

  const getFilteredPrecatorios = () => {
    return precatorios.filter(p => {
      if (filtros.termo) {
        const term = normalizeString(filtros.termo)
        const matchTermo = (
          (p.titulo && normalizeString(p.titulo).includes(term)) ||
          (p.numero_precatorio && normalizeString(p.numero_precatorio).includes(term)) ||
          (p.credor_nome && normalizeString(p.credor_nome).includes(term)) ||
          (p.devedor && normalizeString(p.devedor).includes(term)) ||
          (p.tribunal && normalizeString(p.tribunal).includes(term))
        )
        if (!matchTermo) return false
      }

      if (filtros.status && filtros.status.length > 0) {
        if (!filtros.status.includes(p.status || "")) return false
      }

      if (filtros.complexidade && filtros.complexidade.length > 0) {
        if (!p.nivel_complexidade || !filtros.complexidade.includes(p.nivel_complexidade)) return false
      }

      if (filtros.sla_status && filtros.sla_status.length > 0) {
        if (!p.sla_status || !filtros.sla_status.includes(p.sla_status)) return false
      }

      if (filtros.tipo_atraso && filtros.tipo_atraso.length > 0) {
        if (!p.tipo_atraso || !filtros.tipo_atraso.includes(p.tipo_atraso as any)) return false
      }

      if (filtros.impacto_atraso && filtros.impacto_atraso.length > 0) {
        if (!p.impacto_atraso || !filtros.impacto_atraso.includes(p.impacto_atraso)) return false
      }

      if (filtros.data_criacao_inicio) {
        if (new Date(p.created_at) < new Date(filtros.data_criacao_inicio)) return false
      }
      if (filtros.data_criacao_fim) {
        const endDate = new Date(filtros.data_criacao_fim)
        endDate.setHours(23, 59, 59, 999)
        if (new Date(p.created_at) > endDate) return false
      }

      const valor = (p.valor_atualizado && p.valor_atualizado > 0) ? p.valor_atualizado : (p.valor_principal || 0)
      if (filtros.valor_min && valor < filtros.valor_min) return false
      if (filtros.valor_max && valor > filtros.valor_max) return false

      if (filtros.urgente && !p.urgente) return false
      if (filtros.titular_falecido && !p.titular_falecido) return false

      return true
    })
  }

  const updateFiltros = (novosFiltros: FiltrosPrecatorios) => setFiltros(novosFiltros)
  const clearFiltros = () => setFiltros({})
  const removeFiltro = (key: string) => {
    setFiltros((prev) => {
      const newFiltros = { ...prev }
      delete newFiltros[key as keyof FiltrosPrecatorios]
      return newFiltros
    })
  }

  const filtrosAtivos = getFiltrosAtivos(filtros)
  const filteredPrecatorios = useMemo(() => getFilteredPrecatorios(), [precatorios, filtros])

  const agruparPorColuna = () => {
    const grupos: Record<string, PrecatorioCard[]> = {}

    COLUNAS.forEach((coluna) => {
      const statusIds = coluna.statusIds ?? [coluna.id]
      grupos[coluna.id] = filteredPrecatorios.filter((p) => statusIds.includes(p.status_kanban))
    })

    return grupos
  }

  const setSearchTerm = (term: string) => {
    setFiltros(prev => ({ ...prev, termo: term }))
  }

  const calcularTotalColuna = (precatoriosColuna: PrecatorioCard[]) => {
    return precatoriosColuna.reduce((acc, p) => {
      const valor = (p.valor_atualizado && p.valor_atualizado > 0)
        ? p.valor_atualizado
        : (p.valor_principal ?? 0)
      return acc + valor
    }, 0)
  }

  function abrirTriagemModal(precatorioId: string) {
    const precatorio = precatorios.find((p) => p.id === precatorioId)
    setTriagemModal({
      open: true,
      precatorioId,
      status: precatorio?.interesse_status || "SEM_CONTATO",
      observacao: precatorio?.interesse_observacao || "",
    })
  }

  const podeEnviarParaCalculo = (precatorioId: string, colunaDestino: string) => {
    if (colunaDestino !== "pronto_calculo") return true
    const precatorioAtual = precatorios.find((p) => p.id === precatorioId)
    const colunaAtual = precatorioAtual?.status_kanban || precatorioAtual?.status
    if (colunaAtual !== "analise_processual_inicial") return true
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
      setSemInteresseDialog({ open: true, precatorioId })
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
        calculo_andamento: "em_calculo",
        calculo_concluido: "calculado",
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

      await loadPrecatorios()
    } catch (error) {
      console.error("[Kanban] Erro ao mover:", error)
      toast({
        title: "Erro",
        description: "Não foi possível mover o precatório",
        variant: "destructive",
      })
    }
  }

  async function onDragEnd(result: any) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const colunaDestino = destination.droppableId

    if (colunaDestino === "encerrados") {
      setEncerradosDialog({
        open: true,
        precatorioId: draggableId,
        colunaDestino: ENCERRADOS_STATUS[0],
      })
      return
    }

    if (colunaDestino === "triagem_interesse") {
      abrirTriagemModal(draggableId)
      return
    }

    await moverPrecatorio(draggableId, colunaDestino)
  }

  async function confirmarEncerrados() {
    if (!encerradosDialog.precatorioId) return

    const destino = encerradosDialog.colunaDestino || ENCERRADOS_STATUS[0]

    if (destino === "sem_interesse") {
      setEncerradosDialog((prev) => ({ ...prev, open: false }))
      setSemInteresseDialog({ open: true, precatorioId: encerradosDialog.precatorioId })
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
        calculo_andamento: "em_calculo",
        calculo_concluido: "calculado",
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
      await loadPrecatorios()
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

    if (triagemModal.status === "SEM_INTERESSE") {
      setTriagemModal({
        open: false,
        precatorioId: null,
        status: "SEM_CONTATO",
        observacao: "",
      })
      setSemInteresseDialog({ open: true, precatorioId: triagemModal.precatorioId })
      return
    }

    setTriagemSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const { data: validacao, error: validacaoError } = await supabase.rpc("validar_movimentacao_kanban", {
        p_precatorio_id: triagemModal.precatorioId,
        p_coluna_destino: "triagem_interesse",
      })

      if (validacaoError) throw validacaoError

      if (validacao && !validacao.valido) {
        setTriagemModal((prev) => ({ ...prev, open: false }))
        setMoveDialog({
          open: true,
          precatorioId: triagemModal.precatorioId,
          colunaDestino: "triagem_interesse",
          validacao,
        })
        return
      }

      const updateData: any = {
        status_kanban: "triagem_interesse",
        interesse_status: triagemModal.status,
        interesse_observacao: triagemModal.observacao.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from("precatorios")
        .update(updateData)
        .eq("id", triagemModal.precatorioId)

      if (updateError) throw updateError

      toast({
        title: "Triagem registrada",
        description: "O interesse do credor foi registrado com sucesso.",
      })

      setTriagemModal({
        open: false,
        precatorioId: null,
        status: "SEM_CONTATO",
        observacao: "",
      })

      await loadPrecatorios()
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
    const supabase = createBrowserClient()
    if (supabase) {
      const { error } = await supabase
        .from("precatorios")
        .update({
          status: "calculo_andamento",
          status_kanban: "calculo_andamento",
          localizacao_kanban: "calculo_andamento",
          updated_at: new Date().toISOString()
        })
        .eq("id", precatorioId)

      if (error) {
        console.error("Erro ao atualizar status:", error)
        toast({
          title: "Erro ao atualizar status",
          description: error.message,
          variant: "destructive"
        })
        return
      }
    }

    router.push(`/calcular?id=${precatorioId}`)
  }, [router])

  const grupos = useMemo(() => agruparPorColuna(), [filteredPrecatorios])
  const semInteressePrecatorio = semInteresseDialog.precatorioId
    ? precatorios.find((p) => p.id === semInteresseDialog.precatorioId)
    : undefined

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const maxScroll = container.scrollWidth - container.clientWidth
    setCanScrollLeft(container.scrollLeft > 8)
    setCanScrollRight(container.scrollLeft < maxScroll - 8)
  }, [])

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
    const frame = window.requestAnimationFrame(() => updateScrollButtons())
    return () => window.cancelAnimationFrame(frame)
  }, [updateScrollButtons, filteredPrecatorios.length])

  // ✅ FIX 1: wheel vertical -> scroll horizontal (nativo, passive:false)
  useWheelToHorizontalScroll(scrollContainerRef)

  // ✅ FIX 2: auto-scroll durante drag perto das bordas
  useHorizontalAutoScroll(isDragging, scrollContainerRef)

  if (loading) {
    return (
      <div className="w-full px-4 h-[calc(100vh-7rem)] flex flex-col space-y-4">
        <div className="space-y-4 border-b pb-6">
          <div className="h-8 w-60 rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-4 w-80 rounded-lg bg-muted/40 animate-pulse" />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="flex gap-4 overflow-hidden">
            {COLUNAS.slice(0, 4).map((coluna) => (
              <div
                key={coluna.id}
                className="min-w-[340px] w-[340px] lg:min-w-[360px] lg:w-[360px] h-full flex flex-col"
              >
                <div className="h-full rounded-2xl border border-border/60 bg-muted/30 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 h-[calc(100vh-7rem)] flex flex-col space-y-4">
      {/* Header Premium */}
      <div className="flex flex-col space-y-4 border-b pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent w-fit">
              Kanban Workflow
            </h1>
            <p className="text-muted-foreground mt-1">Fluxo controlado com gates de validação automática</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary" className="px-2 py-0.5">
                Total: {precatorios.length}
              </Badge>
              <Badge variant="outline" className="px-2 py-0.5">
                Visíveis: {filteredPrecatorios.length}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="w-full md:w-80">
              <SearchBar
                value={filtros.termo || ""}
                onChange={setSearchTerm}
                onClear={() => setSearchTerm("")}
                placeholder="Filtrar Cards..."
              />
            </div>
            <AdvancedFilters
              filtros={filtros}
              onFilterChange={updateFiltros}
              onClearFilters={clearFiltros}
              totalFiltrosAtivos={filtrosAtivos.length}
            />
          </div>
        </div>

        {filtrosAtivos.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-2">Filtros:</span>
            {filtrosAtivos.map((filtro, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1.5 px-2.5 py-1"
              >
                <span className="font-semibold">{filtro.label}:</span>
                <span>{filtro.displayValue}</span>
                <button
                  onClick={() => removeFiltro(filtro.key)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
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

      {filteredPrecatorios.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Nenhum precatório encontrado com os filtros atuais. Ajuste os filtros ou limpe a busca para ver todos.
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <DragDropContext
          onDragEnd={(result) => {
            setIsDragging(false)
            void onDragEnd(result)
          }}
          onDragStart={() => {
            setIsDragging(true)
          }}
        >
          <div className="relative h-full">
            <div
              ref={scrollContainerRef}
              id="kanban-scroll-container"
              tabIndex={0}
              className="flex w-full gap-4 overflow-x-auto overflow-y-hidden pb-2 h-full px-1 snap-x snap-proximity overscroll-x-contain scrollbar-thin scrollbar-thumb-border/60 scrollbar-track-transparent"
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehaviorX: "contain",
              }}
            >
              {COLUNAS.map((coluna) => {
                const precatoriosColuna = grupos[coluna.id] || []
                const totalColuna = calcularTotalColuna(precatoriosColuna)

                return (
                  <KanbanColumn
                    key={coluna.id}
                    coluna={coluna}
                    precatorios={precatoriosColuna}
                    totalColuna={totalColuna}
                    isDragging={isDragging}
                    updatedPrecatorios={updatedPrecatorios}
                    podeAcessarCalculos={podeAcessarCalculos}
                    onOpenDetails={abrirDetalhe}
                    onOpenCalculo={abrirAreaCalculos}
                  />
                )
              })}
            </div>

            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollContainerRef.current?.scrollBy({ left: -360, behavior: "smooth" })}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full border border-border/60 bg-background/80 backdrop-blur shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition"
                aria-label="Scroll para a esquerda"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollContainerRef.current?.scrollBy({ left: 360, behavior: "smooth" })}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full border border-border/60 bg-background/80 backdrop-blur shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition"
                aria-label="Scroll para a direita"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </DragDropContext>
      </div>

      <Dialog open={encerradosDialog.open} onOpenChange={(open) => setEncerradosDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir status do encerramento</DialogTitle>
            <DialogDescription>Escolha em qual status esse precatório deve ficar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={encerradosDialog.colunaDestino}
              onValueChange={(value) =>
                setEncerradosDialog((prev) => ({ ...prev, colunaDestino: value }))
              }
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
        onOpenChange={(open) => setSemInteresseDialog((prev) => ({ ...prev, open }))}
        precatorioId={semInteresseDialog.precatorioId || ""}
        onConfirm={async (motivo, dataRecontato) => {
          const supabase = createBrowserClient()
          if (!supabase) return

          const precatorioId = semInteresseDialog.precatorioId
          const precatorioInfo = precatorios.find((p) => p.id === precatorioId)
          const precatorioLabel =
            precatorioInfo?.titulo ||
            precatorioInfo?.numero_precatorio ||
            precatorioInfo?.credor_nome ||
            "Precatório"

          const { error } = await supabase
            .from("precatorios")
            .update({
              status_kanban: "sem_interesse",
              localizacao_kanban: "sem_interesse",
              interesse_status: "SEM_INTERESSE",
              motivo_sem_interesse: motivo,
              data_recontato: dataRecontato ? dataRecontato.toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", semInteresseDialog.precatorioId)

          if (error) throw error

          if (dataRecontato && profile?.id && precatorioId) {
            const dateLabel = dataRecontato.toLocaleDateString("pt-BR")
            const { error: notificationError } = await supabase
              .from("notifications")
              .insert({
                user_id: profile.id,
                title: `Recontato agendado - ${precatorioLabel}`,
                body: `Recontato marcado para ${dateLabel}.`,
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
                ? { ...p, status_kanban: "sem_interesse" }
                : p
            )
          )
          toast({
            title: "Atualizado",
            description: "Precatório movido para Sem Interesse.",
          })

          await loadPrecatorios()
        }}
        initialMotivo={semInteressePrecatorio?.motivo_sem_interesse ?? ""}
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
