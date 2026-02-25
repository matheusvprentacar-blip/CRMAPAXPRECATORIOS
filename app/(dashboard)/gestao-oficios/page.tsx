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
  FileText,
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
import { Separator } from "@/components/ui/separator"
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
  "bg-content1/92 dark:bg-black/95 shadow-[0_24px_50px_-34px_hsl(var(--primary)/0.42)] backdrop-blur-xl"

const cardSoft =
  "rounded-[1.25rem] border border-default-200/75 dark:border-border/75 " +
  "bg-content1/82 dark:bg-black/75 shadow-[0_18px_38px_-30px_hsl(var(--primary)/0.35)]"

const oficiosGridRows = "auto-rows-auto items-stretch"
const oficiosCardHeight = "h-full min-h-[388px]"

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
    <div className="oficios-revamp container mx-auto max-w-[1400px] space-y-4 p-4 md:space-y-5 md:p-6">
      <Card className={`${glassCard} oficios-hero-card`}>
        <CardContent className="space-y-5 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Gestão de Ofícios</h1>
              <p className="max-w-3xl text-sm text-foreground/70 md:text-base">
                Fila operacional para anexar ofício requisitório com ação rápida e leitura de contexto.
              </p>
            </div>
            <Badge variant="secondary" className="h-9 rounded-full px-4 text-sm font-semibold">
              {resumo.total} na fila
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border border-default-200/75 bg-content1/90">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-foreground/65">Total</p>
                  <p className="text-xl font-semibold">{resumo.total}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-default-200/75 bg-content1/90">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-default-100 text-foreground/80">
                  <Users2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-foreground/65">Sem responsável</p>
                  <p className="text-xl font-semibold">{resumo.semResponsavel}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-default-200/75 bg-content1/90">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success/10 text-success">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-foreground/65">Com responsável</p>
                  <p className="text-xl font-semibold">{resumo.comResponsavel}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-default-200/75 bg-content1/90">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-warning/10 text-warning">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-foreground/65">Mais antigo</p>
                  <p className="text-xl font-semibold">{resumo.diasMaisAntigo}d</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className={`${glassCard} oficios-search-card`}>
        <CardContent className="p-3 md:p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por credor, CPF/CNPJ, processo, precatório, cidade ou responsável..."
                className="h-11 border-default-200/70 bg-content2/55 pl-9"
              />
            </div>

            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-11 border-default-200/70 bg-content2/55">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-foreground/65" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(STATUS_OFICIO_LABELS).map(([status, label]) => (
                  <SelectItem key={status} value={status}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              className="h-11 px-4"
              disabled={!filtrosAtivos}
              onClick={() => {
                setSearchTerm("")
                setStatusFiltro("todos")
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {precatoriosFiltrados.length === 0 ? (
        <Card className={`${cardSoft} min-h-[280px]`}>
          <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-foreground/70">
            <ScrollText className="h-12 w-12 opacity-50" />
            <p className="text-lg font-medium text-foreground">
              {precatorios.length === 0 ? "Nenhum precatório nesta fila" : "Nenhum resultado para os filtros aplicados"}
            </p>
            <p className="text-sm">
              {precatorios.length === 0
                ? 'Processos em "Aguardando ofício" aparecerão aqui.'
                : "Ajuste o termo da busca ou o status selecionado para ampliar os resultados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${oficiosGridRows}`}>
          {precatoriosFiltrados.map((p, index) => {
            const statusKey = p.file_url ? "anexado" : "pendente"
            const statusLabel = STATUS_OFICIO_LABELS[statusKey]
            const statusClass = STATUS_BADGE_CLASSES[statusKey]
            const dataEntrada = format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })

            return (
              <SpotlightCard key={p.id} className="h-full w-full rounded-[1.2rem]" spotlightColor="hsl(var(--primary) / 0.26)">
                <Card
                  role="button"
                  tabIndex={0}
                  className={[
                    `${oficiosCardHeight} w-full min-w-0 rounded-[1.2rem] border border-default-200/75 bg-content1/92`,
                    "flex flex-col",
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                    "hover:border-primary/35 hover:bg-content1/100 transition",
                    "relative overflow-hidden",
                    "before:pointer-events-none before:absolute before:inset-0 before:opacity-80",
                    "before:bg-[linear-gradient(145deg,rgba(255,255,255,0.2)_0%,transparent_26%,transparent_72%,rgba(255,166,63,0.15)_100%)]",
                  ].join(" ")}
                  onClick={() => handleAbrirUpload(p.id)}
                  onKeyDown={(event) => handleCardKeyDown(event, p.id)}
                >
                  <div className="flex items-center justify-between px-4 pt-4">
                    <div className="rounded-xl border border-primary/25 bg-primary/10 p-2.5 text-primary">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className={`border ${statusClass}`}>
                      {statusLabel}
                    </Badge>
                  </div>

                  <div className="px-4 pb-3 pt-3">
                    <p
                      title={p.credor_nome || "Credor não informado"}
                      className="line-clamp-2 text-sm font-semibold leading-5 text-orange-600 dark:text-orange-400"
                    >
                      {p.credor_nome || "Credor não informado"}
                    </p>
                    <p className="mt-1 text-[12px] leading-4 text-foreground/60">
                      {p.credor_cpf_cnpj || "CPF/CNPJ não informado"}
                    </p>
                    <p className="mt-1 text-[12px] leading-4 text-foreground/60">
                      {p.credor_cidade ? `${p.credor_cidade}/${p.credor_uf || "--"}` : "Cidade/UF não informado"}
                    </p>
                    <p className="mt-1 text-[12px] leading-4 text-foreground/50">Entrada: {dataEntrada}</p>
                  </div>

                  <Separator className="opacity-60" />

                  <CardContent className="flex-1 space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full border border-default-200/65 bg-content2/55 text-xs font-mono">
                        #{String(index + 1).padStart(2, "0")}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border border-default-200/65 bg-content2/55 text-xs">
                        Etapa de ofícios
                      </Badge>
                    </div>

                    <div className="rounded-xl border border-default-200/65 bg-content2/50 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-foreground/60">Processo principal</p>
                      <p className="truncate font-mono text-sm font-semibold text-foreground">
                        {p.numero_processo || "N/A"}
                      </p>
                      <p className="truncate text-[11px] text-foreground/60">
                        Precatório: {p.numero_precatorio || "N/A"}
                      </p>
                    </div>

                    <div className="min-h-[42px] space-y-1 text-xs text-foreground/70">
                      <div className="inline-flex max-w-full items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate">Responsável: {p.responsavel_nome || "Sem responsável"}</span>
                      </div>
                      <div className="inline-flex max-w-full items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">
                          Localidade: {p.credor_cidade || "Cidade n/d"}{p.credor_uf ? `/${p.credor_uf}` : ""}
                        </span>
                      </div>
                      <div className="inline-flex max-w-full items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        <span className="truncate">Criado em: {dataEntrada}</span>
                      </div>
                    </div>
                  </CardContent>

                  <Separator className="opacity-60" />

                  <div className="mt-auto grid grid-cols-2 gap-2 p-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleAbrirDetalhes(p.id)
                      }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        Abrir
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="oficios-attach-btn rounded-full"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleAbrirUpload(p.id)
                      }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5" />
                        Anexar
                      </span>
                    </Button>
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
