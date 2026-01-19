"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Scale, AlertCircle, FileText, User, CalendarClock, Briefcase } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabase } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface PrecatJuridico {
    id: string
    credor_nome?: string
    numero_processo?: string
    numero_precatorio?: string
    devedor?: string
    advogado_nome?: string
    responsavel?: string
    created_at: string
    status_kanban?: string
    responsavel_nome?: string
}

export default function JuridicoPage() {
    const router = useRouter()
    const [precatorios, setPrecatorios] = useState<PrecatJuridico[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const carregarDados = async () => {
            const supabase = getSupabase()

            if (!supabase) {
                setLoading(false)
                return
            }

            try {
                const {
                    data: { user: currentUser },
                } = await supabase.auth.getUser()

                if (!currentUser) {
                    setError("Usuário não autenticado.")
                    setLoading(false)
                    return
                }

                // Busca precatórios na fase juridico
                // Ordenação por created_at ASC (Ordem de inclusão/Fila)
                const { data, error: fetchError } = await supabase
                    .from("precatorios")
                    .select(
                        `
            id,
            credor_nome,
            numero_processo,
            numero_precatorio,
            devedor,
            advogado_nome,
            responsavel,
            created_at,
            status_kanban,
            usuarios!responsavel(nome)
          `
                    )
                    // Filtro: Tudo que está em 'juridico' ou 'analise_juridica' ou atribuído
                    .or(`status_kanban.eq.juridico,status_kanban.eq.analise_juridica,responsavel_juridico_id.eq.${currentUser.id}`)
                    .order("created_at", { ascending: true }) // FIFO

                if (fetchError) {
                    console.error("[Jurídico] Erro ao carregar fila:", fetchError)
                    setError("Erro ao carregar fila jurídica.")
                    setLoading(false)
                    return
                }

                const formatted = (data || []).map((p: any) => ({
                    ...p,
                    responsavel_nome: p.usuarios?.nome || "Sem responsável"
                }))

                setPrecatorios(formatted)
                setLoading(false)
            } catch (err) {
                console.error("[Jurídico] Erro inesperado:", err)
                setError("Ocorreu um erro inesperado.")
                setLoading(false)
            }
        }

        carregarDados()
    }, [])

    const handleAbrir = (id: string) => {
        router.push(`/precatorios/visualizar?id=${id}`)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6 container mx-auto p-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fila Jurídica</h1>
                    <p className="text-muted-foreground">Processos aguardando análise jurídica (Ordem de Chegada)</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg px-4 py-1">
                        {precatorios.length} na fila
                    </Badge>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!loading && precatorios.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground bg-muted/50 border-dashed">
                    <Scale className="mx-auto h-12 w-12 opacity-50 mb-4" />
                    <p className="text-lg font-medium">Nenhum precatório nesta fila</p>
                    <p className="text-sm">Processos enviados para o Jurídico aparecerão aqui.</p>
                </Card>
            )}

            <div className="grid gap-4">
                {precatorios.map((p, index) => (
                    <Card
                        key={p.id}
                        className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500/40 group relative overflow-hidden"
                        onClick={() => handleAbrir(p.id)}
                    >
                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors" />

                        <CardContent className="p-6 flex items-center justify-between relative z-10">
                            <div className="flex items-start gap-6 flex-1">
                                {/* Índice */}
                                <div className="flex flex-col items-center justify-center min-w-[3rem]">
                                    <span className="text-4xl font-black text-muted-foreground/20 group-hover:text-blue-500/40 transition-colors">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">

                                    {/* Coluna 1: Credor/Devedor */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <User className="w-3 h-3" /> Partes
                                        </label>
                                        <p className="font-medium truncate" title={p.credor_nome}>{p.credor_nome || "Credor N/I"}</p>
                                        <p className="text-xs text-muted-foreground truncate" title={p.devedor}>Contra: {p.devedor || "Devedor N/I"}</p>
                                    </div>

                                    {/* Coluna 2: Processual */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <FileText className="w-3 h-3" /> Processo
                                        </label>
                                        <p className="font-medium text-sm font-mono">{p.numero_processo || "N/A"}</p>
                                        <p className="text-xs text-muted-foreground">{p.numero_precatorio || "Prec. N/A"}</p>
                                    </div>

                                    {/* Coluna 3: Advogado (Adaptado para Jurídico) */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <Briefcase className="w-3 h-3" /> Advogado Origem
                                        </label>
                                        <p className="font-medium text-sm truncate" title={p.advogado_nome}>{p.advogado_nome || "Não informado"}</p>
                                    </div>

                                    {/* Coluna 4: Responsável e Data */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <CalendarClock className="w-3 h-3" /> Responsável
                                        </label>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-blue-600">
                                                {p.responsavel_nome}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
