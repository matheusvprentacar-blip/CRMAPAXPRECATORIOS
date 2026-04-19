export type CreditoDistribuivel = {
  id: string
  valor_principal?: number | null
  valor_atualizado?: number | null
}

export type DistribuicaoCreditosPreview = {
  assignments: Record<string, string[]>
  counts: Record<string, number>
  sums: Record<string, number>
  total: number
}

export function getDistribuicaoCreditoValor(credito: CreditoDistribuivel) {
  const valorAtualizado = Number(credito.valor_atualizado ?? 0)
  if (valorAtualizado > 0) return valorAtualizado
  return Number(credito.valor_principal ?? 0) || 0
}

export function buildDistribuicaoCreditosPreview(
  creditos: CreditoDistribuivel[],
  operatorIds: string[]
): DistribuicaoCreditosPreview | null {
  if (operatorIds.length === 0) return null

  const assignments = Object.fromEntries(operatorIds.map((id) => [id, [] as string[]]))
  const counts = Object.fromEntries(operatorIds.map((id) => [id, 0]))
  const sums = Object.fromEntries(operatorIds.map((id) => [id, 0]))

  const orderedCreditos = [...creditos].sort(
    (left, right) => getDistribuicaoCreditoValor(right) - getDistribuicaoCreditoValor(left)
  )

  orderedCreditos.forEach((credito) => {
    const nextOperatorId = [...operatorIds].sort((left, right) => {
      const sumDiff = sums[left] - sums[right]
      if (Math.abs(sumDiff) > 0.0001) return sumDiff
      const countDiff = counts[left] - counts[right]
      if (countDiff !== 0) return countDiff
      return left.localeCompare(right)
    })[0]

    assignments[nextOperatorId].push(credito.id)
    counts[nextOperatorId] += 1
    sums[nextOperatorId] += getDistribuicaoCreditoValor(credito)
  })

  return {
    assignments,
    counts,
    sums,
    total: orderedCreditos.reduce((acc, credito) => acc + getDistribuicaoCreditoValor(credito), 0),
  }
}
