"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { FileCheck, AlertCircle, MapPin, User, FileText, CalendarClock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createBrowserClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface PrecatOficio {
    id: string
    credor_nome?: string
    credor_cpf_cnpj?: string
    credor_cidade?: string
    credor_uf?: string
    numero_processo?: string
    numero_precatorio?: string
    responsavel?: string
    usuarios?: { nome: string }
    responsavel_nome?: string
    created_at: string
    status_kanban?: string
    file_url?: string
}

export default function GestaoOficiosPage() {
    const router = useRouter()
    const [precatorios, setPrecatorios] = useState<PrecatOficio[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const carregarDados = async () => {
            const supabase = createBrowserClient()

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

                // Busca precatórios aguardando ofício (sem file_url) ou atribuídos ao gestor de ofícios
                const { data, error: fetchError } = await supabase
                    .from("precatorios")
                    .select(
                        `
            id,
            credor_nome,
            credor_cpf_cnpj,
            credor_cidade,
            credor_uf,
            numero_processo,
            numero_precatorio,
            responsavel,
            created_at,
            status_kanban,
            file_url,
            usuarios!responsavel(nome)
          `
                    )
                    // Filtro: aguardando ofício e ainda sem arquivo anexado
                    .or(`status_kanban.eq.aguardando_oficio,responsavel_oficio_id.eq.${currentUser.id}`)
                    .is("file_url", null)
                    .order("created_at", { ascending: true }) // FIFO: Mais antigos primeiro

                if (fetchError) {
                    console.error("[Ofícios] Erro ao carregar fila:", fetchError)
                    setError("Erro ao carregar fila de ofícios.")
                    setLoading(false)
                    return
                }

                // Mapear para structure plana se necessário
                const formatted = (data || []).map((p: any) => ({
                    ...p,
                    responsavel_nome: p.usuarios?.nome || "Sem responsável"
                }))

                setPrecatorios(formatted)
                setLoading(false)
            } catch (err) {
                console.error("[Ofícios] Erro inesperado:", err)
                setError("Ocorreu um erro inesperado.")
                setLoading(false)
            }
        }

        carregarDados()
    }, [])

    const handleAbrir = (id: string) => {
        router.push(`/precatorios/detalhes?id=${id}`)
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
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Ofícios</h1>
                    <p className="text-muted-foreground">Fila de processos aguardando inclusão de Ofício Requisitório</p>
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
                    <FileCheck className="mx-auto h-12 w-12 opacity-50 mb-4" />
                    <p className="text-lg font-medium">Nenhum precatório nesta fila</p>
                    <p className="text-sm">Processos aguardando ofício aparecerão aqui.</p>
                </Card>
            )}

            <div className="grid gap-4">
                {precatorios.map((p, index) => (
                    <Card
                        key={p.id}
                        className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-cyan-500/40 group relative overflow-hidden"
                        onClick={() => handleAbrir(p.id)}
                    >
                        {/* Efeito de hover suave */}
                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />

                        <CardContent className="p-6 flex items-center justify-between relative z-10">
                            <div className="flex items-start gap-6 flex-1">
                                {/* Índice da Fila */}
                                <div className="flex flex-col items-center justify-center min-w-[3rem]">
                                    <span className="text-4xl font-black text-muted-foreground/20 group-hover:text-primary/40 transition-colors">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                </div>

                                {/* Informações Principais */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">

                                    {/* Coluna 1: Credor */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <User className="w-3 h-3" /> Credor
                                        </label>
                                        <p className="font-medium truncate" title={p.credor_nome}>{p.credor_nome || "Não informado"}</p>
                                        <p className="text-sm text-muted-foreground font-mono">{p.credor_cpf_cnpj || "CPF não inf."}</p>
                                    </div>

                                    {/* Coluna 2: Localização */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> Residência
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {p.credor_cidade ? `${p.credor_cidade}` : "Cidade n/d"}
                                            </span>
                                            {p.credor_uf && <Badge variant="outline" className="text-[10px] h-5">{p.credor_uf}</Badge>}
                                        </div>
                                    </div>

                                    {/* Coluna 3: Processo */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <FileText className="w-3 h-3" /> Processo
                                        </label>
                                        <p className="font-medium text-sm font-mono">{p.numero_processo || "N/A"}</p>
                                        <p className="text-xs text-muted-foreground">{p.numero_precatorio || "Prec. N/A"}</p>
                                    </div>

                                    {/* Coluna 4: Responsável e Data */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <CalendarClock className="w-3 h-3" /> Responsável
                                        </label>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-primary">
                                                {p.responsavel_nome}
                                            </span>
                                            <span className="text-xs text-muted-foreground" title={new Date(p.created_at).toLocaleString()}>
                                                Entrou em: {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Indicator if file exists (Optional check) */}
                            {p.file_url ? (
                                <Badge className="absolute top-4 right-4 bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
                                    <FileCheck className="w-3 h-3 mr-1" /> Ofício Anexado
                                </Badge>
                            ) : (
                                <Badge variant={"outline"} className="absolute top-4 right-4 text-orange-700 bg-orange-50 border-orange-200">
                                    Pendente
                                </Badge>
                            )}

                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
