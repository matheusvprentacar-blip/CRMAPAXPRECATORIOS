// Tabela de índices SELIC/IPCA conforme planilha oficial
export type LinhaIndice = {
  periodo: string // "SELIC - Novembro/2023"
  dataRef: string // "2023-11-01"
  indice: number // 0.9160
}

export const TABELA_INDICES_COMPLETA: LinhaIndice[] = [
  // SELIC até Dezembro/2021
  { periodo: "SELIC - Dezembro/2021", dataRef: "2021-12-01", indice: 0.77 },
  { periodo: "SELIC - Novembro/2021", dataRef: "2021-11-01", indice: 0.7288 },
  { periodo: "SELIC - Outubro/2021", dataRef: "2021-10-01", indice: 0.6417 },
  { periodo: "SELIC - Setembro/2021", dataRef: "2021-09-01", indice: 0.5483 },
  { periodo: "SELIC - Agosto/2021", dataRef: "2021-08-01", indice: 0.4567 },
  { periodo: "SELIC - Julho/2021", dataRef: "2021-07-01", indice: 0.3992 },
  { periodo: "SELIC - Junho/2021", dataRef: "2021-06-01", indice: 0.3658 },
  { periodo: "SELIC - Maio/2021", dataRef: "2021-05-01", indice: 0.3108 },
  { periodo: "SELIC - Abril/2021", dataRef: "2021-04-01", indice: 0.2483 },
  { periodo: "SELIC - Março/2021", dataRef: "2021-03-01", indice: 0.1883 },
  { periodo: "SELIC - Fevereiro/2021", dataRef: "2021-02-01", indice: 0.1492 },
  { periodo: "SELIC - Janeiro/2021", dataRef: "2021-01-01", indice: 0.1483 },

  // IPCA a partir de Janeiro/2022
  { periodo: "IPCA - Janeiro/2022", dataRef: "2022-01-01", indice: 0.54 },
  { periodo: "IPCA - Fevereiro/2022", dataRef: "2022-02-01", indice: 1.01 },
  { periodo: "IPCA - Março/2022", dataRef: "2022-03-01", indice: 1.62 },
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
  { periodo: "IPCA - Março/2023", dataRef: "2023-03-01", indice: 0.71 },
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
  { periodo: "IPCA - Março/2024", dataRef: "2024-03-01", indice: 0.8317 },
  { periodo: "IPCA - Abril/2024", dataRef: "2024-04-01", indice: 0.8874 },
  { periodo: "IPCA - Maio/2024", dataRef: "2024-05-01", indice: 0.8324 },
  { periodo: "IPCA - Junho/2024", dataRef: "2024-06-01", indice: 0.7883 },
  { periodo: "IPCA - Julho/2024", dataRef: "2024-07-01", indice: 0.9071 },
  { periodo: "IPCA - Agosto/2024", dataRef: "2024-08-01", indice: 0.8675 },
  { periodo: "IPCA - Setembro/2024", dataRef: "2024-09-01", indice: 0.8352 },
  { periodo: "IPCA - Outubro/2024", dataRef: "2024-10-01", indice: 0.928 },
  { periodo: "IPCA - Novembro/2024", dataRef: "2024-11-01", indice: 0.7615 },
  { periodo: "IPCA - Dezembro/2024", dataRef: "2024-12-01", indice: 0.9375 },

  { periodo: "IPCA - Janeiro/2025", dataRef: "2025-01-01", indice: 1.01 },
  { periodo: "IPCA - Fevereiro/2025", dataRef: "2025-02-01", indice: 0.99 },
  { periodo: "IPCA - Março/2025", dataRef: "2025-03-01", indice: 0.96 },
  { periodo: "IPCA - Abril/2025", dataRef: "2025-04-01", indice: 1.06 },
  { periodo: "IPCA - Maio/2025", dataRef: "2025-05-01", indice: 1.14 },
  { periodo: "IPCA - Junho/2025", dataRef: "2025-06-01", indice: 1.1 },
  { periodo: "IPCA - Julho/2025", dataRef: "2025-07-01", indice: 1.28 },
  { periodo: "IPCA - Agosto/2025", dataRef: "2025-08-01", indice: 0.0 }, // linha de fechamento
]

export function calcularJurosMoratoriosAcumulados(
  dataBase: string, // formato "YYYY-MM-DD" ou "YYYY-MM-01"
): { taxaTotal: number; periodos: Array<{ periodo: string; indice: number }> } {
  const periodos: Array<{ periodo: string; indice: number }> = []

  // Filtra todas as linhas >= dataBase e com indice > 0
  const linhasFiltradas = TABELA_INDICES_COMPLETA.filter((l) => l.dataRef >= dataBase && l.indice > 0)

  // Soma os índices
  const taxaTotal = linhasFiltradas.reduce((acc, l) => {
    periodos.push({ periodo: l.periodo, indice: l.indice })
    return acc + l.indice
  }, 0)

  // Retorna com 4 casas decimais
  return {
    taxaTotal: Number(taxaTotal.toFixed(4)),
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

// Tabela de índices SELIC mensais (até 12/2021)
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
  // Adicione mais meses conforme necessário
}

// Tabela de índices IPCA-E mensais (a partir de 01/2022)
export const IPCA_E_MENSAL = {
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

// Tabela de índices IPCA mensais (até 12/2021)
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
  // Adicione mais meses conforme necessário
}

// Tabela de índices SELIC mensais (a partir de 01/2022)
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
  // Adicione mais meses conforme necessário
}

// Tabela de índices IPCA mensais (a partir de 01/2022)
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
  // Adicione mais meses conforme necessário
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
    return SELIC_MENSAL[mesAno as keyof typeof SELIC_MENSAL] || 0
  } else {
    return IPCA_E_MENSAL[mesAno as keyof typeof IPCA_E_MENSAL] || 0
  }
}

export const TABELA_IPCA: { data: string; indice: number }[] = Object.entries(IPCA_E_MENSAL).map(([data, indice]) => ({
  data: `${data}-01`,
  indice: 1 + indice / 100,
}))

export const TABELA_SELIC: { data: string; indice: number }[] = Object.entries(SELIC_MENSAL).map(([data, indice]) => ({
  data: `${data}-01`,
  indice: 1 + indice / 100,
}))
