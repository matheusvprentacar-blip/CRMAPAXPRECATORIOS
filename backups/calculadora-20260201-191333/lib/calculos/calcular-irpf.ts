import { FAIXAS_IRPF } from "./indices"

export function calcularIRPF(valorAnual: number): number {
  if (valorAnual <= 0) return 0

  for (const faixa of FAIXAS_IRPF) {
    if (valorAnual <= faixa.ate) {
      return Math.max(0, (valorAnual * faixa.aliquota) / 100 - faixa.parcela)
    }
  }

  return 0
}

export function calcularIRPFDetalhado(valorAnual: number) {
  const irpfDevido = calcularIRPF(valorAnual)

  let faixaAplicada = FAIXAS_IRPF[0]
  for (const faixa of FAIXAS_IRPF) {
    if (valorAnual <= faixa.ate) {
      faixaAplicada = faixa
      break
    }
  }

  return {
    valorBase: valorAnual,
    aliquota: faixaAplicada.aliquota,
    parcelaADeduzir: faixaAplicada.parcela,
    irpfDevido,
    isento: irpfDevido === 0,
  }
}
