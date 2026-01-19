"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react"
import { ModalSemInteresse } from "./modal-sem-interesse"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface TriagemActionsProps {
    precatorioId: string
    precatorio: any
    onUpdate: () => void
}

export function TriagemActions({ precatorioId, precatorio, onUpdate }: TriagemActionsProps) {
    const [loading, setLoading] = useState(false)
    const [showSemInteresse, setShowSemInteresse] = useState(false)

    // 1. Ação: Tenho Interesse
    const handleTemInteresse = async () => {
        try {
            setLoading(true)
            const supabase = createBrowserClient()
            if (!supabase) return

            // Atualiza para 'aguardando_oficio' e 'TEM_INTERESSE'
            const { error } = await supabase
                .from("precatorios")
                .update({
                    status_kanban: "aguardando_oficio",
                    interesse_status: "TEM_INTERESSE",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", precatorioId)

            if (error) throw error

            toast.success("Mover para Aguardando Ofício", {
                description: "Status de interesse atualizado com sucesso!"
            })
            onUpdate()
        } catch (error: any) {
            console.error("Erro ao atualizar interesse:", error)
            toast.error("Erro ao processar", { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    // 2. Ação: Sem Interesse (Confirmação do Modal)
    const handleConfirmSemInteresse = async (motivo: string, dataRecontato?: Date) => {
        try {
            setLoading(true)
            const supabase = createBrowserClient()
            if (!supabase) return

            // Atualiza para 'sem_interesse'
            const { error } = await supabase
                .from("precatorios")
                .update({
                    status_kanban: "sem_interesse",
                    interesse_status: "SEM_INTERESSE",
                    motivo_sem_interesse: motivo,
                    data_recontato: dataRecontato ? dataRecontato.toISOString() : null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", precatorioId)

            if (error) throw error

            toast.success("Mover para Sem Interesse", {
                description: dataRecontato ? "Recontato agendado com sucesso." : "Registro atualizado."
            })
            onUpdate()
        } catch (error: any) {
            console.error("Erro ao mover para sem interesse:", error)
            toast.error("Erro ao salvar", { description: error.message })
        } finally {
            setLoading(false)
            setShowSemInteresse(false)
        }
    }

    // Visualização com base no status atual
    const isInteressado = precatorio.interesse_status === "TEM_INTERESSE"
    const isSemInteresse = precatorio.interesse_status === "SEM_INTERESSE"

    if (isInteressado) {
        return (
            <Card className="border-l-4 border-l-green-500 bg-green-50/50">
                <CardContent className="pt-6 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-semibold text-green-900">Interesse Confirmado</p>
                        <p className="text-sm text-green-700">Este precatório está na fila de Ofícios.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (isSemInteresse) {
        return (
            <Card className="border-l-4 border-l-red-500 bg-red-50/50">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                            <XCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-semibold text-red-900">Marcado como Sem Interesse</p>
                            <p className="text-sm text-red-700 mt-1">
                                <strong>Motivo:</strong> {precatorio.motivo_sem_interesse}
                            </p>
                            {precatorio.data_recontato && (
                                <p className="text-sm text-red-700 mt-1">
                                    <strong>Recontato:</strong> {new Date(precatorio.data_recontato).toLocaleDateString('pt-BR')}
                                </p>
                            )}
                            <Button
                                variant="link"
                                size="sm"
                                className="text-red-700 p-0 h-auto mt-2 underline"
                                onClick={() => setShowSemInteresse(true)} // Reabrir modal para editar? Ou permitir reverter?
                            >
                                Editar motivo / recontato
                            </Button>
                        </div>
                    </div>
                    <ModalSemInteresse
                        open={showSemInteresse}
                        onOpenChange={setShowSemInteresse}
                        precatorioId={precatorioId}
                        onConfirm={handleConfirmSemInteresse}
                    />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-l-4 border-l-blue-500 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <ArrowRight className="h-24 w-24 text-blue-500" />
            </div>
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Triagem Inicial</CardTitle>
                <CardDescription className="text-xs">
                    Defina o próximo passo para este precatório.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
                <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleTemInteresse}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Tenho Interesse
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                    onClick={() => setShowSemInteresse(true)}
                    disabled={loading}
                >
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                    Sem Interesse
                </Button>
            </CardContent>

            <ModalSemInteresse
                open={showSemInteresse}
                onOpenChange={setShowSemInteresse}
                precatorioId={precatorioId}
                onConfirm={handleConfirmSemInteresse}
            />
        </Card>
    )
}
