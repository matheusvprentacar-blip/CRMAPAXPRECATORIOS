"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, AlertCircle } from "@/components/icons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { createBrowserClient } from "@/lib/supabase/client"
import { ProjecaoComparativoPanel } from "@/components/precatorios/comparativo/projecao-comparativo-panel"

type PrecatorioResumo = {
  id: string
  titulo?: string | null
  numero_precatorio?: string | null
  previsao_pagamento?: string | null
  proposta_menor_valor?: number | null
  saldo_liquido?: number | null
  valor_atualizado?: number | null
  valor_principal?: number | null
}

function pickDefaultPrice(precatorio: PrecatorioResumo | null): number | null {
  if (!precatorio) return null
  const values = [
    precatorio.proposta_menor_valor,
    precatorio.saldo_liquido,
    precatorio.valor_atualizado,
    precatorio.valor_principal,
  ]

  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  return null
}

function ProjecaoComparativoPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id") || ""

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [precatorio, setPrecatorio] = useState<PrecatorioResumo | null>(null)

  useEffect(() => {
    if (!id) {
      setError("ID do precatorio nao informado na URL.")
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadPrecatorio() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createBrowserClient()
        if (!supabase) {
          throw new Error("Supabase nao disponivel no cliente.")
        }

        const { data, error: fetchError } = await supabase
          .from("precatorios")
          .select("id, titulo, numero_precatorio, previsao_pagamento, proposta_menor_valor, saldo_liquido, valor_atualizado, valor_principal")
          .eq("id", id)
          .maybeSingle()

        if (fetchError) {
          throw new Error(fetchError.message)
        }

        if (!data) {
          throw new Error("Precatorio nao encontrado ou sem permissao de acesso.")
        }

        if (!cancelled) {
          setPrecatorio(data as PrecatorioResumo)
        }
      } catch (loadError) {
        if (!cancelled) {
          const message = loadError instanceof Error ? loadError.message : "Falha ao carregar precatorio"
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPrecatorio()

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Projecao & Comparativo</CardTitle>
            <p className="text-sm text-muted-foreground">
              {precatorio?.titulo || "Precatorio"}
              {precatorio?.numero_precatorio ? ` • ${precatorio.numero_precatorio}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/precatorios/detalhes?id=${id}&tab=comparativo`)}>
              Abrir na aba do detalhe
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Falha ao carregar dados</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <ProjecaoComparativoPanel
              precatorioId={id}
              defaultPrevisaoPagamento={precatorio?.previsao_pagamento || null}
              defaultPrecoCompra={pickDefaultPrice(precatorio)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProjecaoComparativoPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4 md:p-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ProjecaoComparativoPageContent />
    </Suspense>
  )
}

