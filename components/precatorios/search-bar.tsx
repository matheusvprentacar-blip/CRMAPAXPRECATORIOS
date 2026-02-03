"use client"

import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  placeholder?: string
  autoSearch?: boolean
  showButton?: boolean
}

export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Buscar por número, nome, CPF/CNPJ, tribunal...",
  autoSearch = false,
  showButton = true,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  useEffect(() => {
    if (autoSearch) {
      onChange(localValue)
    }
  }, [autoSearch, localValue, onChange])

  const handleSearch = () => {
    onChange(localValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
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
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9 bg-white/80 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-400 border-zinc-200/70 dark:border-zinc-700/60"
        />
        {localValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalValue("")
              onClear()
            }}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Limpar busca</span>
          </Button>
        )}
      </div>
      {showButton && (
        <Button onClick={handleSearch} variant="secondary">
          Buscar
        </Button>
      )}
    </div>
  )
}
