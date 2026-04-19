"use client"

import { useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { cacheGet, cacheSet } from "@/lib/cache/client-cache"
import { isMissingOperatorTagColumnError, type OperatorTag } from "@/lib/users/operator-tag"

const CACHE_KEY = "usuarios_ativos"
const TTL_MS = 5 * 60 * 1000 // 5 minutos

export type UsuarioBasico = {
  id: string
  nome: string
  email?: string
  role: string[]
  operator_tag?: OperatorTag | null
  ativo?: boolean
}

type UsuarioBasicoRow = {
  id: string
  nome: string
  email?: string | null
  role?: string[] | string | null
  operator_tag?: OperatorTag | null
  ativo?: boolean | null
}

function normalizeRoleList(rawRole: UsuarioBasicoRow["role"]): string[] {
  if (Array.isArray(rawRole)) {
    return rawRole.filter((role): role is string => typeof role === "string" && role.trim().length > 0)
  }

  if (typeof rawRole === "string" && rawRole.trim().length > 0) {
    return [rawRole.trim()]
  }

  return []
}

/**
 * Busca a lista de usuários ativos com cache em memória de 5 minutos.
 * Todas as páginas que precisam desta lista compartilham o mesmo resultado
 * enquanto o TTL não expirar — evitando múltiplas queries ao Supabase.
 *
 * @param includeEmail  Inclui o campo `email` na query (false por padrão).
 */
export function useUsuariosCache(includeEmail = false) {
  const cacheKey = includeEmail ? `${CACHE_KEY}_with_email` : CACHE_KEY

  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>(
    () => cacheGet<UsuarioBasico[]>(cacheKey) ?? []
  )
  const [loading, setLoading] = useState(
    () => (cacheGet<UsuarioBasico[]>(cacheKey) ?? []).length === 0
  )

  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    const cached = cacheGet<UsuarioBasico[]>(cacheKey)
    if (cached) {
      setUsuarios(cached)
      setLoading(false)
      return
    }

    if (!supabase) {
      setUsuarios([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const selectWithTag = includeEmail
      ? "id, nome, email, role, operator_tag, ativo"
      : "id, nome, role, operator_tag, ativo"
    const selectWithoutTag = includeEmail
      ? "id, nome, email, role, ativo"
      : "id, nome, role, ativo"

    const loadUsuarios = async () => {
      try {
        let response = await supabase
          .from("usuarios")
          .select(selectWithTag)
          .eq("ativo", true)
          .order("nome", { ascending: true })

        if (response.error && isMissingOperatorTagColumnError(response.error)) {
          response = await supabase
            .from("usuarios")
            .select(selectWithoutTag)
            .eq("ativo", true)
            .order("nome", { ascending: true })
        }

        if (cancelled) return

        if (response.error) {
          console.error("[useUsuariosCache] Erro ao carregar usuários:", response.error.message)
          setLoading(false)
          return
        }

        const rows = (response.data ?? []) as UsuarioBasicoRow[]
        const list = rows.map((usuario) => ({
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email ?? undefined,
          role: normalizeRoleList(usuario.role),
          operator_tag: usuario.operator_tag ?? null,
          ativo: usuario.ativo ?? undefined,
        }))

        cacheSet(cacheKey, list, TTL_MS)
        setUsuarios(list)
      } catch (error) {
        if (!cancelled) {
          console.error("[useUsuariosCache] Falha inesperada:", error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadUsuarios()

    return () => {
      cancelled = true
    }
  }, [supabase, cacheKey, includeEmail])

  return { usuarios, loading }
}
