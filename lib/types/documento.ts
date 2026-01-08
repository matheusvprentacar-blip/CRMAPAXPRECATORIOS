// =====================================================
// Types para Gestão de Documentos
// =====================================================

export type TipoDocumento =
  | 'oficio_requisitorio'
  | 'credor_rg'
  | 'credor_cpf'
  | 'certidao_casamento'
  | 'certidao_nascimento'
  | 'comprovante_residencia'
  | 'profissao_credor'
  | 'profissao_conjuge'
  | 'dados_bancarios'
  | 'certidao_negativa_municipal'
  | 'certidao_negativa_estadual'
  | 'certidao_negativa_federal'
  | 'documento_conjuge'
  | 'documento_advogado'
  | 'outros'

export interface DocumentoPrecatorio {
  id: string
  precatorio_id: string
  tipo_documento: TipoDocumento
  nome_arquivo: string
  tamanho_bytes: number
  mime_type: string
  storage_path: string
  storage_url?: string
  enviado_por: string
  enviado_por_nome?: string
  enviado_por_email?: string
  observacao?: string
  opcional: boolean
  created_at: string
  updated_at: string
}

export interface UploadDocumentoData {
  precatorio_id: string
  tipo_documento: TipoDocumento
  arquivo: File
  observacao?: string
  opcional?: boolean
}

export interface DocumentoMetadata {
  tipo_documento: TipoDocumento
  nome_arquivo: string
  tamanho_bytes: number
  mime_type: string
  storage_path: string
  observacao?: string
  opcional: boolean
}

// Labels para exibição
export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  oficio_requisitorio: 'Ofício Requisitório',
  credor_rg: 'RG do Credor',
  credor_cpf: 'CPF do Credor',
  certidao_casamento: 'Certidão de Casamento',
  certidao_nascimento: 'Certidão de Nascimento',
  comprovante_residencia: 'Comprovante de Residência',
  profissao_credor: 'Profissão do Credor',
  profissao_conjuge: 'Profissão do Cônjuge',
  dados_bancarios: 'Dados Bancários',
  certidao_negativa_municipal: 'Certidão Negativa Municipal',
  certidao_negativa_estadual: 'Certidão Negativa Estadual',
  certidao_negativa_federal: 'Certidão Negativa Federal',
  documento_conjuge: 'Documentos do Cônjuge',
  documento_advogado: 'Documentos do Advogado',
  outros: 'Outros Documentos',
}

// Descrições dos documentos
export const TIPO_DOCUMENTO_DESCRICOES: Record<TipoDocumento, string> = {
  oficio_requisitorio: 'Ofício requisitório do precatório',
  credor_rg: 'Documento de identidade (RG) do credor',
  credor_cpf: 'Cadastro de Pessoa Física (CPF) do credor',
  certidao_casamento: 'Certidão de casamento (com averbação se divorciado)',
  certidao_nascimento: 'Certidão de nascimento (se solteiro)',
  comprovante_residencia: 'Comprovante de residência atualizado (máx. 30 dias)',
  profissao_credor: 'Declaração ou comprovante de profissão do credor',
  profissao_conjuge: 'Declaração ou comprovante de profissão do cônjuge',
  dados_bancarios: 'Dados bancários para depósito (agência e conta)',
  certidao_negativa_municipal: 'Certidão negativa de débitos municipais',
  certidao_negativa_estadual: 'Certidão negativa de débitos estaduais',
  certidao_negativa_federal: 'Certidão negativa de débitos federais',
  documento_conjuge: 'Documentos pessoais do cônjuge (RG, CPF, etc.)',
  documento_advogado: 'Documentos do advogado (OAB, CPF, etc.)',
  outros: 'Outros documentos relevantes ao processo',
}

// Documentos obrigatórios vs opcionais
export const DOCUMENTOS_OBRIGATORIOS: TipoDocumento[] = [
  'oficio_requisitorio',
  'credor_rg',
  'credor_cpf',
  'comprovante_residencia',
  'dados_bancarios',
]

export const DOCUMENTOS_OPCIONAIS: TipoDocumento[] = [
  'certidao_casamento',
  'certidao_nascimento',
  'profissao_credor',
  'profissao_conjuge',
  'certidao_negativa_municipal',
  'certidao_negativa_estadual',
  'certidao_negativa_federal',
  'documento_conjuge',
  'documento_advogado',
  'outros',
]

// Opções para select
export const TIPO_DOCUMENTO_OPTIONS = Object.entries(TIPO_DOCUMENTO_LABELS).map(
  ([value, label]) => ({
    value: value as TipoDocumento,
    label,
    descricao: TIPO_DOCUMENTO_DESCRICOES[value as TipoDocumento],
    obrigatorio: DOCUMENTOS_OBRIGATORIOS.includes(value as TipoDocumento),
  })
)

// Validações
export const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024 // 10MB
export const TAMANHO_MAXIMO_MB = 10

export const MIME_TYPES_PERMITIDOS = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const EXTENSOES_PERMITIDAS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']

// Helper para validar arquivo
export function validarArquivo(arquivo: File): { valido: boolean; erro?: string } {
  // Validar tamanho
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return {
      valido: false,
      erro: `Arquivo muito grande. Tamanho máximo: ${TAMANHO_MAXIMO_MB}MB`,
    }
  }

  // Validar tipo MIME
  if (!MIME_TYPES_PERMITIDOS.includes(arquivo.type)) {
    return {
      valido: false,
      erro: `Tipo de arquivo não permitido. Tipos aceitos: ${EXTENSOES_PERMITIDAS.join(', ')}`,
    }
  }

  // Validar extensão
  const extensao = '.' + arquivo.name.split('.').pop()?.toLowerCase()
  if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
    return {
      valido: false,
      erro: `Extensão não permitida. Extensões aceitas: ${EXTENSOES_PERMITIDAS.join(', ')}`,
    }
  }

  return { valido: true }
}

// Helper para formatar tamanho de arquivo
export function formatarTamanho(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Helper para obter ícone do tipo de arquivo
export function getIconeArquivo(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return '📝'
  }
  return '📎'
}

// Helper para sanitizar nome de arquivo
export function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Remove caracteres especiais
    .replace(/_{2,}/g, '_') // Remove underscores duplicados
    .toLowerCase()
}

// Helper para gerar storage path
export function gerarStoragePath(
  precatorioId: string,
  tipoDocumento: TipoDocumento,
  nomeArquivo: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
  const nomeSanitizado = sanitizarNomeArquivo(nomeArquivo)
  return `${precatorioId}/${tipoDocumento}/${timestamp}_${nomeSanitizado}`
}

// Interface para checklist de documentos
export interface ChecklistItem {
  tipo: TipoDocumento
  label: string
  descricao: string
  obrigatorio: boolean
  anexado: boolean
  quantidade: number
  documentos: DocumentoPrecatorio[]
}

// Helper para gerar checklist
export function gerarChecklist(documentos: DocumentoPrecatorio[]): ChecklistItem[] {
  return TIPO_DOCUMENTO_OPTIONS.map((option) => {
    const docsDoTipo = documentos.filter((d) => d.tipo_documento === option.value)
    return {
      tipo: option.value,
      label: option.label,
      descricao: option.descricao,
      obrigatorio: option.obrigatorio,
      anexado: docsDoTipo.length > 0,
      quantidade: docsDoTipo.length,
      documentos: docsDoTipo,
    }
  })
}

// Helper para calcular progresso do checklist
export function calcularProgressoChecklist(checklist: ChecklistItem[]): {
  total: number
  obrigatorios: number
  anexados: number
  obrigatoriosAnexados: number
  percentual: number
  percentualObrigatorios: number
  completo: boolean
} {
  const total = checklist.length
  const obrigatorios = checklist.filter((item) => item.obrigatorio).length
  const anexados = checklist.filter((item) => item.anexado).length
  const obrigatoriosAnexados = checklist.filter(
    (item) => item.obrigatorio && item.anexado
  ).length

  const percentual = total > 0 ? Math.round((anexados / total) * 100) : 0
  const percentualObrigatorios =
    obrigatorios > 0 ? Math.round((obrigatoriosAnexados / obrigatorios) * 100) : 100

  const completo = obrigatoriosAnexados === obrigatorios

  return {
    total,
    obrigatorios,
    anexados,
    obrigatoriosAnexados,
    percentual,
    percentualObrigatorios,
    completo,
  }
}
