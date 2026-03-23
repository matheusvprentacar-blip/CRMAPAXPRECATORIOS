"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2, Trash2, Pencil, ArrowUp, ArrowDown, AlertCircle } from "@/components/icons"
import { FinancialTransaction } from "@/lib/types/database"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { EditTransactionModal } from "@/components/finance/edit-transaction-modal"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ─── types ────────────────────────────────────────────────────────────────────
interface ExtendedFinancial extends FinancialTransaction {
  usuarios?: { nome: string; email: string }
}
interface TransactionsTableProps {
  data: ExtendedFinancial[]
  onUpdate: () => void
}

// ─── constants ────────────────────────────────────────────────────────────────
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

type TypeFilter = "all" | "income" | "expense"

const CATEGORY_COLORS: Record<string, string> = {
  operacional:          "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "pessoal/rh":         "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  marketing:            "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  impostos:             "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "vendas/honorários":  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  vendas:               "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  serviços:             "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  servicos:             "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  outros:               "bg-foreground/10 text-foreground/60",
  comissão:             "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  comissao:             "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

const STATUS_STYLES: Record<string, string> = {
  pago:       "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  pendente:   "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30",
  atrasado:   "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30",
  cancelado:  "bg-foreground/8 text-foreground/45 border-border/50",
}

const STATUS_LABELS: Record<string, string> = {
  pago: "Pago", pendente: "Pendente", atrasado: "Atrasado", cancelado: "Cancelado",
}

// ─── component ────────────────────────────────────────────────────────────────
export function GlobalTransactionsTable({ data, onUpdate }: TransactionsTableProps) {
  const [searchTerm, setSearchTerm]   = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter]   = useState<TypeFilter>("all")
  const [updating, setUpdating]       = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<ExtendedFinancial | null>(null)
  const { toast }                     = useToast()

  async function toggleStatus(id: string, currentStatus: string) {
    if (updating) return
    setUpdating(id)
    const newStatus = currentStatus === "pendente" ? "pago" : "pendente"
    const supabase = createBrowserClient()
    try {
      if (!supabase) throw new Error("Cliente Supabase não inicializado")
      const { error } = await supabase.from("financial_transactions").update({ status: newStatus }).eq("id", id)
      if (error) throw error
      onUpdate()
      toast({ title: "Status atualizado", description: `Registro marcado como ${newStatus}` })
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return
    const supabase = createBrowserClient()
    try {
      if (!supabase) return
      const { error } = await supabase.from("financial_transactions").delete().eq("id", id)
      if (error) throw error
      onUpdate()
      toast({ title: "Excluído", description: "Transação removida com sucesso" })
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" })
    }
  }

  const filteredData = data.filter(item => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      (item.description || "").toLowerCase().includes(search) ||
      (item.usuarios?.nome || "").toLowerCase().includes(search) ||
      (item.category || "").toLowerCase().includes(search)
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    const matchesType   = typeFilter   === "all" || item.type   === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const incomeCount  = data.filter(i => i.type === "income").length
  const expenseCount = data.filter(i => i.type === "expense").length

  return (
    <div className="space-y-0">
      <EditTransactionModal
        open={!!editingItem}
        onOpenChange={(op) => !op && setEditingItem(null)}
        transaction={editingItem as any}
        onSuccess={onUpdate}
      />

      {/* ── TOOLBAR ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/50">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            placeholder="Buscar por descrição, categoria ou responsável..."
            className="pl-9 h-9 bg-content2/40 border-border/60 text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Type pills */}
        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-content2/30 p-1">
          {([
            { id: "all",     label: "Todas" },
            { id: "income",  label: `↑ Receitas (${incomeCount})` },
            { id: "expense", label: `↓ Despesas (${expenseCount})` },
          ] as { id: TypeFilter; label: string }[]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTypeFilter(id)}
              className={[
                "h-7 rounded-lg px-3 text-xs font-semibold transition-all",
                typeFilter === id
                  ? id === "income"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : id === "expense"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-foreground text-background shadow-sm"
                  : "text-foreground/55 hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-content2/30 p-1">
          {[
            { v: "all",      l: "Todos" },
            { v: "pendente", l: "Pendente" },
            { v: "pago",     l: "Pago" },
            { v: "atrasado", l: "Atrasado" },
          ].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={[
                "h-7 rounded-lg px-3 text-xs font-semibold transition-all",
                statusFilter === v
                  ? "bg-foreground text-background shadow-sm"
                  : "text-foreground/55 hover:text-foreground",
              ].join(" ")}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Count */}
        <span className="ml-auto text-xs tabular-nums text-foreground/35">
          {filteredData.length}/{data.length} registros
        </span>
      </div>

      {/* ── TABLE HEADER ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[2rem_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2 border-b border-border/40">
        <div />
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/35">Descrição</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 w-24 text-center">Vencimento</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 w-28 text-right">Valor</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 w-24 text-center">Status</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/35 w-16 text-right">Ações</span>
      </div>

      {/* ── ROWS ───────────────────────────────────────────────────────────── */}
      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="rounded-2xl border border-border/50 bg-content2/30 p-4">
            <Search className="h-8 w-8 text-foreground/25" />
          </div>
          <p className="text-sm font-medium text-foreground/50">Nenhum registro encontrado</p>
          <p className="text-xs text-foreground/35">Ajuste os filtros ou o termo de busca</p>
        </div>
      ) : (
        <div className="divide-y divide-border/35">
          {filteredData.map((item) => {
            const isIncome    = item.type === "income"
            const isUpdating  = updating === item.id
            const catKey      = (item.category || "").toLowerCase()
            const catColor    = CATEGORY_COLORS[catKey] ?? "bg-foreground/8 text-foreground/50"
            const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.pendente
            const statusLabel = STATUS_LABELS[item.status] ?? item.status
            const dateStr     = item.due_date
              ? format(new Date(item.due_date), "dd/MM/yy", { locale: ptBR })
              : "—"

            return (
              <div
                key={item.id}
                className={[
                  "group grid grid-cols-[2rem_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3.5 transition-colors",
                  "hover:bg-content2/25",
                  isIncome ? "border-l-2 border-l-emerald-500/60" : "border-l-2 border-l-rose-500/60",
                ].join(" ")}
              >
                {/* Type icon */}
                <div className={[
                  "flex h-7 w-7 items-center justify-center rounded-full shrink-0",
                  isIncome
                    ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/12 text-rose-600 dark:text-rose-400",
                ].join(" ")}>
                  {isIncome
                    ? <ArrowUp className="h-3.5 w-3.5" />
                    : <ArrowDown className="h-3.5 w-3.5" />}
                </div>

                {/* Description + category */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-snug">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0 text-[10px] font-semibold capitalize ${catColor}`}>
                      {item.category || "—"}
                    </span>
                    {item.usuarios?.nome && (
                      <span className="text-[11px] text-foreground/40 truncate">{item.usuarios.nome}</span>
                    )}
                    {item.installment_number && item.total_installments && (
                      <span className="text-[10px] text-foreground/35">
                        {item.installment_number}/{item.total_installments}x
                      </span>
                    )}
                  </div>
                </div>

                {/* Date */}
                <span className="w-24 text-center text-xs tabular-nums text-foreground/55">{dateStr}</span>

                {/* Value */}
                <span className={[
                  "w-28 text-right text-sm font-bold tabular-nums",
                  isIncome
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400",
                ].join(" ")}>
                  {isIncome ? "+" : "−"}{BRL.format(Math.abs(Number(item.amount)))}
                </span>

                {/* Status */}
                <div className="w-24 flex justify-center">
                  <button
                    onClick={() => toggleStatus(item.id, item.status)}
                    disabled={!!isUpdating}
                    title="Clique para alternar entre Pendente e Pago"
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-all hover:opacity-75",
                      statusStyle,
                    ].join(" ")}
                  >
                    {isUpdating
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : item.status === "atrasado"
                        ? <AlertCircle className="h-3 w-3" />
                        : null}
                    {statusLabel}
                  </button>
                </div>

                {/* Actions */}
                <div className="w-16 flex justify-end items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-content2 hover:text-foreground transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
          <span className="text-xs text-foreground/35 tabular-nums">
            {filteredData.length} {filteredData.length === 1 ? "registro" : "registros"}
          </span>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Receitas: {BRL.format(filteredData.filter(i => i.type === "income").reduce((s, i) => s + Number(i.amount), 0))}
            </span>
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Despesas: {BRL.format(filteredData.filter(i => i.type === "expense").reduce((s, i) => s + Number(i.amount), 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
