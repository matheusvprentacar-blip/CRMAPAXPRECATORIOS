"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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

  const [isManual, setIsManual] = useState<boolean>(dados.honorarios_manual || false)

  const [honorariosPercentual, setHonorariosPercentual] = useState(
    honorariosSalvos?.honorarios_percentual || dados.honorarios_percentual || 0,
  )
  const [adiantamentoPercentual, setAdiantamentoPercentual] = useState(
    honorariosSalvos?.adiantamento_percentual || dados.adiantamento_percentual || 0,
  )

  // States for manual values
  const [honorariosValorManual, setHonorariosValorManual] = useState<number>(honorariosSalvos?.honorarios_valor || 0)
  const [adiantamentoValorManual, setAdiantamentoValorManual] = useState<number>(honorariosSalvos?.adiantamento_valor || 0)

  useEffect(() => {
    if (honorariosSalvos) {
      setHonorariosPercentual(honorariosSalvos.honorarios_percentual || 0)
      setAdiantamentoPercentual(honorariosSalvos.adiantamento_percentual || 0)
      if (isManual) {
        setHonorariosValorManual(honorariosSalvos.honorarios_valor || 0)
        setAdiantamentoValorManual(honorariosSalvos.adiantamento_valor || 0)
      }
    }
  }, [honorariosSalvos, isManual])

  const propostas = resultadosEtapas[5]
  const baseCalculo = propostas?.base_calculo_liquida || propostas?.valorLiquidoCredor || 0

  // Calculate auto values
  const honorariosValorAuto = baseCalculo * (honorariosPercentual / 100)
  const adiantamentoValorAuto = baseCalculo * (adiantamentoPercentual / 100)

  const honorariosValorFinal = isManual ? honorariosValorManual : honorariosValorAuto
  const adiantamentoValorFinal = isManual ? adiantamentoValorManual : adiantamentoValorAuto

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

  const handleManualToggle = (checked: boolean) => {
    setIsManual(checked)
    if (checked) {
      // Initialize manual values with current auto values
      setHonorariosValorManual(honorariosValorAuto)
      setAdiantamentoValorManual(adiantamentoValorAuto)
    }
  }

  const handleAvancar = () => {
    const newHonPercent = isManual && baseCalculo > 0 ? (honorariosValorManual / baseCalculo) * 100 : honorariosPercentual
    const newAdiPercent = isManual && baseCalculo > 0 ? (adiantamentoValorManual / baseCalculo) * 100 : adiantamentoPercentual

    onCompletar({
      honorarios: {
        honorarios_percentual: newHonPercent,
        honorarios_valor: honorariosValorFinal,
        adiantamento_percentual: newAdiPercent,
        adiantamento_valor: adiantamentoValorFinal,
      },
      // Campos legados para compatibilidade
      honorarios_contratuais: honorariosValorFinal,
      adiantamento_recebido: adiantamentoValorFinal,
      honorariosTotal: honorariosValorFinal,
      adiantamentoValor: adiantamentoValorFinal,
      honorarios_manual: isManual
    })

    setDados({
      ...dados,
      honorarios_manual: isManual,
      honorarios_percentual: newHonPercent,
      adiantamento_percentual: newAdiPercent
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
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Honorários e Adiantamentos</CardTitle>
            <CardDescription>Configure percentuais de honorários e adiantamentos sobre a base líquida</CardDescription>
          </div>
          <div className="flex items-center space-x-2 bg-secondary/50 p-2 rounded-lg border border-secondary">
            <Switch id="manual-mode-honorarios" checked={isManual} onCheckedChange={handleManualToggle} />
            <Label htmlFor="manual-mode-honorarios" className="cursor-pointer font-semibold">
              Modo Manual
            </Label>
          </div>
        </div>
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
                disabled={isManual}
              />
            </div>
            {(baseCalculo > 0 || isManual) && (
              <div className="p-2 bg-muted/50 rounded">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Valor Honorários (R$)
                  {isManual && <span className="ml-1 text-amber-600">(Manual)</span>}
                </Label>
                {isManual ? (
                  <Input
                    type="number"
                    step="0.01"
                    className="font-bold text-emerald-600 border-emerald-200"
                    value={honorariosValorManual}
                    onChange={(e) => setHonorariosValorManual(Number.parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <p className="text-sm font-medium text-emerald-600">{formatarMoeda(honorariosValorAuto)}</p>
                )}
              </div>
            )}
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
                disabled={isManual}
              />
            </div>
            {(baseCalculo > 0 || isManual) && (
              <div className="p-2 bg-muted/50 rounded">
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Valor Adiantamento (R$)
                  {isManual && <span className="ml-1 text-amber-600">(Manual)</span>}
                </Label>
                {isManual ? (
                  <Input
                    type="number"
                    step="0.01"
                    className="font-bold text-orange-600 border-orange-200"
                    value={adiantamentoValorManual}
                    onChange={(e) => setAdiantamentoValorManual(Number.parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <p className="text-sm font-medium text-orange-600">{formatarMoeda(adiantamentoValorAuto)}</p>
                )}
              </div>
            )}
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
