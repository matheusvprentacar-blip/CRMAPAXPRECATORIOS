import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return "R$ 0,00"

  const numberValue = typeof value === "string" ? parseFloat(value) : value

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue)
}
