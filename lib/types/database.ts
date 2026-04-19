import type { OperatorTag } from "@/lib/users/operator-tag"

export interface Usuario {
  id: string
  nome: string
  email: string
  telefone?: string
  role: string[]
  operator_tag?: OperatorTag | null
  ativo: boolean
  created_at: string
  updated_at: string
  horarios_permitidos?: import("@/lib/auth/horarios").HorariosPermitidos | null
  // HR Fields
  admission_date?: string
  position?: string
  bank_info?: Record<string, unknown>
  address?: Record<string, unknown>
}

export interface HRDocument {
  id: string
  user_id: string
  title: string
  type: "documento" | "contrato" | "atestado" | "outros"
  url: string
  created_at: string
  updated_at: string
}

export interface FinancialTransaction {
  id: string
  description: string
  amount: number
  type: "income" | "expense"
  category: string
  status: "pendente" | "pago" | "cancelado" | "atrasado"
  due_date: string
  payment_date?: string
  user_id?: string
  installment_number?: number
  total_installments?: number
  recurrence_id?: string
  department?: string
  document_url?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joins
  usuarios?: {
    nome: string
    email: string
  }
}

export interface HRLeave {
  id: string
  user_id: string
  type: "atestado" | "falta" | "ferias" | "licenca"
  start_date: string
  end_date?: string
  description?: string
  document_url?: string
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
  credor_data_nascimento?: string | null
  credor_profissao?: string | null
  credor_estado_civil?: string | null
  credor_endereco?: string
  credor_cidade?: string
  credor_uf?: string
  credor_cep?: string
  credor_telefone?: string
  credor_email?: string
  conjuge_nome?: string | null
  conjuge_cpf_cnpj?: string | null
  advogado_nome?: string
  advogado_cpf_cnpj?: string
  advogado_oab?: string | null
  advogado_telefone?: string | null
  herdeiro?: string | null
  herdeiro_cpf?: string | null
  herdeiro_telefone?: string | null
  herdeiro_endereco?: string | null
  cessionario?: string
  titular_falecido: boolean
  contatos: string | string[] | Record<string, unknown> | null

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
  loa?: string | null
  ano_orcamentario?: number | null
  previsao_pagamento?: string | null

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
  status_kanban?: string | null
  localizacao_kanban: string
  urgente: boolean

  // Responsáveis
  criado_por?: string
  responsavel?: string
  dono_usuario_id?: string
  responsavel_calculo_id?: string
  responsavel_escrituras_id?: string
  responsavel_juridico_id?: string
  distribuido_por_admin?: boolean
  distribuido_por_admin_id?: string | null
  distribuido_por_admin_em?: string | null

  // Escrituras
  status_escrituras?: "nao_iniciado" | "em_andamento" | "pendente_assinatura" | "concluido" | null
  observacoes_escrituras?: string | null

  // Dados bancários e complementares
  banco?: string | null
  agencia?: string | null
  conta?: string | null
  tipo_conta?: string | null
  chave_pix?: string | null
  tipo_chave_pix?: string | null
  observacoes_bancarias?: string | null

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
  dados_calculo: unknown

  // Análise processual
  analise_penhora?: boolean | null
  analise_cessao?: boolean | null
  analise_herdeiros?: string | null
  analise_viavel?: boolean | null
  analise_observacoes?: string | null
  analise_penhora_valor?: number | null
  analise_penhora_percentual?: number | null
  analise_cessao_valor?: number | null
  analise_cessao_percentual?: number | null
  analise_adiantamento_valor?: number | null
  analise_adiantamento_percentual?: number | null
  analise_honorarios_valor?: number | null
  analise_honorarios_percentual?: number | null
  analise_itcmd?: boolean | null
  analise_itcmd_valor?: number | null
  analise_itcmd_percentual?: number | null

  // Origem do lead (canal de captação)
  origem_lead?: string | null
  observacoes?: string | null
  raw_text?: string | null
  pontos_importantes?: string[] | null
  detalhes?: Record<string, unknown> | null

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
  dados_anteriores?: unknown
  dados_novos?: unknown
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
  dados_anteriores?: unknown
  dados_novos?: unknown
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
  origem_lead?: string | null
}
