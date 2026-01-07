export interface ParametrosIRPF {
  baseCalculo: number
  aliquota: number
  isento: boolean
}

export function calcularIRPF({ baseCalculo, aliquota, isento }: ParametrosIRPF): number {
  if (isento || aliquota <= 0) return 0
  return baseCalculo * (aliquota / 100)
}
