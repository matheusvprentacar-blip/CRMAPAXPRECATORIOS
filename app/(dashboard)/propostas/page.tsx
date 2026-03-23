"use client"
/* eslint-disable */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Search } from "@/components/icons"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ")

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
})

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
})

function formatMoney(value: number) {
  return currencyFormatter.format(value || 0)
}

function formatCompactMoney(value: number) {
  return compactCurrencyFormatter.format(value || 0)
}

function getInitials(value?: string | null) {
  const source = (value || "").trim()
  if (!source) return "PR"
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

type ValidationTone = "all" | "partial" | "none" | "negociacao"

function getValidationTone(p: any): ValidationTone {
  const count = [
    p.validacao_calculo_ok,
    p.validacao_juridico_ok,
    p.validacao_comercial_ok,
    p.validacao_admin_ok,
  ].filter(Boolean).length
  if (count === 4) return "all"
  if (count >= 1) return "partial"
  if (p.status_kanban === "proposta_negociacao") return "negociacao"
  return "none"
}

function getToneClasses(tone: ValidationTone) {
  switch (tone) {
    case "all":
      return {
        line: "bg-emerald-500",
        avatar: "bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
        border: "border-emerald-500/15 hover:border-emerald-500/25",
      }
    case "partial":
      return {
        line: "bg-amber-500",
        avatar: "bg-amber-500/12 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
        border: "border-amber-500/15 hover:border-amber-500/25",
      }
    case "negociacao":
      return {
        line: "bg-blue-500",
        avatar: "bg-blue-500/12 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
        border: "border-border hover:border-orange-500/25",
      }
    default:
      return {
        line: "bg-slate-400 dark:bg-slate-600",
        avatar: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/12 dark:text-slate-300",
        border: "border-border hover:border-slate-400/30",
      }
  }
}

function getStatusTagClass(status?: string) {
  switch (status) {
    case "proposta_negociacao":
      return "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
    case "concluido":
      return "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
    default:
      return "border-slate-200 bg-slate-500/10 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
  }
}

function TagPill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em]",
        className
      )}
    >
      {children}
    </span>
  )
}

function ValidationPill({ label, valid }: { label: string; valid: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
        valid
          ? "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-slate-200 bg-slate-500/8 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full bg-current", !valid && "opacity-30")} />
      {label}
    </span>
  )
}

function getValidationProgress(p: any) {
  const checks = [
    p.validacao_calculo_ok,
    p.validacao_juridico_ok,
    p.validacao_comercial_ok,
    p.validacao_admin_ok,
  ]
  const done = checks.filter(Boolean).length
  return { done, total: 4, pct: Math.round((done / 4) * 100) }
}

function PropostaCard({ p, onOpen }: { p: any; onOpen: () => void }) {
  const tone = getToneClasses(getValidationTone(p))
  const initials = getInitials(p.credor_nome)
  const propostaValor = p.proposta_maior_valor || p.proposta_menor_valor || 0
  const statusLabel = (p.status_kanban || "Status N/I").replace(/_/g, " ")
  const { done, total, pct } = getValidationProgress(p)
  const responsavelNome = p.responsavel_obj?.nome || "Não atribuído"

  const progressBarClass =
    pct === 100
      ? "bg-emerald-500"
      : pct >= 50
      ? "bg-amber-500"
      : "bg-slate-400 dark:bg-slate-500"

  return (
    <div
      className={cx(
        "group relative cursor-pointer overflow-hidden rounded-[18px] border bg-white p-5 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] transition duration-200 hover:-translate-y-[3px] hover:shadow-[0_16px_48px_-20px_rgba(249,115,22,0.22)] dark:bg-[#18181b]",
        tone.border
      )}
      onClick={onOpen}
    >
      {/* Linha de acento superior */}
      <div className={cx("absolute inset-x-0 top-0 h-[3px]", tone.line)} />

      <div className="space-y-4">
        {/* Tags de status */}
        <div className="flex flex-wrap items-center gap-2">
          <TagPill className={getStatusTagClass(p.status_kanban)}>
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel}
          </TagPill>
        </div>

        {/* Avatar + nome + valor */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1 basis-[200px]">
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold",
                  tone.avatar
                )}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-bold text-slate-900 dark:text-slate-50">
                  {p.credor_nome || "Nome não informado"}
                </h3>
                <div className="mt-1 text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
                  Proc: {p.numero_processo || "N/A"}
                </div>
                <div className="mt-0.5 text-[11.5px] text-slate-400 dark:text-slate-500">
                  Prec: {p.numero_precatorio || "N/A"}
                </div>
              </div>
            </div>
          </div>

          <div className="ml-auto text-right">
            <div className="break-all text-[clamp(0.95rem,1.9vw,1.1rem)] font-extrabold leading-tight tracking-[-0.02em] text-emerald-700 dark:text-emerald-400">
              {propostaValor > 0 ? formatMoney(propostaValor) : "Aguardando"}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Proposta
            </div>
          </div>
        </div>

        {/* Grid de info */}
        <div className="grid grid-cols-2 gap-2 rounded-[10px] bg-[#f4f5f8] p-3 dark:bg-[#09090b]">
          <div>
            <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              Responsável
            </div>
            <div className="mt-1 truncate text-[12px] font-semibold text-slate-900 dark:text-slate-100">
              {responsavelNome}
            </div>
          </div>
          <div>
            <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              Base Líquida
            </div>
            <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
              {p.saldo_liquido ? formatMoney(p.saldo_liquido) : "N/A"}
            </div>
          </div>
        </div>

        {/* Barra de progresso das validações */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f4f5f8] dark:bg-[#09090b]">
            <div
              className={cx("h-full rounded-full transition-[width] duration-300", progressBarClass)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="w-[76px] shrink-0 text-right text-[10.5px] font-bold text-slate-400 dark:text-slate-500">
            {done}/{total} validações
          </span>
        </div>

        {/* Pills de validação */}
        <div className="flex flex-wrap gap-1.5">
          <ValidationPill label="Cálculo" valid={p.validacao_calculo_ok} />
          <ValidationPill label="Jurídico" valid={p.validacao_juridico_ok} />
          <ValidationPill label="Comercial" valid={p.validacao_comercial_ok} />
          <ValidationPill label="Admin" valid={p.validacao_admin_ok} />
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-bold text-white">
              {getInitials(responsavelNome)}
            </div>
            <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
              {responsavelNome}
            </span>
          </div>
          <span className="text-[12px] font-bold text-orange-500 transition-opacity duration-200 group-hover:opacity-100 md:opacity-0">
            Ver detalhes →
          </span>
        </div>
      </div>
    </div>
  )
}

export default function PropostasPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [precatorios, setPrecatorios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const isAdmin = profile?.role?.includes("admin") || profile?.role?.includes("gestor")

  useEffect(() => {
    if (profile) {
      loadPropostas()
    }
  }, [profile])

  async function loadPropostas() {
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      let query = supabase
        .from("precatorios")
        .select(`
          *,
          responsavel_obj:usuarios!responsavel(nome)
        `)
        .or("status_kanban.eq.proposta_negociacao,validacao_calculo_ok.is.true,validacao_juridico_ok.is.true")

      if (!isAdmin && profile?.id) {
        query = query.or(`criado_por.eq.${profile.id},responsavel.eq.${profile.id}`)
      }

      const { data, error } = await query.order("updated_at", { ascending: false })

      if (error) throw error
      setPrecatorios(data || [])
    } catch (error: any) {
      console.error("[Propostas] Erro detalhado:", JSON.stringify(error, null, 2))
      toast({
        title: "Erro ao carregar propostas",
        description: error.message || "Erro desconhecido ao buscar dados.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredPrecatorios = precatorios.filter(
    (p) =>
      p.credor_nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.numero_precatorio?.includes(search) ||
      p.numero_processo?.includes(search)
  )

  // Estatísticas
  const totalAprovadas = filteredPrecatorios.filter(
    (p) => p.validacao_calculo_ok && p.validacao_juridico_ok && p.validacao_comercial_ok && p.validacao_admin_ok
  ).length
  const totalParciais = filteredPrecatorios.filter((p) => {
    const count = [p.validacao_calculo_ok, p.validacao_juridico_ok, p.validacao_comercial_ok, p.validacao_admin_ok].filter(Boolean).length
    return count > 0 && count < 4
  }).length
  const valorTotal = filteredPrecatorios.reduce((acc, p) => acc + (p.proposta_maior_valor || p.proposta_menor_valor || 0), 0)

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-6 pb-24 sm:px-5">

      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-[24px] border border-slate-900/10 bg-[linear-gradient(135deg,#ffffff_60%,#fff7ed_100%)] px-5 py-6 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#18181b_60%,rgba(124,45,18,0.35)_100%)] sm:px-8">
        <div className="pointer-events-none absolute -right-5 -top-16 h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-12 left-4 h-[160px] w-[160px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.10)_0%,transparent_70%)]" />

        <div className="relative z-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Pipeline comercial
              </p>
              <h1 className="mt-1 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
                Central de Propostas
              </h1>
              <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                {isAdmin
                  ? "Visão global de todas as propostas em validação e negociação."
                  : "Acompanhe suas propostas e o progresso das validações em tempo real."}
              </p>
            </div>
          </div>

          {/* Mini cards de estatísticas */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[14px] border border-slate-900/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#18181b]">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Total</div>
              <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-slate-900 dark:text-slate-50">
                {filteredPrecatorios.length}
              </div>
              <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">propostas na carteira</div>
            </div>
            <div className="rounded-[14px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Aprovadas</div>
              <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-emerald-700 dark:text-emerald-300">
                {totalAprovadas}
              </div>
              <div className="mt-1 text-[11px] text-emerald-700/80 dark:text-emerald-300/80">todas as validações OK</div>
            </div>
            <div className="rounded-[14px] border border-amber-500/25 bg-amber-500/10 px-4 py-3">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Em revisão</div>
              <div className="mt-1 text-2xl font-bold leading-none tabular-nums text-amber-600 dark:text-amber-300">
                {totalParciais}
              </div>
              <div className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/80">validações parciais</div>
            </div>
            <div className="rounded-[14px] border border-blue-500/25 bg-blue-500/10 px-4 py-3">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Valor total</div>
              <div className="mt-1 text-[18px] font-bold leading-none tabular-nums text-blue-600 dark:text-blue-300">
                {formatCompactMoney(valorTotal)}
              </div>
              <div className="mt-1 text-[11px] text-blue-700/80 dark:text-blue-300/80">portfólio de propostas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Barra de busca */}
      <div className="rounded-[18px] border border-slate-900/10 bg-white p-4 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#18181b] md:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por credor, processo ou precatório..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]"
          />
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500/20 border-t-orange-500" />
        </div>
      ) : filteredPrecatorios.length === 0 ? (
        <div className="relative overflow-hidden rounded-[18px] border-2 border-dashed border-slate-900/10 bg-white/90 px-6 py-20 text-center shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#18181b]">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]">
            <Search className="h-7 w-7 text-slate-500 dark:text-slate-400" />
          </div>
          <h3 className="relative text-lg font-bold text-slate-900 dark:text-slate-50">
            {search ? "Nenhuma proposta encontrada" : "Lista vazia"}
          </h3>
          <p className="relative mx-auto mt-2 max-w-sm text-[13.5px] leading-6 text-slate-500 dark:text-slate-400">
            {search
              ? "Tente ajustar os termos da busca para encontrar o que procura."
              : "Não há propostas disponíveis no momento."}
          </p>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))" }}
        >
          {filteredPrecatorios.map((p) => (
            <PropostaCard
              key={p.id}
              p={p}
              onOpen={() => router.push(`/precatorios/detalhes?id=${p.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
