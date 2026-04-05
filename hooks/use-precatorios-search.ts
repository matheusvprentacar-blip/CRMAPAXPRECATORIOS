"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { FiltrosPrecatorios } from "@/lib/types/filtros"
import { filtrosToRpcParams, getFiltrosAtivos, sanitizeRpcParams, STATUS_OPTIONS } from "@/lib/types/filtros"

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

const ALL_STATUS_VALUES = Array.from(new Set(STATUS_OPTIONS.map((option) => option.value)))
const CALCULADOS_STATUS = ["calculado", "concluido"]
const EM_CALCULO_OU_NOVO_STATUS = ["em_calculo", "novo"]

type UsePrecatoriosSearchOptions = {
  page?: number
  pageSize?: number
  excludedStatuses?: string[]
  storageKey?: string
}

type UsePrecatoriosSearchSummary = {
  calculados: number
  emCalculoOuNovo: number
}

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

function normalizeStatusList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  )
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

function applyStatusConstraints(
  params: Record<string, unknown>,
  {
    includeStatuses,
    excludedStatuses,
  }: {
    includeStatuses?: string[]
    excludedStatuses?: string[]
  } = {}
) {
  const shouldAdjust =
    (Array.isArray(includeStatuses) && includeStatuses.length > 0) ||
    (Array.isArray(excludedStatuses) && excludedStatuses.length > 0)

  if (!shouldAdjust) return { ...params }

  let statuses = normalizeStatusList(params.p_status)

  if (statuses.length === 0) {
    statuses = [...ALL_STATUS_VALUES]
  }

  if (Array.isArray(includeStatuses) && includeStatuses.length > 0) {
    const includeSet = new Set(includeStatuses)
    statuses = statuses.filter((status) => includeSet.has(status))
  }

  if (Array.isArray(excludedStatuses) && excludedStatuses.length > 0) {
    const excludeSet = new Set(excludedStatuses)
    statuses = statuses.filter((status) => !excludeSet.has(status))
  }

  return {
    ...params,
    p_status: Array.from(new Set(statuses)),
  }
}

function loadStoredFiltros(storageKey: string | undefined, fallback: FiltrosPrecatorios): FiltrosPrecatorios {
  if (!storageKey || typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return fallback
    return JSON.parse(raw) as FiltrosPrecatorios
  } catch {
    return fallback
  }
}

function persistFiltros(storageKey: string | undefined, filtros: FiltrosPrecatorios) {
  if (!storageKey || typeof window === "undefined") return
  try {
    const cleaned = Object.fromEntries(
      Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null)
    )
    if (Object.keys(cleaned).length === 0) {
      localStorage.removeItem(storageKey)
    } else {
      localStorage.setItem(storageKey, JSON.stringify(cleaned))
    }
  } catch {
    // silently ignore quota errors
  }
}

export function usePrecatoriosSearch(
  initialFiltros: FiltrosPrecatorios = {},
  options: UsePrecatoriosSearchOptions = {}
) {
  const { storageKey } = options
  const [filtros, setFiltros] = useState<FiltrosPrecatorios>(() =>
    normalizeFiltros(loadStoredFiltros(storageKey, initialFiltros))
  )
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [resultados, setResultados] = useState<Array<Record<string, unknown>>>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<UsePrecatoriosSearchSummary>({
    calculados: 0,
    emCalculoOuNovo: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const activeRequestRef = useRef(0)
  const persistDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const supabase = useMemo(() => createBrowserClient(), [])
  const filtrosNormalizados = useMemo(() => normalizeFiltros(filtros), [filtros])
  const page = Math.max(1, options.page ?? 1)
  const pageSize = Math.max(1, options.pageSize ?? 20)
  const excludedStatusesKey = Array.isArray(options.excludedStatuses)
    ? Array.from(new Set(options.excludedStatuses.map((status) => status.trim()).filter(Boolean))).sort().join("|")
    : ""
  const excludedStatuses = useMemo(
    () => (excludedStatusesKey ? excludedStatusesKey.split("|") : []),
    [excludedStatusesKey]
  )

  const buscar = useCallback(async () => {
    if (!supabase) {
      setResultados([])
      setTotal(0)
      setSummary({ calculados: 0, emCalculoOuNovo: 0 })
      setError("Supabase nao disponivel")
      setInitialized(true)
      return
    }

    const requestId = ++activeRequestRef.current
    setLoading(true)
    setError(null)

    try {
      const rpcParams = sanitizeRpcParams(filtrosToRpcParams(filtrosNormalizados))
      const params = {
        ...applyStatusConstraints(rpcParams, { excludedStatuses }),
        p_offset: (page - 1) * pageSize,
        p_limit: pageSize,
      }

      const { data, error: rpcError } = await supabase.rpc("buscar_precatorios_com_summary", params)

      if (rpcError) throw rpcError
      if (requestId !== activeRequestRef.current) return

      const result = data as {
        rows: Array<Record<string, unknown>>
        total: number
        calculados: number
        em_calculo_ou_novo: number
      }

      setResultados(Array.isArray(result?.rows) ? result.rows : [])
      setTotal(result?.total ?? 0)
      setSummary({
        calculados: result?.calculados ?? 0,
        emCalculoOuNovo: result?.em_calculo_ou_novo ?? 0,
      })
    } catch (err) {
      if (requestId !== activeRequestRef.current) return

      const message = err instanceof Error ? err.message : "Erro ao buscar precatorios"
      setError(message)
      setResultados([])
      setTotal(0)
      setSummary({ calculados: 0, emCalculoOuNovo: 0 })
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false)
        setInitialized(true)
      }
    }
  }, [excludedStatuses, filtrosNormalizados, page, pageSize, supabase])

  useEffect(() => {
    void buscar()
  }, [buscar])

  const updateFiltros = useCallback((novosFiltros: FiltrosPrecatorios) => {
    const normalized = normalizeFiltros(novosFiltros)
    setFiltros(normalized)
    persistFiltros(storageKey, normalized)
  }, [storageKey])

  const clearFiltros = useCallback(() => {
    setFiltros({})
    persistFiltros(storageKey, {})
  }, [storageKey])

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

      const normalized = normalizeFiltros(next)
      persistFiltros(storageKey, normalized)
      return normalized
    })
  }, [storageKey])

  const setTermo = useCallback((termo: string) => {
    setFiltros((prev) => {
      const normalized = normalizeFiltros({ ...prev, termo })
      if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current)
      persistDebounceRef.current = setTimeout(() => persistFiltros(storageKey, normalized), 300)
      return normalized
    })
  }, [storageKey])

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
    summary,
    error,
    filtrosAtivos,
    refetch: buscar,
  }
}
