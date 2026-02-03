"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

type Herdeiro = {
  id: string
  nome_completo: string
  cpf?: string | null
  percentual_participacao?: number | null
}

interface AbaPropostaHerdeirosProps {
  precatorioId: string
  valorProposta: number
  percentualProposta: number
}

export function AbaPropostaHerdeiros({
  precatorioId,
  valorProposta,
  percentualProposta,
}: AbaPropostaHerdeirosProps) {
  const [herdeiros, setHerdeiros] = useState<Herdeiro[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!precatorioId) return

    const loadHerdeiros = async () => {
      setLoading(true)
      try {
        const supabase = createBrowserClient()
        if (!supabase) return

        const { data, error } = await supabase
          .from("precatorio_herdeiros")
          .select("id, nome_completo, cpf, percentual_participacao")
          .eq("precatorio_id", precatorioId)
          .order("created_at", { ascending: true })

        if (error) throw error
        setHerdeiros(data || [])
      } catch (error: any) {
        console.error("[AbaPropostaHerdeiros] Erro:", error)
        toast({
          title: "Erro ao carregar herdeiros",
          description: error.message || "Nao foi possivel carregar os herdeiros.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadHerdeiros()
  }, [precatorioId])

  const totalPercentual = useMemo(
    () => herdeiros.reduce((sum, h) => sum + Number(h.percentual_participacao || 0), 0),
    [herdeiros],
  )

  const totalOk = Math.abs(totalPercentual - 100) <= 0.01

  if (loading && herdeiros.length === 0) return null
  if (!herdeiros.length) return null

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base">Valor de aquisicao do credito</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Percentual aplicado</p>
            <p className="text-lg font-semibold">
              {Number(percentualProposta || 0).toFixed(2)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Valor total</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(valorProposta)}
            </p>
          </div>
        </div>

        <div className="border rounded-lg divide-y">
          {herdeiros.map((h) => {
            const pct = Number(h.percentual_participacao || 0)
            const valor = valorProposta * (pct / 100)
            return (
              <div key={h.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{h.nome_completo}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {h.cpf || "CPF N/I"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{pct.toFixed(2)}%</p>
                  <p className="text-sm font-semibold">{formatCurrency(valor)}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Total de cotas: {totalPercentual.toFixed(2)}%
          </span>
          {totalOk ? (
            <span className="text-emerald-600">Cotas OK</span>
          ) : (
            <span className="text-red-600">Cotas devem somar 100%</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0)
}
