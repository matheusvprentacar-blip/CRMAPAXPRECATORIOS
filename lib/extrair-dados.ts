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
    .replace(/^[\s:;.\-–—]+/, "")
    .replace(/[\s:;.\-–—]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseMoney(raw: string): number | undefined {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")

  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) return undefined
  if (parsed <= 0) return undefined
  return parsed
}

function extractMoneyCandidates(text: string): number[] {
  const values: number[] = []
  const matches = text.matchAll(MONEY_REGEX)

  for (const match of matches) {
    const value = parseMoney(match[1])
    if (value !== undefined) {
      values.push(value)
    }
  }

  return values
}

function extractDateIso(text: string): string | undefined {
  const match = DATE_REGEX.exec(text)
  DATE_REGEX.lastIndex = 0
  if (!match) return undefined

  const [, day, month, year] = match
  const yearNum = Number(year)
  if (!Number.isFinite(yearNum) || yearNum < 1980 || yearNum > 2100) {
    return undefined
  }

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

function isLikelyName(value: string): boolean {
  if (!value) return false
  if (value.length < 5) return false
  if (/\d{3,}/.test(value)) return false
  if (/^\d+$/.test(value)) return false
  return true
}

function pickTextAfterLabel(currentLine: string, nextLine?: string): string | undefined {
  let candidate = ""

  if (currentLine.includes(":")) {
    candidate = currentLine.split(":").slice(1).join(":")
  } else if (currentLine.includes("-")) {
    candidate = currentLine.split("-").slice(1).join("-")
  }

  candidate = sanitizeName(candidate)
  if (isLikelyName(candidate)) {
    return candidate
  }

  const stripped = sanitizeName(currentLine)
  if (isLikelyName(stripped) && stripped.length < currentLine.length) {
    return stripped
  }

  if (nextLine) {
    const next = sanitizeName(nextLine)
    if (isLikelyName(next)) {
      return next
    }
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
    /\b(?:oficio|requisitorio|requisicao)\D{0,15}(?:n(?:o|º|°)\s*)?([A-Z0-9.\-\/]{4,})/i
  )
  if (match) return cleanLabelValue(match[1])
  return undefined
}

function findLineSpecificCnj(line: string): string | undefined {
  const match = line.match(CNJ_REGEX)
  return match?.[0]
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

  const allCnj = Array.from(new Set(content.match(CNJ_REGEX) || []))
  if (allCnj.length === 1) {
    result.numero_precatorio = allCnj[0]
    result.numero_processo = allCnj[0]
  } else if (allCnj.length > 1) {
    result.numero_precatorio = allCnj[0]
    result.numero_processo = allCnj[allCnj.length - 1]
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const normalizedLine = normalizedLines[index]
    const nextLine = lines[index + 1]

    const isProcessLine =
      normalizedLine.includes("processo originario") ||
      normalizedLine.includes("autos originarios") ||
      normalizedLine.includes("autos") ||
      normalizedLine.includes("proc. origem") ||
      normalizedLine.includes("processo")

    if (!result.numero_processo && isProcessLine) {
      const lineCnj = findLineSpecificCnj(line) || findLineSpecificCnj(nextLine || "")
      if (lineCnj) result.numero_processo = lineCnj
    }

    const isPrecatorioLine =
      normalizedLine.includes("precatorio") ||
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
        normalizedLine.includes("autor")) &&
      !normalizedLine.includes("cpf") &&
      !normalizedLine.includes("cnpj")
    ) {
      const credor = pickTextAfterLabel(line, nextLine)
      if (credor) {
        result.autor_credor_originario = credor
      }
    }

    if (
      !result.advogado_acao &&
      (normalizedLine.includes("advogado") || normalizedLine.includes("procurador"))
    ) {
      const advogado = pickTextAfterLabel(line, nextLine)
      if (advogado) {
        result.advogado_acao = advogado
      }
    }

    const isValorPrincipalLine =
      normalizedLine.includes("valor principal") ||
      normalizedLine.includes("valor requisitado") ||
      normalizedLine.includes("valor total requisitado") ||
      normalizedLine.includes("valor do precatorio") ||
      normalizedLine.includes("valor da condenacao") ||
      normalizedLine.includes("principal liquido")

    if (!result.valor_principal_original && isValorPrincipalLine) {
      const values = extractMoneyCandidates(`${line} ${nextLine || ""}`)
      if (values.length > 0) {
        result.valor_principal_original = values[values.length - 1]
      }
    }

    const isExpedicaoLine =
      normalizedLine.includes("data de expedicao") ||
      normalizedLine.includes("expedicao") ||
      normalizedLine.includes("expedido em") ||
      normalizedLine.includes("data da requisicao")

    if (!result.data_expedicao && isExpedicaoLine) {
      result.data_expedicao = extractDateIso(line) || extractDateIso(nextLine || "")
    }
  }

  if (!result.valor_principal_original) {
    const valorLines = lines.filter((line, index) => normalizedLines[index].includes("valor"))
    const allValues = valorLines.flatMap((line) => extractMoneyCandidates(line))
    if (allValues.length > 0) {
      result.valor_principal_original = Math.max(...allValues)
    }
  }

  if (!result.numero_precatorio && allCnj.length > 0) {
    result.numero_precatorio = allCnj[0]
  }

  if (!result.numero_processo && allCnj.length > 0) {
    result.numero_processo = allCnj[allCnj.length - 1]
  }

  return result
}
