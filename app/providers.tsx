"use client"

import type React from "react"
import { useEffect } from "react"
import { HeroUIProvider } from "@heroui/react"
import { usePathname, useRouter } from "next/navigation"

const UI_ZOOM_STORAGE_KEY = "ui_zoom"
const UI_ZOOM_MIGRATION_KEY = "ui_zoom_default_80_applied"
const DEFAULT_UI_ZOOM = 0.8
const UI_ZOOM_MIN = 0.65
const UI_ZOOM_MAX = 1.15

type RouteShinyPalette = {
  base: string
  shine: string
  accent: string
  spread: string
}

const ROUTE_SHINY_PALETTES: RouteShinyPalette[] = [
  { base: "#d5b58f", shine: "#fff6e9", accent: "#ff8a00", spread: "116deg" },
  { base: "#a8bdd8", shine: "#f2f8ff", accent: "#3b82f6", spread: "120deg" },
  { base: "#a6ccb8", shine: "#f2fff8", accent: "#22c55e", spread: "124deg" },
  { base: "#c2b2dd", shine: "#f8f2ff", accent: "#a855f7", spread: "118deg" },
  { base: "#d8aec0", shine: "#fff2f7", accent: "#ec4899", spread: "122deg" },
  { base: "#9ccfcb", shine: "#effffd", accent: "#14b8a6", spread: "126deg" },
]

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
  const palette = ROUTE_SHINY_PALETTES[hashRoute(pathname || "/") % ROUTE_SHINY_PALETTES.length]

  root.style.setProperty("--route-shiny-base", palette.base)
  root.style.setProperty("--route-shiny-shine", palette.shine)
  root.style.setProperty("--route-shiny-accent", palette.accent)
  root.style.setProperty("--route-shiny-spread", palette.spread)
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
  const migratedDefault = !migrationApplied && parsed === 1
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

  return (
    <HeroUIProvider navigate={(path) => router.push(path.toString())}>
      {children}
    </HeroUIProvider>
  )
}
