"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

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

export function EditTransactionModal({ open, onOpenChange, transaction, onSuccess }: EditTransactionModalProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [type, setType] = useState<"income" | "expense">("expense")
    const [category, setCategory] = useState("outros")
    const [date, setDate] = useState("")
    const [status, setStatus] = useState("pendente")

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
                .update({
                    description,
                    amount: numAmount,
                    type,
                    category,
                    status,
                    due_date: date,
                    // If status changes to paid, we might want to update payment_date, but keeping it simple for now
                    updated_at: new Date().toISOString()
                })
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Movimentação</DialogTitle>
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
                                type="number"
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
                            placeholder="Ex: Aluguel, Honorários..."
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
                        <Label>Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="pago">Pago</SelectItem>
                                <SelectItem value="atrasado">Atrasado</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
