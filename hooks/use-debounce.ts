"use client"

import { useEffect, useState } from "react"

/**
 * Hook para debounce de valores
 * Útil para evitar muitas requisições em campos de busca
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Criar timer para atualizar o valor após o delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Limpar timer se o valor mudar antes do delay
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
