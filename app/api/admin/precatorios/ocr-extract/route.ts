import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { extractPdfWithRobustPipeline, type OcrMode } from "@/lib/server/ocr-pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VALID_MODES: OcrMode[] = ["auto", "fast", "premium"]

function parseMode(raw: unknown): OcrMode {
  const mode = String(raw || "auto").toLowerCase().trim() as OcrMode
  return VALID_MODES.includes(mode) ? mode : "auto"
}

function getTraceId(request: Request): string {
  const fromHeader = request.headers.get("x-ocr-trace-id")
  return fromHeader?.trim() || `ocr-api-${randomUUID()}`
}

function logApiTrace(
  traceId: string,
  stage: string,
  message: string,
  details?: unknown,
  level: "info" | "warn" | "error" = "info"
): void {
  const prefix = `[OCR_API][${traceId}][${stage}] ${message}`
  if (level === "error") {
    console.error(prefix, details ?? {})
  } else if (level === "warn") {
    console.warn(prefix, details ?? {})
  } else {
    console.info(prefix, details ?? {})
  }
}

export async function POST(request: Request) {
  const traceId = getTraceId(request)
  try {
    logApiTrace(traceId, "request.start", "Recebida requisicao OCR robusta")

    const formData = await request.formData()
    const file = formData.get("file")
    const ocrMode = parseMode(formData.get("ocrMode"))

    logApiTrace(traceId, "request.parsed", "FormData parseado", {
      ocrMode,
      fileType: file instanceof File ? file.type : typeof file,
      fileName: file instanceof File ? file.name : null,
      fileSize: file instanceof File ? file.size : null,
    })

    if (!(file instanceof File)) {
      logApiTrace(traceId, "request.invalid_file", "Arquivo invalido no formData", { file }, "warn")
      return NextResponse.json(
        { error: "Arquivo invalido.", traceId },
        { status: 400, headers: { "x-ocr-trace-id": traceId } }
      )
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      logApiTrace(traceId, "request.invalid_type", "Tipo de arquivo nao suportado", { fileType: file.type }, "warn")
      return NextResponse.json(
        { error: "Somente PDF e suportado nesta rota.", traceId },
        { status: 400, headers: { "x-ocr-trace-id": traceId } }
      )
    }

    const extracted = await extractPdfWithRobustPipeline(file, ocrMode, traceId)

    logApiTrace(traceId, "request.success", "Extracao OCR concluida", {
      warnings: extracted.ocr_warnings || [],
      metrics: extracted.ocr_metrics || {},
    })

    return NextResponse.json(
      {
        ok: true,
        traceId,
        data: extracted,
        warnings: extracted.ocr_warnings || [],
        metrics: extracted.ocr_metrics || {},
      },
      { headers: { "x-ocr-trace-id": traceId } }
    )
  } catch (error) {
    logApiTrace(
      traceId,
      "request.error",
      "Erro interno na extracao OCR",
      error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { error },
      "error"
    )

    const message = error instanceof Error ? error.message : "Falha interna no OCR."
    return NextResponse.json(
      {
        error: message,
        traceId,
        details: error instanceof Error ? { name: error.name, stack: error.stack } : error,
      },
      { status: 500, headers: { "x-ocr-trace-id": traceId } }
    )
  }
}
