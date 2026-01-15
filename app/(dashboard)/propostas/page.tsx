"use client"
/* eslint-disable */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import {
    FileCheck,
    Search,
    Filter,
    Printer,
    CheckCircle2,
    Clock,
    AlertCircle,
    Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { ModalDetalhesKanban } from "@/components/kanban/modal-detalhes-kanban"

export default function PropostasPage() {
    const { profile } = useAuth()
    const [precatorios, setPrecatorios] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)

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
                // Filtramos por precatórios que estão na fase de proposta ou já têm alguma validação
                .or('status_kanban.eq.proposta_negociacao,validacao_calculo_ok.is.true,validacao_juridico_ok.is.true')

            // Se não for admin, vê apenas o que ele é dono ou responsável
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

    const filteredPrecatorios = precatorios.filter(p =>
        p.credor_nome?.toLowerCase().includes(search.toLowerCase()) ||
        p.numero_precatorio?.includes(search) ||
        p.numero_processo?.includes(search)
    )

    const renderValidationBadge = (isValid: boolean, label: string) => (
        <div className="flex items-center gap-1 text-xs">
            {isValid ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
            ) : (
                <Clock className="h-3 w-3 text-amber-500" />
            )}
            <span className={isValid ? "text-green-700 font-medium" : "text-amber-700"}>
                {label}
            </span>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Central de Propostas</h1>
                    <p className="text-muted-foreground">
                        {isAdmin ? "Visão global de todas as propostas em validação." : "Gerencie suas propostas e acompanhe as validações."}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por credor, processo ou precatório..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-md"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Credor / Processo</TableHead>
                                <TableHead>Status Kanban</TableHead>
                                <TableHead>Validações</TableHead>
                                <TableHead>Valor Proposta</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">Carregando...</TableCell>
                                </TableRow>
                            ) : filteredPrecatorios.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        Nenhuma proposta encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPrecatorios.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <div className="font-medium">{p.credor_nome || "N/A"}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {p.numero_processo || "S/ Proc."} {p.responsavel_obj?.nome ? `• Resp: ${p.responsavel_obj.nome}` : ""}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {p.status_kanban?.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                {renderValidationBadge(p.validacao_calculo_ok, "Cálculo")}
                                                {renderValidationBadge(p.validacao_juridico_ok, "Jurídico")}
                                                {renderValidationBadge(p.validacao_comercial_ok, "Comercial")}
                                                {renderValidationBadge(p.validacao_admin_ok, "Admin")}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-primary">
                                                {(p.proposta_maior_valor || p.proposta_menor_valor || 0).toLocaleString("pt-BR", {
                                                    style: "currency",
                                                    currency: "BRL"
                                                })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedId(p.id)
                                                    setModalOpen(true)
                                                }}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Ver Detalhes
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedId && (
                <ModalDetalhesKanban
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                    precatorioId={selectedId}
                    onUpdate={loadPropostas}
                />
            )}
        </div>
    )
}
