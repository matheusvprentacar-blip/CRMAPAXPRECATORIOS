"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Upload, Eye, Download, FileType, CheckCircle2, Trash2, Send } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface OficioViewerProps {
    precatorioId: string
    fileUrl?: string | null
    onFileUpdate: (url?: string) => void
    readonly?: boolean
}

export function OficioViewer({ precatorioId, fileUrl, onFileUpdate, readonly = false }: OficioViewerProps) {
    const [uploading, setUploading] = useState(false)

    // Função para Extrair/Upload
    // NOTA: Como você já tem um fluxo de extração OCR, poderíamos reutilizar.
    // Mas para este escopo específico de "Incluir Ofício", vamos fazer um upload simples para o bucket
    // E atualizar o campo file_url.
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.type !== "application/pdf") {
            toast.error("Por favor, envie apenas arquivos PDF.")
            return
        }

        try {
            setUploading(true)
            const supabase = createBrowserClient()
            if (!supabase) throw new Error("Supabase não inicializado")

            // 1. Upload para o bucket 'ocr-uploads'
            const fileName = `oficio-${precatorioId}-${Date.now()}.pdf`
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('ocr-uploads')
                .upload(fileName, file)

            if (uploadError) {
                console.error("Upload Error:", uploadError)
                throw uploadError
            }

            // 2. Obter URL pública
            const { data: { publicUrl } } = supabase
                .storage
                .from('ocr-uploads')
                .getPublicUrl(fileName)

            console.log("Public URL generated:", publicUrl)

            // 3. Atualizar registro do precatório
            const { error: updateError } = await supabase
                .from('precatorios')
                .update({ file_url: publicUrl })
                .eq('id', precatorioId)

            if (updateError) {
                console.error("Database Update Error:", updateError)
                toast.error(`Erro ao salvar no banco: ${updateError.message}`)
                throw updateError
            }

            toast.success("Ofício anexado com sucesso!")
            onFileUpdate?.(publicUrl)
        } catch (error) {
            console.error("Erro no upload:", error)
            toast.error("Erro ao fazer upload do ofício.")
        } finally {
            setUploading(false)
        }
    }

    const handleRemoveFile = async () => {
        if (!confirm("Tem certeza que deseja remover este ofício?")) return

        try {
            setUploading(true)
            const supabase = createBrowserClient()
            if (!supabase) throw new Error("Supabase não inicializado")

            const { error } = await supabase
                .from('precatorios')
                .update({ file_url: null })
                .eq('id', precatorioId)

            if (error) throw error

            toast.success("Ofício removido com sucesso!")
            onFileUpdate?.(undefined)
        } catch (error: any) {
            console.error("Erro ao remover:", error)
            toast.error(`Erro ao remover: ${error.message}`)
        } finally {
            setUploading(false)
        }
    }

    const handleSendToCalculation = async () => {
        try {
            setUploading(true)
            const supabase = createBrowserClient()
            if (!supabase) throw new Error("Supabase não inicializado")

            const { error } = await supabase
                .from('precatorios')
                .update({
                    status_kanban: 'pronto_calculo',
                    localizacao_kanban: 'fila_calculo' // Ensure location update if needed by schema
                })
                .eq('id', precatorioId)

            if (error) throw error

            toast.success("Enviado para Fila de Cálculo com sucesso! 🚀")
            onFileUpdate?.() // Trigger reload
        } catch (error: any) {
            console.error("Erro ao enviar:", error)
            toast.error(`Erro ao enviar: ${error.message}`)
        } finally {
            setUploading(false)
        }
    }

    return (
        <Card className="border-l-4 border-l-cyan-500 shadow-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <FileText className="h-5 w-5 text-cyan-600" />
                            Ofício Requisitório
                        </CardTitle>
                        <CardDescription>
                            Documento oficial do precatório (Ofício original).
                        </CardDescription>
                    </div>
                    {fileUrl && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Anexado
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {fileUrl ? (
                    <div className="space-y-4">
                        <div className="bg-muted/30 border rounded-lg p-6 flex flex-col items-center justify-center text-center gap-4">
                            <div className="bg-white p-4 rounded-full shadow-sm">
                                <FileType className="h-10 w-10 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-medium">Arquivo Disponível</h3>
                                <p className="text-sm text-muted-foreground mb-4">O ofício já está vinculado a este precatório.</p>

                                <div className="flex flex-col gap-3 items-center">
                                    <div className="flex gap-2 justify-center">
                                        <Button variant="outline" asChild>
                                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                                <Eye className="h-4 w-4 mr-2" />
                                                Visualizar
                                            </a>
                                        </Button>

                                        {!readonly && (
                                            <>
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        onChange={handleFileUpload}
                                                        disabled={uploading}
                                                    />
                                                    <Button variant="secondary" disabled={uploading}>
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        Substituir
                                                    </Button>
                                                </div>

                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    disabled={uploading}
                                                    onClick={handleRemoveFile}
                                                    title="Remover Ofício"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>

                                    {!readonly && (
                                        <div className="pt-2 border-t w-full flex justify-center">
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 w-full md:w-auto"
                                                onClick={handleSendToCalculation}
                                                disabled={uploading}
                                            >
                                                <Send className="h-4 w-4 mr-2" />
                                                Enviar para Cálculo
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Embed Preview (Optional) */}
                        <div className="aspect-[16/9] w-full bg-slate-100 rounded-md border overflow-hidden relative group">
                            <iframe
                                src={`${fileUrl}#toolbar=0`}
                                className="w-full h-full"
                                title="Ofício Preview"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="text-white font-medium bg-black/50 px-4 py-2 rounded-full">
                                    Clique em visualizar para abrir em tela cheia
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl py-12 flex flex-col items-center justify-center text-center bg-muted/5 hover:bg-muted/10 transition-colors">
                        <div className="bg-muted p-4 rounded-full mb-4">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">Nenhum ofício anexado</h3>
                        <p className="text-muted-foreground max-w-sm mb-6">
                            Faça o upload do PDF do Ofício Requisitório para liberar as próximas etapas do processo.
                        </p>

                        {!readonly ? (
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                                <Button size="lg" disabled={uploading} className="bg-cyan-600 hover:bg-cyan-700">
                                    {uploading ? "Enviando..." : "Selecionar PDF do Ofício"}
                                </Button>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground bg-yellow-50 px-3 py-1 rounded-md border border-yellow-200">
                                Aguardando inclusão pelo responsável.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
