"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyInput } from "@/components/ui/currency-input"
import { KpiCard } from "@/components/ui/calc/KpiCard"
import { SectionPanel } from "@/components/ui/calc/SectionPanel"
import { Banknote, CalendarDays, Percent } from "lucide-react"
import { StepFooter } from "@/components/ui/calc/StepFooter"

interface StepDadosBasicosProps {
  dados: any
  setDados: (dados: any) => void
  onCompletar: (resultado: any) => void
  voltar: () => void
  precatorioId?: string
}

export function StepDadosBasicos({ dados, setDados, onCompletar, voltar }: StepDadosBasicosProps) {
  const principal = Number(dados.valor_principal_original || 0)
  const juros = Number(dados.valor_juros_original || 0)
  const multa = Number(dados.multa || 0)

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  const formatarMoedaOpcional = (valor: any) => {
    if (valor === null || valor === undefined || valor === "") return "—"
    const parsed = Number(valor)
    if (!Number.isFinite(parsed)) return "—"
    return formatarMoeda(parsed)
  }

  const formatarPercentual = (valor: any) => {
    if (valor === null || valor === undefined || valor === "") return "—"
    const parsed = Number(valor)
    if (!Number.isFinite(parsed)) return "—"
    return parsed.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%"
  }

  const formatarSimNao = (valor: any) => {
    if (valor === true) return "Sim"
    if (valor === false) return "Não"
    return "Não informado"
  }

  const formatarHerdeiros = (valor: any) => {
    if (typeof valor === "string" && valor.trim()) return valor
    return formatarSimNao(valor)
  }

  const hasAnaliseInfo = [
    dados.analise_penhora_valor,
    dados.analise_penhora_percentual,
    dados.analise_cessao_valor,
    dados.analise_cessao_percentual,
    dados.analise_adiantamento_valor,
    dados.analise_adiantamento_percentual,
    dados.analise_honorarios_valor,
    dados.analise_honorarios_percentual,
    dados.analise_itcmd,
    dados.analise_itcmd_valor,
    dados.analise_itcmd_percentual,
    dados.analise_herdeiros,
    dados.analise_observacoes,
  ].some((valor) => valor !== null && valor !== undefined && valor !== "")

  const handleChange = (field: string, value: any) => {
    setDados({ ...dados, [field]: value })
  }

  const handleAvancar = () => {
    const principalValor = Number(dados.valor_principal_original || 0)
    const jurosValor = Number(dados.valor_juros_original || 0)
    const multaValor = Number(dados.multa || 0)
    // Regra solicitada: somar principal + juros + multa/selic como base para o cálculo
    const principalSomado = principalValor + jurosValor + multaValor

    const resultado = {
      ...dados,
      // Valores financeiros ajustados
      valor_principal_original: principalSomado,
      valor_juros_original: 0, // já incorporado ao principal
      multa: 0, // já incorporada ao principal
      principal_informado: principalValor,
      juros_informados: jurosValor,
      multa_informada: multaValor,
    }
    onCompletar(resultado)
  }

  return (
    <Card className="calc-card relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader className="space-y-2">
        <CardTitle className="calc-title">Dados Básicos do Precatório</CardTitle>
        <CardDescription className="calc-subtitle">
          Informe apenas os valores financeiros essenciais para iniciar o cálculo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              label="Valor Principal"
              value={formatarMoeda(principal)}
              helper="Base informada"
              tone="primary"
              icon={<Banknote className="h-4 w-4" />}
            />
            <KpiCard
              label="Juros + Multa"
              value={formatarMoeda(juros + multa)}
              helper="Itens incorporados"
              tone="warning"
              icon={<Percent className="h-4 w-4" />}
            />
            <KpiCard
              label="Data Base"
              value={dados.data_base ? new Date(dados.data_base + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
              helper="Início do período"
              tone="info"
              icon={<CalendarDays className="h-4 w-4" />}
            />
          </div>

          <SectionPanel
            title="Informações financeiras"
            description="Preencha os valores conforme o ofício do precatório."
            tone="primary"
          >
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 space-y-2 md:col-span-6">
                <Label className="text-sm text-muted-foreground">Valor Principal</Label>
                <CurrencyInput
                  value={dados.valor_principal_original || 0}
                  onChange={(value) => handleChange("valor_principal_original", value)}
                />
              </div>
              <div className="col-span-12 space-y-2 md:col-span-6">
                <Label className="text-sm text-muted-foreground">Data Base</Label>
                <Input
                  type="date"
                  value={dados.data_base || ""}
                  onChange={(e) => handleChange("data_base", e.target.value)}
                />
              </div>
              <div className="col-span-12 space-y-2 md:col-span-6">
                <Label className="text-sm text-muted-foreground">Juros</Label>
                <CurrencyInput
                  value={dados.valor_juros_original || 0}
                  onChange={(value) => handleChange("valor_juros_original", value)}
                />
              </div>
              <div className="col-span-12 space-y-2 md:col-span-6">
                <Label className="text-sm text-muted-foreground">Multa / Selic</Label>
                <CurrencyInput
                  value={dados.multa || 0}
                  onChange={(value) => handleChange("multa", value)}
                />
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Observações da análise processual"
            description="Dados registrados na análise para apoiar o cálculo."
            tone="warning"
          >
            {hasAnaliseInfo ? (
              <div className="space-y-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Penhora (R$)</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatarMoedaOpcional(dados.analise_penhora_valor)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Penhora (%)</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatarPercentual(dados.analise_penhora_percentual)}
                    </p>
                  </div>
                  {dados.analise_cessao === true && (
                    <>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Cessão (R$)</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatarMoedaOpcional(dados.analise_cessao_valor)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Cessão (%)</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatarPercentual(dados.analise_cessao_percentual)}
                        </p>
                      </div>
                    </>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Adiantamento recebido (R$)</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatarMoedaOpcional(dados.analise_adiantamento_valor)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Adiantamento recebido (%)</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatarPercentual(dados.analise_adiantamento_percentual)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Honorários contratuais (R$)</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatarMoedaOpcional(dados.analise_honorarios_valor)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Honorários contratuais (%)</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatarPercentual(dados.analise_honorarios_percentual)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Herdeiros habilitados</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatarHerdeiros(dados.analise_herdeiros)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ITCMD</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatarSimNao(dados.analise_itcmd)}
                    </p>
                  </div>
                  {dados.analise_itcmd === true && (
                    <>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">ITCMD (R$)</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatarMoedaOpcional(dados.analise_itcmd_valor)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">ITCMD (%)</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatarPercentual(dados.analise_itcmd_percentual)}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {dados.analise_observacoes && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm text-foreground whitespace-pre-line">
                      {dados.analise_observacoes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhuma observação registrada na análise processual.
              </p>
            )}
          </SectionPanel>
        </div>

        <StepFooter onBack={voltar} onNext={handleAvancar} />
      </CardContent>
    </Card>
  )
}
