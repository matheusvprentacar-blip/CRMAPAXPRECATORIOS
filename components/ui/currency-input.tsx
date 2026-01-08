"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number
  onChange?: (value: number | undefined) => void
  onValueChange?: (value: number | undefined) => void
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, onValueChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("")

    // Formatar número para moeda brasileira
    const formatCurrency = (num: number): string => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
      }).format(num)
    }

    // Converter string formatada para número
    const parseCurrency = (str: string): number | undefined => {
      // Remove tudo exceto números
      const numbers = str.replace(/\D/g, "")
      if (!numbers) return undefined
      
      // Converte para número (últimos 2 dígitos são centavos)
      const value = parseInt(numbers) / 100
      return value
    }

    // Atualizar display quando value prop mudar
    React.useEffect(() => {
      if (value !== undefined && value !== null) {
        setDisplayValue(formatCurrency(value))
      } else {
        setDisplayValue("")
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      
      // Permitir campo vazio
      if (!inputValue) {
        setDisplayValue("")
        onChange?.(undefined)
        onValueChange?.(undefined)
        return
      }

      // Parse e formata
      const numericValue = parseCurrency(inputValue)
      
      if (numericValue !== undefined) {
        const formatted = formatCurrency(numericValue)
        setDisplayValue(formatted)
        onChange?.(numericValue)
        onValueChange?.(numericValue)
      }
    }

    return (
      <Input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        className={cn(className)}
        ref={ref}
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
