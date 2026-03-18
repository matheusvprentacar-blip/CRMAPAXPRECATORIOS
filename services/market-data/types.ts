export type NormalizationMode = "annual_direct" | "daily_compounded_252"

export type MarketProvider = "BCB_SGS" | "TESOURO_CKAN"

export type MarketSeriesKey = "CDI" | "SELIC" | "TESOURO_DATASET"

export interface MarketSeriesConfig {
  id: string
  key: MarketSeriesKey | string
  provider: MarketProvider | string
  seriesId: string
  normalizationMode: NormalizationMode | string | null
  valueUnit: string | null
  active: boolean
  options: Record<string, unknown>
}

export interface TesouroTituloSnapshot {
  nome: string
  vencimento: string | null
  taxaCompraAa: number | null
  taxaVendaAa: number | null
  puCompra: number | null
  puVenda: number | null
  dataRef: string | null
}

export interface MarketSnapshot {
  refDate: string
  cdiAnnual: number | null
  selicAnnual: number | null
  tesouroTitulos: TesouroTituloSnapshot[]
  sourceMeta: Record<string, unknown>
  createdAt: string | null
  updatedAt: string | null
}

export interface RefreshSnapshotResult {
  snapshot: MarketSnapshot
  created: boolean
}
