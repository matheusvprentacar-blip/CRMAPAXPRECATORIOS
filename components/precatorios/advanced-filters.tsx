"use client"

import { useState, useEffect } from "react"
import { Filter, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { FiltrosPrecatorios } from "@/lib/types/filtros"
import {
  STATUS_OPTIONS,
  COMPLEXIDADE_OPTIONS,
  SLA_OPTIONS,
  TIPO_ATRASO_OPTIONS,
  IMPACTO_OPTIONS,
} from "@/lib/types/filtros"

interface AdvancedFiltersProps {
  filtros: FiltrosPrecatorios
  onFilterChange: (filtros: FiltrosPrecatorios) => void
  onClearFilters: () => void
  totalFiltrosAtivos: number
}

export function AdvancedFilters({
  filtros,
  onFilterChange,
  onClearFilters,
  totalFiltrosAtivos,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false)
  const [localFiltros, setLocalFiltros] = useState<FiltrosPrecatorios>(filtros)

  useEffect(() => {
    setLocalFiltros(filtros)
  }, [filtros])

  const handleApplyFilters = () => {
    onFilterChange(localFiltros)
    setOpen(false)
  }

  const handleClearFilters = () => {
    setLocalFiltros({})
    onClearFilters()
    setOpen(false)
  }

  const toggleArrayValue = <T extends string>(
    key: keyof FiltrosPrecatorios,
    value: T
  ) => {
    const currentArray = (localFiltros[key] as T[]) || []
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value]

    setLocalFiltros({
      ...localFiltros,
      [key]: newArray.length > 0 ? newArray : undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros Avançados
          {totalFiltrosAtivos > 0 && (
            <Badge
              variant="destructive"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {totalFiltrosAtivos}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
          <SheetDescription>
            Combine múltiplos filtros para refinar sua busca
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Status */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status</Label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={localFiltros.status?.includes(option.value) || false}
                    onCheckedChange={() => toggleArrayValue('status', option.value)}
                  />
                  <label
                    htmlFor={`status-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Complexidade */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Complexidade</Label>
            <div className="space-y-2">
              {COMPLEXIDADE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`complexidade-${option.value}`}
                    checked={localFiltros.complexidade?.includes(option.value as any) || false}
                    onCheckedChange={() => toggleArrayValue('complexidade', option.value as any)}
                  />
                  <label
                    htmlFor={`complexidade-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* SLA */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status do SLA</Label>
            <div className="space-y-2">
              {SLA_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sla-${option.value}`}
                    checked={localFiltros.sla_status?.includes(option.value as any) || false}
                    onCheckedChange={() => toggleArrayValue('sla_status', option.value as any)}
                  />
                  <label
                    htmlFor={`sla-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Tipo de Atraso */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tipo de Atraso</Label>
            <div className="space-y-2">
              {TIPO_ATRASO_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tipo-atraso-${option.value}`}
                    checked={localFiltros.tipo_atraso?.includes(option.value as any) || false}
                    onCheckedChange={() => toggleArrayValue('tipo_atraso', option.value as any)}
                  />
                  <label
                    htmlFor={`tipo-atraso-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Impacto do Atraso */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Impacto do Atraso</Label>
            <div className="space-y-2">
              {IMPACTO_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`impacto-${option.value}`}
                    checked={localFiltros.impacto_atraso?.includes(option.value as any) || false}
                    onCheckedChange={() => toggleArrayValue('impacto_atraso', option.value as any)}
                  />
                  <label
                    htmlFor={`impacto-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Data de Criação */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Data de Criação</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="data-criacao-inicio" className="text-xs">
                  De
                </Label>
                <Input
                  id="data-criacao-inicio"
                  type="date"
                  value={localFiltros.data_criacao_inicio || ''}
                  onChange={(e) =>
                    setLocalFiltros({
                      ...localFiltros,
                      data_criacao_inicio: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data-criacao-fim" className="text-xs">
                  Até
                </Label>
                <Input
                  id="data-criacao-fim"
                  type="date"
                  value={localFiltros.data_criacao_fim || ''}
                  onChange={(e) =>
                    setLocalFiltros({
                      ...localFiltros,
                      data_criacao_fim: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Data de Entrada em Cálculo */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Data de Entrada em Cálculo</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="data-calculo-inicio" className="text-xs">
                  De
                </Label>
                <Input
                  id="data-calculo-inicio"
                  type="date"
                  value={localFiltros.data_entrada_calculo_inicio || ''}
                  onChange={(e) =>
                    setLocalFiltros({
                      ...localFiltros,
                      data_entrada_calculo_inicio: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data-calculo-fim" className="text-xs">
                  Até
                </Label>
                <Input
                  id="data-calculo-fim"
                  type="date"
                  value={localFiltros.data_entrada_calculo_fim || ''}
                  onChange={(e) =>
                    setLocalFiltros({
                      ...localFiltros,
                      data_entrada_calculo_fim: e.target.value || undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Faixa de Valores */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Faixa de Valores</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="valor-min" className="text-xs">
                  Valor Mínimo
                </Label>
                <CurrencyInput
                  id="valor-min"
                  placeholder="R$ 0,00"
                  value={localFiltros.valor_min}
                  onValueChange={(value) =>
                    setLocalFiltros({
                      ...localFiltros,
                      valor_min: value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor-max" className="text-xs">
                  Valor Máximo
                </Label>
                <CurrencyInput
                  id="valor-max"
                  placeholder="R$ 999.999,99"
                  value={localFiltros.valor_max}
                  onValueChange={(value) =>
                    setLocalFiltros({
                      ...localFiltros,
                      valor_max: value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Flags Especiais */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Flags Especiais</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="urgente"
                  checked={localFiltros.urgente || false}
                  onCheckedChange={(checked) =>
                    setLocalFiltros({
                      ...localFiltros,
                      urgente: checked ? true : undefined,
                    })
                  }
                />
                <label
                  htmlFor="urgente"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Apenas Urgentes
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="titular-falecido"
                  checked={localFiltros.titular_falecido || false}
                  onCheckedChange={(checked) =>
                    setLocalFiltros({
                      ...localFiltros,
                      titular_falecido: checked ? true : undefined,
                    })
                  }
                />
                <label
                  htmlFor="titular-falecido"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Titular Falecido
                </label>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClearFilters} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
          <Button onClick={handleApplyFilters} className="flex-1">
            Aplicar Filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
