export type AgendaTipo = "lembrete" | "reuniao" | "tarefa" | "comunicado"
export type AgendaStatus = "agendado" | "concluido" | "cancelado"
export type AgendaPrioridade = "baixa" | "media" | "alta"
export type AgendaDestino = "pessoal" | "equipe" | "operadores" | "individual"

export type AgendaEvento = {
  id: string
  titulo: string
  descricao: string | null
  tipo: AgendaTipo
  status: AgendaStatus
  prioridade: AgendaPrioridade
  inicio_em: string
  fim_em: string | null
  dia_inteiro: boolean
  local: string | null
  precatorio_id: string | null
  criado_por: string
  destino: AgendaDestino
  destinatario_usuario_id: string | null
  enviar_alerta: boolean
  alerta_antecedencia_min: number
  alerta_disparado_em: string | null
  disparar_como_comunicado: boolean
  comunicado_titulo: string | null
  comunicado_mensagem: string | null
  comunicado_publicado_id: string | null
  created_at: string
  updated_at: string
}

export type AgendaUsuario = {
  id: string
  nome: string
  email: string | null
  role: string[]
}

export type AgendaPrecatorioRef = {
  id: string
  titulo: string | null
  numero_precatorio: string | null
  credor_nome: string | null
}

export const AGENDA_TIPO_OPTIONS: Array<{ key: AgendaTipo; label: string }> = [
  { key: "lembrete", label: "Lembrete" },
  { key: "reuniao", label: "Reuniao" },
  { key: "tarefa", label: "Tarefa" },
  { key: "comunicado", label: "Comunicado" },
]

export const AGENDA_STATUS_OPTIONS: Array<{ key: AgendaStatus; label: string }> = [
  { key: "agendado", label: "Agendado" },
  { key: "concluido", label: "Concluido" },
  { key: "cancelado", label: "Cancelado" },
]

export const AGENDA_PRIORIDADE_OPTIONS: Array<{ key: AgendaPrioridade; label: string }> = [
  { key: "baixa", label: "Baixa" },
  { key: "media", label: "Media" },
  { key: "alta", label: "Alta" },
]

export const AGENDA_DESTINO_OPTIONS: Array<{ key: AgendaDestino; label: string }> = [
  { key: "pessoal", label: "Pessoal" },
  { key: "equipe", label: "Equipe inteira" },
  { key: "operadores", label: "Somente operadores" },
  { key: "individual", label: "Individual" },
]

export const AGENDA_STATUS_LABELS: Record<AgendaStatus, string> = {
  agendado: "Agendado",
  concluido: "Concluido",
  cancelado: "Cancelado",
}

export const AGENDA_TIPO_LABELS: Record<AgendaTipo, string> = {
  lembrete: "Lembrete",
  reuniao: "Reuniao",
  tarefa: "Tarefa",
  comunicado: "Comunicado",
}

export const AGENDA_DESTINO_LABELS: Record<AgendaDestino, string> = {
  pessoal: "Pessoal",
  equipe: "Equipe",
  operadores: "Operadores",
  individual: "Individual",
}

export const AGENDA_PRIORIDADE_LABELS: Record<AgendaPrioridade, string> = {
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
}
