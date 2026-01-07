"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Calculator, AlertCircle } from "lucide-react"
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
        // Fallback localStorage
        const localData = localStorage.getItem("precatorios")
        if (localData) {
          const parsed = JSON.parse(localData)
          setPrecatorios(parsed || [])
        }
        setLoading(false)
        return
      }

      try {
        // Busca usuário atual
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        if (!currentUser) {
          setError("Usuário não autenticado.")
          setLoading(false)
          return
        }

        setUser(currentUser)

        // Busca precatórios onde o usuário é operador de cálculo ou responsável
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
          console.error("[v0] Erro ao carregar precatórios para cálculo:", fetchError)
          setError("Erro ao carregar precatórios para cálculo.")
          setLoading(false)
          return
        }

        setPrecatorios(data || [])
        setLoading(false)
      } catch (err) {
        console.error("[v0] Erro inesperado:", err)
        setError("Ocorreu um erro inesperado ao carregar os precatórios.")
        setLoading(false)
      }
    }

    carregarDados()
  }, [])

  const handleAbrirCalculo = (id: string) => {
    router.push(`/precatorios/${id}?tab=calculadora`)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Área do operador de cálculo</h1>
        <p className="text-sm text-muted-foreground">Carregando precatórios atribuídos a você para cálculo...</p>
        <div className="text-center py-12">Carregando...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Área do operador de cálculo</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Área do operador de cálculo</h1>
        <p className="text-sm text-muted-foreground">
          Aqui você vê os precatórios atribuídos a você para realizar ou revisar os cálculos.
        </p>
      </div>

      {precatorios.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            Nenhum precatório foi atribuído a você para cálculo no momento.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {precatorios.map((prec) => (
            <Card
              key={prec.id}
              className="p-4 hover:shadow-lg cursor-pointer transition-shadow"
              onClick={() => handleAbrirCalculo(prec.id)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h2 className="font-semibold text-sm md:text-base break-words">
                      {prec.credor_nome || "Credor não informado"}
                    </h2>
                    <p className="text-xs text-muted-foreground break-all">
                      Nº Prec.: {prec.numero_precatorio || "N/A"}
                    </p>
                    {prec.advogado_nome && (
                      <p className="text-xs text-muted-foreground">Advogado: {prec.advogado_nome}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <Calculator className="h-3 w-3" />
                    Cálculo
                  </Badge>
                </div>

                {typeof prec.valor_principal === "number" && (
                  <p className="text-xs">
                    Valor principal:{" "}
                    <span className="font-medium">
                      {prec.valor_principal.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Adicionado em {new Date(prec.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
