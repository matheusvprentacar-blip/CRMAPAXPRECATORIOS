"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { NotificationItem } from "@/components/notifications/NotificationItem"
import { useNotifications } from "@/components/notifications/useNotifications"
import { isToday, isYesterday, differenceInCalendarDays } from "date-fns"

const daySections = ["Hoje", "Ontem", "Ultimos 7 dias", "Mais antigas"] as const

export function NotificationsModal() {
  const {
    notifications,
    loading,
    unreadCount,
    modalOpen,
    setModalOpen,
    markAllAsRead,
    loadMore,
    hasMore,
  } = useNotifications()

  const [tab, setTab] = useState("all")
  const [search, setSearch] = useState("")
  const [eventFilter, setEventFilter] = useState("all")

  const eventTypes = useMemo(() => {
    const types = new Set<string>()
    notifications.forEach((notification) => {
      if (notification.event_type) types.add(notification.event_type)
    })
    return Array.from(types.values())
  }, [notifications])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return notifications.filter((notification) => {
      if (tab === "unread" && notification.read_at) return false
      if (tab === "critical" && notification.kind !== "critical") return false
      if (eventFilter !== "all" && notification.event_type !== eventFilter) return false
      if (!query) return true
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.body.toLowerCase().includes(query)
      )
    })
  }, [notifications, tab, search, eventFilter])

  const grouped = useMemo(() => {
    const result: Record<(typeof daySections)[number], typeof filtered> = {
      Hoje: [],
      Ontem: [],
      "Ultimos 7 dias": [],
      "Mais antigas": [],
    }

    filtered.forEach((notification) => {
      const createdAt = new Date(notification.created_at)
      if (isToday(createdAt)) {
        result.Hoje.push(notification)
      } else if (isYesterday(createdAt)) {
        result.Ontem.push(notification)
      } else if (differenceInCalendarDays(new Date(), createdAt) <= 7) {
        result["Ultimos 7 dias"].push(notification)
      } else {
        result["Mais antigas"].push(notification)
      }
    })

    return result
  }, [filtered])

  async function handleMarkAll() {
    if (unreadCount === 0) return
    const confirmed = window.confirm("Deseja marcar todas como lidas?")
    if (!confirmed) return
    await markAllAsRead()
  }

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="max-w-3xl bg-background border border-border/60 shadow-2xl p-0 overflow-hidden">
        <div className="border-b border-border/60 px-6 py-5 bg-card">
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-xl font-semibold">Notificacoes</DialogTitle>
              <Badge variant="outline" className="text-xs">
                {unreadCount} nao lidas
              </Badge>
            </div>
            <DialogDescription className="sr-only">
              Central de notificacoes com filtros, prioridades e redirecionamento.
            </DialogDescription>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleMarkAll}>
                Marcar todas como lidas
              </Button>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-4 space-y-4 bg-card">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread">Nao lidas</TabsTrigger>
              <TabsTrigger value="critical">Criticas</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  placeholder="Buscar notificacoes..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="sm:w-48">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {eventTypes.map((eventType) => (
                      <SelectItem key={eventType} value={eventType}>
                        {eventType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[420px] pr-4 bg-card">
                {loading && (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Carregando notificacoes...
                  </div>
                )}

                {!loading && filtered.length === 0 && (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma notificacao encontrada.
                  </div>
                )}

                {!loading && filtered.length > 0 && (
                  <div className="space-y-6">
                    {daySections.map((section) =>
                      grouped[section].length ? (
                        <div key={section} className="space-y-3">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {section}
                          </div>
                          <div className="space-y-3">
                            {grouped[section].map((notification) => (
                              <NotificationItem key={notification.id} notification={notification} />
                            ))}
                          </div>
                        </div>
                      ) : null
                    )}

                    {hasMore && (
                      <div className="pt-2">
                        <Button variant="outline" className="w-full" onClick={loadMore}>
                          Carregar mais
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
