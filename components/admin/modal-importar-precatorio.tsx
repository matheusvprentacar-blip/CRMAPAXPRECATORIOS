import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from "@/lib/supabase/client"
import { createOcrTraceId, logOcrTrace, serializeError } from "@/lib/utils/ocr-trace"

interface PrecatorioData {
  credor_nome?: string
  advogado_nome?: string
  valor_principal?: number
  numero_precatorio?: string
  numero_oficio?: string
  tribunal?: string
  credor_cpf_cnpj?: string
  numero_processo?: string
  natureza?: string
  data_expedicao?: string
  file_url?: string
  raw_text?: string
  ocr_warnings?: string[]
  ocr_metrics?: Record<string, unknown>
}

type OcrApiResponse = {
  ok?: boolean
  data?: PrecatorioData
  warnings?: string[]
  metrics?: Record<string, unknown>
  error?: string
  traceId?: string
  details?: unknown
}

type RobustOcrResult =
  | { ok: true; data: PrecatorioData; traceId?: string }
  | { ok: false; error: string; traceId?: string; status?: number; details?: unknown }

interface ModalImportarPrecatorioProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onExtracted?: (data: PrecatorioData) => void
}

function isPdfFile(file: File): boolean {
  const lowerName = file.name.toLowerCase()
  return file.type === "application/pdf" || lowerName.endsWith(".pdf")
}

function isExcelFile(file: File): boolean {
  const lowerName = file.name.toLowerCase()
  return (
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls")
  )
}

async function extractPdfWithRobustPipeline(
  file: File,
  mode: "auto" | "fast" = "auto",
  traceId?: string
): Promise<RobustOcrResult> {
  const form = new FormData()
  form.append("file", file)
  form.append("ocrMode", mode)

  logOcrTrace(traceId || "sem-trace", "robust.request", "Enviando arquivo para API OCR robusta", {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    mode,
  })

  const response = await fetch("/api/admin/precatorios/ocr-extract", {
    method: "POST",
    body: form,
    headers: {
      Accept: "application/json",
      ...(traceId ? { "x-ocr-trace-id": traceId } : {}),
    },
  })

  const rawBody = await response.text()
  const contentType = response.headers.get("content-type") || ""
  const responseTraceId = response.headers.get("x-ocr-trace-id") || traceId
  const looksLikeJson = contentType.includes("application/json") || rawBody.trim().startsWith("{")
  if (!looksLikeJson) {
    const preview = rawBody.slice(0, 120).replace(/\s+/g, " ").trim()
    const error = `Resposta nao-JSON da API OCR (status ${response.status}): ${preview || "<vazio>"}`
    logOcrTrace(responseTraceId || "sem-trace", "robust.non_json", error, {
      status: response.status,
      contentType,
      preview,
    }, "error")
    return { ok: false, error, traceId: responseTraceId, status: response.status }
  }

  let payload: OcrApiResponse
  try {
    payload = JSON.parse(rawBody) as OcrApiResponse
  } catch {
    const error = `Falha ao interpretar JSON da API OCR (status ${response.status}).`
    logOcrTrace(responseTraceId || "sem-trace", "robust.json_parse_error", error, {
      status: response.status,
      rawLength: rawBody.length,
      rawPreview: rawBody.slice(0, 300),
    }, "error")
    return { ok: false, error, traceId: responseTraceId, status: response.status }
  }

  if (!response.ok || !payload.ok || !payload.data) {
    const error = payload.error || "Falha na extracao robusta do PDF."
    logOcrTrace(payload.traceId || responseTraceId || "sem-trace", "robust.api_error", error, {
      status: response.status,
      payload,
    }, "error")
    return {
      ok: false,
      error,
      traceId: payload.traceId || responseTraceId,
      status: response.status,
      details: payload.details,
    }
  }
  logOcrTrace(payload.traceId || responseTraceId || "sem-trace", "robust.success", "API OCR robusta respondeu com sucesso", {
    status: response.status,
    warnings: payload.warnings || [],
    metrics: payload.metrics || {},
  })
  return { ok: true, data: payload.data, traceId: payload.traceId || responseTraceId }
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
    const isPdf = isPdfFile(selectedFile)
    const isExcel = isExcelFile(selectedFile)
    if (!isPdf && !isExcel) {
      toast.error("Por favor, selecione um arquivo PDF ou Excel valido.")
      return
    }
    setFile(selectedFile)
  }

  const handleProcess = async (method: "ai" | "regex" = "ai") => {
    if (!file) return
    const traceId = createOcrTraceId()
    logOcrTrace(traceId, "process.start", "Iniciando processamento de importacao", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      method,
    })

    setUploading(true)
    setStep("processing")
    setProgress(10)
    // Libera o repaint antes de iniciar operações mais custosas.
    await new Promise((resolve) => setTimeout(resolve, 0))

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
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase client not initialized")

      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from("ocr-uploads").upload(fileName, file)
      if (uploadError) {
        logOcrTrace(traceId, "upload.warning", "Falha no upload para storage (seguindo com extracao)", uploadError, "warn")
      } else {
        logOcrTrace(traceId, "upload.success", "Upload no storage concluido", { fileName })
      }

      let extractedData: PrecatorioData
      if (isPdfFile(file)) {
        const ocrMode = "auto" as const
        logOcrTrace(traceId, "extract.robust.start", "Tentando extracao robusta", {
          ocrMode,
          requestedByButton: method,
          note: "PDF agora usa sempre modo auto para melhor qualidade",
        })
        const robustResult = await extractPdfWithRobustPipeline(file, ocrMode, traceId)
        if (robustResult.ok) {
          logOcrTrace(robustResult.traceId || traceId, "extract.robust.success", "Extracao robusta finalizada")
          extractedData = robustResult.data
        } else {
          logOcrTrace(
            robustResult.traceId || traceId,
            "extract.robust.fallback",
            "Pipeline robusto indisponivel, aplicando fallback local",
            robustResult,
            "warn"
          )
          toast.warning("Pipeline robusto indisponivel. Usando extracao local como fallback.")
          logOcrTrace(traceId, "extract.local.start", "Iniciando fallback local")
          const { processFileWithAI } = await import("@/lib/client-extractor")
          extractedData = await processFileWithAI(file, method)
          logOcrTrace(traceId, "extract.local.success", "Fallback local finalizado")
        }
      } else {
        logOcrTrace(traceId, "extract.local.start", "Arquivo nao-PDF, usando extracao local")
        const { processFileWithAI } = await import("@/lib/client-extractor")
        extractedData = await processFileWithAI(file, method)
        logOcrTrace(traceId, "extract.local.success", "Extracao local finalizada")
      }

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("ocr-uploads").getPublicUrl(fileName)
        extractedData.file_url = publicUrl
        logOcrTrace(traceId, "upload.public_url", "Public URL gerada para visualizacao", { hasPublicUrl: Boolean(publicUrl) })
      }

      setProgress(100)
      if (Array.isArray(extractedData.ocr_warnings) && extractedData.ocr_warnings.length > 0) {
        logOcrTrace(traceId, "extract.warnings", "Extracao concluida com warnings", extractedData.ocr_warnings, "warn")
        toast.warning(`Extracao concluida com alertas: ${extractedData.ocr_warnings.slice(0, 3).join(", ")}`)
      }
      logOcrTrace(traceId, "process.success", "Processamento concluido com sucesso")
      toast.success("Dados extraidos com sucesso!")

      setUploading(false)
      onExtracted?.(extractedData)
      onSuccess?.()

      setStep("upload")
      setFile(null)
      setProgress(0)
    } catch (error) {
      const serialized = serializeError(error)
      logOcrTrace(traceId, "process.error", "Erro fatal no processamento", serialized, "error")
      toast.error(
        "Erro ao processar arquivo: " +
          (error instanceof Error ? error.message : "Erro desconhecido") +
          ` [traceId: ${traceId}]`
      )
      setStep("upload")
      setUploading(false)
    } finally {
      clearInterval(interval)
      logOcrTrace(traceId, "process.end", "Fluxo de processamento finalizado")
    }
  }

  const reset = () => {
    setFile(null)
    setStep("upload")
    setProgress(0)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!uploading) {
          onOpenChange(val)
          if (!val) reset()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-orange-500" />
            Importar Precatorio (OCR)
          </DialogTitle>
          <DialogDescription>Envie o PDF do Oficio ou precatorio para extracao automatica dos dados.</DialogDescription>
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
                  <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-500 h-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFile(null)
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <>
                  <div className="bg-muted p-3 rounded-full mb-3">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm text-foreground">Arraste ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1 px-4">Suporta PDF (OCR) e Excel. Tamanho maximo: 25MB.</p>
                </>
              )}
            </div>
          )}

          {step === "processing" && (
            <div className="space-y-4 text-center py-4">
              <div className="relative mx-auto w-16 h-16">
                <Loader2 className="h-16 w-16 animate-spin text-orange-500/30" />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-xs">{progress}%</div>
              </div>
              <div className="space-y-1">
                <h3 className="font-medium">Processando Arquivo...</h3>
                <p className="text-xs text-muted-foreground">Extraindo informacoes e identificando campos.</p>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "upload" && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                <Button type="button" onClick={() => handleProcess("regex")} disabled={!file} variant="secondary" className="border">
                  OCR (Basico)
                </Button>
                <Button
                  type="button"
                  onClick={() => handleProcess("ai")}
                  disabled={!file}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex gap-2 items-center"
                >
                  <span className="text-xs">AI</span>
                  OCR avancado
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

