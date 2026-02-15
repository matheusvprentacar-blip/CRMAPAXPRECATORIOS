import * as XLSX from "xlsx"
import { extrairDadosDeTexto } from "@/lib/extrair-dados"

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

  // IA desativada por decisao de produto: fluxo usa apenas OCR/regex local.
  const regexData = mapRegexData(text)
  if (method === "ai") {
    regexData.raw_text = regexData.raw_text || text.substring(0, 3000)
    return regexData
  }
  return regexData
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
