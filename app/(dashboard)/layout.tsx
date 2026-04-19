"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable */
import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase/client"
import { AnimatePresence, motion } from "framer-motion"
import {
  LayoutDashboard,
  FileText,
  Calculator,
  Kanban,
  Users,
  Settings,
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
  Phone,
} from "@/components/icons"
import { Avatar, AvatarIcon, Slider } from "@/lib/heroui/compat"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
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
import { isWithinAllowedHours } from "@/lib/auth/horarios"
import { ProtectedRoute } from "@/lib/auth/protected-route"
import Image from "next/image"
import { NotificationsProvider } from "@/components/notifications/useNotifications"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { NotificationsModal } from "@/components/notifications/NotificationsModal"
import { ComunicadosBroadcastModal } from "@/components/comunicados/comunicados-broadcast-modal"
import { TelemetryProvider } from "@/components/telemetry/telemetry-provider"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

const FALLBACK_APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "operador_comercial", "operador_calculo", "operador", "gestor", "juridico"],
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
    roles: ["admin", "operador_comercial", "operador_calculo", "operador", "gestor", "juridico"],
  },
  {
    name: "Kanban",
    href: "/kanban",
    icon: Kanban,
    roles: ["admin", "operador_comercial", "operador", "operador_calculo", "gestor", "gestor_escrituras", "juridico"],
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
    roles: ["admin", "operador_calculo", "gestor"],
  },
  {
    name: "Gestão de Certidões",
    href: "/gestao-certidoes",
    icon: FileCheck,
    roles: ["admin", "gestor_certidoes", "gestor"],
  },
  {
    name: "Gestão de Ofícios",
    href: "/gestao-oficios",
    icon: Scroll,
    roles: ["admin", "gestor_oficio", "gestor"],
  },
  {
    name: "Gestão de Escrituras",
    href: "/gestao-escrituras",
    icon: ScrollText,
    roles: ["admin", "gestor_escrituras", "gestor"],
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
  {
    name: "Atendimento",
    href: "/atendimento",
    icon: Phone,
    roles: ["admin", "agente_atendimento", "operador_comercial", "operador"],
  },
  { name: "Telemetria", href: "/admin/telemetria", icon: Activity, roles: ["admin"] },
  { name: "Admin Precatórios", href: "/admin/precatorios", icon: Scale, roles: ["admin"] },
  { name: "Usuários", href: "/admin/usuarios", icon: Users, roles: ["admin"] },
  { name: "Financeiro", href: "/admin/financeiro", icon: DollarSign, roles: ["admin", "gestor"] },
]

type DashboardSidebarProps = {
  pathname: string
  filteredNavigation: (typeof navigation)
  logoUrl: string | null
  nomeEmpresa: string
  subtituloEmpresa: string
  appVersion: string
}

function DashboardSidebar({
  pathname,
  filteredNavigation,
  logoUrl,
  nomeEmpresa,
  subtituloEmpresa,
  appVersion,
}: DashboardSidebarProps) {
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border/70 shadow-xl">
      <SidebarHeader className="p-3">
        <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 bg-sidebar/60 group-data-[collapsible=icon]:hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-orange-400 to-amber-500" />
          <SidebarMenu className="p-2 pt-3">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip={nomeEmpresa}>
                <div className="size-10 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/40 shrink-0">
                  <Image
                    src={logoUrl || "/logo-apax.png"}
                    alt="Logo"
                    width={30}
                    height={30}
                    priority
                    className="object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{nomeEmpresa}</span>
                  <span className="truncate text-xs text-muted-foreground">{subtituloEmpresa}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pb-2">
        <SidebarMenu>
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon

            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.name}
                  className={cn(
                    "h-10",
                    "data-[active=true]:bg-amber-50 data-[active=true]:text-zinc-900 dark:data-[active=true]:bg-amber-900/20 dark:data-[active=true]:text-zinc-100"
                  )}
                >
                  <Link href={item.href} onClick={() => setOpenMobile(false)}>
                    <Icon className={cn("size-5", isActive && "text-amber-600")} />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className="px-2 pt-1 group-data-[collapsible=icon]:hidden">
          <p className="text-[10px] text-center text-muted-foreground">v{appVersion}</p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

type UserMenuDropdownProps = {
  profile: any
  signOut: () => Promise<void>
  zoomPercent: number
  zoomAppliedPercent: number
  uiZoomPreview: number
  ZOOM_MIN: number
  ZOOM_MAX: number
  handleZoomPreviewChange: (value: number | number[]) => void
  handleZoomCommit: (value: number | number[]) => void
  handleZoomReset: () => void
}

function UserMenuDropdown({
  profile,
  signOut,
  zoomPercent,
  zoomAppliedPercent,
  uiZoomPreview,
  ZOOM_MIN,
  ZOOM_MAX,
  handleZoomPreviewChange,
  handleZoomCommit,
  handleZoomReset,
}: UserMenuDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          aria-label="Abrir menu do usuário"
        >
          <Avatar
            className="size-8 text-xs"
            src={profile?.foto_url || undefined}
            name={profile?.nome || undefined}
            showFallback
            icon={<AvatarIcon />}
            classNames={{
              fallback: "bg-primary text-primary-foreground font-semibold",
              icon: "text-primary-foreground",
            }}
          />
        </button>
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
              {(Array.isArray(profile?.role) ? profile.role : [profile?.role])
                .filter(Boolean)
                .map((r: string) => r?.replace(/_/g, " "))
                .join(", ")}
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
            Configurações
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
          Voltar para 90%
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const DEFAULT_UI_ZOOM = 0.9
  const UI_ZOOM_STORAGE_KEY = "ui_zoom"
  const UI_ZOOM_MIGRATION_KEY = "ui_zoom_default_90_applied"

  const pathname = usePathname()
  const router = useRouter()
  const [hideMenuForComunicado, setHideMenuForComunicado] = useState(false)
  const { profile, signOut } = useAuth()
  const [uiZoom, setUiZoom] = useState(DEFAULT_UI_ZOOM)
  const [uiZoomPreview, setUiZoomPreview] = useState(DEFAULT_UI_ZOOM)
  const baseFontSizeRef = useRef<number | null>(null)

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState("CRM APAX Precatórios")
  const [subtituloEmpresa, setSubtituloEmpresa] = useState("Sistema de Gestão")
  const [appVersion, setAppVersion] = useState<string>(FALLBACK_APP_VERSION)

  const ZOOM_MIN = 0.65
  const ZOOM_MAX = 1.15

  const clampZoom = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))

  const filteredNavigation = navigation.filter((item) => {
    if (!profile?.role) return false
    const userRoles = typeof profile.role === "string" ? [profile.role] : profile.role

    return item.roles.some((requiredRole) => userRoles.includes(requiredRole as any))
  })
  const isKanbanPage = pathname === "/kanban"

  // Verificação de horário permitido — redireciona para tela de bloqueio se fora do período
  useEffect(() => {
    if (!profile) return
    const check = () => {
      if (!isWithinAllowedHours(profile.horarios_permitidos)) {
        router.replace("/sessao-bloqueada")
      }
    }
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [profile, router])

  useEffect(() => {
    loadConfig()
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

  async function loadConfig() {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const { data, error } = await supabase
        .from("configuracoes_sistema")
        .select("logo_url, nome_empresa, subtitulo_empresa")
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        const configuracoes = data as {
          logo_url?: string | null
          nome_empresa?: string | null
          subtitulo_empresa?: string | null
        }

        if (configuracoes.logo_url) setLogoUrl(configuracoes.logo_url)
        if (configuracoes.nome_empresa) setNomeEmpresa(configuracoes.nome_empresa)
        if (configuracoes.subtitulo_empresa) setSubtituloEmpresa(configuracoes.subtitulo_empresa)
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error)
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

  return (
    <ProtectedRoute>
      <TelemetryProvider>
        <NotificationsProvider>
          <SidebarProvider defaultOpen={false}>
            <div className="min-h-screen bg-transparent flex w-full overflow-x-hidden">
              <div
                className="global-watermark fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03] mix-blend-multiply blur-[1px] select-none"
                aria-hidden="true"
              >
                <div className="relative w-[500px] h-[500px]">
                  <Image src="/logo-apax.png" alt="Watermark" fill className="object-contain grayscale" />
                </div>
              </div>

              {!hideMenuForComunicado && (
                <DashboardSidebar
                  pathname={pathname}
                  filteredNavigation={filteredNavigation}
                  logoUrl={logoUrl}
                  nomeEmpresa={nomeEmpresa}
                  subtituloEmpresa={subtituloEmpresa}
                  appVersion={appVersion}
                />
              )}

              <SidebarInset>
                <header
                  className={cn(
                    "sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border dark:bg-muted dark:border-border lg:hidden",
                    hideMenuForComunicado && "invisible pointer-events-none"
                  )}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2 p-4 pr-6">
                    <SidebarTrigger className="-ml-1" />
                    <h2 className="hidden min-w-0 flex-1 truncate text-lg font-semibold sm:block">{nomeEmpresa}</h2>
                    <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
                      <NotificationBell />
                      <AnimatedThemeToggler className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground" />
                      <UserMenuDropdown
                        profile={profile}
                        signOut={signOut}
                        zoomPercent={zoomPercent}
                        zoomAppliedPercent={zoomAppliedPercent}
                        uiZoomPreview={uiZoomPreview}
                        ZOOM_MIN={ZOOM_MIN}
                        ZOOM_MAX={ZOOM_MAX}
                        handleZoomPreviewChange={handleZoomPreviewChange}
                        handleZoomCommit={handleZoomCommit}
                        handleZoomReset={handleZoomReset}
                      />
                    </div>
                  </div>
                </header>

                <header
                  className={cn(
                    "hidden lg:block sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border dark:bg-muted dark:border-border",
                    hideMenuForComunicado && "invisible pointer-events-none"
                  )}
                >
                  <div className="flex min-w-0 items-center justify-between p-4 pr-6 gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
                      <NotificationBell />
                      <AnimatedThemeToggler className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground" />
                      <UserMenuDropdown
                        profile={profile}
                        signOut={signOut}
                        zoomPercent={zoomPercent}
                        zoomAppliedPercent={zoomAppliedPercent}
                        uiZoomPreview={uiZoomPreview}
                        ZOOM_MIN={ZOOM_MIN}
                        ZOOM_MAX={ZOOM_MAX}
                        handleZoomPreviewChange={handleZoomPreviewChange}
                        handleZoomCommit={handleZoomCommit}
                        handleZoomReset={handleZoomReset}
                      />
                    </div>
                  </div>
                </header>

                <main
                  className={cn(
                    "min-w-0 w-full max-w-full overflow-x-hidden transition-all duration-500 ease-out",
                    isKanbanPage
                      ? "flex-1 min-h-0 h-[calc(100vh-76px)] overflow-hidden p-0 lg:p-2 flex flex-col"
                      : "min-h-[calc(100vh-76px)] p-6"
                  )}
                >
                  {children}
                </main>
              </SidebarInset>
            </div>
          </SidebarProvider>
          <NotificationsModal />
          <ComunicadosBroadcastModal onComunicadoBlockingChange={setHideMenuForComunicado} />
        </NotificationsProvider>
      </TelemetryProvider>
    </ProtectedRoute>
  )
}
