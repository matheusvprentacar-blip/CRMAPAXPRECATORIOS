"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Loader2, Trash2, Pencil } from "lucide-react"
import { useState } from "react"
import { FinancialTransaction } from "@/lib/types/database"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { EditTransactionModal } from "@/components/finance/edit-transaction-modal"

interface ExtendedFinancial extends FinancialTransaction {
    usuarios?: {
        nome: string
        email: string
    }
}

interface TransactionsTableProps {
    data: ExtendedFinancial[]
    onUpdate: () => void
}

export function GlobalTransactionsTable({ data, onUpdate }: TransactionsTableProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [updating, setUpdating] = useState<string | null>(null)
    const [editingItem, setEditingItem] = useState<ExtendedFinancial | null>(null)
    const { toast } = useToast()

    async function toggleStatus(id: string, currentStatus: string) {
        if (updating) return
        setUpdating(id)

        const newStatus = currentStatus === 'pendente' ? 'pago' : 'pendente'
        const supabase = createBrowserClient()

        try {
            if (!supabase) throw new Error("Cliente Supabase não inicializado")
            const { error } = await supabase.from('financial_transactions').update({ status: newStatus }).eq('id', id)
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
            const { error } = await supabase.from('financial_transactions').delete().eq('id', id)
            if (error) throw error
            onUpdate()
            toast({ title: "Excluído", description: "Transação removida com sucesso" })
        } catch (err: any) {
            toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" })
        }
    }

    const filteredData = data.filter(item => {
        const matchesSearch = (item.usuarios?.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description || "").toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-4">
            <EditTransactionModal
                open={!!editingItem}
                onOpenChange={(op) => !op && setEditingItem(null)}
                transaction={editingItem as any}
                onSuccess={onUpdate}
            />

            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou descrição..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-48">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Status</SelectItem>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="pago">Pago</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="rounded-md border">
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
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Nenhum registro encontrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{new Date(item.due_date).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.description}</span>
                                            {item.usuarios?.nome && <span className="text-xs text-muted-foreground">{item.usuarios.nome}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="capitalize">{item.category}</TableCell>
                                    <TableCell className={item.type === 'expense' ? 'text-red-500' : 'text-green-600'}>
                                        {item.type === 'expense' ? '-' : '+'}
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.amount))}
                                    </TableCell>
                                    <TableCell>
                                        <div onClick={() => toggleStatus(item.id, item.status)} className="cursor-pointer hover:opacity-80">
                                            <Badge variant={item.status === 'pago' ? 'default' : 'outline'}>
                                                {item.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                                                <Pencil className="w-4 h-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

