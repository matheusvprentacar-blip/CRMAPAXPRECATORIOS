import { GoogleGenerativeAI } from "@google/generative-ai"
import * as XLSX from "xlsx"
import { extrairDadosDeTexto } from "@/lib/extrair-dados"
import { toast } from "sonner"

const PDFJS_SCRIPT_SRC = "/pdf.min.mjs"
const PDFJS_WORKER_SRC = "/pdf.worker.mjs"

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument: (params: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number
      getPage: (
        pageNumber: number
      ) => Promise<{
        getTextContent: () => Promise<{ items: unknown[] }>
      }>
    }>
  }
}

type PdfTextItem = {
  str?: string
  transform?: number[]
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib
  }
}

export interface ExtractedData {
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
}

function normalizeNatureza(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined

  const text = String(value).trim()
  if (!text) return undefined

  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

  if (normalized.includes("alimentar")) return "Alimentar"
  if (normalized.includes("comum")) return "Comum"
  return text
}

function normalizeFileName(fileName: string): string {
  return fileName.trim().toLowerCase()
}

function isPdf(file: File): boolean {
  const name = normalizeFileName(file.name)
  return file.type === "application/pdf" || name.endsWith(".pdf")
}

function isExcel(file: File): boolean {
  const name = normalizeFileName(file.name)
  return (
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel" ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  )
}

async function getPdfJs(): Promise<PdfJsLib | null> {
  if (typeof window === "undefined") return null
  if (window.pdfjsLib) return window.pdfjsLib

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = PDFJS_SCRIPT_SRC
    script.type = "module"
    script.onload = () => {
      const lib = window.pdfjsLib
      if (!lib) {
        reject(new Error("PDF.js carregado, mas window.pdfjsLib esta indefinido"))
        return
      }
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC
      resolve(lib)
    }
    script.onerror = () => reject(new Error("Falha ao carregar o script do PDF.js"))
    document.head.appendChild(script)
  })
}

function extractPageTextWithLayout(items: unknown[]): string {
  const linesByY = new Map<number, Array<{ x: number; text: string }>>()

  for (const rawItem of items) {
    const item = rawItem as PdfTextItem
    if (typeof item.str !== "string") continue

    const text = item.str.replace(/\s+/g, " ").trim()
    if (!text) continue

    const transform = Array.isArray(item.transform) ? item.transform : []
    const x = typeof transform[4] === "number" ? transform[4] : 0
    const y = typeof transform[5] === "number" ? transform[5] : 0
    const yBucket = Math.round(y / 2) * 2

    const bucketItems = linesByY.get(yBucket) || []
    bucketItems.push({ x, text })
    linesByY.set(yBucket, bucketItems)
  }

  if (linesByY.size === 0) {
    return items
      .map((rawItem) => {
        const item = rawItem as PdfTextItem
        return typeof item.str === "string" ? item.str : ""
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
  }

  const sortedLines = Array.from(linesByY.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, chunks]) =>
      chunks
        .sort((a, b) => a.x - b.x)
        .map((chunk) => chunk.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)

  return sortedLines.join("\n")
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await getPdfJs()
  if (!pdfjsLib) {
    throw new Error("PDF.js indisponivel")
  }

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise

  let fullText = ""
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const pageText = extractPageTextWithLayout(Array.isArray(textContent.items) ? textContent.items : [])
    if (pageText) {
      fullText += `${pageText}\n\n`
    }
  }

  return fullText.trim()
}

export async function extractTextFromExcel(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return ""
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return ""
  return XLSX.utils.sheet_to_csv(sheet)
}

function tryParseAiJson(rawResponse: string): Record<string, unknown> {
  const withoutMarkdownFence = rawResponse.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()
  try {
    return JSON.parse(withoutMarkdownFence)
  } catch {
    const start = withoutMarkdownFence.indexOf("{")
    const end = withoutMarkdownFence.lastIndexOf("}")
    if (start >= 0 && end > start) {
      const chunk = withoutMarkdownFence.slice(start, end + 1)
      return JSON.parse(chunk)
    }
    throw new Error("Resposta da IA nao contem JSON valido")
  }
}

export async function processFileWithAI(
  file: File,
  method: "ai" | "regex" = "ai"
): Promise<ExtractedData> {
  let text = ""
  try {
    if (isPdf(file)) {
      text = await extractTextFromPDF(file)
    } else if (isExcel(file)) {
      text = await extractTextFromExcel(file)
    } else {
      throw new Error("Tipo de arquivo nao suportado")
    }
  } catch (error) {
    console.error("Falha ao ler arquivo para extracao:", error)
    throw new Error("Falha ao ler o arquivo. Envie um PDF ou Excel valido.")
  }

  if (!text.trim()) {
    throw new Error("Nao foi possivel extrair texto do arquivo enviado.")
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY
  if (method === "regex" || !apiKey) {
    if (method === "ai" && !apiKey) {
      console.warn("Sem chave da IA. Usando extracao basica por regex.")
    }
    return mapRegexData(text)
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash-lite", "gemini-2.0-flash"]

    let aiRawResponse = ""
    let usedModel = ""
    let lastError: unknown

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const prompt = `
Voce e um assistente juridico especializado em precatorios.
Analise o texto abaixo e retorne APENAS um JSON valido com:
- credor_nome
- advogado_nome
- valor_principal (numero)
- numero_precatorio
- numero_oficio
- tribunal
- credor_cpf_cnpj
- numero_processo
- natureza (Alimentar ou Comum)
- data_expedicao (YYYY-MM-DD se possivel)

TEXTO:
"""
${text.substring(0, 30000)}
"""
`

        const result = await model.generateContent(prompt)
        const response = await result.response
        aiRawResponse = response.text()
        usedModel = modelName
        break
      } catch (error) {
        lastError = error
      }
    }

    if (!aiRawResponse) {
      throw lastError || new Error("Nenhum modelo de IA retornou resultado")
    }

    const aiData = tryParseAiJson(aiRawResponse)
    return {
      ...aiData,
      natureza: normalizeNatureza(aiData.natureza),
      raw_text: `[AI:${usedModel}]\n${text.substring(0, 3000)}`,
    } as ExtractedData
  } catch (error: unknown) {
    console.error("Falha na extracao por IA:", error)

    const regexData = mapRegexData(text)
    const message = error instanceof Error ? error.message : String(error)

    if (message.includes("429")) {
      regexData.raw_text = `IA indisponivel por limite temporario. Usando OCR basico.\n${regexData.raw_text || ""}`
      toast.error("Limite temporario da IA atingido. Usando extracao basica.")
      return regexData
    }

    regexData.raw_text = `Falha da IA: ${message}\n${regexData.raw_text || ""}`
    return regexData
  }
}

function mapRegexData(text: string): ExtractedData {
  try {
    const data = extrairDadosDeTexto(text)
    return {
      credor_nome: data.autor_credor_originario,
      advogado_nome: data.advogado_acao,
      credor_cpf_cnpj: data.cpf_cnpj,
      valor_principal: data.valor_principal_original,
      numero_precatorio: data.numero_precatorio,
      numero_oficio: data.numero_oficio_requisitorio,
      tribunal: data.tribunal,
      numero_processo: data.numero_processo,
      natureza: normalizeNatureza(data.natureza_ativo),
      data_expedicao: data.data_expedicao,
      raw_text: text.substring(0, 3000),
    }
  } catch (error) {
    console.error("Falha ao mapear regex:", error)
    return {
      raw_text: text.substring(0, 3000),
    }
  }
}
