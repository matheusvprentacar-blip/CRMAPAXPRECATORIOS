"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/client"
import { FileText, Search, AlertCircle, CheckCircle2, Clock } from "lucide-react"

interface Precatorio {
    id: string
    numero_precatorio: string
    credor_nome: string
    valor_atualizado: number
    status: string
    numero_oficio: string | null
}

export default function GestaoOficiosPage() {
    const router = useRouter()
    const [precatorios, setPrecatorios] = useState<Precatorio[]>([])
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        verificarAcessoECarregarDados()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function verificarAcessoECarregarDados() {
        try {
            const supabase = createBrowserClient()
            if (!supabase) return

            // Verificar role do usuário
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            const { data: userData } = await supabase
                .from("usuarios")
                .select("role")
                .eq("id", user.id)
                .single()

            if (!userData || (!userData.role.includes("admin") && !userData.role.includes("gestor_oficio"))) {
                router.push("/")
                return
            }

            setUserRole(userData.role.includes("admin") ? "admin" : "gestor_oficio")
            await carregarPrecatorios(user.id, userData.role.includes("admin") ? "admin" : "gestor_oficio")
        } catch (error) {
            console.error("Erro ao verificar acesso:", error)
            router.push("/")
        }
    }

    async function carregarPrecatorios(userId: string, role: string) {
        try {
            setLoading(true)
            const supabase = createBrowserClient()
            if (!supabase) return

            let query = supabase
                .from("precatorios")
                .select(`
          id,
          numero_precatorio,
          credor_nome,
          valor_atualizado,
          status,
          numero_oficio
        `)
                .eq("status_kanban", "pronto_calculo") // Apenas precatórios prontos para cálculo

            // Se não for admin, filtrar apenas precatórios atribuídos OU sem responsável (fila)
            if (role !== "admin") {
                query = query.or(`responsavel_oficio_id.eq.${userId},responsavel_oficio_id.is.null`)
            }

            const { data, error } = await query.order("created_at", { ascending: false })

            if (error) throw error

            setPrecatorios(data || [])
        } catch (error) {
            console.error("Erro ao carregar precatórios:", error)
        } finally {
            setLoading(false)
        }
    }

    const precatoriosFiltrados = precatorios.filter(p =>
        p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const stats = {
        total: precatorios.length,
        comOficio: precatorios.filter(p => p.numero_oficio).length,
        semOficio: precatorios.filter(p => !p.numero_oficio).length,
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-7xl p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Gestão de Ofícios Requisitórios
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {userRole === "admin" ? "Todos os precatórios prontos para cálculo" : "Precatórios atribuídos a você"}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Sem Ofício</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{stats.semOficio}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Com Ofício</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.comOficio}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Busca */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por número ou credor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>

            {/* Lista de Precatórios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {precatoriosFiltrados.map((precatorio) => {
                    return (
                        <Card key={precatorio.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-base font-semibold truncate">
                                            {precatorio.numero_precatorio || "Sem número"}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1 truncate">
                                            {precatorio.credor_nome}
                                        </p>
                                    </div>
                                    {!precatorio.numero_oficio && (
                                        <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 ml-2" />
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Status do Ofício */}
                                <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                        Número do Ofício
                                    </div>
                                    {precatorio.numero_oficio ? (
                                        <div className="text-sm font-semibold text-foreground">
                                            {precatorio.numero_oficio}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground italic">
                                            Não informado
                                        </div>
                                    )}
                                </div>

                                {/* Status Badge */}
                                {precatorio.numero_oficio ? (
                                    <Badge className="w-full justify-center bg-green-500 hover:bg-green-600">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Ofício Incluído
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="w-full justify-center border-yellow-500 text-yellow-600">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Aguardando Ofício
                                    </Badge>
                                )}

                                {/* Botão Visualizar */}
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.push(`/precatorios/visualizar?id=${precatorio.id}`)}
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Visualizar Detalhes
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}

                {precatoriosFiltrados.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum precatório encontrado</p>
                        {searchTerm && (
                            <p className="text-sm mt-2">Tente ajustar os filtros de busca</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
