import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { promises as fs } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

export type OcrMode = "auto" | "fast" | "premium"

type PipelineField = {
  value: string | number | null
}

type PipelineRow = {
  warnings?: string[]
  fields?: Record<string, PipelineField>
  metrics?: Record<string, unknown>
  text_layer?: Record<string, unknown>
  debug_preview?: {
    page_1_lines?: string[]
  }
}

export type PipelineExtractedData = {
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
  raw_text?: string
  ocr_warnings?: string[]
  ocr_metrics?: Record<string, unknown>
  ocr_text_layer?: Record<string, unknown>
}

type ExecResult = {
  stdout: string
  stderr: string
}

function logServerTrace(
  traceId: string,
  stage: string,
  message: string,
  details?: unknown,
  level: "info" | "warn" | "error" = "info"
): void {
  const prefix = `[OCR_PIPELINE][${traceId}][${stage}] ${message}`
  if (level === "error") {
    console.error(prefix, details ?? {})
  } else if (level === "warn") {
    console.warn(prefix, details ?? {})
  } else {
    console.info(prefix, details ?? {})
  }
}

function resolvePythonCandidates(): string[] {
  const root = process.cwd()
  const envPython = process.env.PRECATORIO_OCR_PYTHON

  const candidates = [
    envPython,
    path.join(root, ".venv_ocr", "Scripts", "python.exe"),
    path.join(root, ".venv_ocr", "bin", "python"),
    path.join(root, ".venv", "Scripts", "python.exe"),
    "python",
  ]

  return candidates.filter((candidate): candidate is string => Boolean(candidate))
}

function runCommand(command: string, args: string[], cwd: string, timeoutMs = 120_000): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      env: process.env,
    })

    let stdout = ""
    let stderr = ""
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, timeoutMs)

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk)
    })
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (timedOut) {
        reject(new Error(`Timeout executando OCR (${timeoutMs}ms)`))
        return
      }
      if (code !== 0) {
        reject(new Error(`OCR falhou com codigo ${code}. stderr: ${stderr || "<vazio>"}`))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

async function runPipelineWithBestPython(
  pdfPath: string,
  outPath: string,
  ocrMode: OcrMode,
  traceId: string
): Promise<void> {
  const candidates = resolvePythonCandidates()
  const args = ["-m", "precatorio_ocr_pipeline", pdfPath, "--out", outPath, "--ocr-mode", ocrMode, "--workers", "1"]

  logServerTrace(traceId, "pipeline.exec.start", "Tentando executar pipeline OCR", {
    candidates,
    args,
    cwd: process.cwd(),
  })

  let lastError: unknown
  for (const pythonCmd of candidates) {
    try {
      logServerTrace(traceId, "pipeline.exec.try", "Tentativa de execucao", { pythonCmd })
      await runCommand(pythonCmd, args, process.cwd())
      logServerTrace(traceId, "pipeline.exec.ok", "Execucao concluida", { pythonCmd })
      return
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      logServerTrace(traceId, "pipeline.exec.fail", "Tentativa falhou", { pythonCmd, message }, "warn")

      const shouldTryNext =
        message.includes("ENOENT") ||
        message.includes("No module named") ||
        message.includes("not recognized as an internal or external command")

      if (!shouldTryNext) {
        throw error
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Nao foi possivel executar o pipeline OCR.")
}

function asString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim()
  return text || undefined
}

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === "number" && Number.isFinite(value)) return value

  const raw = String(value).trim()
  if (!raw) return undefined

  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function mapPipelineRowToExtracted(row: PipelineRow): PipelineExtractedData {
  const fields = row.fields || {}
  const pageLines = Array.isArray(row.debug_preview?.page_1_lines) ? row.debug_preview?.page_1_lines : []
  const warnings = Array.isArray(row.warnings) ? row.warnings : []
  const metrics = row.metrics || {}
  const textLayer = row.text_layer || {}

  const getValue = (key: string) => fields[key]?.value
  const rawBlocks: string[] = []

  const mode = asString(metrics["ocr_mode_effective"])
  const engines = Array.isArray(metrics["engines_used"]) ? metrics["engines_used"].map(String).join(", ") : ""
  if (mode || engines) rawBlocks.push(`[OCR mode=${mode || "n/a"} engines=${engines || "n/a"}]`)
  if (pageLines.length > 0) rawBlocks.push(pageLines.join("\n"))
  if (warnings.length > 0) rawBlocks.push(`Warnings: ${warnings.join(", ")}`)

  return {
    credor_nome: asString(getValue("credor_nome")),
    advogado_nome: asString(getValue("advogado_nome")),
    valor_principal: asNumber(getValue("valor_principal")),
    numero_precatorio: asString(getValue("numero_precatorio")),
    numero_oficio: asString(getValue("numero_oficio")),
    tribunal: asString(getValue("tribunal")),
    credor_cpf_cnpj: asString(getValue("credor_cpf_cnpj")),
    numero_processo: asString(getValue("numero_processo")),
    natureza: asString(getValue("natureza")),
    data_expedicao: asString(getValue("data_expedicao")),
    raw_text: rawBlocks.join("\n\n").trim() || undefined,
    ocr_warnings: warnings,
    ocr_metrics: metrics,
    ocr_text_layer: textLayer,
  }
}

export async function extractPdfWithRobustPipeline(
  file: File,
  ocrMode: OcrMode = "auto",
  traceId?: string
): Promise<PipelineExtractedData> {
  const runId = randomUUID()
  const effectiveTraceId = traceId || `ocr-pipeline-${runId}`
  const workDir = path.join(tmpdir(), "crm-precatorios-ocr", runId)
  const inputPath = path.join(workDir, file.name || "documento.pdf")
  const outPath = path.join(workDir, "output.jsonl")

  logServerTrace(effectiveTraceId, "pipeline.start", "Iniciando extracao OCR no servidor", {
    runId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    ocrMode,
    workDir,
  })

  await fs.mkdir(workDir, { recursive: true })
  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(inputPath, bytes)
    logServerTrace(effectiveTraceId, "pipeline.file_written", "Arquivo temporario salvo", {
      inputPath,
      bytes: bytes.length,
    })

    await runPipelineWithBestPython(inputPath, outPath, ocrMode, effectiveTraceId)

    const content = await fs.readFile(outPath, "utf-8")
    const firstLine = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)

    if (!firstLine) {
      throw new Error("Pipeline OCR nao retornou linhas no JSONL de saida.")
    }

    const parsed = JSON.parse(firstLine) as PipelineRow
    const mapped = mapPipelineRowToExtracted(parsed)
    logServerTrace(effectiveTraceId, "pipeline.success", "Extracao OCR concluida", {
      warnings: mapped.ocr_warnings || [],
      metrics: mapped.ocr_metrics || {},
    })
    return mapped
  } catch (error) {
    logServerTrace(
      effectiveTraceId,
      "pipeline.error",
      "Falha na extracao OCR do servidor",
      error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { error },
      "error"
    )
    throw error
  } finally {
    await fs.rm(workDir, { recursive: true, force: true })
    logServerTrace(effectiveTraceId, "pipeline.cleanup", "Diretorio temporario removido", { workDir })
  }
}
