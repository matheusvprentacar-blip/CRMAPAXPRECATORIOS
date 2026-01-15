"use client"
/* eslint-disable */

import { useState, useEffect } from "react"
import { RoleGuard } from "@/lib/auth/role-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Scale, Clock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function JuridicoPage() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loading, setLoading] = useState(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [precatorios, setPrecatorios] = useState<any[]>([])
    const [stats, setStats] = useState({
        pendentes: 0,
        realizados: 0,
        riscos: 0
    })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            setLoading(true)
            const supabase = createBrowserClient()
            if (!supabase) return

            // Buscar precatórios com status 'juridico'
            const { data, error } = await supabase
                .from('precatorios')
                .select('*')
                .eq('status_kanban', 'analise_juridica')
                .order('created_at', { ascending: false })

            if (error) throw error

            if (data) {
                setPrecatorios(data)
                setStats({
                    pendentes: data.length,
                    realizados: 0, // Implementar lógica de realizados se houver histórico
                    riscos: 0 // Implementar lógica de risco se houver campo
                })
            }
        } catch (error) {
            console.error("Erro ao carregar dados do jurídico:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <RoleGuard allowedRoles={["admin", "juridico", "gestor"]}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Painel Jurídico</h1>
                    <p className="text-muted-foreground">
                        Gerencie pareceres jurídicos e analise riscos processuais.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pareceres Pendentes</CardTitle>
                            <Clock className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pendentes}</div>
                            <p className="text-xs text-muted-foreground">Aguardando análise</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pareceres Realizados</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.realizados}</div>
                            <p className="text-xs text-muted-foreground">Neste mês</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Riscos Elevados</CardTitle>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.riscos}</div>
                            <p className="text-xs text-muted-foreground">Processos críticos</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="pendentes" className="w-full">
                    <TabsList>
                        <TabsTrigger value="pendentes">Pendentes de Análise</TabsTrigger>
                        <TabsTrigger value="andamento">Em Andamento</TabsTrigger>
                        <TabsTrigger value="historico">Histórico Completo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pendentes" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Solicitações Pendentes</CardTitle>
                                <CardDescription>
                                    Precatórios aguardando parecer jurídico.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : precatorios.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border-dashed border-2">
                                        <Scale className="h-10 w-10 mb-2 opacity-20" />
                                        <p>Nenhuma solicitação pendente no momento.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {precatorios.map(precatorio => (
                                            <div key={precatorio.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{precatorio.credor_nome || "Credor não informado"}</span>
                                                        <Badge variant="outline">{precatorio.numero_processo}</Badge>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground flex gap-4">
                                                        <span>Tribunal: {precatorio.tribunal}</span>
                                                        <span>Valor: {precatorio.valor_principal ? `R$ ${precatorio.valor_principal.toLocaleString('pt-BR')}` : '-'}</span>
                                                    </div>
                                                </div>
                                                <Button size="sm" asChild>
                                                    <Link href={`/juridico/analise?id=${precatorio.id}`}>
                                                        Analisar
                                                        <ArrowRight className="ml-2 h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="andamento" className="mt-4">
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                <p>Nenhuma análise em andamento.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="historico" className="mt-4">
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                <p>Histórico vazio.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </RoleGuard>
    )
}
