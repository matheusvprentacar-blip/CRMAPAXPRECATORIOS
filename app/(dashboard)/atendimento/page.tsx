"use client"
/* eslint-disable */

import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { RoleGuard } from "@/lib/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  Plus,
  Phone,
  ChevronDown,
  ChevronUp,
  Search,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
} from "@/components/icons"
import { ModalNovaTentativa } from "@/components/atendimento/modal-nova-tentativa"
import { HistoricoTentativas } from "@/components/atendimento/historico-tentativas"
import { ModalNovoCreditoAtendimento } from "@/components/atendimento/modal-novo-credito-atendimento"
import { ModalImportacaoLote } from "@/components/atendimento/modal-importacao-lote"
import { toast } from "sonner"

interface CreditoAtendimento {
  id: string
  credor_nome: string
  credor_cpf_cnpj: string | null
  credor_telefone: string | null
  numero_precatorio: string | null
  numero_processo: string | null
  tribunal: string | null
  devedor: string | null
  status_atendimento: string | null
  valor_principal: number
  valor_atualizado: number
  created_at: string
  natureza: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; border: string }> = {
  na_fila: {
    label: "Na fila",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    dot: "bg-amber-500",
    border: "border-l-amber-500",
  },
  em_contato: {
    label: "Em contato",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    dot: "bg-blue-500",
    border: "border-l-blue-500",
  },
  interessado: {
    label: "Interessado",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    dot: "bg-emerald-500",
    border: "border-l-emerald-500",
  },
  sem_interesse: {
    label: "Sem interesse",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    dot: "bg-red-500",
    border: "border-l-red-400",
  },
}

const ACTIVE_STATUSES = ["na_fila", "em_contato"]
const ARCHIVED_STATUSES = ["interessado", "sem_interesse"]

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR")
}

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["na_fila"]
  return <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot} shrink-0`} />
}

function CreditoCard({
  credito,
  isAdmin,
  onTentativaSuccess,
}: {
  credito: CreditoAtendimento
  isAdmin: boolean
  onTentativaSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [modalTentativa, setModalTentativa] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadingInteresse, setLoadingInteresse] = useState(false)
  const [loadingSemInteresse, setLoadingSemInteresse] = useState(false)

  const status = credito.status_atendimento ?? "na_fila"
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["na_fila"]
  const isArchived = ARCHIVED_STATUSES.includes(status)

  const handleTentativaSuccess = () => {
    setRefreshKey((k) => k + 1)
    onTentativaSuccess()
  }

  const marcarStatus = async (novoStatus: "interessado" | "sem_interesse") => {
    const setter = novoStatus === "interessado" ? setLoadingInteresse : setLoadingSemInteresse
    setter(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não inicializado")

      const { error } = await supabase
        .from("precatorios")
        .update({ status_atendimento: novoStatus })
        .eq("id", credito.id)

      if (error) throw new Error(error.message)

      if (novoStatus === "interessado") {
        toast.success("Crédito marcado como Interessado e enviado para Pendentes.")
      } else {
        toast.success("Crédito arquivado como Sem interesse.")
      }
      onTentativaSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status")
    } finally {
      setter(false)
    }
  }

  return (
    <Card className={`overflow-hidden border-l-4 ${cfg.border}`}>
      <CardContent className="p-0">
        {/* Cabeçalho do card */}
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusDot status={status} />
              <h3 className="font-semibold text-base leading-tight truncate max-w-sm">{credito.credor_nome}</h3>
              <Badge className={`${cfg.color} text-xs font-medium`}>{cfg.label}</Badge>
              {credito.natureza && (
                <Badge variant="outline" className="text-xs">{credito.natureza}</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              {credito.credor_cpf_cnpj && (
                <span className="flex items-center gap-1">
                  <span className="text-xs font-medium text-foreground/60">CPF/CNPJ</span>
                  {credito.credor_cpf_cnpj}
                </span>
              )}
              {credito.credor_telefone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {credito.credor_telefone}
                </span>
              )}
              {credito.numero_processo && (
                <span className="flex items-center gap-1">
                  <span className="text-xs font-medium text-foreground/60">Processo</span>
                  {credito.numero_processo}
                </span>
              )}
              {credito.numero_precatorio && (
                <span className="flex items-center gap-1">
                  <span className="text-xs font-medium text-foreground/60">Precatório</span>
                  {credito.numero_precatorio}
                </span>
              )}
              {credito.tribunal && (
                <span className="flex items-center gap-1.5">
                  <span className="text-xs px-1.5 py-0.5 bg-muted rounded font-mono">{credito.tribunal}</span>
                </span>
              )}
              {credito.devedor && (
                <span className="text-xs text-muted-foreground">{credito.devedor}</span>
              )}
            </div>

            {isAdmin && (credito.valor_principal > 0 || credito.valor_atualizado > 0) && (
              <div className="flex flex-wrap gap-4 text-sm">
                {credito.valor_principal > 0 && (
                  <span>
                    <span className="text-xs text-muted-foreground mr-1">Principal</span>
                    <span className="font-semibold text-foreground">{formatCurrency(credito.valor_principal)}</span>
                  </span>
                )}
                {credito.valor_atualizado > 0 && (
                  <span>
                    <span className="text-xs text-muted-foreground mr-1">Atualizado</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(credito.valor_atualizado)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Ações */}
          {!isArchived && (
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setModalTentativa(true)}
              >
                <Phone className="h-3.5 w-3.5" />
                Registrar contato
              </Button>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="h-8 flex-1 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => marcarStatus("interessado")}
                  disabled={loadingInteresse || loadingSemInteresse}
                >
                  {loadingInteresse
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ThumbsUp className="h-3.5 w-3.5" />
                  }
                  Interessado
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => marcarStatus("sem_interesse")}
                  disabled={loadingInteresse || loadingSemInteresse}
                >
                  {loadingSemInteresse
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ThumbsDown className="h-3.5 w-3.5" />
                  }
                  Sem interesse
                </Button>
              </div>
            </div>
          )}

          {isArchived && (
            <div className="shrink-0">
              {status === "interessado" ? (
                <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Enviado para Pendentes
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-500 text-sm">
                  <XCircle className="h-4 w-4" />
                  Arquivado
                </div>
              )}
            </div>
          )}
        </div>

        {/* Histórico colapsável */}
        <div className="border-t bg-muted/20 px-5 py-2">
          <button
            type="button"
            className="flex w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {open ? "Ocultar histórico de contatos" : "Ver histórico de contatos"}
          </button>
          {open && (
            <div className="mt-3 pb-1">
              <HistoricoTentativas precatorioId={credito.id} refreshKey={refreshKey} />
            </div>
          )}
        </div>
      </CardContent>

      <ModalNovaTentativa
        open={modalTentativa}
        onOpenChange={setModalTentativa}
        precatorioId={credito.id}
        credorNome={credito.credor_nome}
        onSuccess={handleTentativaSuccess}
      />
    </Card>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 bg-card`}>
      <div className={`rounded-lg p-2 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export default function AtendimentoPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role?.includes("admin") ?? false

  const [creditos, setCreditos] = useState<CreditoAtendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modalNovoCredito, setModalNovoCredito] = useState(false)
  const [modalImportacao, setModalImportacao] = useState(false)
  const [tab, setTab] = useState<"ativa" | "arquivados">("ativa")

  const fetchCreditos = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const { data, error } = await supabase
        .from("precatorios")
        .select(
          "id, credor_nome, credor_cpf_cnpj, credor_telefone, numero_precatorio, numero_processo, tribunal, devedor, status_atendimento, valor_principal, valor_atualizado, created_at, natureza"
        )
        .eq("origem", "atendimento")
        .order("created_at", { ascending: false })

      if (error) throw error
      setCreditos(data ?? [])
    } catch (err) {
      toast.error("Erro ao carregar créditos de atendimento")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCreditos()
  }, [fetchCreditos])

  const normalizeText = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

  const filtered = creditos.filter((c) => {
    if (!search.trim()) return true
    const term = normalizeText(search)
    return [c.credor_nome, c.credor_cpf_cnpj, c.credor_telefone, c.numero_precatorio, c.numero_processo, c.tribunal, c.devedor]
      .filter(Boolean)
      .some((field) => normalizeText(field!).includes(term))
  })

  const ativos = filtered.filter((c) => ACTIVE_STATUSES.includes(c.status_atendimento ?? "na_fila"))
  const arquivados = filtered.filter((c) => ARCHIVED_STATUSES.includes(c.status_atendimento ?? ""))

  const stats = {
    naFila: creditos.filter((c) => c.status_atendimento === "na_fila").length,
    emContato: creditos.filter((c) => c.status_atendimento === "em_contato").length,
    interessados: creditos.filter((c) => c.status_atendimento === "interessado").length,
    semInteresse: creditos.filter((c) => c.status_atendimento === "sem_interesse").length,
  }

  return (
    <RoleGuard allowedRoles={["admin", "agente_atendimento"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Setor de Atendimento</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie a fila de créditos e registre tentativas de contato com credores
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModalImportacao(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Importar em Lote
              </Button>
              <Button onClick={() => setModalNovoCredito(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Crédito
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Na fila" value={stats.naFila} icon={Clock} color="bg-amber-100 text-amber-700" />
          <StatCard label="Em contato" value={stats.emContato} icon={Phone} color="bg-blue-100 text-blue-700" />
          <StatCard label="Interessados" value={stats.interessados} icon={ThumbsUp} color="bg-emerald-100 text-emerald-700" />
          <StatCard label="Sem interesse" value={stats.semInteresse} icon={ThumbsDown} color="bg-red-100 text-red-600" />
        </div>

        {/* Busca */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar credor, CPF, processo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as "ativa" | "arquivados")}>
          <TabsList className="h-10">
            <TabsTrigger value="ativa" className="gap-2">
              Fila Ativa
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                {ativos.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="arquivados" className="gap-2">
              Arquivados
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {arquivados.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativa" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : ativos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center gap-2">
                <Users className="h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-muted-foreground">
                  {search ? "Nenhum resultado para a busca." : "A fila de atendimento está vazia."}
                </p>
                {isAdmin && !search && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setModalNovoCredito(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Adicionar primeiro crédito
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {ativos.map((c) => (
                  <CreditoCard
                    key={c.id}
                    credito={c}
                    isAdmin={isAdmin}
                    onTentativaSuccess={fetchCreditos}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="arquivados" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
              </div>
            ) : arquivados.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center gap-2">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/40" />
                <p className="font-medium text-muted-foreground">
                  {search ? "Nenhum resultado para a busca." : "Nenhum crédito arquivado ainda."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {arquivados.map((c) => (
                  <CreditoCard
                    key={c.id}
                    credito={c}
                    isAdmin={isAdmin}
                    onTentativaSuccess={fetchCreditos}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ModalNovoCreditoAtendimento
        open={modalNovoCredito}
        onOpenChange={setModalNovoCredito}
        onSuccess={fetchCreditos}
      />

      <ModalImportacaoLote
        open={modalImportacao}
        onOpenChange={setModalImportacao}
        onSuccess={fetchCreditos}
      />
    </RoleGuard>
  )
}
