"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable */
import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { getSupabase } from "@/lib/supabase/client"
import { AnimatePresence, motion } from "framer-motion"
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
  RotateCcw,
  User,
  FileCheck,
  Scroll,
  ScrollText,
  MessageSquare,
  DollarSign,
  FileSearch,
  Megaphone,
  CalendarDays,
  Activity,
} from "@/components/icons"
import { Avatar, AvatarIcon, Slider } from "@/lib/heroui/compat"
import { Button } from "@/components/ui/button"
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
import Image from "next/image"
import { NotificationsProvider } from "@/components/notifications/useNotifications"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { NotificationsModal } from "@/components/notifications/NotificationsModal"
import { ComunicadosBroadcastModal } from "@/components/comunicados/comunicados-broadcast-modal"
import { getVersion } from "@tauri-apps/api/app"
import packageJson from "@/package.json"
import { TelemetryProvider } from "@/components/telemetry/telemetry-provider"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

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
    roles: ["admin", "operador_comercial", "operador", "operador_calculo", "gestor", "gestor_escrituras"],
  },
  {
    name: "Chat",
    href: "/chat",
    icon: MessageSquare,
    roles: ["admin", "operador_comercial", "operador_calculo", "operador", "gestor", "juridico"],
  },
  {
    name: "Comunicados",
    href: "/comunicados",
    icon: Megaphone,
    roles: [
      "admin",
      "operador_comercial",
      "operador_calculo",
      "operador",
      "gestor",
      "juridico",
      "gestor_certidoes",
      "gestor_oficio",
      "gestor_escrituras",
      "financeiro",
      "analista",
    ],
  },
  {
    name: "Agenda",
    href: "/agenda",
    icon: CalendarDays,
    roles: [
      "admin",
      "operador_comercial",
      "operador_calculo",
      "operador",
      "gestor",
      "juridico",
      "gestor_certidoes",
      "gestor_oficio",
      "gestor_escrituras",
      "financeiro",
      "analista",
    ],
  },
  {
    name: "Propostas",
    href: "/propostas",
    icon: FileCheck,
    roles: ["admin", "operador_comercial", "operador", "operador_calculo", "gestor"],
  },
  {
    name: "Parecer Jurídico",
    href: "/parecer-juridico",
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
    name: "Gestão de Escrituras",
    href: "/gestao-escrituras",
    icon: ScrollText,
    roles: ["admin", "gestor_escrituras", "gestor"]
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
    roles: ["admin", "gestor_certidoes", "gestor_escrituras", "juridico"],
  },
  { name: "Telemetria", href: "/admin/telemetria", icon: Activity, roles: ["admin"] },
  { name: "Admin Precatórios", href: "/admin/precatorios", icon: Scale, roles: ["admin"] },
  { name: "Usuários", href: "/admin/usuarios", icon: Users, roles: ["admin"] },
  { name: "Financeiro", href: "/admin/financeiro", icon: DollarSign, roles: ["admin", "gestor"] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const DEFAULT_UI_ZOOM = 0.9
  const UI_ZOOM_STORAGE_KEY = "ui_zoom"
  const UI_ZOOM_MIGRATION_KEY = "ui_zoom_default_90_applied"

  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hideMenuForComunicado, setHideMenuForComunicado] = useState(false)
  const { profile, signOut } = useAuth()
  const [uiZoom, setUiZoom] = useState(DEFAULT_UI_ZOOM)
  const [uiZoomPreview, setUiZoomPreview] = useState(DEFAULT_UI_ZOOM)
  const baseFontSizeRef = useRef<number | null>(null)

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState("CRM APAX Precat\u00f3rios")
  const [subtituloEmpresa, setSubtituloEmpresa] = useState("Sistema de Gestão")
  const [appVersion, setAppVersion] = useState<string>(packageJson.version)

  const ZOOM_MIN = 0.65
  const ZOOM_MAX = 1.15

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
    const savedZoom = window.localStorage.getItem(UI_ZOOM_STORAGE_KEY)
    const migrationApplied = window.localStorage.getItem(UI_ZOOM_MIGRATION_KEY) === "true"

    if (!savedZoom) {
      window.localStorage.setItem(UI_ZOOM_STORAGE_KEY, String(DEFAULT_UI_ZOOM))
      window.localStorage.setItem(UI_ZOOM_MIGRATION_KEY, "true")
      setUiZoom(DEFAULT_UI_ZOOM)
      setUiZoomPreview(DEFAULT_UI_ZOOM)
      return
    }

    const parsed = Number(savedZoom)
    const invalid = Number.isNaN(parsed) || !Number.isFinite(parsed)
    const outOfRange = parsed < ZOOM_MIN || parsed > ZOOM_MAX

    // Migra usuários do padrão antigo (100% e 80%) para o novo padrão (90%) uma vez.
    const migratedDefault = !migrationApplied && (parsed === 1 || parsed === 0.8)

    const sanitized = invalid || outOfRange || migratedDefault ? DEFAULT_UI_ZOOM : parsed
    if (sanitized !== parsed) {
      window.localStorage.setItem(UI_ZOOM_STORAGE_KEY, String(sanitized))
    }
    if (!migrationApplied || migratedDefault) {
      window.localStorage.setItem(UI_ZOOM_MIGRATION_KEY, "true")
    }
    setUiZoom(sanitized)
    setUiZoomPreview(sanitized)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(UI_ZOOM_STORAGE_KEY, String(uiZoom))

    if (!baseFontSizeRef.current) {
      const root = document.documentElement
      const datasetBase = Number(root.dataset.uiZoomBaseFontSize ?? "")

      if (Number.isFinite(datasetBase) && datasetBase >= 12 && datasetBase <= 20) {
        baseFontSizeRef.current = datasetBase
      } else {
        const rootSize = Number.parseFloat(getComputedStyle(root).fontSize)
        const derivedBase = rootSize / Math.max(uiZoom, 0.01)
        const normalizedBase =
          Number.isNaN(derivedBase) || !Number.isFinite(derivedBase) || derivedBase < 12 || derivedBase > 20
            ? 16
            : derivedBase
        baseFontSizeRef.current = normalizedBase
        root.dataset.uiZoomBaseFontSize = String(normalizedBase)
      }
    }

    const base = baseFontSizeRef.current ?? 16
    document.documentElement.dataset.uiZoomBaseFontSize = String(base)
    document.documentElement.style.fontSize = `${(base * uiZoom).toFixed(2)}px`
    document.documentElement.style.zoom = ""
    document.body.style.zoom = ""
    window.dispatchEvent(new CustomEvent("ui-zoom:changed", { detail: uiZoom }))
  }, [uiZoom])

  useEffect(() => {
    if (!hideMenuForComunicado) return
    setSidebarOpen(false)
  }, [hideMenuForComunicado])

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

  const zoomPercent = Math.round(uiZoomPreview * 100)
  const zoomAppliedPercent = Math.round(uiZoom * 100)
  const handleZoomReset = () => {
    setUiZoom(DEFAULT_UI_ZOOM)
    setUiZoomPreview(DEFAULT_UI_ZOOM)
  }
  const handleZoomPreviewChange = (value: number | number[]) => {
    const next = Array.isArray(value) ? value[0] : value
    setUiZoomPreview(clampZoom(Number(next.toFixed(2))))
  }
  const handleZoomCommit = (value: number | number[]) => {
    const next = Array.isArray(value) ? value[0] : value
    const zoom = clampZoom(Number(next.toFixed(2)))
    setUiZoom(zoom)
    setUiZoomPreview(zoom)
  }


  const profileMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 hover:bg-muted/60">
          <Avatar
            className="w-8 h-8 text-xs"
            src={profile?.foto_url || undefined}
            name={profile?.nome || undefined}
            showFallback
            icon={<AvatarIcon />}
            classNames={{
              fallback: "bg-primary text-primary-foreground font-semibold",
              icon: "text-primary-foreground",
            }}
          />
          <span className="text-sm hidden sm:inline">{profile?.nome}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 border border-border/90 !bg-[#f7f4ef] dark:!bg-[#151922] text-foreground shadow-xl !opacity-100 backdrop-blur-none supports-[backdrop-filter]:!backdrop-blur-none"
        style={{ backdropFilter: "none", WebkitBackdropFilter: "none" }}
        forceMount
      >
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
        <div className="px-3 py-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Zoom da interface</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={zoomPercent}
                initial={{ opacity: 0, y: 6, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.92 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="font-mono text-foreground tabular-nums"
              >
                {zoomPercent}%
              </motion.span>
            </AnimatePresence>
          </div>
          <Slider
            className="max-w-[220px]"
            value={uiZoomPreview}
            minValue={ZOOM_MIN}
            maxValue={ZOOM_MAX}
            step={0.01}
            color="primary"
            size="sm"
            onChange={handleZoomPreviewChange}
            onChangeEnd={handleZoomCommit}
            aria-label="Zoom da interface"
          />
          <p className="text-[11px] text-muted-foreground">Solte o mouse para aplicar ({zoomAppliedPercent}% atual)</p>
        </div>
        <DropdownMenuItem onClick={handleZoomReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Voltar para {Math.round(DEFAULT_UI_ZOOM * 100)}%
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
      <TelemetryProvider>
        <NotificationsProvider>
          <div className="min-h-screen bg-transparent">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && !hideMenuForComunicado && (
              <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Global Watermark/Timbrado - BRANDING */}
            <div
              className="global-watermark fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03] mix-blend-multiply blur-[1px] select-none"
              aria-hidden="true"
            >
              <div className="relative w-[500px] h-[500px]">
                <Image
                  src="/logo-apax.png"
                  alt="Watermark"
                  fill
                  className="object-contain grayscale"
                />
              </div>
            </div>

            {/* Sidebar */}
            <aside
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto",
                "bg-zinc-100 text-zinc-900 border-zinc-300/70 shadow-xl dark:bg-zinc-950/40 dark:text-zinc-100 dark:border-zinc-800/60",
                hideMenuForComunicado && "pointer-events-none -translate-x-full opacity-0 lg:-translate-x-full",
                sidebarOpen ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <div className="flex flex-col h-full relative z-10">
                {/* Gradient Accent Top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-orange-400 to-amber-500" />

                {/* Logo Area */}
                <div className="flex items-center gap-3 p-6 border-b border-border/50">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-sm border border-primary/40">
                    <Image
                      src={logoUrl || "/logo-apax.png"}
                      alt="Logo"
                      width={40}
                      height={40}
                      priority
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
                  {filteredNavigation.reduce((acc: React.ReactNode[], item) => {
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
                        <Icon
                          className={cn(
                            "w-5 h-5 transition-colors",
                            isActive
                              ? "text-amber-600"
                              : "text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100"
                          )}
                        />
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
            <div
              className={cn(
                "transition-[padding] duration-500 ease-out",
                hideMenuForComunicado ? "lg:pl-0" : "lg:pl-64"
              )}
            >
              {/* Mobile header */}
              <header className={cn("sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border dark:bg-muted dark:border-border lg:hidden", hideMenuForComunicado && "invisible pointer-events-none")}>
                <div className="flex items-center justify-between p-4">
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <X /> : <Menu />}
                  </Button>
                  <h2 className="text-lg font-semibold">{nomeEmpresa}</h2>
                  <div className="flex items-center gap-2">
                    <NotificationBell />
                    <AnimatedThemeToggler className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground" />
                    {profileMenu}
                  </div>
                </div>
              </header>

              {/* Desktop header */}
              <header className={cn("hidden lg:block sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border dark:bg-muted dark:border-border", hideMenuForComunicado && "invisible pointer-events-none")}>
                {/* Subtle noise texture or gradient could be added here via pseudo-element if desired, for now keeping it clean/glassy */}
                <div className="flex items-center justify-end p-4 gap-2">
                  <NotificationBell />
                  <AnimatedThemeToggler className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground" />
                  {profileMenu}
                </div>
              </header>

              {/* Page content */}
              <main className="min-h-[calc(100vh-4rem)] p-6 transition-all duration-500 ease-out">{children}</main>
            </div>
          </div>
          <NotificationsModal />
          <ComunicadosBroadcastModal onComunicadoBlockingChange={setHideMenuForComunicado} />
        </NotificationsProvider>
      </TelemetryProvider>
    </ProtectedRoute>
  )
}
