"use client"

import type { TimelineEvent } from "@/lib/types/database"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  FileText,
  ListChecks,
  Calculator,
  AlertTriangle,
  PlayCircle,
  CheckCircle,
  ArrowRightLeft,
  MessageSquare,
  Circle,
  Clock,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TimelineEventItemProps {
  event: TimelineEvent
  isLast?: boolean
}

export function TimelineEventItem({ event, isLast = false }: TimelineEventItemProps) {
  const eventConfig = {
    criacao: {
      icon: FileText,
      color: "bg-blue-500",
      label: "Criação",
    },
    inclusao_fila: {
      icon: ListChecks,
      color: "bg-purple-500",
      label: "Inclusão na Fila",
    },
    inicio_calculo: {
      icon: Calculator,
      color: "bg-green-500",
      label: "Início do Cálculo",
    },
    atraso: {
      icon: AlertTriangle,
      color: "bg-orange-500",
      label: "Atraso Reportado",
    },
    atraso_removido: {
      icon: CheckCircle,
      color: "bg-green-500",
      label: "Atraso Removido",
    },
    retomada: {
      icon: PlayCircle,
      color: "bg-cyan-500",
      label: "Retomada",
    },
    finalizacao: {
      icon: CheckCircle,
      color: "bg-emerald-500",
      label: "Finalização",
    },
    mudanca_status: {
      icon: ArrowRightLeft,
      color: "bg-indigo-500",
      label: "Mudança de Status",
    },
    mudanca_sla: {
      icon: Clock,
      color: "bg-yellow-500",
      label: "Atualização de SLA",
    },
    comentario: {
      icon: MessageSquare,
      color: "bg-gray-500",
      label: "Comentário",
    },
  }

  const config = eventConfig[event.tipo] || {
    icon: Circle,
    color: "bg-gray-500",
    label: event.tipo,
  }

  const Icon = config.icon

  // Formatar data
  const timeAgo = formatDistanceToNow(new Date(event.created_at), {
    addSuffix: true,
    locale: ptBR,
  })

  const formattedDate = new Date(event.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="relative pl-12">
      {/* Ícone do evento */}
      <div className={`absolute left-0 top-0 w-8 h-8 rounded-full ${config.color} flex items-center justify-center z-10`}>
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Card do evento */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Tipo e descrição */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
              <span className="text-sm text-muted-foreground">{timeAgo}</span>
            </div>

            <p className="text-sm font-medium">{event.descricao}</p>

            {/* Usuário responsável */}
            {event.usuario_nome && (
              <p className="text-xs text-muted-foreground">
                por <span className="font-medium">{event.usuario_nome}</span>
              </p>
            )}

            {/* Dados adicionais */}
            {event.dados_novos && Object.keys(event.dados_novos).length > 0 && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs font-medium mb-2">Detalhes:</p>
                <div className="space-y-1">
                  {Object.entries(event.dados_novos).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-muted-foreground">{formatKey(key)}:</span>{" "}
                      <span className="font-medium">{formatValue(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Data formatada */}
          <div className="text-xs text-muted-foreground whitespace-nowrap">{formattedDate}</div>
        </div>
      </Card>
    </div>
  )
}

// Helper para formatar chaves
function formatKey(key: string): string {
  const labels: Record<string, string> = {
    tipo_atraso: "Tipo",
    impacto_atraso: "Impacto",
    motivo: "Motivo",
    status_anterior: "Status Anterior",
    status_novo: "Status Novo",
    titulo: "Título",
    valor_atualizado: "Valor",
    credor_nome: "Credor",
    sla_status_anterior: "SLA Anterior",
    sla_status_novo: "SLA Novo",
    sla_horas: "Prazo (horas)",
    data_entrada_calculo: "Data de Entrada",
  }
  return labels[key] || key
}

// Helper para formatar valores
function formatValue(value: any): string {
  if (value === null || value === undefined) return "-"
  if (typeof value === "boolean") return value ? "Sim" : "Não"
  if (typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }
  
  // Formatar status de SLA
  const slaLabels: Record<string, string> = {
    nao_iniciado: "Não Iniciado",
    no_prazo: "No Prazo",
    atencao: "Atenção",
    atrasado: "Atrasado",
    concluido: "Concluído",
  }
  
  if (slaLabels[value]) {
    return slaLabels[value]
  }
  
  return String(value)
}
