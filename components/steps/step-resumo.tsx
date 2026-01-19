"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download } from "lucide-react"

interface StepResumoProps {
  dados: any
  resultadosEtapas: any[]
  voltar: () => void
}

export function StepResumo({ dados, resultadosEtapas, voltar }: StepResumoProps) {
  console.log("[v0] ========== STEP RESUMO - DEBUG COMPLETO ==========")
  console.log("[v0] Step Resumo - dados recebidos:", dados)
  console.log("[v0] Step Resumo - resultadosEtapas completo:", resultadosEtapas)
  console.log("[v0] Número de resultados:", resultadosEtapas.length)

  resultadosEtapas.forEach((resultado, index) => {
    console.log(`[v0] Resultado etapa ${index}:`, resultado)
  })

  const resumo = resultadosEtapas[5] || {}
  const etapaPss = resultadosEtapas[2] || {}
  const etapaIrpf = resultadosEtapas[1] || {}

  const isentoPss = etapaPss.isento_pss === true

  const formatarMoeda = (valor: number | null | undefined) => {
    if (valor == null) return "R$ 0,00"
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const handleExportarJSON = () => {
    const dataStr = JSON.stringify({ dados, resultadosEtapas }, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)
    const exportFileDefaultName = `calculo-precatorio-${Date.now()}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo Final do Cálculo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!resumo || Object.keys(resumo).length === 0 ? (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Nenhum resultado de cálculo disponível. Por favor, complete todas as etapas anteriores.
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold border-b pb-1">Valores Base</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Valor atualizado</p>
                <p className="font-medium">{formatarMoeda(resumo.valor_atualizado)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Base pré-descontos</p>
                <p className="font-medium">{formatarMoeda(resumo.base_liquida_pre_descontos)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold border-b pb-1">Descontos</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">IRPF</p>
                <p className="font-medium text-red-600">{formatarMoeda(resumo.irpf_valor)}</p>
              </div>
              {!isentoPss && (
                <div>
                  <p className="text-xs text-muted-foreground">PSS (com juros)</p>
                  <p className="font-medium text-red-600">{formatarMoeda(resumo.pss_valor)}</p>
                </div>
              )}
              {isentoPss && (
                <div>
                  <p className="text-xs text-muted-foreground">PSS</p>
                  <p className="font-medium text-muted-foreground">Isento</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Honorários</p>
                <p className="font-medium text-red-600">
                  {resumo.honorarios_percentual?.toFixed(2) || "0.00"}% · {formatarMoeda(resumo.honorarios_valor)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Adiantamento</p>
                <p className="font-medium text-red-600">
                  {resumo.adiantamento_percentual?.toFixed(2) || "0.00"}% · {formatarMoeda(resumo.adiantamento_valor)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold border-b pb-1">Resultado Final</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Base líquida final (para propostas)</p>
                <p className="font-bold text-blue-600">{formatarMoeda(resumo.base_liquida_final)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Menor proposta ({resumo.percentual_menor?.toFixed(2) || "0.00"}%)
                </p>
                <p className="font-medium text-emerald-600">{formatarMoeda(resumo.menor_proposta)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Maior proposta ({resumo.percentual_maior?.toFixed(2) || "0.00"}%)
                </p>
                <p className="font-medium text-orange-600">{formatarMoeda(resumo.maior_proposta)}</p>
              </div>
            </div>
          </div>
        </div>

        {(dados.observacoes || resumo.observacoes) && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-xs font-medium mb-2">Observações</p>
            <p className="text-xs whitespace-pre-wrap text-muted-foreground">{dados.observacoes || resumo.observacoes}</p>
          </div>
        )}

        <div className="flex justify-between mt-4">
          <Button variant="outline" size="sm" onClick={voltar}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportarJSON}>
            <Download className="h-4 w-4 mr-1" />
            Exportar JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
