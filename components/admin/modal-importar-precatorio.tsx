import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Loader2 } from "@/components/icons"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from "@/lib/supabase/client"
import { createOcrTraceId, logOcrTrace, serializeError } from "@/lib/utils/ocr-trace"
import { processFileWithAI } from "@/lib/client-extractor"

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

function canCallServerApiFromBrowser(): boolean {
  if (typeof window === "undefined") return true
  const protocol = window.location.protocol
  return protocol === "http:" || protocol === "https:"
}

async function extractPdfWithRobustPipeline(
  file: File,
  mode: "auto" | "fast" = "auto",
  traceId?: string
): Promise<RobustOcrResult> {
  if (!canCallServerApiFromBrowser()) {
    const error = "API OCR robusta indisponivel neste ambiente. Usando fallback local."
    logOcrTrace(traceId || "sem-trace", "robust.unavailable_runtime", error, {
      protocol: typeof window !== "undefined" ? window.location.protocol : "unknown",
    }, "warn")
    return { ok: false, error, traceId }
  }

  const form = new FormData()
  form.append("file", file)
  form.append("ocrMode", mode)

  logOcrTrace(traceId || "sem-trace", "robust.request", "Enviando arquivo para API OCR robusta", {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    mode,
  })

  let response: Response
  try {
    response = await fetch("/api/admin/precatorios/ocr-extract", {
      method: "POST",
      body: form,
      headers: {
        Accept: "application/json",
        ...(traceId ? { "x-ocr-trace-id": traceId } : {}),
      },
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Falha de rede ao chamar API OCR robusta."
    logOcrTrace(
      traceId || "sem-trace",
      "robust.fetch_error",
      "Falha de rede ao chamar endpoint OCR robusto",
      serializeError(error),
      "warn"
    )
    return {
      ok: false,
      error: `Falha ao conectar com API OCR robusta: ${errorMessage}`,
      traceId,
    }
  }

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
    }, "warn")
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
    }, "warn")
    return { ok: false, error, traceId: responseTraceId, status: response.status }
  }

  if (!response.ok || !payload.ok || !payload.data) {
    const error = payload.error || "Falha na extracao robusta do PDF."
    logOcrTrace(payload.traceId || responseTraceId || "sem-trace", "robust.api_error", error, {
      status: response.status,
      payload,
    }, "warn")
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

  const handleProcess = async () => {
    if (!file) return
    const traceId = createOcrTraceId()
    logOcrTrace(traceId, "process.start", "Iniciando processamento de importacao", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      extractionMode: "ocr_only",
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
      const fileExt = file.name.split(".").pop() || (isPdfFile(file) ? "pdf" : "bin")
      const fileName = `${Date.now()}.${fileExt}`
      let uploadSucceeded = false

      if (!supabase) {
        logOcrTrace(traceId, "upload.skipped", "Supabase client indisponivel. Seguindo sem upload.", {}, "warn")
      } else {
        try {
          const { error: uploadError } = await supabase.storage.from("ocr-uploads").upload(fileName, file)
          if (uploadError) {
            logOcrTrace(traceId, "upload.warning", "Falha no upload para storage (seguindo com extracao)", uploadError, "warn")
          } else {
            uploadSucceeded = true
            logOcrTrace(traceId, "upload.success", "Upload no storage concluido", { fileName })
          }
        } catch (error) {
          logOcrTrace(
            traceId,
            "upload.fetch_error",
            "Erro de rede no upload para storage (seguindo com extracao)",
            serializeError(error),
            "warn"
          )
        }
      }

      let extractedData: PrecatorioData
      if (isPdfFile(file)) {
        const ocrMode = "premium" as const
        logOcrTrace(traceId, "extract.robust.start", "Tentando extracao robusta", {
          ocrMode,
          note: "Extracao sem IA, com OCR premium",
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
          extractedData = await processFileWithAI(file, "regex")
          logOcrTrace(traceId, "extract.local.success", "Fallback local finalizado")
        }
      } else {
        logOcrTrace(traceId, "extract.local.start", "Arquivo nao-PDF, usando extracao local")
        extractedData = await processFileWithAI(file, "regex")
        logOcrTrace(traceId, "extract.local.success", "Extracao local finalizada")
      }

      if (supabase && uploadSucceeded) {
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
      try {
        onExtracted?.(extractedData)
      } catch (callbackError) {
        logOcrTrace(
          traceId,
          "callback.onExtracted.error",
          "Callback onExtracted falhou (ignorando para nao quebrar UX)",
          serializeError(callbackError),
          "warn"
        )
      }
      try {
        onSuccess?.()
      } catch (callbackError) {
        logOcrTrace(
          traceId,
          "callback.onSuccess.error",
          "Callback onSuccess falhou (ignorando para nao quebrar UX)",
          serializeError(callbackError),
          "warn"
        )
      }

      setStep("upload")
      setFile(null)
      setProgress(0)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (file) {
        logOcrTrace(
          traceId,
          "process.final_fallback",
          "Erro no processamento. Tentando fallback local final (regex).",
          serializeError(error),
          "warn"
        )
        try {
          const extractedData = await processFileWithAI(file, "regex")
          setProgress(100)
          toast.warning("Conexao com API indisponivel. Dados extraidos no modo local (regex).")
          try {
            onExtracted?.(extractedData)
          } catch (callbackError) {
            logOcrTrace(
              traceId,
              "callback.onExtracted.error",
              "Callback onExtracted falhou no fallback final (ignorando)",
              serializeError(callbackError),
              "warn"
            )
          }
          try {
            onSuccess?.()
          } catch (callbackError) {
            logOcrTrace(
              traceId,
              "callback.onSuccess.error",
              "Callback onSuccess falhou no fallback final (ignorando)",
              serializeError(callbackError),
              "warn"
            )
          }
          setStep("upload")
          setFile(null)
          setUploading(false)
          setProgress(0)
          return
        } catch (fallbackError) {
          logOcrTrace(
            traceId,
            "process.final_fallback_error",
            "Fallback local final falhou",
            serializeError(fallbackError),
            "error"
          )
        }
      }

      const serialized = serializeError(error)
      logOcrTrace(traceId, "process.error", "Erro fatal no processamento", serialized, "error")
      const friendlyMessage = /failed to fetch|networkerror/i.test(message)
        ? "Falha de conexao com servicos de extracao. Tente novamente."
        : message
      toast.error(
        "Erro ao processar arquivo: " +
          friendlyMessage +
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
            <Upload className="h-5 w-5 text-primary" />
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
                                ${dragging ? "border-primary/40 bg-primary/15" : "border-muted-foreground/25 hover:bg-muted/50"}
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
                  <div className="bg-primary/15 p-3 rounded-full mb-3">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-destructive h-8"
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
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
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
                <Button
                  type="button"
                  onClick={() => handleProcess()}
                  disabled={!file}
                  className="bg-primary/15 hover:bg-primary/15 text-white flex gap-2 items-center"
                >
                  OCR Premium
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

