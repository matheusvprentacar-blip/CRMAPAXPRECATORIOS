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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Análise Processual</h1>
          <p className="text-muted-foreground">
            Precatórios aguardando análise pré-cálculo.
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-1 w-fit">
          {filteredPrecatorios.length} na fila
        </Badge>
      </div>

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por credor, processo, precatório ou tribunal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
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

      <div className="grid gap-4">
        {filteredPrecatorios.map((p, index) => (
          <Card
            key={p.id}
            className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-amber-500/50 group relative overflow-hidden"
            onClick={() => handleAbrir(p.id)}
          >
            <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/5 transition-colors" />
            <CardContent className="p-6 flex items-center justify-between relative z-10">
              <div className="flex items-start gap-6 flex-1">
                <div className="flex flex-col items-center justify-center min-w-[3rem]">
                  <span className="text-4xl font-black text-muted-foreground/20 group-hover:text-amber-500/40 transition-colors">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <User className="w-3 h-3" /> Credor
                    </label>
                    <p className="font-medium truncate" title={p.credor_nome || undefined}>
                      {p.credor_nome || "Não informado"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {p.credor_cpf_cnpj || "CPF/CNPJ n/d"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Processo
                    </label>
                    <p className="font-medium text-sm font-mono">{p.numero_processo || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">{p.numero_precatorio || "Precatório N/A"}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> Data
                    </label>
                    <p className="font-medium text-sm">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.tribunal || "Tribunal n/d"}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                    <Badge variant="outline" className="w-fit border-amber-500/30 text-amber-300">
                      Análise processual
                    </Badge>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.titulo || "Sem título"}
                    </p>
                    {analysisFieldsAvailable ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 h-8 rounded-full border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
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
