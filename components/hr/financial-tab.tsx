"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Usuario, FinancialTransaction } from "@/lib/types/database"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { DollarSign, Plus, Loader2, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface FinancialTabProps {
    user: Usuario
}

export function FinancialTab({ user }: FinancialTabProps) {
    const [items, setItems] = useState<FinancialTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [newItem, setNewItem] = useState({
        type: "expense" as "income" | "expense", // HR payments are mostly expenses for the company
        amount: "0",
        due_date: new Date().toISOString().split('T')[0],
        description: "",
        status: "pendente" as "pendente" | "pago",
        category: "pessoal" // auto category
    })
    const { toast } = useToast()

    useEffect(() => {
        loadFinancials()
    }, [user.id])

    async function loadFinancials() {
        const supabase = createBrowserClient()
        // Query financial_transactions where user_id matches
        const { data } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("due_date", { ascending: false })

        if (data) setItems(data as FinancialTransaction[])
        setLoading(false)
    }

    async function handleAdd() {
        if (!newItem.amount || !newItem.due_date) return

        setSubmitting(true)
        const supabase = createBrowserClient()
        try {
            const { error } = await supabase.from("financial_transactions").insert({
                user_id: user.id,
                type: newItem.type, // 'expense' by default
                category: newItem.category, // 'pessoal'
                amount: parseFloat(newItem.amount),
                due_date: newItem.due_date,
                description: newItem.description,
                status: newItem.status
                // payment_date can be set trigger or extended logic later
            })

            if (error) throw error

            toast({ title: "Registro financeiro adicionado" })
            setOpen(false)
            loadFinancials()
            setNewItem({
                type: "expense",
                amount: "0",
                due_date: new Date().toISOString().split('T')[0],
                description: "",
                status: "pendente",
                category: "pessoal"
            })

        } catch (err: any) {
            toast({ title: "Erro ao adicionar", description: err.message, variant: "destructive" })
        } finally {
            setSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Remover este registro?")) return
        const supabase = createBrowserClient()
        await supabase.from("financial_transactions").delete().eq("id", id)
        loadFinancials()
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Histórico Financeiro (Geral)</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" /> Novo Pagamento
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Novo Lançamento para {user.nome}</DialogTitle>
                            <DialogDescription>Adicione transações vinculadas a este colaborador.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                    placeholder="Ex: Salário, Comissão Venda X, Bônus..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Valor (R$)</Label>
                                    <Input
                                        type="number"
                                        value={newItem.amount}
                                        onChange={e => setNewItem({ ...newItem, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Data Vencimento</Label>
                                    <Input
                                        type="date"
                                        value={newItem.due_date}
                                        onChange={e => setNewItem({ ...newItem, due_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Categoria</Label>
                                    <Select
                                        value={newItem.category}
                                        onValueChange={(v) => setNewItem({ ...newItem, category: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pessoal">Pessoal (Salário/Comissão)</SelectItem>
                                            <SelectItem value="reembolso">Reembolso</SelectItem>
                                            <SelectItem value="outros">Outros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={newItem.status}
                                        onValueChange={(v: any) => setNewItem({ ...newItem, status: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pendente">Pendente</SelectItem>
                                            <SelectItem value="pago">Pago</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAdd} disabled={submitting}>
                                {submitting && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.due_date).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>{item.description || "-"}</TableCell>
                                    <TableCell className="capitalize">{item.category}</TableCell>
                                    <TableCell className={item.type === 'expense' ? 'text-red-500' : 'text-green-600'}>
                                        {item.type === 'expense' ? '-' : '+'}
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === 'pago' ? 'default' : 'outline'}>
                                            {item.status.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(item.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum registro encontrado</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
