"use client"
/* eslint-disable */

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { SpotlightCard } from "@/components/ui/spotlight-card"
import {
  Button,
  Chip,
  Modal,
  Spinner,
  Dropdown,
  Label,
  Input,
  NumberField,
  TextArea
} from "@heroui/react"
import { FileSearch, Search, User, FileText, CalendarClock, Scale, Wallet, AlertTriangle } from "@/components/icons"
import { getSupabase } from "@/lib/supabase/client"

const glassCard =
  "rounded-[1.35rem] border border-default-200/75 dark:border-border/75 " +
  "bg-content1/92 dark:bg-black/95 shadow-[0_24px_50px_-34px_hsl(240_30%_40%/0.18)] backdrop-blur-xl"

const cardSoft =
  "rounded-[1.25rem] border border-default-200/75 dark:border-border/75 " +
  "bg-content1/82 dark:bg-black/75 shadow-[0_18px_38px_-30px_hsl(240_20%_40%/0.14)]"

interface PrecatorioAnalise {
  id: string
  titulo?: string | null
  credor_nome?: string | null
  credor_cpf_cnpj?: string | null
  numero_processo?: string | null
  numero_precatorio?: string | null
  tribunal?: string | null
  created_at: string
  status_kanban?: string | null
  localizacao_kanban?: string | null
  status?: string | null
  analise_penhora?: boolean | null
  analise_cessao?: boolean | null
  analise_herdeiros?: string | null
  analise_viavel?: boolean | null
  analise_itcmd?: boolean | null
  analise_penhora_valor?: number | null
  analise_penhora_percentual?: number | null
  analise_cessao_valor?: number | null
  analise_cessao_percentual?: number | null
  analise_adiantamento_valor?: number | null
  analise_adiantamento_percentual?: number | null
  analise_honorarios_valor?: number | null
  analise_honorarios_percentual?: number | null
  analise_observacoes?: string | null
  analise_itcmd_valor?: number | null
  analise_itcmd_percentual?: number | null
}

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string
  value: number
  icon: ReactNode
  tone?: "default" | "primary" | "warning"
}) {
  const toneClasses =
    tone === "primary"
      ? "border-primary/30 bg-primary/10"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10"
        : "border-default-200/70 bg-content2/40"

  return (
    <Card className={`border ${toneClasses} rounded-2xl`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-foreground/60">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          </div>
          <div className="rounded-xl border border-default-200/60 bg-content1/70 p-2 text-foreground/70">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function Banner({ type = "info", children }: { type?: "info" | "danger" | "warning"; children: ReactNode }) {
  const styles =
    type === "danger"
      ? "border-danger/30 bg-danger/10 text-danger-700 dark:text-danger-300"
      : type === "warning"
        ? "border-warning/30 bg-warning/10 text-warning-700 dark:text-warning-300"
        : "border-primary/25 bg-primary/10 text-foreground"

  return (
    <Card className={`border rounded-2xl ${styles}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 text-sm leading-relaxed">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{children}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function setFromSelect(value: string | null | undefined) {
  return value ?? "indefinido"
}

export default function AnaliseProcessualPage() {
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioAnalise[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analiseModalOpen, setAnaliseModalOpen] = useState(false)
  const [analiseSaving, setAnaliseSaving] = useState(false)
  const [selectedPrecatorio, setSelectedPrecatorio] = useState<PrecatorioAnalise | null>(null)
  const [analiseForm, setAnaliseForm] = useState<any>({})
  const [analysisFieldsAvailable, setAnalysisFieldsAvailable] = useState(true)

  useEffect(() => {
    const carregarDados = async () => {
      const supabase = getSupabase()
      if (!supabase) {
        setLoading(false)
        return
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setError("Usuário não autenticado.")
          setLoading(false)
          return
        }

        const baseSelect = `
          id,
          titulo,
          credor_nome,
          credor_cpf_cnpj,
          numero_processo,
          numero_precatorio,
          tribunal,
          created_at,
          status,
          status_kanban,
          localizacao_kanban
        `

        const fullSelect = `
          ${baseSelect},
          analise_penhora,
          analise_cessao,
          analise_herdeiros,
          analise_viavel,
          analise_itcmd,
          analise_penhora_valor,
          analise_penhora_percentual,
          analise_cessao_valor,
          analise_cessao_percentual,
          analise_adiantamento_valor,
          analise_adiantamento_percentual,
          analise_honorarios_valor,
          analise_honorarios_percentual,
          analise_observacoes,
          analise_itcmd_valor,
          analise_itcmd_percentual
        `

        const buildQuery = (selectClause: string) =>
          supabase
            .from("precatorios")
            .select(selectClause)
            .or(
              "status_kanban.eq.analise_processual_inicial,localizacao_kanban.eq.analise_processual_inicial,status.eq.analise_processual_inicial",
            )
            .order("created_at", { ascending: true })

        const { data, error: fetchError } = await buildQuery(fullSelect)

        if (fetchError) {
          const message = String(fetchError.message || fetchError.details || "")
          const missingColumns =
            message.trim().length === 0 ||
            message.includes("does not exist") ||
            message.includes("column") ||
            message.includes("schema")

          if (missingColumns) {
            setAnalysisFieldsAvailable(false)
            const { data: fallbackData, error: fallbackError } = await buildQuery(baseSelect)
            if (fallbackError) {
              console.error("[Analise Processual] Erro ao carregar:", fallbackError)
              setError("Erro ao carregar a fila de análise processual.")
              setLoading(false)
              return
            }
            setPrecatorios((fallbackData as PrecatorioAnalise[]) || [])
            setError(null)
            setLoading(false)
            return
          }

          console.error("[Analise Processual] Erro ao carregar:", fetchError)
          setError("Erro ao carregar a fila de análise processual.")
          setLoading(false)
          return
        }

        setPrecatorios((data as PrecatorioAnalise[]) || [])
        setAnalysisFieldsAvailable(true)
        setLoading(false)
      } catch (err) {
        console.error("[Analise Processual] Erro inesperado:", err)
        setError("Ocorreu um erro inesperado.")
        setLoading(false)
      }
    }

    carregarDados()
  }, [])

  const filteredPrecatorios = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return precatorios
    return precatorios.filter((p) =>
      [p.titulo, p.credor_nome, p.numero_precatorio, p.numero_processo, p.tribunal]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [precatorios, searchTerm])

  const analisesRegistradas = useMemo(() => {
    return filteredPrecatorios.filter((p) => {
      return (
        p.analise_penhora !== null ||
        p.analise_cessao !== null ||
        p.analise_viavel !== null ||
        p.analise_itcmd !== null ||
        (p.analise_herdeiros !== null && p.analise_herdeiros !== undefined && String(p.analise_herdeiros).trim() !== "") ||
        (p.analise_observacoes !== null && p.analise_observacoes !== undefined && String(p.analise_observacoes).trim() !== "")
      )
    }).length
  }, [filteredPrecatorios])

  const pendentesAnalise = Math.max(0, filteredPrecatorios.length - analisesRegistradas)

  const comDadosIncompletos = useMemo(() => {
    return filteredPrecatorios.filter((p) => {
      const semProcesso = !p.numero_processo || p.numero_processo.toUpperCase() === "N/A"
      const semCredor = !p.credor_nome || p.credor_nome.trim() === ""
      return semProcesso || semCredor
    }).length
  }, [filteredPrecatorios])

  const booleanSelectValue = (value: boolean | null | undefined) => {
    if (value === true) return "true"
    if (value === false) return "false"
    return "indefinido"
  }

  const selectValueToBoolean = (value: string) => {
    if (value === "true") return true
    if (value === "false") return false
    return null
  }

  const setFormField = (field: string, value: any) => {
    setAnaliseForm((prev: any) => ({ ...prev, [field]: value }))
  }

  const setFormNumber = (field: string, value: number | null | undefined) => {
    const next = typeof value === "number" && Number.isFinite(value) ? value : ""
    setAnaliseForm((prev: any) => ({ ...prev, [field]: next }))
  }

  const numberFieldValue = (value: any): number | undefined => {
    if (value === "" || value === null || value === undefined) return undefined
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
  }

  const closeAnaliseModal = () => {
    setAnaliseModalOpen(false)
    setSelectedPrecatorio(null)
    setAnaliseForm({})
  }

  const openAnaliseModal = (precatorio: PrecatorioAnalise) => {
    setSelectedPrecatorio(precatorio)
    setAnaliseForm({
      analise_penhora: precatorio.analise_penhora ?? null,
      analise_cessao: precatorio.analise_cessao ?? null,
      analise_herdeiros: precatorio.analise_herdeiros ?? null,
      analise_viavel: precatorio.analise_viavel ?? null,
      analise_itcmd: precatorio.analise_itcmd ?? null,
      analise_penhora_valor: precatorio.analise_penhora_valor ?? "",
      analise_penhora_percentual: precatorio.analise_penhora_percentual ?? "",
      analise_cessao_valor: precatorio.analise_cessao_valor ?? "",
      analise_cessao_percentual: precatorio.analise_cessao_percentual ?? "",
      analise_adiantamento_valor: precatorio.analise_adiantamento_valor ?? "",
      analise_adiantamento_percentual: precatorio.analise_adiantamento_percentual ?? "",
      analise_honorarios_valor: precatorio.analise_honorarios_valor ?? "",
      analise_honorarios_percentual: precatorio.analise_honorarios_percentual ?? "",
      analise_observacoes: precatorio.analise_observacoes ?? "",
      analise_itcmd_valor: precatorio.analise_itcmd_valor ?? "",
      analise_itcmd_percentual: precatorio.analise_itcmd_percentual ?? "",
    })
    setAnaliseModalOpen(true)
  }

  const handleSalvarAnalise = async () => {
    if (!selectedPrecatorio) return
    const supabase = getSupabase()
    if (!supabase) return
    if (!analysisFieldsAvailable) {
      setError("Campos de análise processual não disponíveis no banco.")
      return
    }

    const toNumberOrNull = (value: any) => {
      if (value === "" || value === null || value === undefined) return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    setAnaliseSaving(true)
    try {
      const payload = {
        analise_penhora: analiseForm.analise_penhora ?? null,
        analise_cessao: analiseForm.analise_cessao ?? null,
        analise_herdeiros: analiseForm.analise_herdeiros ?? null,
        analise_viavel: analiseForm.analise_viavel ?? null,
        analise_itcmd: analiseForm.analise_itcmd ?? null,
        analise_penhora_valor: toNumberOrNull(analiseForm.analise_penhora_valor),
        analise_penhora_percentual: toNumberOrNull(analiseForm.analise_penhora_percentual),
        analise_cessao_valor: toNumberOrNull(analiseForm.analise_cessao_valor),
        analise_cessao_percentual: toNumberOrNull(analiseForm.analise_cessao_percentual),
        analise_adiantamento_valor: toNumberOrNull(analiseForm.analise_adiantamento_valor),
        analise_adiantamento_percentual: toNumberOrNull(analiseForm.analise_adiantamento_percentual),
        analise_honorarios_valor: toNumberOrNull(analiseForm.analise_honorarios_valor),
        analise_honorarios_percentual: toNumberOrNull(analiseForm.analise_honorarios_percentual),
        analise_observacoes: analiseForm.analise_observacoes ?? null,
        analise_itcmd_valor: toNumberOrNull(analiseForm.analise_itcmd_valor),
        analise_itcmd_percentual: toNumberOrNull(analiseForm.analise_itcmd_percentual),
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase.from("precatorios").update(payload).eq("id", selectedPrecatorio.id)

      if (updateError) {
        console.error("[Analise Processual] Erro ao salvar:", updateError)
        setError("Não foi possível salvar o resultado da análise.")
        return
      }

      setPrecatorios((prev) => prev.map((item) => (item.id === selectedPrecatorio.id ? { ...item, ...payload } : item)))
      closeAnaliseModal()
    } finally {
      setAnaliseSaving(false)
    }
  }

  const handleAbrir = (id: string) => {
    router.push(`/precatorios/detalhes?id=${id}`)
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-default-200/70 bg-content1/80 px-4 py-3 shadow-sm">
          <Spinner size="sm" />
          <span className="text-sm text-foreground/80">Carregando fila de análise processual...</span>
        </div>
      </div>
    )
  }

  const renderDropdown = (label: string, value: string, setValue: (val: string) => void, options: { id: string, text: string }[]) => {
    const selectedText = options.find(o => o.id === value)?.text || options[0].text;
    return (
      <div className="flex flex-col space-y-1">
        <span className="text-sm font-medium text-foreground/80">{label}</span>
        <Dropdown>
          <Button aria-label={label} variant="outline" className="w-full justify-between h-10 border border-default-200">
            {selectedText}
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu onAction={(key) => setValue(key as string)}>
              {options.map(opt => (
                <Dropdown.Item key={opt.id} id={opt.id} textValue={opt.text}>
                  <Label>{opt.text}</Label>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    )
  }

  const maskCurrency = (value: number | null | undefined) => {
    if (value == null || isNaN(value)) return ""
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const parseCurrencyParams = (value: string) => {
    const numericClean = value.replace(/[^\d]/g, "")
    if (!numericClean) return 0
    return parseFloat(numericClean) / 100
  }

  const renderNumberField = (label: string, value: number | null | undefined, onChange: (val: number) => void) => {
    // Determine if it is a percentage or value field to choose prefix
    const isCurrency = label.toLowerCase().includes("valor")
    const maxVal = isCurrency ? undefined : 100

    const displayValue = isCurrency
      ? maskCurrency(value)
      : (value != null && !isNaN(value) ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "")

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let numericVal = parseCurrencyParams(e.target.value)

      // Se for campo de percentual, limita a 100
      if (!isCurrency && numericVal > 100) {
        numericVal = 100
      }

      onChange(numericVal)
    }

    return (
      <div className="flex flex-col space-y-1">
        <Label className="text-sm font-medium text-foreground/80">{label}</Label>
        <Input
          value={displayValue}
          onChange={handleChange}
          placeholder={isCurrency ? "R$ 0,00" : "0,00"}
          className="h-10 px-3 w-full bg-transparent text-left font-mono"
        />
      </div>
    )
  }

  return (
    <div className="analise-revamp container mx-auto max-w-[1400px] space-y-4 p-4 md:space-y-5 md:p-6">
        <Card className={`${glassCard} analise-hero-card`}>
          <CardContent className="gap-5 p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip size="sm" className="rounded-full" variant="primary">Fila Jurídica</Chip>
                  <Chip size="sm" className="rounded-full" variant="secondary">Pré-cálculo</Chip>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Análise Processual</h1>
                <p className="text-sm text-foreground/70">
                  Triagem jurídica antes do cálculo com foco em viabilidade, pendências e descontos processuais.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Chip className="rounded-full border border-primary text-primary bg-transparent h-10 px-3 text-sm" variant="secondary">
                  {filteredPrecatorios.length} na fila ativa
                </Chip>
                {searchTerm.trim() && (
                  <Button variant="secondary" className="rounded-lg h-10" onPress={() => setSearchTerm("")}>Limpar busca</Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total em análise" value={filteredPrecatorios.length} icon={<FileSearch className="h-4 w-4" />} />
              <StatCard label="Análises registradas" value={analisesRegistradas} icon={<Scale className="h-4 w-4" />} tone="primary" />
              <StatCard label="Pendentes" value={pendentesAnalise} icon={<CalendarClock className="h-4 w-4" />} tone="warning" />
              <StatCard label="Dados incompletos" value={comDadosIncompletos} icon={<User className="h-4 w-4" />} />
            </div>
          </CardContent>
        </Card>

        <Card className={`${glassCard} analise-search-card`}>
          <CardContent className="p-4 lg:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/60" />
                <Input
                  aria-label="Buscar na fila de análise"
                  placeholder="Buscar por credor, processo, precatório ou tribunal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9"
                />
              </div>

              <div className="flex items-center gap-2">
                <Chip size="sm" className="rounded-full" variant="secondary">
                  {filteredPrecatorios.length} resultados
                </Chip>
                <Chip size="sm" className={analysisFieldsAvailable ? "rounded-full" : "rounded-full bg-danger/20 text-danger"} variant={analysisFieldsAvailable ? "primary" : "secondary"}>
                  {analysisFieldsAvailable ? "Campos de análise ok" : "Migration pendente"}
                </Chip>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <Banner type="danger">{error}</Banner>}

        {!analysisFieldsAvailable && (
          <Banner type="warning">
            Campos de análise processual não encontrados no banco. Execute os scripts
            {" "}<span className="font-mono">211-analise-processual-observacoes.sql</span>,
            {" "}<span className="font-mono">212-analise-processual-cessao.sql</span>
            {" "}e <span className="font-mono">213-analise-processual-itcmd.sql</span> para liberar o registro da análise.
          </Banner>
        )}

        {!error && filteredPrecatorios.length === 0 && (
          <Card className={`${cardSoft} rounded-2xl border-dashed border-default-300`}>
            <CardContent className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <div className="rounded-2xl border border-default-200 bg-content2/60 p-3">
                <FileSearch className="h-6 w-6 text-foreground/60" />
              </div>
              <p className="text-lg font-semibold text-foreground">Nenhum precatório nesta fila</p>
              <p className="text-sm text-foreground/60">Novos processos em análise aparecerão aqui.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredPrecatorios.map((p, index) => (
            <SpotlightCard key={p.id} className="h-full w-full rounded-[1.2rem]" spotlightColor="hsl(230 60% 55% / 0.18)">
              <Card
                className={[
                  "group h-full cursor-pointer overflow-hidden rounded-[1.2rem] border border-default-200/80 bg-content1/95 transition-all duration-200",
                  "hover:-translate-y-[1px] hover:border-slate-400/40 dark:hover:border-slate-500/40 hover:shadow-medium",
                  "relative",
                  "before:pointer-events-none before:absolute before:inset-0 before:opacity-80",
                  "before:bg-[linear-gradient(145deg,rgba(255,255,255,0.14)_0%,transparent_26%,transparent_72%,rgba(148,163,184,0.07)_100%)]",
                ].join(" ")}
                onClick={() => handleAbrir(p.id)}
              >
                <CardContent className="flex h-full flex-col gap-4 p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="text-4xl font-black leading-none text-foreground/15 transition-colors group-hover:text-primary/40">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                          <User className="h-3 w-3" /> Credor
                        </div>
                        <p className="truncate text-sm font-semibold text-foreground" title={p.credor_nome || undefined}>
                          {p.credor_nome || "Não informado"}
                        </p>
                        <p className="truncate font-mono text-xs text-foreground/60" title={p.credor_cpf_cnpj || undefined}>
                          {p.credor_cpf_cnpj || "CPF/CNPJ n/d"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Chip size="sm" className="rounded-full" variant="primary">Análise processual</Chip>
                      {p.analise_viavel === true && <Chip size="sm" className="rounded-full bg-success/20 text-success" variant="secondary">Viável</Chip>}
                      {p.analise_viavel === false && <Chip size="sm" className="rounded-full bg-danger/20 text-danger" variant="secondary">Não viável</Chip>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="min-w-0 rounded-xl border border-default-200/70 bg-content2/40 p-3 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                        <FileText className="h-3 w-3" /> Processo
                      </div>
                      <p className="truncate font-mono text-sm font-medium text-foreground" title={p.numero_processo || undefined}>
                        {p.numero_processo || "N/A"}
                      </p>
                      <p className="truncate text-xs text-foreground/60" title={p.numero_precatorio || undefined}>
                        {p.numero_precatorio || "Precatório N/A"}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-xl border border-default-200/70 bg-content2/40 p-3 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                        <CalendarClock className="h-3 w-3" /> Data
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-"}
                      </p>
                      <p className="truncate text-xs text-foreground/60" title={p.tribunal || undefined}>
                        {p.tribunal || "Tribunal n/d"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-default-200/70 bg-content2/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">Status</p>
                    <p className="mt-1 truncate text-sm font-semibold text-orange-600 dark:text-orange-400" title={p.titulo || undefined}>
                      {p.titulo || "Sem título"}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center gap-3">
                    <p className="min-w-0 flex-1 truncate text-xs text-foreground/60" title={p.tribunal || undefined}>
                      {p.tribunal || "Tribunal n/d"}
                    </p>

                    {analysisFieldsAvailable ? (
                      <Button
                        size="sm"
                        className="ml-auto shrink-0 rounded-full font-medium bg-primary text-primary-foreground shadow-sm hover:brightness-110"
                        color="primary"
                        variant="solid"
                        onPress={(e: any) => {
                          e?.stopPropagation?.()
                          openAnaliseModal(p)
                        }}
                      >
                        Registrar análise
                      </Button>
                    ) : (
                      <p className="ml-auto shrink-0 text-[10px] text-foreground/60">Aguarde DB</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </SpotlightCard>
          ))}
        </div>

      <Modal isOpen={analiseModalOpen} onOpenChange={(open) => { if (!open) closeAnaliseModal() }}>
        <Modal.Backdrop className="bg-black/60 backdrop-blur-[4px] supports-[backdrop-filter]:bg-black/50">
          <Modal.Container className="p-2 sm:p-4 flex items-center justify-center">
            <Modal.Dialog className="w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-default-200/75 bg-content1 shadow-[0_30px_85px_-45px_hsl(var(--primary)/0.58)] mx-auto max-h-[90vh] flex flex-col">
              <Modal.CloseTrigger className="absolute right-3 top-3" />
              <Modal.Header className="flex flex-col gap-2 border-b border-default-200/70 px-5 pb-4 pt-5 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip size="sm" className="rounded-full" variant="primary">Análise Processual</Chip>
                  {selectedPrecatorio?.tribunal && (
                    <Chip size="sm" className="rounded-full" variant="secondary">{selectedPrecatorio.tribunal}</Chip>
                  )}
                </div>
                <div>
                  <Modal.Heading className="text-lg font-semibold leading-tight">Resultado da análise processual</Modal.Heading>
                  {selectedPrecatorio && (
                    <p className="mt-1 text-sm text-foreground/60">
                      {selectedPrecatorio.credor_nome || "Credor não informado"} - {selectedPrecatorio.numero_processo || "Processo N/A"}
                    </p>
                  )}
                </div>
              </Modal.Header>

              <Modal.Body className="gap-5 px-5 py-5 sm:px-6 overflow-y-auto">
                <Card className="rounded-2xl border border-default-200/70 bg-content2/40">
                  <CardContent className="gap-4 p-4">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Parecer jurídico inicial</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {renderDropdown("Penhora", booleanSelectValue(analiseForm.analise_penhora), (val) => setFormField("analise_penhora", selectValueToBoolean(val)), [
                        { id: "indefinido", text: "Não informado" }, { id: "true", text: "Sim" }, { id: "false", text: "Não" }
                      ])}

                      {renderDropdown("Cessão", booleanSelectValue(analiseForm.analise_cessao), (val) => setFormField("analise_cessao", selectValueToBoolean(val)), [
                        { id: "indefinido", text: "Não informado" }, { id: "true", text: "Sim" }, { id: "false", text: "Não" }
                      ])}

                      {renderDropdown("Herdeiros habilitados", setFromSelect(analiseForm.analise_herdeiros === true ? "Sim" : analiseForm.analise_herdeiros === false ? "Não" : analiseForm.analise_herdeiros), (val) => setFormField("analise_herdeiros", val === "indefinido" ? null : val), [
                        { id: "indefinido", text: "Não informado" }, { id: "Sim", text: "Sim" }, { id: "Não", text: "Não" }
                      ])}

                      {renderDropdown("Viabilidade do crédito", booleanSelectValue(analiseForm.analise_viavel), (val) => setFormField("analise_viavel", selectValueToBoolean(val)), [
                        { id: "indefinido", text: "Não informado" }, { id: "true", text: "Viável" }, { id: "false", text: "Não viável" }
                      ])}

                      {renderDropdown("ITCMD", booleanSelectValue(analiseForm.analise_itcmd), (val) => setFormField("analise_itcmd", selectValueToBoolean(val)), [
                        { id: "indefinido", text: "Não informado" }, { id: "true", text: "Sim" }, { id: "false", text: "Não" }
                      ])}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-default-200/70 bg-content2/40">
                  <CardContent className="gap-4 p-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Valores e percentuais</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {analiseForm.analise_penhora === true && (
                        <>
                          {renderNumberField("Penhora valor", analiseForm.analise_penhora_valor, (val) => setFormNumber("analise_penhora_valor", val))}
                          {renderNumberField("Penhora percentual (%)", analiseForm.analise_penhora_percentual, (val) => setFormNumber("analise_penhora_percentual", val))}
                        </>
                      )}

                      {analiseForm.analise_cessao === true && (
                        <>
                          {renderNumberField("Cessão valor", analiseForm.analise_cessao_valor, (val) => setFormNumber("analise_cessao_valor", val))}
                          {renderNumberField("Cessão percentual (%)", analiseForm.analise_cessao_percentual, (val) => setFormNumber("analise_cessao_percentual", val))}
                        </>
                      )}

                      {analiseForm.analise_itcmd === true && (
                        <>
                          {renderNumberField("ITCMD valor", analiseForm.analise_itcmd_valor, (val) => setFormNumber("analise_itcmd_valor", val))}
                          {renderNumberField("ITCMD percentual (%)", analiseForm.analise_itcmd_percentual, (val) => setFormNumber("analise_itcmd_percentual", val))}
                        </>
                      )}

                      {renderNumberField("Adiantamento recebido valor", analiseForm.analise_adiantamento_valor, (val) => setFormNumber("analise_adiantamento_valor", val))}
                      {renderNumberField("Adiantamento recebido percentual (%)", analiseForm.analise_adiantamento_percentual, (val) => setFormNumber("analise_adiantamento_percentual", val))}
                      {renderNumberField("Honorários contratuais valor", analiseForm.analise_honorarios_valor, (val) => setFormNumber("analise_honorarios_valor", val))}
                      {renderNumberField("Honorários contratuais percentual (%)", analiseForm.analise_honorarios_percentual, (val) => setFormNumber("analise_honorarios_percentual", val))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border border-default-200/70 bg-content2/40">
                  <CardContent className="p-4 space-y-1.5 flex flex-col">
                    <Label>Observações da análise</Label>
                    <TextArea
                      className="w-full min-h-[120px] resize-y"
                      rows={4}
                      variant="secondary"
                      value={analiseForm.analise_observacoes || ""}
                      onChange={(e) => setFormField("analise_observacoes", e.target.value)}
                      placeholder="Ex.: identificar necessidade de certidões, habilitação de herdeiros, risco de penhora, documentos faltantes..."
                    />
                  </CardContent>
                </Card>
              </Modal.Body>

              <Modal.Footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end px-5 py-4 sm:px-6 border-t border-default-200/70">
                <Button variant="secondary" className="h-11" onPress={closeAnaliseModal} isDisabled={analiseSaving}>
                  Cancelar
                </Button>
                <Button color="primary" variant="solid" className="h-11 gap-2 font-medium bg-primary text-primary-foreground shadow-sm hover:brightness-110" onPress={handleSalvarAnalise} isDisabled={analiseSaving}>
                  {analiseSaving ? <Spinner size="sm" color="current" /> : null}
                  {analiseSaving ? "Salvando..." : "Salvar resultado"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}

