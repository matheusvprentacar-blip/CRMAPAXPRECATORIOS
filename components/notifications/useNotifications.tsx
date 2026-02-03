"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type SupabaseClient = NonNullable<ReturnType<typeof createBrowserClient>>
type SupabaseChannel = ReturnType<SupabaseClient["channel"]>

export type NotificationKind = "info" | "warn" | "critical" | string

export interface NotificationRow {
  id: string
  user_id: string
  title: string
  body: string
  kind: NotificationKind
  link_url: string | null
  entity_type: string | null
  entity_id: string | null
  event_type: string | null
  read_at: string | null
  created_at: string
}

interface NotificationsContextValue {
  notifications: NotificationRow[]
  loading: boolean
  unreadCount: number
  modalOpen: boolean
  setModalOpen: (open: boolean) => void
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  openNotification: (notification: NotificationRow) => Promise<void>
  reload: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

const PAGE_SIZE = 50

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const supabase = createBrowserClient()
  const { user } = useAuth()
  const router = useRouter()

  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)

  const channelRef = useRef<SupabaseChannel | null>(null)
  const userRef = useRef<string | null>(null)
  const pendingDesktopRef = useRef<{ notification: NotificationRow; ts: number } | null>(null)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  )

  const setNewList = useCallback((items: NotificationRow[]) => {
    setNotifications(items)
    setCursor(items.length > 0 ? items[items.length - 1].created_at : null)
    setHasMore(items.length === PAGE_SIZE)
  }, [])

  const loadInitial = useCallback(async () => {
    if (!supabase || !user?.id) {
      setNotifications([])
      setCursor(null)
      setHasMore(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE)

    if (error) {
      console.error("Erro ao carregar notificacoes:", error)
      toast("Erro ao carregar notificacoes", {
        description: "Nao foi possivel buscar suas notificacoes.",
      })
      setLoading(false)
      return
    }

    setNewList((data ?? []) as NotificationRow[])
    setLoading(false)
  }, [supabase, user?.id, setNewList])

  const loadMore = useCallback(async () => {
    if (!supabase || !user?.id || !cursor) return

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE)

    if (error) {
      console.error("Erro ao carregar mais notificacoes:", error)
      toast("Erro ao carregar mais", {
        description: "Nao foi possivel carregar mais notificacoes.",
      })
      return
    }

    const incoming = (data ?? []) as NotificationRow[]
    if (incoming.length === 0) {
      setHasMore(false)
      return
    }

    setNotifications((prev) => {
      const existing = new Set(prev.map((n) => n.id))
      const merged = [...prev, ...incoming.filter((n) => !existing.has(n.id))]
      return merged
    })

    setCursor(incoming[incoming.length - 1]?.created_at ?? cursor)
    setHasMore(incoming.length === PAGE_SIZE)
  }, [supabase, user?.id, cursor])

  const upsertNotification = useCallback((row: NotificationRow) => {
    setNotifications((prev) => {
      const index = prev.findIndex((item) => item.id === row.id)
      if (index === -1) {
        return [row, ...prev]
      }
      const next = [...prev]
      next[index] = { ...next[index], ...row }
      return next
    })
  }, [])

  const markAsRead = useCallback(
    async (id: string) => {
      if (!supabase || !user?.id) return
      const now = new Date().toISOString()
      await supabase.from("notifications").update({ read_at: now }).eq("id", id)
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read_at: now } : item))
      )
    },
    [supabase, user?.id]
  )

  const markAllAsRead = useCallback(async () => {
    if (!supabase || !user?.id) return
    const now = new Date().toISOString()
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null)

    setNotifications((prev) => prev.map((item) => ({ ...item, read_at: item.read_at ?? now })))
  }, [supabase, user?.id])

  const resolveTarget = useCallback((notification: NotificationRow) => {
    if (notification.link_url) return notification.link_url
    if (notification.entity_type === "precatorio" && notification.entity_id) {
      return `/precatorios/detalhes?id=${notification.entity_id}`
    }
    return null
  }, [])

  const openNotification = useCallback(
    async (notification: NotificationRow) => {
      const target = resolveTarget(notification)
      if (target) {
        router.push(target)
      } else {
        toast("Nao foi possivel abrir", {
          description: "Link indisponivel para esta notificacao.",
        })
      }
      await markAsRead(notification.id)
      setModalOpen(false)
    },
    [markAsRead, resolveTarget, router]
  )

  const sendDesktopNotification = useCallback(
    async (notification: NotificationRow) => {
      if (typeof window === "undefined") return

      const isTauri = "__TAURI_INTERNALS__" in window || "__TAURI__" in window
      if (isTauri) {
        pendingDesktopRef.current = { notification, ts: Date.now() }
      }

      if (isTauri) {
        try {
          const { isPermissionGranted, requestPermission, sendNotification } = await import(
            "@tauri-apps/plugin-notification"
          )

          let granted = await isPermissionGranted()
          if (!granted) {
            const permission = await requestPermission()
            granted = permission === "granted"
          }

          if (granted) {
            sendNotification({
              title: notification.title,
              body: notification.body,
            })
            return
          }
        } catch (error) {
          console.warn("Tauri notification failed:", error)
        }
      }

      if ("Notification" in window) {
        try {
          if (Notification.permission === "granted") {
            const browserNotification = new Notification(notification.title, {
              body: notification.body,
            })
            browserNotification.onclick = () => {
              window.focus()
              void openNotification(notification)
            }
            return
          }

          if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission()
            if (permission === "granted") {
              const browserNotification = new Notification(notification.title, {
                body: notification.body,
              })
              browserNotification.onclick = () => {
                window.focus()
                void openNotification(notification)
              }
              return
            }
          }
        } catch (error) {
          console.warn("Browser notification failed:", error)
        }
      }

      toast(notification.title, {
        description: notification.body,
      })
    },
    [openNotification]
  )

  useEffect(() => {
    if (!supabase || !user?.id) return

    void loadInitial()

    if (channelRef.current && userRef.current === user.id) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      userRef.current = null
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as NotificationRow
          upsertNotification(notification)
          void sendDesktopNotification(notification)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as NotificationRow
          upsertNotification(notification)
        }
      )
      .subscribe()

    channelRef.current = channel
    userRef.current = user.id

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        userRef.current = null
      }
    }
  }, [supabase, user?.id, loadInitial, sendDesktopNotification, upsertNotification])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleFocus = () => {
      const pending = pendingDesktopRef.current
      if (!pending) return

      if (Date.now() - pending.ts > 60000) {
        pendingDesktopRef.current = null
        return
      }

      if (pending.notification.link_url) {
        router.push(pending.notification.link_url)
        void markAsRead(pending.notification.id)
      } else {
        setModalOpen(true)
      }

      pendingDesktopRef.current = null
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [markAsRead, router])

  const value = useMemo(
    () => ({
      notifications,
      loading,
      unreadCount,
      modalOpen,
      setModalOpen,
      markAsRead,
      markAllAsRead,
      openNotification,
      reload: loadInitial,
      loadMore,
      hasMore,
    }),
    [
      notifications,
      loading,
      unreadCount,
      modalOpen,
      markAsRead,
      markAllAsRead,
      openNotification,
      loadInitial,
      loadMore,
      hasMore,
    ]
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error("useNotifications deve ser usado dentro de NotificationsProvider")
  }
  return context
}
