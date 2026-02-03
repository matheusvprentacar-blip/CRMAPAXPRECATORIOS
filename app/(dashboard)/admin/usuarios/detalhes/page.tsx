"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Usuario } from "@/lib/types/database"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { ProfileTab } from "@/components/hr/profile-tab"
import { DocumentsTab } from "@/components/hr/documents-tab"
import { FinancialTab } from "@/components/hr/financial-tab"
import { LeavesTab } from "@/components/hr/leaves-tab"
import { Badge } from "@/components/ui/badge"

function UserDetailsContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const id = searchParams.get("id")

    const [user, setUser] = useState<Usuario | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            loadUser(id)
        } else {
            setLoading(false)
        }
    }, [id])

    async function loadUser(userId: string) {
        const supabase = createBrowserClient()
        if (!supabase) return

        const { data } = await supabase
            .from("usuarios")
            .select("*")
            .eq("id", userId)
            .single()

        if (data) {
            // Cast to Usuario, respecting the array role type
            setUser(data as unknown as Usuario)
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user || !id) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p>Usuário não encontrado ou ID inválido.</p>
                <Button onClick={() => router.back()}>Voltar</Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{user.nome}</h1>
                    <div className="flex gap-2 items-center text-muted-foreground text-sm">
                        <span>{user.email}</span>
                        {user.role.map(r => (
                            <Badge key={r} variant="outline" className="text-[10px] h-5">{r.replace(/_/g, " ").toUpperCase()}</Badge>
                        ))}
                    </div>
                </div>
            </div>

            <Tabs defaultValue="geral" className="w-full">
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto">
                    <TabsTrigger value="geral" className="px-4 py-2">Geral</TabsTrigger>
                    <TabsTrigger value="documentos" className="px-4 py-2">Documentos</TabsTrigger>
                    <TabsTrigger value="financeiro" className="px-4 py-2">Financeiro</TabsTrigger>
                    <TabsTrigger value="ocorrencias" className="px-4 py-2">Ocorrências / Ponto</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="geral">
                        <ProfileTab user={user} onUpdate={() => loadUser(id)} />
                    </TabsContent>

                    <TabsContent value="documentos">
                        <DocumentsTab user={user} />
                    </TabsContent>

                    <TabsContent value="financeiro">
                        <FinancialTab user={user} />
                    </TabsContent>

                    <TabsContent value="ocorrencias">
                        <LeavesTab user={user} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}

export default function UserDetailsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <UserDetailsContent />
        </Suspense>
    )
}
