"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { Loader2, DollarSign, CheckCircle2 } from "@/components/icons"

type PrecatorioFechamento = {
    fechamento_status?: string | null
    data_aceite_proposta?: string | null
    proposta_aceita?: boolean | null
    saldo_liquido?: number | string | null
    proposta_menor_valor?: number | string | null
    proposta_maior_valor?: number | string | null
    fechamento_valor_compra?: number | string | null
    fechamento_comissao_operador?: number | string | null
    fechamento_comissao_apax?: number | string | null
    fechamento_escritura?: number | string | null
    fechamento_procuracao?: number | string | null
    fechamento_funrejus?: number | string | null
    fechamento_certidoes?: number | string | null
    fechamento_certidao_central?: number | string | null
    fechamento_autenticacao?: number | string | null
    fechamento_data?: string | null
    dados_calculo?: {
        proposta_escolhida_percentual?: number | string | null
    } | null
}

interface AbaFechamentoProps {
    precatorioId: string
    precatorio: PrecatorioFechamento
    onUpdate: () => void
    userRole: string[]
}

export function AbaFechamento({ precatorioId, precatorio, onUpdate, userRole }: AbaFechamentoProps) {
    const [savingAction, setSavingAction] = useState<"draft" | "finalize" | "clear" | null>(null)

    // States para os valores (number | undefined)
    const [valorCompra, setValorCompra] = useState<number | undefined>(undefined)
    const [comissaoOperador, setComissaoOperador] = useState<number | undefined>(undefined)
    const [comissaoApax, setComissaoApax] = useState<number | undefined>(undefined)

    // Despesas Extras
    const [escritura, setEscritura] = useState<number | undefined>(undefined)
    const [procuracao, setProcuracao] = useState<number | undefined>(undefined)
    const [funrejus, setFunrejus] = useState<number | undefined>(undefined)
    const [certidoes, setCertidoes] = useState<number | undefined>(undefined)
    const [certidaoCentral, setCertidaoCentral] = useState<number | undefined>(undefined)
    const [autenticacao, setAutenticacao] = useState<number | undefined>(undefined)

    const [dataFechamento, setDataFechamento] = useState("")

    // Permissões: Admin e Financeiro
    const canEdit = userRole.some(r => ['admin', 'financeiro'].includes(r))
    const isFinalizado = precatorio.fechamento_status === 'finalizado'
    const valorAceiteSugerido = resolveSuggestedPurchaseValue(precatorio)
    const dataAceiteLabel = precatorio?.data_aceite_proposta
        ? new Date(`${String(precatorio.data_aceite_proposta).slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR")
        : null
    const percentualAceiteSugerido = normalizePercent(precatorio?.dados_calculo?.proposta_escolhida_percentual)

    useEffect(() => {
        // Inicializar campos
        if (precatorio) {
            // Se tiver valor salvo no fechamento, usa. Senão, tenta pegar da proposta aceita como sugestão
            const valorInicial = precatorio.fechamento_valor_compra
                ? Number(precatorio.fechamento_valor_compra)
                : resolveSuggestedPurchaseValue(precatorio)

            setValorCompra(valorInicial)
            setComissaoOperador(precatorio.fechamento_comissao_operador ? Number(precatorio.fechamento_comissao_operador) : undefined)
            setComissaoApax(precatorio.fechamento_comissao_apax ? Number(precatorio.fechamento_comissao_apax) : undefined)

            setEscritura(precatorio.fechamento_escritura ? Number(precatorio.fechamento_escritura) : undefined)
            setProcuracao(precatorio.fechamento_procuracao ? Number(precatorio.fechamento_procuracao) : undefined)
            setFunrejus(precatorio.fechamento_funrejus ? Number(precatorio.fechamento_funrejus) : undefined)
            setCertidoes(precatorio.fechamento_certidoes ? Number(precatorio.fechamento_certidoes) : undefined)
            setCertidaoCentral(precatorio.fechamento_certidao_central ? Number(precatorio.fechamento_certidao_central) : undefined)
            setAutenticacao(precatorio.fechamento_autenticacao ? Number(precatorio.fechamento_autenticacao) : undefined)

            if (precatorio.fechamento_data) {
                setDataFechamento(precatorio.fechamento_data.split('T')[0])
            } else {
                // Data sugestão: Hoje
                setDataFechamento(new Date().toISOString().split('T')[0])
            }
        }
    }, [precatorio])

    const buildPayload = () => ({
        p_precatorio_id: precatorioId,
        p_valor_compra: valorCompra || 0,
        p_comissao_operador: comissaoOperador || 0,
        p_comissao_apax: comissaoApax || 0,
        p_escritura: escritura || 0,
        p_procuracao: procuracao || 0,
        p_funrejus: funrejus || 0,
        p_certidoes: certidoes || 0,
        p_certidao_central: certidaoCentral || 0,
        p_autenticacao: autenticacao || 0,
        p_data_pagamento: dataFechamento || null,
    })

    const handleSalvarRascunho = async () => {
        setSavingAction("draft")
        try {
            const supabase = createBrowserClient()
            if (!supabase) return

            const { error } = await supabase.rpc("salvar_fechamento_precatorio", buildPayload())

            if (error) throw error

            toast({
                title: "Rascunho salvo",
                description: "Os valores ficaram salvos e podem ser editados a qualquer momento.",
            })
            onUpdate()
        } catch (error: unknown) {
            console.error("Erro ao salvar rascunho:", error)
            toast({
                title: "Erro",
                description: getErrorMessage(error, "Erro ao salvar rascunho do fechamento."),
                variant: "destructive",
            })
        } finally {
            setSavingAction(null)
        }
    }

    const handleFinalizar = async () => {
        if (!valorCompra || !dataFechamento) {
            toast({
                title: "Campos obrigatórios",
                description: "Informe o Valor de Compra e a Data.",
                variant: "destructive"
            })
            return
        }

        if (!confirm("Confirmar atualização dos lançamentos automáticos do financeiro? Você poderá editar ou apagar depois.")) {
            return
        }

        setSavingAction("finalize")
        try {
            const supabase = createBrowserClient()
            if (!supabase) return

            const { error } = await supabase.rpc("finalizar_fechamento_precatorio", {
                ...buildPayload(),
                p_valor_compra: valorCompra,
                p_data_pagamento: dataFechamento,
            })

            if (error) throw error

            toast({
                title: "Fechamento atualizado",
                description: "Dados salvos e lançamentos automáticos do financeiro atualizados.",
            })
            onUpdate()

        } catch (error: unknown) {
            console.error("Erro ao finalizar fechamento:", error)
            toast({
                title: "Erro",
                description: getErrorMessage(error, "Erro ao processar fechamento."),
                variant: "destructive"
            })
        } finally {
            setSavingAction(null)
        }
    }

    const handleLimparFechamento = async () => {
        if (!confirm("Deseja apagar todos os valores do fechamento e remover os lançamentos automáticos vinculados?")) {
            return
        }

        setSavingAction("clear")
        try {
            const supabase = createBrowserClient()
            if (!supabase) return

            const { error } = await supabase.rpc("limpar_fechamento_precatorio", {
                p_precatorio_id: precatorioId,
                p_apagar_lancamentos: true,
            })

            if (error) throw error

            setValorCompra(resolveSuggestedPurchaseValue(precatorio))
            setComissaoOperador(undefined)
            setComissaoApax(undefined)
            setEscritura(undefined)
            setProcuracao(undefined)
            setFunrejus(undefined)
            setCertidoes(undefined)
            setCertidaoCentral(undefined)
            setAutenticacao(undefined)
            setDataFechamento(new Date().toISOString().split("T")[0])

            toast({
                title: "Fechamento apagado",
                description: "Todos os valores do fechamento foram removidos.",
            })
            onUpdate()
        } catch (error: unknown) {
            console.error("Erro ao limpar fechamento:", error)
            toast({
                title: "Erro",
                description: getErrorMessage(error, "Erro ao limpar fechamento."),
                variant: "destructive",
            })
        } finally {
            setSavingAction(null)
        }
    }

    // Se não tiver permissão, nem vê (ou vê readonly?) - User pediu para Admin ou Financeiro ver/editar
    // Vou deixar readonly para quem não pode editar, mas visível para juridico talvez?
    // O user disse: "admin ou financeiro vão poder editar"

    const isReadOnly = !canEdit
    const saving = savingAction !== null

    return (
        <div className="space-y-6">
            <Card className={isFinalizado ? "border-green-200 bg-green-50/20" : ""}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Fechamento Financeiro
                        {isFinalizado && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                    </CardTitle>
                    <CardDescription>
                        Salve o rascunho para editar quando quiser e atualize o financeiro quando estiver pronto.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isFinalizado && (
                        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
                            Fechamento finalizado. Os valores continuam editáveis e podem ser apagados de uma vez.
                        </div>
                    )}

                    {precatorio?.proposta_aceita && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900">
                            <p className="font-semibold">Aceite da proposta confirmado</p>
                            <p className="mt-1">
                                {dataAceiteLabel ? `Data do aceite: ${dataAceiteLabel}. ` : ""}
                                {valorAceiteSugerido
                                    ? `Sugestão para valor de compra: ${formatCurrency(valorAceiteSugerido)}${percentualAceiteSugerido !== null ? ` (${percentualAceiteSugerido.toFixed(2)}%)` : ""}.`
                                    : "Sem valor sugerido calculado; informe manualmente no financeiro."}
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Valor de Compra */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Valor de Compra (Pago ao Credor)</label>
                            <CurrencyInput
                                value={valorCompra}
                                onValueChange={setValorCompra}
                                disabled={isReadOnly}
                                className="font-semibold"
                                placeholder="R$ 0,00"
                            />
                            <p className="text-xs text-muted-foreground">
                                Será lançado como <strong>Despesa Operacional</strong>.
                            </p>
                        </div>

                        {/* Data do Pagamento */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Data do Fechamento/Pagamento</label>
                            <Input
                                type="date"
                                value={dataFechamento}
                                onChange={(e) => setDataFechamento(e.target.value)}
                                disabled={isReadOnly}
                            />
                        </div>

                        {/* Comissão Operador */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Comissão do Operador</label>
                            <CurrencyInput
                                value={comissaoOperador}
                                onValueChange={setComissaoOperador}
                                disabled={isReadOnly}
                                placeholder="R$ 0,00"
                            />
                            <p className="text-xs text-muted-foreground">
                                Será lançado como <strong>Despesa de Pessoal</strong> (Status: Pendente).
                            </p>
                        </div>

                        {/* Comissão Apax */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Comissão Apax (Receita)</label>
                            <CurrencyInput
                                value={comissaoApax}
                                onValueChange={setComissaoApax}
                                disabled={isReadOnly}
                                placeholder="R$ 0,00"
                            />
                            <p className="text-xs text-muted-foreground">
                                Será lançado como <strong>Receita</strong> (Status: Pago).
                            </p>
                        </div>

                    </div>

                    <div className="col-span-full border-t pt-4 mt-2">
                        <h4 className="text-sm font-semibold mb-4 text-muted-foreground uppercase flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Despesas do Processo (Custas)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <ExpenseInput label="Escritura Pública" value={escritura} onChange={setEscritura} disabled={isReadOnly} />
                            <ExpenseInput label="Procuração" value={procuracao} onChange={setProcuracao} disabled={isReadOnly} />
                            <ExpenseInput label="Funrejus" value={funrejus} onChange={setFunrejus} disabled={isReadOnly} />
                            <ExpenseInput label="Certidões Simples" value={certidoes} onChange={setCertidoes} disabled={isReadOnly} />
                            <ExpenseInput label="Certidão Central de Precatórios" value={certidaoCentral} onChange={setCertidaoCentral} disabled={isReadOnly} />
                            <ExpenseInput label="Autenticação" value={autenticacao} onChange={setAutenticacao} disabled={isReadOnly} />
                        </div>
                    </div>


                    {/* Footer Actions */}
                    <div className="pt-4 flex flex-wrap justify-end gap-2">
                        {canEdit && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleSalvarRascunho}
                                    disabled={saving}
                                >
                                    {savingAction === "draft" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Rascunho
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleLimparFechamento}
                                    disabled={saving}
                                    className="text-red-600 border-red-200 hover:text-red-700 hover:border-red-300"
                                >
                                    {savingAction === "clear" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Apagar Tudo
                                </Button>

                                <Button
                                    onClick={handleFinalizar}
                                    disabled={saving}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {savingAction === "finalize" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isFinalizado ? "Atualizar Financeiro" : "Finalizar e Gerar Financeiro"}
                                </Button>
                            </>
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    )
}

function normalizePercent(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null
    const numeric = Number(value)
    if (!Number.isFinite(numeric) || numeric <= 0) return null
    return numeric > 0 && numeric <= 1 ? numeric * 100 : numeric
}

function resolveSuggestedPurchaseValue(precatorio: PrecatorioFechamento): number | undefined {
    if (!precatorio) return undefined

    const saldoLiquido = Number(precatorio?.saldo_liquido || 0)
    const percentualEscolhido = normalizePercent(precatorio?.dados_calculo?.proposta_escolhida_percentual)

    if (percentualEscolhido !== null && saldoLiquido > 0) {
        const valorDerivado = saldoLiquido * (percentualEscolhido / 100)
        if (Number.isFinite(valorDerivado) && valorDerivado > 0) return valorDerivado
    }

    const propostaMenor = Number(precatorio?.proposta_menor_valor || 0)
    if (Number.isFinite(propostaMenor) && propostaMenor > 0) return propostaMenor

    const propostaMaior = Number(precatorio?.proposta_maior_valor || 0)
    if (Number.isFinite(propostaMaior) && propostaMaior > 0) return propostaMaior

    return undefined
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(Number.isFinite(value) ? value : 0)
}

type ExpenseInputProps = {
    label: string
    value: number | undefined
    onChange: (value: number | undefined) => void
    disabled: boolean
}

function ExpenseInput({ label, value, onChange, disabled }: ExpenseInputProps) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <CurrencyInput
                value={value}
                onValueChange={onChange}
                disabled={disabled}
                placeholder="R$ 0,00"
                className="h-9 text-sm"
            />
        </div>
    )
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message
    if (typeof error === "object" && error !== null && "message" in error) {
        const maybeMessage = (error as { message?: unknown }).message
        if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage
    }
    return fallback
}
