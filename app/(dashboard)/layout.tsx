"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable */
import type React from "react"

import { useState, useEffect, useRef } from "react"
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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  User,
  FileCheck,
  Scroll,
  MessageSquare,
  DollarSign,
  FileSearch,
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
import Image from "next/image"
import { NotificationsProvider } from "@/components/notifications/useNotifications"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { NotificationsModal } from "@/components/notifications/NotificationsModal"
import { GlobalUpdateNotifier } from "@/components/settings/global-update-notifier"
import { getVersion } from "@tauri-apps/api/app"
import packageJson from "@/package.json"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "operador_comercial", "operador_calculo", "operador", "gestor"],
  },
  {
    name: "Clientes (CRM)",
    href: "/clientes",
    icon: Users,
    roles: ["admin", "operador_comercial", "gestor"],
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
    name: "Chat",
    href: "/chat",
    icon: MessageSquare,
    roles: ["admin", "operador_comercial", "operador_calculo", "operador", "gestor", "juridico"],
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
    name: "Análise Processual",
    href: "/analise-processual",
    icon: FileSearch,
    roles: ["admin", "operador_calculo", "gestor"]
  },
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
  {
    name: "Acesso Controlado",
    href: "/acesso-controlado",
    icon: (props: any) => (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    roles: ["admin", "gestor_certidoes", "juridico"],
  },
  { name: "Admin Precatórios", href: "/admin/precatorios", icon: Scale, roles: ["admin"] },
  { name: "Usuários", href: "/admin/usuarios", icon: Users, roles: ["admin"] },
  { name: "Financeiro", href: "/admin/financeiro", icon: DollarSign, roles: ["admin", "gestor"] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [uiZoom, setUiZoom] = useState(1)
  const baseFontSizeRef = useRef<number | null>(null)

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState("CRM Precatórios")
  const [subtituloEmpresa, setSubtituloEmpresa] = useState("Sistema de Gestão")
  const [appVersion, setAppVersion] = useState<string>(packageJson.version)

  const ZOOM_MIN = 0.85
  const ZOOM_MAX = 1.15
  const ZOOM_STEP = 0.05

  const clampZoom = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))

  const filteredNavigation = navigation.filter((item) => {
    if (!profile?.role) return false
    // Garantir que role seja tratado como array
    const userRoles = typeof profile.role === 'string' ? [profile.role] : profile.role

    // Verificar se usuário tem QUALQUER uma das roles necessárias para este item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return item.roles.some(requiredRole => userRoles.includes(requiredRole as any))
  })

  useEffect(() => {
    loadConfig()


  }, [])

  useEffect(() => {
    const isTauriWindow =
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)

    if (!isTauriWindow) return

    getVersion().then(setAppVersion).catch(() => {
      // Keep package.json version as fallback.
    })
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const savedZoom = window.localStorage.getItem("ui_zoom")
    if (!savedZoom) return
    const parsed = Number(savedZoom)
    if (Number.isNaN(parsed)) return
    if (!Number.isFinite(parsed)) return
    const sanitized = parsed < ZOOM_MIN || parsed > ZOOM_MAX ? 1 : parsed
    if (sanitized !== parsed) {
      window.localStorage.setItem("ui_zoom", String(sanitized))
    }
    setUiZoom(sanitized)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("ui_zoom", String(uiZoom))

    if (!baseFontSizeRef.current) {
      const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      const normalizedRoot =
        Number.isNaN(rootSize) || rootSize < 12 || rootSize > 20
          ? 16
          : rootSize
      baseFontSizeRef.current = normalizedRoot
    }

    const base = baseFontSizeRef.current ?? 16
    document.documentElement.style.fontSize = `${base * uiZoom}px`
    document.documentElement.style.zoom = ""
    document.body.style.zoom = ""
  }, [uiZoom])

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

  const zoomPercent = Math.round(uiZoom * 100)
  const handleZoomOut = () => setUiZoom((value) => clampZoom(Number((value - ZOOM_STEP).toFixed(2))))
  const handleZoomIn = () => setUiZoom((value) => clampZoom(Number((value + ZOOM_STEP).toFixed(2))))
  const handleZoomReset = () => setUiZoom(1)


  const profileMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 hover:bg-muted/60">
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile?.foto_url || "/placeholder.svg"} />
            <AvatarFallback>{profile?.nome ? getInitials(profile.nome) : "U"}</AvatarFallback>
          </Avatar>
          <span className="text-sm hidden sm:inline">{profile?.nome}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile?.nome}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {(Array.isArray(profile?.role) ? profile.role : [profile?.role]).filter(Boolean).map((r) => r?.replace(/_/g, " ")).join(", ")}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <User className="w-4 h-4 mr-2" />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <Settings className="w-4 h-4 mr-2" />
            {"Configura\u00e7\u00f5es"}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Zoom da interface ({zoomPercent}%)
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handleZoomOut} disabled={uiZoom <= ZOOM_MIN}>
          <ZoomOut className="w-4 h-4 mr-2" />
          Diminuir
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleZoomIn} disabled={uiZoom >= ZOOM_MAX}>
          <ZoomIn className="w-4 h-4 mr-2" />
          Aumentar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleZoomReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Voltar para 100%
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <ProtectedRoute>
      <NotificationsProvider>
      <GlobalUpdateNotifier />
      <div className="min-h-screen bg-gradient-to-b from-stone-100 to-stone-200/70 dark:from-zinc-950 dark:to-zinc-900/60">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Global Watermark/Timbrado - BRANDING */}
        <div
          className="global-watermark fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03] mix-blend-multiply blur-[1px] select-none"
          aria-hidden="true"
        >
          <div className="relative w-[500px] h-[500px]">
            <Image
              src="/image.png"
              alt="Watermark"
              fill
              className="object-contain grayscale"
            />
          </div>
        </div>

        {/* Sidebar - Premium Glassmorphism Look */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto",
            "bg-zinc-100 text-zinc-900 border-zinc-300/70 shadow-xl dark:bg-zinc-950/40 dark:text-zinc-100 dark:border-zinc-800/60",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex flex-col h-full relative z-10">
            {/* Gradient Accent Top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-orange-400 to-amber-500" />

            {/* Logo Area */}
            <div className="flex items-center gap-3 p-6 border-b border-border/50">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-sm border border-orange-100">
                <Image
                  src={logoUrl || "/image.png"}
                  alt="Logo"
                  width={40}
                  height={40}
                  className="object-contain w-10 h-10"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold leading-none tracking-tight text-foreground">{nomeEmpresa}</h1>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{subtituloEmpresa}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {filteredNavigation.reduce((acc: React.ReactNode[], item, index) => {
                // Logic to add separators if needed, for now just the items
                // You can group them here if the `roles` or `category` was more explicit in the `navigation` array

                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                const Icon = item.icon

                const link = (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                      isActive
                        ? "bg-amber-50 text-zinc-900 font-semibold dark:bg-amber-900/20 dark:text-zinc-100"
                        : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-100",
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-500 rounded-r-full" />
                    )}
                    <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-amber-600" : "text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100")} />
                    {item.name}
                  </Link>
                )

                return [...acc, link]
              }, [])}
            </nav>

            {/* User section removed as per request to move to top header */}
            <div className="p-4 border-t border-border/50 bg-muted/5">
              <p className="text-[10px] text-center text-muted-foreground">v{appVersion}</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Mobile header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-zinc-200/70 dark:bg-zinc-950/70 dark:border-zinc-800/60 lg:hidden">
            <div className="flex items-center justify-between p-4">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X /> : <Menu />}
              </Button>
              <h2 className="text-lg font-semibold">{nomeEmpresa}</h2>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                {profileMenu}
              </div>
            </div>
          </header>

          {/* Desktop header */}
          <header className="hidden lg:block sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-zinc-200/70 dark:bg-zinc-950/70 dark:border-zinc-800/60">
            {/* Subtle noise texture or gradient could be added here via pseudo-element if desired, for now keeping it clean/glassy */}
            <div className="flex items-center justify-end p-4 gap-2">
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              {profileMenu}
            </div>
          </header>

          {/* Page content */}
          <main className="p-6">{children}</main>
        </div>
      </div>
      <NotificationsModal />
      </NotificationsProvider>
    </ProtectedRoute>
  )
}
