"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { FiltrosPrecatorios } from "@/lib/types/filtros"
import { filtrosToRpcParams, getFiltrosAtivos } from "@/lib/types/filtros"
import { useDebounce } from "@/hooks/use-debounce"

export function usePrecatoriosSearch(initialFiltros: FiltrosPrecatorios = {}) {
  const [filtros, setFiltros] = useState<FiltrosPrecatorios>(initialFiltros)
  const [loading, setLoading] = useState(false)
  const [resultados, setResultados] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient()

  // Debounce do termo de busca para evitar muitas requisições
  const debouncedTermo = useDebounce(filtros.termo, 500)

  const buscar = useCallback(async () => {
    if (!supabase) return

    setLoading(true)
    setError(null)

    try {
      const params = filtrosToRpcParams({
        ...filtros,
        termo: debouncedTermo,
      })

      const { data, error: rpcError } = await supabase.rpc(
        "buscar_precatorios_global",
        params
      )

      if (rpcError) throw rpcError

      setResultados(data || [])
      setTotal(data?.length || 0)
    } catch (err) {
      console.error("[usePrecatoriosSearch] Erro ao buscar:", err)
      setError(err instanceof Error ? err.message : "Erro ao buscar precatórios")
      setResultados([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [supabase, filtros, debouncedTermo])

  // Executar busca quando filtros mudarem
  useEffect(() => {
    buscar()
  }, [buscar])

  const updateFiltros = useCallback((novosFiltros: FiltrosPrecatorios) => {
    setFiltros(novosFiltros)
  }, [])

  const clearFiltros = useCallback(() => {
    setFiltros({})
  }, [])

  const removeFiltro = useCallback((key: string) => {
    setFiltros((prev) => {
      const newFiltros = { ...prev }
      delete newFiltros[key as keyof FiltrosPrecatorios]
      return newFiltros
    })
  }, [])

  const setTermo = useCallback((termo: string) => {
    setFiltros((prev) => ({
      ...prev,
      termo: termo || undefined,
    }))
  }, [])

  const filtrosAtivos = getFiltrosAtivos(filtros)

  return {
    filtros,
    updateFiltros,
    clearFiltros,
    removeFiltro,
    setTermo,
    loading,
    resultados,
    total,
    error,
    filtrosAtivos,
    refetch: buscar,
  }
}
