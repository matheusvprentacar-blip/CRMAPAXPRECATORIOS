"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calculator } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { calcularSalariosMinimosJuros } from "@/lib/calculos/indices"

interface CalculadoraSalariosMinimosProps {
  valorPrincipal: number
  taxaJurosMoratorios: number // taxa percentual acumulada
  salarioMinimo: number
  onResultado?: (quantidade: number) => void
}

export function CalculadoraSalariosMinimos({
  valorPrincipal,
  taxaJurosMoratorios,
  salarioMinimo,
  onResultado,
}: CalculadoraSalariosMinimosProps) {
  const [open, setOpen] = useState(false)

  const resultado = useMemo(() => {
    return calcularSalariosMinimosJuros(valorPrincipal, taxaJurosMoratorios, salarioMinimo)
  }, [valorPrincipal, taxaJurosMoratorios, salarioMinimo])

  const handleAplicar = () => {
    onResultado?.(resultado.qtdSalarios)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calculator className="h-4 w-4 mr-1" />
          Salários mínimos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Calculadora de salários mínimos</DialogTitle>
          <DialogDescription>
            Calcula a quantidade de salários mínimos equivalente ao valor dos juros moratórios calculados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Valor principal</Label>
              <p className="font-medium">
                {valorPrincipal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Taxa juros moratórios</Label>
              <p className="font-medium">
                {taxaJurosMoratorios.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}%
              </p>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Salário mínimo vigente</Label>
            <p className="font-medium">
              {salarioMinimo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>

          <div className="border-t pt-3">
            <Label className="text-xs text-muted-foreground">Valor em juros de mora</Label>
            <p className="text-lg font-semibold">
              {resultado.valorJuros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Equivalente em salários mínimos</Label>
            <p className="text-2xl font-bold text-primary">
              {resultado.qtdSalarios.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} SM
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            {onResultado && (
              <Button size="sm" onClick={handleAplicar}>
                Aplicar resultado
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
