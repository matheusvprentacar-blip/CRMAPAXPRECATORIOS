// =====================================================
// Types para Busca e Filtros Avançados
// =====================================================

export interface FiltrosPrecatorios {
  // Busca global
  termo?: string

  // Filtros de status
  status?: string[]

  // Filtros de responsáveis
  responsavel_id?: string
  criador_id?: string

  // Filtros de complexidade e SLA
  complexidade?: ('baixa' | 'media' | 'alta')[]
  sla_status?: ('nao_iniciado' | 'no_prazo' | 'atencao' | 'atrasado' | 'concluido')[]

  // Filtros de atraso
  tipo_atraso?: TipoAtraso[]
  impacto_atraso?: ('baixo' | 'medio' | 'alto')[]

  // Filtros de datas
  data_criacao_inicio?: string
  data_criacao_fim?: string
  data_entrada_calculo_inicio?: string
  data_entrada_calculo_fim?: string

  // Filtros de valores
  valor_min?: number
  valor_max?: number

  // Flags especiais
  urgente?: boolean
  titular_falecido?: boolean
}

export type TipoAtraso =
  | 'titular_falecido'
  | 'penhora'
  | 'cessao_parcial'
  | 'doc_incompleta'
  | 'duvida_juridica'
  | 'aguardando_cliente'
  | 'outro'

export interface FiltroAtivo {
  key: string
  label: string
  value: string | string[] | number | boolean
  displayValue: string
}

export interface ResultadoBusca {
  total: number
  resultados: any[]
  filtrosAtivos: FiltroAtivo[]
}

// Labels para exibição
export const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  pendente_distribuicao: 'Pendente Distribuição',
  em_contato: 'Em Contato',
  em_calculo: 'Em Cálculo',
  aguardando_documentos: 'Aguardando Documentos',
  em_negociacao: 'Em Negociação',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

export const COMPLEXIDADE_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

export const SLA_LABELS: Record<string, string> = {
  nao_iniciado: 'Não Iniciado',
  no_prazo: 'No Prazo',
  atencao: 'Atenção',
  atrasado: 'Atrasado',
  concluido: 'Concluído',
}

export const TIPO_ATRASO_LABELS: Record<TipoAtraso, string> = {
  titular_falecido: 'Titular Falecido',
  penhora: 'Penhora Identificada',
  cessao_parcial: 'Cessão Parcial',
  doc_incompleta: 'Documentação Incompleta',
  duvida_juridica: 'Dúvida Jurídica',
  aguardando_cliente: 'Aguardando Cliente',
  outro: 'Outro',
}

export const IMPACTO_LABELS: Record<string, string> = {
  baixo: 'Baixo (até 24h)',
  medio: 'Médio (2-5 dias)',
  alto: 'Alto (>5 dias)',
}

// Opções para selects
export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const COMPLEXIDADE_OPTIONS = Object.entries(COMPLEXIDADE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const SLA_OPTIONS = Object.entries(SLA_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const TIPO_ATRASO_OPTIONS = Object.entries(TIPO_ATRASO_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const IMPACTO_OPTIONS = Object.entries(IMPACTO_LABELS).map(([value, label]) => ({
  value,
  label,
}))

// Helper para converter filtros em array de filtros ativos
export function getFiltrosAtivos(filtros: FiltrosPrecatorios): FiltroAtivo[] {
  const ativos: FiltroAtivo[] = []

  if (filtros.termo) {
    ativos.push({
      key: 'termo',
      label: 'Busca',
      value: filtros.termo,
      displayValue: `"${filtros.termo}"`,
    })
  }

  if (filtros.status && filtros.status.length > 0) {
    ativos.push({
      key: 'status',
      label: 'Status',
      value: filtros.status,
      displayValue: filtros.status.map((s) => STATUS_LABELS[s] || s).join(', '),
    })
  }

  if (filtros.complexidade && filtros.complexidade.length > 0) {
    ativos.push({
      key: 'complexidade',
      label: 'Complexidade',
      value: filtros.complexidade,
      displayValue: filtros.complexidade.map((c) => COMPLEXIDADE_LABELS[c]).join(', '),
    })
  }

  if (filtros.sla_status && filtros.sla_status.length > 0) {
    ativos.push({
      key: 'sla_status',
      label: 'SLA',
      value: filtros.sla_status,
      displayValue: filtros.sla_status.map((s) => SLA_LABELS[s]).join(', '),
    })
  }

  if (filtros.tipo_atraso && filtros.tipo_atraso.length > 0) {
    ativos.push({
      key: 'tipo_atraso',
      label: 'Tipo de Atraso',
      value: filtros.tipo_atraso,
      displayValue: filtros.tipo_atraso.map((t) => TIPO_ATRASO_LABELS[t]).join(', '),
    })
  }

  if (filtros.impacto_atraso && filtros.impacto_atraso.length > 0) {
    ativos.push({
      key: 'impacto_atraso',
      label: 'Impacto',
      value: filtros.impacto_atraso,
      displayValue: filtros.impacto_atraso.map((i) => IMPACTO_LABELS[i]).join(', '),
    })
  }

  if (filtros.data_criacao_inicio || filtros.data_criacao_fim) {
    const inicio = filtros.data_criacao_inicio
      ? new Date(filtros.data_criacao_inicio).toLocaleDateString('pt-BR')
      : '...'
    const fim = filtros.data_criacao_fim
      ? new Date(filtros.data_criacao_fim).toLocaleDateString('pt-BR')
      : '...'
    ativos.push({
      key: 'data_criacao',
      label: 'Data de Criação',
      value: `${filtros.data_criacao_inicio || ''}-${filtros.data_criacao_fim || ''}`,
      displayValue: `${inicio} até ${fim}`,
    })
  }

  if (filtros.valor_min !== undefined || filtros.valor_max !== undefined) {
    const min = filtros.valor_min
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filtros.valor_min)
      : '...'
    const max = filtros.valor_max
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filtros.valor_max)
      : '...'
    ativos.push({
      key: 'valor',
      label: 'Valor',
      value: `${filtros.valor_min || 0}-${filtros.valor_max || 0}`,
      displayValue: `${min} até ${max}`,
    })
  }

  if (filtros.urgente === true) {
    ativos.push({
      key: 'urgente',
      label: 'Urgente',
      value: true,
      displayValue: 'Sim',
    })
  }

  if (filtros.titular_falecido === true) {
    ativos.push({
      key: 'titular_falecido',
      label: 'Titular Falecido',
      value: true,
      displayValue: 'Sim',
    })
  }

  return ativos
}

// Helper para converter filtros para parâmetros da função RPC
export function filtrosToRpcParams(filtros: FiltrosPrecatorios) {
  return {
    p_termo: filtros.termo || null,
    p_status: filtros.status || null,
    p_responsavel_id: filtros.responsavel_id || null,
    p_criador_id: filtros.criador_id || null,
    p_complexidade: filtros.complexidade || null,
    p_sla_status: filtros.sla_status || null,
    p_tipo_atraso: filtros.tipo_atraso || null,
    p_impacto_atraso: filtros.impacto_atraso || null,
    p_data_criacao_inicio: filtros.data_criacao_inicio || null,
    p_data_criacao_fim: filtros.data_criacao_fim || null,
    p_data_entrada_calculo_inicio: filtros.data_entrada_calculo_inicio || null,
    p_data_entrada_calculo_fim: filtros.data_entrada_calculo_fim || null,
    p_valor_min: filtros.valor_min !== undefined ? filtros.valor_min : null,
    p_valor_max: filtros.valor_max !== undefined ? filtros.valor_max : null,
    p_urgente: filtros.urgente || null,
    p_titular_falecido: filtros.titular_falecido || null,
  }
}
