"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { usePathname } from "next/navigation"
import { MOTION } from "@/lib/motion"

const ROUTE_LINE_DURATION_MS = 650
const ROUTE_LINE_DURATION_REDUCED_MS = 140
const UI_ZOOM_STORAGE_KEY = "ui_zoom"
const UI_ZOOM_MIGRATION_KEY = "ui_zoom_default_80_applied"
const DEFAULT_UI_ZOOM = 0.8
const UI_ZOOM_MIN = 0.65
const UI_ZOOM_MAX = 1.15

const clampZoom = (value: number) => Math.min(UI_ZOOM_MAX, Math.max(UI_ZOOM_MIN, value))

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
  const reduce = useReducedMotion()
  const [showRouteLine, setShowRouteLine] = useState(false)
  const [lineCycle, setLineCycle] = useState(0)

  useEffect(() => {
    setShowRouteLine(true)
    setLineCycle((prev) => prev + 1)

    const timeout = window.setTimeout(
      () => setShowRouteLine(false),
      reduce ? ROUTE_LINE_DURATION_REDUCED_MS : ROUTE_LINE_DURATION_MS
    )

    return () => window.clearTimeout(timeout)
  }, [pathname, reduce])

  useEffect(() => {
    applyUiZoom(readSanitizedZoom())
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
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={reduce ? { opacity: 1 } : MOTION.page.initial}
          animate={reduce ? { opacity: 1 } : MOTION.page.animate}
          exit={reduce ? { opacity: 1 } : MOTION.page.exit}
          transition={{ duration: MOTION.dur.page, ease: MOTION.ease }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showRouteLine ? (
          <motion.div
            key={`route-line-${lineCycle}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.08 : 0.2 }}
            className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[2px] overflow-hidden"
          >
            {reduce ? (
              <div className="h-full w-full bg-primary/55" />
            ) : (
              <motion.div
                className="h-full w-1/3 rounded-r-full bg-gradient-to-r from-transparent via-primary to-orange-400"
                initial={{ x: "-35%" }}
                animate={{ x: ["-35%", "135%"] }}
                transition={{
                  duration: 0.9,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
