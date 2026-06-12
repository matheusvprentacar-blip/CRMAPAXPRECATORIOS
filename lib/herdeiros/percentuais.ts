export type HerdeiroComPercentual = {
  id: string
  percentual_participacao?: number | null
}

const TOTAL_PERCENTUAL_BASIS_POINTS = 10000

function toBasisPoints(value: unknown): number {
  const normalized = normalizePercentualParticipacao(value)
  return normalized === null ? 0 : Math.round(normalized * 100)
}

function fromBasisPoints(value: number): number {
  return Number((value / 100).toFixed(2))
}

function parsePercentual(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null

  const parsed =
    typeof value === "string"
      ? Number(value.trim().replace(",", "."))
      : Number(value)

  if (!Number.isFinite(parsed)) return null

  return Number(parsed.toFixed(2))
}

export function normalizePercentualParticipacao(value: unknown): number | null {
  const parsed = parsePercentual(value)
  if (parsed === null) return null

  return Number(Math.min(100, Math.max(0, parsed)).toFixed(2))
}

export function formatPercentualInput(value: unknown): string {
  const parsed = parsePercentual(value)
  if (parsed === null) return ""

  return parsed.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })
}

export function formatPercentualHerdeiro(value: unknown): string | null {
  const parsed = parsePercentual(value)
  if (parsed === null) return null

  return `${parsed.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })}%`
}

export function normalizarPercentuaisHerdeiros<T extends HerdeiroComPercentual>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    percentual_participacao: normalizePercentualParticipacao(item.percentual_participacao) ?? 0,
  }))
}

export function distribuirPercentuaisHerdeiros<T extends HerdeiroComPercentual>(
  items: T[],
  lockedIds: Iterable<string> = []
): T[] {
  if (items.length === 0) return items

  const lockedIdSet = new Set(lockedIds)
  const flexibleItems = items.filter((item) => !lockedIdSet.has(item.id))

  if (flexibleItems.length === 0) {
    return normalizarPercentuaisHerdeiros(items)
  }

  const lockedTotal = items.reduce((sum, item) => {
    return lockedIdSet.has(item.id) ? sum + toBasisPoints(item.percentual_participacao) : sum
  }, 0)

  const remaining = Math.max(0, TOTAL_PERCENTUAL_BASIS_POINTS - lockedTotal)
  const baseShare = Math.floor(remaining / flexibleItems.length)
  const remainder = remaining % flexibleItems.length
  let flexibleIndex = 0

  return items.map((item) => {
    if (lockedIdSet.has(item.id)) {
      return {
        ...item,
        percentual_participacao: fromBasisPoints(toBasisPoints(item.percentual_participacao)),
      }
    }

    const share = baseShare + (flexibleIndex < remainder ? 1 : 0)
    flexibleIndex += 1

    return {
      ...item,
      percentual_participacao: fromBasisPoints(share),
    }
  })
}

export function somaPercentuaisHerdeiros(items: HerdeiroComPercentual[]): number {
  return fromBasisPoints(items.reduce((sum, item) => sum + toBasisPoints(item.percentual_participacao), 0))
}

export function percentuaisHerdeirosSomamCem(items: HerdeiroComPercentual[]): boolean {
  const total = items.reduce((sum, item) => sum + toBasisPoints(item.percentual_participacao), 0)
  return Math.abs(total - TOTAL_PERCENTUAL_BASIS_POINTS) <= 1
}

export function deveDistribuirIgualAutomaticamente(items: HerdeiroComPercentual[]): boolean {
  if (items.length === 0) return false

  const shares = items.map((item) => toBasisPoints(item.percentual_participacao))
  const total = shares.reduce((sum, value) => sum + value, 0)
  if (Math.abs(total - TOTAL_PERCENTUAL_BASIS_POINTS) <= 1) return false
  if (shares.every((value) => value === 0)) return true

  const first = shares[0]
  return shares.every((value) => Math.abs(value - first) <= 1)
}

export function inferHerdeirosComCotaManual(
  items: HerdeiroComPercentual[],
  editedId?: string
): string[] {
  if (items.length <= 1) return editedId ? [editedId] : []

  const shares = items.map((item) => ({
    id: item.id,
    basisPoints: toBasisPoints(item.percentual_participacao),
  }))

  if (shares.every((item) => item.basisPoints === 0)) {
    return editedId ? [editedId] : []
  }

  const firstShare = shares[0]?.basisPoints ?? 0
  if (shares.every((item) => Math.abs(item.basisPoints - firstShare) <= 1)) {
    return editedId ? [editedId] : []
  }

  const groups: Array<{ basisPoints: number; ids: string[] }> = []
  for (const share of shares) {
    const group = groups.find((candidate) => Math.abs(candidate.basisPoints - share.basisPoints) <= 1)
    if (group) {
      group.ids.push(share.id)
    } else {
      groups.push({ basisPoints: share.basisPoints, ids: [share.id] })
    }
  }

  const flexibleGroup = groups.reduce((largest, group) =>
    group.ids.length > largest.ids.length ? group : largest
  )
  const manualIds =
    flexibleGroup.ids.length === 1
      ? shares.map((share) => share.id)
      : shares.filter((share) => !flexibleGroup.ids.includes(share.id)).map((share) => share.id)

  if (editedId && !manualIds.includes(editedId)) {
    manualIds.push(editedId)
  }

  return manualIds
}
