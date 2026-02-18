import { createBrowserClient } from "@/lib/supabase/client"

export interface UploadPdfResult {
  storageRef: string
  updatedPrecatorio?: unknown
}

function isPdfFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase()
  const name = (file.name || "").toLowerCase()
  return mime === "application/pdf" || name.endsWith(".pdf")
}

export async function uploadAndAttachPdf({
  precatorioId,
  file,
}: {
  precatorioId: string
  file: File
}): Promise<UploadPdfResult> {
  if (!file) {
    throw new Error("Arquivo nao informado")
  }

  if (!isPdfFile(file)) {
    throw new Error("Envie apenas arquivos PDF")
  }

  // Limite de 20MB
  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error("O arquivo deve ter no maximo 20MB")
  }

  const supabase = createBrowserClient()
  if (!supabase) {
    throw new Error("Supabase nao configurado (URL/KEY ausentes)")
  }

  const safeName = file.name.replace(/[^\w.-]+/g, "_")
  const filePath = `precatorios/${precatorioId}/${Date.now()}-${safeName}`
  const uploadBuckets = ["precatorios-pdf", "ocr-uploads"]

  console.log("[v0] Uploading PDF to:", filePath, "buckets:", uploadBuckets)

  // 1) Upload para o Storage com fallback de bucket
  let uploadedBucket: string | null = null
  let lastUploadError: { message?: string } | null = null

  for (const bucket of uploadBuckets) {
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
      upsert: true,
      contentType: "application/pdf",
    })

    if (!error) {
      uploadedBucket = bucket
      break
    }

    lastUploadError = error
    console.warn("[v0] Upload failed in bucket:", bucket, error)
  }

  if (!uploadedBucket) {
    const message = lastUploadError?.message || "falha desconhecida no storage"
    throw new Error(`Erro ao fazer upload: ${message}`)
  }

  // 2) Criar referencia estavel (nao signed URL)
  const storageRef = `storage:${uploadedBucket}/${filePath}`

  console.log("[v0] Calling attach_precatorio_pdf RPC with:", {
    p_precatorio_id: precatorioId,
    p_pdf_url: storageRef,
  })

  // 3) Vincular ao precatorio via RPC
  const { data, error: rpcErr } = await supabase.rpc("attach_precatorio_pdf", {
    p_precatorio_id: precatorioId,
    p_pdf_url: storageRef,
  })

  if (rpcErr) {
    console.error("[v0] RPC error:", rpcErr)

    // Fallback: tenta update direto caso RPC nao exista/nao tenha permissao
    const { data: updatedRow, error: updateErr } = await supabase
      .from("precatorios")
      .update({
        pdf_url: storageRef,
        file_url: storageRef,
      })
      .eq("id", precatorioId)
      .select("id, pdf_url, updated_at")
      .single()

    if (updateErr) {
      throw new Error(
        `Erro ao vincular PDF. RPC: ${rpcErr.message}. UPDATE fallback: ${updateErr.message}`
      )
    }

    console.log("[v0] Fallback update succeeded:", updatedRow)
    return { storageRef, updatedPrecatorio: updatedRow }
  }

  console.log("[v0] PDF attached successfully:", data)
  return { storageRef, updatedPrecatorio: data }
}

export async function getPdfViewerUrl(pdfUrl: string | null): Promise<string | null> {
  if (!pdfUrl) return null

  // Se comecar com storage:, gerar signed URL
  if (pdfUrl.startsWith("storage:")) {
    const supabase = createBrowserClient()
    if (!supabase) {
      throw new Error("Supabase nao configurado (URL/KEY ausentes)")
    }

    // Parse: storage:precatorios-pdf/precatorios/xxx/file.pdf
    const match = pdfUrl.match(/^storage:([^/]+)\/(.+)$/)
    if (!match) {
      console.error("[v0] Invalid storage reference:", pdfUrl)
      return null
    }

    const [, bucket, path] = match

    console.log("[v0] Generating signed URL for:", { bucket, path })

    // Gerar signed URL valida por 1 hora
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)

    if (error) {
      console.error("[v0] Error generating signed URL:", error)
      return null
    }

    return data?.signedUrl || null
  }

  // Se ja for uma URL, retornar direto
  return pdfUrl
}
