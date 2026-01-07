import { createBrowserClient } from "@/lib/supabase/client"

export async function uploadPrecatorioPdf(file: File, precatorioId: string): Promise<string> {
  const supabase = createBrowserClient()
  const bucket = "precatorios-pdf"
  const filePath = `precatorios/${precatorioId}/${Date.now()}-${file.name}`

  console.log("[PDF UPLOAD] Starting upload:", { precatorioId, fileName: file.name, filePath })

  // 1) Upload do arquivo
  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
    upsert: true,
    contentType: "application/pdf",
  })

  if (uploadError) {
    console.error("[PDF UPLOAD] Upload error:", uploadError)
    throw new Error(`Erro ao fazer upload: ${uploadError.message}`)
  }

  console.log("[PDF UPLOAD] Upload successful")

  // 2) Salvar o PATH (não a URL assinada, pois expira)
  const storagePath = `storage:${bucket}/${filePath}`

  // 3) Atualizar o precatório no banco
  const { error: dbError } = await supabase
    .from("precatorios")
    .update({ pdf_url: storagePath, updated_at: new Date().toISOString() })
    .eq("id", precatorioId)

  if (dbError) {
    console.error("[PDF UPLOAD] Database update error:", dbError)
    throw new Error(`Erro ao vincular PDF: ${dbError.message}`)
  }

  console.log("[PDF UPLOAD] Database updated with path:", storagePath)

  return storagePath
}

export async function getPdfSignedUrl(storagePath: string): Promise<string | null> {
  if (!storagePath || !storagePath.startsWith("storage:")) {
    // Se for uma URL direta, retorna ela mesma
    return storagePath
  }

  const supabase = createBrowserClient()

  // Parse: "storage:precatorios-pdf/precatorios/123/file.pdf"
  const pathWithoutPrefix = storagePath.replace("storage:", "")
  const [bucket, ...pathParts] = pathWithoutPrefix.split("/")
  const filePath = pathParts.join("/")

  console.log("[PDF VIEWER] Generating signed URL:", { bucket, filePath })

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600) // 1 hora

  if (error) {
    console.error("[PDF VIEWER] Signed URL error:", error)
    return null
  }

  console.log("[PDF VIEWER] Signed URL generated successfully")
  return data.signedUrl
}
