"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/client"
import { FileCheck, Search, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface Precatorio {
    id: string
    numero_precatorio: string
    credor_nome: string
    valor_atualizado: number
    status: string
    certidoes_completas: number
    certidoes_total: number
    certidoes_vencidas: number
}

export default function GestaoCertidoesPage() {
    const router = useRouter()
    const [precatorios, setPrecatorios] = useState<Precatorio[]>([])
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        verificarAcessoECarregarDados()
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

            if (!userData || (!userData.role.includes("admin") && !userData.role.includes("gestor_certidoes"))) {
                router.push("/");
                return
            }

            setUserRole(userData.role.includes("admin") ? "admin" : "gestor_certidoes")
            await carregarPrecatorios(user.id, userData.role.includes("admin") ? "admin" : "gestor_certidoes")
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
          status
        `)
                .eq("status_kanban", "certidoes") // Apenas precatórios na coluna de certidões

            // Se não for admin, filtrava por ID, mas agora usamos política para visão global na gestão
            // if (role !== "admin") {
            //     query = query.eq("responsavel_certidoes_id", userId)
            // }

            const { data, error } = await query.order("created_at", { ascending: false })

            if (error) throw error

            // Para cada precatório, buscar status das certidões
            const precatoriosComCertidoes = await Promise.all(
                (data || []).map(async (prec) => {
                    const { data: itens } = await supabase.rpc("obter_itens_precatorio", {
                        p_precatorio_id: prec.id
                    })

                    const certidoesTotal = itens?.length || 0
                    const certidoesCompletas = itens?.filter((i: any) =>
                        i.status_item === "RECEBIDO" || i.status_item === "NAO_APLICAVEL"
                    ).length || 0

                    const certidoesVencidas = itens?.filter((i: any) => {
                        if (!i.validade) return false
                        const hoje = new Date()
                        const dataValidade = new Date(i.validade)
                        return dataValidade < hoje
                    }).length || 0

                    return {
                        ...prec,
                        certidoes_completas: certidoesCompletas,
                        certidoes_total: certidoesTotal,
                        certidoes_vencidas: certidoesVencidas
                    }
                })
            )

            setPrecatorios(precatoriosComCertidoes)
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
        comPendencias: precatorios.filter(p => p.certidoes_completas < p.certidoes_total).length,
        comVencidas: precatorios.filter(p => p.certidoes_vencidas > 0).length,
        completos: precatorios.filter(p => p.certidoes_completas === p.certidoes_total && p.certidoes_total > 0).length
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
                        Gestão de Certidões
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {userRole === "admin" ? "Todos os precatórios" : "Precatórios atribuídos a você"}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{stats.comPendencias}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Com Vencidas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.comVencidas}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Completos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.completos}</div>
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
                    const percentualCompleto = precatorio.certidoes_total > 0
                        ? Math.round((precatorio.certidoes_completas / precatorio.certidoes_total) * 100)
                        : 0

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
                                    {precatorio.certidoes_vencidas > 0 && (
                                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 ml-2" />
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Progresso */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Certidões</span>
                                        <span className="font-medium">
                                            {precatorio.certidoes_completas}/{precatorio.certidoes_total}
                                        </span>
                                    </div>
                                    <Progress value={percentualCompleto} className="h-2" />
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{percentualCompleto}% concluído</span>
                                        {precatorio.certidoes_vencidas > 0 && (
                                            <span className="text-red-600 font-medium">
                                                {precatorio.certidoes_vencidas} vencida(s)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Status Badge */}
                                {percentualCompleto === 100 ? (
                                    <Badge className="w-full justify-center bg-green-500 hover:bg-green-600">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Completo
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="w-full justify-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Em andamento
                                    </Badge>
                                )}

                                {/* Botão Visualizar */}
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.push(`/precatorios/visualizar?id=${precatorio.id}`)}
                                >
                                    <FileCheck className="h-4 w-4 mr-2" />
                                    Visualizar Certidões
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}

                {precatoriosFiltrados.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
