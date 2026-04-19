"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { SessionLockModal } from "@/components/telemetry/session-lock-modal"

type TelemetryEventType =
  | "session_started"
  | "activity_ping"
  | "idle_started"
  | "idle_ended"
  | "window_blurred"
  | "window_focused"
  | "window_hidden"
  | "window_visible"
  | "window_minimized"
  | "window_restored"
  | "session_locked"
  | "session_unlocked"
  | "reauth_failed"
  | "session_ended"

type TelemetrySource = "web"
type LockReason = "idle_timeout" | null
type TelemetryEventContext = {
  userId?: string | null
  sessionId?: string | null
}

interface TelemetryContextValue {
  locked: boolean
  lockReason: LockReason
  unlockLoading: boolean
  unlockError: string | null
  unlock: (password: string) => Promise<boolean>
}

const TelemetryContext = createContext<TelemetryContextValue | undefined>(undefined)

const IDLE_EVENT_THRESHOLD_MS = 15 * 60 * 1000 // 15 min
const LOCK_AFTER_IDLE_MS = 20 * 60 * 1000 // 20 min
const ACTIVITY_PING_INTERVAL_MS = 15_000 // 15s for more frequent pings during testing
const CHECK_INTERVAL_MS = 5_000
const MOUSEMOVE_SAMPLE_MS = 5_000

function generateSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16)
    const value = char === "x" ? rand : (rand & 0x3) | 0x8
    return value.toString(16)
  })
}

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const supabase = createBrowserClient()
  const { user, reAuthenticate, signOut } = useAuth()

  const [locked, setLocked] = useState(false)
  const [lockReason, setLockReason] = useState<LockReason>(null)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)

  const sessionIdRef = useRef<string>(generateSessionId())
  const lastActivityAtRef = useRef<number>(Date.now())
  const lastPingAtRef = useRef<number>(0)
  const idleRef = useRef(false)
  const lockedRef = useRef(false)
  const visibleRef = useRef(true)
  const lastMouseMoveAtRef = useRef(0)
  const telemetryWriteEnabledRef = useRef(true)
  const telemetryDisabledLoggedRef = useRef(false)
  const endedSessionIdsRef = useRef<Set<string>>(new Set())

  const recordEvent = useCallback(
    async (
      eventType: TelemetryEventType,
      eventData: Record<string, unknown> = {},
      source: TelemetrySource = "web",
      context: TelemetryEventContext = {}
    ) => {
      const userId = context.userId ?? user?.id
      const sessionId = context.sessionId ?? sessionIdRef.current

      if (!supabase || !userId || !sessionId || !telemetryWriteEnabledRef.current) return

      const { error } = await supabase.from("telemetria_uso").insert({
        user_id: userId,
        session_id: sessionId,
        event_type: eventType,
        source,
        event_data: eventData,
        occurred_at: new Date().toISOString(),
      })

      if (error) {
        const missingTable = error.code === "42P01" || /telemetria_uso/i.test(error.message ?? "")
        if (missingTable) {
          telemetryWriteEnabledRef.current = false
          if (!telemetryDisabledLoggedRef.current) {
            console.warn("[telemetria] Tabela telemetria_uso não encontrada. Envio de telemetria desativado.")
            telemetryDisabledLoggedRef.current = true
          }
          return
        }
        console.warn("[telemetria] Falha ao registrar evento:", error.message)
      }
    },
    [supabase, user?.id]
  )

  const markActivity = useCallback(
    (origin: string, forcePing = false) => {
      if (!user?.id || lockedRef.current) return

      const now = Date.now()
      const idleForMs = now - lastActivityAtRef.current

      if (idleForMs >= LOCK_AFTER_IDLE_MS) {
        lockedRef.current = true
        setLocked(true)
        setLockReason("idle_timeout")
        setUnlockError(null)

        void recordEvent("session_locked", {
          reason: "idle_timeout",
          idle_for_seconds: Math.round(idleForMs / 1000),
          origin,
        })
        return
      }

      lastActivityAtRef.current = now

      if (idleRef.current) {
        idleRef.current = false
        void recordEvent("idle_ended", { origin })
      }

      if (forcePing || now - lastPingAtRef.current >= ACTIVITY_PING_INTERVAL_MS) {
        lastPingAtRef.current = now
        void recordEvent("activity_ping", { origin })
      }
    },
    [recordEvent, user?.id]
  )

  const lockSession = useCallback(
    (idleForMs: number) => {
      if (lockedRef.current) return

      lockedRef.current = true
      setLocked(true)
      setLockReason("idle_timeout")
      setUnlockError(null)

      void recordEvent("session_locked", {
        reason: "idle_timeout",
        idle_for_seconds: Math.round(idleForMs / 1000),
      })
    },
    [recordEvent]
  )

  const unlock = useCallback(
    async (password: string) => {
      if (!password.trim()) {
        setUnlockError("Informe sua senha para desbloquear.")
        return false
      }

      setUnlockLoading(true)
      setUnlockError(null)

      try {
        await reAuthenticate(password.trim())

        lockedRef.current = false
        idleRef.current = false
        setLocked(false)
        setLockReason(null)

        lastActivityAtRef.current = Date.now()
        lastPingAtRef.current = 0

        markActivity("session_unlock", true)
        void recordEvent("session_unlocked", { method: "password" })

        return true
      } catch {
        setUnlockError("Senha inválida. Tente novamente.")
        void recordEvent("reauth_failed", { reason: "invalid_password" })
        return false
      } finally {
        setUnlockLoading(false)
      }
    },
    [markActivity, reAuthenticate, recordEvent]
  )

  const endSession = useCallback(
    async ({
      reason,
      userId,
      sessionId,
    }: {
      reason: string
      userId?: string | null
      sessionId?: string | null
    }) => {
      const currentUserId = userId ?? user?.id
      const currentSessionId = sessionId ?? sessionIdRef.current
      if (!currentUserId || !currentSessionId) return
      if (endedSessionIdsRef.current.has(currentSessionId)) return

      endedSessionIdsRef.current.add(currentSessionId)
      await recordEvent(
        "session_ended",
        {
          reason,
          path: typeof window !== "undefined" ? window.location.pathname : "unknown",
        },
        "web",
        { userId: currentUserId, sessionId: currentSessionId }
      )
    },
    [recordEvent, user?.id]
  )

  const handleSignOut = useCallback(async () => {
    await endSession({ reason: "manual_signout" })
    await signOut()
  }, [endSession, signOut])

  useEffect(() => {
    if (!user?.id) {
      endedSessionIdsRef.current.clear()
      lockedRef.current = false
      idleRef.current = false
      visibleRef.current = true
      setLocked(false)
      setLockReason(null)
      setUnlockError(null)
      return
    }

    const newSessionId = generateSessionId()
    endedSessionIdsRef.current.clear()
    sessionIdRef.current = newSessionId
    lastActivityAtRef.current = Date.now()
    lastPingAtRef.current = 0
    idleRef.current = false
    lockedRef.current = false
    visibleRef.current = typeof document !== "undefined" ? document.visibilityState !== "hidden" : true
    setLocked(false)
    setLockReason(null)
    setUnlockError(null)

    void recordEvent(
      "session_started",
      {
        path: typeof window !== "undefined" ? window.location.pathname : "unknown",
      },
      "web",
      { userId: user.id, sessionId: newSessionId }
    )

    markActivity("session_start", true)

    return () => {
      void endSession({
        reason: "auth_state_changed_or_unmount",
        userId: user.id,
        sessionId: newSessionId,
      })
    }
  }, [endSession, markActivity, recordEvent, user?.id])

  useEffect(() => {
    if (!user?.id) return

    const currentUserId = user.id
    const currentSessionId = sessionIdRef.current

    const onPageLeave = () => {
      void endSession({
        reason: "page_unload",
        userId: currentUserId,
        sessionId: currentSessionId,
      })
    }

    window.addEventListener("pagehide", onPageLeave)
    window.addEventListener("beforeunload", onPageLeave)

    return () => {
      window.removeEventListener("pagehide", onPageLeave)
      window.removeEventListener("beforeunload", onPageLeave)
    }
  }, [endSession, user?.id])

  useEffect(() => {
    if (!user?.id) return

    const timer = window.setInterval(() => {
      if (lockedRef.current) return

      const now = Date.now()
      const idleForMs = now - lastActivityAtRef.current

      if (!idleRef.current && idleForMs >= IDLE_EVENT_THRESHOLD_MS) {
        idleRef.current = true
        void recordEvent("idle_started", {
          idle_for_seconds: Math.round(idleForMs / 1000),
        })
      }

      if (idleForMs >= LOCK_AFTER_IDLE_MS) {
        lockSession(idleForMs)
      }
    }, CHECK_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [lockSession, recordEvent, user?.id])

  useEffect(() => {
    if (!user?.id) return

    const emitWindowVisibility = (
      visible: boolean,
      origin: string,
      source: TelemetrySource = "web"
    ) => {
      if (visibleRef.current === visible) return
      visibleRef.current = visible

      if (!visible) {
        void recordEvent("window_hidden", { origin }, source)
        return
      }

      void recordEvent("window_visible", { origin }, source)
      markActivity("window_visible", true)
    }

    const onActivity = (event: Event) => {
      if (event.type === "mousemove") {
        const now = Date.now()
        if (now - lastMouseMoveAtRef.current < MOUSEMOVE_SAMPLE_MS) return
        lastMouseMoveAtRef.current = now
      }

      markActivity(event.type)
    }

    const onVisibilityChange = () => {
      const visible = document.visibilityState !== "hidden"
      emitWindowVisibility(visible, "visibilitychange")
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "wheel",
      "touchstart",
      "mousemove",
    ]

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, onActivity, { passive: true })
    }

    document.addEventListener("visibilitychange", onVisibilityChange)

    const onWindowBlur = () => {
      void recordEvent("window_blurred", { origin: "window_blur" })
    }

    const onWindowFocus = () => {
      void recordEvent("window_focused", { origin: "window_focus" })
      markActivity("window_focus", true)
    }

    window.addEventListener("blur", onWindowBlur)
    window.addEventListener("focus", onWindowFocus)

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, onActivity)
      }

      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("blur", onWindowBlur)
      window.removeEventListener("focus", onWindowFocus)
    }
  }, [markActivity, recordEvent, user?.id])

  const contextValue = useMemo(
    () => ({
      locked,
      lockReason,
      unlockLoading,
      unlockError,
      unlock,
    }),
    [lockReason, locked, unlock, unlockError, unlockLoading]
  )

  return (
    <TelemetryContext.Provider value={contextValue}>
      {children}
      <SessionLockModal
        open={Boolean(user && locked)}
        loading={unlockLoading}
        error={unlockError}
        reason={lockReason}
        onUnlock={unlock}
        onSignOut={handleSignOut}
      />
    </TelemetryContext.Provider>
  )
}

export function useTelemetry() {
  const context = useContext(TelemetryContext)

  if (!context) {
    throw new Error("useTelemetry deve ser usado dentro de TelemetryProvider")
  }

  return context
}
