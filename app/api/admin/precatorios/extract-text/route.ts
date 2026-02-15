import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { extrairDadosDeTexto } from "@/lib/extrair-dados"

export const runtime = "nodejs"

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

type ExtractTextRequestBody = {
  text?: string
}

type CandidateFields = {
  credor_nome?: string
  advogado_nome?: string
  valor_principal?: number
  numero_precatorio?: string
  numero_oficio?: string
  tribunal?: string
  credor_cpf_cnpj?: string
  numero_processo?: string
  natureza?: "Alimentar" | "Comum"
  data_expedicao?: string
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

function normalizeNatureza(value: unknown): "Alimentar" | "Comum" | undefined {
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
    /\btrans\.?\s*requisi[cç][aã]o\s*:\s*([^\n]+)/i,
    /\bdata\s+de\s+expedi[cç][aã]o\s*:\s*([^\n]+)/i,
    /\bexpedido\s+em\s*:\s*([^\n]+)/i,
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
  return /\btipo\s*:\s*precat[oó]rio\b/i.test(rawText)
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
      /\b(?:cpf|cnpj|devedor|ente\s+da\s+federacao|entidade|procurador(?:\s+principal)?|natureza(?:\s+do\s+credito)?|autor\s+da\s+acao|n[uú]mero\s+da\s+a[cç][aã]o|processo(?:\s+origin[áa]rio|\s+de\s+origem)?|of[ií]cio|requisi[cç][aã]o)\b.*$/i,
      ""
    )
    .replace(/\s*[-–]\s*[A-Z]{1,3}\s*\d{2,}.*$/i, "")
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
      /\bprincipal\s*:/i.test(line) && contextNorm.includes("credor de valor principal")

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

function extractStructuredCandidates(rawText: string): CandidateFields {
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
    /\bbenefici[aá]rio\s*:\s*([^\n]+)/i,
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

  for (const pattern of advogadoPatterns) {
    const parsed = normalizeAdvogadoCandidate(normalizedText.match(pattern)?.[1])
    if (parsed && isLikelyAdvogadoName(parsed)) {
      result.advogado_nome = parsed
      break
    }
  }

  const cpfFromMainLabel = normalizedText.match(
    /\bnome\s+do\s+requerente\s*-\s*cpf\/cnpj\s*:\s*[^\n]*?-\s*([0-9.\-\/]{11,20})/i
  )?.[1]
  const cpfByLabel =
    cpfFromMainLabel || normalizedText.match(/\bcpf(?:\/cgc|\/cnpj)?\s*[:\-]?\s*([0-9.\-\/]{11,20})/i)?.[1]
  result.credor_cpf_cnpj = normalizeCpfCnpj(cpfByLabel)

  result.numero_processo = extractLabeledCnj(normalizedText, [
    /\bprocesso\s+origin[áa]rio\s*:\s*([^\n]+)/i,
    /\borigin[áa]rio\s*:\s*([^\n]+)/i,
    /\bn[uú]mero\s+da\s+a[cç][aã]o\s*:\s*([^\n]+)/i,
    /\ba[cç][aã]o\s+origin[áa]ria\s*:\s*([^\n]+)/i,
    /\bn[uú]mero\s+do\s+processo\s+de\s+conhecimento\s*\/\s*execu[cç][aã]o\s*:\s*([^\n]+)/i,
  ])

  result.numero_precatorio = extractLabeledCnj(normalizedText, [
    /\bprojudi\s*-\s*processo\s*:\s*([^\n]+)/i,
    /\bprecat[oó]rio\s*:\s*([^\n]+)/i,
  ])

  if (!result.numero_precatorio && hasTipoPrecatorio(normalizedText)) {
    result.numero_precatorio = extractLabeledCnj(normalizedText, [/\bprocesso\s*:\s*([^\n]+)/i])
  }

  const oficioByLabel =
    normalizedText.match(/\bof[ií]cio(?:\s+requisit[oó]rio(?:\s+judicial)?)?\s*[:nº°\.\-\s]*([A-Z0-9.\-\/]{4,})/i)?.[1] ||
    normalizedText.match(/\brequisi[cç][aã]o\s*:\s*([A-Z0-9.\-\/]{4,})/i)?.[1]
  result.numero_oficio = cleanText(oficioByLabel)

  return result
}

function extractRegexCandidates(rawText: string): CandidateFields {
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
  const valid = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0
  )
  if (valid.length === 0) return undefined
  const preferred = values.find((value): value is number => typeof value === "number" && value >= 1000)
  return preferred ?? valid[0]
}

function mergeCandidates(base: CandidateFields, structured: CandidateFields, ai: CandidateFields): CandidateFields {
  return {
    credor_nome: pickBestName([structured.credor_nome, ai.credor_nome, base.credor_nome], isLikelyCredorName),
    advogado_nome: pickBestName([structured.advogado_nome, ai.advogado_nome, base.advogado_nome], isLikelyAdvogadoName),
    valor_principal: pickBestMoney(structured.valor_principal, ai.valor_principal, base.valor_principal),
    numero_precatorio: pickFirst(structured.numero_precatorio, ai.numero_precatorio, base.numero_precatorio),
    numero_oficio: pickFirst(structured.numero_oficio, ai.numero_oficio, base.numero_oficio),
    tribunal: pickFirst(structured.tribunal, ai.tribunal, base.tribunal),
    credor_cpf_cnpj: pickFirst(structured.credor_cpf_cnpj, ai.credor_cpf_cnpj, base.credor_cpf_cnpj),
    numero_processo: pickFirst(structured.numero_processo, ai.numero_processo, base.numero_processo),
    natureza: pickFirst(structured.natureza, ai.natureza, base.natureza),
    data_expedicao: pickFirst(structured.data_expedicao, ai.data_expedicao, base.data_expedicao),
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim().length > 0) return message
  }
  return "Erro desconhecido."
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase nao configurado no servidor." }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 })
    }

    const body = (await request.json()) as ExtractTextRequestBody
    const sourceText = normalizeSourceText(body?.text)
    if (!sourceText || sourceText.length < 30) {
      return NextResponse.json({ error: "Texto insuficiente para extracao." }, { status: 400 })
    }

    const trimmedText = sourceText.slice(0, 48_000)
    const regexCandidates = extractRegexCandidates(trimmedText)
    const structuredCandidates = extractStructuredCandidates(trimmedText)

    const warnings: string[] = ["ai_extraction_disabled"]
    const merged = mergeCandidates(regexCandidates, structuredCandidates, {})

    return NextResponse.json({
      ok: true,
      data: {
        ...merged,
        raw_text: trimmedText.slice(0, 3000),
        ocr_warnings: warnings,
        ocr_metrics: {
          ai_extraction_used: false,
          extraction_mode: "ocr_only",
          source_text_length: trimmedText.length,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno na extracao de texto.", details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
