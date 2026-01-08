/**
 * Formata um valor numérico para moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Remove formatação e converte string de moeda para número
 */
export function parseCurrency(value: string): number {
  // Remove tudo exceto números, vírgula e ponto
  const cleaned = value.replace(/[^\d,.-]/g, "")
  // Substitui vírgula por ponto para conversão
  const normalized = cleaned.replace(",", ".")
  return Number.parseFloat(normalized) || 0
}

/**
 * Formata input de moeda em tempo real durante digitação
 */
export function formatCurrencyInput(value: string): string {
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, "")

  if (!numbers) return ""

  // Converte para centavos
  const amount = Number.parseInt(numbers) / 100

  // Formata como moeda
  return formatCurrency(amount)
}

/**
 * Formata percentual
 */
export function formatPercent(value: number, decimals = 2): string {
  return value.toFixed(decimals) + "%"
}
