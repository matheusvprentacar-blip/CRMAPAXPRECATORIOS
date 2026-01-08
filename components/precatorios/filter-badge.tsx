"use client"

import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { FiltroAtivo } from "@/lib/types/filtros"

interface FilterBadgeProps {
  filtro: FiltroAtivo
  onRemove: (key: string) => void
}

export function FilterBadge({ filtro, onRemove }: FilterBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1 px-3 py-1 text-sm"
    >
      <span className="font-medium">{filtro.label}:</span>
      <span>{filtro.displayValue}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
        onClick={() => onRemove(filtro.key)}
      >
        <X className="h-3 w-3" />
        <span className="sr-only">Remover filtro {filtro.label}</span>
      </Button>
    </Badge>
  )
}

interface FilterBadgesProps {
  filtros: FiltroAtivo[]
  onRemove: (key: string) => void
  onClearAll: () => void
}

export function FilterBadges({ filtros, onRemove, onClearAll }: FilterBadgesProps) {
  if (filtros.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Filtros ativos:</span>
      {filtros.map((filtro) => (
        <FilterBadge key={filtro.key} filtro={filtro} onRemove={onRemove} />
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-7 text-xs text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3 mr-1" />
        Limpar todos
      </Button>
    </div>
  )
}
