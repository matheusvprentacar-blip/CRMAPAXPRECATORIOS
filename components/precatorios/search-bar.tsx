"use client"

import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  onSubmit?: (value: string) => void
  placeholder?: string
  autoSearch?: boolean
  showButton?: boolean
}

export function SearchBar({
  value,
  onChange,
  onClear,
  onSubmit,
  placeholder = "Buscar por número, nome, CPF/CNPJ, tribunal...",
  autoSearch = false,
  showButton = true,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const inputValue = autoSearch ? value : localValue

  useEffect(() => {
    if (!autoSearch) {
      setLocalValue(value)
    }
  }, [value, autoSearch])

  const handleInputChange = (nextValue: string) => {
    if (autoSearch) {
      onChange(nextValue)
      return
    }
    setLocalValue(nextValue)
  }

  const handleSearch = () => {
    if (onSubmit) {
      onSubmit(inputValue)
      return
    }
    onChange(inputValue)
  }

  const handleClear = () => {
    if (!autoSearch) {
      setLocalValue("")
    }
    onChange("")
    onClear()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="relative flex-1 flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9 bg-white/80 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-400 border-zinc-200/70 dark:border-zinc-700/60"
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Limpar busca</span>
          </Button>
        )}
      </div>
      {showButton && (
        <Button type="button" onClick={handleSearch} variant="secondary">
          Buscar
        </Button>
      )}
    </div>
  )
}
