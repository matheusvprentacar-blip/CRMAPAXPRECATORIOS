"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, RefreshCw } from "@/components/icons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ModoCdi, SimulationOutput } from "@/services/simulation/types"
import { normalizePagamentoDateInput } from "@/services/simulation"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type LatestSnapshotResponse = {
  snapshot: {
    refDate: string
    cdiAnnual: number | null
    selicAnnual: number | null
    tesouroTitulos: Array<{ nome: string }>
  } | null
  stale: boolean
  staleDays: number | null
  canRefresh: boolean
  message?: string
}

type SimulationResponse = {
  outputs: SimulationOutput
}

interface ProjecaoComparativoPanelProps {
  precatorioId: string
  defaultPrevisaoPagamento?: string | null
  defaultPrecoCompra?: number | null
  className?: string
}

function getTodayIsoDate(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || ""
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function toBrDate(dateIso: string): string {
  const [year, month, day] = dateIso.split("-")
  if (!year || !month || !day) return dateIso
  return `${day}/${month}/${year}`
}

function calcHorizonText(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "-"
  }

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) {
    months -= 1
  }
  months = Math.max(0, months)

  const years = months / 12
  return `${months} meses (${years.toFixed(2)} anos)`
}

export function ProjecaoComparativoPanel({
  precatorioId,
  defaultPrevisaoPagamento,
  defaultPrecoCompra,
  className,
}: ProjecaoComparativoPanelProps) {
  const [dataVenda, setDataVenda] = useState<string>(getTodayIsoDate())
  const [precoCompra, setPrecoCompra] = useState<number | undefined>(
    defaultPrecoCompra && defaultPrecoCompra > 0 ? defaultPrecoCompra : undefined,
  )
  const [dataPagamento, setDataPagamento] = useState<string>(normalizePagamentoDateInput(defaultPrevisaoPagamento))
  const [modoCdi, setModoCdi] = useState<ModoCdi>("cdi_110")

  const [snapshotState, setSnapshotState] = useState<LatestSnapshotResponse | null>(null)
  const [loadingSnapshot, setLoadingSnapshot] = useState<boolean>(true)
  const [refreshingSnapshot, setRefreshingSnapshot] = useState<boolean>(false)
  const [simulating, setSimulating] = useState<boolean>(false)
  const [simulation, setSimulation] = useState<SimulationOutput | null>(null)

  const [snapshotError, setSnapshotError] = useState<string | null>(null)
  const [simulationError, setSimulationError] = useState<string | null>(null)

  useEffect(() => {
    if ((!precoCompra || precoCompra <= 0) && defaultPrecoCompra && defaultPrecoCompra > 0) {
      setPrecoCompra(defaultPrecoCompra)
    }
  }, [defaultPrecoCompra, precoCompra])

  useEffect(() => {
    if (!dataPagamento) {
      const normalized = normalizePagamentoDateInput(defaultPrevisaoPagamento)
      if (normalized) setDataPagamento(normalized)
    }
  }, [defaultPrevisaoPagamento, dataPagamento])

  const fetchLatestSnapshot = useCallback(async () => {
    setLoadingSnapshot(true)
    setSnapshotError(null)

    try {
      const response = await fetch("/api/market/latest", { cache: "no-store" })
      const body = (await response.json()) as LatestSnapshotResponse & { error?: string; details?: string }

      if (!response.ok && response.status !== 404) {
        throw new Error(body.error || body.details || "Falha ao carregar snapshot de mercado")
      }

      setSnapshotState(body)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao carregar snapshot de mercado"
      setSnapshotError(message)
      setSnapshotState(null)
    } finally {
      setLoadingSnapshot(false)
    }
  }, [])

  const handleRefreshSnapshot = useCallback(async () => {
    setRefreshingSnapshot(true)
    setSnapshotError(null)

    try {
      const response = await fetch("/api/market/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const body = (await response.json()) as { error?: string; details?: string }
      if (!response.ok) {
        throw new Error(body.error || body.details || "Falha ao atualizar dados de mercado")
      }

      await fetchLatestSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao atualizar dados de mercado"
      setSnapshotError(message)
    } finally {
      setRefreshingSnapshot(false)
    }
  }, [fetchLatestSnapshot])

  const runSimulation = useCallback(async () => {
    if (!precatorioId || !precoCompra || precoCompra <= 0 || !dataPagamento) {
      return
    }

    setSimulationError(null)
    setSimulating(true)

    try {
      const response = await fetch("/api/precatorios/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precatorioId,
          dataVenda,
          precoCompra,
          dataPagamento,
          modoCdi,
        }),
      })

      const body = (await response.json()) as SimulationResponse & { error?: string; details?: string }
      if (!response.ok) {
        throw new Error(body.error || body.details || "Falha ao simular comparativo")
      }

      setSimulation(body.outputs)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao simular comparativo"
      setSimulationError(message)
      setSimulation(null)
    } finally {
      setSimulating(false)
    }
  }, [precatorioId, precoCompra, dataPagamento, dataVenda, modoCdi])

  useEffect(() => {
    fetchLatestSnapshot()
  }, [fetchLatestSnapshot])

  useEffect(() => {
    if (!snapshotState?.snapshot) return
    if (!precoCompra || precoCompra <= 0) return
    if (!dataPagamento) return

    const timer = window.setTimeout(() => {
      runSimulation()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [snapshotState?.snapshot, precoCompra, dataPagamento, dataVenda, modoCdi, runSimulation])

  const horizonText = useMemo(() => {
    if (!dataPagamento) return "-"
    return calcHorizonText(dataVenda, dataPagamento)
  }, [dataVenda, dataPagamento])

  const disableSimulation = !precoCompra || precoCompra <= 0 || !dataPagamento || !snapshotState?.snapshot

  if (loadingSnapshot) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {snapshotError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar dados de mercado</AlertTitle>
          <AlertDescription>{snapshotError}</AlertDescription>
        </Alert>
      ) : null}

      {!snapshotState?.snapshot ? (
        <Card>
          <CardHeader>
            <CardTitle>Sem snapshot de mercado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nenhum snapshot disponivel. Atualize os dados de mercado para liberar a simulacao.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRefreshSnapshot} disabled={refreshingSnapshot}>
                <RefreshCw className={cn("mr-2 h-4 w-4", refreshingSnapshot && "animate-spin")} />
                Atualizar dados de mercado
              </Button>
              {!snapshotState?.canRefresh ? (
                <p className="text-xs text-muted-foreground self-center">
                  Apenas admin/gestor pode forcar atualizacao.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {snapshotState.stale ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Snapshot desatualizado</AlertTitle>
              <AlertDescription>
                Nao foi possivel atualizar hoje. Usando taxas de {toBrDate(snapshotState.snapshot.refDate)}.
              </AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Parametros da simulacao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="comparativo-data-venda">Data da venda</Label>
                  <Input
                    id="comparativo-data-venda"
                    type="date"
                    value={dataVenda}
                    onChange={(event) => setDataVenda(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comparativo-preco-compra">Preco de compra</Label>
                  <CurrencyInput
                    id="comparativo-preco-compra"
                    value={precoCompra}
                    onValueChange={(value) => setPrecoCompra(value)}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comparativo-data-pagamento">Data prevista de pagamento</Label>
                  <Input
                    id="comparativo-data-pagamento"
                    type="date"
                    value={dataPagamento}
                    onChange={(event) => setDataPagamento(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comparativo-modo-cdi">Modo CDI + 10%</Label>
                  <Select value={modoCdi} onValueChange={(value) => setModoCdi(value as ModoCdi)}>
                    <SelectTrigger id="comparativo-modo-cdi">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cdi_110">110% do CDI</SelectItem>
                      <SelectItem value="cdi_plus_10pp">CDI + 10 p.p. a.a.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 p-3 text-sm">
                <p className="text-muted-foreground">Horizonte: <span className="font-medium text-foreground">{horizonText}</span></p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={handleRefreshSnapshot} disabled={refreshingSnapshot}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", refreshingSnapshot && "animate-spin")} />
                    Atualizar dados de mercado
                  </Button>
                  <Button type="button" onClick={runSimulation} disabled={disableSimulation || simulating}>
                    {simulating ? "Simulando..." : "Recalcular agora"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {simulationError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Falha ao calcular simulacao</AlertTitle>
              <AlertDescription>{simulationError}</AlertDescription>
            </Alert>
          ) : null}

          {simulation ? (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                  <CardHeader className="space-y-1 pb-2">
                    <CardTitle className="text-base">Precatorio (projecao fixa)</CardTitle>
                    <p className="text-xs text-muted-foreground">Taxa usada: 6,60% a.a.</p>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-2xl font-semibold">{formatCurrency(simulation.cards.precatorio.valorFinal)}</p>
                    <p className="text-xs text-muted-foreground">Rentabilidade acumulada: {formatPercent(simulation.cards.precatorio.rentabilidadeAcumulada)}</p>
                    <p className="text-xs text-muted-foreground">CAGR: {formatPercent(simulation.cards.precatorio.cagr)}</p>
                    <p className="text-xs text-muted-foreground">Atualizado em: {toBrDate(simulation.snapshotRefDate)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="space-y-1 pb-2">
                    <CardTitle className="text-base">CDI + 10%</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      CDI base: {formatPercent(simulation.cdiBaseAnual)} a.a. ({toBrDate(simulation.snapshotRefDate)})
                    </p>
                    <p className="text-xs text-muted-foreground">Modo: {simulation.modoCdiLabel}</p>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-2xl font-semibold">{formatCurrency(simulation.cards.cdiMais10.valorFinal)}</p>
                    <p className="text-xs text-muted-foreground">Taxa resultante: {formatPercent(simulation.cdiResultanteAnual)} a.a.</p>
                    <p className="text-xs text-muted-foreground">Rentabilidade acumulada: {formatPercent(simulation.cards.cdiMais10.rentabilidadeAcumulada)}</p>
                    <p className="text-xs text-muted-foreground">CAGR: {formatPercent(simulation.cards.cdiMais10.cagr)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="space-y-1 pb-2">
                    <CardTitle className="text-base">Tesouro Direto</CardTitle>
                    <p className="text-xs text-muted-foreground">Titulo: {simulation.tesouroTitulo}</p>
                    <p className="text-xs text-muted-foreground">Fonte: {simulation.tesouroFonteLabel}</p>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-2xl font-semibold">{formatCurrency(simulation.cards.tesouro.valorFinal)}</p>
                    <p className="text-xs text-muted-foreground">Rentabilidade acumulada: {formatPercent(simulation.cards.tesouro.rentabilidadeAcumulada)}</p>
                    <p className="text-xs text-muted-foreground">CAGR: {formatPercent(simulation.cards.tesouro.cagr)}</p>
                    <p className="text-xs text-muted-foreground">Atualizado em: {toBrDate(simulation.snapshotRefDate)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Evolucao projetada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[340px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={simulation.serieMensal}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={28} />
                        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fontSize: 12 }} width={120} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="precatorio" name="Precatorio" stroke="#0f766e" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="cdiMais10" name="CDI + 10%" stroke="#1d4ed8" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="tesouro" name="Tesouro" stroke="#9333ea" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tabela comparativa no vencimento</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Taxa usada</TableHead>
                        <TableHead className="text-right">Valor final</TableHead>
                        <TableHead className="text-right">Rentab. acumulada</TableHead>
                        <TableHead className="text-right">CAGR</TableHead>
                        <TableHead className="text-right">Atualizado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulation.tabelaFinal.map((item) => (
                        <TableRow key={item.produto}>
                          <TableCell>{item.produto}</TableCell>
                          <TableCell>{item.taxaUsadaLabel}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.valorFinal)}</TableCell>
                          <TableCell className="text-right">{formatPercent(item.rentabilidadeAcumulada)}</TableCell>
                          <TableCell className="text-right">{formatPercent(item.cagr)}</TableCell>
                          <TableCell className="text-right">{item.atualizadoEm}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">{simulation.disclaimer}</p>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
