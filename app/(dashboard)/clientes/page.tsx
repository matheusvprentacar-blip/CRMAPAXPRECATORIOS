"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Search, User, MapPin, Phone, Mail, FileText, ChevronRight, Calculator } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { CredorView, Precatorio } from "@/lib/types/database"
import { useRouter } from "next/navigation"

export default function ClientsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [credores, setCredores] = useState<CredorView[]>([])
    const [searchTerm, setSearchTerm] = useState("")

    // Modal states
    const [selectedCredor, setSelectedCredor] = useState<CredorView | null>(null)
    const [credorPrecatorios, setCredorPrecatorios] = useState<Precatorio[]>([])
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)

    useEffect(() => {
        loadCredores()
    }, [])

    async function loadCredores() {
        setLoading(true)
        try {
            const supabase = getSupabase()
            if (!supabase) return

            const { data, error } = await supabase
                .from("view_credores")
                .select("*")
                .order("total_precatorios", { ascending: false })
                .limit(100) // Initial limit for performance

            if (error) {
                console.error("Erro ao carregar credores:", error)
                // Fallback para tabela normal se view não existir (dev mode)
                return
            }

            setCredores(data || [])
        } catch (error) {
            console.error("Erro:", error)
        } finally {
            setLoading(false)
        }
    }

    async function openCredorDetails(credor: CredorView) {
        setSelectedCredor(credor)
        setModalOpen(true)
        setLoadingDetails(true)

        try {
            const supabase = getSupabase()
            if (!supabase) return

            let query = supabase
                .from("precatorios")
                .select("*")
                .order("created_at", { ascending: false })

            // Filter by CPF if available, otherwise by Name
            if (credor.credor_cpf_cnpj && !credor.credor_cpf_cnpj.startsWith('SEM_CPF')) {
                query = query.eq("credor_cpf_cnpj", credor.credor_cpf_cnpj)
            } else {
                query = query.eq("credor_nome", credor.credor_nome)
            }

            const { data, error } = await query

            if (error) throw error
            setCredorPrecatorios(data || [])
        } catch (error) {
            console.error("Erro ao carregar detalhes:", error)
        } finally {
            setLoadingDetails(false)
        }
    }

    const filteredCredores = credores.filter(c =>
        c.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.credor_cpf_cnpj?.includes(searchTerm) ||
        c.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-[100vw]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Clientes</h1>
                    <p className="text-muted-foreground">
                        Base consolidada de credores e histórico de processos.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 px-4 py-2 rounded-lg">
                    <User className="h-5 w-5 text-orange-600" />
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-orange-600 uppercase">Total de Credores</span>
                        <span className="text-xl font-bold text-orange-700">{credores.length}</span>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome, CPF/CNPJ ou cidade..."
                            className="pl-9 max-w-md"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Credor</TableHead>
                                        <TableHead>Localização</TableHead>
                                        <TableHead>Contatos</TableHead>
                                        <TableHead className="text-center">Qtd. Processos</TableHead>
                                        <TableHead className="text-right">Total Acumulado</TableHead>
                                        <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCredores.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Nenhum cliente encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCredores.map((credor) => (
                                            <TableRow key={credor.id_unico} className="cursor-pointer hover:bg-muted" onClick={() => openCredorDetails(credor)}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{credor.credor_nome}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {credor.credor_cpf_cnpj && !credor.credor_cpf_cnpj.startsWith('SEM_CPF')
                                                                ? credor.credor_cpf_cnpj
                                                                : 'CPF não informado'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {credor.cidade ? (
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <MapPin className="h-3 w-3" />
                                                            {credor.cidade}/{credor.uf}
                                                        </div>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {credor.telefone && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Phone className="h-3 w-3" /> {credor.telefone}
                                                            </div>
                                                        )}
                                                        {credor.email && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Mail className="h-3 w-3" /> {credor.email}
                                                            </div>
                                                        )}
                                                        {!credor.telefone && !credor.email && '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary" className="font-mono">
                                                        {credor.total_precatorios}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-emerald-600">
                                                    {credor.valor_total_principal
                                                        ? `R$ ${credor.valor_total_principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                        : 'R$ 0,00'}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon">
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Detalhes */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedCredor?.credor_nome}</DialogTitle>
                        <DialogDescription>
                            CPF/CNPJ: {selectedCredor?.credor_cpf_cnpj && !selectedCredor?.credor_cpf_cnpj.startsWith('SEM_CPF') ? selectedCredor.credor_cpf_cnpj : "Não informado"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="p-4 pb-2">
                                    <CardDescription>Total Processos</CardDescription>
                                    <CardTitle className="text-2xl">{selectedCredor?.total_precatorios}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="p-4 pb-2">
                                    <CardDescription>Valor em Carteira</CardDescription>
                                    <CardTitle className="text-2xl text-emerald-600">
                                        {selectedCredor?.valor_total_principal
                                            ? `R$ ${selectedCredor.valor_total_principal.toLocaleString('pt-BR', { notation: 'compact' })}`
                                            : 'R$ 0'}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="p-4 pb-2">
                                    <CardDescription>Localização</CardDescription>
                                    <CardTitle className="text-lg truncate">
                                        {selectedCredor?.cidade ? `${selectedCredor.cidade}/${selectedCredor.uf}` : "N/I"}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Histórico de Processos
                            </h3>

                            {loadingDetails ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {credorPrecatorios.map((precatorio, index) => (
                                        <Card
                                            key={precatorio.id}
                                            className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500/40 group relative overflow-hidden"
                                            onClick={() => {
                                                // Close modal and navigate
                                                setModalOpen(false)
                                                router.push(`/precatorios/visualizar?id=${precatorio.id}`)
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors" />

                                            <CardContent className="p-5 relative z-10 space-y-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-4 flex-1">
                                                        {/* Índice */}
                                                        <div className="flex flex-col items-center justify-center min-w-[2.5rem]">
                                                            <span className="text-3xl font-black text-muted-foreground/20 group-hover:text-orange-500/40 transition-colors">
                                                                {String(index + 1).padStart(2, '0')}
                                                            </span>
                                                        </div>

                                                        {/* Colunas de Dados */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">

                                                            {/* 1. Processo & Status */}
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                                        <FileText className="w-3 h-3" /> Processo
                                                                    </span>
                                                                    <Badge variant={precatorio.status === 'concluido' ? 'default' : 'outline'} className="text-[10px] h-4 px-1 rounded-sm">
                                                                        {precatorio.status?.replace('_', ' ')}
                                                                    </Badge>
                                                                </div>
                                                                <p className="font-medium text-sm font-mono truncate" title={precatorio.numero_processo || ""}>{precatorio.numero_processo || "N/A"}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{precatorio.numero_precatorio || "Prec. N/A"}</p>
                                                            </div>

                                                            {/* 2. Valor */}
                                                            <div className="space-y-1">
                                                                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                                    <Calculator className="w-3 h-3" /> Valor
                                                                </label>
                                                                <span className="font-bold text-lg text-emerald-600">
                                                                    {precatorio.valor_principal ? `R$ ${precatorio.valor_principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00"}
                                                                </span>
                                                            </div>

                                                            {/* 3. Data e Detalhes */}
                                                            <div className="md:col-span-2 flex items-center justify-between pt-2 border-t border-border/50 mt-1">
                                                                <div className="text-xs text-muted-foreground">
                                                                    Criado em: {new Date(precatorio.created_at).toLocaleDateString()}
                                                                </div>
                                                                <div className="text-xs font-medium text-orange-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    Ver detalhes <ChevronRight className="w-3 h-3" />
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
