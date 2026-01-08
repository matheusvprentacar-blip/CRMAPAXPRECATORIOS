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
import { calcularJurosMoratoriosAcumulados } from "@/lib/calculos/indices"

interface CalculadoraJurosMoraProps {
  dataBase?: string
  valorPrincipal?: number
}

export function CalculadoraJurosMora({ dataBase, valorPrincipal = 0 }: CalculadoraJurosMoraProps) {
  const [open, setOpen] = useState(false)

  const resultado = useMemo(() => {
    if (!dataBase) {
      return { taxaTotal: 0, periodos: [], valorJuros: 0 }
    }

    const { taxaTotal, periodos } = calcularJurosMoratoriosAcumulados(dataBase)
    const valorJuros = valorPrincipal * (taxaTotal / 100)

    return { taxaTotal, periodos, valorJuros }
  }, [dataBase, valorPrincipal])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calculator className="h-4 w-4 mr-1" />
          Juros de mora
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Calculadora de juros de mora</DialogTitle>
          <DialogDescription>
            Soma todos os índices SELIC/IPCA desde a data base até o último índice válido da tabela oficial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Data base do crédito</Label>
            <p className="text-sm font-medium">
              {dataBase
                ? new Date(dataBase).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })
                : "Não informada"}
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Período considerado</Label>
            <p className="text-sm font-medium">
              {resultado.periodos.length > 0
                ? `${resultado.periodos[0].periodo.split(" - ")[1]} até ${resultado.periodos[resultado.periodos.length - 1].periodo.split(" - ")[1]}`
                : "Nenhum período aplicável"}
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Taxa total de juros moratórios</Label>
            <p className="text-2xl font-bold text-primary">
              {resultado.taxaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%
            </p>
          </div>

          {valorPrincipal > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Juros sobre o principal</Label>
              <p className="text-lg font-semibold">
                {resultado.valorJuros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          )}

          {resultado.periodos.length > 0 && (
            <div className="max-h-48 overflow-auto rounded-md border border-border p-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-2">Período</th>
                    <th className="py-1 pr-2 text-right">Índice</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.periodos.map((p, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="py-1 pr-2">{p.periodo}</td>
                      <td className="py-1 pr-2 text-right">
                        {p.indice.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="py-1 pr-2">Total</td>
                    <td className="py-1 pr-2 text-right">
                      {resultado.taxaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 4 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {resultado.periodos.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhum período de juros de mora aplicável foi encontrado para a data base informada.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
