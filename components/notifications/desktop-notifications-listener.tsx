"use client"

import { useEffect, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { usePathname, useSearchParams } from "next/navigation"
import { toast } from "sonner"

type SupabaseClient = NonNullable<ReturnType<typeof createBrowserClient>>
type SupabaseChannel = ReturnType<SupabaseClient["channel"]>

interface DesktopNotificationRow {
  id: string
  title: string
  body: string
  kind: string
  link_url: string | null
  entity_id: string | null
  event_type: string | null
  created_at: string
  read_at: string | null
}

export function DesktopNotificationsListener() {
  const supabase = createBrowserClient()
  const { user } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const channelRef = useRef<SupabaseChannel | null>(null)
  const userRef = useRef<string | null>(null)
  const currentUrlRef = useRef<string>("")

  useEffect(() => {
    const query = searchParams?.toString() ?? ""
    currentUrlRef.current = query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  useEffect(() => {
    if (!supabase || !user?.id) return

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
          const notification = payload.new as DesktopNotificationRow
          void handleIncoming(notification)
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
  }, [supabase, user?.id])

  async function markRead(notificationId: string) {
    if (!supabase) return
    try {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
    } catch (error) {
      console.warn("Failed to mark notification read:", error)
    }
  }

  async function handleIncoming(notification: DesktopNotificationRow) {
    if (!notification) return

    const currentUrl = currentUrlRef.current
    if (notification.link_url && currentUrl && notification.link_url === currentUrl) {
      await markRead(notification.id)
      return
    }

    await sendDesktopNotification(notification)
  }

  async function sendDesktopNotification(notification: DesktopNotificationRow) {
    if (typeof window === "undefined") return

    const isTauri = "__TAURI_INTERNALS__" in window || "__TAURI__" in window

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
            if (notification.link_url) {
              window.location.assign(notification.link_url)
            }
            void markRead(notification.id)
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
              if (notification.link_url) {
                window.location.assign(notification.link_url)
              }
              void markRead(notification.id)
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
  }

  return null
}
