"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Calculator, AlertCircle, FileText, User, Gavel, CalendarClock, DollarSign } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabase } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface PrecatorioCalculo {
  id: string
  credor_nome?: string
  numero_precatorio?: string
  numero_processo?: string
  valor_principal?: number
  advogado_nome?: string
  created_at: string
  responsavel?: string
  usuarios?: { nome: string }
  responsavel_nome?: string
}

export default function CalculoOperadorPage() {
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioCalculo[]>([])
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

        const { data, error: fetchError } = await supabase
          .from("precatorios")
          .select(
            `
            id,
            credor_nome,
            numero_precatorio,
            numero_processo,
            valor_principal,
            advogado_nome,
            created_at,
            responsavel,
            usuarios!responsavel(nome)
          `
          )
          // Filtro: Atribuído a este operador de calculo ou responsavel geral
          .or(`responsavel.eq.${currentUser.id},operador_calculo.eq.${currentUser.id},responsavel_calculo_id.eq.${currentUser.id}`)
          // Ordenação FIFO (Mais antigo primeiro) para respeitar "Fila"
          .order("created_at", { ascending: true })

        if (fetchError) {
          console.error("[Operador] Erro ao carregar precatórios:", fetchError)
          setError("Erro ao carregar fila de cálculo.")
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
        console.error("[Operador] Erro inesperado:", err)
        setError("Ocorreu um erro inesperado.")
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fila de Cálculo (Operador)</h1>
          <p className="text-muted-foreground">Precatórios aguardando cálculo e revisão (Ordem de Chegada)</p>
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
          <Calculator className="mx-auto h-12 w-12 opacity-50 mb-4" />
          <p className="text-lg font-medium">Fila de cálculo vazia</p>
          <p className="text-sm">Novos precatórios para cálculo aparecerão aqui.</p>
        </Card>
      )}

      <div className="grid gap-4">
        {precatorios.map((p, index) => (
          <Card
            key={p.id}
            className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500/40 group relative overflow-hidden"
            onClick={() => handleAbrirCalculo(p.id)}
          >
            <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/5 transition-colors" />

            <CardContent className="p-6 flex items-center justify-between relative z-10">
              <div className="flex items-start gap-6 flex-1">
                {/* Índice */}
                <div className="flex flex-col items-center justify-center min-w-[3rem]">
                  <span className="text-4xl font-black text-muted-foreground/20 group-hover:text-green-500/40 transition-colors">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">

                  {/* Coluna 1: Credor */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <User className="w-3 h-3" /> Credor
                    </label>
                    <p className="font-medium truncate" title={p.credor_nome}>{p.credor_nome || "Nome não informado"}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Gavel className="w-3 h-3" />
                      <span className="truncate max-w-[150px]" title={p.advogado_nome}>{p.advogado_nome || "Advogado N/I"}</span>
                    </div>
                  </div>

                  {/* Coluna 2: Valor */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Valor Principal
                    </label>
                    <span className="font-bold text-lg text-emerald-600">
                      {p.valor_principal ? `R$ ${p.valor_principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "R$ 0,00"}
                    </span>
                  </div>

                  {/* Coluna 3: Processo */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Processo
                    </label>
                    <p className="font-medium text-sm font-mono">{p.numero_processo || "N/A"}</p>
                    <p className="text-xs text-muted-foreground">{p.numero_precatorio || "Prec. N/A"}</p>
                  </div>

                  {/* Coluna 4: Responsável/Data */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" /> Responsável
                    </label>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-primary">
                        {p.responsavel_nome}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Entrada: {format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}
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
