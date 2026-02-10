"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, ShieldCheck } from "lucide-react"

type ResultItem = {
    id: string
    numero_precatorio: string | null
    numero_processo: string | null
    credor_nome: string | null
    status: string | null
    localizacao_kanban: string | null
    responsavel_nome: string | null
    responsavel_calculo_nome: string | null
    created_at: string
}

export default function AcessoControladoPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [allowed, setAllowed] = useState(false)
    const [term, setTerm] = useState("")
    const [searching, setSearching] = useState(false)
    const [results, setResults] = useState<ResultItem[]>([])
    const [error, setError] = useState<string | null>(null)

    const canSearch = useMemo(() => term.trim().length >= 3, [term])

    useEffect(() => {
        ; (async () => {
            const supabase = getSupabase()
            if (!supabase) return

            const { data: auth } = await supabase.auth.getUser()
            if (!auth?.user) {
                setAllowed(false)
                setLoading(false)
                return
            }

            const { data: profile } = await supabase
                .from("usuarios")
                .select("role")
                .eq("id", auth.user.id)
                .single()

            const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as string[]
            const ok = roles.includes("admin") || roles.includes("gestor_certidoes") || roles.includes("juridico")

            setAllowed(ok)
            setLoading(false)
        })()
    }, [])

    async function onSearch() {
        setError(null)
        if (!canSearch) return

        setSearching(true)
        try {
            const supabase = getSupabase()
            if (!supabase) return

            const { data, error } = await supabase.rpc("buscar_precatorios_acesso_controlado", {
                p_termo: term.trim(),
            })

            if (error) throw error
            setResults((data as ResultItem[]) || [])
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Erro ao buscar."
            setError(message)
            setResults([])
        } finally {
            setSearching(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
        )
    }

    if (!allowed) {
        return (
            <div className="container mx-auto max-w-3xl p-6">
                <Card className="border border-border/60 bg-card/80">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Acesso Controlado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Você não tem permissão para acessar esta área.
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-5xl p-6 space-y-6">
            <Card className="border border-border/60 bg-card/80 shadow-sm">
                <CardHeader className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Acesso Controlado
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Busque por <b>Nome</b>, <b>Nº do Precatório</b> ou <b>Nº do Processo</b> (mínimo 3 caracteres).
                    </p>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                placeholder="Ex: Maria, 0001234-56.2023..., 12345/2024..."
                                className="pl-10"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") onSearch()
                                }}
                            />
                        </div>
                        <Button onClick={onSearch} disabled={!canSearch || searching}>
                            {searching ? "Buscando..." : "Buscar"}
                        </Button>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600">{error}</div>
                    )}

                    <div className="space-y-3">
                        {results.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                                Nenhum resultado.
                            </div>
                        ) : (
                            results.map((r) => (
                                <Card key={r.id} className="border border-border/60 bg-background/60">
                                    <CardContent className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="font-semibold truncate max-w-[520px]">
                                                    {r.credor_nome || "Credor N/I"}
                                                </p>
                                                <Badge variant="outline" className="text-[11px]">
                                                    {r.localizacao_kanban || r.status || "N/I"}
                                                </Badge>
                                            </div>

                                            <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                                <div className="truncate">
                                                    Prec.: {r.numero_precatorio || "N/A"} • Proc.: {r.numero_processo || "N/A"}
                                                </div>
                                                <div className="truncate">
                                                    Resp.: {r.responsavel_calculo_nome || r.responsavel_nome || "Não atribuído"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => router.push(`/precatorios/detalhes?id=${r.id}&forced=1`)}
                                            >
                                                Acessar
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
