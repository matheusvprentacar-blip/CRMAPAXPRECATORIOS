"use client"

import type React from "react"

import { useAuth, type UserRole } from "./auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"



interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallbackPath?: string
}

export function RoleGuard({ children, allowedRoles, fallbackPath = "/dashboard" }: RoleGuardProps) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile) {
      // Verificar se o usuário tem alguma das roles permitidas
      const hasPermission = Array.isArray(profile.role)
        ? allowedRoles.some(role => profile.role.includes(role))
        : allowedRoles.includes(profile.role as any)

      if (!hasPermission) {
        router.push(fallbackPath)
      }
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

  // Verificação de renderização
  const hasPermission = profile && (
    Array.isArray(profile.role)
      ? allowedRoles.some(role => profile.role.includes(role))
      : allowedRoles.includes(profile.role as any)
  )

  if (!hasPermission) {
    return null
  }

  return <>{children}</>
}
