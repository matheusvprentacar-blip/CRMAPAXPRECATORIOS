"use client"

import { AlertTriangle, Bell, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { NotificationRow } from "@/components/notifications/useNotifications"
import { useNotifications } from "@/components/notifications/useNotifications"

const kindStyles: Record<string, { icon: typeof Bell; badge: string; ring: string }> = {
  info: { icon: Bell, badge: "bg-primary/15 text-primary border-primary/30", ring: "ring-primary/20" },
  warn: { icon: AlertTriangle, badge: "bg-amber-500/15 text-amber-500 border-amber-500/30", ring: "ring-amber-500/20" },
  critical: { icon: ShieldAlert, badge: "bg-rose-500/15 text-rose-500 border-rose-500/30", ring: "ring-rose-500/20" },
}

export function NotificationItem({ notification }: { notification: NotificationRow }) {
  const { markAsRead, openNotification } = useNotifications()

  const isUnread = !notification.read_at
  const style = kindStyles[notification.kind] ?? kindStyles.info
  const Icon = style.icon
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openNotification(notification)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          void openNotification(notification)
        }
      }}
      className={cn(
        "group rounded-xl border border-border/60 bg-card p-4 transition hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        isUnread && "border-primary/30 ring-1 ring-primary/15"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border", style.badge)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">{notification.title}</h4>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {notification.event_type && (
              <Badge variant="outline" className="text-[10px]">
                {notification.event_type}
              </Badge>
            )}
            {!notification.read_at && (
              <Badge className={cn("text-[10px] border", style.badge)}>Nova</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {isUnread && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs"
            onClick={(event) => {
              event.stopPropagation()
              void markAsRead(notification.id)
            }}
          >
            Marcar como lida
          </Button>
        )}
        <Button
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={(event) => {
            event.stopPropagation()
            void openNotification(notification)
          }}
        >
          Abrir
        </Button>
      </div>
    </div>
  )
}
