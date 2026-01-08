import { getIndice } from "./indices"

export interface ResultadoAtualizacao {
  valorOriginal: number
  valorAtualizado: number
  totalCorrecao: number
  mesesAplicados: number
  detalhamento: Array<{
    mesAno: string
    indice: number
    valorAcumulado: number
  }>
}

export function calcularAtualizacaoMonetaria(
  valorPrincipal: number,
  dataInicio: Date,
  dataFim: Date = new Date(),
): ResultadoAtualizacao {
  let valorAtualizado = valorPrincipal
  const detalhamento: Array<{ mesAno: string; indice: number; valorAcumulado: number }> = []

  const inicio = new Date(dataInicio)
  const fim = new Date(dataFim)

  const mesAtual = new Date(inicio.getFullYear(), inicio.getMonth(), 1)

  while (mesAtual < fim) {
    const mesAno = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, "0")}`
    const indice = getIndice(mesAno)

    if (indice > 0) {
      valorAtualizado = valorAtualizado * (1 + indice / 100)

      detalhamento.push({
        mesAno,
        indice,
        valorAcumulado: valorAtualizado,
      })
    }

    mesAtual.setMonth(mesAtual.getMonth() + 1)
  }

  return {
    valorOriginal: valorPrincipal,
    valorAtualizado,
    totalCorrecao: valorAtualizado - valorPrincipal,
    mesesAplicados: detalhamento.length,
    detalhamento,
  }
}
