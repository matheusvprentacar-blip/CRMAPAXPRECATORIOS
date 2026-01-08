"use client"

import { CheckCircle2, Circle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import type { ChecklistItem } from "@/lib/types/documento"
import { calcularProgressoChecklist } from "@/lib/types/documento"

interface ChecklistDocumentosProps {
  checklist: ChecklistItem[]
  onAnexarClick?: (tipo: string) => void
  showProgress?: boolean
}

export function ChecklistDocumentos({
  checklist,
  onAnexarClick,
  showProgress = true,
}: ChecklistDocumentosProps) {
  const progresso = calcularProgressoChecklist(checklist)

  // Separar obrigatórios e opcionais
  const obrigatorios = checklist.filter((item) => item.obrigatorio)
  const opcionais = checklist.filter((item) => !item.obrigatorio)

  return (
    <div className="space-y-4">
      {/* Progresso Geral */}
      {showProgress && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Progresso dos Documentos</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {progresso.anexados} de {progresso.total} documentos anexados
                </CardDescription>
              </div>
              {progresso.completo ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completo
                </Badge>
              ) : (
                <Badge variant="secondary">
                  {progresso.obrigatoriosAnexados}/{progresso.obrigatorios} obrigatórios
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Barra de progresso obrigatórios */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Documentos Obrigatórios</span>
                <span className="font-medium">{progresso.percentualObrigatorios}%</span>
              </div>
              <Progress value={progresso.percentualObrigatorios} className="h-2" />
            </div>

            {/* Barra de progresso geral */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso Geral</span>
                <span className="font-medium">{progresso.percentual}%</span>
              </div>
              <Progress 
                value={progresso.percentual} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Documentos Obrigatórios */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Documentos Obrigatórios</CardTitle>
            <Badge variant="destructive" className="text-xs">
              {progresso.obrigatoriosAnexados}/{progresso.obrigatorios}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {obrigatorios.map((item) => (
              <ChecklistItemRow
                key={item.tipo}
                item={item}
                onAnexarClick={onAnexarClick}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Documentos Opcionais */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Documentos Opcionais</CardTitle>
            <Badge variant="outline" className="text-xs">
              {opcionais.filter((i) => i.anexado).length}/{opcionais.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {opcionais.map((item) => (
              <ChecklistItemRow
                key={item.tipo}
                item={item}
                onAnexarClick={onAnexarClick}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente interno para cada item do checklist
function ChecklistItemRow({
  item,
  onAnexarClick,
}: {
  item: ChecklistItem
  onAnexarClick?: (tipo: string) => void
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        item.anexado
          ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
          : "bg-muted/30 border-muted"
      }`}
    >
      {/* Ícone de status */}
      <div className="flex-shrink-0 mt-0.5">
        {item.anexado ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : item.obrigatorio ? (
          <AlertCircle className="w-5 h-5 text-destructive" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Informações do documento */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{item.label}</h4>
              {item.obrigatorio && (
                <Badge variant="destructive" className="text-xs h-5">
                  Obrigatório
                </Badge>
              )}
              {item.quantidade > 1 && (
                <Badge variant="secondary" className="text-xs h-5">
                  {item.quantidade} arquivos
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {item.descricao}
            </p>
          </div>

          {/* Botão de ação */}
          {!item.anexado && onAnexarClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAnexarClick(item.tipo)}
              className="h-7 text-xs flex-shrink-0"
            >
              Anexar
            </Button>
          )}
        </div>

        {/* Status */}
        <div className="mt-2">
          {item.anexado ? (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              ✓ Anexado
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {item.obrigatorio ? "⚠️ Pendente" : "Opcional"}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
