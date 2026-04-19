export const OPERATOR_TAG_VALUES = ["operador", "freelancer", "externo"] as const

export type OperatorTag = (typeof OPERATOR_TAG_VALUES)[number]

export const OPERATOR_TAG_LABELS: Record<OperatorTag, string> = {
  operador: "Operador interno",
  freelancer: "Freelancer",
  externo: "Externo",
}

export const OPERATOR_TAG_OPTIONS = OPERATOR_TAG_VALUES.map((value) => ({
  value,
  label: OPERATOR_TAG_LABELS[value],
}))

export function normalizeOperatorTag(value: unknown): OperatorTag | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  return OPERATOR_TAG_VALUES.includes(normalized as OperatorTag) ? (normalized as OperatorTag) : null
}

export function isAtendimentoOperatorRole(roles: string[] | null | undefined) {
  return Array.isArray(roles) && (roles.includes("operador_comercial") || roles.includes("operador"))
}

export function isMissingOperatorTagColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const dbError = error as { code?: string | null; message?: string | null }
  return dbError.code === "42703" && (dbError.message ?? "").toLowerCase().includes("operator_tag")
}
