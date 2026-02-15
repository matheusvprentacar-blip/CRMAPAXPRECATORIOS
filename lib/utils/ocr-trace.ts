type OcrTraceLevel = "info" | "warn" | "error"

export type OcrTraceEntry = {
  traceId: string
  timestamp: string
  level: OcrTraceLevel
  stage: string
  message: string
  details?: unknown
}

const STORAGE_KEY = "ocr_trace_logs"
const MAX_LOGS = 300
let pendingEntries: OcrTraceEntry[] = []
let flushScheduled = false

function toSerializable(details: unknown): unknown {
  if (details === undefined) return undefined
  try {
    return JSON.parse(JSON.stringify(details))
  } catch {
    return String(details)
  }
}

function flushToStorage(): void {
  if (typeof window === "undefined") return
  if (pendingEntries.length === 0) return
  const entries = pendingEntries
  pendingEntries = []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as OcrTraceEntry[]) : []
    const merged = parsed.concat(entries).slice(-MAX_LOGS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {
    // no-op
  }
}

function scheduleFlush(): void {
  if (typeof window === "undefined") return
  if (flushScheduled) return
  flushScheduled = true

  const run = () => {
    flushScheduled = false
    flushToStorage()
  }

  const withIdle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void })
    .requestIdleCallback
  if (withIdle) {
    withIdle(run, { timeout: 1200 })
  } else {
    setTimeout(run, 0)
  }
}

function pushToStorage(entry: OcrTraceEntry): void {
  if (typeof window === "undefined") return
  pendingEntries.push(entry)
  if (pendingEntries.length >= 20) {
    flushToStorage()
    return
  }
  scheduleFlush()
}

export function createOcrTraceId(): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `ocr-${Date.now()}-${random}`
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const extended = error as Error & { cause?: unknown; code?: unknown }
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: toSerializable(extended.cause),
      code: extended.code,
    }
  }
  return {
    value: toSerializable(error),
  }
}

export function logOcrTrace(
  traceId: string,
  stage: string,
  message: string,
  details?: unknown,
  level: OcrTraceLevel = "info"
): void {
  const entry: OcrTraceEntry = {
    traceId,
    timestamp: new Date().toISOString(),
    level,
    stage,
    message,
    details: toSerializable(details),
  }

  const prefix = `[OCR_TRACE][${traceId}][${stage}] ${message}`
  if (level === "error") {
    console.error(prefix, entry.details ?? {})
  } else if (level === "warn") {
    console.warn(prefix, entry.details ?? {})
  } else {
    console.info(prefix, entry.details ?? {})
  }

  pushToStorage(entry)
}

export function getOcrTraceLogs(limit = 100): OcrTraceEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as OcrTraceEntry[]) : []
    return parsed.slice(-Math.max(1, limit))
  } catch {
    return []
  }
}
