"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

import { Loader2, Printer, CheckCircle2, Percent, Save, Edit, User, Scale } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface AbaPropostaProps {
    precatorioId: string
    precatorio: any
    onUpdate: () => void
    userRole: string | null
}

export function AbaProposta({
    precatorioId,
    precatorio,
    onUpdate,
    userRole,
}: AbaPropostaProps) {
    const [loading, setLoading] = useState(false)
    const [savingProposta, setSavingProposta] = useState(false)

    // Estados separados para Credor e Advogado
    const [percentualCredor, setPercentualCredor] = useState<number | string>(
        precatorio.dados_calculo?.proposta_escolhida_percentual
            ? adjustPercent(precatorio.dados_calculo.proposta_escolhida_percentual)
            : ""
    )
    const [percentualAdvogado, setPercentualAdvogado] = useState<number | string>(
        precatorio.dados_calculo?.proposta_advogado_percentual
            ? adjustPercent(precatorio.dados_calculo.proposta_advogado_percentual)
            : ""
    )

    const [isEditing, setIsEditing] = useState(false)
    const [showPrintDialog, setShowPrintDialog] = useState(false)

    // Valores Base
    const saldoLiquidoCredor = precatorio.saldo_liquido || 0
    const honorariosValor = precatorio.honorarios_valor || 0

    // Cálculos em tempo real
    const valorPropostaCredor = saldoLiquidoCredor * (Number(percentualCredor) / 100)
    const valorPropostaAdvogado = honorariosValor * (Number(percentualAdvogado) / 100)

    const valorPropostaCredorFmt = formatCurrency(valorPropostaCredor)
    const valorPropostaAdvogadoFmt = formatCurrency(valorPropostaAdvogado)

    // Handlers de Negociação
    async function saveNegociacao() {
        const pCredor = Number(percentualCredor)
        const pAdvogado = Number(percentualAdvogado)

        // Validação do Teto Credor
        const tetoPercentual = adjustPercent(precatorio.proposta_maior_percentual || 0)

        if (pCredor > tetoPercentual + 0.01) {
            toast({
                title: "Valor Credor acima do permitido",
                description: `A proposta do credor não pode exceder o teto de ${tetoPercentual.toFixed(2)}%.`,
                variant: "destructive",
            })
            return
        }

        if (pCredor <= 0 && !percentualAdvogado) { // Permitir salvar só advogado se quiser? Melhor exigir pelo menos um valido
            // Se ambos vazios ou 0
            if (pAdvogado <= 0) {
                toast({
                    title: "Valores inválidos",
                    description: "Defina pelo menos uma proposta válida.",
                    variant: "destructive",
                })
                return
            }
        }

        setSavingProposta(true)
        try {
            const supabase = createBrowserClient()
            if (!supabase) return

            const { data: { user } } = await supabase.auth.getUser()

            // 1. Atualizar o precatório
            const novosDadosCalculo = {
                ...precatorio.dados_calculo,
                proposta_escolhida_percentual: pCredor > 0 ? pCredor : null, // Manteve nome original para compatibilidade
                proposta_advogado_percentual: pAdvogado > 0 ? pAdvogado : null
            }

            const { error: updateError } = await supabase
                .from("precatorios")
                .update({
                    dados_calculo: novosDadosCalculo,
                    status_kanban: "proposta_negociacao",
                    localizacao_kanban: "proposta_negociacao",
                    updated_at: new Date().toISOString()
                })
                .eq("id", precatorioId)

            if (updateError) throw updateError

            // 2. Registrar na timeline
            // Log Credor
            if (pCredor > 0) {
                await supabase.from("atividades").insert({
                    precatorio_id: precatorioId,
                    usuario_id: user?.id,
                    tipo: "negociacao" as any,
                    descricao: `Proposta (Credor) definida: ${pCredor}% (Valor: ${valorPropostaCredorFmt})`,
                    dados_novos: { percentual: pCredor, alvo: 'credor' }
                })
            }

            // Log Advogado
            if (pAdvogado > 0) {
                await supabase.from("atividades").insert({
                    precatorio_id: precatorioId,
                    usuario_id: user?.id,
                    tipo: "negociacao" as any,
                    descricao: `Proposta (Advogado) definida: ${pAdvogado}% (Valor: ${valorPropostaAdvogadoFmt})`,
                    dados_novos: { percentual: pAdvogado, alvo: 'advogado' }
                })
            }

            toast({
                title: "Negociação registrada",
                description: "As propostas foram salvas com sucesso.",
            })
            setIsEditing(false)
            setShowPrintDialog(true)
            onUpdate()
        } catch (error: any) {
            console.error("[Negociação] Erro:", error)
            toast({
                title: "Erro ao salvar negociação",
                description: error.message || "Ocorreu um erro inesperado.",
                variant: "destructive",
            })
        } finally {
            setSavingProposta(false)
        }
    }

    const canEditProposta = ["admin", "operador_comercial"].includes(userRole || "")
    const hasPropostaDefined = !!precatorio.dados_calculo?.proposta_escolhida_percentual || !!precatorio.dados_calculo?.proposta_advogado_percentual

    async function handlePrint(tipo: "credor" | "honorarios") {
        setLoading(true)
        try {
            const supabase = createBrowserClient()
            if (!supabase) return
            const { data: { user } } = await supabase.auth.getUser()

            const valorFmt = tipo === "credor" ? valorPropostaCredorFmt : valorPropostaAdvogadoFmt
            const percentual = tipo === "credor" ? percentualCredor : percentualAdvogado

            if (user) {
                await supabase.from("atividades").insert({
                    precatorio_id: precatorioId,
                    usuario_id: user.id,
                    tipo: "proposta" as any,
                    descricao: `Proposta (${tipo}) baixada/enviada: ${percentual}% (Valor: ${valorFmt})`,
                    dados_novos: {
                        percentual: percentual,
                        valor: tipo === "credor" ? valorPropostaCredor : valorPropostaAdvogado,
                        tipo_documento: tipo
                    }
                })
                onUpdate()
            }

            const { antigravityPrint } = await import("@/lib/antigravity/antigravity-print")

            // Preparar dados específicos para cada template
            // O template espera 'valores.proposta_credor' ou 'valores.proposta_advogado'
            // Vamos injetar os valores calculados aqui para garantir que o template use o que está na tela

            const printData = {
                ...precatorio,
                // Injeção direta para o template usar
                proposta_maior_valor: valorPropostaCredor, // A maioria dos campos no template usa esses fallbacks
                proposta_menor_valor: valorPropostaCredor,
                proposta_advogado_valor: valorPropostaAdvogado,
                // Mantemos histórico
                proposta_maior_percentual: Number(percentualCredor),
                honorarios_valor: honorariosValor // Base dos honorários
            }

            await antigravityPrint({
                tipo,
                data: printData,
                validacao: {
                    calculo_ok: true,
                    juridico_ok: true,
                    comercial_ok: true,
                    admin_ok: true,
                }
            })
        } catch (error: any) {
            console.error("Erro ao imprimir/registrar:", error)
            toast({
                title: "Erro na Impressão",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const showViewMode = hasPropostaDefined && !isEditing

    return (
        <div className="space-y-6">
            {/* Faixa de Informações - Teto apenas para Credor por enquanto (ou geral?) */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Base de Cálculo (Líquido Credor)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            {formatCurrency(saldoLiquidoCredor)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Teto Sugerido: {adjustPercent(precatorio.proposta_maior_percentual || 0).toFixed(2)}%
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Base de Cálculo (Honorários)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            {formatCurrency(honorariosValor)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Valor total contratual
                        </p>
                    </CardContent>
                </Card>
            </div >

            {/* View Mode: Proposta Definida */}
            {
                showViewMode ? (
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex flex-col space-y-1.5">
                                <CardTitle className="flex items-center gap-2 text-primary">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Propostas Definidas
                                </CardTitle>
                                <CardDescription>
                                    As propostas foram geradas e estão prontas para impressão.
                                </CardDescription>
                            </div>
                            {canEditProposta && (
                                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Credor */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg border mt-2">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Proposta Credor</p>
                                    <p className="text-2xl font-bold text-primary">{valorPropostaCredorFmt}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-muted-foreground">Percentual</p>
                                    <p className="text-lg font-bold">{percentualCredor}%</p>
                                </div>
                            </div>

                            {/* Advogado */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Proposta Honorários</p>
                                    <p className="text-2xl font-bold text-orange-600">{valorPropostaAdvogadoFmt}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-muted-foreground">Percentual</p>
                                    <p className="text-lg font-bold">{percentualAdvogado}%</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button
                                    size="lg"
                                    onClick={() => handlePrint("credor")}
                                    className="w-full bg-black hover:bg-black/90 text-white"
                                >
                                    <Printer className="mr-2 h-4 w-4" />
                                    Baixar Proposta do Credor (PDF)
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => handlePrint("honorarios")}
                                    className="w-full bg-white hover:bg-gray-100 text-black border-gray-200"
                                >
                                    <Printer className="mr-2 h-4 w-4" />
                                    Baixar Proposta de Honorários (PDF)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    /* Edit Mode: Definir Proposta */
                    <Card className="border shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Percent className="h-5 w-5" />
                                Definir Propostas
                            </CardTitle>
                            <CardDescription>
                                Defina as porcentagens para o Credor e/ou Advogado.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Input Credor */}
                            <div className="space-y-2 border-b pb-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">Proposta ao Credor</Label>
                                    <span className="text-xs text-muted-foreground">Base: {formatCurrency(saldoLiquidoCredor)}</span>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="grid gap-2 flex-1 relative">
                                        <Label htmlFor="percentualCredor" className="text-xs font-bold">Porcentagem (%)</Label>
                                        <div className="relative">
                                            <Input
                                                id="percentualCredor"
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={percentualCredor}
                                                onChange={(e: any) => setPercentualCredor(e.target.value)}
                                                className="bg-background pr-8"
                                                placeholder="Ex: 60.00"
                                                disabled={!canEditProposta}
                                            />
                                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="grid gap-2 flex-1">
                                        <Label className="text-xs font-bold">Valor Calculado</Label>
                                        <div className="h-10 flex items-center px-3 bg-muted border rounded-md font-bold text-primary">
                                            {valorPropostaCredorFmt}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Input Advogado */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">Proposta Honorários (Advogado)</Label>
                                    <span className="text-xs text-muted-foreground">Base: {formatCurrency(honorariosValor)}</span>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="grid gap-2 flex-1 relative">
                                        <Label htmlFor="percentualAdvogado" className="text-xs font-bold">Porcentagem (%)</Label>
                                        <div className="relative">
                                            <Input
                                                id="percentualAdvogado"
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={percentualAdvogado}
                                                onChange={(e: any) => setPercentualAdvogado(e.target.value)}
                                                className="bg-background pr-8"
                                                placeholder="Ex: 80.00"
                                                disabled={!canEditProposta}
                                            />
                                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="grid gap-2 flex-1">
                                        <Label className="text-xs font-bold">Valor Calculado</Label>
                                        <div className="h-10 flex items-center px-3 bg-muted border rounded-md font-bold text-orange-600">
                                            {valorPropostaAdvogadoFmt}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4">
                                {isEditing && (
                                    <Button variant="ghost" onClick={() => setIsEditing(false)}>
                                        Cancelar
                                    </Button>
                                )}
                                <Button
                                    onClick={saveNegociacao}
                                    disabled={savingProposta || !canEditProposta}
                                    className="w-full md:w-auto"
                                >
                                    {savingProposta ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Salvar Propostas
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Propostas Salvas</DialogTitle>
                        <DialogDescription>
                            As propostas foram registradas. Escolha qual documento deseja imprimir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <Button
                            onClick={() => {
                                handlePrint("credor")
                                setShowPrintDialog(false)
                            }}
                            className="h-24 flex flex-col gap-3 bg-black hover:bg-black/90"
                        >
                            <User className="h-8 w-8" />
                            <span className="font-semibold">Credor</span>
                        </Button>
                        <Button
                            onClick={() => {
                                handlePrint("honorarios")
                                setShowPrintDialog(false)
                            }}
                            variant="outline"
                            className="h-24 flex flex-col gap-3 border-2"
                        >
                            <Scale className="h-8 w-8" />
                            <span className="font-semibold">Advogado</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value || 0)
}

function adjustPercent(val: number) {
    // Se vier 0.65 -> 65. Se vier 65 -> 65
    return (val > 0 && val <= 1) ? val * 100 : val
}

