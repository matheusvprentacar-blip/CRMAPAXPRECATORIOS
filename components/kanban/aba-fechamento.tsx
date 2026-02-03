"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { Loader2, DollarSign, CheckCircle2, Lock } from "lucide-react"

interface AbaFechamentoProps {
    precatorioId: string
    precatorio: any
    onUpdate: () => void
    userRole: string[]
}

export function AbaFechamento({ precatorioId, precatorio, onUpdate, userRole }: AbaFechamentoProps) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

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

    useEffect(() => {
        // Inicializar campos
        if (precatorio) {
            // Se tiver valor salvo no fechamento, usa. Senão, tenta pegar da proposta aceita como sugestão
            const valorInicial = precatorio.fechamento_valor_compra
                ? Number(precatorio.fechamento_valor_compra)
                : precatorio.proposta_aceita_valor
                    ? Number(precatorio.proposta_aceita_valor)
                    : undefined

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

    const handleFinalizar = async () => {
        if (!valorCompra || !dataFechamento) {
            toast({
                title: "Campos obrigatórios",
                description: "Informe o Valor de Compra e a Data.",
                variant: "destructive"
            })
            return
        }

        if (!confirm("Tem certeza? Essa ação vai gerar os lançamentos no financeiro e não pode ser desfeita facilmente.")) {
            return
        }

        setSaving(true)
        try {
            const supabase = createBrowserClient()
            if (!supabase) return

            const { error } = await supabase.rpc('finalizar_fechamento_precatorio', {
                p_precatorio_id: precatorioId,
                p_valor_compra: valorCompra,
                p_comissao_operador: comissaoOperador || 0,
                p_comissao_apax: comissaoApax || 0,

                p_escritura: escritura || 0,
                p_procuracao: procuracao || 0,
                p_funrejus: funrejus || 0,
                p_certidoes: certidoes || 0,
                p_certidao_central: certidaoCentral || 0,
                p_autenticacao: autenticacao || 0,

                p_data_pagamento: dataFechamento
            })

            if (error) throw error

            toast({
                title: "Fechamento Concluído",
                description: "Dados salvos e lançamentos gerados no financeiro.",
            })
            onUpdate()

        } catch (error: any) {
            console.error("Erro ao finalizar fechamento:", error)
            toast({
                title: "Erro",
                description: error.message || "Erro ao processar fechamento.",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    // Se não tiver permissão, nem vê (ou vê readonly?) - User pediu para Admin ou Financeiro ver/editar
    // Vou deixar readonly para quem não pode editar, mas visível para juridico talvez?
    // O user disse: "admin ou financeiro vão poder editar"

    const isReadOnly = !canEdit || isFinalizado

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
                        Informe os valores finais da negociação para gerar os registros no módulo financeiro.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

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
                    <div className="pt-4 flex justify-end">
                        {isFinalizado ? (
                            <div className="flex items-center text-green-700 bg-green-100 px-4 py-2 rounded-md">
                                <Lock className="h-4 w-4 mr-2" />
                                Fechamento Finalizado em {new Date(dataFechamento).toLocaleDateString()}
                            </div>
                        ) : (
                            canEdit && (
                                <Button
                                    onClick={handleFinalizar}
                                    disabled={saving}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Finalizar Fechamento
                                </Button>
                            )
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    )
}

function ExpenseInput({ label, value, onChange, disabled }: any) {
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
