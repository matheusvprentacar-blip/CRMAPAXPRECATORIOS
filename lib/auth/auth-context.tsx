"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export type UserRole = "admin" | "operador_comercial" | "operador_calculo" | "operador" | "analista" | "gestor" | "gestor_certidoes" | "gestor_oficio" | "juridico" | "financeiro"

interface UserProfile {
  id: string
  email: string
  nome: string
  role: UserRole[]  // Mudado para array - permite até 2 roles
  foto_url?: string
  telefone?: string
}

// ===== Funções Helper para Verificação de Roles =====

/**
 * Verifica se o usuário tem uma role específica
 */
export function hasRole(roles: UserRole[] | null | undefined, checkRole: UserRole): boolean {
  return roles?.includes(checkRole) ?? false
}

/**
 * Verifica se o usuário tem QUALQUER uma das roles especificadas
 */
export function hasAnyRole(roles: UserRole[] | null | undefined, checkRoles: UserRole[]): boolean {
  return checkRoles.some(role => roles?.includes(role)) ?? false
}

/**
 * Verifica se o usuário tem TODAS as roles especificadas
 */
export function hasAllRoles(roles: UserRole[] | null | undefined, checkRoles: UserRole[]): boolean {
  return checkRoles.every(role => roles?.includes(role)) ?? false
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  reAuthenticate: (password: string) => Promise<void>
  signUp: (email: string, password: string, nome: string, role?: UserRole[]) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  // ⚠️ createBrowserClient() pode retornar null dependendo da sua implementação
  const supabase = createBrowserClient()

  useEffect(() => {
    // ✅ Guard para TS + runtime
    if (!supabase) {
      console.error("[v0] Supabase client não está configurado (createBrowserClient retornou null).")
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }

    // Buscar sessão inicial
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          const role = session.user.app_metadata?.role
          if (role) localStorage.removeItem("SHOW_REAUTH")
          setLoading(false)
          void loadProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("[v0] Erro ao buscar sessão inicial:", err)
        setLoading(false)
      })

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        const role = session.user.app_metadata?.role
        if (role) localStorage.removeItem("SHOW_REAUTH")
        setLoading(false)
        void loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile(userId: string) {
    if (!supabase) {
      console.error("[v0] Supabase client não está configurado (loadProfile).")
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, role, foto_url, telefone") // Selecionar campos explícitos
        .eq("id", userId)
        .single()

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error("Perfil não encontrado")
      }

      // Garantir que role seja array
      const roleArray = Array.isArray(data.role) ? data.role : [data.role].filter(Boolean)

      setProfile({
        ...data,
        role: roleArray
      } as UserProfile)
    } catch (error: unknown) {
      console.error("[v0] Erro ao carregar perfil (Catch):", JSON.stringify(error, null, 2))
      const errorMessage = error instanceof Error ? error.message : null
      const errorHint =
        typeof error === "object" && error !== null && "hint" in error
          ? String((error as { hint?: unknown }).hint ?? "")
          : ""

      if (errorMessage) console.error("Mensagem de erro:", errorMessage)
      if (errorHint) console.error("Hint:", errorHint)

      // Tentar recuperar role do metadata como fallback se falhar o banco (ex: erro de RLS temporário)
      if (user?.app_metadata?.role) {
        console.warn("⚠️ Usando role do metadata como fallback")
      }
    }
  }

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error("Supabase não está configurado")

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    localStorage.removeItem("SHOW_REAUTH")
    router.push("/dashboard")
  }

  async function reAuthenticate(password: string) {
    if (!supabase) throw new Error("Supabase não está configurado")
    if (!user?.email) throw new Error("Usuário sem e-mail para reautenticação")

    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password })
    if (error) throw error

    localStorage.removeItem("SHOW_REAUTH")
  }

  async function signUp(email: string, password: string, nome: string, role: UserRole[] = ["operador_comercial"]) {
    if (!supabase) throw new Error("Supabase não está configurado")

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase.from("usuarios").insert({
        id: data.user.id,
        email,
        nome,
        role, // Agora é array
      })

      if (profileError) throw profileError
    }

    router.push("/login")
  }

  async function signOut() {
    if (!supabase) throw new Error("Supabase não está configurado")

    localStorage.removeItem("SHOW_REAUTH")
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.push("/login")
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!supabase) throw new Error("Supabase não está configurado")
    if (!user) throw new Error("Usuário não autenticado")

    const { error } = await supabase.from("usuarios").update(updates).eq("id", user.id)
    if (error) throw error

    setProfile((prev) => (prev ? { ...prev, ...updates } : null))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        reAuthenticate,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider")
  }
  return context
}
