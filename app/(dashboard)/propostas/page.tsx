"use client"
/* eslint-disable */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
    Eye,
    User
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"

export default function PropostasPage() {
    const router = useRouter()
    const { profile } = useAuth()
    const [precatorios, setPrecatorios] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

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
                .or('status_kanban.eq.proposta_negociacao,validacao_calculo_ok.is.true,validacao_juridico_ok.is.true')

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

    // Helper components
    function StatusDot({ valid }: { valid: boolean }) {
        const Icon = valid ? CheckCircle2 : Clock
        return <Icon className={`h-3 w-3 ${valid ? "text-emerald-500" : "text-amber-500"}`} />
    }

    function ValidationPill({ label, valid }: { label: string, valid: boolean }) {
        return (
            <div className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors
                ${valid
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-400"
                }`}>
                <StatusDot valid={valid} />
                <span className="leading-none">{label}</span>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-[100vw] p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Central de Propostas</h1>
                    <p className="text-muted-foreground">
                        {isAdmin ? "Visão global de todas as propostas em validação." : "Gerencie suas propostas e acompanhe as validações."}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{filteredPrecatorios.length}</span>
                    <span className="text-sm text-muted-foreground">encontrados</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="mt-6 space-y-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por credor, processo ou precatório..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredPrecatorios.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <Search className="h-16 w-16 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">
                                        {search ? "Nenhuma proposta encontrada" : "Lista vazia"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground text-center max-w-md">
                                        {search ? "Tente ajustar os termos da busca" : "Não há propostas disponíveis no momento."}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            filteredPrecatorios.map((p, index) => (
                                <Card
                                    key={p.id}
                                    onClick={() => router.push(`/precatorios/detalhes?id=${p.id}`)}
                                    className="hover:shadow-md transition-shadow cursor-pointer border-l-4 group relative overflow-hidden border-l-primary/60"
                                >
                                    <div className="absolute inset-0 transition-colors bg-primary/0 group-hover:bg-primary/5" />

                                    <CardContent className="p-6 relative z-10 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-6 flex-1">
                                                {/* Índice */}
                                                <div className="flex flex-col items-center justify-center min-w-[3rem]">
                                                    <span className="text-4xl font-black text-muted-foreground/20 transition-colors group-hover:text-primary/20">
                                                        {String(index + 1).padStart(2, '0')}
                                                    </span>
                                                </div>

                                                {/* Colunas de Dados */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">

                                                    {/* 1. Credor & Status */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                                Credor
                                                            </span>
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1 border capitalize">
                                                                {p.status_kanban?.replace("_", " ") || "Status N/I"}
                                                            </Badge>
                                                        </div>
                                                        <p className="font-medium truncate text-base" title={p.credor_nome}>{p.credor_nome || "Nome não informado"}</p>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            <ValidationPill label="Cálculo" valid={p.validacao_calculo_ok} />
                                                            <ValidationPill label="Jurídico" valid={p.validacao_juridico_ok} />
                                                            <ValidationPill label="Comercial" valid={p.validacao_comercial_ok} />
                                                            <ValidationPill label="Admin" valid={p.validacao_admin_ok} />
                                                        </div>
                                                    </div>

                                                    {/* 2. Valor Proposta */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                            Valor Proposta
                                                        </label>
                                                        <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">
                                                            {(p.proposta_maior_valor || p.proposta_menor_valor || 0).toLocaleString("pt-BR", {
                                                                style: "currency",
                                                                currency: "BRL"
                                                            })}
                                                        </span>
                                                        <p className="text-xs text-muted-foreground">
                                                            Base Líquida: {p.saldo_liquido ? p.saldo_liquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
                                                        </p>
                                                    </div>

                                                    {/* 3. Processo Info */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> Processo
                                                        </label>
                                                        <p className="font-medium text-sm font-mono">{p.numero_processo || "N/A"}</p>
                                                        <p className="text-xs text-muted-foreground">Prec: {p.numero_precatorio || "N/A"}</p>
                                                    </div>

                                                    {/* 4. Responsável */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                            <User className="w-3 h-3" /> Responsável
                                                        </label>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-medium truncate" title={p.responsavel_obj?.nome || "Não atribuído"}>
                                                                {p.responsavel_obj?.nome || "Não atribuído"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ações */}
                                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/50">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="bg-secondary/50 hover:bg-secondary text-xs h-8"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    router.push(`/precatorios/detalhes?id=${p.id}`)
                                                }}
                                            >
                                                <Eye className="h-3 w-3 mr-2" />
                                                Ver Detalhes
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
