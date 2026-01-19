export interface Usuario {
  id: string
  nome: string
  email: string
  telefone?: string
  role: "admin" | "operador" | "analista" | "gestor"
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface Precatorio {
  id: string

  // Identificação
  titulo: string
  numero_precatorio?: string
  numero_processo?: string
  numero_oficio?: string
  tribunal?: string
  devedor?: string
  esfera_devedor?: string
  natureza?: string
  pdf_url?: string

  // Pessoas
  credor_nome?: string
  credor_cpf_cnpj?: string
  credor_endereco?: string
  credor_cidade?: string
  credor_uf?: string
  advogado_nome?: string
  advogado_cpf_cnpj?: string
  cessionario?: string
  titular_falecido: boolean
  contatos: any[]

  // Valores
  valor_principal: number
  valor_juros: number
  valor_selic: number
  valor_atualizado: number
  saldo_liquido: number

  // Datas
  data_base?: string
  data_expedicao?: string
  data_calculo?: string

  // Descontos e Propostas
  pss_percentual: number
  pss_valor: number
  irpf_valor: number
  irpf_isento: boolean
  honorarios_percentual: number
  honorarios_valor: number
  adiantamento_percentual: number
  adiantamento_valor: number
  proposta_menor_percentual: number
  proposta_maior_percentual: number
  proposta_menor_valor: number
  proposta_maior_valor: number

  // Workflow
  status:
  | "novo"
  | "em_andamento"
  | "concluido"
  | "cancelado"
  | "pendente_distribuicao"
  | "em_contato"
  | "em_calculo"
  | "aguardando_cliente"

  prioridade: "baixa" | "media" | "alta" | "urgente"
  localizacao_kanban: string
  urgente: boolean

  // Responsáveis
  criado_por?: string
  responsavel?: string
  responsavel_calculo_id?: string

  // Complexidade (FASE 1)
  score_complexidade: number
  nivel_complexidade: "baixa" | "media" | "alta"

  // SLA de Cálculo (FASE 1)
  data_entrada_calculo?: string
  sla_horas: number
  sla_status: "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido"

  // Motivo de Atraso
  motivo_atraso_calculo?: string
  data_atraso_calculo?: string
  registrado_atraso_por?: string

  // Atraso Estruturado (FASE 2)
  tipo_atraso?: "titular_falecido" | "penhora" | "cessao_parcial" | "doc_incompleta" | "duvida_juridica" | "aguardando_cliente" | "outro"
  impacto_atraso?: "baixo" | "medio" | "alto"

  // Dados extras
  dados_calculo: any

  // Timestamps
  created_at: string
  updated_at: string

  // Nomes dos usuários (da view)
  criador_nome?: string
  responsavel_nome?: string
  responsavel_calculo_nome?: string
  registrado_atraso_nome?: string

  proposta_menor_valor_display?: string
  proposta_maior_valor_display?: string
  proposta_menor_percentual_display?: string
  proposta_maior_percentual_display?: string
  data_calculo_display?: string
  dados_calculo_display?: string
}

// Métricas de SLA (FASE 1)
export interface MetricasSLA {
  no_prazo: number
  atencao: number
  atrasado: number
  nao_iniciado: number
  concluido: number
  tempo_medio_calculo_horas: number
  total_em_calculo: number
}

export interface Atividade {
  id: string
  precatorio_id: string
  usuario_id?: string
  tipo: "criacao" | "atualizacao" | "calculo" | "mudanca_status" | "mudanca_localizacao" | "comentario" | "inclusao_fila" | "inicio_calculo" | "atraso" | "retomada" | "finalizacao"
  descricao: string
  dados_anteriores?: any
  dados_novos?: any
  created_at: string
  // Campos da view timeline_precatorios
  usuario_nome?: string
  usuario_email?: string
}

// Timeline Event (FASE 2)
export interface TimelineEvent {
  id: string
  precatorio_id: string
  usuario_id?: string
  usuario_nome?: string
  usuario_email?: string
  tipo: "criacao" | "inclusao_fila" | "inicio_calculo" | "atraso" | "retomada" | "finalizacao" | "mudanca_status" | "comentario"
  descricao: string
  dados_anteriores?: any
  dados_novos?: any
  created_at: string
}

export interface Comentario {
  id: string
  precatorio_id: string
  usuario_id?: string
  texto: string
  created_at: string
  updated_at: string
}

export interface CredorView {
  id_unico: string
  credor_nome: string
  credor_cpf_cnpj: string | null
  cidade: string | null
  uf: string | null
  telefone: string | null
  email: string | null
  total_precatorios: number
  valor_total_principal: number
  ultimo_precatorio_data: string | null
}
