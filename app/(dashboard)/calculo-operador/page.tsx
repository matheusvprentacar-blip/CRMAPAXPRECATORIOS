"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Calculator, AlertCircle, FileText, Filter, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabase } from "@/lib/supabase/client"

interface PrecatorioCalculo {
  id: string
  credor_nome?: string
  numero_precatorio?: string
  valor_principal?: number
  advogado_nome?: string
  created_at: string
}

export default function CalculoOperadorPage() {
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioCalculo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const carregarDados = async () => {
      const supabase = getSupabase()

      if (!supabase) {
        const localData = localStorage.getItem("precatorios")
        if (localData) {
          const parsed = JSON.parse(localData)
          setPrecatorios(parsed || [])
        }
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

        setUser(currentUser)

        const { data, error: fetchError } = await supabase
          .from("precatorios")
          .select(
            `
            id,
            credor_nome,
            numero_precatorio,
            valor_principal,
            advogado_nome,
            created_at
          `,
          )
          .or(`responsavel.eq.${currentUser.id},operador_calculo.eq.${currentUser.id}`)
          .order("created_at", { ascending: false })

        if (fetchError) {
          console.error("[Operador] Erro ao carregar precatórios para cálculo:", fetchError)
          setError("Erro ao carregar precatórios para cálculo.")
          setLoading(false)
          return
        }

        setPrecatorios(data || [])
        setLoading(false)
      } catch (err) {
        console.error("[Operador] Erro inesperado:", err)
        setError("Ocorreu um erro inesperado ao carregar os precatórios.")
        setLoading(false)
      }
    }

    carregarDados()
  }, [])

  const handleAbrirCalculo = (id: string) => {
    router.push(`/precatorios/visualizar?id=${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-7xl p-6 space-y-6">
        <div className="border-b pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent w-fit">
            Área do Operador de Cálculo
          </h1>
          <p className="text-muted-foreground mt-1">Seus precatórios atribuídos para cálculo</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-8">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent w-fit">
            Área do Operador de Cálculo
          </h1>
          <p className="text-muted-foreground mt-1">
            Precatórios atribuídos a você para realizar ou revisar os cálculos
          </p>
        </div>
        <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold w-fit">
          {precatorios.length} {precatorios.length === 1 ? "Precatório" : "Precatórios"}
        </Badge>
      </div>

      {/* Grid de Cards */}
      <div className="grid gap-4">
        {precatorios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/20">
            <div className="bg-muted/50 p-4 rounded-full mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum precatório atribuído</h3>
            <p className="text-muted-foreground max-w-sm">
              Você não tem precatórios atribuídos para cálculo no momento. Aguarde novas atribuições.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {precatorios.map((prec) => (
              <Card
                key={prec.id}
                className="group cursor-pointer hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/30"
                onClick={() => handleAbrirCalculo(prec.id)}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <h2 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors break-words">
                          {prec.credor_nome || "Credor não informado"}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Nº Precatório: <span className="font-medium text-foreground">{prec.numero_precatorio || "N/A"}</span>
                        </p>
                        {prec.advogado_nome && (
                          <p className="text-xs text-muted-foreground">
                            Advogado: <span className="font-medium">{prec.advogado_nome}</span>
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs shrink-0">
                        <Calculator className="h-3 w-3" />
                        Cálculo
                      </Badge>
                    </div>

                    {/* Valores e Data */}
                    <div className="pt-4 border-t border-border/40 space-y-2">
                      {typeof prec.valor_principal === "number" && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Valor principal:</span>
                          <span className="text-sm font-bold text-primary">
                            {prec.valor_principal.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Adicionado em:</span>
                        <span className="text-xs font-medium">
                          {new Date(prec.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
