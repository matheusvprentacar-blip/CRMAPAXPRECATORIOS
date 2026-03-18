import { MarketSnapshot, TesouroTituloSnapshot } from "@/services/market-data/types"
import { SimulationInput, SimulationOutput, ModoCdi } from "./types"

const PRECATORIO_TAXA_ANUAL_PADRAO = 0.066
const DIAS_UTEIS_ANO = 252

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

function toBrDate(dateIso: string): string {
  const [year, month, day] = dateIso.split("-")
  if (!year || !month || !day) return dateIso
  return `${day}/${month}/${year}`
}

function normalizeDateLabel(value: unknown): string | null {
  if (typeof value !== "string") return null
  const raw = value.trim()
  if (!raw) return null

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return toBrDate(raw)

  return null
}

function resolveCdiUpdatedDate(snapshot: MarketSnapshot): string {
  const sourceMeta = (snapshot.sourceMeta || {}) as Record<string, unknown>
  const bcb = (sourceMeta.bcb || {}) as Record<string, unknown>
  const cdi = (bcb.cdi || {}) as Record<string, unknown>

  const cdiDate = normalizeDateLabel(cdi.rawLatestDate)
  if (cdiDate) return cdiDate

  return toBrDate(snapshot.refDate)
}

function resolveTesouroUpdatedDate(snapshot: MarketSnapshot): string {
  const sourceMeta = (snapshot.sourceMeta || {}) as Record<string, unknown>
  const tesouro = (sourceMeta.tesouro || {}) as Record<string, unknown>

  const latestBr = normalizeDateLabel(tesouro.latestDataRefBr)
  if (latestBr) return latestBr

  const latestIso = normalizeDateLabel(tesouro.latestDataRefIso)
  if (latestIso) return latestIso

  return toBrDate(snapshot.refDate)
}

function parseDateInput(input: string): Date | null {
  const raw = String(input || "").trim()
  if (!raw) return null

  if (/^\d{4}$/.test(raw)) {
    const parsed = new Date(`${raw}-12-31T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const loose = new Date(raw)
  return Number.isNaN(loose.getTime()) ? null : loose
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function addMonths(date: Date, amount: number): Date {
  const clone = new Date(date)
  const day = clone.getDate()

  clone.setMonth(clone.getMonth() + amount)
  if (clone.getDate() < day) {
    clone.setDate(0)
  }

  return clone
}

function diffInMonths(start: Date, end: Date): number {
  if (end <= start) return 0

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) {
    months -= 1
  }

  return Math.max(months, 0)
}

function formatMonthLabel(date: Date): string {
  return `${pad2(date.getMonth() + 1)}/${date.getFullYear()}`
}

function ensureAnnualDecimal(value: number | null | undefined): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return num > 1 ? num / 100 : num
}

export function annualToMonthly(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

export function projectValue(initialValue: number, annualRate: number, months: number): number {
  if (months <= 0) return initialValue
  const monthlyRate = annualToMonthly(annualRate)
  return initialValue * Math.pow(1 + monthlyRate, months)
}

export function calculateCagr(initialValue: number, finalValue: number, months: number): number {
  if (months <= 0 || initialValue <= 0 || finalValue <= 0) return 0
  return Math.pow(finalValue / initialValue, 12 / months) - 1
}

function annualToDaily252(annualRate: number): number {
  if (!Number.isFinite(annualRate) || annualRate <= -1) return 0
  return Math.pow(1 + annualRate, 1 / DIAS_UTEIS_ANO) - 1
}

function daily252ToAnnual(dailyRate: number): number {
  if (!Number.isFinite(dailyRate) || dailyRate <= -1) return 0
  return Math.pow(1 + dailyRate, DIAS_UTEIS_ANO) - 1
}

function resolveCdiRate(baseCdiAnnual: number, mode: ModoCdi): number {
  if (mode === "cdi_plus_10pp") {
    return baseCdiAnnual + 0.1
  }

  // 110% do CDI: aplicar 1.10 sobre CDI diario e so entao anualizar (252 dias uteis).
  const cdiDiarioBase = annualToDaily252(baseCdiAnnual)
  const cdiDiario110 = cdiDiarioBase * 1.1
  return daily252ToAnnual(cdiDiario110)
}

function resolveCdiModeLabel(mode: ModoCdi): string {
  return mode === "cdi_plus_10pp" ? "CDI + 10 p.p. a.a." : "110% do CDI (base diaria, anualizado em 252 dias uteis)"
}

function pickTesouroTitulo(
  snapshot: MarketSnapshot,
  requestedName?: string | null,
): TesouroTituloSnapshot | null {
  const titulos = snapshot.tesouroTitulos || []
  if (titulos.length === 0) return null

  if (requestedName) {
    const lowered = requestedName.toLowerCase()
    const exact = titulos.find((item) => item.nome.toLowerCase() === lowered)
    if (exact) return exact

    const contains = titulos.find((item) => item.nome.toLowerCase().includes(lowered))
    if (contains) return contains
  }

  const selic = titulos.find((item) => item.nome.toLowerCase().includes("selic"))
  return selic || titulos[0]
}

function buildCard(initialValue: number, annualRate: number, months: number) {
  const monthlyRate = annualToMonthly(annualRate)
  const finalValue = projectValue(initialValue, annualRate, months)
  const rentabilidadeAcumulada = initialValue > 0 ? finalValue / initialValue - 1 : 0
  const cagr = calculateCagr(initialValue, finalValue, months)

  return {
    taxaAnual: annualRate,
    taxaMensal: monthlyRate,
    valorFinal: finalValue,
    rentabilidadeAcumulada,
    cagr,
  }
}

export function runComparativoSimulation(
  snapshot: MarketSnapshot,
  input: SimulationInput,
): SimulationOutput {
  const dataVendaDate = parseDateInput(input.dataVenda)
  const dataPagamentoDate = parseDateInput(input.dataPagamento)

  if (!dataVendaDate) {
    throw new Error("Data de venda invalida")
  }

  if (!dataPagamentoDate) {
    throw new Error("Data de pagamento invalida")
  }

  const horizonteMeses = diffInMonths(dataVendaDate, dataPagamentoDate)
  const horizonteAnos = horizonteMeses / 12

  const precoCompra = Number(input.precoCompra)
  if (!Number.isFinite(precoCompra) || precoCompra <= 0) {
    throw new Error("Preco de compra deve ser maior que zero")
  }

  const cdiBaseAnual = ensureAnnualDecimal(snapshot.cdiAnnual)
  const cdiResultanteAnual = resolveCdiRate(cdiBaseAnual, input.modoCdi)

  const tesouroTituloSelecionado = pickTesouroTitulo(snapshot, input.tesouroTituloNome)
  const tesouroRateAnnual = ensureAnnualDecimal(tesouroTituloSelecionado?.taxaCompraAa ?? 0)

  const precatorioCard = buildCard(precoCompra, PRECATORIO_TAXA_ANUAL_PADRAO, horizonteMeses)
  const cdiCard = buildCard(precoCompra, cdiResultanteAnual, horizonteMeses)
  const tesouroCard = buildCard(precoCompra, tesouroRateAnnual, horizonteMeses)
  const cdiProdutoLabel = input.modoCdi === "cdi_plus_10pp" ? "CDI + 10 p.p." : "110% do CDI"

  const serieMensal = Array.from({ length: horizonteMeses + 1 }).map((_, monthIndex) => {
    const pointDate = addMonths(dataVendaDate, monthIndex)
    return {
      mes: monthIndex,
      dataRef: toIsoDate(pointDate),
      label: formatMonthLabel(pointDate),
      precatorio: projectValue(precoCompra, PRECATORIO_TAXA_ANUAL_PADRAO, monthIndex),
      cdiMais10: projectValue(precoCompra, cdiResultanteAnual, monthIndex),
      tesouro: projectValue(precoCompra, tesouroRateAnnual, monthIndex),
    }
  })

  const modoLabel = resolveCdiModeLabel(input.modoCdi)
  const snapshotDateBr = toBrDate(snapshot.refDate)
  const cdiDateBr = resolveCdiUpdatedDate(snapshot)
  const tesouroDateBr = resolveTesouroUpdatedDate(snapshot)

  const tabelaFinal = [
    {
      produto: "Precatorio (projecao fixa)",
      taxaUsadaLabel: "6,60% a.a.",
      valorFinal: precatorioCard.valorFinal,
      rentabilidadeAcumulada: precatorioCard.rentabilidadeAcumulada,
      cagr: precatorioCard.cagr,
      atualizadoEm: snapshotDateBr,
    },
    {
      produto: cdiProdutoLabel,
      taxaUsadaLabel: `${(cdiResultanteAnual * 100).toFixed(2)}% a.a. (${modoLabel})`,
      valorFinal: cdiCard.valorFinal,
      rentabilidadeAcumulada: cdiCard.rentabilidadeAcumulada,
      cagr: cdiCard.cagr,
      atualizadoEm: cdiDateBr,
    },
    {
      produto: tesouroTituloSelecionado?.nome ? `Tesouro Direto (${tesouroTituloSelecionado.nome})` : "Tesouro Direto",
      taxaUsadaLabel: `${(tesouroRateAnnual * 100).toFixed(2)}% a.a.`,
      valorFinal: tesouroCard.valorFinal,
      rentabilidadeAcumulada: tesouroCard.rentabilidadeAcumulada,
      cagr: tesouroCard.cagr,
      atualizadoEm: tesouroDateBr,
    },
  ]

  return {
    snapshotRefDate: snapshot.refDate,
    horizonteMeses,
    horizonteAnos,
    modoCdi: input.modoCdi,
    modoCdiLabel: modoLabel,
    cdiBaseAnual,
    cdiResultanteAnual,
    tesouroTitulo: tesouroTituloSelecionado?.nome || "Tesouro Selic",
    tesouroFonteLabel: "Tesouro Transparente (taxas do dia)",
    cards: {
      precatorio: precatorioCard,
      cdiMais10: cdiCard,
      tesouro: tesouroCard,
    },
    serieMensal,
    tabelaFinal,
    disclaimer: `Simulacao baseada em taxas coletadas em ${snapshotDateBr}. CDI base em ${cdiDateBr}. Tesouro base em ${tesouroDateBr}. Nao constitui recomendacao ou garantia de retorno.`,
  }
}

export function normalizePagamentoDateInput(value: string | null | undefined): string {
  const raw = String(value || "").trim()
  if (!raw) return ""

  if (/^\d{4}$/.test(raw)) {
    return `${raw}-12-31`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const parsed = parseDateInput(raw)
  return parsed ? toIsoDate(parsed) : ""
}

export function normalizeVendaDateInput(value: string | null | undefined): string {
  const parsed = parseDateInput(String(value || ""))
  return parsed ? toIsoDate(parsed) : ""
}

export const PRECATORIO_FIXED_ANNUAL_RATE = PRECATORIO_TAXA_ANUAL_PADRAO
