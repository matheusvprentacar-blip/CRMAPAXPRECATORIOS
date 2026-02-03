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

// Helper robusto para baixar arquivos (tempa fetch normal, fallback para API do Supabase e Proxy se necessario)
export async function downloadFileAsArrayBuffer(url: string, supabase: any, itemName: string = "arquivo"): Promise<ArrayBuffer | null> {
    try {
        // 1. Tentar URL Storage direta
        if (url.startsWith("storage:")) {
            const match = url.match(/^storage:([^/]+)\/(.+)$/)
            if (match) {
                const [, bucket, path] = match
                const { data, error } = await supabase.storage.from(bucket).download(path)
                if (!error && data) return await data.arrayBuffer()
            }
        }

        // 2. Resolver URL se não for HTTP/Blob
        let finalUrl = url
        if (!finalUrl.startsWith("http") && !finalUrl.startsWith("blob:")) {
            const resolved = await getFileDownloadUrl(finalUrl)
            if (resolved) finalUrl = resolved
        }

        // 3. Tentar Fetch direto
        try {
            const response = await fetch(finalUrl)
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return await response.arrayBuffer()
        } catch (fetchError) {
            console.warn(`Fetch falhou para ${itemName}, tentando fallback SDK...`, fetchError)

            // 4. Fallback: Se for URL do Supabase, tentar extrair bucket/path e usar SDK (bypass CORS)
            if (finalUrl.includes("/storage/v1/object/")) {
                const parts = finalUrl.split("/storage/v1/object/")
                if (parts.length > 1) {
                    let pathPart = parts[1] // public/bucket/... ou sign/bucket/...
                    // Remover prefixo de tipo (public ou sign)
                    if (pathPart.startsWith("public/")) pathPart = pathPart.substring(7)
                    else if (pathPart.startsWith("sign/")) pathPart = pathPart.substring(5)

                    const slashIndex = pathPart.indexOf("/")
                    if (slashIndex !== -1) {
                        const bucket = pathPart.substring(0, slashIndex)
                        let filePath = pathPart.substring(slashIndex + 1)
                        // Limpar query params
                        if (filePath.includes("?")) filePath = filePath.split("?")[0]

                        if (bucket && filePath) {
                            const { data, error } = await supabase.storage.from(bucket).download(decodeURIComponent(filePath))
                            if (!error && data) return await data.arrayBuffer()
                        }
                    }
                }
            }
            return null
        }
    } catch (err) {
        console.error(`Erro ao baixar ${itemName}:`, err)
        return null
    }
}
