"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { DelayTypeBadge } from "@/components/ui/delay-type-badge"
import type { BottleneckItem } from "@/lib/types/dashboard"

interface DelayBottlenecksProps {
  data: BottleneckItem[]
  loading?: boolean
}

export function DelayBottlenecks({ data, loading }: DelayBottlenecksProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gargalos por Motivo de Atraso</CardTitle>
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
          <CardTitle>Gargalos por Motivo de Atraso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Nenhum atraso registrado</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gargalos por Motivo de Atraso</CardTitle>
        <p className="text-sm text-muted-foreground">Principais motivos que travam precatórios</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">SLA Estourado</TableHead>
              <TableHead className="text-right">% do Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.tipo_atraso}>
                <TableCell>
                  <DelayTypeBadge 
                    tipo={item.tipo_atraso as any} 
                    size="sm" 
                  />
                </TableCell>
                <TableCell className="text-right font-medium">{item.total}</TableCell>
                <TableCell className="text-right">
                  {item.com_sla_estourado > 0 ? (
                    <Badge variant="destructive" className="font-mono">
                      {item.com_sla_estourado}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {item.percentual.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
