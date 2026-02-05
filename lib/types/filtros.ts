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

  // Filtro por tribunal
  tribunal?: string

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
  valor_atualizado_min?: number
  valor_atualizado_max?: number
  valor_sem_atualizacao_min?: number
  valor_sem_atualizacao_max?: number

  // Flags especiais
  urgente?: boolean
  titular_falecido?: boolean
  valor_calculado?: boolean
  calculo_em_andamento?: boolean
  calculo_finalizado?: boolean
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
  // Fluxo Kanban atual
  entrada: 'Entrada / Pré-cadastro',
  triagem_interesse: 'Triagem (interesse do credor)',
  aguardando_oficio: 'Aguardando ofício',
  docs_credor: 'Documentos do credor',
  analise_processual_inicial: 'Análise processual inicial',
  pronto_calculo: 'Pronto para cálculo',
  calculo_andamento: 'Cálculo em andamento',
  juridico: 'Jurídico',
  calculo_concluido: 'Cálculo concluído',
  proposta_negociacao: 'Proposta / negociação',
  proposta_aceita: 'Jurídico de fechamento',
  certidoes: 'Certidões',
  fechado: 'Fechado',
  pos_fechamento: 'Pós-fechamento',
  pausado_credor: 'Pausado (credor)',
  pausado_documentos: 'Pausado (documentos)',
  sem_interesse: 'Sem interesse',
  reprovado: 'Reprovado / não elegível',
  encerrados: 'Encerrados',
  fila_calculo: 'Fila de cálculo',

  // Status legados (ainda podem existir)
  novo: 'Novo',
  em_contato: 'Em contato',
  em_calculo: 'Em cálculo',
  calculado: 'Calculado',
  aguardando_cliente: 'Aguardando cliente',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  pendente_distribuicao: 'Pendente distribuição',
  aguardando_documentos: 'Aguardando documentos',
  em_negociacao: 'Em negociação',
  finalizado: 'Finalizado',
}

export const COMPLEXIDADE_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
}

export const SLA_LABELS: Record<string, string> = {
  nao_iniciado: 'Não iniciado',
  no_prazo: 'No prazo',
  atencao: 'Atenção',
  atrasado: 'Atrasado',
  concluido: 'Concluído',
}

export const TIPO_ATRASO_LABELS: Record<TipoAtraso, string> = {
  titular_falecido: 'Titular falecido',
  penhora: 'Penhora identificada',
  cessao_parcial: 'Cessão parcial',
  doc_incompleta: 'Documentação incompleta',
  duvida_juridica: 'Dúvida jurídica',
  aguardando_cliente: 'Aguardando cliente',
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


  if (filtros.tribunal) {
    ativos.push({
      key: 'tribunal',
      label: 'Tribunal',
      value: filtros.tribunal,
      displayValue: filtros.tribunal,
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


  if (filtros.valor_atualizado_min !== undefined || filtros.valor_atualizado_max !== undefined) {
    const min = filtros.valor_atualizado_min
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filtros.valor_atualizado_min)
      : '...'
    const max = filtros.valor_atualizado_max
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filtros.valor_atualizado_max)
      : '...'
    ativos.push({
      key: 'valor_atualizado',
      label: 'Valor atualizado',
      value: `${filtros.valor_atualizado_min || 0}-${filtros.valor_atualizado_max || 0}`,
      displayValue: `${min} até ${max}`,
    })
  }

  if (filtros.valor_sem_atualizacao_min !== undefined || filtros.valor_sem_atualizacao_max !== undefined) {
    const min = filtros.valor_sem_atualizacao_min
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filtros.valor_sem_atualizacao_min)
      : '...'
    const max = filtros.valor_sem_atualizacao_max
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filtros.valor_sem_atualizacao_max)
      : '...'
    ativos.push({
      key: 'valor_sem_atualizacao',
      label: 'Valor sem atualização',
      value: `${filtros.valor_sem_atualizacao_min || 0}-${filtros.valor_sem_atualizacao_max || 0}`,
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


  if (filtros.valor_calculado === true) {
    ativos.push({
      key: 'valor_calculado',
      label: 'Valor já calculado',
      value: true,
      displayValue: 'Sim',
    })
  }

  if (filtros.calculo_em_andamento === true) {
    ativos.push({
      key: 'calculo_em_andamento',
      label: 'Cálculo em andamento',
      value: true,
      displayValue: 'Sim',
    })
  }

  if (filtros.calculo_finalizado === true) {
    ativos.push({
      key: 'calculo_finalizado',
      label: 'Cálculo finalizado',
      value: true,
      displayValue: 'Sim',
    })
  }

  return ativos
}

// Helper para converter filtros para parâmetros da função RPC
export function filtrosToRpcParams(filtros: FiltrosPrecatorios) {
  const params: Record<string, any> = {
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

  if (filtros.tribunal) params.p_tribunal = filtros.tribunal
  if (filtros.valor_atualizado_min !== undefined) params.p_valor_atualizado_min = filtros.valor_atualizado_min
  if (filtros.valor_atualizado_max !== undefined) params.p_valor_atualizado_max = filtros.valor_atualizado_max
  if (filtros.valor_sem_atualizacao_min !== undefined) params.p_valor_sem_atualizacao_min = filtros.valor_sem_atualizacao_min
  if (filtros.valor_sem_atualizacao_max !== undefined) params.p_valor_sem_atualizacao_max = filtros.valor_sem_atualizacao_max
  if (filtros.valor_calculado) params.p_valor_calculado = true
  if (filtros.calculo_em_andamento) params.p_calculo_andamento = true
  if (filtros.calculo_finalizado) params.p_calculo_finalizado = true

  return params
}
