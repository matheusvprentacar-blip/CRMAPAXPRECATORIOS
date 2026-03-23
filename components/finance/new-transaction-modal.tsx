"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, Plus, ArrowUp, ArrowDown } from "@/components/icons"

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

const CATEGORIES = [
  { value: "operacional", label: "Operacional" },
  { value: "pessoal",     label: "Pessoal / RH" },
  { value: "marketing",   label: "Marketing" },
  { value: "impostos",    label: "Impostos" },
  { value: "vendas",      label: "Vendas / Honorários" },
  { value: "servicos",    label: "Serviços" },
  { value: "outros",      label: "Outros" },
]

const STATUSES = [
  { value: "pendente", label: "Pendente",  cls: "border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500" },
  { value: "pago",     label: "Pago",      cls: "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 data-[active=true]:bg-emerald-500 data-[active=true]:text-white data-[active=true]:border-emerald-500" },
]

const INSTALLMENT_OPTIONS = [2, 3, 4, 5, 6, 9, 10, 12, 18, 24, 36]

export function NewTransactionModal({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const { toast }                 = useToast()

  // form state
  const [description, setDescription]           = useState("")
  const [amount, setAmount]                     = useState("")
  const [type, setType]                         = useState<"income" | "expense">("expense")
  const [category, setCategory]                 = useState("outros")
  const [date, setDate]                         = useState(new Date().toISOString().split("T")[0])
  const [status, setStatus]                     = useState("pendente")
  const [notes, setNotes]                       = useState("")
  const [isInstallment, setIsInstallment]       = useState(false)
  const [totalInstallments, setTotalInstallments] = useState(2)

  const numAmount     = parseFloat(amount.replace(",", ".")) || 0
  const perInstallment = isInstallment && totalInstallments > 1 ? numAmount / totalInstallments : numAmount
  const isIncome      = type === "income"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createBrowserClient()
    if (!supabase) return

    try {
      if (isNaN(numAmount) || numAmount <= 0) throw new Error("Valor inválido")

      const payload: any[] = []

      if (isInstallment && totalInstallments > 1) {
        const recurrenceId    = crypto.randomUUID()
        const installmentValue = numAmount / totalInstallments

        for (let i = 0; i < totalInstallments; i++) {
          const dueDate = new Date(date)
          dueDate.setMonth(dueDate.getMonth() + i)
          payload.push({
            description:         `${description} (${i + 1}/${totalInstallments})`,
            amount:              installmentValue,
            type, category, status,
            due_date:            dueDate.toISOString().split("T")[0],
            installment_number:  i + 1,
            total_installments:  totalInstallments,
            recurrence_id:       recurrenceId,
            notes:               notes || null,
          })
        }
      } else {
        payload.push({
          description, amount: numAmount,
          type, category, status,
          due_date:           date,
          installment_number: 1,
          total_installments: 1,
          notes:              notes || null,
        })
      }

      const { error } = await supabase.from("financial_transactions").insert(payload)
      if (error) throw error

      toast({ title: "Sucesso", description: isInstallment ? `${totalInstallments} parcelas registradas` : "Transação criada" })
      setOpen(false)
      resetForm()
      onSuccess()
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setDescription(""); setAmount(""); setNotes("")
    setType("expense"); setCategory("outros"); setStatus("pendente")
    setDate(new Date().toISOString().split("T")[0])
    setIsInstallment(false); setTotalInstallments(2)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 text-sm font-semibold text-white shadow-[0_6px_20px_-8px_rgba(249,115,22,0.70)] transition hover:from-orange-400 hover:to-amber-500">
          <Plus className="h-4 w-4" />
          Nova Transação
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className={[
          "px-6 pt-6 pb-5 border-b border-border/50",
          isIncome ? "bg-emerald-500/[0.04]" : "bg-rose-500/[0.04]",
        ].join(" ")}>
          <div className="flex items-center gap-3">
            <div className={[
              "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
              isIncome
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
            ].join(" ")}>
              {isIncome ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Financeiro</p>
              <DialogTitle className="text-base font-bold leading-tight">Nova Movimentação</DialogTitle>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Tipo toggle */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: "income",  label: "Receita",  Icon: ArrowUp,   active: "bg-emerald-500 text-white border-emerald-500 shadow-sm", inactive: "border-border/60 text-foreground/55 hover:border-emerald-400/50 hover:text-emerald-600" },
                { v: "expense", label: "Despesa",  Icon: ArrowDown, active: "bg-rose-500 text-white border-rose-500 shadow-sm",       inactive: "border-border/60 text-foreground/55 hover:border-rose-400/50 hover:text-rose-600" },
              ] as const).map(({ v, label, Icon, active, inactive }) => (
                <button key={v} type="button" onClick={() => setType(v)}
                  className={["flex items-center justify-center gap-2 rounded-xl border h-10 text-sm font-semibold transition-all", type === v ? active : inactive].join(" ")}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Valor Total (R$)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-foreground/40">R$</span>
              <Input
                type="number" step="0.01" min="0"
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
              placeholder="Ex: Aluguel, Honorários Processo X..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required className="h-10"
            />
          </div>

          {/* Categoria + Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Vencimento</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="h-10" />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Status Inicial</Label>
            <div className="flex gap-2">
              {STATUSES.map(s => (
                <button key={s.value} type="button"
                  data-active={status === s.value}
                  onClick={() => setStatus(s.value)}
                  className={["flex-1 rounded-xl border py-2 text-xs font-bold transition-all", s.cls].join(" ")}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">
              Observações <span className="text-foreground/30 normal-case font-normal">(opcional)</span>
            </Label>
            <Input
              placeholder="Centro de custo, referência, nº processo..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Parcelamento */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsInstallment(!isInstallment)}
              className={[
                "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                isInstallment
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border/50 bg-content2/30 text-foreground/55 hover:text-foreground hover:border-border",
              ].join(" ")}
            >
              <span>Parcelamento</span>
              <div className={[
                "h-5 w-9 rounded-full transition-colors relative",
                isInstallment ? "bg-primary" : "bg-foreground/20",
              ].join(" ")}>
                <div className={[
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  isInstallment ? "translate-x-4" : "translate-x-0.5",
                ].join(" ")} />
              </div>
            </button>

            {isInstallment && (
              <div className="rounded-xl border border-border/50 bg-content2/25 p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">Número de Parcelas</Label>
                  <div className="flex flex-wrap gap-2">
                    {INSTALLMENT_OPTIONS.map(n => (
                      <button
                        key={n} type="button"
                        onClick={() => setTotalInstallments(n)}
                        className={[
                          "h-8 w-12 rounded-lg border text-xs font-bold transition-all",
                          totalInstallments === n
                            ? "border-primary bg-primary text-white"
                            : "border-border/60 text-foreground/55 hover:border-primary/50 hover:text-foreground",
                        ].join(" ")}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>

                {numAmount > 0 && (
                  <div className="rounded-lg border border-border/40 bg-background/60 px-3 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-foreground/50">Valor por parcela</span>
                    <span className="text-sm font-bold tabular-nums text-foreground">
                      {totalInstallments}× {BRL.format(perInstallment)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)}
              className="h-10 rounded-xl border border-border/70 px-4 text-sm font-medium text-foreground/60 transition-colors hover:bg-content2/60 hover:text-foreground">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-5 text-sm font-semibold text-white shadow-[0_6px_20px_-8px_rgba(249,115,22,0.70)] transition hover:from-orange-400 hover:to-amber-500 disabled:opacity-50">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isInstallment ? `Criar ${totalInstallments} Parcelas` : "Criar Transação"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
