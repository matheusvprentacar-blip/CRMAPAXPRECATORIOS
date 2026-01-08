"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type UserRole = "admin" | "operador_comercial" | "operador_calculo" | "operador" | "analista" | "gestor"

interface UserProfile {
  id: string
  email: string
  nome: string
  role: UserRole
  foto_url?: string
  telefone?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, nome: string, role?: UserRole) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const role = session.user.app_metadata?.role
        if (role) {
          localStorage.removeItem("SHOW_REAUTH")
        }
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const role = session.user.app_metadata?.role
        if (role) {
          localStorage.removeItem("SHOW_REAUTH")
        }
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase.from("usuarios").select("*").eq("id", userId).single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("[v0] Erro ao carregar perfil:", error)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error

    localStorage.removeItem("SHOW_REAUTH")
    router.push("/dashboard")
  }

  async function signUp(email: string, password: string, nome: string, role: UserRole = "operador_comercial") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error

    if (data.user) {
      // Criar perfil do usuário
      const { error: profileError } = await supabase.from("usuarios").insert({
        id: data.user.id,
        email,
        nome,
        role,
      })

      if (profileError) throw profileError
    }

    router.push("/login")
  }

  async function signOut() {
    localStorage.removeItem("SHOW_REAUTH")
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.push("/login")
  }

  async function updateProfile(updates: Partial<UserProfile>) {
    if (!user) throw new Error("Usuário não autenticado")

    const { error } = await supabase.from("usuarios").update(updates).eq("id", user.id)

    if (error) throw error

    // Atualizar estado local
    setProfile((prev) => (prev ? { ...prev, ...updates } : null))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
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
