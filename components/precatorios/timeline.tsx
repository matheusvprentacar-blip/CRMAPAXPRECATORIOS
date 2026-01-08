"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { TimelineEvent } from "@/lib/types/database"
import { TimelineEventItem } from "./timeline-event"
import { Loader2 } from "lucide-react"

interface TimelineProps {
  precatorioId: string
  maxItems?: number
}

export function Timeline({ precatorioId, maxItems }: TimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    loadTimeline()
  }, [precatorioId])

  async function loadTimeline() {
    try {
      setLoading(true)

      if (!supabase) {
        console.error("[Timeline] Supabase não inicializado")
        return
      }

      let query = supabase
        .from("timeline_precatorios")
        .select("*")
        .eq("precatorio_id", precatorioId)
        .order("created_at", { ascending: false })

      if (maxItems) {
        query = query.limit(maxItems)
      }

      const { data, error } = await query

      if (error) throw error

      setEvents(data || [])
    } catch (error) {
      console.error("[Timeline] Erro ao carregar:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando histórico...</span>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Nenhum evento registrado ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Linha do Tempo</h3>
        <span className="text-sm text-muted-foreground">{events.length} eventos</span>
      </div>

      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        {/* Eventos */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <TimelineEventItem key={event.id} event={event} isLast={index === events.length - 1} />
          ))}
        </div>
      </div>

      {maxItems && events.length >= maxItems && (
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando os {maxItems} eventos mais recentes
          </p>
        </div>
      )}
    </div>
  )
}
