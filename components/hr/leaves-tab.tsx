"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Usuario, HRLeave } from "@/lib/types/database"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { CalendarIcon, Plus, Loader2, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface LeavesTabProps {
    user: Usuario
}

export function LeavesTab({ user }: LeavesTabProps) {
    const [items, setItems] = useState<HRLeave[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [newItem, setNewItem] = useState({
        type: "atestado" as const,
        start_date: new Date().toISOString().split('T')[0],
        end_date: "",
        description: "",
    })
    const { toast } = useToast()

    useEffect(() => {
        loadLeaves()
    }, [user.id])

    async function loadLeaves() {
        const supabase = createBrowserClient()
        const { data } = await supabase
            .from("hr_leaves")
            .select("*")
            .eq("user_id", user.id)
            .order("start_date", { ascending: false })

        if (data) setItems(data as HRLeave[])
        setLoading(false)
    }

    async function handleAdd() {
        if (!newItem.start_date) return

        setSubmitting(true)
        const supabase = createBrowserClient()
        try {
            const { error } = await supabase.from("hr_leaves").insert({
                user_id: user.id,
                type: newItem.type,
                start_date: newItem.start_date,
                end_date: newItem.end_date || null,
                description: newItem.description,
            })

            if (error) throw error

            toast({ title: "Ocorrência registrada" })
            setOpen(false)
            loadLeaves()
            setNewItem({ type: "atestado", start_date: new Date().toISOString().split('T')[0], end_date: "", description: "" })

        } catch (err: any) {
            toast({ title: "Erro ao adicionar", description: err.message, variant: "destructive" })
        } finally {
            setSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Remover este registro?")) return
        const supabase = createBrowserClient()
        await supabase.from("hr_leaves").delete().eq("id", id)
        loadLeaves()
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Afastamentos e Licenças</h3>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Nova Ocorrência
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Ocorrência</DialogTitle>
                            <DialogDescription>Atestados, faltas ou férias.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                    value={newItem.type}
                                    onValueChange={(v: any) => setNewItem({ ...newItem, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="atestado">Atestado Médico</SelectItem>
                                        <SelectItem value="falta">Falta Injustificada</SelectItem>
                                        <SelectItem value="ferias">Férias</SelectItem>
                                        <SelectItem value="licenca">Licença</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Início</Label>
                                    <Input
                                        type="date"
                                        value={newItem.start_date}
                                        onChange={e => setNewItem({ ...newItem, start_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Fim (Opcional)</Label>
                                    <Input
                                        type="date"
                                        value={newItem.end_date}
                                        onChange={e => setNewItem({ ...newItem, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Observação</Label>
                                <Input
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                    placeholder="CID ou motivo"
                                />
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
                                <TableHead>Tipo</TableHead>
                                <TableHead>Período</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="capitalize flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                        {item.type}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(item.start_date).toLocaleDateString('pt-BR')}
                                        {item.end_date && ` até ${new Date(item.end_date).toLocaleDateString('pt-BR')}`}
                                    </TableCell>
                                    <TableCell>{item.description || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(item.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhuma ocorrência registrada</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
