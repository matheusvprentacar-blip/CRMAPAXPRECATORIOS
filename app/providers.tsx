"use client"

import type React from "react"
import { useEffect } from "react"
import { HeroUIProvider } from "@/lib/heroui/compat"
import { usePathname, useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase/client"
import {
  applySystemTheme,
  DEFAULT_SYSTEM_THEME_CONFIG,
  deserializeSystemThemeConfig,
  sanitizeSystemThemeConfig,
  SYSTEM_THEME_CONFIG_STORAGE_KEY,
  SYSTEM_THEME_EVENT_NAME,
} from "@/lib/theme/system-theme"

const UI_ZOOM_STORAGE_KEY = "ui_zoom"
const UI_ZOOM_MIGRATION_KEY = "ui_zoom_default_90_applied"
const DEFAULT_UI_ZOOM = 0.9
const UI_ZOOM_MIN = 0.65
const UI_ZOOM_MAX = 1.15

const ROUTE_SHINY_SPREADS = ["116deg", "120deg", "124deg", "118deg", "122deg", "126deg"] as const

const clampZoom = (value: number) => Math.min(UI_ZOOM_MAX, Math.max(UI_ZOOM_MIN, value))

const hashRoute = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

const applyRouteShinyPalette = (pathname: string) => {
  if (typeof window === "undefined") return
  const root = document.documentElement
  const spread = ROUTE_SHINY_SPREADS[hashRoute(pathname || "/") % ROUTE_SHINY_SPREADS.length]

  root.style.setProperty("--route-shiny-spread", spread)
}

const readSanitizedZoom = () => {
  if (typeof window === "undefined") return DEFAULT_UI_ZOOM

  const savedZoom = window.localStorage.getItem(UI_ZOOM_STORAGE_KEY)
  const migrationApplied = window.localStorage.getItem(UI_ZOOM_MIGRATION_KEY) === "true"

  if (!savedZoom) {
    window.localStorage.setItem(UI_ZOOM_STORAGE_KEY, String(DEFAULT_UI_ZOOM))
    window.localStorage.setItem(UI_ZOOM_MIGRATION_KEY, "true")
    return DEFAULT_UI_ZOOM
  }

  const parsed = Number(savedZoom)
  const invalid = Number.isNaN(parsed) || !Number.isFinite(parsed)
  const outOfRange = parsed < UI_ZOOM_MIN || parsed > UI_ZOOM_MAX
  const migratedDefault = !migrationApplied && (parsed === 1 || parsed === 0.8)
  const sanitized = invalid || outOfRange || migratedDefault ? DEFAULT_UI_ZOOM : parsed

  if (sanitized !== parsed) {
    window.localStorage.setItem(UI_ZOOM_STORAGE_KEY, String(sanitized))
  }
  if (!migrationApplied || migratedDefault) {
    window.localStorage.setItem(UI_ZOOM_MIGRATION_KEY, "true")
  }

  return clampZoom(sanitized)
}

const applyUiZoom = (zoom: number) => {
  if (typeof window === "undefined") return

  const root = document.documentElement
  const datasetBase = Number(root.dataset.uiZoomBaseFontSize ?? "")
  let base = datasetBase

  if (!Number.isFinite(base) || base < 12 || base > 20) {
    const currentSize = Number.parseFloat(getComputedStyle(root).fontSize)
    const derivedBase = currentSize / Math.max(zoom, 0.01)
    base =
      Number.isNaN(derivedBase) || !Number.isFinite(derivedBase) || derivedBase < 12 || derivedBase > 20
        ? 16
        : derivedBase
    root.dataset.uiZoomBaseFontSize = String(base)
  }

  root.style.fontSize = `${(base * zoom).toFixed(2)}px`
  root.style.zoom = ""
  document.body.style.zoom = ""
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    applyUiZoom(readSanitizedZoom())
    applyRouteShinyPalette(pathname)
  }, [pathname])

  useEffect(() => {
    const syncZoom = () => applyUiZoom(readSanitizedZoom())
    window.addEventListener("ui-zoom:changed", syncZoom as EventListener)
    window.addEventListener("storage", syncZoom)
    return () => {
      window.removeEventListener("ui-zoom:changed", syncZoom as EventListener)
      window.removeEventListener("storage", syncZoom)
    }
  }, [])

  useEffect(() => {
    const applyFromStorage = () => {
      const stored = window.localStorage.getItem(SYSTEM_THEME_CONFIG_STORAGE_KEY)
      const config = deserializeSystemThemeConfig(stored)
      applySystemTheme(config)
    }

    const loadThemeFromServer = async () => {
      try {
        const supabase = getSupabase()
        if (!supabase) return

        const { data, error } = await supabase
          .from("configuracoes_sistema")
          .select("tema_config")
          .limit(1)
          .maybeSingle()

        if (error) return

        const config = sanitizeSystemThemeConfig(data?.tema_config ?? DEFAULT_SYSTEM_THEME_CONFIG)
        window.localStorage.setItem(SYSTEM_THEME_CONFIG_STORAGE_KEY, JSON.stringify(config))
        applySystemTheme(config)
      } catch {
        // Keep storage/default theme when remote config fails.
      }
    }

    const handleThemeChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ config?: unknown }>
      if (customEvent.detail?.config) {
        applySystemTheme(sanitizeSystemThemeConfig(customEvent.detail.config))
        return
      }
      applyFromStorage()
    }

    applyFromStorage()
    void loadThemeFromServer()

    window.addEventListener(SYSTEM_THEME_EVENT_NAME, handleThemeChanged as EventListener)
    window.addEventListener("storage", applyFromStorage)

    return () => {
      window.removeEventListener(SYSTEM_THEME_EVENT_NAME, handleThemeChanged as EventListener)
      window.removeEventListener("storage", applyFromStorage)
    }
  }, [])

  return (
    <HeroUIProvider navigate={(path) => router.push(path.toString())}>
      {children}
    </HeroUIProvider>
  )
}
