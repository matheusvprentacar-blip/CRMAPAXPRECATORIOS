"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createBrowserClient, getSupabasePublicConfig, probeSupabaseAuthConnectivity } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { isMissingOperatorTagColumnError, type OperatorTag } from "@/lib/users/operator-tag"
import type { HorariosPermitidos } from "@/lib/auth/horarios"

export type UserRole =
  | "admin"
  | "tecnico_ti"
  | "operador_comercial"
  | "operador_calculo"
  | "operador"
  | "analista"
  | "gestor"
  | "gestor_certidoes"
  | "gestor_oficio"
  | "gestor_escrituras"
  | "juridico"
  | "financeiro"
  | "agente_atendimento"

interface UserProfile {
  id: string
  email: string
  nome: string
  role: UserRole[]  // Mudado para array - permite até 2 roles
  operator_tag?: OperatorTag | null
  foto_url?: string
  telefone?: string
  horarios_permitidos?: HorariosPermitidos | null
}

type UserProfileRow = {
  id: string
  email: string
  nome: string
  role?: UserRole[] | UserRole | null
  operator_tag?: OperatorTag | null
  foto_url?: string | null
  telefone?: string | null
}

function normalizeProfileRoles(rawRole: unknown): UserRole[] {
  const initialRoles = (Array.isArray(rawRole) ? rawRole : [rawRole])
    .filter((role): role is string => typeof role === "string" && role.trim().length > 0)
    .map((role) => role.trim().toLowerCase())

  const roleSet = new Set<UserRole>()
  initialRoles.forEach((role) => roleSet.add(role as UserRole))

  // tecnico_ti deve ter acesso total no frontend como admin-like
  if (roleSet.has("tecnico_ti")) {
    roleSet.add("admin")
  }

  return Array.from(roleSet)
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

function isFetchConnectivityError(error: unknown) {
  if (error instanceof TypeError) return true
  if (!(error instanceof Error)) return false

  return /failed to fetch|networkerror|load failed|fetch/i.test(error.message)
}

async function mapSupabaseAuthError(error: unknown) {
  if (!isFetchConnectivityError(error)) {
    return error instanceof Error ? error : new Error("Erro inesperado durante a autenticacao.")
  }

  const { url } = getSupabasePublicConfig()
  const probe = await probeSupabaseAuthConnectivity()

  if (!probe.ok) {
    if (probe.reason === "missing_config") {
      return new Error("Supabase nao esta configurado corretamente. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.")
    }

    const targetHost = probe.host || url || "host do Supabase"
    return new Error(
      `Nao foi possivel conectar ao servidor de autenticacao do Supabase (${targetHost}). Verifique internet, DNS, VPN/firewall e abra /test-connection para diagnostico.`
    )
  }

  return new Error(
    `A autenticacao do Supabase respondeu de forma inesperada (HTTP ${probe.status}). Abra /test-connection para diagnostico.`
  )
}

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
      let profileResponse = await supabase
        .from("usuarios")
        .select("id, nome, email, role, operator_tag, foto_url, telefone, horarios_permitidos")
        .eq("id", userId)
        .single()

      if (profileResponse.error && isMissingOperatorTagColumnError(profileResponse.error)) {
        profileResponse = await supabase
          .from("usuarios")
          .select("id, nome, email, role, foto_url, telefone")
          .eq("id", userId)
          .single()
      }

      const { data, error } = profileResponse

      if (error) {
        throw error
      }

      if (!data) {
        throw new Error("Perfil não encontrado")
      }

      const profileRow = data as unknown as UserProfileRow
      const roleArray = normalizeProfileRoles(profileRow.role)

      setProfile({
        id: profileRow.id,
        email: profileRow.email,
        nome: profileRow.nome,
        role: roleArray,
        operator_tag: profileRow.operator_tag ?? null,
        foto_url: profileRow.foto_url ?? undefined,
        telefone: profileRow.telefone ?? undefined,
        horarios_permitidos: (profileRow as any).horarios_permitidos ?? null,
      })
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

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      localStorage.removeItem("SHOW_REAUTH")
      router.push("/dashboard")
    } catch (error) {
      console.error("[Auth] Falha no signIn:", error)
      throw await mapSupabaseAuthError(error)
    }
  }

  async function reAuthenticate(password: string) {
    if (!supabase) throw new Error("Supabase não está configurado")
    if (!user?.email) throw new Error("Usuário sem e-mail para reautenticação")

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password })
      if (error) throw error

      localStorage.removeItem("SHOW_REAUTH")
    } catch (error) {
      console.error("[Auth] Falha na reautenticacao:", error)
      throw await mapSupabaseAuthError(error)
    }
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
      } as never)

      if (profileError) throw profileError
    }

    router.push("/login")
  }

  async function signOut() {
    if (!supabase) throw new Error("Supabase não está configurado")

    localStorage.removeItem("SHOW_REAUTH")
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
    router.push("/login")
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!supabase) throw new Error("Supabase não está configurado")
    if (!user) throw new Error("Usuário não autenticado")

    const { error } = await supabase.from("usuarios").update(updates as never).eq("id", user.id)
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
