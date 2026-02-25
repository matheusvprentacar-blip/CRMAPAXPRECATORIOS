"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users } from "@/components/icons"
import type { OperatorMetrics } from "@/lib/types/dashboard"

interface OperatorDistributionProps {
  data: OperatorMetrics[]
  loading?: boolean
}

export function OperatorDistribution({ data, loading }: OperatorDistributionProps) {
  const surfaceClass = "border-border/70 bg-background/42 backdrop-blur-xl dark:bg-muted/48"

  if (loading) {
    return (
      <Card className={surfaceClass}>
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
      <Card className={surfaceClass}>
        <CardHeader>
          <CardTitle>Distribuição por Operador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Nenhum operador com precatórios</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={surfaceClass}>
      <CardHeader>
        <CardTitle>Distribuição por Operador</CardTitle>
        <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Carga de trabalho e performance</p>
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
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    {operator.em_calculo}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="font-mono tabular-nums">
                    {operator.finalizados}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {operator.com_atraso > 0 ? (
                    <Badge variant="secondary" className="font-mono tabular-nums bg-primary/15 text-primary dark:bg-primary/15 dark:text-primary">
                      {operator.com_atraso}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground font-mono tabular-nums">0</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {operator.sla_estourado > 0 ? (
                    <Badge variant="destructive" className="font-mono tabular-nums">
                      {operator.sla_estourado}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground font-mono tabular-nums">0</span>
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
