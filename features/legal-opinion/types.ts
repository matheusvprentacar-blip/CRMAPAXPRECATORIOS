export const LEGAL_OPINION_TYPES = [
  "risco_processual",
  "calculos",
  "titularidade_cessao",
  "prioridade",
  "penhoras_bloqueios",
  "documentos_compliance",
  "estrategia",
] as const

export const LEGAL_OPINION_STATUSES = [
  "pendente",
  "em_analise",
  "concluido",
  "rejeitado",
  "arquivado",
] as const

export const LEGAL_OPINION_PRIORITIES = [
  "baixa",
  "media",
  "alta",
  "critica",
] as const

export const LEGAL_OPINION_EVENT_TYPES = [
  "created",
  "updated",
  "status_changed",
  "comment_added",
  "attachment_added",
  "attachment_removed",
  "assigned",
  "archived",
] as const

export type LegalOpinionType = (typeof LEGAL_OPINION_TYPES)[number]
export type LegalOpinionStatus = (typeof LEGAL_OPINION_STATUSES)[number]
export type LegalOpinionPriority = (typeof LEGAL_OPINION_PRIORITIES)[number]
export type LegalOpinionEventType = (typeof LEGAL_OPINION_EVENT_TYPES)[number]

export type LegalOpinionChecklist = {
  titularidade?: boolean
  calculos?: boolean
  prioridade?: boolean
  penhoras?: boolean
  documentos?: boolean
  compliance?: boolean
  [key: string]: boolean | undefined
}

export type LegalOpinionUserRef = {
  id: string
  nome: string | null
  email: string | null
}

export type LegalOpinionPrecatorioRef = {
  id: string
  numero_precatorio: string | null
  numero_processo: string | null
  credor_nome: string | null
  titulo: string | null
}

export type LegalOpinion = {
  id: string
  tenant_id: string
  precatorio_id: string
  requested_by: string
  assigned_to: string | null
  title: string
  type: LegalOpinionType
  status: LegalOpinionStatus
  priority: LegalOpinionPriority
  due_date: string | null
  executive_summary: string | null
  analysis: string | null
  recommendation: string | null
  conclusion: string | null
  checklist: LegalOpinionChecklist
  created_at: string
  updated_at: string
  requested_by_user?: LegalOpinionUserRef | null
  assigned_to_user?: LegalOpinionUserRef | null
  precatorio?: LegalOpinionPrecatorioRef | null
}

export type LegalOpinionComment = {
  id: string
  tenant_id: string
  legal_opinion_id: string
  author_id: string
  content: string
  created_at: string
  author?: LegalOpinionUserRef | null
}

export type LegalOpinionEvent = {
  id: string
  tenant_id: string
  legal_opinion_id: string
  actor_id: string | null
  event_type: LegalOpinionEventType | string
  payload: Record<string, unknown>
  created_at: string
  actor?: LegalOpinionUserRef | null
}

export type LegalOpinionAttachment = {
  id: string
  tenant_id: string
  legal_opinion_id: string
  storage_path: string
  file_name: string
  mime_type: string
  size: number
  uploaded_by: string
  created_at: string
  uploader?: LegalOpinionUserRef | null
}

export const LEGAL_OPINION_TYPE_LABELS: Record<LegalOpinionType, string> = {
  risco_processual: "Risco Processual",
  calculos: "Cálculos",
  titularidade_cessao: "Titularidade/Cessão",
  prioridade: "Prioridade",
  penhoras_bloqueios: "Penhoras/Bloqueios",
  documentos_compliance: "Documentos/Compliance",
  estrategia: "Estratégia",
}

export const LEGAL_OPINION_STATUS_LABELS: Record<LegalOpinionStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  concluido: "Concluído",
  rejeitado: "Rejeitado",
  arquivado: "Arquivado",
}

export const LEGAL_OPINION_PRIORITY_LABELS: Record<LegalOpinionPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
}

export const LEGAL_OPINION_STATUS_COLORS: Record<
  LegalOpinionStatus,
  "default" | "warning" | "success" | "danger" | "secondary"
> = {
  pendente: "warning",
  em_analise: "secondary",
  concluido: "success",
  rejeitado: "danger",
  arquivado: "default",
}

