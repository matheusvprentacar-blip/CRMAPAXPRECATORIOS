"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Trash2, Calendar, DollarSign, TrendingUp } from "lucide-react"
import type { CalculationResult } from "@/types/calculation"

interface CalculationHistoryProps {
  calculations: CalculationResult[]
  setCalculations: (calculations: CalculationResult[]) => void
}

export default function CalculationHistory({ calculations, setCalculations }: CalculationHistoryProps) {
  const handleDelete = (id: string) => {
    setCalculations(calculations.filter((calc) => calc.id !== id))
  }

  const handleExport = (calculation: CalculationResult) => {
    const data = {
      "Valor Principal": calculation.principalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      Juros: calculation.interestValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      "Correção Monetária": calculation.correctionValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      "Valor Total": calculation.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      "Data Inicial": new Date(calculation.startDate).toLocaleDateString("pt-BR"),
      "Data Final": new Date(calculation.endDate).toLocaleDateString("pt-BR"),
      "Taxa de Juros": `${calculation.interestRate}% a.a.`,
      "Índice de Correção": calculation.correctionIndex,
      "Tipo de Cálculo": calculation.calculationType === "simple" ? "Juros Simples" : "Juros Compostos",
      "Data do Cálculo": new Date(calculation.calculatedAt).toLocaleString("pt-BR"),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `precatorio-${calculation.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (calculations.length === 0) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum cálculo realizado</h3>
          <p className="text-gray-600 text-center max-w-md">
            Utilize a calculadora para realizar seu primeiro cálculo de precatório
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Cálculos</CardTitle>
          <CardDescription>
            {calculations.length} {calculations.length === 1 ? "cálculo realizado" : "cálculos realizados"}
          </CardDescription>
        </CardHeader>
      </Card>

      {calculations.map((calculation) => (
        <Card key={calculation.id} className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">
                  {calculation.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </CardTitle>
                <CardDescription className="mt-1">
                  Calculado em {new Date(calculation.calculatedAt).toLocaleDateString("pt-BR")} às{" "}
                  {new Date(calculation.calculatedAt).toLocaleTimeString("pt-BR")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport(calculation)}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(calculation.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valor Principal</p>
                    <p className="font-semibold text-gray-900">
                      {calculation.principalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Juros</p>
                    <p className="font-semibold text-gray-900">
                      {calculation.interestValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Correção Monetária</p>
                    <p className="font-semibold text-gray-900">
                      {calculation.correctionValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Período</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(calculation.startDate).toLocaleDateString("pt-BR")} até{" "}
                      {new Date(calculation.endDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxa de Juros:</span>
                    <span className="font-medium text-gray-900">{calculation.interestRate}% a.a.</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Índice:</span>
                    <span className="font-medium text-gray-900">{calculation.correctionIndex}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium text-gray-900">
                      {calculation.calculationType === "simple" ? "Juros Simples" : "Juros Compostos"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
