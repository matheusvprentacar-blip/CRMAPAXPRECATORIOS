import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import {
  extractPdfWithRobustPipeline,
  type OcrMode,
  type PipelineExtractedData,
} from "@/lib/server/ocr-pipeline"
import { extrairDadosDeTexto } from "@/lib/extrair-dados"

export const runtime = "nodejs"

const VALID_MODES: OcrMode[] = ["auto", "fast", "premium"]
const CNJ_REGEX = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/
const MONTH_MAP: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  marco: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
}
const TJ_STATE_MAP: Record<string, string> = {
  alagoas: "TJAL",
  parana: "TJPR",
  "rio grande do sul": "TJRS",
  "rio de janeiro": "TJRJ",
  "sao paulo": "TJSP",
}

type CandidateFields = Partial<
  Pick<
    PipelineExtractedData,
    | "credor_nome"
    | "advogado_nome"
    | "valor_principal"
    | "numero_precatorio"
    | "numero_oficio"
    | "tribunal"
    | "credor_cpf_cnpj"
    | "numero_processo"
    | "natureza"
    | "data_expedicao"
  >
>

function parseMode(raw: unknown): OcrMode {
  const mode = String(raw || "auto").toLowerCase().trim() as OcrMode
  return VALID_MODES.includes(mode) ? mode : "auto"
}

function getTraceId(request: Request): string {
  const fromHeader = request.headers.get("x-ocr-trace-id")
  return fromHeader?.trim() || `ocr-api-${randomUUID()}`
}

function logApiTrace(
  traceId: string,
  stage: string,
  message: string,
  details?: unknown,
  level: "info" | "warn" | "error" = "info"
): void {
  const prefix = `[OCR_API][${traceId}][${stage}] ${message}`
  if (level === "error") {
    console.error(prefix, details ?? {})
  } else if (level === "warn") {
    console.warn(prefix, details ?? {})
  } else {
    console.info(prefix, details ?? {})
  }
}

function cleanText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value).replace(/\s+/g, " ").trim()
  return text || undefined
}

function normalizeSourceText(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value)
    .replace(/\u00A0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function normalizeForSearch(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\S\n]+/g, " ")
    .toLowerCase()
}

function extractDateFromExtenso(rawText: string): string | undefined {
  const normalized = normalizeForSearch(rawText)
  const match = normalized.match(/\b(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})\b/)
  if (!match) return undefined
  const day = match[1].padStart(2, "0")
  const month = MONTH_MAP[match[2]]
  const year = match[3]
  if (!month) return undefined
  return `${year}-${month}-${day}`
}

function extractDateByLabel(rawText: string): string | undefined {
  const patterns = [
    /\btrans\.?\s*requisi[cÃƒÂ§][aÃƒÂ£]o\s*:\s*([^\n]+)/i,
    /\bdata\s+de\s+expedi[cÃƒÂ§][aÃƒÂ£]o\s*:\s*([^\n]+)/i,
    /\bexpedido\s+em\s*:\s*([^\n]+)/i,
    /\bmambore,\s*([^\n]+)/i,
  ]
  for (const pattern of patterns) {
    const chunk = rawText.match(pattern)?.[1]
    const byIso = normalizeIsoDate(chunk)
    if (byIso) return byIso
    const byExtenso = chunk ? extractDateFromExtenso(chunk) : undefined
    if (byExtenso) return byExtenso
  }
  return normalizeIsoDate(rawText) || extractDateFromExtenso(rawText)
}

function extractLabeledCnj(rawText: string, labels: RegExp[]): string | undefined {
  for (const label of labels) {
    const chunk = rawText.match(label)?.[1]
    const cnj = normalizeCnj(chunk)
    if (cnj) return cnj
  }
  return undefined
}

function hasTipoPrecatorio(rawText: string): boolean {
  return /\btipo\s*:\s*precat[oÃƒÂ³]rio\b/i.test(rawText)
}

function isMainBeneficiaryContext(rawText: string): boolean {
  const normalized = normalizeForSearch(rawText)
  return (
    normalized.includes("autor originario") ||
    normalized.includes("tipo beneficiario") ||
    normalized.includes("requerente") ||
    normalized.includes("credor de valor principal")
  )
}

function isHonorariosContext(rawText: string): boolean {
  const normalized = normalizeForSearch(rawText)
  return normalized.includes("honorario")
}

type TextCollectorState = {
  fragments: string[]
  chars: number
}

function pushTextFragment(state: TextCollectorState, value: unknown): void {
  if (state.chars >= 90_000) return
  const text = normalizeSourceText(value)
  if (!text) return
  state.fragments.push(text)
  state.chars += text.length + 1
}

function collectTextFragments(value: unknown, state: TextCollectorState, depth = 0): void {
  if (state.chars >= 90_000 || depth > 8 || value === null || value === undefined) return

  if (typeof value === "string") {
    pushTextFragment(state, value)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextFragments(item, state, depth + 1)
      if (state.chars >= 90_000) break
    }
    return
  }

  if (typeof value !== "object") return

  const obj = value as Record<string, unknown>
  const preferredKeys = ["full_text", "text", "content", "page_text", "line", "lines", "blocks"]
  for (const key of preferredKeys) {
    if (key in obj) {
      collectTextFragments(obj[key], state, depth + 1)
      if (state.chars >= 90_000) return
    }
  }

  for (const [key, nested] of Object.entries(obj)) {
    if (preferredKeys.includes(key)) continue
    if (typeof nested === "string" || Array.isArray(nested) || (nested && typeof nested === "object")) {
      collectTextFragments(nested, state, depth + 1)
      if (state.chars >= 90_000) return
    }
  }
}

function buildOpenAiSourceText(extracted: PipelineExtractedData): string | undefined {
  const state: TextCollectorState = { fragments: [], chars: 0 }
  pushTextFragment(state, extracted.raw_text)
  collectTextFragments(extracted.ocr_text_layer, state)

  if (state.fragments.length === 0) return undefined
  const unique = Array.from(new Set(state.fragments))
  const merged = unique.join("\n")
  return normalizeSourceText(merged) || undefined
}

function parsePositiveNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  if (typeof value !== "string") return undefined

  const raw = value.trim()
  if (!raw) return undefined
  const normalized =
    raw.includes(",") && raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.includes(",")
      ? raw.replace(",", ".")
      : raw
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function normalizeCnj(value: unknown): string | undefined {
  const text = cleanText(value)
  if (!text) return undefined
  const match = text.match(CNJ_REGEX)
  return match?.[0]
}

function normalizeCpfCnpj(value: unknown): string | undefined {
  const text = cleanText(value)
  if (!text) return undefined
  const digits = text.replace(/\D/g, "")
  if (digits.length === 11 || digits.length === 14) return digits
  return undefined
}

function normalizeTribunal(value: unknown): string | undefined {
  const rawText = cleanText(value)
  if (!rawText) return undefined
  const text = rawText.toUpperCase()

  const direct = text.match(/\b(TJ[A-Z]{2}|TRF\d{1,2}|TRT\d{1,2}|STJ|STF)\b/)
  if (direct) return direct[1]

  const tj = text.match(/\bTJ[\s-]?([A-Z]{2})\b/)
  if (tj) return `TJ${tj[1]}`
  const trf = text.match(/\bTRF[\s-]?(\d{1,2})\b/)
  if (trf) return `TRF${trf[1]}`
  const trt = text.match(/\bTRT[\s-]?(\d{1,2})\b/)
  if (trt) return `TRT${trt[1]}`

  const normalized = normalizeForSearch(rawText)
  for (const [state, sigla] of Object.entries(TJ_STATE_MAP)) {
    if (normalized.includes(`tribunal de justica do estado ${state}`)) return sigla
    if (normalized.includes(`tribunal de justica do estado do ${state}`)) return sigla
    if (normalized.includes(`tribunal de justica do estado da ${state}`)) return sigla
    if (normalized.includes(`poder judiciario do estado do ${state}`)) return sigla
    if (normalized.includes(`poder judiciario do estado da ${state}`)) return sigla
  }

  if (normalized.includes("justica federal")) return "JUSTICA_FEDERAL"

  return undefined
}

function normalizeNatureza(value: unknown): string | undefined {
  const text = cleanText(value)
  if (!text) return undefined
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  if (normalized.includes("aliment")) return "Alimentar"
  if (normalized.includes("comum")) return "Comum"
  return undefined
}

function normalizeIsoDate(value: unknown): string | undefined {
  const text = cleanText(value)
  if (!text) return undefined

  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const br = text.match(/\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\b/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`

  return undefined
}

function normalizeNameCandidate(value: unknown): string | undefined {
  const text = cleanText(value)
  if (!text) return undefined
  return text
    .replace(/\b(?:cpf|cnpj|cpf\/cgc|cpf\/cnpj)\b.*$/i, "")
    .replace(/\b(?:oab)\b.*$/i, "")
    .replace(/\s*[|;,]\s*$/, "")
    .trim()
}

function normalizeAdvogadoCandidate(value: unknown): string | undefined {
  const normalized = normalizeNameCandidate(value)
  if (!normalized) return undefined
  return normalized
    .replace(
      /\b(?:cpf|cnpj|devedor|ente\s+da\s+federacao|entidade|procurador(?:\s+principal)?|natureza(?:\s+do\s+credito)?|autor\s+da\s+acao|numero\s+da\s+acao|processo(?:\s+originario|\s+de\s+origem)?|oficio|requisicao)\b.*$/i,
      ""
    )
    .replace(/\s*-\s*[A-Z]{1,3}\s*\d{2,}.*$/i, "")
    .replace(/\s+[A-Z]{1,3}\s*\d{2,}.*$/i, "")
    .trim()
}

function isLikelyCredorName(value: unknown): value is string {
  const text = cleanText(value)
  if (!text) return false
  if (text.length < 5 || text.length > 140) return false
  if (!/\s+/.test(text)) return false
  if (/\d{4,}/.test(text)) return false

  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
  const blockedTerms = [
    "indeniza",
    "benefici",
    "natureza",
    "despesa",
    "assunto",
    "requisicao",
    "processo",
    "valor",
    "juros",
    "data base",
    "nao tribut",
    "previdenci",
    "honorario",
    "advogado",
    "oab",
  ]
  return !blockedTerms.some((term) => normalized.includes(term))
}

function isLikelyAdvogadoName(value: unknown): value is string {
  const text = cleanText(value)
  if (!text) return false
  if (text.length < 5 || text.length > 180) return false
  if (!/\s+/.test(text)) return false
  if (text.includes(":")) return false
  if (/\d{5,}/.test(text)) return false

  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  const blockedTerms = [
    "requerente",
    "requerido",
    "assunto",
    "valor",
    "natureza",
    "credito",
    "alimentar",
    "comum",
    "devedor",
    "estado do",
    "federacao",
    "numero da acao",
    "acao originaria",
    "processo",
    "oficio",
    "requisicao",
    "data ",
    "processo originario",
    "tipo de despesa",
    "honorario",
  ]
  return !blockedTerms.some((term) => normalized.includes(term))
}

function extractMoneyByLabel(rawText: string): number | undefined {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const prev = lines[index - 1] || ""
    const next = lines[index + 1] || ""
    const context = `${prev}\n${line}\n${next}`
    const contextNorm = normalizeForSearch(context)

    const explicitValorPrincipal = /\bvalor\s+principal(?:\s+total)?\b/i.test(line)
    const principalInCredorBlock =
      /\bprincipal\s*:/i.test(line) &&
      contextNorm.includes("credor de valor principal")

    if (!explicitValorPrincipal && !principalInCredorBlock) continue
    if (
      contextNorm.includes("valor selic") ||
      contextNorm.includes("juros") ||
      contextNorm.includes("valor requisitado") ||
      contextNorm.includes("valor total requisitado")
    ) {
      continue
    }
    if (isHonorariosContext(context) && !isMainBeneficiaryContext(context)) {
      continue
    }

    const windowText = `${line} ${next}`
    const moneyMatch = windowText.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i)
    const parsed = parsePositiveNumber(moneyMatch?.[1])
    if (parsed !== undefined) return parsed
  }

  const fallbackPatterns = [
    /\bvalor\s+principal(?:\s+total)?\b[^\d]{0,40}(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i,
    /\bprincipal\b[^\d]{0,20}(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i,
  ]
  for (const pattern of fallbackPatterns) {
    const match = rawText.match(pattern)
    const parsed = parsePositiveNumber(match?.[1])
    if (parsed !== undefined) return parsed
  }
  return undefined
}

function extractStructuredCandidates(rawText: string | undefined): CandidateFields {
  if (!rawText) return {}

  const normalizedText = normalizeSourceText(rawText)
  if (!normalizedText) return {}

  const result: CandidateFields = {
    tribunal: normalizeTribunal(normalizedText),
    natureza: normalizeNatureza(normalizedText),
    valor_principal: extractMoneyByLabel(normalizedText),
    data_expedicao: extractDateByLabel(normalizedText),
  }

  const credorPatterns = [
    /\bnome\s+do\s+requerente\s*-\s*cpf\/cnpj\s*:\s*([^\n]+)/i,
    /\brequerente\s*:\s*([^\n]+)/i,
    /\bbenefici[aÃƒÂ¡]rio\s*:\s*([^\n]+)/i,
    /\bcredor(?:\(a\))?\s*:\s*([^\n]+)/i,
  ]

  for (const pattern of credorPatterns) {
    const rawCandidate = normalizedText.match(pattern)?.[1]
    const candidate = normalizeNameCandidate(rawCandidate)
    if (isHonorariosContext(rawCandidate || "") && !isMainBeneficiaryContext(rawCandidate || "")) continue
    if (candidate && isLikelyCredorName(candidate)) {
      result.credor_nome = candidate
      break
    }
  }

  if (!result.credor_nome) {
    const tableCandidate = normalizedText.match(/\bnome\s*[:\-]?\s*([^\n]{3,140})\s+cpf(?:\/cgc|\/cnpj)?\b/i)?.[1]
    const normalizedCandidate = normalizeNameCandidate(tableCandidate)
    if (normalizedCandidate && isLikelyCredorName(normalizedCandidate)) {
      result.credor_nome = normalizedCandidate
    }
  }

  const advogadoPatterns = [
    /\badvogado\s+principal\s*:\s*([^\n]+)/i,
    /\bnome\/oab\/cpf\s+ou\s+cnpj\s+do\s+advogado\s+do\s+requerente\s*:\s*([^\n]+)/i,
    /\badvogado(?:\(s\))?\s*:\s*([^\n]+)/i,
  ]
  let advogadoCandidate: string | undefined
  for (const pattern of advogadoPatterns) {
    const parsed = normalizeAdvogadoCandidate(normalizedText.match(pattern)?.[1])
    if (parsed && isLikelyAdvogadoName(parsed)) {
      advogadoCandidate = parsed
      break
    }
  }
  if (advogadoCandidate && isLikelyAdvogadoName(advogadoCandidate)) {
    result.advogado_nome = advogadoCandidate
  }

  const cpfByLabel = normalizedText.match(/\bcpf(?:\/cgc|\/cnpj)?\s*[:\-]?\s*([0-9.\-\/]{11,20})/i)?.[1]
  result.credor_cpf_cnpj = normalizeCpfCnpj(cpfByLabel)

  result.numero_processo = extractLabeledCnj(normalizedText, [
    /\bprocesso\s+origin[ÃƒÂ¡a]rio\s*:\s*([^\n]+)/i,
    /\borigin[ÃƒÂ¡a]rio\s*:\s*([^\n]+)/i,
    /\bn[uÃƒÂº]mero\s+da\s+a[cÃƒÂ§][aÃƒÂ£]o\s*:\s*([^\n]+)/i,
    /\ba[cÃƒÂ§][aÃƒÂ£]o\s+origin[ÃƒÂ¡a]ria\s*:\s*([^\n]+)/i,
    /\bn[uÃƒÂº]mero\s+do\s+processo\s+de\s+conhecimento\s*\/\s*execu[cÃƒÂ§][aÃƒÂ£]o\s*:\s*([^\n]+)/i,
  ])

  result.numero_precatorio = extractLabeledCnj(normalizedText, [
    /\bprojudi\s*-\s*processo\s*:\s*([^\n]+)/i,
    /\bprecat[oÃƒÂ³]rio\s*:\s*([^\n]+)/i,
  ])

  if (!result.numero_precatorio && hasTipoPrecatorio(normalizedText)) {
    result.numero_precatorio = extractLabeledCnj(normalizedText, [/\bprocesso\s*:\s*([^\n]+)/i])
  }

  const oficioByLabel =
    normalizedText.match(/\bof[iÃƒÂ­]cio(?:\s+requisit[oÃƒÂ³]rio(?:\s+judicial)?)?\s*[:nÃ‚ÂºÃ‚Â°\.\-\s]*([A-Z0-9.\-\/]{4,})/i)?.[1] ||
    normalizedText.match(/\brequisi[cÃƒÂ§][aÃƒÂ£]o\s*:\s*([A-Z0-9.\-\/]{4,})/i)?.[1]
  result.numero_oficio = cleanText(oficioByLabel)

  return result
}
function extractRegexCandidates(rawText: string | undefined): CandidateFields {
  if (!rawText) return {}
  const parsed = extrairDadosDeTexto(rawText)
  return {
    credor_nome: cleanText(parsed.autor_credor_originario),
    advogado_nome: cleanText(parsed.advogado_acao),
    valor_principal: parsePositiveNumber(parsed.valor_principal_original),
    numero_precatorio: normalizeCnj(parsed.numero_precatorio),
    numero_oficio: cleanText(parsed.numero_oficio_requisitorio),
    tribunal: normalizeTribunal(parsed.tribunal),
    credor_cpf_cnpj: normalizeCpfCnpj(parsed.cpf_cnpj),
    numero_processo: normalizeCnj(parsed.numero_processo),
    natureza: normalizeNatureza(parsed.natureza_ativo),
    data_expedicao: normalizeIsoDate(parsed.data_expedicao),
  }
}

function extractBaseCandidates(base: PipelineExtractedData): CandidateFields {
  return {
    credor_nome: cleanText(base.credor_nome),
    advogado_nome: cleanText(base.advogado_nome),
    valor_principal: parsePositiveNumber(base.valor_principal),
    numero_precatorio: normalizeCnj(base.numero_precatorio),
    numero_oficio: cleanText(base.numero_oficio),
    tribunal: normalizeTribunal(base.tribunal),
    credor_cpf_cnpj: normalizeCpfCnpj(base.credor_cpf_cnpj),
    numero_processo: normalizeCnj(base.numero_processo),
    natureza: normalizeNatureza(base.natureza),
    data_expedicao: normalizeIsoDate(base.data_expedicao),
  }
}

function pickFirst<T>(...values: Array<T | undefined>): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function pickBestName(
  candidates: Array<string | undefined>,
  validator: (value: unknown) => value is string
): string | undefined {
  for (const candidate of candidates) {
    const normalized = cleanText(candidate)
    if (normalized && validator(normalized)) return normalized
  }
  return undefined
}

function pickBestMoney(...values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
  if (valid.length === 0) return undefined
  const preferred = values.find((value): value is number => typeof value === "number" && value >= 1000)
  return preferred ?? valid[0]
}

function mergeCandidates(
  base: PipelineExtractedData,
  baseCandidates: CandidateFields,
  structuredCandidates: CandidateFields,
  regexCandidates: CandidateFields,
  aiCandidates: CandidateFields
): PipelineExtractedData {
  return {
    ...base,
    credor_nome: pickBestName(
      [structuredCandidates.credor_nome, aiCandidates.credor_nome, baseCandidates.credor_nome, regexCandidates.credor_nome],
      isLikelyCredorName
    ),
    advogado_nome: pickBestName(
      [
        structuredCandidates.advogado_nome,
        aiCandidates.advogado_nome,
        baseCandidates.advogado_nome,
        regexCandidates.advogado_nome,
      ],
      isLikelyAdvogadoName
    ),
    valor_principal: pickBestMoney(
      structuredCandidates.valor_principal,
      aiCandidates.valor_principal,
      baseCandidates.valor_principal,
      regexCandidates.valor_principal
    ),
    numero_precatorio: pickFirst(
      structuredCandidates.numero_precatorio,
      aiCandidates.numero_precatorio,
      baseCandidates.numero_precatorio,
      regexCandidates.numero_precatorio
    ),
    numero_oficio: pickFirst(
      structuredCandidates.numero_oficio,
      aiCandidates.numero_oficio,
      baseCandidates.numero_oficio,
      regexCandidates.numero_oficio
    ),
    tribunal: pickFirst(structuredCandidates.tribunal, aiCandidates.tribunal, baseCandidates.tribunal, regexCandidates.tribunal),
    credor_cpf_cnpj: pickFirst(
      structuredCandidates.credor_cpf_cnpj,
      aiCandidates.credor_cpf_cnpj,
      baseCandidates.credor_cpf_cnpj,
      regexCandidates.credor_cpf_cnpj
    ),
    numero_processo: pickFirst(
      structuredCandidates.numero_processo,
      aiCandidates.numero_processo,
      baseCandidates.numero_processo,
      regexCandidates.numero_processo
    ),
    natureza: pickFirst(structuredCandidates.natureza, aiCandidates.natureza, baseCandidates.natureza, regexCandidates.natureza),
    data_expedicao: pickFirst(
      structuredCandidates.data_expedicao,
      aiCandidates.data_expedicao,
      baseCandidates.data_expedicao,
      regexCandidates.data_expedicao
    ),
  }
}

async function refineWithOcrOnly(
  extracted: PipelineExtractedData,
  traceId: string
): Promise<{
  merged: PipelineExtractedData
  warnings: string[]
  usedOpenAI: boolean
  model: string | null
  sourceTextLength: number
}> {
  const warnings: string[] = ["ai_extraction_disabled"]
  const baseCandidates = extractBaseCandidates(extracted)
  const sourceText = buildOpenAiSourceText(extracted)
  const structuredCandidates = extractStructuredCandidates(sourceText)
  const regexCandidates = extractRegexCandidates(sourceText)

  if (!sourceText) {
    warnings.push("ocr_only_no_raw_text")
    return {
      merged: mergeCandidates(extracted, baseCandidates, structuredCandidates, regexCandidates, {}),
      warnings,
      usedOpenAI: false,
      model: null,
      sourceTextLength: 0,
    }
  }

  const merged = mergeCandidates(extracted, baseCandidates, structuredCandidates, regexCandidates, {})
  logApiTrace(traceId, "ocr.refine.local", "Extracao refinada apenas com OCR e heuristica local", {
    sourceTextLength: sourceText.length,
  })
  return {
    merged,
    warnings,
    usedOpenAI: false,
    model: null,
    sourceTextLength: sourceText.length,
  }
}

export async function POST(request: Request) {
  const traceId = getTraceId(request)
  try {
    logApiTrace(traceId, "request.start", "Recebida requisicao OCR robusta")

    const formData = await request.formData()
    const file = formData.get("file")
    const ocrMode = parseMode(formData.get("ocrMode"))

    logApiTrace(traceId, "request.parsed", "FormData parseado", {
      ocrMode,
      fileType: file instanceof File ? file.type : typeof file,
      fileName: file instanceof File ? file.name : null,
      fileSize: file instanceof File ? file.size : null,
    })

    if (!(file instanceof File)) {
      logApiTrace(traceId, "request.invalid_file", "Arquivo invalido no formData", { file }, "warn")
      return NextResponse.json(
        { error: "Arquivo invalido.", traceId },
        { status: 400, headers: { "x-ocr-trace-id": traceId } }
      )
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      logApiTrace(traceId, "request.invalid_type", "Tipo de arquivo nao suportado", { fileType: file.type }, "warn")
      return NextResponse.json(
        { error: "Somente PDF e suportado nesta rota.", traceId },
        { status: 400, headers: { "x-ocr-trace-id": traceId } }
      )
    }

    const extracted = await extractPdfWithRobustPipeline(file, ocrMode, traceId)
    const refined = await refineWithOcrOnly(extracted, traceId)
    const warnings = Array.from(
      new Set([...(refined.merged.ocr_warnings || []), ...(refined.warnings || [])])
    )
    const metrics = {
      ...(refined.merged.ocr_metrics || {}),
      ai_extraction_used: refined.usedOpenAI,
      ai_extraction_model: refined.model,
      ocr_source_length: refined.sourceTextLength,
      extraction_mode: "ocr_only",
    }
    const finalData: PipelineExtractedData = {
      ...refined.merged,
      ocr_warnings: warnings,
      ocr_metrics: metrics,
    }

    logApiTrace(traceId, "request.success", "Extracao OCR concluida", {
      warnings,
      metrics,
    })

    return NextResponse.json(
      {
        ok: true,
        traceId,
        data: finalData,
        warnings,
        metrics,
      },
      { headers: { "x-ocr-trace-id": traceId } }
    )
  } catch (error) {
    logApiTrace(
      traceId,
      "request.error",
      "Erro interno na extracao OCR",
      error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { error },
      "error"
    )

    const message = error instanceof Error ? error.message : "Falha interna no OCR."
    return NextResponse.json(
      {
        error: message,
        traceId,
        details: error instanceof Error ? { name: error.name, stack: error.stack } : error,
      },
      { status: 500, headers: { "x-ocr-trace-id": traceId } }
    )
  }
}

