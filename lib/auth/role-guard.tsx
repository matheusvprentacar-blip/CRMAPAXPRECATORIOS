"use client"

import type React from "react"

import { useAuth } from "./auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

type UserRole = "admin" | "operador_comercial" | "operador_calculo" | "operador" | "analista" | "gestor"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallbackPath?: string
}

export function RoleGuard({ children, allowedRoles, fallbackPath = "/dashboard" }: RoleGuardProps) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile && !allowedRoles.includes(profile.role)) {
      router.push(fallbackPath)
    }
  }, [profile, loading, allowedRoles, fallbackPath, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return null
  }

  return <>{children}</>
}
