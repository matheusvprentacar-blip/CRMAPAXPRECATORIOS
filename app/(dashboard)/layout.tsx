"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getSupabase } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  FileText,
  Calculator,
  Kanban,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Scale,
  Moon,
  Sun,
  User,
  FileCheck,
  Scroll,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth/auth-context"
import { ProtectedRoute } from "@/lib/auth/protected-route"
import { useTheme } from "next-themes"
import { UpdateChecker } from "@/components/settings/update-checker"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "operador_comercial", "operador_calculo", "operador", "gestor"],
  },
  {
    name: "Precatórios",
    href: "/precatorios",
    icon: FileText,
    roles: ["admin", "operador_comercial", "operador_calculo", "operador", "gestor"],
  },
  {
    name: "Kanban",
    href: "/kanban",
    icon: Kanban,
    roles: ["admin", "operador_comercial", "operador", "operador_calculo", "gestor"],
  },
  {
    name: "Propostas",
    href: "/propostas",
    icon: FileCheck,
    roles: ["admin", "operador_comercial", "operador", "operador_calculo", "gestor"],
  },
  {
    name: "Jurídico",
    href: "/juridico",
    icon: Scale,
    roles: ["admin", "juridico", "gestor"],
  },
  { name: "Fila de Cálculo", href: "/calculo", icon: Calculator, roles: ["admin", "operador_calculo", "gestor"] },
  {
    name: "Gestão de Certidões",
    href: "/gestao-certidoes",
    icon: FileCheck,
    roles: ["admin", "gestor_certidoes", "gestor"]
  },
  {
    name: "Gestão de Ofícios",
    href: "/gestao-oficios",
    icon: Scroll,
    roles: ["admin", "gestor_oficio", "gestor"]
  },
  { name: "Admin Precatórios", href: "/admin/precatorios", icon: Scale, roles: ["admin"] },
  { name: "Usuários", href: "/admin/usuarios", icon: Users, roles: ["admin"] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState("CRM Precatórios")
  const [subtituloEmpresa, setSubtituloEmpresa] = useState("Sistema de Gestão")

  const filteredNavigation = navigation.filter((item) => {
    if (!profile?.role) return false
    // Garantir que role seja tratado como array
    const userRoles = typeof profile.role === 'string' ? [profile.role] : profile.role

    // Verificar se usuário tem QUALQUER uma das roles necessárias para este item
    return item.roles.some(requiredRole => userRoles.includes(requiredRole as any))
  })

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const { data } = await supabase
        .from('configuracoes_sistema')
        .select('logo_url, nome_empresa, subtitulo_empresa')
        .single()

      if (data) {
        if (data.logo_url) setLogoUrl(data.logo_url)
        if (data.nome_empresa) setNomeEmpresa(data.nome_empresa)
        if (data.subtitulo_empresa) setSubtituloEmpresa(data.subtitulo_empresa)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 p-6 border-b">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                <img
                  src={logoUrl || "/logo-apax.png"}
                  alt="Logo"
                  className="object-contain w-full h-full"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold">{nomeEmpresa}</h1>
                <p className="text-xs text-muted-foreground">{subtituloEmpresa}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                      isActive
                        ? "bg-primary/10 text-primary border-l-4 border-primary rounded-l-none"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* User section */}
            <div className="p-4 border-t space-y-3">
              <UpdateChecker />
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={profile?.foto_url || "/placeholder.svg"} />
                  <AvatarFallback>{profile?.nome ? getInitials(profile.nome) : "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.nome}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {(Array.isArray(profile?.role) ? profile.role : [profile?.role]).filter(Boolean).map(r => r?.replace(/_/g, " ")).join(" + ")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                  <Link href="/perfil">
                    <Settings className="w-4 h-4 mr-2" />
                    Perfil
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Mobile header */}
          <header className="sticky top-0 z-30 bg-card border-b lg:hidden">
            <div className="flex items-center justify-between p-4">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X /> : <Menu />}
              </Button>
              <h2 className="text-lg font-semibold">{nomeEmpresa}</h2>
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
            </div>
          </header>

          {/* Desktop header */}
          <header className="hidden lg:block sticky top-0 z-30 bg-card border-b">
            <div className="flex items-center justify-end p-4 gap-2">
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={profile?.foto_url || "/placeholder.svg"} />
                      <AvatarFallback>{profile?.nome ? getInitials(profile.nome) : "U"}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{profile?.nome}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/perfil">
                      <User className="w-4 h-4 mr-2" />
                      Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/perfil">
                      <Settings className="w-4 h-4 mr-2" />
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
