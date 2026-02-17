"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const CHUNK_RELOAD_GUARD_KEY = "__chunk_reload_once__"

const isChunkErrorMessage = (message: string) =>
  /ChunkLoadError|Loading chunk .* failed|Failed to load chunk .* from module|Cannot find module '.*\.js'/i.test(message)

const readErrorMessage = (value: unknown) => {
  if (typeof value === "string") return value
  if (value instanceof Error) return `${value.message}\n${value.stack || ""}`
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message
    return typeof message === "string" ? message : ""
  }
  if (value && typeof value === "object" && "cause" in value) {
    const causeMessage = readErrorMessage((value as { cause?: unknown }).cause)
    if (causeMessage) return causeMessage
  }
  if (value !== null && value !== undefined) return String(value)
  return ""
}

const reloadWithCacheBust = () => {
  const url = new URL(window.location.href)
  url.searchParams.set("_chunk_reload", String(Date.now()))
  window.location.replace(url.toString())
}

export function ChunkErrorRecovery() {
  const pathname = usePathname()

  useEffect(() => {
    const onError = (message: string) => {
      if (!isChunkErrorMessage(message)) return

      const alreadyRetried = window.sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === "1"
      if (alreadyRetried) return

      window.sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, "1")

      if ("caches" in window) {
        window.caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
          .finally(reloadWithCacheBust)
        return
      }

      reloadWithCacheBust()
    }

    const handleError = (event: ErrorEvent) => {
      const message = event.message || readErrorMessage(event.error)
      onError(message)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = readErrorMessage(event.reason)
      onError(message)
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    window.sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY)
  }, [pathname])

  return null
}
