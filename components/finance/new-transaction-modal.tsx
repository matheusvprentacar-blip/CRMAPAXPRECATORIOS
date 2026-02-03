"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2, Plus } from "lucide-react"

interface NewTransactionModalProps {
    onSuccess: () => void
}

export function NewTransactionModal({ onSuccess }: NewTransactionModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [type, setType] = useState<"income" | "expense">("expense")
    const [category, setCategory] = useState("outros")
    const [date, setDate] = useState(new Date().toISOString().split("T")[0])
    const [status, setStatus] = useState("pendente")

    // Installments
    const [isInstallment, setIsInstallment] = useState(false)
    const [totalInstallments, setTotalInstallments] = useState(2)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        const supabase = createBrowserClient()
        if (!supabase) return

        try {
            const numAmount = parseFloat(amount.replace("R$", "").replace(".", "").replace(",", "."))
            if (isNaN(numAmount) || numAmount <= 0) throw new Error("Valor inválido")

            const payload = []

            if (isInstallment && totalInstallments > 1) {
                // Generate Installments
                const recurrenceId = crypto.randomUUID()
                const installmentValue = numAmount / totalInstallments

                for (let i = 0; i < totalInstallments; i++) {
                    const dueDate = new Date(date)
                    dueDate.setMonth(dueDate.getMonth() + i)

                    payload.push({
                        description: `${description} (${i + 1}/${totalInstallments})`,
                        amount: installmentValue,
                        type,
                        category,
                        status, // All inherit initial status, usually 'pendente' for future
                        due_date: dueDate.toISOString().split("T")[0],
                        installment_number: i + 1,
                        total_installments: totalInstallments,
                        recurrence_id: recurrenceId
                    })
                }
            } else {
                // Single Transaction
                payload.push({
                    description,
                    amount: numAmount,
                    type,
                    category,
                    status,
                    due_date: date,
                    installment_number: 1,
                    total_installments: 1
                })
            }

            const { error } = await supabase
                .from("financial_transactions")
                .insert(payload)

            if (error) throw error

            toast({ title: "Sucesso", description: "Transação registrada com sucesso" })
            setOpen(false)
            resetForm()
            onSuccess()

        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    function resetForm() {
        setDescription("")
        setAmount("")
        // keep date/type defaults
        setIsInstallment(false)
        setTotalInstallments(2)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Transação
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nova Movimentação Financeira</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="income">Receita (Entrada)</SelectItem>
                                    <SelectItem value="expense">Despesa (Saída)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Valor Total (R$)</Label>
                            <Input
                                placeholder="0,00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input
                            placeholder="Ex: Aluguel, Honorários Processo X..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="operacional">Operacional</SelectItem>
                                    <SelectItem value="pessoal">Pessoal / RH</SelectItem>
                                    <SelectItem value="marketing">Marketing</SelectItem>
                                    <SelectItem value="impostos">Impostos</SelectItem>
                                    <SelectItem value="vendas">Vendas / Honorários</SelectItem>
                                    <SelectItem value="servicos">Serviços</SelectItem>
                                    <SelectItem value="outros">Outros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Vencimento / Data</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Status Inicial</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pendente">Pendente (A Pagar/Receber)</SelectItem>
                                <SelectItem value="pago">Pago / Recebido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="installments"
                            checked={isInstallment}
                            onCheckedChange={(c) => setIsInstallment(c as boolean)}
                        />
                        <Label htmlFor="installments">Compra/Venda Parcelada</Label>
                    </div>

                    {isInstallment && (
                        <div className="bg-muted/50 p-3 rounded-md space-y-2">
                            <Label>Número de Parcelas</Label>
                            <Select value={totalInstallments.toString()} onValueChange={(v) => setTotalInstallments(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2, 3, 4, 5, 6, 9, 10, 12, 18, 24, 36].map(num => (
                                        <SelectItem key={num} value={num.toString()}>{num}x</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                O valor total será dividido igualmente em {totalInstallments} meses.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Criar Transação
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
