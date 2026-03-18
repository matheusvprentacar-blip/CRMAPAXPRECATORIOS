'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileJson, Upload, Loader2, Download } from "@/components/icons"
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { createBrowserClient } from '@/lib/supabase/client'

interface ImportJsonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type JsonRecord = Record<string, any>
const PREVIEW_ROW_LIMIT = 120
const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_FIELDS = new Set(['responsavel_calculo_id', 'responsavel_escrituras_id'])
const PRIORIDADES_VALIDAS = new Set(['baixa', 'media', 'alta', 'urgente'])
const STATUS_KANBAN_VALIDOS = new Set([
  'entrada',
  'triagem_interesse',
  'aguardando_oficio',
  'analise_processual_inicial',
  'docs_credor',
  'pronto_calculo',
  'calculo_andamento',
  'juridico',
  'calculo_concluido',
  'proposta_negociacao',
  'proposta_aceita',
  'certidoes',
  'escrituras',
  'fechado',
  'pos_fechamento',
  'pausado_credor',
  'pausado_documentos',
  'sem_interesse',
  'reprovado',
  'analise_juridica',
  'recalculo_pos_juridico',
  'encerrados'
])
const STATUS_VALIDOS = new Set([
  'novo',
  'em_andamento',
  'em_contato',
  'em_calculo',
  'calculado',
  'aguardando_cliente',
  'concluido',
  'cancelado',
  'fila_calculo',
  'entrada',
  'triagem_interesse',
  'aguardando_oficio',
  'docs_credor',
  'analise_processual_inicial',
  'analise_juridica',
  'recalculo_pos_juridico',
  'pronto_calculo',
  'calculo_andamento',
  'juridico',
  'calculo_concluido',
  'proposta_negociacao',
  'proposta_aceita',
  'certidoes',
  'escrituras',
  'fechado',
  'encerrados',
  'reprovado',
  'nao_elegivel',
  'credito_vendido',
  'pos_fechamento',
  'pausado_credor',
  'pausado_documentos',
  'sem_interesse'
])

export function ImportJsonModal({ open, onOpenChange, onSuccess }: ImportJsonModalProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ==============================================================================
  // HELPERS DE VALIDACAO (Locais)
  // ==============================================================================
  function normalizarCPFCNPJ(v: string) { return v.replace(/[^\d]/g, '') }

  const STRING_FIELDS = [
    'numero_precatorio',
    'numero_processo',
    'numero_oficio',
    'tribunal',
    'devedor',
    'esfera_devedor',
    'natureza',
    'credor_nome',
    'credor_cpf_cnpj',
    'credor_profissao',
    'credor_estado_civil',
    'conjuge_nome',
    'conjuge_cpf_cnpj',
    'credor_endereco',
    'credor_cidade',
    'credor_uf',
    'credor_cep',
    'credor_telefone',
    'credor_email',
    'advogado_nome',
    'advogado_cpf_cnpj',
    'advogado_oab',
    'advogado_telefone',
    'herdeiro',
    'herdeiro_cpf',
    'herdeiro_telefone',
    'herdeiro_endereco',
    'cessionario',
    'banco',
    'agencia',
    'conta',
    'tipo_conta',
    'chave_pix',
    'tipo_chave_pix',
    'observacoes_bancarias',
    'status',
    'status_kanban',
    'localizacao_kanban',
    'prioridade',
    'responsavel_calculo_id',
    'responsavel_escrituras_id',
    'motivo_atraso_calculo',
    'tipo_atraso',
    'impacto_atraso',
    'observacoes_escrituras',
    'analise_herdeiros',
    'analise_observacoes',
    'raw_text'
  ] as const

  const NUMERIC_FIELDS = [
    'valor_principal',
    'valor_juros',
    'valor_selic',
    'valor_atualizado',
    'saldo_liquido',
    'pss_percentual',
    'pss_valor',
    'irpf_valor',
    'honorarios_percentual',
    'honorarios_valor',
    'adiantamento_percentual',
    'adiantamento_valor',
    'proposta_menor_percentual',
    'proposta_maior_percentual',
    'proposta_menor_valor',
    'proposta_maior_valor',
    'ano_orcamentario',
    'score_complexidade',
    'sla_horas',
    'analise_penhora_valor',
    'analise_penhora_percentual',
    'analise_cessao_valor',
    'analise_cessao_percentual',
    'analise_adiantamento_valor',
    'analise_adiantamento_percentual',
    'analise_honorarios_valor',
    'analise_honorarios_percentual',
    'analise_itcmd_valor',
    'analise_itcmd_percentual'
  ] as const

  const DATE_FIELDS = [
    'credor_data_nascimento',
    'data_base',
    'data_expedicao',
    'data_calculo',
    'previsao_pagamento',
    'loa',
    'data_entrada_calculo',
    'data_atraso_calculo'
  ] as const

  const BOOLEAN_FIELDS = [
    'titular_falecido',
    'irpf_isento',
    'urgente',
    'analise_penhora',
    'analise_cessao',
    'analise_viavel',
    'analise_itcmd'
  ] as const

  const FIELD_ALIASES: Record<string, string[]> = {
    numero_precatorio: ['numero'],
    numero_processo: ['processo', 'numero_do_processo'],
    numero_oficio: ['oficio'],
    credor_nome: ['credor', 'nome_credor'],
    credor_uf: ['estado', 'uf'],
    credor_cidade: ['cidade'],
    credor_cep: ['cep'],
    credor_endereco: ['endereco_completo', 'endereco'],
    advogado_oab: ['oab'],
    advogado_nome: ['advogado', 'advogado.nome'],
    natureza: ['natureza_precatorio', 'tipo_precatorio', 'comum_ou_alimentar'],
    previsao_pagamento: ['datas.previsao_pagamento', 'datas.previsao'],
    data_base: ['datas.data_base', 'datas.base'],
    data_expedicao: ['datas.data_expedicao', 'datas.expedicao'],
    data_calculo: ['datas.data_calculo', 'datas.calculo'],
    raw_text: ['texto', 'texto_extraido']
  }

  function normalizarTexto(value: unknown) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim()
    return ''
  }

  function getByPath(source: JsonRecord, path: string): unknown {
    if (!path.includes('.')) return source?.[path]
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object') return (acc as JsonRecord)[key]
      return undefined
    }, source)
  }

  function getFirstValue(source: JsonRecord, keys: string[]) {
    for (const key of keys) {
      const value = getByPath(source, key)
      if (value === null || value === undefined) continue
      if (typeof value === 'string' && !value.trim()) continue
      return value
    }
    return undefined
  }

  function normalizarDataFlex(v: unknown) {
    const raw = normalizarTexto(v)
    if (!raw) return null
    if (/^\d{4}$/.test(raw)) return `${raw}-01-01`

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

    const brFormats = [/^(\d{2})\/(\d{2})\/(\d{4})$/, /^(\d{2})-(\d{2})-(\d{4})$/]
    for (const format of brFormats) {
      const match = raw.match(format)
      if (match) return `${match[3]}-${match[2]}-${match[1]}`
    }

    const parsed = new Date(raw)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
    return null
  }

  function coerceNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
    if (typeof value === 'string') {
      const cleaned = value
        .replace(/\s/g, '')
        .replace(/[^0-9,.-]/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.')
      const parsed = Number(cleaned)
      return Number.isFinite(parsed) ? parsed : undefined
    }
    return undefined
  }

  function coerceBoolean(value: unknown): boolean | undefined {
    if (value === null || value === undefined || value === '') return undefined
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', '1', 'sim', 'yes', 'y', 's'].includes(normalized)) return true
      if (['false', '0', 'nao', 'não', 'no', 'n'].includes(normalized)) return false
    }
    return undefined
  }

  function asTextList(value: unknown): string[] {
    if (value === null || value === undefined) return []
    if (Array.isArray(value)) return value.flatMap((entry) => asTextList(entry))
    if (typeof value === 'string') {
      const text = value.trim()
      if (!text) return []
      return text
        .split(/\r?\n|;/)
        .map((part) => part.trim())
        .filter(Boolean)
    }
    if (typeof value === 'number' || typeof value === 'boolean') return [String(value)]
    return []
  }

  function normalizeContatos(value: unknown) {
    if (value === null || value === undefined) return undefined
    if (Array.isArray(value)) {
      const items = value.flatMap((entry) => asTextList(entry))
      return items.length > 0 ? items.join('\n') : undefined
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as JsonRecord)
        .map(([key, val]) => {
          const content = normalizarTexto(val)
          return content ? `${key}: ${content}` : ''
        })
        .filter(Boolean)
      return entries.length > 0 ? entries.join('\n') : undefined
    }
    const text = normalizarTexto(value)
    return text || undefined
  }

  function composeObservacoes(source: JsonRecord) {
    const blocos: string[] = []

    const observacaoDireta = normalizarTexto(getFirstValue(source, ['observacoes', 'observacao', 'obs']))
    if (observacaoDireta) blocos.push(observacaoDireta)

    const detalheTexto = normalizarTexto(
      getFirstValue(source, ['detalhes_resumo', 'resumo', 'detalhes.texto', 'detalhes.resumo'])
    )
    if (detalheTexto) blocos.push(`Detalhes: ${detalheTexto}`)

    const pontosImportantes = [
      ...asTextList(getFirstValue(source, ['pontos_importantes', 'pontos_chave', 'highlights'])),
      ...asTextList(getFirstValue(source, ['detalhes.pontos_importantes', 'detalhes.pontos_chave', 'detalhes.highlights']))
    ]
      .map((item) => item.trim())
      .filter(Boolean)

    if (pontosImportantes.length > 0) {
      blocos.push(`Pontos importantes:\n${pontosImportantes.map((item) => `- ${item}`).join('\n')}`)
    }

    return blocos.length > 0 ? blocos.join('\n\n') : undefined
  }

  function extractPrecatorios(json: unknown): JsonRecord[] {
    if (Array.isArray(json)) return json.filter((item) => item && typeof item === 'object') as JsonRecord[]
    if (json && typeof json === 'object') {
      const parsed = json as JsonRecord
      if (Array.isArray(parsed.precatorios)) return parsed.precatorios as JsonRecord[]
      if (Array.isArray(parsed.items)) return parsed.items as JsonRecord[]
      if (Array.isArray(parsed.dados)) return parsed.dados as JsonRecord[]
      return [parsed]
    }
    return []
  }

  function validarCPF(cpf: string) {
    cpf = cpf.replace(/[^\d]/g, '')
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let s = 0; for (let i = 0; i < 9; i++) s += parseInt(cpf.charAt(i)) * (10 - i);
    let r = 11 - (s % 11); const d1 = r >= 10 ? 0 : r;
    s = 0; for (let i = 0; i < 10; i++) s += parseInt(cpf.charAt(i)) * (11 - i);
    r = 11 - (s % 11); const d2 = r >= 10 ? 0 : r;
    return parseInt(cpf.charAt(9)) === d1 && parseInt(cpf.charAt(10)) === d2
  }

  function validarCNPJ(cnpj: string) {
    cnpj = cnpj.replace(/[^\d]/g, '')
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
    return true // Validação simplificada
  }

  function normalizarEsferaDevedor(v?: string) {
    if (!v) return null
    const normalized = v
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()

    if (!normalized) return null
    if (normalized === "UNIAO" || normalized === "FEDERAL" || normalized === "UNIAO FEDERAL") return "UNIAO"
    if (normalized === "ESTADO" || normalized === "ESTADUAL") return "ESTADO"
    if (normalized === "MUNICIPIO" || normalized === "MUNICIPAL") return "MUNICIPIO"
    if (normalized === "DF" || normalized === "DISTRITO FEDERAL") return "DF"
    if (normalized === "INDEFINIDO" || normalized === "INDEFINIDA" || normalized === "NAO DEFINIDO") return "INDEFINIDO"
    return null
  }

  function normalizarNatureza(v: unknown): string | null {
    const normalized = normalizarTexto(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()

    if (!normalized) return null
    if (normalized.includes("ALIMENTAR") || normalized.includes("ALIMENTICIO")) return "Alimentar"
    if (
      normalized.includes("COMUM")
      || normalized.includes("ORDINARIO")
      || normalized.includes("ORDINARIA")
      || normalized.includes("NAO ALIMENTAR")
      || normalized.includes("NAO-ALIMENTAR")
    ) {
      return "Comum"
    }
    return null
  }

  function normalizarToken(v: unknown): string | null {
    const normalized = normalizarTexto(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
    if (!normalized) return null
    if (normalized === 'encerrado') return 'encerrados'
    return normalized
  }

  function normalizarStatus(v: unknown): string | null {
    const normalized = normalizarToken(v)
    return normalized && STATUS_VALIDOS.has(normalized) ? normalized : null
  }

  function normalizarStatusKanban(v: unknown): string | null {
    const normalized = normalizarToken(v)
    return normalized && STATUS_KANBAN_VALIDOS.has(normalized) ? normalized : null
  }

  function normalizarPrioridade(v: unknown): string | null {
    const normalized = normalizarToken(v)
    return normalized && PRIORIDADES_VALIDAS.has(normalized) ? normalized : null
  }

  function normalizarUuid(v: unknown): string | null {
    const text = normalizarTexto(v)
    if (!text) return null
    const lower = text.toLowerCase()
    if (lower === 'none' || lower === 'null' || lower === 'undefined') return null
    return UUID_REGEX.test(text) ? text : null
  }

  function formatSupabaseError(error: any): string {
    if (!error) return 'Erro desconhecido'
    const parts = [error.code, error.message, error.details, error.hint]
      .map((part) => normalizarTexto(part))
      .filter(Boolean)
    return parts.length > 0 ? parts.join(' | ') : 'Erro desconhecido'
  }

  function confirmDate(target: any, key: string, value: unknown) {
    const d = normalizarDataFlex(value)
    if (d) target[key] = d
  }

  function confirmFloat(target: any, key: string, value: unknown) {
    const v = coerceNumber(value)
    if (v !== undefined) target[key] = v
  }

  function confirmBoolean(target: any, key: string, value: unknown) {
    const v = coerceBoolean(value)
    if (v !== undefined) target[key] = v
  }

  function extrairColunaInexistente(error: any): string | null {
    const message = String(error?.message || '')
    const details = String(error?.details || '')
    const hint = String(error?.hint || '')
    const combined = `${message} ${details} ${hint}`.trim()
    if (!combined) return null

    const patterns = [
      /Could not find the '([^']+)' column/i,
      /column "([^"]+)" of relation "precatorios" does not exist/i,
      /column ([a-zA-Z_][a-zA-Z0-9_]*) does not exist/i,
    ]

    for (const pattern of patterns) {
      const match = combined.match(pattern)
      if (match?.[1]) return match[1]
    }
    return null
  }

  async function inserirPrecatorioResiliente(
    supabase: NonNullable<ReturnType<typeof createBrowserClient>>,
    payload: Record<string, unknown>
  ) {
    const payloadMutavel: Record<string, unknown> = { ...payload }
    const colunasRemovidas: string[] = []
    const maxTentativas = 8

    for (let tentativa = 0; tentativa <= maxTentativas; tentativa++) {
      const { data, error } = await supabase
        .from('precatorios')
        .insert(payloadMutavel)
        .select()
        .single()

      if (!error) return { criado: data, colunasRemovidas }

      const colunaInexistente = extrairColunaInexistente(error)
      if (!colunaInexistente || !(colunaInexistente in payloadMutavel)) {
        throw error
      }

      delete payloadMutavel[colunaInexistente]
      colunasRemovidas.push(colunaInexistente)
    }

    throw new Error('Nao foi possivel inserir: payload incompativel com o schema atual.')
  }

  // ==============================================================================
  // PROCESSAMENTO DO ARQUIVO
  // ==============================================================================
  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setPreview(null)
    setResult(null)

    try {
      const text = await file.text()
      const json = JSON.parse(text)

      const precatorios = extractPrecatorios(json)
      if (!precatorios || precatorios.length === 0) {
        throw new Error('JSON invalido. Envie um array ou objeto contendo precatorios.')
      }

      // Processamento Local (Preview)
      const processedPreview = precatorios.map((rawItem: JsonRecord, index: number) => {
        const p = rawItem && typeof rawItem === 'object' ? rawItem : {}
        const avisos: string[] = []

        if (!p || Object.keys(p).length === 0) {
          avisos.push('Item sem campos preenchidos (sera incluido com dados padrao).')
        }

        const credorNome = normalizarTexto(getFirstValue(p, ['credor_nome', 'credor', 'nome_credor']))
        if (!credorNome) {
          avisos.push('Credor nao informado (o sistema aceita sem essa informacao).')
        }

        const cpfCnpjOriginal = getFirstValue(p, ['credor_cpf_cnpj'])
        if (!cpfCnpjOriginal) {
          avisos.push('CPF/CNPJ nao informado')
        } else {
          const cpfCnpj = normalizarCPFCNPJ(String(cpfCnpjOriginal))
          if (cpfCnpj.length === 11 && !validarCPF(cpfCnpj)) {
            avisos.push('CPF com digitos invalidos (sera importado conforme informado).')
          } else if (cpfCnpj.length === 14 && !validarCNPJ(cpfCnpj)) {
            avisos.push('CNPJ com formato invalido (sera importado conforme informado).')
          } else if (cpfCnpj.length > 0 && cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
            avisos.push('Formato invalido (esperado 11 ou 14 digitos).')
          }
        }

        const valorPrincipal = coerceNumber(getFirstValue(p, ['valor_principal', 'valor']))
        if (valorPrincipal === undefined || valorPrincipal <= 0) {
          avisos.push('Valor principal nao informado/invalido (campo opcional).')
        }

        return { index, dados: p, avisos, valido: true }
      })

      setPreview({
        total: precatorios.length,
        validos: processedPreview.length,
        invalidos: 0,
        preview: processedPreview
      })

      // Selecionar todos automaticamente
      setSelectedIndices(new Set<number>(processedPreview.map((p: any) => p.index as number)))
      toast.success('Arquivo analisado com sucesso!')

    } catch (error) {
      console.error('[Import JSON] Erro:', error)
      toast.error('Erro ao processar', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // ==============================================================================
  // CRIACAO (INSERT)
  // ==============================================================================
  async function handleCreate() {
    if (!preview || selectedIndices.size === 0) return

    setCreating(true)

    try {
      // Preparar Supabase Client
      const supabase = createBrowserClient()
      if (!supabase) throw new Error('Cliente Supabase nao inicializado')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        if (/auth session missing/i.test(userError.message || '')) {
          throw new Error('Sessao expirada. Faca login novamente e tente importar.')
        }
        throw new Error(userError.message || 'Falha ao validar sessao do usuario.')
      }

      if (!user) throw new Error('Usuario nao autenticado')

      const itemsToCreate = preview.preview
        .filter((p: any) => selectedIndices.has(p.index))

      const resultados = { total: itemsToCreate.length, criados: 0, erros: 0, detalhes: [] as any[] }

      // Processar em lote ou sequencial?
      // Sequencial é mais seguro para feedback de progresso e tratamento de erro individual
      for (let i = 0; i < itemsToCreate.length; i++) {
        const item = itemsToCreate[i]
        const precatorio = item.dados

        try {
          const precatorioSafe: JsonRecord = precatorio && typeof precatorio === 'object' ? precatorio : {}

          const credorNome = normalizarTexto(getFirstValue(precatorioSafe, ['credor_nome', 'credor', 'nome_credor']))
          const numeroPrecatorio = normalizarTexto(getFirstValue(precatorioSafe, ['numero_precatorio', 'numero']))
          const numeroProcesso = normalizarTexto(getFirstValue(precatorioSafe, ['numero_processo', 'processo']))
          const tituloOrigem = normalizarTexto(getFirstValue(precatorioSafe, ['titulo']))
          const tituloFallback = `Precatorio importado #${item.index + 1}`
          const tituloAuto =
            tituloOrigem ||
            [numeroPrecatorio, numeroProcesso, credorNome].filter(Boolean).join(' - ') ||
            tituloFallback

          const dadosNormalizados: any = {
            titulo: tituloAuto,
            criado_por: user.id,
            responsavel: user.id,
            dono_usuario_id: user.id,
            status: 'novo',
            status_kanban: 'entrada',
            localizacao_kanban: 'entrada',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          if (credorNome) dadosNormalizados.credor_nome = credorNome
          if (numeroPrecatorio) dadosNormalizados.numero_precatorio = numeroPrecatorio
          if (numeroProcesso) dadosNormalizados.numero_processo = numeroProcesso

          STRING_FIELDS.forEach((field) => {
            const value = getFirstValue(precatorioSafe, [field, ...(FIELD_ALIASES[field] || [])])
            if (value === undefined || value === null) return

            if (field === 'esfera_devedor') {
              const esfera = normalizarEsferaDevedor(normalizarTexto(value))
              if (esfera) dadosNormalizados[field] = esfera
              return
            }

            if (field === 'natureza') {
              const natureza = normalizarNatureza(value)
              if (natureza) dadosNormalizados[field] = natureza
              return
            }

            if (field === 'status') {
              const status = normalizarStatus(value)
              if (status) dadosNormalizados[field] = status
              return
            }

            if (field === 'status_kanban') {
              const statusKanban = normalizarStatusKanban(value)
              if (statusKanban) dadosNormalizados[field] = statusKanban
              return
            }

            if (field === 'localizacao_kanban') {
              const localizacao = normalizarStatusKanban(value)
              if (localizacao) dadosNormalizados[field] = localizacao
              return
            }

            if (field === 'prioridade') {
              const prioridade = normalizarPrioridade(value)
              if (prioridade) dadosNormalizados[field] = prioridade
              return
            }

            if (UUID_FIELDS.has(field)) {
              const uuid = normalizarUuid(value)
              if (uuid) dadosNormalizados[field] = uuid
              return
            }

            const textValue = normalizarTexto(value)
            if (!textValue) return
            dadosNormalizados[field] = textValue
          })

          dadosNormalizados.status = normalizarStatus(dadosNormalizados.status) || 'novo'
          dadosNormalizados.status_kanban = normalizarStatusKanban(dadosNormalizados.status_kanban) || 'entrada'
          dadosNormalizados.localizacao_kanban =
            normalizarStatusKanban(dadosNormalizados.localizacao_kanban) || dadosNormalizados.status_kanban
          const prioridadeNormalizada = normalizarPrioridade(dadosNormalizados.prioridade)
          if (prioridadeNormalizada) {
            dadosNormalizados.prioridade = prioridadeNormalizada
          } else {
            delete dadosNormalizados.prioridade
          }

          const cpfCnpj = normalizarTexto(getFirstValue(precatorioSafe, ['credor_cpf_cnpj']))
          if (cpfCnpj) {
            const cleanCpfCnpj = normalizarCPFCNPJ(cpfCnpj)
            if (cleanCpfCnpj) dadosNormalizados.credor_cpf_cnpj = cleanCpfCnpj
          }

          const credorUfAlias = normalizarTexto(getFirstValue(precatorioSafe, ['credor_uf', 'estado', 'uf']))
          if (credorUfAlias) dadosNormalizados.credor_uf = credorUfAlias.toUpperCase()

          const credorCepAlias = normalizarTexto(getFirstValue(precatorioSafe, ['credor_cep', 'cep']))
          if (credorCepAlias) dadosNormalizados.credor_cep = credorCepAlias.replace(/\D/g, '')

          const credorCidadeAlias = normalizarTexto(getFirstValue(precatorioSafe, ['credor_cidade', 'cidade']))
          if (credorCidadeAlias) dadosNormalizados.credor_cidade = credorCidadeAlias

          const credorEnderecoAlias = normalizarTexto(
            getFirstValue(precatorioSafe, ['credor_endereco', 'endereco_completo', 'endereco'])
          )
          if (credorEnderecoAlias) dadosNormalizados.credor_endereco = credorEnderecoAlias

          NUMERIC_FIELDS.forEach((field) => {
            const value = getFirstValue(precatorioSafe, [field, ...(FIELD_ALIASES[field] || [])])
            confirmFloat(dadosNormalizados, field, value)
          })

          DATE_FIELDS.forEach((field) => {
            const value = getFirstValue(precatorioSafe, [field, ...(FIELD_ALIASES[field] || [])])
            confirmDate(dadosNormalizados, field, value)
          })

          BOOLEAN_FIELDS.forEach((field) => {
            const value = getFirstValue(precatorioSafe, [field, ...(FIELD_ALIASES[field] || [])])
            confirmBoolean(dadosNormalizados, field, value)
          })

          const observacoesOrganizadas = composeObservacoes(precatorioSafe)
          if (observacoesOrganizadas) dadosNormalizados.observacoes = observacoesOrganizadas

          const contatosNormalizados = normalizeContatos(
            getFirstValue(precatorioSafe, ['contatos', 'contato', 'dados_contato'])
          )
          if (contatosNormalizados) dadosNormalizados.contatos = contatosNormalizados

          const rawText = normalizarTexto(
            getFirstValue(precatorioSafe, ['raw_text', 'texto', 'texto_extraido', 'detalhes.raw_text'])
          )
          if (rawText) dadosNormalizados.raw_text = rawText
          const { criado, colunasRemovidas } = await inserirPrecatorioResiliente(supabase, dadosNormalizados)
          if (colunasRemovidas.length > 0) {
            console.warn(
              `[Import JSON] Colunas ignoradas para compatibilidade no item ${item.index}:`,
              colunasRemovidas
            )
          }

          resultados.criados++
          resultados.detalhes.push({
            index: item.index,
            sucesso: true,
            credor_nome: dadosNormalizados.credor_nome,
            precatorio_id: criado.id
          })

        } catch (err: any) {
          console.error(`Erro ao criar item ${item.index}:`, err)
          resultados.erros++
          resultados.detalhes.push({
            index: item.index,
            sucesso: false,
            credor_nome: precatorio.credor_nome || 'Desconhecido',
            erro: formatSupabaseError(err)
          })
        }
      }

      setResult(resultados)

      if (resultados.criados > 0) {
        toast.success('Processamento concluído', {
          description: `${resultados.criados} precatórios criados com sucesso.`
        })
        if (onSuccess) onSuccess()
      } else {
        toast.warning('Nenhum precatório foi criado.')
      }

    } catch (error) {
      console.error('[Import Create] Erro Geral:', error)
      toast.error('Erro crítico na importação')
    } finally {
      setCreating(false)
    }
  }

  function toggleSelection(index: number) {
    const newSelected = new Set(selectedIndices)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIndices(newSelected)
  }

  function toggleSelectAll() {
    if (!preview) return

    if (selectedIndices.size === preview.preview.filter((p: any) => p.valido).length) {
      setSelectedIndices(new Set<number>())
    } else {
      const allValid = new Set<number>(
        preview.preview
          .filter((p: any) => p.valido)
          .map((p: any) => p.index as number)
      )
      setSelectedIndices(allValid)
    }
  }

  function handleClose() {
    setPreview(null)
    setResult(null)
    setSelectedIndices(new Set())
    onOpenChange(false)
  }

  function downloadTemplate() {
    const template = {
      precatorios: [
        {
          numero_precatorio: "0000000-00.2024.8.00.0000",
          numero_processo: "0000000-00.2024.8.00.0000",
          numero_oficio: "OF-2024-0001",
          credor_nome: "Nome do Credor",
          credor_cpf_cnpj: "000.000.000-00",
          natureza: "Alimentar",
          valor_principal: 10000.00,
          valor_atualizado: 12000.00,
          tribunal: "TJSP",
          esfera_devedor: "ESTADO",
          devedor: "Fazenda Publica",
          data_base: "2024-01-15",
          data_expedicao: "2024-02-20",
          advogado_nome: "Advogado Exemplo",
          advogado_oab: "SP123456",
          banco: "Banco do Brasil",
          agencia: "1234",
          conta: "98765-4",
          tipo_conta: "corrente",
          observacoes: "Observacoes livres do caso",
          pontos_importantes: [
            "Precatorio com prioridade por idade",
            "Documentacao principal ja validada"
          ],
          detalhes: {
            resumo: "Resumo dos detalhes extraidos",
            pontos_importantes: [
              "Necessario confirmar dados bancarios",
              "Existe pendencia de certidao complementar"
            ]
          }
        }
      ]
    }
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-precatorios.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Importar Precatórios via JSON (Local)
          </DialogTitle>
          <DialogDescription>
            Importação direta pelo navegador. Certifique-se de que os dados estão corretos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload */}
          {!preview && !result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivo JSON
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>ðŸ“‹ <strong>Formato esperado:</strong></p>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                  {`{
  "precatorios": [
    {
      "credor_nome": "João Silva",
      "valor_principal": 50000,
      ...
    }
  ]
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && !result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Validar Dados</p>
                  {preview.total > PREVIEW_ROW_LIMIT && (
                    <p className="text-xs text-muted-foreground">
                      Mostrando os primeiros {PREVIEW_ROW_LIMIT} itens para manter a interface responsiva.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {preview.total} encontrados â€¢ {selectedIndices.size} selecionados para importação
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                  >
                    {selectedIndices.size === preview.preview.filter((p: any) => p.valido).length
                      ? 'Desmarcar Todos'
                      : 'Selecionar Todos'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setPreview(null)
                    setSelectedIndices(new Set())
                  }}>
                    Cancelar
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIndices.size > 0 && selectedIndices.size === preview.preview.filter((p: any) => p.valido).length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Nome / Credor</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.preview.slice(0, PREVIEW_ROW_LIMIT).map((item: any) => (
                      <TableRow key={item.index}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIndices.has(item.index)}
                            onCheckedChange={() => toggleSelection(item.index)}
                            disabled={!item.valido}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.dados.credor_nome || 'Sem Nome'}</span>
                            <span className="text-xs text-muted-foreground">{item.dados.numero_processo || item.dados.numero_precatorio || 'Sem Nº'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.dados.valor_principal ?
                            BRL_FORMATTER.format(item.dados.valor_principal)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{item.dados.credor_cpf_cnpj || '-'}</TableCell>
                        <TableCell>
                          {item.valido ? (
                            <Badge variant="default" className="bg-primary/15 hover:bg-primary/15">OK</Badge>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Badge variant="destructive">Inválido</Badge>
                              {item.avisos.map((avi: string, idx: number) => (
                                <span key={idx} className="text-[10px] text-destructive leading-tight">{avi}</span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Resultado da Importação</p>
                  <p className="text-sm text-muted-foreground">
                    {result.criados} criados com sucesso â€¢ {result.erros} erros
                  </p>
                </div>
              </div>

              <ScrollArea className="h-[400px] border rounded bg-muted/20">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.detalhes.map((item: any) => (
                      <TableRow key={item.index}>
                        <TableCell>{item.credor_nome}</TableCell>
                        <TableCell>
                          {item.sucesso ? (
                            <Badge variant="default" className="bg-primary/15">Criado</Badge>
                          ) : (
                            <Badge variant="destructive">Erro</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.sucesso ? 'Importado com sucesso' : item.erro}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {preview && !result && (
            <Button
              onClick={handleCreate}
              disabled={creating || selectedIndices.size === 0}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando {selectedIndices.size} itens...
                </>
              ) : (
                `Confirmar Importação`
              )}
            </Button>
          )}
          {result && (
            <Button onClick={handleClose}>
              Concluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
