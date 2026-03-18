export type ModoCdi = "cdi_110" | "cdi_plus_10pp"

export interface SimulationInput {
  dataVenda: string
  precoCompra: number
  dataPagamento: string
  modoCdi: ModoCdi
  tesouroTituloNome?: string | null
}

export interface SimulationCardResult {
  taxaAnual: number
  taxaMensal: number
  valorFinal: number
  rentabilidadeAcumulada: number
  cagr: number
}

export interface ComparativoLinhaMensal {
  mes: number
  dataRef: string
  label: string
  precatorio: number
  cdiMais10: number
  tesouro: number
}

export interface SimulationTableRow {
  produto: string
  taxaUsadaLabel: string
  valorFinal: number
  rentabilidadeAcumulada: number
  cagr: number
  atualizadoEm: string
}

export interface SimulationOutput {
  snapshotRefDate: string
  horizonteMeses: number
  horizonteAnos: number
  modoCdi: ModoCdi
  modoCdiLabel: string
  cdiBaseAnual: number
  cdiResultanteAnual: number
  tesouroTitulo: string
  tesouroFonteLabel: string
  cards: {
    precatorio: SimulationCardResult
    cdiMais10: SimulationCardResult
    tesouro: SimulationCardResult
  }
  serieMensal: ComparativoLinhaMensal[]
  tabelaFinal: SimulationTableRow[]
  disclaimer: string
}
