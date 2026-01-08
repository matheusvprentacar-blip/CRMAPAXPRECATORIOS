// =====================================================
// Parser de Excel para Importação de Precatórios
// =====================================================

import * as XLSX from 'xlsx'

export interface ExcelData {
  sheets: string[]
  data: any[][]
  headers?: string[]
  orientation: 'rows' | 'columns' | 'unknown'
}

/**
 * Lê arquivo Excel e retorna dados estruturados
 */
export async function parseExcelFile(file: File): Promise<ExcelData> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  
  // Pegar primeira planilha
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  // Converter para array
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
  
  // Detectar orientação
  const orientation = detectOrientation(data)
  
  // Detectar cabeçalhos
  const headers = detectHeaders(data, orientation)
  
  return {
    sheets: workbook.SheetNames,
    data,
    headers,
    orientation,
  }
}

/**
 * Detecta se dados estão em linhas ou colunas
 */
function detectOrientation(data: any[][]): 'rows' | 'columns' | 'unknown' {
  if (data.length === 0) return 'unknown'
  
  const numRows = data.length
  const numCols = data[0]?.length || 0
  
  // Se tem mais linhas que colunas, provavelmente é por linhas
  if (numRows > numCols * 2) return 'rows'
  
  // Se tem mais colunas que linhas, provavelmente é por colunas
  if (numCols > numRows * 2) return 'columns'
  
  // Verificar se primeira linha parece cabeçalho
  const firstRow = data[0]
  const hasTextHeaders = firstRow.every((cell: any) => typeof cell === 'string')
  
  if (hasTextHeaders) return 'rows'
  
  // Verificar se primeira coluna parece cabeçalho
  const firstCol = data.map(row => row[0])
  const hasTextLabels = firstCol.every((cell: any) => typeof cell === 'string')
  
  if (hasTextLabels) return 'columns'
  
  return 'unknown'
}

/**
 * Detecta cabeçalhos
 */
function detectHeaders(data: any[][], orientation: string): string[] | undefined {
  if (data.length === 0) return undefined
  
  if (orientation === 'rows') {
    // Primeira linha são os cabeçalhos
    return data[0].map((cell: any) => String(cell || ''))
  }
  
  if (orientation === 'columns') {
    // Primeira coluna são os cabeçalhos
    return data.map(row => String(row[0] || ''))
  }
  
  return undefined
}

/**
 * Converte dados do Excel para formato estruturado
 */
export function excelToStructured(excelData: ExcelData): any[] {
  const { data, orientation, headers } = excelData
  
  if (orientation === 'rows') {
    return rowsToObjects(data, headers)
  }
  
  if (orientation === 'columns') {
    return columnsToObjects(data, headers)
  }
  
  // Tentar ambos e retornar o que fizer mais sentido
  const rowsResult = rowsToObjects(data, headers)
  const colsResult = columnsToObjects(data, headers)
  
  return rowsResult.length > colsResult.length ? rowsResult : colsResult
}

/**
 * Converte linhas para objetos
 */
function rowsToObjects(data: any[][], headers?: string[]): any[] {
  if (data.length < 2) return []
  
  const headerRow = headers || data[0]
  const dataRows = headers ? data : data.slice(1)
  
  return dataRows.map(row => {
    const obj: any = {}
    headerRow.forEach((header: string, index: number) => {
      obj[header] = row[index]
    })
    return obj
  })
}

/**
 * Converte colunas para objetos
 */
function columnsToObjects(data: any[][], headers?: string[]): any[] {
  if (data.length === 0 || data[0].length < 2) return []
  
  const numObjects = data[0].length - 1
  const objects: any[] = []
  
  for (let i = 1; i <= numObjects; i++) {
    const obj: any = {}
    data.forEach(row => {
      const key = String(row[0] || '')
      const value = row[i]
      if (key) obj[key] = value
    })
    objects.push(obj)
  }
  
  return objects
}

/**
 * Converte Excel para CSV (para enviar ao Gemini)
 */
export function excelToCSV(data: any[][]): string {
  return data
    .map(row => row.map(cell => `"${String(cell || '')}"`).join(','))
    .join('\n')
}

/**
 * Valida arquivo Excel
 */
export function validateExcelFile(file: File): { valid: boolean; error?: string } {
  // Verificar extensão
  const validExtensions = ['.xlsx', '.xls', '.csv']
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  
  if (!validExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'Formato inválido. Use .xlsx, .xls ou .csv',
    }
  }
  
  // Verificar tamanho (máx 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Arquivo muito grande. Máximo 10MB',
    }
  }
  
  return { valid: true }
}
