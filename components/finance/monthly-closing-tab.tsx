"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle, Calculator, DollarSign } from "lucide-react"
import { getMonthlyClosingSummary, createCommissionTransaction } from "@/services/finance-service"
import { toast } from "sonner" // Assuming sonner or use-toast is available, otherwise alert

export function MonthlyClosingTab() {
    const currentYear = new Date().getFullYear()
    const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1))
    const [year, setYear] = useState<string>(String(currentYear))

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [data, setData] = useState<any>(null)

    const [commissionValue, setCommissionValue] = useState("")
    const [notes, setNotes] = useState("")

    useEffect(() => {
        loadMonthData()
    }, [month, year])

    async function loadMonthData() {
        setLoading(true)
        try {
            const summary = await getMonthlyClosingSummary(Number(month), Number(year))
            setData(summary)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSaveCommission() {
        if (!commissionValue || Number(commissionValue) <= 0) {
            alert("Por favor, insira um valor válido para a comissão.")
            return
        }

        setSaving(true)
        try {
            // Last day of the selected month
            const dateRef = new Date(Number(year), Number(month), 0)
            const description = `Comissão Apax - ${month}/${year} ${notes ? `(${notes})` : ''}`

            await createCommissionTransaction(Number(commissionValue), dateRef, description)

            // Reload to show impact
            await loadMonthData()
            setCommissionValue("")
            alert("Comissão registrada com sucesso!") // Replace with toast if available
        } catch (error) {
            console.error(error)
            alert("Erro ao registrar comissão.")
        } finally {
            setSaving(false)
        }
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    // Calculate simulated result
    const currentBalance = data?.balance || 0
    const commValueNum = Number(commissionValue) || 0
    const finalResult = currentBalance - commValueNum

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Selection & Input Column */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Período de Fechamento</CardTitle>
                        <CardDescription>Selecione o mês para calcular a comissão.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <div className="space-y-2 flex-1">
                                <Label>Mês</Label>
                                <Select value={month} onValueChange={setMonth}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <SelectItem key={m} value={String(m)}>
                                                {new Date(0, m - 1).toLocaleString('pt-BR', { month: 'long' })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 w-[120px]">
                                <Label>Ano</Label>
                                <Select value={year} onValueChange={setYear}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2024">2024</SelectItem>
                                        <SelectItem value="2025">2025</SelectItem>
                                        <SelectItem value="2026">2026</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Lançamento de Comissão</CardTitle>
                        <CardDescription>Insira o valor da comissão da Apax para este mês.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Valor da Comissão (R$)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="pl-8"
                                    value={commissionValue}
                                    onChange={e => setCommissionValue(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Observações (Opcional)</Label>
                            <Input
                                placeholder="Ex: Ajuste de meta..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            onClick={handleSaveCommission}
                            disabled={saving || !commissionValue}
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Registrar Despesa
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Summary Preview Column */}
            <div className="space-y-6">
                <Card className={loading ? "opacity-50" : ""}>
                    <CardHeader>
                        <CardTitle>Resumo do Mês</CardTitle>
                        <CardDescription>Impacto financeiro antes e depois da comissão.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Receita Líquida (Realizado)</span>
                                <span className="font-medium text-green-600">{formatCurrency(data?.netRevenue || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Despesas Operacionais</span>
                                <span className="font-medium text-red-600">{formatCurrency(data?.netExpense || 0)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-base font-semibold">
                                <span>Saldo Atual</span>
                                <span>{formatCurrency(currentBalance)}</span>
                            </div>
                        </div>

                        {commValueNum > 0 && (
                            <div className="rounded-lg bg-orange-50 p-4 border border-orange-100 mt-4">
                                <div className="flex items-center gap-2 mb-2 text-orange-800 font-medium">
                                    <Calculator className="h-4 w-4" /> Simulador
                                </div>
                                <div className="space-y-2 text-sm text-orange-900">
                                    <div className="flex justify-between">
                                        <span>Saldo Atual</span>
                                        <span>{formatCurrency(currentBalance)}</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>(-) Nova Comissão</span>
                                        <span>{formatCurrency(commValueNum)}</span>
                                    </div>
                                    <Separator className="bg-orange-200" />
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Resultado Final</span>
                                        <span>{formatCurrency(finalResult)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
