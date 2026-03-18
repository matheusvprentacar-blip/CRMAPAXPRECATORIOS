import * as XLSX from "xlsx"
import {
  MarketSeriesConfig,
  MarketSnapshot,
  RefreshSnapshotResult,
  TesouroTituloSnapshot,
  NormalizationMode,
} from "./types"

const BCB_ENDPOINT = "https://api.bcb.gov.br/dados/serie/bcdata.sgs"
const TESOURO_CKAN_PACKAGE_ENDPOINT = "https://www.tesourotransparente.gov.br/ckan/api/3/action/package_show"
const DEFAULT_TESOURO_DATASET_ID = "taxas-dos-titulos-ofertados-pelo-tesouro-direto"

type SupabaseLike = {
  from: (table: string) => SupabaseQueryBuilder
}

type SupabaseQueryBuilder = {
  select: (columns: string) => SupabaseQueryBuilder
  eq: (column: string, value: unknown) => SupabaseQueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder
  limit: (count: number) => SupabaseQueryBuilder
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
  upsert: (payload: Record<string, unknown>, options?: { onConflict?: string }) => SupabaseQueryBuilder
  single: () => Promise<{ data: Record<string, unknown>; error: { message: string } | null }>
}

type BcbSeriesItem = {
  data: string
  valor: string
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
}

function getSaoPauloIsoDate(reference: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference)

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || ""
  const year = getPart("year")
  const month = getPart("month")
  const day = getPart("day")
  return `${year}-${month}-${day}`
}

function isoToBrDate(dateIso: string): string {
  const [year, month, day] = dateIso.split("-")
  return `${day}/${month}/${year}`
}

function isoToDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function shiftDate(dateIso: string, days: number): string {
  const base = isoToDate(dateIso)
  if (!base) return dateIso
  base.setDate(base.getDate() + days)
  return getSaoPauloIsoDate(base)
}

function parseDateBrToIso(value: string): string | null {
  const match = String(value).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

function parseDateToIso(value: string | null | undefined): string | null {
  const raw = String(value || "").trim()
  if (!raw) return null

  const brIso = parseDateBrToIso(raw)
  if (brIso) return brIso

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  return null
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  let normalized = trimmed.replace(/\s/g, "")
  const hasComma = normalized.includes(",")
  const hasDot = normalized.includes(".")

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",")
    const lastDot = normalized.lastIndexOf(".")
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(/,/g, ".")
    } else {
      normalized = normalized.replace(/,/g, "")
    }
  } else if (hasComma) {
    normalized = normalized.replace(/,/g, ".")
  }

  normalized = normalized.replace(/[^0-9.-]/g, "")
  if (!normalized || normalized === "." || normalized === "-" || normalized === "-." || normalized === ".-") {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeMode(mode: string | null | undefined): NormalizationMode {
  return mode === "daily_compounded_252" ? "daily_compounded_252" : "annual_direct"
}

function ensureAnnualDecimal(value: number | null, unit: string | null | undefined): number | null {
  if (value === null || !Number.isFinite(value)) return null

  const normalizedUnit = String(unit || "").toLowerCase()
  if (normalizedUnit.includes("decimal")) {
    return value
  }

  if (normalizedUnit.includes("percent") || normalizedUnit.includes("%")) {
    return value / 100
  }

  return value > 1 ? value / 100 : value
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function toSnapshotFromRow(row: Record<string, unknown>): MarketSnapshot {
  const tesouroTitulos = asArray<Record<string, unknown>>(row?.tesouro_json).map((item) => {
    const nome = String(item?.nome || "")
    const vencimento = item?.vencimento ? String(item.vencimento) : null
    const taxaCompraAa = parseNumeric(item?.taxaCompraAa ?? item?.taxa_compra_aa)
    const taxaVendaAa = parseNumeric(item?.taxaVendaAa ?? item?.taxa_venda_aa)
    const puCompra = parseNumeric(item?.puCompra ?? item?.pu_compra)
    const puVenda = parseNumeric(item?.puVenda ?? item?.pu_venda)
    const dataRef = item?.dataRef ? String(item.dataRef) : (item?.data_ref ? String(item.data_ref) : null)

    return {
      nome,
      vencimento,
      taxaCompraAa,
      taxaVendaAa,
      puCompra,
      puVenda,
      dataRef,
    } satisfies TesouroTituloSnapshot
  })

  return {
    refDate: String(row?.ref_date || ""),
    cdiAnnual: typeof row?.cdi_annual === "number" ? row.cdi_annual : parseNumeric(row?.cdi_annual),
    selicAnnual: typeof row?.selic_annual === "number" ? row.selic_annual : parseNumeric(row?.selic_annual),
    tesouroTitulos,
    sourceMeta: (row?.source_meta || {}) as Record<string, unknown>,
    createdAt: row?.created_at ? String(row.created_at) : null,
    updatedAt: row?.updated_at ? String(row.updated_at) : null,
  }
}

function mapConfigRows(rows: Array<Record<string, unknown>>): MarketSeriesConfig[] {
  return rows.map((row) => ({
    id: String(row.id),
    key: String(row.key),
    provider: String(row.provider),
    seriesId: String(row.series_id || ""),
    normalizationMode: row.normalization_mode ? String(row.normalization_mode) : null,
    valueUnit: row.value_unit ? String(row.value_unit) : null,
    active: Boolean(row.active),
    options: (row.options_json || {}) as Record<string, unknown>,
  }))
}

function findConfig(configs: MarketSeriesConfig[], key: string, provider?: string): MarketSeriesConfig | null {
  const normalizedKey = key.toLowerCase()
  const normalizedProvider = provider ? provider.toLowerCase() : null

  return (
    configs.find((item) => {
      const keyMatches = String(item.key).toLowerCase() === normalizedKey
      if (!keyMatches) return false
      if (!normalizedProvider) return true
      return String(item.provider).toLowerCase() === normalizedProvider
    }) || null
  )
}

function toBcbUrl(seriesId: string, dateStartIso: string, dateEndIso: string): string {
  const start = isoToBrDate(dateStartIso)
  const end = isoToBrDate(dateEndIso)
  return `${BCB_ENDPOINT}.${encodeURIComponent(seriesId)}/dados?formato=json&dataInicial=${encodeURIComponent(start)}&dataFinal=${encodeURIComponent(end)}`
}

async function fetchBcbNormalizedAnnual(
  config: MarketSeriesConfig,
  referenceIsoDate: string,
  fetchImpl: typeof fetch,
): Promise<{ annual: number; meta: Record<string, unknown> }> {
  const mode = normalizeMode(config.normalizationMode)
  const startDate = shiftDate(referenceIsoDate, mode === "daily_compounded_252" ? -450 : -30)
  const url = toBcbUrl(config.seriesId, startDate, referenceIsoDate)

  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`BCB request failed (${response.status}): ${body}`)
  }

  const payload = (await response.json()) as BcbSeriesItem[]
  const rows = asArray<BcbSeriesItem>(payload)
    .map((item) => {
      const dateIso = parseDateBrToIso(item.data)
      const value = parseNumeric(item.valor)
      return {
        rawDate: item.data,
        rawValue: item.valor,
        dateIso,
        value,
      }
    })
    .filter((item) => item.dateIso && item.value !== null) as Array<{
      rawDate: string
      rawValue: string
      dateIso: string
      value: number
    }>

  if (rows.length === 0) {
    throw new Error(`BCB series ${config.seriesId} returned no usable values`)
  }

  rows.sort((a, b) => a.dateIso.localeCompare(b.dateIso))
  const latest = rows[rows.length - 1]

  if (mode === "annual_direct") {
    const annual = ensureAnnualDecimal(latest.value, config.valueUnit)
    if (annual === null) {
      throw new Error(`Could not normalize annual value for BCB series ${config.seriesId}`)
    }

    return {
      annual,
      meta: {
        seriesId: config.seriesId,
        provider: config.provider,
        normalizationMode: mode,
        valueUnit: config.valueUnit || null,
        rawLatestValue: latest.rawValue,
        rawLatestDate: latest.rawDate,
        sampleCount: rows.length,
        request: { startDate, endDate: referenceIsoDate, url },
      },
    }
  }

  const sample = rows.slice(-252)
  let compounded = 1

  for (const row of sample) {
    const daily = ensureAnnualDecimal(row.value, config.valueUnit)
    if (daily === null) continue
    compounded *= 1 + daily
  }

  if (sample.length === 0) {
    throw new Error(`BCB series ${config.seriesId} has no sample for daily composition`)
  }

  const annual = Math.pow(compounded, 252 / sample.length) - 1

  return {
    annual,
    meta: {
      seriesId: config.seriesId,
      provider: config.provider,
      normalizationMode: mode,
      valueUnit: config.valueUnit || null,
      rawLatestValue: latest.rawValue,
      rawLatestDate: latest.rawDate,
      sampleCount: sample.length,
      request: { startDate, endDate: referenceIsoDate, url },
    },
  }
}

function readCsvRows(csvText: string): Record<string, unknown>[] {
  const parse = (fieldSeparator?: string) => {
    const workbook = XLSX.read(csvText, {
      type: "string",
      FS: fieldSeparator,
      raw: false,
      cellDates: false,
    })

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return []
    const sheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
  }

  const semicolonRows = parse(";")
  if (semicolonRows.length > 0) return semicolonRows
  return parse(",")
}

function getValueByAliases(row: Record<string, unknown>, aliases: string[]): unknown {
  const normalizedRow = new Map<string, unknown>()
  for (const [key, value] of Object.entries(row)) {
    normalizedRow.set(normalizeText(key), value)
  }

  for (const alias of aliases) {
    const hit = normalizedRow.get(normalizeText(alias))
    if (hit !== undefined && hit !== null && String(hit).trim().length > 0) {
      return hit
    }
  }

  return null
}

function mapTesouroRow(row: Record<string, unknown>): TesouroTituloSnapshot | null {
  const nome = getValueByAliases(row, [
    "tipo_titulo",
    "tipo titulo",
    "titulo",
    "nome_titulo",
    "nome titulo",
  ])

  if (!nome) return null

  const vencimento = getValueByAliases(row, [
    "data_vencimento",
    "data vencimento",
    "vencimento",
    "data venc",
  ])

  const taxaCompra = getValueByAliases(row, [
    "taxa_compra_manha",
    "taxa compra manha",
    "taxa_compra",
    "taxa compra",
    "taxa compra aa",
  ])

  const taxaVenda = getValueByAliases(row, [
    "taxa_venda_manha",
    "taxa venda manha",
    "taxa_venda",
    "taxa venda",
    "taxa venda aa",
  ])

  const puCompra = getValueByAliases(row, ["pu_compra_manha", "pu compra manha", "pu_compra", "pu compra"])
  const puVenda = getValueByAliases(row, ["pu_venda_manha", "pu venda manha", "pu_venda", "pu venda"])

  const dataRef = getValueByAliases(row, ["data_base", "data base", "data_referencia", "data referencia", "data"])

  return {
    nome: String(nome).trim(),
    vencimento: vencimento ? String(vencimento).trim() : null,
    taxaCompraAa: parseNumeric(taxaCompra),
    taxaVendaAa: parseNumeric(taxaVenda),
    puCompra: parseNumeric(puCompra),
    puVenda: parseNumeric(puVenda),
    dataRef: dataRef ? String(dataRef).trim() : null,
  }
}

function filterByLatestDataRef(items: TesouroTituloSnapshot[]): {
  latestDataRefIso: string | null
  filtered: TesouroTituloSnapshot[]
  withValidDateCount: number
} {
  if (items.length === 0) {
    return {
      latestDataRefIso: null,
      filtered: [],
      withValidDateCount: 0,
    }
  }

  const parsed = items
    .map((item) => ({
      item,
      dataRefIso: parseDateToIso(item.dataRef),
    }))
    .filter((entry) => Boolean(entry.dataRefIso)) as Array<{
    item: TesouroTituloSnapshot
    dataRefIso: string
  }>

  if (parsed.length === 0) {
    return {
      latestDataRefIso: null,
      filtered: items,
      withValidDateCount: 0,
    }
  }

  let latestDataRefIso = parsed[0].dataRefIso
  for (const entry of parsed) {
    if (entry.dataRefIso > latestDataRefIso) {
      latestDataRefIso = entry.dataRefIso
    }
  }

  const filtered = parsed.filter((entry) => entry.dataRefIso === latestDataRefIso).map((entry) => entry.item)

  return {
    latestDataRefIso,
    filtered,
    withValidDateCount: parsed.length,
  }
}

function dedupeTitulos(items: TesouroTituloSnapshot[]): TesouroTituloSnapshot[] {
  const seen = new Set<string>()
  const out: TesouroTituloSnapshot[] = []

  for (const item of items) {
    const key = `${normalizeText(item.nome)}::${item.vencimento || ""}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }

  return out
}

function pickPreferredTitulos(items: TesouroTituloSnapshot[]): TesouroTituloSnapshot[] {
  if (items.length === 0) return []
  const deduped = dedupeTitulos(items)

  const pickByKeyword = (keyword: string) => deduped.find((item) => normalizeText(item.nome).includes(keyword)) || null

  const selic = pickByKeyword("selic")
  const ipca = pickByKeyword("ipca")
  const prefixado = pickByKeyword("prefix")

  const preferred = [selic, ipca, prefixado].filter((item): item is TesouroTituloSnapshot => Boolean(item))
  if (preferred.length > 0) return dedupeTitulos(preferred)

  return deduped.slice(0, 3)
}

async function fetchTesouroTitulos(
  configs: MarketSeriesConfig[],
  fetchImpl: typeof fetch,
): Promise<{ titulos: TesouroTituloSnapshot[]; meta: Record<string, unknown> }> {
  const config = findConfig(configs, "TESOURO_DATASET", "TESOURO_CKAN")
  const datasetId = config?.seriesId || DEFAULT_TESOURO_DATASET_ID
  const packageUrl = `${TESOURO_CKAN_PACKAGE_ENDPOINT}?id=${encodeURIComponent(datasetId)}`

  const packageResponse = await fetchImpl(packageUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })

  if (!packageResponse.ok) {
    const body = await packageResponse.text()
    throw new Error(`Tesouro package_show failed (${packageResponse.status}): ${body}`)
  }

  const packagePayload = (await packageResponse.json()) as {
    success?: boolean
    result?: {
      resources?: Array<Record<string, unknown>>
    }
  }

  const resources = asArray<Record<string, unknown>>(packagePayload?.result?.resources)
  const csvResources = resources.filter((resource) => {
    const format = String(resource?.format || "").toLowerCase()
    return format.includes("csv")
  })

  if (csvResources.length === 0) {
    throw new Error("Tesouro dataset has no CSV resources")
  }

  const sortedResources = csvResources.sort((a, b) => {
    const aDate = String(a.last_modified || a.created || "")
    const bDate = String(b.last_modified || b.created || "")
    return bDate.localeCompare(aDate)
  })

  const selected = sortedResources[0]
  const resourceUrl = String(selected?.url || "")
  if (!resourceUrl) {
    throw new Error("Tesouro CSV resource URL missing")
  }

  const csvResponse = await fetchImpl(resourceUrl, {
    method: "GET",
    headers: { Accept: "text/csv,*/*" },
    cache: "no-store",
  })

  if (!csvResponse.ok) {
    const body = await csvResponse.text()
    throw new Error(`Tesouro CSV download failed (${csvResponse.status}): ${body}`)
  }

  const csvText = await csvResponse.text()
  const rows = readCsvRows(csvText)
  const mapped = rows.map(mapTesouroRow).filter((item): item is TesouroTituloSnapshot => Boolean(item))
  const latestFilter = filterByLatestDataRef(mapped)
  const preferred = pickPreferredTitulos(latestFilter.filtered)

  return {
    titulos: preferred,
    meta: {
      datasetId,
      packageUrl,
      resourceUrl,
      resourceId: selected?.id || null,
      resourceName: selected?.name || null,
      resourceLastModified: selected?.last_modified || null,
      totalRows: rows.length,
      mappedRows: mapped.length,
      latestDataRefIso: latestFilter.latestDataRefIso,
      latestDataRefBr: latestFilter.latestDataRefIso ? isoToBrDate(latestFilter.latestDataRefIso) : null,
      latestRows: latestFilter.filtered.length,
      rowsWithValidDataRef: latestFilter.withValidDateCount,
      selectedTitles: preferred.map((item) => item.nome),
    },
  }
}

export async function getLatestSnapshot(supabase: SupabaseLike): Promise<MarketSnapshot | null> {
  const { data, error } = await supabase
    .from("market_rates_daily")
    .select("*")
    .order("ref_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch latest market snapshot: ${error.message}`)
  }

  if (!data) return null
  return toSnapshotFromRow(data)
}

export async function refreshTodaySnapshot(
  supabase: SupabaseLike,
  options?: {
    fetchImpl?: typeof fetch
    referenceDate?: Date
  },
): Promise<RefreshSnapshotResult> {
  const fetchImpl = options?.fetchImpl || fetch
  const referenceDate = options?.referenceDate || new Date()
  const refDate = getSaoPauloIsoDate(referenceDate)

  const { data: existingRow, error: existingError } = await supabase
    .from("market_rates_daily")
    .select("ref_date")
    .eq("ref_date", refDate)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to verify existing snapshot: ${existingError.message}`)
  }

  const configQuery = supabase
    .from("market_series_config")
    .select("*")
    .eq("active", true) as unknown as Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>

  const { data: configRows, error: configError } = await configQuery

  if (configError) {
    throw new Error(`Failed to load market series config: ${configError.message}`)
  }

  const configs = mapConfigRows(asArray<Record<string, unknown>>(configRows))

  const cdiConfig = findConfig(configs, "CDI", "BCB_SGS")
  if (!cdiConfig) {
    throw new Error("Active CDI configuration was not found in market_series_config")
  }

  const cdiResult = await fetchBcbNormalizedAnnual(cdiConfig, refDate, fetchImpl)

  const selicConfig = findConfig(configs, "SELIC", "BCB_SGS")
  const selicResult = selicConfig ? await fetchBcbNormalizedAnnual(selicConfig, refDate, fetchImpl) : null

  const tesouroResult = await fetchTesouroTitulos(configs, fetchImpl)

  const payload = {
    ref_date: refDate,
    cdi_annual: cdiResult.annual,
    selic_annual: selicResult?.annual ?? null,
    tesouro_json: tesouroResult.titulos,
    source_meta: {
      fetchedAt: new Date().toISOString(),
      bcb: {
        cdi: cdiResult.meta,
        selic: selicResult?.meta || null,
      },
      tesouro: tesouroResult.meta,
    },
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("market_rates_daily")
    .upsert(payload, { onConflict: "ref_date" })
    .select("*")
    .single()

  if (upsertError) {
    throw new Error(`Failed to upsert market snapshot: ${upsertError.message}`)
  }

  return {
    snapshot: toSnapshotFromRow(upserted),
    created: !existingRow,
  }
}

export function isSnapshotStale(snapshot: MarketSnapshot, referenceDate: Date = new Date()): boolean {
  const today = getSaoPauloIsoDate(referenceDate)
  return snapshot.refDate !== today
}
