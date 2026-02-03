"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  NotificationItem,
  getNotificationSubtitle,
  getNotificationTarget,
  getNotificationTitle,
  getNotificationStatus,
  getStatusLabel,
  getStatusTone,
} from "@/lib/utils/notifications"

export default function NotificacoesPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    loadNotifications()
  }, [profile?.id])

  async function loadNotifications() {
    if (!profile?.id) return
    const supabase = getSupabase()
    if (!supabase) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("notificacoes")
        .select("id, usuario_id, precatorio_id, tipo, mensagem, lida, created_at, precatorio_nome, precatorio_status")
        .eq("usuario_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(200)

      if (error) {
        console.error("Erro ao carregar notificacoes:", error)
        return
      }

      const notificationsData = (data ?? []) as NotificationItem[]
      const precatorioIds = notificationsData
        .map((n) => n.precatorio_id)
        .filter((id): id is string => Boolean(id))

      if (precatorioIds.length > 0) {
        const { data: precData, error: precError } = await supabase
          .from("precatorios")
          .select("id, titulo, numero_precatorio, credor_nome, status_kanban, localizacao_kanban, status")
          .in("id", precatorioIds)

        if (precError) {
          console.error("Erro ao carregar precatorios das notificacoes:", precError)
        }

        const precatorioAccessIds = new Set((precData ?? []).map((prec) => prec.id))
        const precatorioMap = new Map((precData ?? []).map((prec) => [prec.id, prec]))

        setNotifications(
          notificationsData.map((n) => ({
            ...n,
            precatorio: n.precatorio_id ? precatorioMap.get(n.precatorio_id) ?? null : null,
            precatorio_access: n.precatorio_id ? precatorioAccessIds.has(n.precatorio_id) : false,
          }))
        )
      } else {
        setNotifications(
          notificationsData.map((n) => ({
            ...n,
            precatorio_access: false,
          }))
        )
      }
    } finally {
      setLoading(false)
    }
  }

  async function markAllNotificationsRead() {
    if (!profile?.id) return
    if (notifications.every((n) => n.lida)) return

    const supabase = getSupabase()
    if (!supabase) return

    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("usuario_id", profile.id)
      .eq("lida", false)

    if (error) {
      console.error("Erro ao marcar notificacoes:", error)
      return
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  async function markNotificationRead(id: string) {
    const supabase = getSupabase()
    if (!supabase) return

    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("id", id)

    if (error) {
      console.error("Erro ao marcar notificacao:", error)
      return
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
  }

  const handleNotificationClick = async (notification: NotificationItem) => {
    await markNotificationRead(notification.id)
    const target = getNotificationTarget(notification)
    if (target) router.push(target)
  }

  const unreadCount = notifications.filter((n) => !n.lida).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificações</h1>
          <p className="text-sm text-muted-foreground">Acompanhe os últimos alertas e atualizações.</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} não lida{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={markAllNotificationsRead} disabled={unreadCount === 0}>
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Todas as notificações</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando notificações...
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma notificação encontrada.</div>
          )}

          {!loading && notifications.length > 0 && (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const status = getNotificationStatus(notification)
                const statusLabel = getStatusLabel(status)
                const statusTone = getStatusTone(status)
                const subtitle = getNotificationSubtitle(notification)

                return (
                  <button
                    key={notification.id}
                    className={cn(
                      "w-full text-left rounded-xl border border-border/60 px-4 py-3 transition hover:bg-muted/50",
                      !notification.lida && "bg-primary/5 border-primary/20"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-2 h-2 w-2 rounded-full",
                          notification.lida ? "bg-muted-foreground/30" : "bg-primary"
                        )}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {getNotificationTitle(notification)}
                          </p>
                          {statusLabel && (
                            <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${statusTone}`}>
                              {statusLabel}
                            </Badge>
                          )}
                        </div>
                        {subtitle && (
                          <p className="text-xs text-muted-foreground">
                            {subtitle}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
