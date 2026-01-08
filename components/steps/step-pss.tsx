"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"

interface StepPSSProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  resultadosEtapas: any[]
}

export function StepPSS({ dados, setDados, onCompletar, voltar, resultadosEtapas }: StepPSSProps) {
  const [pssOficio, setPssOficio] = useState<number>(dados.pss_oficio_valor || 0)
  const [pssAtualizado, setPssAtualizado] = useState<number>(0)
  const [jurosMoraPercentual, setJurosMoraPercentual] = useState<number>(0)
  const [isento, setIsento] = useState<boolean>(dados.isento_pss || false)

  useEffect(() => {
    const atualizacao = resultadosEtapas[1]

    console.log("[v0] PSS - Resultado Atualização Monetária:", atualizacao)

    let jurosPercentual = 0

    if (atualizacao?.taxa_juros_moratorios) {
      jurosPercentual = atualizacao.taxa_juros_moratorios
      console.log("[v0] PSS - Juros mora da etapa anterior:", jurosPercentual)
    } else if (atualizacao?.juros_mora && dados.valor_principal_original) {
      jurosPercentual = (atualizacao.juros_mora / dados.valor_principal_original) * 100
      console.log("[v0] PSS - Juros calculados por valor:", jurosPercentual)
    } else {
      jurosPercentual = 0
      console.log("[v0] PSS - Nenhum juros encontrado, usando 0")
    }

    if (jurosPercentual > 1) {
      jurosPercentual = jurosPercentual / 100
    }

    setJurosMoraPercentual(jurosPercentual)

    const pssCalculado = isento ? 0 : pssOficio * (1 + jurosPercentual)
    setPssAtualizado(pssCalculado)

    console.log("[v0] PSS - PSS Ofício:", pssOficio)
    console.log("[v0] PSS - Isento:", isento)
    console.log("[v0] PSS - Juros Mora (decimal):", jurosPercentual)
    console.log("[v0] PSS - Multiplicador:", 1 + jurosPercentual)
    console.log("[v0] PSS - PSS Atualizado:", pssCalculado)
  }, [pssOficio, resultadosEtapas, isento])

  const handleChange = (value: number) => {
    setPssOficio(value)
    setDados({ ...dados, pss_oficio_valor: value })
  }

  const handleIsentoChange = (checked: boolean) => {
    setIsento(checked)
    setDados({ ...dados, isento_pss: checked })
    if (checked) {
      setPssOficio(0)
      setPssAtualizado(0)
    }
  }

  const handleAvancar = () => {
    const dadosAtualizados = {
      ...dados,
      pss_oficio_valor: isento ? 0 : pssOficio,
      isento_pss: isento,
      dados_calculo: {
        ...(dados.dados_calculo || {}),
        juros_mora_percentual: jurosMoraPercentual,
      },
    }
    setDados(dadosAtualizados)

    onCompletar({
      pss_oficio_valor: isento ? 0 : pssOficio,
      pss_valor: isento ? 0 : pssAtualizado,
      pssTotal: isento ? 0 : pssAtualizado, // Alias
      pss_atualizado: isento ? 0 : pssAtualizado, // Alias
      juros_mora_percentual: jurosMoraPercentual,
      tem_desconto_pss: !isento,
      isento_pss: isento,
    })
  }

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const formatarPercentual = (valor: number) => {
    return (valor * 100).toFixed(4) + "%"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PSS - Previdência Social</CardTitle>
        <CardDescription>
          Informe o PSS do Ofício. O sistema calculará automaticamente o PSS atualizado com juros.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="isento-pss" checked={isento} onCheckedChange={handleIsentoChange} />
          <Label
            htmlFor="isento-pss"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Isento de PSS
          </Label>
        </div>

        {!isento && (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">PSS do Ofício (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={pssOficio}
                onChange={(e) => handleChange(Number.parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">Valor do PSS informado no ofício requisitório.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Juros de Mora Calculados</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">{formatarPercentual(jurosMoraPercentual)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Calculado automaticamente pela etapa de atualização monetária.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">PSS Atualizado (com juros)</Label>
              <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                <p className="text-lg font-bold text-primary">{formatarMoeda(pssAtualizado)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Cálculo: PSS Ofício × (1 + Juros de Mora) = {formatarMoeda(pssOficio)} ×{" "}
                {(1 + jurosMoraPercentual).toFixed(4)} = {formatarMoeda(pssAtualizado)}
              </p>
            </div>
          </>
        )}

        {isento && (
          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              Este precatório está isento de desconto de PSS. Nenhum valor será descontado.
            </p>
          </div>
        )}

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
