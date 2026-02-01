"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyInput } from "@/components/ui/currency-input"
import { ArrowLeft, ArrowRight } from "lucide-react"

interface StepDadosBasicosProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  precatorioId?: string
}

export function StepDadosBasicos({ dados, setDados, onCompletar, voltar }: StepDadosBasicosProps) {
  const handleChange = (field: string, value: any) => {
    setDados({ ...dados, [field]: value })
  }

  const handleAvancar = () => {
    const principal = Number(dados.valor_principal_original || 0)
    const juros = Number(dados.valor_juros_original || 0)
    const multa = Number(dados.multa || 0)
    // Regra solicitada: somar principal + juros + multa/selic como base para o cálculo
    const principalSomado = principal + juros + multa

    const resultado = {
      ...dados,
      // Valores financeiros ajustados
      valor_principal_original: principalSomado,
      valor_juros_original: 0, // já incorporado ao principal
      multa: 0, // já incorporada ao principal
      principal_informado: principal,
      juros_informados: juros,
      multa_informada: multa,
    }
    onCompletar(resultado)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados Básicos do Precatório</CardTitle>
        <CardDescription>Informe apenas os valores financeiros essenciais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Valor Principal</Label>
            <CurrencyInput
              value={dados.valor_principal_original || 0}
              onChange={(value) => handleChange("valor_principal_original", value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Data Base</Label>
            <Input
              type="date"
              value={dados.data_base || ""}
              onChange={(e) => handleChange("data_base", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Juros</Label>
            <CurrencyInput
              value={dados.valor_juros_original || 0}
              onChange={(value) => handleChange("valor_juros_original", value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Multa / Selic</Label>
            <CurrencyInput
              value={dados.multa || 0}
              onChange={(value) => handleChange("multa", value)}
            />
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
