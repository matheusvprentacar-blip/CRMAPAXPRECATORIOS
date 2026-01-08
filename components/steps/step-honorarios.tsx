"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Info } from "lucide-react"
import { useEffect, useState } from "react"

interface StepHonorariosProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  resultadosEtapas: any[]
}

export function StepHonorarios({ dados, setDados, onCompletar, voltar, resultadosEtapas }: StepHonorariosProps) {
  const honorariosSalvos = resultadosEtapas[4]?.honorarios

  const [honorariosPercentual, setHonorariosPercentual] = useState(
    honorariosSalvos?.honorarios_percentual || dados.honorarios_percentual || 0,
  )
  const [adiantamentoPercentual, setAdiantamentoPercentual] = useState(
    honorariosSalvos?.adiantamento_percentual || dados.adiantamento_percentual || 0,
  )

  // Sincronizar com dados salvos quando disponíveis
  useEffect(() => {
    if (honorariosSalvos) {
      setHonorariosPercentual(honorariosSalvos.honorarios_percentual || 0)
      setAdiantamentoPercentual(honorariosSalvos.adiantamento_percentual || 0)
    }
  }, [honorariosSalvos])
  // </CHANGE>

  const propostas = resultadosEtapas[5] // Step Propostas
  const baseCalculo = propostas?.base_calculo_liquida || propostas?.valorLiquidoCredor || 0

  const honorariosValor = honorariosSalvos?.honorarios_valor || baseCalculo * (honorariosPercentual / 100)
  const adiantamentoValor = honorariosSalvos?.adiantamento_valor || baseCalculo * (adiantamentoPercentual / 100)
  // </CHANGE>

  const handleChange = (field: string, value: any) => {
    setDados({ ...dados, [field]: value })
  }

  const handlePercentualChange = (field: string, value: string) => {
    const numericValue = value === "" ? 0 : Number.parseFloat(value)
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
      if (field === "honorarios_percentual") {
        setHonorariosPercentual(numericValue)
      } else if (field === "adiantamento_percentual") {
        setAdiantamentoPercentual(numericValue)
      }
      handleChange(field, numericValue)
    }
  }

  const handleAvancar = () => {
    onCompletar({
      honorarios: {
        honorarios_percentual: honorariosPercentual,
        honorarios_valor: honorariosValor,
        adiantamento_percentual: adiantamentoPercentual,
        adiantamento_valor: adiantamentoValor,
      },
      // Campos legados para compatibilidade
      honorarios_contratuais: honorariosValor,
      adiantamento_recebido: adiantamentoValor,
      honorariosTotal: honorariosValor,
      adiantamentoValor: adiantamentoValor,
    })
  }

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Honorários e Adiantamentos</CardTitle>
        <CardDescription>Configure percentuais de honorários e adiantamentos sobre a base líquida</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {baseCalculo === 0 ? (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Base de cálculo ainda não disponível</p>
              <p>Os valores em R$ serão calculados automaticamente após completar a etapa de Propostas.</p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Base de cálculo (líquida)</p>
            <p className="text-sm font-medium">{formatarMoeda(baseCalculo)}</p>
          </div>
        )}
        {/* </CHANGE> */}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Honorários Contratuais (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={honorariosPercentual || ""}
                onChange={(e) => handlePercentualChange("honorarios_percentual", e.target.value)}
                placeholder="0.00"
              />
            </div>
            {baseCalculo > 0 && (
              <div className="p-2 bg-muted/50 rounded">
                <p className="text-xs text-muted-foreground">Valor calculado</p>
                <p className="text-sm font-medium text-emerald-600">{formatarMoeda(honorariosValor)}</p>
              </div>
            )}
            {/* </CHANGE> */}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Adiantamento Recebido (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={adiantamentoPercentual || ""}
                onChange={(e) => handlePercentualChange("adiantamento_percentual", e.target.value)}
                placeholder="0.00"
              />
            </div>
            {baseCalculo > 0 && (
              <div className="p-2 bg-muted/50 rounded">
                <p className="text-xs text-muted-foreground">Valor calculado</p>
                <p className="text-sm font-medium text-orange-600">{formatarMoeda(adiantamentoValor)}</p>
              </div>
            )}
            {/* </CHANGE> */}
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <Button variant="outline" size="sm" onClick={voltar}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button size="sm" onClick={handleAvancar}>
            Avançar
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
