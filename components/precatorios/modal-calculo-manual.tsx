"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { getSupabase } from "@/lib/supabase/client"
import { Precatorio } from "@/lib/types/database"
import { Loader2, Calculator, Upload } from "lucide-react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { toast } from "@/components/ui/use-toast"

interface ModalCalculoManualProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    precatorio: Precatorio
    onSuccess: () => void
}

export function ModalCalculoManual({ open, onOpenChange, precatorio, onSuccess }: ModalCalculoManualProps) {
    const [loading, setLoading] = useState(false)

    // State for manual values (Numeric)
    const [valorAtualizado, setValorAtualizado] = useState<number>(0)

    const [irpf, setIrpf] = useState<number>(0)
    const [irpfIsento, setIrpfIsento] = useState(false)

    const [pssIsento, setPssIsento] = useState(false)
    const [pssValor, setPssValor] = useState<number>(0)

    const [honorariosPerc, setHonorariosPerc] = useState<string>("0")
    const [honorariosValor, setHonorariosValor] = useState<number>(0)

    const [adiantamentoPerc, setAdiantamentoPerc] = useState<string>("0")
    const [adiantamentoValor, setAdiantamentoValor] = useState<number>(0)

    const [baseLiquida, setBaseLiquida] = useState<number>(0)
    const [menorProposta, setMenorProposta] = useState<number>(0)
    const [maiorProposta, setMaiorProposta] = useState<number>(0)

    const [menorPropostaPerc, setMenorPropostaPerc] = useState("58")
    const [maiorPropostaPerc, setMaiorPropostaPerc] = useState("59")

    const [observacao, setObservacao] = useState("")

    // Auto-calculate Honorários
    useEffect(() => {
        const perc = parseFloat(honorariosPerc) || 0
        if (valorAtualizado > 0 && perc >= 0) {
            const valor = valorAtualizado * (perc / 100)
            setHonorariosValor(valor)
        } else if (valorAtualizado === 0) {
            setHonorariosValor(0)
        }
    }, [valorAtualizado, honorariosPerc])

    // Auto-calculate Adiantamento
    useEffect(() => {
        const perc = parseFloat(adiantamentoPerc) || 0
        if (valorAtualizado > 0 && perc >= 0) {
            const valor = valorAtualizado * (perc / 100)
            setAdiantamentoValor(valor)
        } else if (valorAtualizado === 0) {
            setAdiantamentoValor(0)
        }
    }, [valorAtualizado, adiantamentoPerc])

    // Auto-calculate Base Líquida (Result)
    useEffect(() => {
        const vPss = pssIsento ? 0 : pssValor
        const vIrpf = irpfIsento ? 0 : irpf

        // Liquido = Atualizado - IRPF - PSS - Honorarios - Adiantamento
        const liquido = Math.max(0, valorAtualizado - vIrpf - vPss - honorariosValor - adiantamentoValor)

        setBaseLiquida(liquido)
    }, [valorAtualizado, irpf, irpfIsento, pssIsento, pssValor, honorariosValor, adiantamentoValor])

    // Auto-calculate Proposals
    useEffect(() => {
        const percMenor = parseFloat(menorPropostaPerc) || 0
        const vMenor = baseLiquida * (percMenor / 100)
        setMenorProposta(vMenor)

        const percMaior = parseFloat(maiorPropostaPerc) || 0
        const vMaior = baseLiquida * (percMaior / 100)
        setMaiorProposta(vMaior)
    }, [baseLiquida, menorPropostaPerc, maiorPropostaPerc])

    async function handleSave() {
        setLoading(true)
        try {
            const supabase = getSupabase()
            if (!supabase) return

            // Prepare final values considering exemptions
            const finalPss = pssIsento ? 0 : pssValor
            const finalIrpf = irpfIsento ? 0 : irpf

            const { error } = await supabase
                .from("precatorios")
                .update({
                    valor_atualizado: valorAtualizado,

                    irpf_valor: finalIrpf,
                    irpf_isento: irpfIsento,

                    pss_valor: finalPss,
                    // pss_isento column might need to be added or managed via pss_valor=0, but we assume pss_valor handles it.
                    // If strict tracking needed, we would need a column. I'll rely on saving 0.

                    honorarios_percentual: parseFloat(honorariosPerc),
                    honorarios_valor: honorariosValor,
                    adiantamento_percentual: parseFloat(adiantamentoPerc),
                    adiantamento_valor: adiantamentoValor,

                    saldo_liquido: baseLiquida,

                    proposta_menor_valor: menorProposta,
                    proposta_maior_valor: maiorProposta,
                    proposta_menor_percentual: parseFloat(menorPropostaPerc),
                    proposta_maior_percentual: parseFloat(maiorPropostaPerc),

                    status: "calculado",
                    calculo_externo: true,
                    data_calculo: new Date().toISOString(),
                    dados_calculo: {
                        manual: true,
                        base_liquida_final: baseLiquida,
                        observacao: observacao || "Inserido manualmente via Admin",
                        resultadosEtapas: [
                            // 0: Dados Básicos
                            {
                                valor_principal_original: precatorio.valor_principal || 0,
                                data_base: new Date().toISOString(), // Or a date picker if added
                                data_expedicao: precatorio.data_expedicao
                            },
                            // 1: Atualização
                            {
                                valorAtualizado: valorAtualizado,
                                juros_mora: 0,
                                taxa_juros_moratorios: 0
                            },
                            // 2: PSS
                            {
                                pss_valor: finalPss,
                                pss_oficio_valor: 0
                            },
                            // 3: IRPF
                            {
                                valor_irpf: finalIrpf,
                                aliquota_efetiva: "Manual"
                            },
                            // 4: Honorários
                            {
                                honorarios: {
                                    honorarios_percentual: parseFloat(honorariosPerc) || 0,
                                    honorarios_valor: honorariosValor
                                }
                            },
                            // 5: Propostas (Base Líquida)
                            {
                                base_liquida_final: baseLiquida,
                                percentual_menor: parseFloat(menorPropostaPerc),
                                menor_proposta: menorProposta,
                                percentual_maior: parseFloat(maiorPropostaPerc),
                                maior_proposta: maiorProposta
                            }
                        ]
                    }
                })
                .eq("id", precatorio.id)

            if (error) throw error

            toast({
                title: "Cálculo Salvo!",
                description: "Os valores manuais foram registrados com sucesso.",
            })
            onSuccess()
            onOpenChange(false)

        } catch (error) {
            console.error("Erro ao salvar:", error)
            toast({
                title: "Erro ao salvar",
                description: "Verifique os dados e tente novamente.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-orange-500" />
                        Inserção Manual de Valores
                    </DialogTitle>
                    <DialogDescription>
                        Insira os resultados do cálculo externo. O sistema não recalculará nada, apenas salvará estes números.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Seção 1: Valores Base */}
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Valores Base</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Valor Atualizado (Bruto)</Label>
                                <CurrencyInput
                                    value={valorAtualizado}
                                    onValueChange={(val) => setValorAtualizado(val || 0)}
                                    placeholder="R$ 0,00"
                                    className="font-bold text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Base Pré-Descontos</Label>
                                <CurrencyInput
                                    value={valorAtualizado}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Descontos */}
                    <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Descontos</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>IRPF (Valor)</Label>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="irpf-isento" checked={irpfIsento} onCheckedChange={(c) => setIrpfIsento(c as boolean)} />
                                        <label htmlFor="irpf-isento" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Isento
                                        </label>
                                    </div>
                                </div>
                                <CurrencyInput
                                    value={irpfIsento ? 0 : irpf}
                                    disabled={irpfIsento}
                                    onValueChange={(val) => setIrpf(val || 0)}
                                    placeholder="R$ 0,00"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>PSS (Valor)</Label>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="pss-isento" checked={pssIsento} onCheckedChange={(c) => setPssIsento(c as boolean)} />
                                        <label htmlFor="pss-isento" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Isento
                                        </label>
                                    </div>
                                </div>
                                <CurrencyInput
                                    value={pssIsento ? 0 : pssValor}
                                    disabled={pssIsento}
                                    onValueChange={(val) => setPssValor(val || 0)}
                                    placeholder="R$ 0,00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Honorários (% e Valor)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        className="w-20"
                                        value={honorariosPerc}
                                        onChange={e => setHonorariosPerc(e.target.value)}
                                        placeholder="%"
                                    />
                                    <CurrencyInput
                                        value={honorariosValor}
                                        onValueChange={(val) => setHonorariosValor(val || 0)}
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Adiantamento (% e Valor)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        className="w-20"
                                        value={adiantamentoPerc}
                                        onChange={e => setAdiantamentoPerc(e.target.value)}
                                        placeholder="%"
                                    />
                                    <CurrencyInput
                                        value={adiantamentoValor}
                                        onValueChange={(val) => setAdiantamentoValor(val || 0)}
                                        placeholder="R$ 0,00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção Observação */}
                    <div className="space-y-2">
                        <Label>Observações / Descrição dos Descontos</Label>
                        <Textarea
                            placeholder="Descreva detalhes sobre os descontos ou observações gerais..."
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            className="bg-muted/20 resize-none h-24"
                        />
                    </div>

                    {/* Seção 3: Resultado Final */}
                    <div className="space-y-4 border p-4 rounded-lg bg-orange-50 border-orange-100">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-orange-700">Resultado Final</h3>

                        <div className="space-y-2">
                            <Label className="text-orange-900">Base Líquida Final (Para Propostas)</Label>
                            <CurrencyInput
                                className="font-bold text-lg border-orange-200 text-orange-900"
                                value={baseLiquida}
                                onValueChange={(val) => setBaseLiquida(val || 0)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-emerald-700">Menor Proposta</Label>
                                    <div className="flex items-center gap-1">
                                        <Input
                                            className="w-16 h-7 text-sm text-right px-2 py-1"
                                            value={menorPropostaPerc}
                                            onChange={(e) => setMenorPropostaPerc(e.target.value)}
                                        />
                                        <span className="text-sm text-emerald-700 font-bold">%</span>
                                    </div>
                                </div>
                                <CurrencyInput
                                    className="font-bold text-emerald-700"
                                    value={menorProposta}
                                    onValueChange={(val) => setMenorProposta(val || 0)}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-amber-700">Maior Proposta</Label>
                                    <div className="flex items-center gap-1">
                                        <Input
                                            className="w-16 h-7 text-sm text-right px-2 py-1"
                                            value={maiorPropostaPerc}
                                            onChange={(e) => setMaiorPropostaPerc(e.target.value)}
                                        />
                                        <span className="text-sm text-amber-700 font-bold">%</span>
                                    </div>
                                </div>
                                <CurrencyInput
                                    className="font-bold text-amber-700"
                                    value={maiorProposta}
                                    onValueChange={(val) => setMaiorProposta(val || 0)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Upload Opcional */}
                    <div className="space-y-2 border-t pt-4">
                        <Label>Memória de Cálculo (PDF/Excel) - Opcional</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
                            <Upload className="h-8 w-8 mb-2" />
                            <span className="text-sm">Clique para anexar arquivo</span>
                        </div>
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Salvar Cálculo Manual
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
