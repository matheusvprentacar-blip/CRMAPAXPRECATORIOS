"use client"
/* eslint-disable */

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Scale, FileText, AlertCircle } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { FormParecerJuridico } from "@/components/kanban/form-parecer-juridico"
import { Badge } from "@/components/ui/badge"
import { RoleGuard } from "@/lib/auth/role-guard"

function AnaliseJuridicaContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const id = searchParams.get("id")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [precatorio, setPrecatorio] = useState<any>(null)
    const [loading, setLoading] = useState<boolean>(true)

    async function loadPrecatorio() {
        if (!id) return
        setLoading(true)
        const supabase = createBrowserClient()
        if (!supabase) return

        const { data, error } = await supabase
            .from("precatorios")
            .select("*")
            .eq("id", id)
            .single()

        if (error || !data) {
            console.error("Erro ao carregar precatório:", error)
        } else {
            setPrecatorio(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadPrecatorio()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!precatorio) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="pt-6">
                        <p>Precatório não encontrado.</p>
                        <Button onClick={() => router.push('/juridico')} variant="outline" className="mt-4">
                            Voltar
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <RoleGuard allowedRoles={['admin', 'juridico', 'gestor']}>
            <div className="container mx-auto max-w-4xl p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/juridico')}
                        className="hover:bg-muted/50"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            Jurídico
                            <Badge variant="outline">{precatorio.numero_processo}</Badge>
                        </h1>
                        <p className="text-muted-foreground">{precatorio.credor_nome} - {precatorio.tribunal}</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    {/* Resumo do Caso */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Resumo do Caso
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Valor Principal</p>
                                    <p className="font-semibold">
                                        {precatorio.valor_principal ? `R$ ${precatorio.valor_principal.toLocaleString('pt-BR')}` : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Status Atual</p>
                                    <Badge>{precatorio.status_kanban?.replace('_', ' ').toUpperCase() || 'N/A'}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Formulário de Análise */}
                    <Card className="border-l-4 border-l-primary">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Scale className="h-5 w-5 text-primary" />
                                Parecer Jurídico
                            </CardTitle>
                            <CardDescription>
                                Analise as informações e emita seu parecer técnico.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* 
                        Se estiver em 'juridico', mostra o form de parecer.
                        Se não, mostra alerta ou o form de solicitação (caso queira re-solicitar? 
                        Mas na página de análise geralmente é para DAR o parecer).
                     */}
                            {precatorio.status_kanban === "juridico" ? (
                                <FormParecerJuridico
                                    precatorioId={id!}
                                    precatorio={precatorio}
                                    onUpdate={() => {
                                        loadPrecatorio()
                                        setTimeout(() => router.push('/juridico'), 1500) // Redirect after success?
                                    }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-lg">
                                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold">Este precatório não está em Jurídico</h3>
                                    <p className="text-muted-foreground mt-2">
                                        Status atual: <span className="font-mono">{precatorio.status_kanban}</span>
                                    </p>
                                    <Button variant="outline" className="mt-6" onClick={() => router.push('/juridico')}>
                                        Voltar para Painel
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </RoleGuard>
    )
}

export default function AnaliseJuridicaClient() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <AnaliseJuridicaContent />
        </Suspense>
    )
}

