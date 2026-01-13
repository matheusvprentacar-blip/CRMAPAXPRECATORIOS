"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Scale } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"

interface ModalEnviarJuridicoProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    precatorioId: string
    precatorioTitulo: string
    onSuccess: () => void
}

const MOTIVOS_JURIDICOS = [
    { value: "PENHORA", label: "Penhora Identificada" },
    { value: "CESSAO", label: "Cessão de Crédito" },
    { value: "HONORARIOS", label: "Honorários Contratuais" },
    { value: "HABILITACAO", label: "Habilitação de Herdeiros" },
    { value: "DUVIDA_BASE_INDICE", label: "Dúvida Base/Índice" },
    { value: "OUTROS", label: "Outros" },
]

export function ModalEnviarJuridico({ open, onOpenChange, precatorioId, precatorioTitulo, onSuccess }: ModalEnviarJuridicoProps) {
    const [motivo, setMotivo] = useState<string>("")
    const [descricao, setDescricao] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async () => {
        // Validações
        if (!motivo) {
            setError("Por favor, selecione o motivo do envio")
            return
        }

        if (!descricao.trim()) {
            setError("A descrição do motivo é obrigatória")
            return
        }

        if (descricao.trim().length < 10) {
            setError("A descrição deve ter pelo menos 10 caracteres")
            return
        }

        setLoading(true)
        setError("")

        try {
            const supabase = getSupabase()
            if (!supabase) throw new Error("Supabase não disponível")

            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) throw new Error("Usuário não autenticado")

            // Atualizar precatório
            const { error: updateError } = await supabase
                .from("precatorios")
                .update({
                    status: "analise_juridica",
                    localizacao_kanban: "analise_juridica",
                    juridico_motivo: motivo,
                    juridico_descricao_bloqueio: descricao.trim(),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", precatorioId)

            if (updateError) throw updateError

            // Registrar atividade
            await supabase.from("atividades").insert({
                precatorio_id: precatorioId,
                usuario_id: user.id,
                tipo: "mudanca_status",
                descricao: `Enviado para Análise Jurídica: ${MOTIVOS_JURIDICOS.find((t) => t.value === motivo)?.label}`,
                dados_novos: {
                    motivo: motivo,
                    descricao: descricao.trim(),
                    origem: "fila_calculo"
                },
            })

            console.log("[MODAL JURIDICO] Enviado para jurídico com sucesso")

            // Limpar e fechar
            setMotivo("")
            setDescricao("")
            onOpenChange(false)
            onSuccess()
        } catch (err: any) {
            console.error("[MODAL JURIDICO] Erro ao enviar:", err)
            setError(err.message || "Erro ao registrar envio")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-purple-500" />
                        Enviar para Análise Jurídica
                    </DialogTitle>
                    <DialogDescription>
                        Isso moverá o precatório <span className="font-medium">{precatorioTitulo}</span> para a fila do Jurídico.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Motivo */}
                    <div className="space-y-2">
                        <Label htmlFor="motivo">
                            Motivo Principal <span className="text-red-500">*</span>
                        </Label>
                        <Select value={motivo} onValueChange={(value) => {
                            setMotivo(value)
                            setError("")
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o motivo" />
                            </SelectTrigger>
                            <SelectContent>
                                {MOTIVOS_JURIDICOS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="descricao">
                            Descrição Detalhada <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="descricao"
                            placeholder="Descreva o impedimento ou dúvida jurídica..."
                            value={descricao}
                            onChange={(e) => {
                                setDescricao(e.target.value)
                                setError("")
                            }}
                            rows={4}
                            className={error ? "border-red-500" : ""}
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>

                    <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-3 text-sm">
                        <p className="text-purple-800 dark:text-purple-200">
                            <strong>Atenção:</strong> O precatório sairá da sua fila de cálculo e ficará bloqueado até o retorno do setor jurídico.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || !motivo || !descricao.trim() || descricao.trim().length < 10}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {loading ? "Enviando..." : "Enviar para Jurídico"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
