"use client"
/* eslint-disable */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  AlertCircle,
  CalendarClock,
  ChevronRight,
  Clock3,
  FileCheck,
  MapPin,
  Paperclip,
  ScrollText,
  Search,
  SlidersHorizontal,
  User,
  Users2,
} from "@/components/icons"

import { getSupabase } from "@/lib/supabase/client"
import { UploadOficioModal } from "@/components/precatorios/upload-oficio-modal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SpotlightCard } from "@/components/ui/spotlight-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PrecatOficio {
  id: string
  credor_nome?: string
  credor_cpf_cnpj?: string
  credor_cidade?: string
  credor_uf?: string
  numero_processo?: string
  numero_precatorio?: string
  responsavel?: string
  usuarios?: { nome: string } | null
  responsavel_nome?: string
  created_at: string
  status_kanban?: string
  file_url?: string | null
}

const glassCard =
  "rounded-[1.35rem] border border-default-200/75 dark:border-border/75 " +
  "bg-content1/92 dark:bg-black/95 shadow-[0_24px_50px_-34px_hsl(240_30%_40%/0.18)] backdrop-blur-xl"

const cardSoft =
  "rounded-[1.25rem] border border-default-200/75 dark:border-border/75 " +
  "bg-content1/82 dark:bg-black/75 shadow-[0_18px_38px_-30px_hsl(240_20%_40%/0.14)]"

const STATUS_OFICIO_LABELS: Record<string, string> = {
  pendente: "Pendente",
  anexado: "Anexado",
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pendente: "border-warning/40 bg-warning/10 text-warning",
  anexado: "border-success/40 bg-success/10 text-success",
}

function normalizeText(value?: string | null): string {
  if (!value) return ""
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export default function GestaoOficiosPage() {
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatOficio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadPrecatorioId, setUploadPrecatorioId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")

  const carregarDados = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        setError("Usuário não autenticado.")
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from("precatorios")
        .select(
          `
            id,
            credor_nome,
            credor_cpf_cnpj,
            credor_cidade,
            credor_uf,
            numero_processo,
            numero_precatorio,
            responsavel,
            created_at,
            status_kanban,
            file_url,
            usuarios!responsavel(nome)
          `
        )
        .or(`status_kanban.eq.aguardando_oficio,responsavel_oficio_id.eq.${currentUser.id}`)
        .is("file_url", null)
        .order("created_at", { ascending: true })

      if (fetchError) {
        console.error("[Ofícios] Erro ao carregar fila:", fetchError)
        setError("Erro ao carregar fila de ofícios.")
        setLoading(false)
        return
      }

      const formatted = (data || []).map((item: any) => ({
        ...item,
        responsavel_nome: item.usuarios?.nome || "Sem responsável",
      }))

      setPrecatorios(formatted)
      setError(null)
      setLoading(false)
    } catch (err) {
      console.error("[Ofícios] Erro inesperado:", err)
      setError("Ocorreu um erro inesperado.")
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const handleAbrirDetalhes = (id: string) => {
    router.push(`/precatorios/detalhes?id=${id}`)
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleAbrirUpload(id)
    }
  }

  const handleAbrirUpload = (precatorioId: string) => {
    setUploadPrecatorioId(precatorioId)
    setUploadOpen(true)
  }

  const handleUploadOpenChange = (open: boolean) => {
    setUploadOpen(open)
    if (!open) setUploadPrecatorioId(null)
  }

  const resumo = useMemo(() => {
    const total = precatorios.length
    const semResponsavel = precatorios.filter((p) => normalizeText(p.responsavel_nome).includes("sem responsavel")).length
    const comResponsavel = total - semResponsavel
    const diasMaisAntigo = total
      ? Math.max(
          ...precatorios.map((p) => {
            const createdAt = new Date(p.created_at).getTime()
            if (Number.isNaN(createdAt)) return 0
            return Math.max(0, Math.floor((Date.now() - createdAt) / 86400000))
          })
        )
      : 0

    return { total, semResponsavel, comResponsavel, diasMaisAntigo }
  }, [precatorios])

  const precatoriosFiltrados = useMemo(() => {
    const termo = normalizeText(searchTerm.trim())

    return precatorios.filter((p) => {
      const statusAtual = p.file_url ? "anexado" : "pendente"
      if (statusFiltro !== "todos" && statusAtual !== statusFiltro) return false
      if (!termo) return true

      const blocoBusca = normalizeText(
        [
          p.credor_nome,
          p.credor_cpf_cnpj,
          p.credor_cidade,
          p.credor_uf,
          p.numero_processo,
          p.numero_precatorio,
          p.responsavel_nome,
        ]
          .filter(Boolean)
          .join(" ")
      )

      return blocoBusca.includes(termo)
    })
  }, [precatorios, searchTerm, statusFiltro])

  const precatorioSelecionadoUpload = useMemo(
    () => precatorios.find((item) => item.id === uploadPrecatorioId) || null,
    [precatorios, uploadPrecatorioId]
  )

  const filtrosAtivos = searchTerm.trim().length > 0 || statusFiltro !== "todos"

  if (loading) {
    return (
      <div className="oficios-revamp mx-auto max-w-7xl space-y-4 p-6">
        <div className={`h-40 ${glassCard}`} />
        <div className={`h-16 ${glassCard}`} />
        <div className={`h-80 ${cardSoft}`} />
      </div>
    )
  }

  return (
    <div className="oficios-revamp container mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">

      {/* ── HERO ── */}
      <div className={`${glassCard} oficios-hero-card p-5 md:p-6`}>
        {/* Título + descrição + contagem */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/40 mb-1">
              Fila Operacional · Ofícios
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Ofícios</h1>
            <p className="mt-1 text-sm text-foreground/60 max-w-lg">
              Fila operacional para anexar ofício requisitório com ação rápida e leitura de contexto.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-5xl font-black tabular-nums leading-none text-foreground">{resumo.total}</span>
            <span className="text-xs text-foreground/50 uppercase tracking-wide">na fila</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-default-200/60 rounded-2xl border border-default-200/60 bg-content2/30 overflow-hidden">
          <div className="flex flex-col gap-0.5 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-md bg-default-100 p-1.5 text-foreground/60">
                <Users2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] uppercase tracking-wide text-foreground/50">Sem responsável</span>
            </div>
            <span className="text-3xl font-bold tabular-nums text-foreground">{resumo.semResponsavel}</span>
          </div>
          <div className="flex flex-col gap-0.5 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-md bg-success/10 p-1.5 text-success">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] uppercase tracking-wide text-foreground/50">Com responsável</span>
            </div>
            <span className="text-3xl font-bold tabular-nums text-foreground">{resumo.comResponsavel}</span>
          </div>
          <div className="flex flex-col gap-0.5 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-md bg-warning/10 p-1.5 text-warning">
                <Clock3 className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] uppercase tracking-wide text-foreground/50">Processo mais antigo</span>
            </div>
            <span className="text-3xl font-bold tabular-nums text-foreground">
              {resumo.diasMaisAntigo}<span className="text-lg font-medium text-foreground/50 ml-1">d</span>
            </span>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── BUSCA ── */}
      <div className={`${glassCard} oficios-search-card p-3 md:p-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Credor, CPF/CNPJ, processo, precatório, cidade ou responsável..."
              className="h-10 border-default-200/70 bg-content2/50 pl-9 pr-3"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-10 w-[160px] border-default-200/70 bg-content2/50">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-foreground/50" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(STATUS_OFICIO_LABELS).map(([s, l]) => (
                  <SelectItem key={s} value={s}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-foreground/50 tabular-nums whitespace-nowrap">
              {precatoriosFiltrados.length}/{precatorios.length}
            </span>
            {filtrosAtivos && (
              <Button variant="ghost" size="sm" className="h-10 px-3 text-foreground/55"
                onClick={() => { setSearchTerm(""); setStatusFiltro("todos") }}>
                Limpar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── LISTA ── */}
      {precatoriosFiltrados.length === 0 ? (
        <div className={`${cardSoft} flex flex-col items-center justify-center gap-3 py-16 text-center`}>
          <div className="rounded-2xl border border-default-200/60 bg-content2/50 p-4">
            <ScrollText className="h-8 w-8 text-foreground/35" />
          </div>
          <p className="text-base font-semibold text-foreground">
            {precatorios.length === 0 ? "Fila vazia" : "Nenhum resultado"}
          </p>
          <p className="text-sm text-foreground/55">
            {precatorios.length === 0
              ? 'Processos em "Aguardando ofício" aparecerão aqui.'
              : "Ajuste o filtro ou o termo de busca."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {precatoriosFiltrados.map((p, index) => {
            const statusKey = p.file_url ? "anexado" : "pendente"
            const statusLabel = STATUS_OFICIO_LABELS[statusKey]
            const statusClass = STATUS_BADGE_CLASSES[statusKey]
            const dataEntrada = format(new Date(p.created_at), "dd/MM/yy", { locale: ptBR })
            const diasNaFila = Math.max(0, Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000))
            const urgente = diasNaFila > 30

            return (
              <SpotlightCard key={p.id} className="h-full w-full rounded-2xl" spotlightColor="hsl(230 60% 55% / 0.15)">
                <Card
                  role="button"
                  tabIndex={0}
                  className={[
                    "group relative flex h-full w-full flex-col rounded-2xl overflow-hidden",
                    "border bg-content1/95 transition-all duration-200",
                    urgente
                      ? "border-warning/40 hover:border-warning/60"
                      : "border-default-200/70 hover:border-slate-300/70 dark:hover:border-slate-600/50",
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  ].join(" ")}
                  onClick={() => handleAbrirUpload(p.id)}
                  onKeyDown={(event) => handleCardKeyDown(event, p.id)}
                >
                  {/* Faixa lateral de urgência */}
                  {urgente && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-warning rounded-l-2xl" />
                  )}

                  {/* Cabeçalho da fila */}
                  <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tabular-nums text-foreground/25 group-hover:text-foreground/40 transition-colors">
                        #{String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="h-3.5 w-px bg-default-200/70" />
                      <FileCheck className="h-3.5 w-3.5 text-foreground/35" />
                    </div>
                    <Badge variant="outline" className={`border text-[11px] px-2 py-0 h-5 ${statusClass}`}>
                      {statusLabel}
                    </Badge>
                  </div>

                  {/* Credor */}
                  <div className="px-4 pb-3">
                    <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2"
                      title={p.credor_nome || undefined}>
                      {p.credor_nome || "Credor não informado"}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-foreground/45 truncate">
                      {p.credor_cpf_cnpj || "—"}
                    </p>
                  </div>

                  {/* Processo */}
                  <div className="mx-4 mb-3 rounded-xl border border-default-200/55 bg-content2/35 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-widest text-foreground/40 mb-0.5">Processo</p>
                    <p className="font-mono text-[13px] font-semibold text-foreground truncate">
                      {p.numero_processo || "N/A"}
                    </p>
                    {p.numero_precatorio && (
                      <p className="text-[10px] text-foreground/45 truncate mt-0.5">
                        {p.numero_precatorio}
                      </p>
                    )}
                  </div>

                  {/* Meta */}
                  <CardContent className="flex-1 px-4 pt-0 pb-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-foreground/55">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.responsavel_nome || "Sem responsável"}</span>
                    </div>
                    {(p.credor_cidade || p.credor_uf) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-foreground/55">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{p.credor_cidade || "—"}{p.credor_uf ? `/${p.credor_uf}` : ""}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-foreground/55">
                      <CalendarClock className="h-3 w-3 shrink-0" />
                      <span>{dataEntrada}</span>
                      <span className={`ml-auto font-medium ${urgente ? "text-warning" : "text-foreground/40"}`}>
                        {diasNaFila}d
                      </span>
                    </div>
                  </CardContent>

                  {/* Ações */}
                  <div className="grid grid-cols-2 gap-2 border-t border-default-200/50 bg-content2/20 px-3 py-2.5">
                    <Button size="sm" variant="ghost"
                      className="h-8 rounded-xl text-xs text-foreground/60 hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); handleAbrirDetalhes(p.id) }}>
                      <ChevronRight className="mr-1 h-3.5 w-3.5" />
                      Detalhes
                    </Button>
                    <button
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-3 text-xs font-semibold text-white shadow-[0_6px_20px_-8px_rgba(249,115,22,0.70)] transition hover:from-orange-400 hover:to-amber-500"
                      onClick={(e) => { e.stopPropagation(); handleAbrirUpload(p.id) }}>
                      <Paperclip className="h-3.5 w-3.5" />
                      Anexar
                    </button>
                  </div>
                </Card>
              </SpotlightCard>
            )
          })}
        </div>
      )}

      {uploadPrecatorioId && (
        <UploadOficioModal
          open={uploadOpen}
          onOpenChange={handleUploadOpenChange}
          precatorioId={uploadPrecatorioId}
          credorNome={precatorioSelecionadoUpload?.credor_nome}
          numeroProcesso={precatorioSelecionadoUpload?.numero_processo}
          numeroPrecatorio={precatorioSelecionadoUpload?.numero_precatorio}
          onSuccess={() => {
            void carregarDados()
          }}
        />
      )}
    </div>
  )
}
