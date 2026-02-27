"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ExternalLink, Clock, User } from "@/components/icons"
import { useRouter } from "next/navigation"
import { ComplexityBadge } from "@/components/ui/complexity-badge"
import { SLAIndicator } from "@/components/ui/sla-indicator"
import { DelayTypeBadge } from "@/components/ui/delay-type-badge"
import { ImpactBadge } from "@/components/ui/impact-badge"
import type { CriticalPrecatorio } from "@/lib/types/dashboard"

interface CriticalPrecatoriosProps {
  data: CriticalPrecatorio[]
  loading?: boolean
}

type DelayType = Parameters<typeof DelayTypeBadge>[0]["tipo"]

export function CriticalPrecatorios({ data, loading }: CriticalPrecatoriosProps) {
  const router = useRouter()
  const surfaceClass = "border-border/70 bg-background/42 backdrop-blur-xl dark:bg-muted/48"

  if (loading) {
    return (
      <Card className={surfaceClass}>
        <CardHeader>
          <CardTitle>Precatórios Críticos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className={surfaceClass}>
        <CardHeader>
          <CardTitle>Precatórios Críticos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Nenhum precatório crítico no momento</p>
            <p className="text-xs text-muted-foreground mt-2">
              Precatórios com alta complexidade, SLA estourado ou atraso de alto impacto aparecerão aqui
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getCriticalityColor = (score: number) => {
    if (score >= 70) {
      return "relative overflow-hidden border-destructive/40 bg-content1 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.22)] dark:bg-zinc-900/72 dark:shadow-[0_18px_40px_-26px_rgba(0,0,0,0.42)] dark:after:pointer-events-none dark:after:absolute dark:after:inset-0 dark:after:content-[''] dark:after:bg-[radial-gradient(120%_120%_at_100%_0%,hsl(var(--destructive)/0.16)_0%,transparent_58%)]"
    }
    if (score >= 40) {
      return "relative overflow-hidden border-primary/40 bg-content1 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.22)] dark:bg-zinc-900/72 dark:shadow-[0_18px_40px_-26px_rgba(0,0,0,0.42)] dark:after:pointer-events-none dark:after:absolute dark:after:inset-0 dark:after:content-[''] dark:after:bg-[radial-gradient(120%_120%_at_100%_0%,hsl(var(--primary)/0.16)_0%,transparent_58%)]"
    }
    return "relative overflow-hidden border-primary/35 bg-content1 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.22)] dark:bg-zinc-900/72 dark:shadow-[0_18px_40px_-26px_rgba(0,0,0,0.42)] dark:after:pointer-events-none dark:after:absolute dark:after:inset-0 dark:after:content-[''] dark:after:bg-[radial-gradient(120%_120%_at_100%_0%,hsl(var(--primary)/0.14)_0%,transparent_58%)]"
  }

  const getCriticalityIcon = (score: number) => {
    if (score >= 70) return "ðŸ”´"
    if (score >= 40) return "ðŸŸ "
    return "ðŸŸ¡"
  }

  return (
    <Card className={surfaceClass}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Precatórios Críticos
        </CardTitle>
        <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
          Precatórios que precisam atenção imediata (ordenados por criticidade)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((precatorio) => (
            <Card
              key={precatorio.id}
              className={`${getCriticalityColor(precatorio.score_criticidade)} border-2 backdrop-blur-md transition-all hover:shadow-md`}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Cabeçalho */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getCriticalityIcon(precatorio.score_criticidade)}</span>
                        <h4 className="font-semibold text-base leading-tight">
                          {precatorio.titulo || precatorio.numero_precatorio || "Sem título"}
                        </h4>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Score de Criticidade: {precatorio.score_criticidade}/100
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/precatorios/${precatorio.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Badges de Status */}
                  <div className="flex flex-wrap items-center gap-2">
                    {precatorio.nivel_complexidade && precatorio.score_complexidade !== null && (
                      <ComplexityBadge
                        nivel={precatorio.nivel_complexidade}
                        score={precatorio.score_complexidade}
                        size="sm"
                      />
                    )}

                    {precatorio.sla_status && precatorio.sla_horas && (
                      <SLAIndicator
                        status={precatorio.sla_status as "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido"}
                        slaHoras={precatorio.sla_horas}
                        size="sm"
                        showDetails={false}
                      />
                    )}

                    {precatorio.tipo_atraso && (
                      <DelayTypeBadge tipo={precatorio.tipo_atraso as DelayType} size="sm" />
                    )}

                    {precatorio.impacto_atraso && (
                      <ImpactBadge impacto={precatorio.impacto_atraso} size="sm" showIcon={false} />
                    )}
                  </div>

                  {/* Informações */}
                  <div className="grid gap-2 text-sm">
                    {precatorio.responsavel_nome && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Responsável:</span>
                        <span className="font-medium">{precatorio.responsavel_nome}</span>
                      </div>
                    )}

                    {precatorio.horas_em_fila !== null && precatorio.horas_em_fila > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Tempo em fila:</span>
                        <span className="font-medium">
                          {precatorio.horas_em_fila < 1
                            ? `${Math.round(precatorio.horas_em_fila * 60)}min`
                            : `${precatorio.horas_em_fila.toFixed(1)}h`}
                        </span>
                      </div>
                    )}

                    {precatorio.motivo_atraso_calculo && (
                      <div className="mt-2 rounded-md bg-primary/15 dark:bg-primary/15 p-2">
                        <p className="text-xs font-medium text-primary dark:text-primary">
                          Motivo do Atraso:
                        </p>
                        <p className="text-xs text-primary dark:text-primary mt-1">
                          {precatorio.motivo_atraso_calculo}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
