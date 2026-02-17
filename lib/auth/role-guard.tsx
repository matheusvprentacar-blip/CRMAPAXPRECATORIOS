"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth, type UserRole } from "./auth-context"

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
      const hasPermission = Array.isArray(profile.role)
        ? allowedRoles.some((role) => profile.role.includes(role))
        : allowedRoles.includes(profile.role as any)

      if (!hasPermission) {
        router.push(fallbackPath)
      }
    }
  }, [profile, loading, allowedRoles, fallbackPath, router])

  if (loading) {
    return (
      <div className="px-4 py-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-primary/15">
          <div className="h-full w-full animate-pulse bg-primary/70" />
        </div>
      </div>
    )
  }

  const hasPermission =
    profile &&
    (Array.isArray(profile.role)
      ? allowedRoles.some((role) => profile.role.includes(role))
      : allowedRoles.includes(profile.role as any))

  if (!hasPermission) {
    return null
  }

  return <>{children}</>
}

