/**
 * Converte número para extenso em Português Brasileiro
 * Suporta valores monetários (reais e centavos)
 */

const unidades = [
  "", "um", "dois", "três", "quatro", "cinco",
  "seis", "sete", "oito", "nove", "dez",
  "onze", "doze", "treze", "quatorze", "quinze",
  "dezesseis", "dezessete", "dezoito", "dezenove",
]

const dezenas = [
  "", "", "vinte", "trinta", "quarenta", "cinquenta",
  "sessenta", "setenta", "oitenta", "noventa",
]

const centenas = [
  "", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
]

function escreverMenorQueMil(n: number): string {
  if (n === 0) return ""
  if (n === 100) return "cem"

  const c = Math.floor(n / 100)
  const resto = n % 100
  const d = Math.floor(resto / 10)
  const u = resto % 10

  const partes: string[] = []

  if (c > 0) {
    partes.push(c === 1 && resto > 0 ? "cento" : centenas[c])
  }

  if (resto > 0 && resto < 20) {
    partes.push(unidades[resto])
  } else {
    if (d > 0) partes.push(dezenas[d])
    if (u > 0) partes.push(unidades[u])
  }

  return partes.join(" e ")
}

function numeroParaExtenso(valor: number): string {
  if (valor === 0) return "zero"

  const grupos = [
    { limite: 1e12, singular: "trilhão", plural: "trilhões" },
    { limite: 1e9, singular: "bilhão", plural: "bilhões" },
    { limite: 1e6, singular: "milhão", plural: "milhões" },
    { limite: 1e3, singular: "mil", plural: "mil" },
    { limite: 1, singular: "", plural: "" },
  ]

  const partes: string[] = []
  let restante = Math.floor(valor)

  for (const grupo of grupos) {
    if (restante >= grupo.limite) {
      const quantidade = Math.floor(restante / grupo.limite)
      restante %= grupo.limite

      const textoQuantidade = escreverMenorQueMil(quantidade)
      if (!textoQuantidade) continue

      if (grupo.limite === 1) {
        partes.push(textoQuantidade)
      } else if (grupo.limite === 1e3) {
        partes.push(quantidade === 1 ? "mil" : `${textoQuantidade} mil`)
      } else {
        const sufixo = quantidade === 1 ? grupo.singular : grupo.plural
        partes.push(`${textoQuantidade} ${sufixo}`)
      }
    }
  }

  return partes.join(" e ")
}

/**
 * Converte valor monetário (número) para extenso em reais
 * Ex: 1234.56 → "mil duzentos e trinta e quatro reais e cinquenta e seis centavos"
 */
export function valorParaExtenso(valor: number): string {
  if (isNaN(valor) || valor < 0) return ""

  const inteiro = Math.floor(valor)
  const centavos = Math.round((valor - inteiro) * 100)

  const partes: string[] = []

  if (inteiro > 0) {
    const extensoInteiro = numeroParaExtenso(inteiro)
    const sufixo = inteiro === 1 ? "real" : "reais"
    partes.push(`${extensoInteiro} ${sufixo}`)
  }

  if (centavos > 0) {
    const extensoCentavos = escreverMenorQueMil(centavos)
    const sufixo = centavos === 1 ? "centavo" : "centavos"
    partes.push(`${extensoCentavos} ${sufixo}`)
  }

  if (partes.length === 0) return "zero reais"

  return partes.join(" e ")
}

/**
 * Converte percentual para extenso
 * Ex: 45.5 → "quarenta e cinco vírgula cinquenta por cento"
 */
export function percentualParaExtenso(valor: number): string {
  if (isNaN(valor)) return ""

  const inteiro = Math.floor(valor)
  const decimal = Math.round((valor - inteiro) * 100)

  const extensoInteiro = numeroParaExtenso(inteiro)
  if (decimal === 0) return `${extensoInteiro} por cento`

  const extensoDecimal = escreverMenorQueMil(decimal)
  return `${extensoInteiro} vírgula ${extensoDecimal} por cento`
}
