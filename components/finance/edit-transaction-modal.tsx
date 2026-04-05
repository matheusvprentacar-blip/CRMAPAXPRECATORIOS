/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, ArrowUp, ArrowDown } from "@/components/icons"

interface Transaction {
  id: string
  description: string
  amount: number
  type: string
  category: string
  status: string
  due_date: string
}

interface EditTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  onSuccess: () => void
}

const CATEGORIES = [
  { value: "operacional", label: "Operacional" },
  { value: "pessoal",     label: "Pessoal / RH" },
  { value: "marketing",   label: "Marketing" },
  { value: "impostos",    label: "Impostos" },
  { value: "vendas",      label: "Vendas / Honorários" },
  { value: "servicos",    label: "Serviços" },
  { value: "outros",      label: "Outros" },
]

const STATUSES: { value: string; label: string; cls: string }[] = [
  { value: "pendente",  label: "Pendente",  cls: "border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500" },
  { value: "pago",      label: "Pago",      cls: "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 data-[active=true]:bg-emerald-500 data-[active=true]:text-white data-[active=true]:border-emerald-500" },
  { value: "atrasado",  label: "Atrasado",  cls: "border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 data-[active=true]:bg-rose-500 data-[active=true]:text-white data-[active=true]:border-rose-500" },
  { value: "cancelado", label: "Cancelado", cls: "border-border/60 bg-content2/40 text-foreground/50 data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:border-foreground" },
]

export function EditTransactionModal({ open, onOpenChange, transaction, onSuccess }: EditTransactionModalProps) {
  const [loading, setLoading]         = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount]           = useState("")
  const [type, setType]               = useState<"income" | "expense">("expense")
  const [category, setCategory]       = useState("outros")
  const [date, setDate]               = useState("")
  const [status, setStatus]           = useState("pendente")
  const { toast } = useToast()

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description)
      setAmount(transaction.amount.toString())
      setType(transaction.type as any)
      setCategory(transaction.category)
      setDate(transaction.due_date)
      setStatus(transaction.status)
    }
  }, [transaction])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!transaction) return
    setLoading(true)
    const supabase = createBrowserClient()
    if (!supabase) return
    try {
      const numAmount = parseFloat(amount.replace("R$", "").replace(".", "").replace(",", "."))
      if (isNaN(numAmount) || numAmount <= 0) throw new Error("Valor inválido")
      const { error } = await supabase
        .from("financial_transactions")
        .update({ description, amount: numAmount, type, category, status, due_date: date, updated_at: new Date().toISOString() })
        .eq("id", transaction.id)
      if (error) throw error
      toast({ title: "Sucesso", description: "Transação atualizada" })
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const isIncome = type === "income"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden gap-0">

        {/* ── Header com indicador de tipo ─────────────────────────────────── */}
        <div className={[
          "px-6 pt-6 pb-5 border-b border-border/50",
          isIncome ? "bg-emerald-500/[0.04]" : "bg-rose-500/[0.04]",
        ].join(" ")}>
          <div className="flex items-center gap-3">
            <div className={[
              "flex h-9 w-9 items-center justify-center rounded-xl",
              isIncome
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
            ].join(" ")}>
              {isIncome ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Financeiro</p>
              <DialogTitle className="text-base font-bold leading-tight">Editar Movimentação</DialogTitle>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">

          {/* Tipo toggle */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: "income",  label: "Receita",  Icon: ArrowUp,   active: "bg-emerald-500 text-white border-emerald-500 shadow-sm", inactive: "border-border/60 text-foreground/55 hover:border-emerald-400/50 hover:text-emerald-600" },
                { v: "expense", label: "Despesa",  Icon: ArrowDown,  active: "bg-rose-500 text-white border-rose-500 shadow-sm",       inactive: "border-border/60 text-foreground/55 hover:border-rose-400/50 hover:text-rose-600" },
              ] as const).map(({ v, label, Icon, active, inactive }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setType(v)}
                  className={[
                    "flex items-center justify-center gap-2 rounded-xl border h-10 text-sm font-semibold transition-all",
                    type === v ? active : inactive,
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Valor (R$)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-foreground/40">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="pl-9 h-11 text-base font-semibold tabular-nums"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Descrição</Label>
            <Input
              placeholder="Ex: Aluguel, Honorários..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              className="h-10"
            />
          </div>

          {/* Categoria + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Vencimento</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="h-10"
              />
            </div>
          </div>

          {/* Status pills */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Status</Label>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  data-active={status === s.value}
                  onClick={() => setStatus(s.value)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-bold transition-all",
                    s.cls,
                  ].join(" ")}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl border border-border/70 px-4 text-sm font-medium text-foreground/60 transition-colors hover:bg-content2/60 hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-5 text-sm font-semibold text-white shadow-[0_6px_20px_-8px_rgba(249,115,22,0.70)] transition hover:from-orange-400 hover:to-amber-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar Alterações
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
