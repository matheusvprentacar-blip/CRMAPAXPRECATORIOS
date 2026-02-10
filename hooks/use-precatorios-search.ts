"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { FiltrosPrecatorios } from "@/lib/types/filtros"
import { filtrosToRpcParams, getFiltrosAtivos } from "@/lib/types/filtros"

const RELATED_FILTER_KEYS: Record<string, Array<keyof FiltrosPrecatorios>> = {
  data_criacao: ["data_criacao_inicio", "data_criacao_fim"],
  data_entrada_calculo: ["data_entrada_calculo_inicio", "data_entrada_calculo_fim"],
  valor: ["valor_min", "valor_max"],
  valor_atualizado: ["valor_atualizado_min", "valor_atualizado_max"],
  valor_sem_atualizacao: ["valor_sem_atualizacao_min", "valor_sem_atualizacao_max"],
}

const ARRAY_FILTER_KEYS: Array<keyof FiltrosPrecatorios> = [
  "status",
  "complexidade",
  "sla_status",
  "tipo_atraso",
  "impacto_atraso",
]

const DATE_FILTER_KEYS: Array<keyof FiltrosPrecatorios> = [
  "data_criacao_inicio",
  "data_criacao_fim",
  "data_entrada_calculo_inicio",
  "data_entrada_calculo_fim",
]

const RANGE_FILTER_PAIRS: Array<[keyof FiltrosPrecatorios, keyof FiltrosPrecatorios]> = [
  ["valor_min", "valor_max"],
  ["valor_atualizado_min", "valor_atualizado_max"],
  ["valor_sem_atualizacao_min", "valor_sem_atualizacao_max"],
]

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined
  const parsed = new Date(`${trimmed}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : trimmed
}

function normalizeBooleanFlag(value: unknown): true | undefined {
  return value === true ? true : undefined
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const normalized = Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
    )
  )
  return normalized.length > 0 ? normalized : undefined
}

function normalizeFiltros(input: FiltrosPrecatorios): FiltrosPrecatorios {
  const next: FiltrosPrecatorios = { ...input }

  next.termo = normalizeString(next.termo)
  next.tribunal = normalizeString(next.tribunal)
  next.responsavel_id = normalizeString(next.responsavel_id)
  next.criador_id = normalizeString(next.criador_id)

  for (const key of ARRAY_FILTER_KEYS) {
    ;(next as Record<string, unknown>)[key] = normalizeStringArray(
      (next as Record<string, unknown>)[key]
    )
  }

  for (const key of DATE_FILTER_KEYS) {
    ;(next as Record<string, unknown>)[key] = normalizeDate(
      (next as Record<string, unknown>)[key]
    )
  }

  for (const [minKey, maxKey] of RANGE_FILTER_PAIRS) {
    const min = normalizeNumber((next as Record<string, unknown>)[minKey])
    const max = normalizeNumber((next as Record<string, unknown>)[maxKey])

    if (min !== undefined && max !== undefined && min > max) {
      ;(next as Record<string, unknown>)[minKey] = max
      ;(next as Record<string, unknown>)[maxKey] = min
    } else {
      ;(next as Record<string, unknown>)[minKey] = min
      ;(next as Record<string, unknown>)[maxKey] = max
    }
  }

  next.urgente = normalizeBooleanFlag(next.urgente)
  next.titular_falecido = normalizeBooleanFlag(next.titular_falecido)
  next.valor_calculado = normalizeBooleanFlag(next.valor_calculado)
  next.calculo_em_andamento = normalizeBooleanFlag(next.calculo_em_andamento)
  next.calculo_finalizado = normalizeBooleanFlag(next.calculo_finalizado)

  return next
}

export function usePrecatoriosSearch(initialFiltros: FiltrosPrecatorios = {}) {
  const [filtros, setFiltros] = useState<FiltrosPrecatorios>(normalizeFiltros(initialFiltros))
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [resultados, setResultados] = useState<Array<Record<string, unknown>>>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const activeRequestRef = useRef(0)

  const supabase = useMemo(() => createBrowserClient(), [])
  const filtrosNormalizados = useMemo(() => normalizeFiltros(filtros), [filtros])

  const buscar = useCallback(async () => {
    if (!supabase) {
      setResultados([])
      setTotal(0)
      setError("Supabase nao disponivel")
      setInitialized(true)
      return
    }

    const requestId = ++activeRequestRef.current
    setLoading(true)
    setError(null)

    try {
      const params = filtrosToRpcParams(filtrosNormalizados)
      const { data, error: rpcError } = await supabase.rpc("buscar_precatorios_global", params)

      if (rpcError) throw rpcError
      if (requestId !== activeRequestRef.current) return

      const list = data || []
      setResultados(list)
      setTotal(list.length)
    } catch (err) {
      if (requestId !== activeRequestRef.current) return

      const message = err instanceof Error ? err.message : "Erro ao buscar precatorios"
      setError(message)
      setResultados([])
      setTotal(0)
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false)
        setInitialized(true)
      }
    }
  }, [filtrosNormalizados, supabase])

  useEffect(() => {
    void buscar()
  }, [buscar])

  const updateFiltros = useCallback((novosFiltros: FiltrosPrecatorios) => {
    setFiltros(normalizeFiltros(novosFiltros))
  }, [])

  const clearFiltros = useCallback(() => {
    setFiltros({})
  }, [])

  const removeFiltro = useCallback((key: string) => {
    setFiltros((prev) => {
      const next = { ...prev }
      const relatedKeys = RELATED_FILTER_KEYS[key]

      if (relatedKeys && relatedKeys.length > 0) {
        for (const relatedKey of relatedKeys) {
          delete next[relatedKey]
        }
      } else {
        delete next[key as keyof FiltrosPrecatorios]
      }

      return normalizeFiltros(next)
    })
  }, [])

  const setTermo = useCallback((termo: string) => {
    setFiltros((prev) =>
      normalizeFiltros({
        ...prev,
        termo,
      })
    )
  }, [])

  const filtrosAtivos = useMemo(() => getFiltrosAtivos(filtrosNormalizados), [filtrosNormalizados])

  return {
    filtros: filtrosNormalizados,
    updateFiltros,
    clearFiltros,
    removeFiltro,
    setTermo,
    loading,
    initialized,
    resultados,
    total,
    error,
    filtrosAtivos,
    refetch: buscar,
  }
}
