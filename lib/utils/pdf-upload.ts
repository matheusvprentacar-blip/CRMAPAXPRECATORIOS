import { createBrowserClient } from "@/lib/supabase/client"

export interface UploadPdfResult {
  storageRef: string
  updatedPrecatorio?: any
}

export async function uploadAndAttachPdf({
  precatorioId,
  file,
}: {
  precatorioId: string
  file: File
}): Promise<UploadPdfResult> {
  if (!file) {
    throw new Error("Arquivo não informado")
  }

  if (file.type !== "application/pdf") {
    throw new Error("Envie apenas arquivos PDF")
  }

  // Limite de 20MB
  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error("O arquivo deve ter no máximo 20MB")
  }

  const supabase = createBrowserClient()
  if (!supabase) {
    throw new Error("Supabase não configurado (URL/KEY ausentes)")
  }
  const bucket = "precatorios-pdf"

  // Sanitizar nome do arquivo
  const safeName = file.name.replace(/[^\w.-]+/g, "_")
  const filePath = `precatorios/${precatorioId}/${Date.now()}-${safeName}`

  console.log("[v0] Uploading PDF to:", filePath)

  // 1) Upload para o Storage
  const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, file, {
    upsert: true,
    contentType: "application/pdf",
  })

  if (upErr) {
    console.error("[v0] Upload error:", upErr)
    throw new Error(`Erro ao fazer upload: ${upErr.message}`)
  }

  // 2) Criar referência estável (não signed URL que expira)
  const storageRef = `storage:${bucket}/${filePath}`

  console.log("[v0] Calling attach_precatorio_pdf RPC with:", {
    p_precatorio_id: precatorioId,
    p_pdf_url: storageRef,
  })

  // 3) Vincular ao precatório via RPC
  const { data, error: rpcErr } = await supabase.rpc("attach_precatorio_pdf", {
    p_precatorio_id: precatorioId,
    p_pdf_url: storageRef,
  })

  if (rpcErr) {
    console.error("[v0] RPC error:", rpcErr)
    throw new Error(`Erro ao vincular PDF: ${rpcErr.message}`)
  }

  console.log("[v0] PDF attached successfully:", data)

  return { storageRef, updatedPrecatorio: data }
}

export async function getPdfViewerUrl(pdfUrl: string | null): Promise<string | null> {
  if (!pdfUrl) return null

  // Se começar com storage:, gerar signed URL
  if (pdfUrl.startsWith("storage:")) {
    const supabase = createBrowserClient()
  if (!supabase) {
    throw new Error("Supabase não configurado (URL/KEY ausentes)")
  }

    // Parse: storage:precatorios-pdf/precatorios/xxx/file.pdf
    const match = pdfUrl.match(/^storage:([^/]+)\/(.+)$/)
    if (!match) {
      console.error("[v0] Invalid storage reference:", pdfUrl)
      return null
    }

    const [, bucket, path] = match

    console.log("[v0] Generating signed URL for:", { bucket, path })

    // Gerar signed URL válida por 1 hora
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)

    if (error) {
      console.error("[v0] Error generating signed URL:", error)
      return null
    }

    return data?.signedUrl || null
  }

  // Se já for uma URL, retornar direto
  return pdfUrl
}
