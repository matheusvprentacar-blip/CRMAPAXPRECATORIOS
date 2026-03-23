export const DATAJUD_BASE_URL = "https://api-publica.datajud.cnj.jus.br"

const DATAJUD_STATE_SUFFIXES = [
  "ac",
  "al",
  "ap",
  "am",
  "ba",
  "ce",
  "dft",
  "es",
  "go",
  "ma",
  "mt",
  "ms",
  "mg",
  "pa",
  "pb",
  "pr",
  "pe",
  "pi",
  "rj",
  "rn",
  "rs",
  "ro",
  "rr",
  "sc",
  "se",
  "sp",
  "to",
] as const

const DATAJUD_J9_ENDPOINTS: Record<number, string> = {
  13: "tjmmg",
  21: "tjmrs",
  26: "tjmsp",
}

export type DataJudNamedValue = {
  codigo?: string | number | null
  nome?: string | null
}

export type DataJudMovement = {
  dataHora?: string | null
  nome?: string | null
  complementosTabelados?: DataJudNamedValue[] | null
  complemento?: unknown
  [key: string]: unknown
}

export type DataJudProcessSource = {
  numeroProcesso?: string | null
  tribunal?: string | null
  classe?: DataJudNamedValue | null
  sistema?: DataJudNamedValue | null
  formato?: DataJudNamedValue | null
  orgaoJulgador?: DataJudNamedValue | null
  assuntos?: DataJudNamedValue[] | null
  movimentos?: DataJudMovement[] | null
  dataAjuizamento?: string | null
  nivelSigilo?: number | string | null
  grau?: string | number | null
  [key: string]: unknown
}

export type DataJudSearchHit = {
  _index?: string
  _id?: string
  _score?: number
  _source?: DataJudProcessSource | null
  [key: string]: unknown
}

export type DataJudSearchApiResponse = {
  took?: number
  timed_out?: boolean
  hits?: {
    total?: number | { value?: number; relation?: string }
    max_score?: number | null
    hits?: DataJudSearchHit[]
  }
}

export type DataJudEndpointResolution = {
  j: number
  tr: number
  alias: string
  endpoint: string
}

export type DataJudConsultaSuccess = {
  ok: true
  query: {
    numeroProcesso: string
    tribunalAlias: string
    endpoint: string
  }
  meta: {
    took: number | null
    timedOut: boolean
    totalResultados: number
    fetchedAt: string
  }
  found: boolean
  source: DataJudProcessSource | null
  rawResponse: DataJudSearchApiResponse
}

export function normalizeProcessNumber(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 20)
}

export function resolveDataJudEndpoint(numeroProcesso: string): DataJudEndpointResolution | null {
  const digits = normalizeProcessNumber(numeroProcesso)
  if (digits.length !== 20) return null

  const j = Number(digits.slice(13, 14))
  const tr = Number(digits.slice(14, 16))

  let alias: string | null = null

  if (j === 3 && tr === 0) alias = "stj"
  else if (j === 4 && tr >= 1 && tr <= 6) alias = `trf${tr}`
  else if (j === 5 && tr === 0) alias = "tst"
  else if (j === 5 && tr >= 1 && tr <= 24) alias = `trt${tr}`
  else if (j === 6 && tr === 0) alias = "tse"
  else if (j === 6 && tr >= 1 && tr <= DATAJUD_STATE_SUFFIXES.length) alias = `tre-${DATAJUD_STATE_SUFFIXES[tr - 1]}`
  else if (j === 7 && tr === 0) alias = "stm"
  else if (j === 8 && tr >= 1 && tr <= DATAJUD_STATE_SUFFIXES.length) alias = `tj${DATAJUD_STATE_SUFFIXES[tr - 1]}`
  else if (j === 9) alias = DATAJUD_J9_ENDPOINTS[tr] || null

  if (!alias) return null

  return {
    j,
    tr,
    alias,
    endpoint: `api_publica_${alias}/_search`,
  }
}

export function getDataJudTotalHits(response: DataJudSearchApiResponse): number {
  const total = response.hits?.total
  if (typeof total === "number") return total
  if (total && typeof total === "object" && typeof total.value === "number") return total.value
  return response.hits?.hits?.length || 0
}

export function getDataJudFirstSource(response: DataJudSearchApiResponse): DataJudProcessSource | null {
  return response.hits?.hits?.[0]?._source || null
}
