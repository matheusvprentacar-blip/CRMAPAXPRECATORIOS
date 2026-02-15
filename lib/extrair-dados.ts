export interface DadosExtraidos {
  numero_processo?: string
  numero_precatorio?: string
  numero_oficio_requisitorio?: string
  vara_origem?: string
  comarca?: string
  tribunal?: string
  autor_credor_originario?: string
  cpf_cnpj?: string
  advogado_acao?: string
  natureza_ativo?: string
  valor_principal_original?: number
  valor_juros_original?: number
  multa?: number
  honorarios_contratuais?: number
  data_expedicao?: string
}

const CNJ_REGEX = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g
const DATE_REGEX = /\b(\d{2})[\/.-](\d{2})[\/.-](\d{4})\b/g
const MONEY_REGEX = /(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+(?:,\d{2}))/g

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function cleanLabelValue(raw: string): string {
  return raw
    .replace(/^[\s:;.\-]+/, "")
    .replace(/[\s:;.\-]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseMoney(raw: string): number | undefined {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")

  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

function extractMoneyCandidates(text: string): number[] {
  const values: number[] = []
  const matches = text.matchAll(MONEY_REGEX)

  for (const match of matches) {
    const value = parseMoney(match[1])
    if (value !== undefined) values.push(value)
  }

  return values
}

function extractDateIso(text: string): string | undefined {
  const match = DATE_REGEX.exec(text)
  DATE_REGEX.lastIndex = 0
  if (!match) return undefined

  const [, day, month, year] = match
  const yearNum = Number(year)
  if (!Number.isFinite(yearNum) || yearNum < 1980 || yearNum > 2100) return undefined

  return `${year}-${month}-${day}`
}

function sanitizeName(value: string): string {
  return cleanLabelValue(
    value
      .replace(
        /\b(?:nome\s+do\s+)?(?:credor|beneficiario|beneficiario\(a\)|exequente|requerente|autor|advogado|procurador)\b/gi,
        ""
      )
      .replace(/\b(?:cpf|cnpj|oab)\b.*$/i, "")
  )
}

function sanitizeAdvogadoName(value: string): string {
  return cleanLabelValue(
    sanitizeName(value)
      .replace(
        /\b(?:devedor|ente\s+da\s+federacao|entidade\s+a\s+que\s+esta\s+vinculado|procurador(?:\s+principal)?|natureza(?:\s+do\s+credito)?|autor\s+da\s+acao|numero\s+da\s+acao|processo(?:\s+originario|\s+de\s+origem)?|data\s+de|sentenca|acordao|oficio|requisicao)\b.*$/i,
        ""
      )
      .replace(/\s*-\s*[A-Z]{1,3}\s*\d{2,}.*$/i, "")
      .replace(/\s+[A-Z]{1,3}\s*\d{2,}.*$/i, "")
  )
}

function isLikelyName(value: string): boolean {
  if (!value) return false
  if (value.length < 5 || value.length > 180) return false
  if (!/\s+/.test(value)) return false
  if (value.includes(":")) return false
  if (/\d{3,}/.test(value)) return false
  if (/^\d+$/.test(value)) return false

  const normalized = normalizeForSearch(value)
  const blockedTerms = [
    "natureza",
    "credito",
    "alimentar",
    "comum",
    "devedor",
    "estado do",
    "federacao",
    "processo",
    "numero da acao",
    "valor",
    "oficio",
    "requisicao",
    "sentenca",
    "acordao",
    "data ",
    "tipo de acao",
    "judicial",
  ]
  return !blockedTerms.some((term) => normalized.includes(term))
}

function isLikelyAdvogadoName(value: string): boolean {
  if (!isLikelyName(value)) return false
  const normalized = normalizeForSearch(value)
  const blockedTerms = ["autor da acao", "requerente", "credor", "beneficiario", "honorario"]
  return !blockedTerms.some((term) => normalized.includes(term))
}

function pickTextAfterLabel(
  currentLine: string,
  nextLine: string | undefined,
  sanitizer: (value: string) => string,
  validator: (value: string) => boolean
): string | undefined {
  let candidate = ""

  if (currentLine.includes(":")) {
    candidate = currentLine.split(":").slice(1).join(":")
  } else if (currentLine.includes("-")) {
    candidate = currentLine.split("-").slice(1).join("-")
  }

  candidate = sanitizer(candidate)
  if (validator(candidate)) return candidate

  const stripped = sanitizer(currentLine)
  if (validator(stripped) && stripped.length < currentLine.length) return stripped

  if (nextLine) {
    const next = sanitizer(nextLine)
    if (validator(next)) return next
  }

  return undefined
}

function pickExplicitLabelValue(
  content: string,
  patterns: RegExp[],
  sanitizer: (value: string) => string,
  validator: (value: string) => boolean
): string | undefined {
  for (const pattern of patterns) {
    const raw = content.match(pattern)?.[1]
    const candidate = sanitizer(raw || "")
    if (validator(candidate)) return candidate
  }
  return undefined
}

function findTribunal(content: string): string | undefined {
  const upper = content.toUpperCase()

  const tjMatch = upper.match(/\bTJ[\s-]?([A-Z]{2})\b/)
  if (tjMatch) return `TJ${tjMatch[1]}`

  const trfMatch = upper.match(/\bTRF[\s-]?(\d{1,2})\b/)
  if (trfMatch) return `TRF${trfMatch[1]}`

  const trtMatch = upper.match(/\bTRT[\s-]?(\d{1,2})\b/)
  if (trtMatch) return `TRT${trtMatch[1]}`

  if (/\bSTJ\b/.test(upper)) return "STJ"
  if (/\bSTF\b/.test(upper)) return "STF"

  return undefined
}

function findCpfCnpj(content: string): string | undefined {
  const cnpj = content.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/)
  if (cnpj) return cnpj[0]

  const cpf = content.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/)
  if (cpf) return cpf[0]

  const labeledDigits = content.match(/\b(?:CPF|CNPJ)\D{0,15}(\d{11,14})\b/i)
  if (labeledDigits) return labeledDigits[1]

  return undefined
}

function findNatureza(content: string): string | undefined {
  const normalized = normalizeForSearch(content)
  if (normalized.includes("alimentar")) return "Alimentar"
  if (normalized.includes("comum")) return "Comum"
  return undefined
}

function findNumeroOficio(content: string): string | undefined {
  const match = content.match(
    /\b(?:oficio\s+requisitorio(?:\s+judicial)?|oficio|requisitorio|requisicao)\D{0,20}(?:n(?:o|º|°)\s*)?([A-Z0-9.\-\/]{4,})/i
  )
  if (match) return cleanLabelValue(match[1])
  return undefined
}

function findLineSpecificCnj(line: string): string | undefined {
  const match = line.match(CNJ_REGEX)
  return match?.[0]
}

function extractLabeledCnj(content: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const raw = content.match(pattern)?.[1]
    const cnj = raw?.match(CNJ_REGEX)?.[0]
    if (cnj) return cnj
  }
  return undefined
}

export function extrairDadosDeTexto(conteudo: string): DadosExtraidos {
  const content = (conteudo || "").replace(/\u00A0/g, " ").replace(/\r/g, "")
  if (!content.trim()) return {}

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const normalizedLines = lines.map(normalizeForSearch)

  const result: DadosExtraidos = {}
  result.tribunal = findTribunal(content)
  result.cpf_cnpj = findCpfCnpj(content)
  result.natureza_ativo = findNatureza(content)
  result.numero_oficio_requisitorio = findNumeroOficio(content)

  result.numero_processo = extractLabeledCnj(content, [
    /\bnumero\s+da\s+acao\s*:\s*([^\n\r]+)/i,
    /\bprocesso\s+originario\s*:\s*([^\n\r]+)/i,
    /\boriginario\s*:\s*([^\n\r]+)/i,
  ])

  result.numero_precatorio = extractLabeledCnj(content, [
    /\bprojudi\s*-\s*processo\s*:\s*([^\n\r]+)/i,
    /\bprecat[oó]rio\s*:\s*([^\n\r]+)/i,
  ])

  const allCnj = Array.from(new Set(content.match(CNJ_REGEX) || []))
  if (!result.numero_processo && allCnj.length >= 1) {
    result.numero_processo = allCnj[allCnj.length - 1]
  }
  if (!result.numero_precatorio && allCnj.length > 1) {
    result.numero_precatorio = allCnj[0]
  }

  if (!result.autor_credor_originario) {
    result.autor_credor_originario = pickExplicitLabelValue(
      content,
      [
        /\bautor\s+da\s+acao\s*:\s*([^\n\r]+)/i,
        /\bnome\s+do\s+requerente\s*-\s*cpf\/cnpj\s*:\s*([^\n\r]+)/i,
        /\brequerente\s*:\s*([^\n\r]+)/i,
        /\bbenefici[aá]rio\s*:\s*([^\n\r]+)/i,
        /\bcredor(?:\(a\))?\s*:\s*([^\n\r]+)/i,
      ],
      sanitizeName,
      isLikelyName
    )
  }

  if (!result.advogado_acao) {
    const explicitAdvogado = pickExplicitLabelValue(
      content,
      [
        /\badvogado\s+principal\s*:\s*([^\n\r]+)/i,
        /\badvogado(?:\(s\))?\s*:\s*([^\n\r]+)/i,
        /\bprocurador\s+principal\s*:\s*([^\n\r]+)/i,
      ],
      sanitizeAdvogadoName,
      isLikelyAdvogadoName
    )
    if (explicitAdvogado) result.advogado_acao = explicitAdvogado
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const normalizedLine = normalizedLines[index]
    const nextLine = lines[index + 1]

    const isProcessLine =
      normalizedLine.includes("processo originario") ||
      normalizedLine.includes("autos originarios") ||
      normalizedLine.includes("proc. origem") ||
      normalizedLine.includes("numero da acao") ||
      normalizedLine.includes("processo")

    if (!result.numero_processo && isProcessLine) {
      const lineCnj = findLineSpecificCnj(line) || findLineSpecificCnj(nextLine || "")
      if (lineCnj) result.numero_processo = lineCnj
    }

    const isPrecatorioLine =
      normalizedLine.includes("projudi - processo") ||
      normalizedLine.includes("precat") ||
      normalizedLine.includes("requisitorio") ||
      normalizedLine.includes("rpv")

    if (!result.numero_precatorio && isPrecatorioLine) {
      const lineCnj = findLineSpecificCnj(line) || findLineSpecificCnj(nextLine || "")
      if (lineCnj) result.numero_precatorio = lineCnj
    }

    if (
      !result.autor_credor_originario &&
      (normalizedLine.includes("credor") ||
        normalizedLine.includes("beneficiario") ||
        normalizedLine.includes("exequente") ||
        normalizedLine.includes("requerente") ||
        normalizedLine.includes("autor da acao")) &&
      !normalizedLine.includes("cpf") &&
      !normalizedLine.includes("cnpj")
    ) {
      const credor = pickTextAfterLabel(line, nextLine, sanitizeName, isLikelyName)
      if (credor) result.autor_credor_originario = credor
    }

    if (!result.advogado_acao && (normalizedLine.includes("advogado") || normalizedLine.includes("procurador"))) {
      const advogado = pickTextAfterLabel(line, nextLine, sanitizeAdvogadoName, isLikelyAdvogadoName)
      if (advogado) result.advogado_acao = advogado
    }

    const isValorPrincipalLine =
      normalizedLine.includes("valor principal") ||
      normalizedLine.includes("valor principal total") ||
      (normalizedLine.includes("principal:") && normalizedLine.includes("credor de valor principal"))

    if (!result.valor_principal_original && isValorPrincipalLine) {
      const values = extractMoneyCandidates(`${line} ${nextLine || ""}`)
      if (values.length > 0) {
        result.valor_principal_original = values[0]
      }
    }

    const isExpedicaoLine =
      normalizedLine.includes("data de expedicao") ||
      normalizedLine.includes("expedido em") ||
      normalizedLine.includes("data da requisicao") ||
      normalizedLine.includes("trans requisicao")

    if (!result.data_expedicao && isExpedicaoLine) {
      result.data_expedicao = extractDateIso(line) || extractDateIso(nextLine || "")
    }
  }

  if (!result.valor_principal_original) {
    const principalLines = lines.filter((line, index) => {
      const normalized = normalizedLines[index]
      return (
        normalized.includes("valor principal") ||
        normalized.includes("valor principal total") ||
        (normalized.includes("principal:") && normalized.includes("credor de valor principal"))
      )
    })
    const values = principalLines.flatMap((line) => extractMoneyCandidates(line))
    if (values.length > 0) {
      result.valor_principal_original = values[0]
    }
  }

  if (!result.numero_processo && allCnj.length > 0) {
    result.numero_processo = allCnj[allCnj.length - 1]
  }

  if (!result.numero_precatorio && allCnj.length > 1) {
    result.numero_precatorio = allCnj[0]
  }

  return result
}
