import type {
  LegalOpinion,
  LegalOpinionEvent,
  LegalOpinionStatus,
} from "@/features/legal-opinion/types"
import {
  LEGAL_OPINION_PRIORITY_LABELS,
  LEGAL_OPINION_STATUS_LABELS,
  LEGAL_OPINION_TYPE_LABELS,
} from "@/features/legal-opinion/types"

export const legalOpinionEventLabels: Record<string, string> = {
  created: "Parecer criado",
  updated: "Parecer atualizado",
  status_changed: "Status alterado",
  comment_added: "Comentario adicionado",
  attachment_added: "Anexo adicionado",
  attachment_removed: "Anexo removido",
  assigned: "Responsavel atribuido",
  archived: "Parecer arquivado",
}

export function formatDate(date?: string | null) {
  if (!date) return "-"
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleDateString("pt-BR")
}

export function formatDateTime(date?: string | null) {
  if (!date) return "-"
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return "-"
  return parsed.toLocaleString("pt-BR")
}

export function formatBytes(value: number) {
  if (!value || value <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const size = value / 1024 ** unit
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

export function getOpinionTitle(opinion: Pick<LegalOpinion, "title" | "type">) {
  const typeLabel = LEGAL_OPINION_TYPE_LABELS[opinion.type]
  return opinion.title || typeLabel
}

export function getOpinionSubtitle(opinion: LegalOpinion) {
  const typeLabel = LEGAL_OPINION_TYPE_LABELS[opinion.type]
  const priorityLabel = LEGAL_OPINION_PRIORITY_LABELS[opinion.priority]
  return `${typeLabel} • ${priorityLabel}`
}

export function getStatusLabel(status: LegalOpinionStatus) {
  return LEGAL_OPINION_STATUS_LABELS[status]
}

export function getEventLabel(event: LegalOpinionEvent) {
  return legalOpinionEventLabels[event.event_type] || event.event_type
}

export function countOpinionsByStatus(opinions: LegalOpinion[]) {
  const counters: Record<LegalOpinionStatus, number> = {
    pendente: 0,
    em_analise: 0,
    concluido: 0,
    rejeitado: 0,
    arquivado: 0,
  }

  for (const opinion of opinions) {
    counters[opinion.status] += 1
  }

  return counters
}

