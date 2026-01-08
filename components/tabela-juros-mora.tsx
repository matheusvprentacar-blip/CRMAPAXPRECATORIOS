"use client"

import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TABELA_JUROS_MORA } from "@/lib/calculos/indices"

export function TabelaJurosMora() {
  return (
    <Card className="p-4 space-y-2">
      <h3 className="text-sm font-medium">Tabela de juros de mora</h3>
      <p className="text-xs text-muted-foreground">
        Índices utilizados para cálculo da taxa de juros de mora acumulada no período.
      </p>
      <ScrollArea className="h-48">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 pr-2">Início</th>
              <th className="py-1 pr-2">Fim</th>
              <th className="py-1 pr-2">Taxa (%)</th>
            </tr>
          </thead>
          <tbody>
            {TABELA_JUROS_MORA.map((item, index) => (
              <tr key={index} className="border-t border-border">
                <td className="py-1 pr-2">{new Date(item.inicio).toLocaleDateString("pt-BR")}</td>
                <td className="py-1 pr-2">{new Date(item.fim).toLocaleDateString("pt-BR")}</td>
                <td className="py-1 pr-2">{item.taxa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </Card>
  )
}
