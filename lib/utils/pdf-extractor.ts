// =====================================================
// Extrator de Texto de PDFs
// =====================================================

/**
 * Extrai texto de um PDF
 * Nota: Para produção, considere usar uma biblioteca como pdf-parse
 * Por enquanto, retorna placeholder para implementação futura
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  // TODO: Implementar extração real com pdf-parse ou similar
  // npm install pdf-parse
  
  console.warn('[PDF] Extração de texto não implementada. Use Gemini Vision para PDFs.')
  
  return ''
}

/**
 * Converte PDF para base64 para enviar ao Gemini Vision
 */
export function pdfToBase64(pdfBuffer: Buffer): string {
  return pdfBuffer.toString('base64')
}

/**
 * Baixa arquivo do Supabase Storage
 */
export async function downloadFromStorage(storagePath: string): Promise<Buffer> {
  // TODO: Implementar download do Supabase Storage
  // const { data, error } = await supabase.storage.from('bucket').download(path)
  
  throw new Error('Download do storage não implementado')
}
