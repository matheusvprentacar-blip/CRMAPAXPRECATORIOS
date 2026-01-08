// =====================================================
// Types para Extração de IA de Documentos
// =====================================================

export type StatusExtracao = 'processando' | 'concluido' | 'erro' | 'aplicado'

export type TipoCampo = 'string' | 'number' | 'date' | 'boolean' | 'cpf' | 'cnpj' | 'currency'

export type NivelConfianca = 'alta' | 'media' | 'baixa'

// =====================================================
// Interfaces do Banco de Dados
// =====================================================

export interface PrecatorioExtracao {
  id: string
  precatorio_id: string
  status: StatusExtracao
  result_json: ExtractionResult | null
  total_campos: number
  campos_alta_confianca: number
  campos_baixa_confianca: number
  conflitos: number
  documentos_ids: string[]
  total_documentos: number
  checklist_json: ChecklistDocumentos | null
  created_by: string | null
  created_at: string
  applied_at: string | null
  applied_by: string | null
  campos_aplicados: string[] | null
  erro_mensagem: string | null
  erro_detalhes: any | null
}

export interface PrecatorioExtracaoCampo {
  id: string
  extracao_id: string
  campo_nome: string
  campo_label: string | null
  campo_valor: string | null
  campo_tipo: TipoCampo
  valor_normalizado: string | null
  confianca: number
  confianca_nivel: NivelConfianca
  fonte_documento_id: string | null
  fonte_documento_nome: string | null
  fonte_pagina: number | null
  fonte_snippet: string | null
  aplicado: boolean
  aplicado_at: string | null
  conflito: boolean
  conflito_com: string[] | null
  conflito_resolvido: boolean
  created_at: string
}

// =====================================================
// Interfaces da API/IA
// =====================================================

export interface ExtractionResult {
  precatorio_id: string
  status: 'success' | 'partial' | 'error'
  timestamp: string
  
  // Campos extraídos
  campos: {
    // Identificação
    numero_precatorio?: FieldExtraction
    numero_processo?: FieldExtraction
    numero_oficio?: FieldExtraction
    tribunal?: FieldExtraction
    devedor?: FieldExtraction
    esfera_devedor?: FieldExtraction
    
    // Partes - Credor
    credor_nome?: FieldExtraction
    credor_cpf_cnpj?: FieldExtraction
    credor_profissao?: FieldExtraction
    credor_estado_civil?: FieldExtraction
    credor_regime_casamento?: FieldExtraction
    credor_data_nascimento?: FieldExtraction
    
    // Partes - Cônjuge
    conjuge_nome?: FieldExtraction
    conjuge_cpf_cnpj?: FieldExtraction
    
    // Partes - Advogado
    advogado_nome?: FieldExtraction
    advogado_cpf_cnpj?: FieldExtraction
    advogado_oab?: FieldExtraction
    
    // Outros
    cessionario?: FieldExtraction
    titular_falecido?: FieldExtraction
    
    // Valores
    valor_principal?: FieldExtraction
    valor_juros?: FieldExtraction
    valor_selic?: FieldExtraction
    valor_atualizado?: FieldExtraction
    saldo_liquido?: FieldExtraction
    
    // Datas
    data_base?: FieldExtraction
    data_expedicao?: FieldExtraction
    data_calculo?: FieldExtraction
    
    // Dados bancários
    banco?: FieldExtraction
    agencia?: FieldExtraction
    conta?: FieldExtraction
    tipo_conta?: FieldExtraction
    titular_conta?: FieldExtraction
    
    // Endereço
    endereco_completo?: FieldExtraction
    cep?: FieldExtraction
    cidade?: FieldExtraction
    estado?: FieldExtraction
  }
  
  // Checklist de documentos
  checklist: ChecklistDocumentos
  
  // Conflitos detectados
  conflitos: ConflitoCampo[]
  
  // Metadados
  documentos_processados: DocumentoProcessado[]
  
  total_campos_extraidos: number
  campos_alta_confianca: number
  campos_baixa_confianca: number
}

export interface FieldExtraction {
  valor: string | number | boolean | null
  confianca: number // 0-100
  fonte: {
    documento_id: string
    documento_nome: string
    pagina?: number
    snippet?: string
  }
  tipo: TipoCampo
  normalizado: boolean
}

export interface ChecklistDocumentos {
  rg_credor: boolean
  cpf_credor: boolean
  comprovante_residencia: boolean
  certidao_casamento: boolean
  certidao_nascimento: boolean
  certidao_negativa_municipal: boolean
  certidao_negativa_estadual: boolean
  certidao_negativa_federal: boolean
  dados_bancarios: boolean
  procuracao: boolean
  oficio_requisitorio: boolean
}

export interface ConflitoCampo {
  campo: string
  campo_label: string
  opcoes: Array<{
    id: string
    valor: string
    fonte: string
    confianca: number
    documento_id: string
  }>
}

export interface DocumentoProcessado {
  id: string
  nome: string
  tipo: string
  paginas: number
  sucesso: boolean
  erro?: string
}

// =====================================================
// Request/Response Types
// =====================================================

export interface ProcessarDocumentosRequest {
  precatorio_id: string
  documento_ids?: string[] // Se vazio, processa todos não processados
  force_reprocess?: boolean // Reprocessar mesmo se já processado
}

export interface ProcessarDocumentosResponse {
  success: boolean
  extracao_id: string
  status: StatusExtracao
  total_campos: number
  campos_alta_confianca: number
  campos_baixa_confianca: number
  conflitos: number
  documentos_processados: number
  erro?: string
}

export interface AplicarExtracaoRequest {
  extracao_id: string
  campos_selecionados: string[] // IDs dos campos a aplicar
  resolucoes_conflitos?: Record<string, string> // campo_nome -> campo_id escolhido
}

export interface AplicarExtracaoResponse {
  success: boolean
  campos_aplicados: number
  campos_com_erro: string[]
  precatorio_atualizado: boolean
  erro?: string
}

export interface ObterExtracaoResponse {
  extracao: PrecatorioExtracao
  campos: PrecatorioExtracaoCampo[]
  campos_agrupados: CamposAgrupados
}

export interface CamposAgrupados {
  alta_confianca: PrecatorioExtracaoCampo[]
  media_confianca: PrecatorioExtracaoCampo[]
  baixa_confianca: PrecatorioExtracaoCampo[]
  conflitos: ConflitoCampo[]
}

// =====================================================
// Mapeamento de Campos
// =====================================================

export const CAMPO_LABELS: Record<string, string> = {
  // Identificação
  numero_precatorio: 'Número do Precatório',
  numero_processo: 'Número do Processo',
  numero_oficio: 'Número do Ofício',
  tribunal: 'Tribunal',
  devedor: 'Devedor',
  esfera_devedor: 'Esfera do Devedor',
  
  // Credor
  credor_nome: 'Nome do Credor',
  credor_cpf_cnpj: 'CPF/CNPJ do Credor',
  credor_profissao: 'Profissão do Credor',
  credor_estado_civil: 'Estado Civil do Credor',
  credor_regime_casamento: 'Regime de Casamento',
  credor_data_nascimento: 'Data de Nascimento do Credor',
  
  // Cônjuge
  conjuge_nome: 'Nome do Cônjuge',
  conjuge_cpf_cnpj: 'CPF do Cônjuge',
  
  // Advogado
  advogado_nome: 'Nome do Advogado',
  advogado_cpf_cnpj: 'CPF do Advogado',
  advogado_oab: 'OAB do Advogado',
  
  // Outros
  cessionario: 'Cessionário',
  titular_falecido: 'Titular Falecido',
  
  // Valores
  valor_principal: 'Valor Principal',
  valor_juros: 'Valor de Juros',
  valor_selic: 'Valor SELIC',
  valor_atualizado: 'Valor Atualizado',
  saldo_liquido: 'Saldo Líquido',
  
  // Datas
  data_base: 'Data Base',
  data_expedicao: 'Data de Expedição',
  data_calculo: 'Data do Cálculo',
  
  // Dados bancários
  banco: 'Banco',
  agencia: 'Agência',
  conta: 'Conta',
  tipo_conta: 'Tipo de Conta',
  titular_conta: 'Titular da Conta',
  
  // Endereço
  endereco_completo: 'Endereço Completo',
  cep: 'CEP',
  cidade: 'Cidade',
  estado: 'Estado',
}

export const CAMPO_TIPOS: Record<string, TipoCampo> = {
  // Strings
  numero_precatorio: 'string',
  numero_processo: 'string',
  numero_oficio: 'string',
  tribunal: 'string',
  devedor: 'string',
  esfera_devedor: 'string',
  credor_nome: 'string',
  credor_profissao: 'string',
  credor_estado_civil: 'string',
  credor_regime_casamento: 'string',
  conjuge_nome: 'string',
  advogado_nome: 'string',
  advogado_oab: 'string',
  cessionario: 'string',
  banco: 'string',
  agencia: 'string',
  conta: 'string',
  tipo_conta: 'string',
  titular_conta: 'string',
  endereco_completo: 'string',
  cidade: 'string',
  estado: 'string',
  
  // CPF/CNPJ
  credor_cpf_cnpj: 'cpf',
  conjuge_cpf_cnpj: 'cpf',
  advogado_cpf_cnpj: 'cpf',
  
  // CEP
  cep: 'string',
  
  // Números/Currency
  valor_principal: 'currency',
  valor_juros: 'currency',
  valor_selic: 'currency',
  valor_atualizado: 'currency',
  saldo_liquido: 'currency',
  
  // Datas
  data_base: 'date',
  data_expedicao: 'date',
  data_calculo: 'date',
  credor_data_nascimento: 'date',
  
  // Boolean
  titular_falecido: 'boolean',
}

// =====================================================
// Helper Functions
// =====================================================

export function getConfiancaColor(confianca: number): string {
  if (confianca >= 80) return 'text-green-600'
  if (confianca >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

export function getConfiancaBadgeVariant(nivel: NivelConfianca): 'default' | 'secondary' | 'destructive' {
  switch (nivel) {
    case 'alta':
      return 'default'
    case 'media':
      return 'secondary'
    case 'baixa':
      return 'destructive'
  }
}

export function getConfiancaIcon(nivel: NivelConfianca): string {
  switch (nivel) {
    case 'alta':
      return '✓'
    case 'media':
      return '⚠'
    case 'baixa':
      return '❌'
  }
}

export function formatCampoValor(valor: string | null, tipo: TipoCampo): string {
  if (!valor) return '-'
  
  switch (tipo) {
    case 'currency':
      const num = parseFloat(valor)
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(num)
    
    case 'date':
      return new Date(valor).toLocaleDateString('pt-BR')
    
    case 'cpf':
      return valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    
    case 'cnpj':
      return valor.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    
    case 'boolean':
      return valor === 'true' ? 'Sim' : 'Não'
    
    default:
      return valor
  }
}
