"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import type { OperatorMetrics } from "@/lib/types/dashboard"

interface OperatorDistributionProps {
  data: OperatorMetrics[]
  loading?: boolean
}

export function OperatorDistribution({ data, loading }: OperatorDistributionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Operador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Operador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Nenhum operador com precatórios</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Operador</CardTitle>
        <p className="text-sm text-muted-foreground">Carga de trabalho e performance</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operador</TableHead>
              <TableHead className="text-right">Em Cálculo</TableHead>
              <TableHead className="text-right">Finalizados</TableHead>
              <TableHead className="text-right">Com Atraso</TableHead>
              <TableHead className="text-right">SLA Estourado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((operator) => (
              <TableRow key={operator.operador_id}>
                <TableCell className="font-medium">{operator.operador_nome}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="font-mono">
                    {operator.em_calculo}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="font-mono">
                    {operator.finalizados}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {operator.com_atraso > 0 ? (
                    <Badge variant="secondary" className="font-mono bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      {operator.com_atraso}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {operator.sla_estourado > 0 ? (
                    <Badge variant="destructive" className="font-mono">
                      {operator.sla_estourado}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
