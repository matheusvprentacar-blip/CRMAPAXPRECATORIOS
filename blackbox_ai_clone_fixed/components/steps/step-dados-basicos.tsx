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
}

export function StepDadosBasicos({ dados, setDados, onCompletar, voltar }: StepDadosBasicosProps) {
  const handleChange = (field: string, value: any) => {
    setDados({ ...dados, [field]: value })
  }

  const handleAvancar = () => {
    const resultado = {
      ...dados,
      // Valores financeiros originais
      valor_principal_original: dados.valor_principal_original || 0,
      valor_juros_original: dados.valor_juros_original || 0,
      multa: dados.multa || 0,
    }
    onCompletar(resultado)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados Básicos do Precatório</CardTitle>
        <CardDescription>Preencha as informações cadastrais e valores do precatório</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Autor / Credor Originário</Label>
            <Input
              value={dados.autor_credor_originario || ""}
              onChange={(e) => handleChange("autor_credor_originario", e.target.value)}
              placeholder="Nome do credor"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Advogado da Ação</Label>
            <Input
              value={dados.advogado_acao || ""}
              onChange={(e) => handleChange("advogado_acao", e.target.value)}
              placeholder="Nome do advogado"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Número do Precatório</Label>
            <Input
              value={dados.numero_precatorio || ""}
              onChange={(e) => handleChange("numero_precatorio", e.target.value)}
              placeholder="0000000-00.0000.0.00.0000"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Número do Ofício Requisitório</Label>
            <Input
              value={dados.numero_oficio_requisitorio || ""}
              onChange={(e) => handleChange("numero_oficio_requisitorio", e.target.value)}
              placeholder="00000000/0000"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Autos de Execução</Label>
            <Input
              value={dados.autos_execucao || ""}
              onChange={(e) => handleChange("autos_execucao", e.target.value)}
              placeholder="Número do processo"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Data de Expedição</Label>
            <Input
              type="date"
              value={dados.data_expedicao || ""}
              onChange={(e) => handleChange("data_expedicao", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Vara de Origem</Label>
            <Input
              value={dados.vara_origem || ""}
              onChange={(e) => handleChange("vara_origem", e.target.value)}
              placeholder="Ex: 1ª Vara Federal"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Natureza do Ativo</Label>
            <Input
              value={dados.natureza_ativo || ""}
              onChange={(e) => handleChange("natureza_ativo", e.target.value)}
              placeholder="Ex: Alimentar, Comum"
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-3">Valores Financeiros</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Valor Principal</Label>
              <CurrencyInput
                value={dados.valor_principal_original || 0}
                onChange={(value) => handleChange("valor_principal_original", value)}
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
              <Label className="text-xs">Multa</Label>
              <CurrencyInput value={dados.multa || 0} onChange={(value) => handleChange("multa", value)} />
            </div>
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
