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

  // Pessoas
  credor_nome?: string
  credor_cpf_cnpj?: string
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
  status: "novo" | "em_andamento" | "concluido" | "cancelado" | "pendente_distribuicao" | "em_contato" | "em_calculo"
  prioridade: "baixa" | "media" | "alta" | "urgente"
  localizacao_kanban: string
  urgente: boolean

  // Responsáveis
  criado_por?: string
  responsavel?: string
  responsavel_calculo_id?: string

  // Dados extras
  dados_calculo: any

  // Timestamps
  created_at: string
  updated_at: string

  proposta_menor_valor_display?: string
  proposta_maior_valor_display?: string
  proposta_menor_percentual_display?: string
  proposta_maior_percentual_display?: string
  data_calculo_display?: string
  dados_calculo_display?: string
}

export interface Atividade {
  id: string
  precatorio_id: string
  usuario_id?: string
  tipo: "criacao" | "atualizacao" | "calculo" | "mudanca_status" | "mudanca_localizacao" | "comentario"
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
