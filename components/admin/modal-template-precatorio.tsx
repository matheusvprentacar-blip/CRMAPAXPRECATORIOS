/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, BarChart3, CheckCircle2, Download, FileText, Loader2, ShieldCheck, Upload } from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
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
  "pontos_importantes",
  "detalhes",
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

const ADMIN_DISTRIBUTION_AUDIT_FIELDS = new Set([
  "distribuido_por_admin",
  "distribuido_por_admin_id",
  "distribuido_por_admin_em",
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
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

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

function normalizeEsferaDevedor(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined

  const normalized = String(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()

  if (!normalized) return undefined
  if (normalized === "UNIAO" || normalized === "FEDERAL" || normalized === "UNIAO FEDERAL") return "UNIAO"
  if (normalized === "ESTADO" || normalized === "ESTADUAL") return "ESTADO"
  if (normalized === "MUNICIPIO" || normalized === "MUNICIPAL") return "MUNICIPIO"
  if (normalized === "DF" || normalized === "DISTRITO FEDERAL") return "DF"
  if (normalized === "INDEFINIDO" || normalized === "INDEFINIDA" || normalized === "NAO DEFINIDO") {
    return "INDEFINIDO"
  }

  return undefined
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
  const nestedError =
    (error && typeof error === "object" && "error" in error ? error.error : null) ||
    (error && typeof error === "object" && "cause" in error ? error.cause : null)

  const target = nestedError && typeof nestedError === "object" ? nestedError : error
  const parts = [target?.code, target?.message, target?.details, target?.hint]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
  if (parts.length > 0) return parts.join(" | ")
  if (target instanceof Error && target.message.trim()) return target.message.trim()

  try {
    const serialized = JSON.stringify(target)
    if (serialized && serialized !== "{}") return serialized
  } catch {
    // Ignora falhas de serializacao e cai no fallback final abaixo.
  }

  return "Erro desconhecido"
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

function normalizeAnoOrcamentario(value: unknown): number | undefined {
  const parsed = coerceNumber(value)
  if (parsed === undefined || !Number.isInteger(parsed)) return undefined
  return parsed >= 1900 && parsed <= 2999 ? parsed : undefined
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

function formatCurrency(value: number) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0)
}

function formatSignedCurrency(value: number) {
  const normalized = Number.isFinite(value) ? value : 0
  if (Math.abs(normalized) < 0.005) return formatCurrency(0)
  return `${normalized > 0 ? "+" : "-"}${formatCurrency(Math.abs(normalized))}`
}

function downloadJsonFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
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

  const esferaDevedorNormalizada = normalizeEsferaDevedor(payload.esfera_devedor ?? item?.esfera_devedor)
  if (esferaDevedorNormalizada) {
    payload.esfera_devedor = esferaDevedorNormalizada
  } else if (payload.esfera_devedor !== undefined) {
    delete payload.esfera_devedor
  }

  const pontosImportantesNormalizados = [
    ...toTextList(getFirstValue(item, ["pontos_importantes", "pontos_chave", "highlights"])),
    ...toTextList(getFirstValue(item, ["detalhes.pontos_importantes", "detalhes.pontos_chave", "detalhes.highlights"])),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
  if (pontosImportantesNormalizados.length > 0) {
    payload.pontos_importantes = pontosImportantesNormalizados
  } else if (Array.isArray(item?.pontos_importantes)) {
    payload.pontos_importantes = []
  }

  const detalhesEstruturados = getFirstValue(item, ["detalhes"])
  if (detalhesEstruturados && typeof detalhesEstruturados === "object" && !Array.isArray(detalhesEstruturados)) {
    payload.detalhes = detalhesEstruturados
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

  const anoOrcamentarioNormalizado = normalizeAnoOrcamentario(payload.ano_orcamentario ?? item?.ano_orcamentario)
  if (anoOrcamentarioNormalizado !== undefined) {
    payload.ano_orcamentario = anoOrcamentarioNormalizado
  } else if (payload.ano_orcamentario !== undefined) {
    delete payload.ano_orcamentario
  }

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
  const auditPayload: Record<string, any> = {}
  const colunasRemovidas: string[] = []
  const maxTentativas = 8

  ADMIN_DISTRIBUTION_AUDIT_FIELDS.forEach((field) => {
    if (!(field in payloadMutavel)) return
    auditPayload[field] = payloadMutavel[field]
    delete payloadMutavel[field]
  })

  for (let tentativa = 0; tentativa <= maxTentativas; tentativa += 1) {
    const { data, error } = await supabase
      .from("precatorios")
      .insert(payloadMutavel)
      .select("id")
      .single()
    if (!error) {
      const auditFieldsRestantes = Object.keys(auditPayload)
      if (auditFieldsRestantes.length > 0 && data?.id) {
        const auditPayloadMutavel = { ...auditPayload }

        for (let auditTentativa = 0; auditTentativa <= auditFieldsRestantes.length; auditTentativa += 1) {
          if (Object.keys(auditPayloadMutavel).length === 0) break

          const { error: auditError } = await supabase
            .from("precatorios")
            .update(auditPayloadMutavel)
            .eq("id", data.id)

          if (!auditError) break

          const colunaInexistenteAudit = extrairColunaInexistente(auditError)
          if (colunaInexistenteAudit && colunaInexistenteAudit in auditPayloadMutavel) {
            delete auditPayloadMutavel[colunaInexistenteAudit]
            colunasRemovidas.push(colunaInexistenteAudit)
            continue
          }

          console.warn("[Template Import] Registro criado sem auditoria de distribuicao admin.", {
            precatorioId: data.id,
            auditPayload: auditPayloadMutavel,
            erro: formatSupabaseError(auditError),
          })
          break
        }
      }

      return { criado: data, colunasRemovidas }
    }

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

  const templateItemsByKey = useMemo(
    () => new Map(templateItems.map((item) => [item.key, item])),
    [templateItems]
  )
  const totalTemplateValue = useMemo(
    () => templateItems.reduce((acc, item) => acc + (item.value || 0), 0),
    [templateItems]
  )
  const selectedOperators = useMemo(
    () => operators.filter((op) => selectedOperatorIds.includes(op.id)),
    [operators, selectedOperatorIds]
  )
  const allOperatorsApproved = selectedOperatorIds.every((id) => approvedOperators[id])
  const pendingOutliers = distributionPreview.outliers || []
  const approvedOperatorsCount = selectedOperatorIds.filter((id) => approvedOperators[id]).length
  const assignedOutliersCount = Object.values(outlierAssignments).filter(Boolean).length
  const totalOutlierCount = pendingOutliers.length + assignedOutliersCount
  const readinessPercent = templateItems.length
    ? Math.round(
        ([selectedOperatorIds.length > 0, pendingOutliers.length === 0, allOperatorsApproved].filter(Boolean).length / 3) * 100
      )
    : 0
  const operatorDistributionCards = useMemo(
    () =>
      selectedOperatorIds.map((id) => {
        const assignedKeys = distributionPreview.assignments[id] || []
        const assignedItems = assignedKeys
          .map((key) => templateItemsByKey.get(key))
          .filter((item): item is TemplateItemInfo => Boolean(item))
        const sum = distributionPreview.sums[id] || 0
        return {
          id,
          operator: operators.find((op) => op.id === id),
          assignedKeys,
          assignedItems,
          count: assignedKeys.length,
          sum,
          deltaFromTarget: sum - distributionPreview.target,
          approved: Boolean(approvedOperators[id]),
        }
      }),
    [approvedOperators, distributionPreview.assignments, distributionPreview.sums, distributionPreview.target, operators, selectedOperatorIds, templateItemsByKey]
  )
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

  const handleDownloadTemplate = () => {
    downloadJsonFile("template-precatorios-admin.json", DEFAULT_TEMPLATE)
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
        const nowIso = new Date().toISOString()
        payload.dono_usuario_id = operatorId
        payload.responsavel = operatorId
        payload.distribuido_por_admin = true
        payload.distribuido_por_admin_id = userId
        payload.distribuido_por_admin_em = nowIso
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
          const erroFormatado = formatSupabaseError(error)
          fail += 1
          errors.push(`Item ${i + 1}: ${erroFormatado}`)
          console.error(`[Template Import] Falha no item ${i + 1}: ${erroFormatado}`, {
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
      <DialogContent className="flex h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-6xl flex-col overflow-hidden border border-border/60 bg-[hsl(var(--background))] p-0 shadow-2xl backdrop-blur-none sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-border/60 bg-muted/20 px-6 py-5">
          <DialogTitle>Importar por Template (JSON)</DialogTitle>
          <DialogDescription>
            Primeiro carregue o JSON, depois distribua para operadores antes de importar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5">
          {step === "edit" ? (
            <div className="grid gap-4 pb-1">
              <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/50 via-background to-muted/20 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <Badge variant="secondary" className="w-fit bg-primary/10 text-primary">
                      Etapa 1 de 2
                    </Badge>
                    <div>
                      <p className="text-lg font-semibold tracking-tight">Monte o lote antes da distribuicao</p>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Cole, carregue ou baixe um template de referencia. O modal aceita campos opcionais,
                        normaliza aliases conhecidos e prepara os itens para a rodada de distribuicao.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { title: "1. Revisar JSON", detail: "Template e aliases aceitos" },
                      { title: "2. Distribuir", detail: "Balancear por operador" },
                      { title: "3. Importar", detail: "Liberado apos aprovacoes" },
                    ].map((item) => (
                      <div key={item.title} className="rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-xs shadow-sm">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-muted-foreground">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setRawJson(DEFAULT_TEMPLATE)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Carregar exemplo
                </Button>
                <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar template
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
                  <Upload className="mr-2 h-4 w-4" />
                  Carregar JSON
                </Button>
              </div>

              <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
                <div className="min-w-0 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Label className="text-sm font-semibold">Template JSON</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Campos ausentes sao aceitos. O campo <code>file_url</code> nao entra na importacao.
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "border",
                        parseError
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      )}
                    >
                      {parseError ? "JSON com pendencia" : `${templateItems.length} item(ns) lido(s)`}
                    </Badge>
                  </div>

                  <Textarea
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    rows={16}
                    className="mt-4 min-h-[380px] font-mono text-xs leading-5 bg-background"
                  />

                  {parseError ? (
                    <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {parseError}
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">Pronto para distribuir</Badge>
                      <span>{templateItems.length} item(ns) preparado(s) para a proxima etapa.</span>
                    </div>
                  )}
                </div>

                <div className="grid min-w-0 gap-4">
                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <p className="text-sm font-semibold">Resumo rapido</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Itens lidos</p>
                        <p className="mt-2 text-2xl font-semibold">{templateItems.length}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Campos aceitos</p>
                        <p className="mt-2 text-2xl font-semibold">{ACCEPTED_TEMPLATE_FIELDS.length}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Aliases suportados</p>
                        <p className="mt-2 text-2xl font-semibold">{EXTRA_SUPPORTED_INPUT_FIELDS.length}</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status do lote</p>
                        <p className="mt-2 text-sm font-semibold">
                          {parseError ? "Corrigir JSON" : "Aguardando distribuicao"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <p className="text-sm font-semibold">Campos aceitos</p>
                    <ScrollArea className="mt-3 h-28 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                      <div className="font-mono text-[11px] leading-5 text-muted-foreground">
                        {ACCEPTED_TEMPLATE_FIELDS.join(", ")}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <p className="text-sm font-semibold">Aliases e atalhos de normalizacao</p>
                    <ScrollArea className="mt-3 h-24 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                      <div className="font-mono text-[11px] leading-5 text-muted-foreground">
                        {EXTRA_SUPPORTED_INPUT_FIELDS.join(", ")}
                      </div>
                    </ScrollArea>
                  </div>

                  {lastResult && (
                    <div className="rounded-2xl border border-border/60 bg-card p-4 text-xs shadow-sm">
                      <p className="text-sm font-semibold">Ultimo resultado</p>
                      <p className="mt-2 text-muted-foreground">
                        {lastResult.ok} criados, {lastResult.fail} falharam.
                      </p>
                      {lastResult.errors.length > 0 && (
                        <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                          <p className="mb-2 font-medium text-foreground">Primeiras falhas</p>
                          <ul className="space-y-1 text-muted-foreground">
                            {lastResult.errors.slice(0, 5).map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 pb-1">
              <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="space-y-2">
                    <Badge variant="secondary" className="w-fit bg-primary/10 text-primary">
                      Etapa 2 de 2
                    </Badge>
                    <div>
                      <p className="text-lg font-semibold tracking-tight">Central de distribuicao do lote</p>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Revise o equilibrio da rodada, confira as pendencias manuais e aprove operador por operador
                        antes de importar.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-border/60 bg-background/90 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Itens</p>
                      <p className="mt-2 text-2xl font-semibold">{templateItems.length}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/90 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Valor total</p>
                      <p className="mt-2 text-lg font-semibold">{formatCurrency(totalTemplateValue)}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/90 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Operadores</p>
                      <p className="mt-2 text-2xl font-semibold">{selectedOperators.length}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/90 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Alvo por operador</p>
                      <p className="mt-2 text-lg font-semibold">{formatCurrency(distributionPreview.target)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid min-w-0 gap-4 2xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Prontidao da importacao</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          A importacao so libera quando a rodada estiver sem pendencias.
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "border",
                          canConfirm
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        )}
                      >
                        {canConfirm ? "Liberado" : "Em revisao"}
                      </Badge>
                    </div>

                    <Progress value={readinessPercent} className="mt-4 h-2.5 bg-muted" />
                    <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {readinessPercent}% da rodada conferida
                    </p>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                        {selectedOperatorIds.length > 0 ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                        )}
                        <div>
                          <p className="font-medium text-foreground">Operadores selecionados</p>
                          <p className="text-muted-foreground">
                            {selectedOperatorIds.length > 0
                              ? `${selectedOperatorIds.length} operador(es) participando da rodada.`
                              : "Selecione pelo menos um operador para distribuir."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                        {allOperatorsApproved ? (
                          <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                        )}
                        <div>
                          <p className="font-medium text-foreground">Aprovacoes por operador</p>
                          <p className="text-muted-foreground">
                            {approvedOperatorsCount}/{selectedOperatorIds.length} aprovacao(oes) registradas.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                        {pendingOutliers.length === 0 ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                        )}
                        <div>
                          <p className="font-medium text-foreground">Pendencias manuais</p>
                          <p className="text-muted-foreground">
                            {pendingOutliers.length === 0
                              ? totalOutlierCount > 0
                                ? "Todos os creditos destoantes ja foram enderecados."
                                : "Nenhum credito destoante identificado."
                              : `${pendingOutliers.length} credito(s) aguardando atribuicao manual.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Operadores da rodada</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Selecione quem participa e acompanhe a carga atual de cada um.
                        </p>
                      </div>
                      <Badge variant="outline">{selectedOperators.length} ativo(s)</Badge>
                    </div>

                    <ScrollArea className="mt-4 h-[320px] pr-4">
                      <div className="space-y-2">
                        {operators.length === 0 && (
                          <p className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                            Nenhum operador comercial cadastrado.
                          </p>
                        )}

                        {operators.map((op) => {
                          const selected = selectedOperatorIds.includes(op.id)
                          const assignedCount = distributionPreview.assignments[op.id]?.length || 0
                          const assignedValue = distributionPreview.sums[op.id] || 0
                          return (
                            <label
                              key={op.id}
                              className={cn(
                                "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors",
                                selected
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-border/60 bg-background hover:border-primary/25 hover:bg-muted/30"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={(checked) => {
                                    const isChecked = checked === true
                                    setSelectedOperatorIds((prev) => {
                                      if (isChecked) return Array.from(new Set([...prev, op.id]))
                                      return prev.filter((id) => id !== op.id)
                                    })
                                    setApprovedOperators((prev) => {
                                      const next = { ...prev }
                                      if (!isChecked) delete next[op.id]
                                      return next
                                    })
                                  }}
                                />
                                <div>
                                  <p className="text-sm font-medium">{op.nome}</p>
                                  <p className="text-xs text-muted-foreground">Operador comercial</p>
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-semibold">{assignedCount}</p>
                                <p className="text-[11px] text-muted-foreground">{formatCurrency(assignedValue)}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Label className="text-sm font-semibold">Limite de disparidade</Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Define quando um credito passa a exigir atribuicao manual por fugir muito do alvo medio.
                        </p>
                        <Input
                          type="number"
                          min="1"
                          step="0.1"
                          value={outlierMultiplier}
                          onChange={(e) => setOutlierMultiplier(Number(e.target.value) || 1)}
                          className="mt-3"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                          Creditos acima de {outlierMultiplier.toFixed(1)}x o alvo entram em revisao manual.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Mapa por operador</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Veja quantidade, valor total, distancia do alvo e aprove a distribuicao individualmente.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{approvedOperatorsCount} aprovado(s)</Badge>
                      <Badge variant="outline">{selectedOperatorIds.length - approvedOperatorsCount} pendente(s)</Badge>
                    </div>
                  </div>

                  {operatorDistributionCards.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
                      Selecione operadores para visualizar a distribuicao detalhada.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {operatorDistributionCards.map((card) => {
                        const targetRatio =
                          distributionPreview.target > 0
                            ? Math.min((card.sum / distributionPreview.target) * 100, 100)
                            : 0

                        return (
                          <div
                            key={card.id}
                            className={cn(
                              "rounded-2xl border p-4 transition-colors",
                              card.approved
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-border/60 bg-background"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold">{card.operator?.nome || "Operador"}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {card.count} credito(s) atribuido(s)
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "border",
                                  card.approved
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                )}
                              >
                                {card.approved ? "Aprovado" : "Revisar"}
                              </Badge>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Carga</p>
                                <p className="mt-1 text-lg font-semibold">{card.count}</p>
                              </div>
                              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Valor</p>
                                <p className="mt-1 text-sm font-semibold">{formatCurrency(card.sum)}</p>
                              </div>
                              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Delta alvo</p>
                                <p
                                  className={cn(
                                    "mt-1 text-sm font-semibold",
                                    card.deltaFromTarget > 0
                                      ? "text-amber-700 dark:text-amber-300"
                                      : card.deltaFromTarget < 0
                                        ? "text-sky-700 dark:text-sky-300"
                                        : "text-foreground"
                                  )}
                                >
                                  {formatSignedCurrency(card.deltaFromTarget)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                <span>Equilibrio vs alvo</span>
                                <span>{formatCurrency(distributionPreview.target)}</span>
                              </div>
                              <Progress value={targetRatio} className="h-2 bg-muted" />
                            </div>

                            <div className="mt-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                Previa dos itens
                              </p>
                              {card.assignedItems.length > 0 ? (
                                <>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {card.assignedItems.slice(0, 3).map((item) => (
                                      <Badge key={item.key} variant="outline" className="max-w-full truncate">
                                        {item.label}
                                      </Badge>
                                    ))}
                                  </div>
                                  {card.assignedItems.length > 3 && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      + {card.assignedItems.length - 3} item(ns) adicionais nesta carteira.
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Nenhum item atribuido para este operador ate agora.
                                </p>
                              )}
                            </div>

                            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-sm">
                              <Checkbox
                                checked={card.approved}
                                onCheckedChange={(checked) =>
                                  setApprovedOperators((prev) => ({
                                    ...prev,
                                    [card.id]: checked === true,
                                  }))
                                }
                              />
                              <span>
                                Conferi a carteira de <strong>{card.operator?.nome || "Operador"}</strong> e aprovo
                                esta distribuicao.
                              </span>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {pendingOutliers.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-amber-500/15 p-2 text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                          Creditos destoantes precisam de atribuicao manual
                        </p>
                        <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                          Esses itens ultrapassaram o limite de disparidade e exigem decisao explicita antes da importacao.
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="border border-amber-500/20 bg-background/80 text-amber-800 dark:text-amber-200">
                      {pendingOutliers.length} pendente(s)
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {pendingOutliers.map((item) => (
                      <div key={item.key} className="rounded-2xl border border-amber-500/20 bg-background/90 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{item.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Atribuicao manual obrigatoria</p>
                          </div>
                          <Badge variant="outline">{formatCurrency(item.value || 0)}</Badge>
                        </div>

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={outlierAssignments[item.key] || ""}
                            onChange={(e) =>
                              setOutlierAssignments((prev) => ({
                                ...prev,
                                [item.key]: e.target.value || undefined,
                              }))
                            }
                            className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
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
                          <span className="text-xs text-amber-900/80 dark:text-amber-100/80">
                            Necessario para liberar a importacao.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 bg-muted/10 px-6 py-4">
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
                Importar {templateItems.length} item(ns)
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
