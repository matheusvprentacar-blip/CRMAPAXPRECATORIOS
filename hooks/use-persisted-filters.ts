"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { FiltrosPrecatorios } from "@/lib/types/filtros"
import { getFiltrosAtivos } from "@/lib/types/filtros"

function loadFromStorage(storageKey: string): FiltrosPrecatorios {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    return JSON.parse(raw) as FiltrosPrecatorios
  } catch {
    return {}
  }
}

function saveToStorage(storageKey: string, filtros: FiltrosPrecatorios) {
  if (typeof window === "undefined") return
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

export function usePersistedFilters(storageKey: string) {
  const [filtros, setFiltrosState] = useState<FiltrosPrecatorios>(() =>
    loadFromStorage(storageKey)
  )

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Limpar timer ao desmontar
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  }, [])

  const updateFiltros = useCallback(
    (next: FiltrosPrecatorios) => {
      setFiltrosState(next)
      // Debounce: evitar writes síncronos a cada tecla/clique
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => saveToStorage(storageKey, next), 300)
    },
    [storageKey]
  )

  const clearFiltros = useCallback(() => {
    setFiltrosState({})
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  const filtrosAtivos = getFiltrosAtivos(filtros)

  return { filtros, updateFiltros, clearFiltros, filtrosAtivos }
}
