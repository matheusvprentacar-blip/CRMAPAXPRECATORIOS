"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, User, Plus, Filter, FileText, MoreVertical } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
    <div className="container mx-auto max-w-7xl p-6 space-y-8">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent w-fit">
            Meus Precatórios
          </h1>
          <p className="text-muted-foreground mt-1">Precatórios sob sua responsabilidade direta</p>
        </div>
        <Button onClick={() => router.push("/precatorios/novo")} className="shadow-md hover:shadow-lg transition-all">
          <Plus className="h-4 w-4 mr-2" />
          Criar Precatório
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, número ou credor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid de Cards */}
      <div className="grid gap-4">
        {filteredPrecatorios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/20">
            <div className="bg-muted/50 p-4 rounded-full mb-4">
              {searchTerm ? <Filter className="h-8 w-8 text-muted-foreground" /> : <User className="h-8 w-8 text-muted-foreground" />}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? "Nenhum resultado encontrado" : "Nenhum precatório em sua carteira"}
            </h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              {searchTerm
                ? "Tente ajustar o termo de busca para encontrar o que procura."
                : "Você ainda não tem precatórios em negociação. Crie um novo para começar."}
            </p>
            {!searchTerm && (
              <Button onClick={() => router.push("/precatorios/novo")}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Precatório
              </Button>
            )}
          </div>
        ) : (
          filteredPrecatorios.map((precatorio) => (
            <Card
              key={precatorio.id}
              className="group cursor-pointer hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/30"
              onClick={() => router.push(`/precatorios/visualizar?id=${precatorio.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Conteúdo Principal */}
                  <div className="flex-1 space-y-4">
                    {/* Linha Superior: Título e Valor */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                            {precatorio.titulo || `Precatório ${precatorio.numero_precatorio}`}
                          </h3>
                          <Badge variant="outline" className="px-2 py-0.5 text-[10px] font-medium bg-muted/50 text-muted-foreground border-transparent uppercase tracking-wider">
                            {precatorio.status?.replace(/_/g, " ") || "NOVO"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-foreground">Credor:</span>
                            {precatorio.credor_nome}
                          </span>
                          {precatorio.tribunal && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span>{precatorio.tribunal}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                          {(() => {
                            const va = Number(precatorio.valor_atualizado ?? 0)
                            const vp = Number(precatorio.valor_principal ?? 0)
                            if (va > 0) {
                              return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(va)
                            } else if (vp > 0) {
                              return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(vp)
                            }
                            return <span className="text-muted-foreground text-lg">Aguardando Valor</span>
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                          {Number(precatorio.valor_atualizado ?? 0) > 0 ? "Valor Atualizado" : "Valor Principal"}
                        </div>
                      </div>
                    </div>

                    {/* Linha Inferior: Detalhes */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40">
                      {/* Highlights */}
                      <div className="flex flex-wrap gap-4 text-sm w-full sm:w-auto">
                        {precatorio.numero_processo && (
                          <div className="bg-muted/30 px-2 py-1 rounded text-muted-foreground text-xs">
                            Proc: <span className="font-medium text-foreground">{precatorio.numero_processo}</span>
                          </div>
                        )}
                        {(precatorio.proposta_menor_valor_display || precatorio.proposta_maior_valor_display) && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Propostas:</span>
                            <div className="flex items-center gap-1 font-medium bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                              {precatorio.proposta_menor_valor_display || "-"}
                              <span className="text-muted-foreground mx-1">até</span>
                              {precatorio.proposta_maior_valor_display || "-"}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Menu */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/precatorios/visualizar?id=${precatorio.id}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
