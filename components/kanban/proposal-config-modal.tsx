"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Save, RotateCcw, GripVertical } from "lucide-react"

// Tipos da configuração
export interface ProposalItemConfig {
    key: string
    label: string
    visible: boolean
    showValue: boolean
    isTotal?: boolean // Se for true, é uma linha de total/saldo
}

export interface ProposalConfig {
    items: ProposalItemConfig[]
    totalMode: 'internal' | 'sum_visible' // 'internal' = usa valor calculado pelo sistema; 'sum_visible' = soma apenas o que está visível
}

interface ProposalConfigModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    precatorioId: string
    currentData: any // Dados atuais do precatório para defaults
    onSave: () => void
}

const DEFAULT_CONFIG_ITEMS: ProposalItemConfig[] = [
    { key: 'credito_atualizado', label: 'Crédito Principal Atualizado (Bruto)', visible: true, showValue: true },
    { key: 'honorarios', label: 'Honorários Contratuais Advogado', visible: true, showValue: true },
    { key: 'adiantamento_recebido', label: 'Adiantamentos já recebidos', visible: true, showValue: true },
    { key: 'previdencia', label: 'Previdência Oficial / PSS', visible: true, showValue: true },
    { key: 'ir_rra', label: 'Imposto de Renda (IR RRA)', visible: true, showValue: true },
    { key: 'saldo_liquido_credor', label: 'SALDO LÍQUIDO DISPONÍVEL AO CREDOR', visible: true, showValue: true, isTotal: true },
    // A proposta em si geralmente é destacada, mas podemos incluir aqui para renomear
    { key: 'proposta_credor', label: 'PROPOSTA DE COMPRA DE CRÉDITO', visible: true, showValue: true, isTotal: true }
]

export function ProposalConfigModal({
    open,
    onOpenChange,
    precatorioId,
    currentData,
    onSave
}: ProposalConfigModalProps) {
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState<ProposalItemConfig[]>(DEFAULT_CONFIG_ITEMS)
    const [totalMode, setTotalMode] = useState<'internal' | 'sum_visible'>('internal')

    // Carregar configuração existente ao abrir
    useEffect(() => {
        if (open && currentData?.dados_calculo?.proposal_config) {
            const savedConfig = currentData.dados_calculo.proposal_config as ProposalConfig
            // Merge com defaults para garantir que novos campos apareçam se adicionados no futuro
            const mergedItems = DEFAULT_CONFIG_ITEMS.map(def => {
                const saved = savedConfig.items.find(s => s.key === def.key)
                return saved ? { ...def, ...saved } : def
            })
            setItems(mergedItems)
            setTotalMode(savedConfig.totalMode || 'internal')
        } else if (open) {
            // Resetar para default se não tiver config salva
            setItems(DEFAULT_CONFIG_ITEMS)
            setTotalMode('internal')
        }
    }, [open, currentData])

    const handleItemChange = (index: number, changes: Partial<ProposalItemConfig>) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], ...changes }
        setItems(newItems)
    }

    const handleReset = () => {
        setItems(DEFAULT_CONFIG_ITEMS)
        setTotalMode('internal')
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const supabase = createBrowserClient()
            if (!supabase) return

            // Preservar outros dados de cálculo
            const dadosCalculoAtual = currentData.dados_calculo || {}

            const newConfig: ProposalConfig = {
                items,
                totalMode
            }

            const { error } = await supabase
                .from('precatorios')
                .update({
                    dados_calculo: {
                        ...dadosCalculoAtual,
                        proposal_config: newConfig
                    }
                })
                .eq('id', precatorioId)

            if (error) throw error

            toast({
                title: "Configuração salva",
                description: "O modelo de proposta foi atualizado para este crédito.",
            })
            onSave() // Recarrega dados no pai
            onOpenChange(false)

        } catch (error: any) {
            console.error("Erro ao salvar config:", error)
            toast({
                title: "Erro ao salvar",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Configurar Modelo de Proposta</DialogTitle>
                    <DialogDescription>
                        Personalize os campos, descrições e visibilidade para este crédito específico.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">

                    {/* Modo de Cálculo */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                        <div className="space-y-0.5">
                            <Label className="text-base">Modo de Cálculo dos Totais</Label>
                            <p className="text-xs text-muted-foreground">
                                Como os saldos finais devem ser exibidos no PDF?
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs ${totalMode === 'internal' ? 'font-bold' : 'text-muted-foreground'}`}>Oficial (Interno)</span>
                            <Switch
                                checked={totalMode === 'sum_visible'}
                                onCheckedChange={(c) => setTotalMode(c ? 'sum_visible' : 'internal')}
                            />
                            <span className={`text-xs ${totalMode === 'sum_visible' ? 'font-bold' : 'text-muted-foreground'}`}>Soma do Visível</span>
                        </div>
                    </div>

                    {/* Lista de Campos */}
                    <div className="bg-white rounded-md border flex flex-col shadow-sm">
                        <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-3 bg-slate-100 border-b text-xs font-bold text-slate-600 uppercase tracking-wider">
                            <div className="w-8 text-center flex items-center justify-center" title="Visível no PDF">
                                <span className="sr-only">Visível</span>
                                <div className="h-4 w-4 rounded border border-slate-300 bg-white" />
                            </div>
                            <div>Item / Descrição ({items.length})</div>
                            <div className="w-20 text-center" title="Exibir Valor Numérico">Valor</div>
                        </div>

                        {/* Removido ScrollArea fixo para permitir expandir */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            <div className="divide-y divide-slate-100 p-1">
                                {items.map((item, index) => (
                                    <div
                                        key={item.key}
                                        className={`grid grid-cols-[40px_1fr_60px] gap-2 p-2 items-center transition-all duration-200 ${!item.visible ? 'bg-slate-50 opacity-60 grayscale' : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="flex justify-center">
                                            <Checkbox
                                                checked={item.visible}
                                                onCheckedChange={(c) => handleItemChange(index, { visible: !!c })}
                                                className="data-[state=checked]:bg-slate-900 border-slate-300"
                                            />
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <Input
                                                value={item.label}
                                                onChange={(e) => handleItemChange(index, { label: e.target.value })}
                                                className={`h-9 text-sm border-slate-200 focus:border-slate-500 font-medium w-full text-ellipsis ${item.isTotal ? 'text-slate-900 font-bold bg-slate-50/50' : 'text-slate-700'
                                                    }`}
                                                disabled={!item.visible}
                                                title={item.label} // Tooltip para texto longo
                                            />
                                            {/* Debug Visual removido para produção, ou manter discreto */}
                                            {item.isTotal && (
                                                <div className="flex items-center gap-1 mt-1 ml-1">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                                    <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide truncate">
                                                        {item.label.includes('SALDO') ? 'Linha de Saldo' : 'Total'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-center">
                                            <Switch
                                                checked={item.showValue}
                                                onCheckedChange={(c) => handleItemChange(index, { showValue: !!c })}
                                                disabled={!item.visible}
                                                className="scale-75 data-[state=checked]:bg-green-600"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between">
                    <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
                        <RotateCcw className="h-3 w-3 mr-2" />
                        Restaurar Padrão
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar Modelo
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
