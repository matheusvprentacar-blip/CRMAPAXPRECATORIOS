import { TABELA_IPCA } from "./indices"

export function calcularFatorIPCA(dataBase: string, dataFinal: string): number {
  const base = new Date(dataBase)
  const fim = new Date(dataFinal)
  let fator = 1

  for (const item of TABELA_IPCA) {
    const d = new Date(item.data)
    if (d >= base && d <= fim) {
      fator *= item.indice
    }
  }

  return fator
}

export function aplicarFatorIPCA(valor: number, dataBase: string, dataFinal: string): number {
  const fator = calcularFatorIPCA(dataBase, dataFinal)
  return valor * fator
}
