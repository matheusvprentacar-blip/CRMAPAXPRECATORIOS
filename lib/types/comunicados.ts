export type ComunicadoScope = "operadores" | "equipe"

export const COMUNICADOS_ALERT_EVENT_TYPES = [
  "interesse_calculo_admin",
  "admin_alerta_individual_precatorio",
  "agenda_alerta",
] as const

export interface ComunicadoRow {
  id: string
  titulo: string
  mensagem_original: string
  mensagem_publicada: string
  estilo_ia?: string | null
  escopo: ComunicadoScope
  anexo_url?: string | null
  anexo_nome?: string | null
  anexo_mime?: string | null
  anexo_tamanho?: number | null
  criado_por: string
  ativo: boolean
  publicado_em: string
  created_at: string
  updated_at: string
}

export interface ComunicadoDestinatarioRow {
  id: string
  comunicado_id: string
  usuario_id: string
  enviado_em: string
  visualizado_em?: string | null
  dispensado_em?: string | null
  baixou_anexo_em?: string | null
  created_at: string
  updated_at: string
  comunicado?: ComunicadoRow
}

export interface AdminComunicadoDestinatarioRow {
  id: string
  comunicado_id: string
  usuario_id: string
  enviado_em: string
  visualizado_em?: string | null
  dispensado_em?: string | null
  baixou_anexo_em?: string | null
  usuarios?: {
    nome?: string | null
    email?: string | null
  } | null
}

export interface AdminComunicadoRow extends ComunicadoRow {
  comunicado_destinatarios?: AdminComunicadoDestinatarioRow[]
}
