
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface ModalSemInteresseProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    precatorioId: string
    onConfirm: (motivo: string, dataRecontato: Date | undefined) => void
}

export function ModalSemInteresse({ open, onOpenChange, precatorioId, onConfirm }: ModalSemInteresseProps) {
    const [motivo, setMotivo] = useState("")
    const [agendarRecontato, setAgendarRecontato] = useState(false)
    const [dataRecontato, setDataRecontato] = useState<Date | undefined>(undefined)
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (!motivo.trim()) {
            toast.error("Por favor, descreva o motivo.")
            return
        }

        if (agendarRecontato && !dataRecontato) {
            toast.error("Por favor, selecione uma data para recontato.")
            return
        }

        setSaving(true)
        try {
            await onConfirm(motivo, agendarRecontato ? dataRecontato : undefined)
            onOpenChange(false)
            setMotivo("")
            setAgendarRecontato(false)
            setDataRecontato(undefined)
        } catch (error) {
            console.error(error)
            toast.error("Erro ao salvar informações.")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mover para Sem Interesse</DialogTitle>
                    <DialogDescription>
                        Informe o motivo e, se desejar, agende um retorno futuro.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="motivo">Motivo (Obrigatório)</Label>
                        <Textarea
                            id="motivo"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Ex: Valor muito baixo, cliente não aceitou proposta..."
                            className="h-24 resize-none"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="recontato"
                            checked={agendarRecontato}
                            onCheckedChange={(checked) => setAgendarRecontato(!!checked)}
                        />
                        <Label htmlFor="recontato">Agendar Recontato?</Label>
                    </div>

                    {agendarRecontato && (
                        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                            <Label>Data de Retorno</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dataRecontato && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dataRecontato ? format(dataRecontato, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dataRecontato}
                                        onSelect={setDataRecontato}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-slate-600 hover:bg-slate-700">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
