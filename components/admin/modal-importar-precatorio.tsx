import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from "@/lib/supabase/client"

interface PrecatorioData {
    credor_nome?: string;
    valor_principal?: number;
    numero_precatorio?: string;
    tribunal?: string;
    credor_cpf_cnpj?: string;
    numero_processo?: string;
    natureza?: string;
    file_url?: string;
    raw_text?: string;
    // add other fields as needed
}

interface ModalImportarPrecatorioProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    onExtracted?: (data: PrecatorioData) => void
}

export function ModalImportarPrecatorio({ open, onOpenChange, onSuccess, onExtracted }: ModalImportarPrecatorioProps) {
    const [dragging, setDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [step, setStep] = useState<"upload" | "processing" | "review">("upload")
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(true)
    }

    const handleDragLeave = () => {
        setDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0])
        }
    }

    const handleFileSelect = (selectedFile: File) => {
        if (selectedFile.type !== "application/pdf" && !selectedFile.name.endsWith(".pdf") && !selectedFile.name.endsWith(".xlsx")) {
            toast.error("Por favor, selecione um arquivo PDF ou Excel válido.")
            return
        }
        setFile(selectedFile)
    }

    const handleProcess = async (method: 'ai' | 'regex' = 'ai') => {
        if (!file) return

        setUploading(true)
        setStep("processing")
        setProgress(10)

        // Simulação de processamento/upload
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) {
                    clearInterval(interval)
                    return 90
                }
                return prev + 10
            })
        }, 500)

        try {
            // Upload para Supabase Storage
            const supabase = createBrowserClient()
            if (!supabase) throw new Error("Supabase client not initialized")

            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}.${fileExt}`
            const { error: uploadError } = await supabase.storage.from('ocr-uploads').upload(fileName, file)
            if (uploadError) {
                console.error("Upload error:", uploadError) // Continue even if upload fails? Maybe not.
                // throw uploadError 
            }

            // Client-side Extraction
            const { processFileWithAI } = await import("@/lib/client-extractor");
            const extractedData = await processFileWithAI(file, method);

            // Get public URL to display PDF (if upload succeeded)
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('ocr-uploads').getPublicUrl(fileName);
                extractedData.file_url = publicUrl;
            }

            setProgress(100)
            toast.success("Dados extraídos com sucesso!")

            setUploading(false)
            onExtracted?.(extractedData)

            setStep("upload")
            setFile(null)
            setProgress(0)

        } catch (error) {
            console.error(error)
            toast.error("Erro ao processar arquivo: " + (error instanceof Error ? error.message : "Erro desconhecido"))
            setStep("upload")
            setUploading(false)
        } finally {
            clearInterval(interval)
        }
    }

    const reset = () => {
        setFile(null)
        setStep("upload")
        setProgress(0)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!uploading) {
                onOpenChange(val)
                if (!val) reset()
            }
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-orange-500" />
                        Importar Precatório (OCR)
                    </DialogTitle>
                    <DialogDescription>
                        Envie o PDF do Ofício ou precatório para extração automática dos dados.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    {step === "upload" && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`
                                border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
                                ${dragging ? "border-orange-500 bg-orange-50" : "border-muted-foreground/25 hover:bg-muted/50"}
                            `}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".pdf,.xlsx,.xls"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
                                }}
                            />

                            {file ? (
                                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                    <div className="bg-orange-100 p-3 rounded-full mb-3">
                                        <FileText className="h-8 w-8 text-orange-600" />
                                    </div>
                                    <p className="font-medium text-sm">{file.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                    <Button type="button" variant="ghost" size="sm" className="mt-2 text-red-500 h-8" onClick={(e) => {
                                        e.stopPropagation()
                                        setFile(null)
                                    }}>
                                        Remover
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-muted p-3 rounded-full mb-3">
                                        <Upload className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium text-sm text-foreground">
                                        Arraste ou clique para selecionar
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 px-4">
                                        Suporta PDF (OCR) e Excel. Tamanho máximo: 25MB.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {step === "processing" && (
                        <div className="space-y-4 text-center py-4">
                            <div className="relative mx-auto w-16 h-16">
                                <Loader2 className="h-16 w-16 animate-spin text-orange-500/30" />
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-xs">
                                    {progress}%
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-medium">Processando Arquivo...</h3>
                                <p className="text-xs text-muted-foreground">Extraindo informações e identificando campos.</p>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {step === "upload" && (
                        <>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    onClick={() => handleProcess('regex')}
                                    disabled={!file}
                                    variant="secondary"
                                    className="border"
                                >
                                    OCR (Básico)
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleProcess('ai')}
                                    disabled={!file}
                                    className="bg-purple-600 hover:bg-purple-700 text-white flex gap-2 items-center"
                                >
                                    <span className="text-xs">✨</span>
                                    OCR com IA
                                </Button>
                            </div>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
