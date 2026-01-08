"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, User, Plus } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"

export default function MeusPrecatoriosPage() {
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<Precatorio[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPrecatorios()
  }, [])

  async function loadPrecatorios() {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("precatorios_cards")
        .select("*")
        .eq("responsavel", user.id)
        .neq("status", "em_calculo")
        .order("created_at", { ascending: false })

      if (data) setPrecatorios(data as Precatorio[])
    } catch (error) {
      console.error("Erro ao carregar precatórios:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPrecatorios = searchTerm
    ? precatorios.filter(
        (p) =>
          p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : precatorios

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meus Precatórios</h1>
          <p className="text-muted-foreground">Precatórios em negociação própria</p>
        </div>
        <Button onClick={() => router.push("/precatorios/novo")}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Precatório
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, número ou credor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4">
        {filteredPrecatorios.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum precatório encontrado" : "Você não tem precatórios em negociação"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPrecatorios.map((precatorio) => (
            <Card
              key={precatorio.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => router.push(`/precatorios/${precatorio.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold text-lg">
                      {precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                    </h3>
                    <p className="text-sm text-muted-foreground">Credor: {precatorio.credor_nome}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      {precatorio.numero_processo && <span>Processo: {precatorio.numero_processo}</span>}
                      {precatorio.tribunal && <span>Tribunal: {precatorio.tribunal}</span>}
                    </div>
                    {(precatorio.proposta_menor_valor_display || precatorio.proposta_maior_valor_display) && (
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <span className="text-muted-foreground">Propostas:</span>
                        <span className="font-medium">
                          {precatorio.proposta_menor_valor_display} - {precatorio.proposta_maior_valor_display}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-lg font-bold">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        precatorio.valor_atualizado || precatorio.valor_principal || 0,
                      )}
                    </div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {precatorio.status?.replace(/_/g, " ") || "Novo"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
