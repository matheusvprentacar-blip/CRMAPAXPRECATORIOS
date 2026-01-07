"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number
  onChange: (value: number) => void
}

export function CurrencyInput({ value, onChange, className, ...props }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState("")
  const [isFocused, setIsFocused] = React.useState(false)

  React.useEffect(() => {
    if (isFocused) return

    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0)

    setDisplayValue(formatted)
  }, [value, isFocused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Remove tudo exceto números
    const numbers = inputValue.replace(/\D/g, "")

    if (numbers === "") {
      setDisplayValue("")
      onChange(0)
      return
    }

    // Converte de centavos para reais
    const numericValue = Number.parseInt(numbers) / 100

    // Formata para exibição durante digitação
    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue)

    setDisplayValue(formatted)
    onChange(numericValue)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)

    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0)

    setDisplayValue(formatted)
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="R$ 0,00"
      className={className}
    />
  )
}
