// Tabela de Ã­ndices SELIC/IPCA conforme planilha oficial
import { TABELA_IPCA_FATORES_EC113 } from "./dados-ec113"
export type LinhaIndice = {
  periodo: string // "SELIC - Novembro/2023"
  dataRef: string // "2023-11-01"
  indice: number // 0.9160
}

export const TABELA_INDICES_COMPLETA: LinhaIndice[] = [
  // SELIC atÃ© Dezembro/2021
  { periodo: "SELIC - Dezembro/2021", dataRef: "2021-12-01", indice: 0.77 },
  { periodo: "SELIC - Novembro/2021", dataRef: "2021-11-01", indice: 0.7288 },
  { periodo: "SELIC - Outubro/2021", dataRef: "2021-10-01", indice: 0.6417 },
  { periodo: "SELIC - Setembro/2021", dataRef: "2021-09-01", indice: 0.5483 },
  { periodo: "SELIC - Agosto/2021", dataRef: "2021-08-01", indice: 0.4567 },
  { periodo: "SELIC - Julho/2021", dataRef: "2021-07-01", indice: 0.3992 },
  { periodo: "SELIC - Junho/2021", dataRef: "2021-06-01", indice: 0.3658 },
  { periodo: "SELIC - Maio/2021", dataRef: "2021-05-01", indice: 0.3108 },
  { periodo: "SELIC - Abril/2021", dataRef: "2021-04-01", indice: 0.2483 },
  { periodo: "SELIC - MarÃ§o/2021", dataRef: "2021-03-01", indice: 0.1883 },
  { periodo: "SELIC - Fevereiro/2021", dataRef: "2021-02-01", indice: 0.1492 },
  { periodo: "SELIC - Janeiro/2021", dataRef: "2021-01-01", indice: 0.1483 },

  // IPCA a partir de Janeiro/2022
  { periodo: "IPCA - Janeiro/2022", dataRef: "2022-01-01", indice: 0.54 },
  { periodo: "IPCA - Fevereiro/2022", dataRef: "2022-02-01", indice: 1.01 },
  { periodo: "IPCA - MarÃ§o/2022", dataRef: "2022-03-01", indice: 1.62 },
  { periodo: "IPCA - Abril/2022", dataRef: "2022-04-01", indice: 1.06 },
  { periodo: "IPCA - Maio/2022", dataRef: "2022-05-01", indice: 0.59 },
  { periodo: "IPCA - Junho/2022", dataRef: "2022-06-01", indice: 0.69 },
  { periodo: "IPCA - Julho/2022", dataRef: "2022-07-01", indice: 0.13 },
  { periodo: "IPCA - Agosto/2022", dataRef: "2022-08-01", indice: -0.36 },
  { periodo: "IPCA - Setembro/2022", dataRef: "2022-09-01", indice: -0.29 },
  { periodo: "IPCA - Outubro/2022", dataRef: "2022-10-01", indice: 0.59 },
  { periodo: "IPCA - Novembro/2022", dataRef: "2022-11-01", indice: 0.41 },
  { periodo: "IPCA - Dezembro/2022", dataRef: "2022-12-01", indice: 0.62 },

  { periodo: "IPCA - Janeiro/2023", dataRef: "2023-01-01", indice: 0.53 },
  { periodo: "IPCA - Fevereiro/2023", dataRef: "2023-02-01", indice: 0.84 },
  { periodo: "IPCA - MarÃ§o/2023", dataRef: "2023-03-01", indice: 0.71 },
  { periodo: "IPCA - Abril/2023", dataRef: "2023-04-01", indice: 0.57 },
  { periodo: "IPCA - Maio/2023", dataRef: "2023-05-01", indice: 0.23 },
  { periodo: "IPCA - Junho/2023", dataRef: "2023-06-01", indice: -0.08 },
  { periodo: "IPCA - Julho/2023", dataRef: "2023-07-01", indice: 0.12 },
  { periodo: "IPCA - Agosto/2023", dataRef: "2023-08-01", indice: 0.0 },
  { periodo: "IPCA - Setembro/2023", dataRef: "2023-09-01", indice: 0.26 },
  { periodo: "IPCA - Outubro/2023", dataRef: "2023-10-01", indice: 0.24 },
  { periodo: "IPCA - Novembro/2023", dataRef: "2023-11-01", indice: 0.916 },
  { periodo: "IPCA - Dezembro/2023", dataRef: "2023-12-01", indice: 0.8945 },

  { periodo: "IPCA - Janeiro/2024", dataRef: "2024-01-01", indice: 0.9667 },
  { periodo: "IPCA - Fevereiro/2024", dataRef: "2024-02-01", indice: 0.8002 },
  { periodo: "IPCA - MarÃ§o/2024", dataRef: "2024-03-01", indice: 0.8317 },
  { periodo: "IPCA - Abril/2024", dataRef: "2024-04-01", indice: 0.8874 },
  { periodo: "IPCA - Maio/2024", dataRef: "2024-05-01", indice: 0.8324 },
  { periodo: "IPCA - Junho/2024", dataRef: "2024-06-01", indice: 0.7883 },
  { periodo: "IPCA - Julho/2024", dataRef: "2024-07-01", indice: 0.9071 },
  { periodo: "IPCA - Agosto/2024", dataRef: "2024-08-01", indice: 0.8675 },
  { periodo: "IPCA - Setembro/2024", dataRef: "2024-09-01", indice: 0.8352 },
  { periodo: "IPCA - Outubro/2024", dataRef: "2024-10-01", indice: 0.928 },
  { periodo: "IPCA - Novembro/2024", dataRef: "2024-11-01", indice: 0.7615 },
  { periodo: "IPCA - Dezembro/2024", dataRef: "2024-12-01", indice: 0.9375 },

  { periodo: "IPCA - Janeiro/2025", dataRef: "2025-01-01", indice: 0.32 },
  { periodo: "IPCA - Fevereiro/2025", dataRef: "2025-02-01", indice: 1.47 },
  { periodo: "IPCA - Março/2025", dataRef: "2025-03-01", indice: 0.72 },
  { periodo: "IPCA - Abril/2025", dataRef: "2025-04-01", indice: 0.59 },
  { periodo: "IPCA - Maio/2025", dataRef: "2025-05-01", indice: 0.42 },
  { periodo: "IPCA - Junho/2025", dataRef: "2025-06-01", indice: 0.4 },
  { periodo: "IPCA - Julho/2025", dataRef: "2025-07-01", indice: 0.42 },
  { periodo: "IPCA - Agosto/2025", dataRef: "2025-08-01", indice: 0.05 },
  { periodo: "IPCA - Setembro/2025", dataRef: "2025-09-01", indice: 0.64 },
  { periodo: "IPCA - Outubro/2025", dataRef: "2025-10-01", indice: 0.25 },
  { periodo: "IPCA - Novembro/2025", dataRef: "2025-11-01", indice: 0.34 },
  { periodo: "IPCA - Dezembro/2025", dataRef: "2025-12-01", indice: 0.49 },
]


export function getIndiceIpcaPre2022(mesAno: string): number {
  const [anoStr, mesStr] = mesAno.split("-")
  const ano = Number(anoStr)
  const mes = Number(mesStr)

  if (Number.isNaN(ano) || Number.isNaN(mes)) return 0
  if (ano > 2021) return 0

  const fatoresAno = TABELA_IPCA_FATORES_EC113[anoStr]
  if (!fatoresAno) return 0

  const fatorAtual = fatoresAno[mes - 1]
  if (!fatorAtual) return 0

  let fatorAnterior = 0
  if (mes > 1) {
    fatorAnterior = fatoresAno[mes - 2] ?? 0
  } else {
    const anoAnterior = (ano - 1).toString()
    const fatoresAnoAnterior = TABELA_IPCA_FATORES_EC113[anoAnterior]
    fatorAnterior = fatoresAnoAnterior ? fatoresAnoAnterior[11] ?? 0 : 0
  }

  if (!fatorAnterior) return 0

  return (fatorAtual / fatorAnterior - 1) * 100
}

export function calcularJurosMoratoriosAcumulados(
  dataBase: string,
  dataLimite?: string // YYYY-MM-DD cutoff
): { taxaTotal: number; periodos: Array<{ periodo: string; indice: number }> } {
  const periodos: Array<{ periodo: string; indice: number }> = []

  const inicio = new Date(dataBase)
  const inicioMes = new Date(inicio.getFullYear(), inicio.getMonth(), 1)

  const limitePadrao = new Date(2021, 10, 1) // Nov/2021
  const fimInformado = dataLimite ? new Date(dataLimite) : limitePadrao
  const fimData = fimInformado < limitePadrao ? fimInformado : limitePadrao
  const fimMes = new Date(fimData.getFullYear(), fimData.getMonth(), 1)

  let taxaTotal = 0
  let current = new Date(inicioMes)

  while (current <= fimMes) {
    const mesAno = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
    const indice = getIndiceIpcaPre2022(mesAno)
    taxaTotal += indice
    periodos.push({ periodo: mesAno, indice })
    current.setMonth(current.getMonth() + 1)
  }

  return {
    taxaTotal,
    periodos,
  }
}

export function calcularSalariosMinimosJuros(
  valorPrincipal: number,
  taxaJurosMoratoriosPercent: number,
  salarioMinimo: number,
): { valorJuros: number; qtdSalarios: number } {
  const valorJuros = valorPrincipal * (taxaJurosMoratoriosPercent / 100)
  const qtdSalarios = salarioMinimo > 0 ? valorJuros / salarioMinimo : 0

  return {
    valorJuros,
    qtdSalarios,
  }
}

// Tabela de Ã­ndices SELIC mensais (atÃ© 12/2021)
export const SELIC_MENSAL = {
  "2021-12": 0.77,
  "2021-11": 0.7288,
  "2021-10": 0.6417,
  "2021-09": 0.5483,
  "2021-08": 0.4567,
  "2021-07": 0.3992,
  "2021-06": 0.3658,
  "2021-05": 0.3108,
  "2021-04": 0.2483,
  "2021-03": 0.1883,
  "2021-02": 0.1492,
  "2021-01": 0.1483,
  // Adicione mais meses conforme necessÃ¡rio
}

// Tabela de Ã­ndices IPCA-E mensais (a partir de 01/2022)
export const IPCA_E_MENSAL = {
  "2025-12": 0.49,
  "2025-11": 0.34,
  "2025-10": 0.25,
  "2025-09": 0.64,
  "2025-08": 0.05,
  "2025-07": 0.42,
  "2025-06": 0.4,
  "2025-05": 0.42,
  "2025-04": 0.59,
  "2025-03": 0.72,
  "2025-02": 1.47,
  "2025-01": 0.32,
  "2024-11": 0.7615,
  "2024-10": 0.928,
  "2024-09": 0.8352,
  "2024-08": 0.8675,
  "2024-07": 0.9071,
  "2024-06": 0.7883,
  "2024-05": 0.8324,
  "2024-04": 0.8874,
  "2024-03": 0.8317,
  "2024-02": 0.8002,
  "2024-01": 0.9667,
  "2023-12": 0.8945,
  "2023-11": 0.916,
  "2023-10": 0.24,
  "2023-09": 0.26,
  "2023-08": 0.0,
  "2023-07": 0.12,
  "2023-06": -0.08,
  "2023-05": 0.23,
  "2023-04": 0.57,
  "2023-03": 0.71,
  "2023-02": 0.84,
  "2023-01": 0.53,
  "2022-12": 0.62,
  "2022-11": 0.41,
  "2022-10": 0.59,
  "2022-09": -0.29,
  "2022-08": -0.36,
  "2022-07": 0.13,
  "2022-06": 0.69,
  "2022-05": 0.59,
  "2022-04": 1.06,
  "2022-03": 1.62,
  "2022-02": 1.01,
  "2022-01": 0.54,
}

// Tabela de Ã­ndices IPCA mensais (atÃ© 12/2021)
export const IPCA_MENSAL = {
  "2021-12": 0.77,
  "2021-11": 0.7288,
  "2021-10": 0.6417,
  "2021-09": 0.5483,
  "2021-08": 0.4567,
  "2021-07": 0.3992,
  "2021-06": 0.3658,
  "2021-05": 0.3108,
  "2021-04": 0.2483,
  "2021-03": 0.1883,
  "2021-02": 0.1492,
  "2021-01": 0.1483,
  // Adicione mais meses conforme necessÃ¡rio
}

// Tabela de Ã­ndices SELIC mensais (a partir de 01/2022)
export const SELIC_MENSAL_ATUALIZADO = {
  "2022-12": 0.62,
  "2022-11": 0.41,
  "2022-10": 0.59,
  "2022-09": -0.29,
  "2022-08": -0.36,
  "2022-07": 0.13,
  "2022-06": 0.69,
  "2022-05": 0.59,
  "2022-04": 1.06,
  "2022-03": 1.62,
  "2022-02": 1.01,
  "2022-01": 0.54,
  // Adicione mais meses conforme necessÃ¡rio
}

// Tabela de Ã­ndices IPCA mensais (a partir de 01/2022)
export const IPCA_MENSAL_ATUALIZADO = {
  "2022-12": 0.62,
  "2022-11": 0.41,
  "2022-10": 0.59,
  "2022-09": -0.29,
  "2022-08": -0.36,
  "2022-07": 0.13,
  "2022-06": 0.69,
  "2022-05": 0.59,
  "2022-04": 1.06,
  "2022-03": 1.62,
  "2022-02": 1.01,
  "2022-01": 0.54,
  // Adicione mais meses conforme necessÃ¡rio
}

export const TABELA_JUROS_MORA = [
  { inicio: "2000-01-01", fim: "2009-06-30", taxa: 0.5 },
  { inicio: "2009-07-01", fim: "2024-12-31", taxa: 1.0 },
]

// Faixas de IRPF (valores anuais)
export const FAIXAS_IRPF = [
  { ate: 24511.92, aliquota: 0, parcela: 0 },
  { ate: 33919.8, aliquota: 7.5, parcela: 1838.39 },
  { ate: 45012.6, aliquota: 15, parcela: 4382.38 },
  { ate: 55976.16, aliquota: 22.5, parcela: 7758.32 },
  { ate: Number.POSITIVE_INFINITY, aliquota: 27.5, parcela: 10556.53 },
]

export function getIndice(mesAno: string): number {
  // Determina se usa SELIC ou IPCA-E baseado na data
  const [ano, mes] = mesAno.split("-").map(Number)
  const dataCorte = new Date(2022, 0, 1) // 01/01/2022
  const dataConsulta = new Date(ano, mes - 1, 1)

  if (dataConsulta < dataCorte) {
    const selic = SELIC_MENSAL[mesAno as keyof typeof SELIC_MENSAL]
    return selic ?? 0
  }

  if (Object.prototype.hasOwnProperty.call(IPCA_E_MENSAL, mesAno)) {
    return IPCA_E_MENSAL[mesAno as keyof typeof IPCA_E_MENSAL]
  }

  const item = TABELA_INDICES_COMPLETA.find(
    (linha) => linha.periodo.startsWith("IPCA") && linha.dataRef.startsWith(mesAno)
  )

  return item?.indice ?? 0
}

export const TABELA_IPCA: { data: string; indice: number }[] = Object.entries(IPCA_E_MENSAL).map(([data, indice]) => ({
  data: `${data}-01`,
  indice: 1 + indice / 100,
}))

export const TABELA_SELIC: { data: string; indice: number }[] = Object.entries(SELIC_MENSAL).map(([data, indice]) => ({
  data: `${data}-01`,
  indice: 1 + indice / 100,
}))
