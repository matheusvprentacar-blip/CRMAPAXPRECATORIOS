"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calculator, Info } from "lucide-react"
import type { CalculationResult } from "@/types/calculation"

interface CalculatorFormProps {
  onCalculate: (result: CalculationResult) => void
}

type CalculationType = "simple" | "compound"

export default function CalculatorForm({ onCalculate }: CalculatorFormProps) {
  const [principalValue, setPrincipalValue] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [interestRate, setInterestRate] = useState("1")
  const [correctionIndex, setCorrectionIndex] = useState("IPCA")
  const [calculationType, setCalculationType] = useState<CalculationType>("simple")

  const calculatePrecatorio = () => {
    const principal = Number.parseFloat(principalValue.replace(/\D/g, "")) / 100
    const rate = Number.parseFloat(interestRate) / 100
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Calcular meses entre as datas
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())

    // Cálculo de juros
    let interest = 0
    if (calculationType === "simple") {
      interest = principal * rate * (months / 12)
    } else {
      interest = principal * (Math.pow(1 + rate, months / 12) - 1)
    }

    // Simulação de correção monetária (5% ao ano como exemplo)
    const correction = principal * 0.05 * (months / 12)

    const totalValue = principal + interest + correction

    const result: CalculationResult = {
      id: Date.now().toString(),
      principalValue: principal,
      interestValue: interest,
      correctionValue: correction,
      totalValue,
      startDate,
      endDate,
      interestRate: Number.parseFloat(interestRate),
      correctionIndex,
      calculationType, // ✅ agora bate com "simple" | "compound"
      calculatedAt: new Date().toISOString(),
    }

    onCalculate(result)
  }

  const handlePrincipalChange = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers) {
      const formatted = (Number.parseFloat(numbers) / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      setPrincipalValue(formatted)
    } else {
      setPrincipalValue("")
    }
  }

  const isFormValid = principalValue && startDate && endDate && interestRate

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          Calcular Precatório
        </CardTitle>
        <CardDescription>Preencha os dados abaixo para calcular o valor atualizado do precatório</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Valor Principal */}
        <div className="space-y-2">
          <Label htmlFor="principal">Valor Principal (R$)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
            <Input
              id="principal"
              value={principalValue}
              onChange={(e) => handlePrincipalChange(e.target.value)}
              className="pl-10"
              placeholder="0,00"
            />
          </div>
          <p className="text-xs text-gray-600">Digite o valor original do precatório</p>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Data Inicial</Label>
            <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <p className="text-xs text-gray-600">Data de início do cálculo</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Data Final</Label>
            <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <p className="text-xs text-gray-600">Data de término do cálculo</p>
          </div>
        </div>

        {/* Taxa de Juros e Tipo de Cálculo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="interestRate">Taxa de Juros (% a.a.)</Label>
            <Input
              id="interestRate"
              type="number"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
            />
            <p className="text-xs text-gray-600">Taxa anual de juros</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="calculationType">Tipo de Cálculo</Label>
            <Select
              value={calculationType}
              onValueChange={(v) => setCalculationType(v as CalculationType)}
            >
              <SelectTrigger id="calculationType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Juros Simples</SelectItem>
                <SelectItem value="compound">Juros Compostos</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600">Método de cálculo dos juros</p>
          </div>
        </div>

        {/* Índice de Correção */}
        <div className="space-y-2">
          <Label htmlFor="correctionIndex">Índice de Correção Monetária</Label>
          <Select value={correctionIndex} onValueChange={setCorrectionIndex}>
            <SelectTrigger id="correctionIndex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IPCA">IPCA</SelectItem>
              <SelectItem value="INPC">INPC</SelectItem>
              <SelectItem value="TR">TR</SelectItem>
              <SelectItem value="SELIC">SELIC</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600">Índice usado para correção monetária</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Informações Importantes</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Os cálculos são estimativas baseadas nos parâmetros informados</li>
              <li>A correção monetária é aplicada de acordo com o índice selecionado</li>
              <li>Consulte um profissional jurídico para validação oficial</li>
            </ul>
          </div>
        </div>

        {/* Button */}
        <Button
          onClick={calculatePrecatorio}
          disabled={!isFormValid}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          size="lg"
        >
          <Calculator className="w-5 h-5 mr-2" />
          Calcular Precatório
        </Button>
      </CardContent>
    </Card>
  )
}
