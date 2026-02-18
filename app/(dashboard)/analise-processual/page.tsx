"use client"
/* eslint-disable */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FileSearch, Search, User, FileText, CalendarClock } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"

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

      const { error: updateError } = await supabase
        .from("precatorios")
        .update(payload)
        .eq("id", selectedPrecatorio.id)

      if (updateError) {
        console.error("[Analise Processual] Erro ao salvar:", updateError)
        setError("Não foi possível salvar o resultado da análise.")
        return
      }

      setPrecatorios((prev) =>
        prev.map((item) => (item.id === selectedPrecatorio.id ? { ...item, ...payload } : item)),
      )
      setAnaliseModalOpen(false)
    } finally {
      setAnaliseSaving(false)
    }
  }

  const handleAbrir = (id: string) => {
    router.push(`/precatorios/detalhes?id=${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 container mx-auto p-6 max-w-7xl">
      <Card className="overflow-hidden border border-border/80 bg-card shadow-sm">
        <CardContent className="space-y-6 p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Análise Processual</h1>
              <p className="text-muted-foreground">
                Triagem jurídica antes do cálculo com foco em pendências e viabilidade.
              </p>
            </div>
            <Badge
              variant="outline"
              className="w-fit rounded-full border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200"
            >
              {filteredPrecatorios.length} na fila ativa
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total em análise</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{filteredPrecatorios.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08]">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700/90 dark:text-emerald-300/90">Análises registradas</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{analisesRegistradas}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/25 dark:bg-amber-500/[0.08]">
              <p className="text-[11px] uppercase tracking-wide text-amber-700/90 dark:text-amber-300/90">Pendentes de preenchimento</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">{pendentesAnalise}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Dados incompletos</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{comDadosIncompletos}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/70 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por credor, processo, precatório ou tribunal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-xl pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                {filteredPrecatorios.length} resultados
              </Badge>
              {searchTerm.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 rounded-full px-3 text-xs"
                  onClick={() => setSearchTerm("")}
                >
                  Limpar busca
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!analysisFieldsAvailable && (
        <Alert>
          <AlertDescription>
            Campos de análise processual não encontrados no banco. Execute o script
            {" "}
            <span className="font-mono">scripts/211-analise-processual-observacoes.sql</span>
            {", "}
            <span className="font-mono">scripts/212-analise-processual-cessao.sql</span>
            {" e "}
            <span className="font-mono">scripts/213-analise-processual-itcmd.sql</span>
            {" "}
            para liberar o registro da análise.
          </AlertDescription>
        </Alert>
      )}

      {!error && filteredPrecatorios.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground bg-muted/50 border-dashed">
          <FileSearch className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p className="text-lg font-medium">Nenhum precatório nesta fila</p>
          <p className="text-sm">Novos processos em análise aparecerão aqui.</p>
        </Card>
      )}

      {!error && filteredPrecatorios.length > 0 && (
        <div className="hidden md:grid md:grid-cols-[64px_minmax(0,1.25fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(240px,1fr)] items-center gap-6 px-6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
          <span>#</span>
          <span>Credor</span>
          <span>Processo</span>
          <span>Data</span>
          <span>Status e ação</span>
        </div>
      )}

      <div className="grid gap-4">
        {filteredPrecatorios.map((p, index) => (
          <Card
            key={p.id}
            className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-lg hover:border-amber-300/40 dark:hover:border-amber-500/30 hover:bg-amber-50/30 dark:hover:bg-amber-950/[0.12] cursor-pointer"
            onClick={() => handleAbrir(p.id)}
          >
            <CardContent className="relative z-10 p-5 md:p-6">
              <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[64px_minmax(0,1.25fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(240px,1fr)] md:gap-6">
                <div className="flex items-start md:justify-center">
                  <span className="text-4xl font-black leading-none text-foreground/15 group-hover:text-amber-500/50 transition-colors">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="min-w-0 space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <User className="w-3 h-3" /> Credor
                  </label>
                  <p className="font-medium truncate" title={p.credor_nome || undefined}>
                    {p.credor_nome || "Não informado"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono truncate" title={p.credor_cpf_cnpj || undefined}>
                    {p.credor_cpf_cnpj || "CPF/CNPJ n/d"}
                  </p>
                </div>

                  <div className="min-w-0 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Processo
                    </label>
                    <p className="font-medium text-sm font-mono truncate" title={p.numero_processo || undefined}>
                      {p.numero_processo || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={p.numero_precatorio || undefined}>
                      {p.numero_precatorio || "Precatório N/A"}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> Data
                    </label>
                    <p className="font-medium text-sm">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={p.tribunal || undefined}>
                      {p.tribunal || "Tribunal n/d"}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                    <Badge
                      variant="outline"
                      className="w-fit border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/35 dark:bg-amber-950/30 dark:text-amber-200"
                    >
                      Análise processual
                    </Badge>
                    <p className="text-xs text-muted-foreground truncate" title={p.titulo || undefined}>
                      {p.titulo || "Sem título"}
                    </p>
                    {analysisFieldsAvailable ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 h-8 rounded-full border-amber-300 px-4 text-amber-700 hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-950/30 font-medium"
                        onClick={(e) => {
                          e.stopPropagation()
                          openAnaliseModal(p)
                        }}
                      >
                        Registrar análise
                      </Button>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Campos da análise pendentes no banco.
                      </p>
                    )}
                  </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={analiseModalOpen}
        onOpenChange={(open) => {
          setAnaliseModalOpen(open)
          if (!open) {
            setSelectedPrecatorio(null)
            setAnaliseForm({})
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Resultado da análise processual</DialogTitle>
            {selectedPrecatorio && (
              <p className="text-sm text-muted-foreground">
                {selectedPrecatorio.credor_nome || "Credor não informado"} •{" "}
                {selectedPrecatorio.numero_processo || "Processo N/A"}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Penhora</Label>
                <Select
                  value={booleanSelectValue(analiseForm.analise_penhora)}
                  onValueChange={(value) =>
                    setAnaliseForm({ ...analiseForm, analise_penhora: selectValueToBoolean(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinido">Não informado</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cessão</Label>
                <Select
                  value={booleanSelectValue(analiseForm.analise_cessao)}
                  onValueChange={(value) =>
                    setAnaliseForm({ ...analiseForm, analise_cessao: selectValueToBoolean(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinido">Não informado</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Herdeiros habilitados</Label>
                <Select
                  value={
                    analiseForm.analise_herdeiros === true
                      ? "Sim"
                      : analiseForm.analise_herdeiros === false
                        ? "Não"
                        : analiseForm.analise_herdeiros || "indefinido"
                  }
                  onValueChange={(value) =>
                    setAnaliseForm({
                      ...analiseForm,
                      analise_herdeiros: value === "indefinido" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinido">Não informado</SelectItem>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Viabilidade do crédito</Label>
                <Select
                  value={booleanSelectValue(analiseForm.analise_viavel)}
                  onValueChange={(value) =>
                    setAnaliseForm({ ...analiseForm, analise_viavel: selectValueToBoolean(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinido">Não informado</SelectItem>
                    <SelectItem value="true">Viável</SelectItem>
                    <SelectItem value="false">Não viável</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>ITCMD</Label>
                <Select
                  value={booleanSelectValue(analiseForm.analise_itcmd)}
                  onValueChange={(value) =>
                    setAnaliseForm({ ...analiseForm, analise_itcmd: selectValueToBoolean(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indefinido">Não informado</SelectItem>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analiseForm.analise_penhora === true && (
                <>
                  <div className="space-y-2">
                    <Label>Penhora valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={analiseForm.analise_penhora_valor ?? ""}
                      onChange={(e) =>
                        setAnaliseForm({ ...analiseForm, analise_penhora_valor: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Penhora percentual (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={analiseForm.analise_penhora_percentual ?? ""}
                      onChange={(e) =>
                        setAnaliseForm({ ...analiseForm, analise_penhora_percentual: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </div>
                </>
              )}
              {analiseForm.analise_cessao === true && (
                <>
                  <div className="space-y-2">
                    <Label>Cessão valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={analiseForm.analise_cessao_valor ?? ""}
                      onChange={(e) =>
                        setAnaliseForm({ ...analiseForm, analise_cessao_valor: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cessão percentual (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={analiseForm.analise_cessao_percentual ?? ""}
                      onChange={(e) =>
                        setAnaliseForm({ ...analiseForm, analise_cessao_percentual: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </div>
                </>
              )}
              {analiseForm.analise_itcmd === true && (
                <>
                  <div className="space-y-2">
                    <Label>ITCMD valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={analiseForm.analise_itcmd_valor ?? ""}
                      onChange={(e) =>
                        setAnaliseForm({ ...analiseForm, analise_itcmd_valor: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ITCMD percentual (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={analiseForm.analise_itcmd_percentual ?? ""}
                      onChange={(e) =>
                        setAnaliseForm({ ...analiseForm, analise_itcmd_percentual: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Adiantamento recebido valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={analiseForm.analise_adiantamento_valor ?? ""}
                  onChange={(e) =>
                    setAnaliseForm({ ...analiseForm, analise_adiantamento_valor: e.target.value })
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Adiantamento recebido percentual (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={analiseForm.analise_adiantamento_percentual ?? ""}
                  onChange={(e) =>
                    setAnaliseForm({ ...analiseForm, analise_adiantamento_percentual: e.target.value })
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Honorários contratuais valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={analiseForm.analise_honorarios_valor ?? ""}
                  onChange={(e) =>
                    setAnaliseForm({ ...analiseForm, analise_honorarios_valor: e.target.value })
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Honorários contratuais percentual (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={analiseForm.analise_honorarios_percentual ?? ""}
                  onChange={(e) =>
                    setAnaliseForm({ ...analiseForm, analise_honorarios_percentual: e.target.value })
                  }
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações da análise</Label>
              <Textarea
                value={analiseForm.analise_observacoes || ""}
                onChange={(e) =>
                  setAnaliseForm({ ...analiseForm, analise_observacoes: e.target.value })
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAnaliseModalOpen(false)}
              disabled={analiseSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarAnalise} disabled={analiseSaving}>
              {analiseSaving ? "Salvando..." : "Salvar resultado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
