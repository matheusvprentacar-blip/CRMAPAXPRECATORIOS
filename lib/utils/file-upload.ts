import { createBrowserClient } from "@/lib/supabase/client"

export interface UploadFileResult {
    storageRef: string
    publicUrl?: string
}

export async function uploadFile({
    file,
    bucket = "precatorios-pdf",
    pathPrefix = "documentos",
}: {
    file: File
    bucket?: string
    pathPrefix?: string
}): Promise<UploadFileResult> {
    if (!file) {
        throw new Error("Arquivo não informado")
    }

    // Limite de 20MB
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
        throw new Error("O arquivo deve ter no máximo 20MB")
    }

    const supabase = createBrowserClient()
    if (!supabase) {
        throw new Error("Supabase não configurado")
    }

    // Sanitizar nome
    const safeName = file.name.replace(/[^\w.-]+/g, "_")
    const filePath = `${pathPrefix}/${Date.now()}-${safeName}`

    // Upload
    const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, file, {
        upsert: true,
    })

    if (upErr) {
        throw new Error(`Erro ao fazer upload: ${upErr.message}`)
    }

    // Referência storage:
    const storageRef = `storage:${bucket}/${filePath}`

    return { storageRef }
}

export async function getFileDownloadUrl(storageUrl: string | null): Promise<string | null> {
    if (!storageUrl) return null

    if (storageUrl.startsWith("storage:")) {
        const supabase = createBrowserClient()
        if (!supabase) return null

        const match = storageUrl.match(/^storage:([^/]+)\/(.+)$/)
        if (!match) return null

        const [, bucket, path] = match

        // Tentar URL assinada primeiro (para privativos)
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)

        if (data?.signedUrl) {
            return data.signedUrl
        }

        if (error) {
            console.warn(`[File Download] Falha ao criar URL assinada para ${bucket}/${path}:`, error.message)
        }

        // Se falhar (ex: bucket público sem necessidade de assinatura ou RLS falhou), tentar URL pública
        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path)
        if (publicData?.publicUrl) {
            return publicData.publicUrl
        }

        return null
    }

    return storageUrl
}
