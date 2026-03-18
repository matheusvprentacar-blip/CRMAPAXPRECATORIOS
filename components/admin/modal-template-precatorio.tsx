"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Loader2 } from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type TemplateItem = Record<string, any>

interface ModalTemplatePrecatorioProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  createdById?: string | null
}

type OperatorInfo = {
  id: string
  nome: string
  role: string[]
}

type TemplateItemInfo = {
  key: string
  data: TemplateItem
  value: number
  label: string
}

const ALLOWED_COLUMNS = new Set([
  "titulo",
  "numero_precatorio",
  "numero_processo",
  "numero_oficio",
  "tribunal",
  "devedor",
  "esfera_devedor",
  "credor_nome",
  "credor_cpf_cnpj",
  "credor_data_nascimento",
  "credor_profissao",
  "credor_estado_civil",
  "credor_telefone",
  "credor_email",
  "credor_endereco",
  "credor_cidade",
  "credor_uf",
  "credor_cep",
  "conjuge_nome",
  "conjuge_cpf_cnpj",
  "advogado_nome",
  "advogado_cpf_cnpj",
  "advogado_oab",
  "advogado_telefone",
  "herdeiro",
  "herdeiro_cpf",
  "herdeiro_telefone",
  "herdeiro_endereco",
  "cessionario",
  "natureza",
  "valor_principal",
  "valor_atualizado",
  "valor_juros",
  "valor_selic",
  "saldo_liquido",
  "pss_percentual",
  "pss_valor",
  "irpf_valor",
  "honorarios_percentual",
  "honorarios_valor",
  "adiantamento_percentual",
  "adiantamento_valor",
  "proposta_menor_percentual",
  "proposta_maior_percentual",
  "proposta_menor_valor",
  "proposta_maior_valor",
  "data_base",
  "data_expedicao",
  "data_calculo",
  "previsao_pagamento",
  "loa",
  "ano_orcamentario",
  "score_complexidade",
  "sla_horas",
  "data_entrada_calculo",
  "data_atraso_calculo",
  "status",
  "status_kanban",
  "localizacao_kanban",
  "prioridade",
  "titular_falecido",
  "urgente",
  "irpf_isento",
  "contatos",
  "banco",
  "agencia",
  "conta",
  "tipo_conta",
  "chave_pix",
  "tipo_chave_pix",
  "observacoes_bancarias",
  "motivo_atraso_calculo",
  "tipo_atraso",
  "impacto_atraso",
  "observacoes_escrituras",
  "analise_penhora",
  "analise_cessao",
  "analise_herdeiros",
  "analise_viavel",
  "analise_observacoes",
  "analise_penhora_valor",
  "analise_penhora_percentual",
  "analise_cessao_valor",
  "analise_cessao_percentual",
  "analise_adiantamento_valor",
  "analise_adiantamento_percentual",
  "analise_honorarios_valor",
  "analise_honorarios_percentual",
  "analise_itcmd",
  "analise_itcmd_valor",
  "analise_itcmd_percentual",
  "observacoes",
  "raw_text",
  "dono_usuario_id",
  "responsavel_calculo_id",
  "responsavel_escrituras_id",
  "responsavel",
  "criado_por",
])

const NUMERIC_FIELDS = new Set([
  "valor_principal",
  "valor_atualizado",
  "valor_juros",
  "valor_selic",
  "saldo_liquido",
  "pss_percentual",
  "pss_valor",
  "irpf_valor",
  "honorarios_percentual",
  "honorarios_valor",
  "adiantamento_percentual",
  "adiantamento_valor",
  "proposta_menor_percentual",
  "proposta_maior_percentual",
  "proposta_menor_valor",
  "proposta_maior_valor",
  "ano_orcamentario",
  "score_complexidade",
  "sla_horas",
  "analise_penhora_valor",
  "analise_penhora_percentual",
  "analise_cessao_valor",
  "analise_cessao_percentual",
  "analise_adiantamento_valor",
  "analise_adiantamento_percentual",
  "analise_honorarios_valor",
  "analise_honorarios_percentual",
  "analise_itcmd_valor",
  "analise_itcmd_percentual",
])

const DATE_FIELDS = new Set([
  "credor_data_nascimento",
  "data_base",
  "data_expedicao",
  "data_calculo",
  "previsao_pagamento",
  "loa",
  "data_entrada_calculo",
  "data_atraso_calculo",
])

const BOOLEAN_FIELDS = new Set([
  "titular_falecido",
  "urgente",
  "irpf_isento",
  "analise_penhora",
  "analise_cessao",
  "analise_viavel",
  "analise_itcmd",
])

const UUID_FIELDS = new Set([
  "dono_usuario_id",
  "responsavel_calculo_id",
  "responsavel_escrituras_id",
  "responsavel",
  "criado_por",
])

const STATUS_VALIDOS = new Set([
  "novo",
  "em_andamento",
  "em_contato",
  "em_calculo",
  "calculado",
  "aguardando_cliente",
  "concluido",
  "cancelado",
  "fila_calculo",
  "entrada",
  "triagem_interesse",
  "aguardando_oficio",
  "docs_credor",
  "analise_processual_inicial",
  "analise_juridica",
  "recalculo_pos_juridico",
  "pronto_calculo",
  "calculo_andamento",
  "juridico",
  "calculo_concluido",
  "proposta_negociacao",
  "proposta_aceita",
  "certidoes",
  "escrituras",
  "fechado",
  "encerrados",
  "reprovado",
  "nao_elegivel",
  "credito_vendido",
  "pos_fechamento",
  "pausado_credor",
  "pausado_documentos",
  "sem_interesse",
])

const STATUS_KANBAN_VALIDOS = new Set([
  "entrada",
  "triagem_interesse",
  "aguardando_oficio",
  "analise_processual_inicial",
  "docs_credor",
  "pronto_calculo",
  "calculo_andamento",
  "juridico",
  "calculo_concluido",
  "proposta_negociacao",
  "proposta_aceita",
  "certidoes",
  "escrituras",
  "fechado",
  "pos_fechamento",
  "pausado_credor",
  "pausado_documentos",
  "sem_interesse",
  "reprovado",
  "analise_juridica",
  "recalculo_pos_juridico",
  "encerrados",
])

const PRIORIDADES_VALIDAS = new Set(["baixa", "media", "alta", "urgente"])
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ACCEPTED_TEMPLATE_FIELDS = Array.from(ALLOWED_COLUMNS).sort()

const EXTRA_SUPPORTED_INPUT_FIELDS = [
  "numero",
  "processo",
  "numero_do_processo",
  "credor",
  "nome_credor",
  "estado",
  "uf",
  "cidade",
  "cep",
  "endereco",
  "endereco_completo",
  "oab",
  "advogado.nome",
  "natureza_precatorio",
  "tipo_precatorio",
  "comum_ou_alimentar",
  "datas.previsao_pagamento",
  "datas.previsao",
  "datas.data_base",
  "datas.base",
  "datas.data_expedicao",
  "datas.expedicao",
  "datas.data_calculo",
  "datas.calculo",
  "texto",
  "texto_extraido",
  "observacao",
  "obs",
  "resumo",
  "detalhes.resumo",
  "detalhes.texto",
  "pontos_importantes",
  "pontos_chave",
  "highlights",
  "detalhes.pontos_importantes",
  "detalhes.pontos_chave",
  "detalhes.highlights",
  "contato",
  "dados_contato",
].sort()

function buildDefaultTemplateJson() {
  const defaultItem: Record<string, unknown> = {}

  Array.from(ALLOWED_COLUMNS).forEach((field) => {
    if (NUMERIC_FIELDS.has(field)) {
      defaultItem[field] = 0
      return
    }
    if (BOOLEAN_FIELDS.has(field)) {
      defaultItem[field] = false
      return
    }
    if (DATE_FIELDS.has(field)) {
      defaultItem[field] = "2026-01-01"
      return
    }
    defaultItem[field] = ""
  })

  Object.assign(defaultItem, {
    titulo: "Precatorio Exemplo",
    numero_precatorio: "0000000-00.0000.0.00.0000",
    numero_processo: "0000000-00.0000.0.00.0000",
    numero_oficio: "OF-2026-0001",
    tribunal: "TJSP",
    devedor: "Fazenda Publica",
    esfera_devedor: "ESTADO",
    natureza: "Comum",
    credor_nome: "Nome do Credor",
    credor_cpf_cnpj: "000.000.000-00",
    credor_telefone: "(11) 90000-0000",
    credor_email: "credor@email.com",
    advogado_nome: "Nome do Advogado",
    advogado_oab: "SP123456",
    valor_principal: 1000000,
    valor_atualizado: 1200000,
    data_base: "2024-01-15",
    data_expedicao: "2024-03-10",
    previsao_pagamento: "2026-12-20",
    status: "novo",
    status_kanban: "entrada",
    localizacao_kanban: "entrada",
    prioridade: "media",
    criado_por: "",
    dono_usuario_id: "",
    responsavel: "",
    responsavel_calculo_id: "",
    responsavel_escrituras_id: "",
    contatos: {
      whatsapp: "(11) 90000-0000",
      email: "credor@email.com",
    },
    observacoes: "Observacoes livres",
    pontos_importantes: [
      "Prioridade por idade",
      "Documentacao principal validada",
    ],
    detalhes: {
      resumo: "Resumo extraido automaticamente",
      pontos_importantes: [
        "Confirmar dados bancarios",
        "Existe pendencia de certidao complementar",
      ],
    },
  })

  return JSON.stringify([defaultItem], null, 2)
}

const DEFAULT_TEMPLATE = buildDefaultTemplateJson()

function normalizeNatureza(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined

  const raw = String(value).trim()
  if (!raw) return undefined

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  if (normalized.includes("alimentar")) return "Alimentar"
  if (normalized.includes("comum")) return "Comum"

  return raw
}

function normalizeToken(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const raw = String(value).trim()
  if (!raw) return undefined

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")

  if (!normalized) return undefined
  if (normalized === "encerrado") return "encerrados"
  return normalized
}

function normalizeStatus(value: unknown): string | undefined {
  const normalized = normalizeToken(value)
  return normalized && STATUS_VALIDOS.has(normalized) ? normalized : undefined
}

function normalizeStatusKanban(value: unknown): string | undefined {
  const normalized = normalizeToken(value)
  return normalized && STATUS_KANBAN_VALIDOS.has(normalized) ? normalized : undefined
}

function normalizePrioridade(value: unknown): string | undefined {
  const normalized = normalizeToken(value)
  return normalized && PRIORIDADES_VALIDAS.has(normalized) ? normalized : undefined
}

function normalizeUuid(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim()
  if (!text) return undefined
  const lower = text.toLowerCase()
  if (lower === "none" || lower === "null" || lower === "undefined") return undefined
  return UUID_REGEX.test(text) ? text : undefined
}

function formatSupabaseError(error: any): string {
  if (!error) return "Erro desconhecido"
  const parts = [error.code, error.message, error.details, error.hint]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(" | ") : "Erro desconhecido"
}

function normalizeTemplate(raw: string): TemplateItem[] {
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) return parsed
  if (parsed?.precatorios && Array.isArray(parsed.precatorios)) return parsed.precatorios
  if (parsed?.items && Array.isArray(parsed.items)) return parsed.items
  if (parsed && typeof parsed === "object") return [parsed]
  throw new Error("Template invalido. Envie um array ou um objeto JSON.")
}

function coerceNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "number") return value
  if (typeof value !== "string") return undefined
  const cleaned = value
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}

function coerceBoolean(value: any): boolean | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "sim", "yes", "y", "s"].includes(normalized)) return true
    if (["false", "0", "nao", "não", "no", "n"].includes(normalized)) return false
  }
  return undefined
}

function normalizeDate(value: any): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)

  const raw = String(value).trim()
  if (!raw) return undefined
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const br = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)

  return undefined
}

function getByPath(source: TemplateItem, path: string): any {
  if (!path.includes(".")) return source?.[path]
  return path.split(".").reduce<any>((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), source)
}

function getFirstValue(source: TemplateItem, paths: string[]): any {
  for (const path of paths) {
    const value = getByPath(source, path)
    if (value === null || value === undefined) continue
    if (typeof value === "string" && !value.trim()) continue
    return value
  }
  return undefined
}

function toTextList(value: any): string[] {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) return value.flatMap((item) => toTextList(item))
  if (typeof value === "string") {
    const text = value.trim()
    if (!text) return []
    return text
      .split(/\r?\n|;/)
      .map((part) => part.trim())
      .filter(Boolean)
  }
  if (typeof value === "number" || typeof value === "boolean") return [String(value)]
  return []
}

function normalizeContatos(value: any): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (Array.isArray(value)) {
    const entries = value.flatMap((item) => toTextList(item))
    return entries.length > 0 ? entries.join("\n") : undefined
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, val]) => {
        const text = String(val ?? "").trim()
        return text ? `${key}: ${text}` : ""
      })
      .filter(Boolean)
    return entries.length > 0 ? entries.join("\n") : undefined
  }
  const text = String(value).trim()
  return text || undefined
}

function composeObservacoes(item: TemplateItem): string | undefined {
  const blocos: string[] = []
  const observacaoDireta = String(getFirstValue(item, ["observacoes", "observacao", "obs"]) ?? "").trim()
  if (observacaoDireta) blocos.push(observacaoDireta)

  const detalheResumo = String(getFirstValue(item, ["resumo", "detalhes.resumo", "detalhes.texto"]) ?? "").trim()
  if (detalheResumo) blocos.push(`Detalhes: ${detalheResumo}`)

  const pontosImportantes = [
    ...toTextList(getFirstValue(item, ["pontos_importantes", "pontos_chave", "highlights"])),
    ...toTextList(getFirstValue(item, ["detalhes.pontos_importantes", "detalhes.pontos_chave", "detalhes.highlights"])),
  ]
    .map((value) => value.trim())
    .filter(Boolean)

  if (pontosImportantes.length > 0) {
    blocos.push(`Pontos importantes:\n${pontosImportantes.map((value) => `- ${value}`).join("\n")}`)
  }

  return blocos.length > 0 ? blocos.join("\n\n") : undefined
}

function buildTitulo(item: TemplateItem, index: number) {
  const numero = item.numero_precatorio || item.numero || ""
  const credor = item.credor_nome || item.credor || ""
  if (item.titulo && String(item.titulo).trim()) return String(item.titulo)
  if (numero && credor) return `Precatorio ${numero} - ${credor}`
  if (numero) return `Precatorio ${numero}`
  if (credor) return `Precatorio - ${credor}`
  return `Precatorio sem dados #${index + 1}`
}

function getTemplateValue(item: TemplateItem): number {
  const valorAtualizado = coerceNumber(item.valor_atualizado) ?? 0
  const valorPrincipal = coerceNumber(item.valor_principal) ?? 0
  return valorAtualizado > 0 ? valorAtualizado : valorPrincipal
}

function buildTemplateLabel(item: TemplateItem, index: number) {
  return (
    item.titulo ||
    item.numero_precatorio ||
    item.credor_nome ||
    `Precatorio #${index + 1}`
  )
}

function shuffleArray<T>(items: T[]) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildDistribution(
  items: TemplateItemInfo[],
  operatorIds: string[],
  outlierMultiplier: number,
  outlierAssignments: Record<string, string | undefined>
) {
  if (operatorIds.length === 0) {
    return {
      assignments: {} as Record<string, string[]>,
      sums: {} as Record<string, number>,
      outliers: items,
      eligible: [] as TemplateItemInfo[],
      total: 0,
      target: 0,
    }
  }

  const total = items.reduce((acc, item) => acc + (item.value || 0), 0)
  const target = operatorIds.length > 0 ? total / operatorIds.length : 0
  const limit = target > 0 ? target * Math.max(outlierMultiplier, 1) : Number.POSITIVE_INFINITY

  const outliers = items.filter((item) => item.value > limit)
  const outlierKeys = new Set(outliers.map((item) => item.key))
  const eligible = items.filter((item) => !outlierKeys.has(item.key))

  const sorted = shuffleArray(eligible).sort((a, b) => {
    const diff = (b.value || 0) - (a.value || 0)
    if (Math.abs(diff) < 0.01) return Math.random() - 0.5
    return diff
  })

  const sums: Record<string, number> = {}
  const assignments: Record<string, string[]> = {}
  operatorIds.forEach((id) => {
    sums[id] = 0
    assignments[id] = []
  })

  sorted.forEach((item) => {
    const minSum = Math.min(...operatorIds.map((id) => sums[id]))
    const candidates = operatorIds.filter((id) => Math.abs(sums[id] - minSum) < 0.01)
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    assignments[pick].push(item.key)
    sums[pick] += item.value || 0
  })

  outliers.forEach((item) => {
    const assigned = outlierAssignments[item.key]
    if (assigned && assignments[assigned]) {
      assignments[assigned].push(item.key)
      sums[assigned] += item.value || 0
    }
  })

  const pendingOutliers = outliers.filter((item) => !outlierAssignments[item.key])

  return {
    assignments,
    sums,
    outliers: pendingOutliers,
    eligible,
    total,
    target,
  }
}

function sanitizePayload(item: TemplateItem, index: number, createdById?: string | null) {
  const payload: Record<string, any> = {}
  Object.keys(item || {}).forEach((key) => {
    if (!ALLOWED_COLUMNS.has(key)) return
    if (UUID_FIELDS.has(key)) {
      const normalized = normalizeUuid(item[key])
      if (normalized) payload[key] = normalized
      return
    }
    if (NUMERIC_FIELDS.has(key)) {
      const coerced = coerceNumber(item[key])
      if (coerced !== undefined) payload[key] = coerced
      return
    }
    if (BOOLEAN_FIELDS.has(key)) {
      const coerced = coerceBoolean(item[key])
      if (coerced !== undefined) payload[key] = coerced
      return
    }
    if (DATE_FIELDS.has(key)) {
      const normalized = normalizeDate(item[key])
      if (normalized) payload[key] = normalized
      return
    }
    if (item[key] === undefined || item[key] === null) return
    if (typeof item[key] === "string") {
      const text = item[key].trim()
      if (!text) return
      payload[key] = text
      return
    }
    payload[key] = item[key]
  })

  if (!payload.tribunal && item?.vara_origem) {
    payload.tribunal = item.vara_origem
  }

  if (!payload.advogado_nome && typeof item?.advogado === "string" && item.advogado.trim()) {
    payload.advogado_nome = item.advogado.trim()
  }

  if (!payload.advogado_nome && typeof item?.advogado?.nome === "string" && item.advogado.nome.trim()) {
    payload.advogado_nome = item.advogado.nome.trim()
  }

  if (!payload.credor_endereco && typeof item?.endereco_completo === "string" && item.endereco_completo.trim()) {
    payload.credor_endereco = item.endereco_completo.trim()
  }

  if (!payload.credor_uf && typeof item?.estado === "string" && item.estado.trim()) {
    payload.credor_uf = item.estado.trim().toUpperCase()
  }

  if (!payload.credor_cidade && typeof item?.cidade === "string" && item.cidade.trim()) {
    payload.credor_cidade = item.cidade.trim()
  }

  if (!payload.credor_cep && typeof item?.cep === "string" && item.cep.trim()) {
    payload.credor_cep = item.cep.replace(/\D/g, "")
  }

  const naturezaFonte =
    payload.natureza ??
    item?.natureza ??
    item?.tipo_natureza ??
    item?.natureza_precatorio ??
    item?.tipo_precatorio ??
    item?.comum_ou_alimentar
  const naturezaNormalizada = normalizeNatureza(naturezaFonte)
  if (naturezaNormalizada) {
    payload.natureza = naturezaNormalizada
  } else if (payload.natureza !== undefined) {
    delete payload.natureza
  }

  const observacoesOrganizadas = composeObservacoes(item)
  if (observacoesOrganizadas) payload.observacoes = observacoesOrganizadas

  const contatosFonte = getFirstValue(item, ["contatos", "contato", "dados_contato"])
  const contatosNormalizados = normalizeContatos(contatosFonte)
  if (contatosNormalizados) payload.contatos = contatosNormalizados

  DATE_FIELDS.forEach((field) => {
    if (payload[field]) return
    const normalized = normalizeDate(getFirstValue(item, [field, `datas.${field}`]))
    if (normalized) payload[field] = normalized
  })

  BOOLEAN_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) return
    const coerced = coerceBoolean(getFirstValue(item, [field]))
    if (coerced !== undefined) payload[field] = coerced
  })

  const statusNormalizado = normalizeStatus(payload.status)
  const statusKanbanNormalizado = normalizeStatusKanban(payload.status_kanban)
  const localizacaoNormalizada = normalizeStatusKanban(payload.localizacao_kanban)
  const prioridadeNormalizada = normalizePrioridade(payload.prioridade)

  payload.titulo = buildTitulo({ ...item, titulo: payload.titulo }, index)
  payload.criado_por = normalizeUuid(payload.criado_por) || normalizeUuid(createdById) || null
  payload.status = statusNormalizado || "novo"
  payload.status_kanban = statusKanbanNormalizado || "entrada"
  payload.localizacao_kanban = localizacaoNormalizada || payload.status_kanban
  if (prioridadeNormalizada) {
    payload.prioridade = prioridadeNormalizada
  } else {
    delete payload.prioridade
  }

  return payload
}

function extrairColunaInexistente(error: any): string | null {
  const message = String(error?.message || "")
  const details = String(error?.details || "")
  const hint = String(error?.hint || "")
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
  payload: Record<string, any>
) {
  const payloadMutavel: Record<string, any> = { ...payload }
  const colunasRemovidas: string[] = []
  const maxTentativas = 8

  for (let tentativa = 0; tentativa <= maxTentativas; tentativa += 1) {
    const { error } = await supabase.from("precatorios").insert(payloadMutavel)
    if (!error) return { colunasRemovidas }

    const colunaInexistente = extrairColunaInexistente(error)
    if (!colunaInexistente || !(colunaInexistente in payloadMutavel)) {
      throw error
    }

    delete payloadMutavel[colunaInexistente]
    colunasRemovidas.push(colunaInexistente)
  }

  throw new Error("Nao foi possivel inserir: payload incompativel com o schema atual.")
}

export function ModalTemplatePrecatorio({ open, onOpenChange, onSuccess, createdById }: ModalTemplatePrecatorioProps) {
  const [rawJson, setRawJson] = useState(DEFAULT_TEMPLATE)
  const [parseError, setParseError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastResult, setLastResult] = useState<{ ok: number; fail: number; errors: string[] } | null>(null)
  const [step, setStep] = useState<"edit" | "distribute">("edit")
  const [operators, setOperators] = useState<OperatorInfo[]>([])
  const [operatorsInitialized, setOperatorsInitialized] = useState(false)
  const [selectedOperatorIds, setSelectedOperatorIds] = useState<string[]>([])
  const [approvedOperators, setApprovedOperators] = useState<Record<string, boolean>>({})
  const [outlierMultiplier, setOutlierMultiplier] = useState(1.6)
  const [outlierAssignments, setOutlierAssignments] = useState<Record<string, string | undefined>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => {
    try {
      return { items: normalizeTemplate(rawJson), error: null as string | null }
    } catch (error: any) {
      return { items: [] as TemplateItem[], error: error?.message || "Template invalido" }
    }
  }, [rawJson])

  const parsedItems = parsed.items

  useEffect(() => {
    setParseError(parsed.error)
  }, [parsed.error])

  useEffect(() => {
    if (selectedOperatorIds.length === 0) {
      setApprovedOperators({})
      setOutlierAssignments({})
      return
    }
    setApprovedOperators((prev) => {
      const next: Record<string, boolean> = {}
      selectedOperatorIds.forEach((id) => {
        if (prev[id]) next[id] = prev[id]
      })
      return next
    })
    setOutlierAssignments((prev) => {
      const next: Record<string, string | undefined> = {}
      Object.entries(prev).forEach(([key, value]) => {
        if (value && selectedOperatorIds.includes(value)) {
          next[key] = value
        }
      })
      return next
    })
  }, [selectedOperatorIds])

  const templateItems: TemplateItemInfo[] = useMemo(
    () =>
      parsedItems.map((item, index) => ({
        key: `item-${index}`,
        data: item,
        value: getTemplateValue(item),
        label: buildTemplateLabel(item, index),
      })),
    [parsedItems]
  )

  const distributionPreview = useMemo(
    () => buildDistribution(templateItems, selectedOperatorIds, outlierMultiplier, outlierAssignments),
    [templateItems, selectedOperatorIds, outlierMultiplier, outlierAssignments]
  )

  const allOperatorsApproved = selectedOperatorIds.every((id) => approvedOperators[id])
  const pendingOutliers = distributionPreview.outliers || []
  const canConfirm =
    selectedOperatorIds.length > 0 &&
    templateItems.length > 0 &&
    pendingOutliers.length === 0 &&
    allOperatorsApproved

  useEffect(() => {
    if (!open) {
      setRawJson(DEFAULT_TEMPLATE)
      setParseError(null)
      setLastResult(null)
      setStep("edit")
      setOutlierAssignments({})
      setApprovedOperators({})
      setOperatorsInitialized(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (operatorsInitialized) return
    const loadOperators = async () => {
      const supabase = createBrowserClient()
      if (!supabase) return
      const { data } = await supabase.from("usuarios").select("id, nome, role").eq("ativo", true)
      const list = (data || []).filter((u) => Array.isArray(u.role) && u.role.includes("operador_comercial"))
      setOperators(list)
      if (selectedOperatorIds.length === 0 && list.length > 0) {
        setSelectedOperatorIds(list.map((op) => op.id))
      }
      setOperatorsInitialized(true)
    }
    loadOperators()
  }, [open, operatorsInitialized, selectedOperatorIds.length])

  const handleFileLoad = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result || "")
      setRawJson(content.trim() || DEFAULT_TEMPLATE)
    }
    reader.readAsText(file)
  }

  const handleSave = async () => {
    if (parseError) return
    if (templateItems.length === 0) {
      toast.error("Nenhum item para importar")
      return
    }
    if (!canConfirm) {
      toast.error("Finalize a distribuicao antes de importar")
      return
    }

    setSaving(true)
    setLastResult(null)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase nao disponivel")

      let userId = createdById
      if (!userId) {
        const { data } = await supabase.auth.getUser()
        userId = data.user?.id || null
      }
      if (!userId) throw new Error("Usuario nao autenticado")

      const assignmentMap = new Map<string, string>()
      Object.entries(distributionPreview.assignments).forEach(([operatorId, keys]) => {
        keys.forEach((key) => assignmentMap.set(key, operatorId))
      })

      const payloads = templateItems.map((item, idx) => {
        const operatorId = assignmentMap.get(item.key)
        const payload = sanitizePayload(item.data, idx, userId)
        payload.dono_usuario_id = operatorId
        payload.responsavel = operatorId
        return payload
      })

      let ok = 0
      let fail = 0
      const errors: string[] = []

      for (let i = 0; i < payloads.length; i += 1) {
        const payload = payloads[i]
        if (!payload.dono_usuario_id) {
          fail += 1
          errors.push(`Item ${i + 1}: sem operador definido`)
          continue
        }
        try {
          const { colunasRemovidas } = await inserirPrecatorioResiliente(supabase, payload)
          if (colunasRemovidas.length > 0) {
            console.warn(
              `[Template Import] Colunas ignoradas para compatibilidade no item ${i + 1}:`,
              colunasRemovidas
            )
          }
          ok += 1
        } catch (error: any) {
          fail += 1
          errors.push(`Item ${i + 1}: ${formatSupabaseError(error)}`)
          console.error(`[Template Import] Falha no item ${i + 1}`, {
            payload,
            error,
          })
        }
      }

      setLastResult({ ok, fail, errors })

      if (ok > 0) {
        toast.success(`${ok} precatorios criados${fail ? ` (${fail} falharam)` : ""}`)
        onSuccess?.()
      }

      if (fail === 0) {
        onOpenChange(false)
      }
    } catch (error: any) {
      toast.error(error?.message || "Erro ao importar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden !bg-[hsl(var(--background))] backdrop-blur-none">
        <DialogHeader>
          <DialogTitle>Importar por Template (JSON)</DialogTitle>
          <DialogDescription>
            Primeiro carregue o JSON, depois distribua para operadores antes de importar.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex-1 min-h-0 overflow-y-auto pr-1">
          {step === "edit" ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setRawJson(DEFAULT_TEMPLATE)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exemplo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileLoad(file)
                  }}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Carregar JSON
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Template JSON</Label>
                <p className="text-xs text-muted-foreground">
                  O template aceita campos opcionais. Campos ausentes sao permitidos. O campo{" "}
                  <code>file_url</code> nao e aceito.
                </p>
                <div className="rounded-md border border-border/60 bg-muted p-2">
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Campos aceitos ({ACCEPTED_TEMPLATE_FIELDS.length}):
                  </p>
                  <div className="max-h-28 overflow-y-auto rounded-md border border-border/50 bg-background px-2 py-1 font-mono text-[11px] leading-5">
                    {ACCEPTED_TEMPLATE_FIELDS.join(", ")}
                  </div>
                </div>
                <div className="rounded-md border border-border/60 bg-muted p-2">
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Aliases/campos extras aceitos para normalizacao ({EXTRA_SUPPORTED_INPUT_FIELDS.length}):
                  </p>
                  <div className="max-h-24 overflow-y-auto rounded-md border border-border/50 bg-background px-2 py-1 font-mono text-[11px] leading-5">
                    {EXTRA_SUPPORTED_INPUT_FIELDS.join(", ")}
                  </div>
                </div>
                <Textarea
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  rows={12}
                  className="font-mono text-xs bg-background"
                />
                {parseError ? (
                  <p className="text-xs text-destructive">{parseError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {templateItems.length} item(ns) pronto(s) para distribuir.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border/60 bg-muted p-3 text-xs space-y-2">
                <p className="font-medium">Resumo rapido</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Itens: {templateItems.length}</Badge>
                  <Badge variant="outline">Campos faltantes sao aceitos</Badge>
                </div>
              </div>

              {lastResult && (
                <div className="rounded-lg border border-border/60 bg-muted p-3 text-xs space-y-2">
                  <p className="font-medium">Resultado</p>
                  <p>
                    {lastResult.ok} criados, {lastResult.fail} falharam.
                  </p>
                  {lastResult.errors.length > 0 && (
                    <ul className="list-disc pl-4 space-y-1">
                      {lastResult.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-lg border border-border/60 bg-muted p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Itens</p>
                    <p className="font-semibold">{templateItems.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor total</p>
                    <p className="font-semibold">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        templateItems.reduce((acc, item) => acc + (item.value || 0), 0)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Alvo por operador</p>
                    <p className="font-semibold">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        distributionPreview.target
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Operadores (comercial)</Label>
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-border/60 p-3 space-y-2">
                    {operators.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhum operador comercial cadastrado.</p>
                    )}
                    {operators.map((op) => (
                      <label key={op.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedOperatorIds.includes(op.id)}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setSelectedOperatorIds((prev) => {
                              if (checked) return Array.from(new Set([...prev, op.id]))
                              return prev.filter((id) => id !== op.id)
                            })
                            setApprovedOperators((prev) => {
                              const next = { ...prev }
                              if (!checked) delete next[op.id]
                              return next
                            })
                          }}
                        />
                        <span>{op.nome}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione quem recebera a distribuicao. Sem operadores nao e possivel importar.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Limite de disparidade (x do alvo)</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      value={outlierMultiplier}
                      onChange={(e) => setOutlierMultiplier(Number(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Distribuicao por operador</Label>
                    <div className="space-y-2">
                      {selectedOperatorIds.map((id) => {
                        const op = operators.find((o) => o.id === id)
                        const count = distributionPreview.assignments[id]?.length || 0
                        const sum = distributionPreview.sums[id] || 0
                        const approved = approvedOperators[id]
                        return (
                          <div key={id} className="rounded-md border border-border/60 bg-background px-3 py-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">{op?.nome || "Operador"}</p>
                                <p className="text-sm font-medium">{count} credito(s)</p>
                              </div>
                              <p className="text-sm font-semibold">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sum)}
                              </p>
                            </div>
                            <label className="mt-2 flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={approved || false}
                                onChange={(e) =>
                                  setApprovedOperators((prev) => ({
                                    ...prev,
                                    [id]: e.target.checked,
                                  }))
                                }
                              />
                              Aprovar distribuicao para este operador
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {pendingOutliers.length > 0 && (
                <div className="rounded-lg border border-primary/40 bg-primary/15 p-3 text-sm text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary">
                  <p className="font-medium">Creditos destoantes precisam de atribuicao manual</p>
                  <div className="mt-2 space-y-2 text-xs">
                    {pendingOutliers.map((item) => (
                      <div key={item.key} className="flex flex-col gap-2 rounded-md border border-primary/40 bg-background p-2">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{item.label}</span>
                          <span>
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.value || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={outlierAssignments[item.key] || ""}
                            onChange={(e) =>
                              setOutlierAssignments((prev) => ({
                                ...prev,
                                [item.key]: e.target.value || undefined,
                              }))
                            }
                            className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                          >
                            <option value="">Selecionar operador</option>
                            {selectedOperatorIds.map((id) => {
                              const op = operators.find((o) => o.id === id)
                              return (
                                <option key={id} value={id}>
                                  {op?.nome || "Operador"}
                                </option>
                              )
                            })}
                          </select>
                          <span className="text-xs text-muted-foreground">Obrigatorio para importar.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          {step === "edit" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={() => setStep("distribute")}
                disabled={saving || !!parseError || templateItems.length === 0}
              >
                Continuar para distribuicao
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("edit")} disabled={saving}>
                Voltar
              </Button>
              <Button onClick={handleSave} disabled={saving || !canConfirm}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Importar distribuidos
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
