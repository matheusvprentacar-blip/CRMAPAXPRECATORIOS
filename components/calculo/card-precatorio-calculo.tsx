"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Calculator, Eye, User, Briefcase, UserCog, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { ComplexityBadge } from "@/components/ui/complexity-badge"
import { SLAIndicator } from "@/components/ui/sla-indicator"
import { DelayTypeBadge } from "@/components/ui/delay-type-badge"
import { ImpactBadge } from "@/components/ui/impact-badge"

interface CardPrecatorioCalculoProps {
  precatorio: {
    id: string
    titulo: string | null
    numero_processo: string | null
    numero_precatorio: string | null
    credor_nome: string | null
    valor_principal: number | null
    valor_atualizado: number | null
    status: string | null
    created_at: string
    urgente?: boolean
    tribunal?: string | null
    criador_nome?: string | null
    responsavel_nome?: string | null
    responsavel_calculo_nome?: string | null
    motivo_atraso_calculo?: string | null
    data_atraso_calculo?: string | null
    // FASE 1: Complexidade e SLA
    score_complexidade?: number
    nivel_complexidade?: "baixa" | "media" | "alta"
    data_entrada_calculo?: string | null
    sla_horas?: number
    sla_status?: "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido"
    // FASE 2: Atraso Estruturado
    tipo_atraso?: "titular_falecido" | "penhora" | "cessao_parcial" | "doc_incompleta" | "duvida_juridica" | "aguardando_cliente" | "outro"
    impacto_atraso?: "baixo" | "medio" | "alto"
  }
  posicao: number
  onCalcular: () => void
  onReportarAtraso: () => void
  onRemoverAtraso?: () => void
  isCalculando?: boolean
}

export function CardPrecatorioCalculo({
  precatorio,
  posicao,
  onCalcular,
  onReportarAtraso,
  onRemoverAtraso,
  isCalculando = false,
}: CardPrecatorioCalculoProps) {
  const router = useRouter()

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card
      className={`hover:shadow-md transition-all ${
        precatorio.urgente ? "border-red-500 border-2" : ""
      } ${precatorio.motivo_atraso_calculo ? "bg-orange-50/50 dark:bg-orange-950/10" : ""}`}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Cabeçalho com posição e título */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono">
                  #{posicao}
                </Badge>
                
                {precatorio.urgente && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    URGENTE
                  </Badge>
                )}
                
                {precatorio.motivo_atraso_calculo && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    <Clock className="h-3 w-3" />
                    Atraso Reportado
                  </Badge>
                )}
                
                {/* FASE 1: Badge de Complexidade */}
                {precatorio.nivel_complexidade && precatorio.score_complexidade !== undefined && (
                  <ComplexityBadge 
                    nivel={precatorio.nivel_complexidade} 
                    score={precatorio.score_complexidade}
                    size="sm"
                  />
                )}
              </div>

              <h3 className="font-semibold text-lg leading-tight">
                {precatorio.titulo || precatorio.numero_precatorio || "Sem título"}
              </h3>
            </div>

            <div className="text-right">
              <div className="text-xl font-bold text-primary">
                {formatCurrency(precatorio.valor_atualizado || precatorio.valor_principal)}
              </div>
            </div>
          </div>

          {/* Informações do Credor e Processo */}
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium">Credor:</span> {precatorio.credor_nome || "Não informado"}
            </p>
            {precatorio.numero_processo && (
              <p className="text-muted-foreground">
                <span className="font-medium">Processo:</span> {precatorio.numero_processo}
              </p>
            )}
            {precatorio.tribunal && (
              <p className="text-muted-foreground">
                <span className="font-medium">Tribunal:</span> {precatorio.tribunal}
              </p>
            )}
          </div>

          {/* Identificação dos Responsáveis */}
          <div className="pt-3 border-t space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Responsáveis:</p>
            
            <div className="grid gap-2 text-sm">
              {precatorio.criador_nome && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Criado por:</span>
                  <span className="font-medium">{precatorio.criador_nome}</span>
                </div>
              )}
              
              {precatorio.responsavel_nome && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Comercial:</span>
                  <span className="font-medium">{precatorio.responsavel_nome}</span>
                </div>
              )}
              
              {precatorio.responsavel_calculo_nome && (
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-purple-500" />
                  <span className="text-muted-foreground">Cálculo:</span>
                  <span className="font-medium">{precatorio.responsavel_calculo_nome}</span>
                </div>
              )}
            </div>
          </div>

          {/* Informação de Atraso (se houver) - FASE 2 */}
          {precatorio.motivo_atraso_calculo && (
            <div className="pt-3 border-t">
              <div className="rounded-lg bg-orange-100 dark:bg-orange-900/20 p-3 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-medium text-orange-800 dark:text-orange-200 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Atraso Reportado:
                  </p>
                  {precatorio.tipo_atraso && (
                    <DelayTypeBadge tipo={precatorio.tipo_atraso} size="sm" />
                  )}
                  {precatorio.impacto_atraso && (
                    <ImpactBadge impacto={precatorio.impacto_atraso} size="sm" showIcon={false} />
                  )}
                </div>
                
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {precatorio.motivo_atraso_calculo}
                </p>
                
                {precatorio.data_atraso_calculo && (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Reportado em: {formatDate(precatorio.data_atraso_calculo)}
                  </p>
                )}

                {/* Ações do Atraso */}
                {onRemoverAtraso && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={onReportarAtraso}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900/20"
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Renovar Atraso
                    </Button>
                    <Button
                      onClick={onRemoverAtraso}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/20"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Remover Atraso
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FASE 1: Indicador de SLA */}
          {precatorio.sla_status && precatorio.sla_horas && (
            <div className="pt-3 border-t">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Status do SLA:</p>
                  <SLAIndicator
                    dataEntrada={precatorio.data_entrada_calculo || undefined}
                    slaHoras={precatorio.sla_horas}
                    status={precatorio.sla_status}
                    size="sm"
                    showDetails={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Data de Recebimento */}
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Recebido em: {formatDate(precatorio.created_at)}
            </p>
          </div>

          {/* Ações */}
          <div className="pt-3 border-t flex gap-2">
            <Button
              onClick={onCalcular}
              disabled={isCalculando}
              className="flex-1"
              size="sm"
            >
              <Calculator className="h-4 w-4 mr-2" />
              {isCalculando ? "Calculando..." : "Calcular"}
            </Button>
            
            <Button
              onClick={onReportarAtraso}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Reportar Atraso
            </Button>
            
            <Button
              onClick={() => router.push(`/precatorios/${precatorio.id}`)}
              variant="ghost"
              size="sm"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
