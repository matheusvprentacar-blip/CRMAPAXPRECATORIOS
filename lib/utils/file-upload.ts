import { createBrowserClient } from "@/lib/supabase/client"

export interface UploadFileResult {
    storageRef: string
    publicUrl?: string
}

type SupabaseBrowserClient = NonNullable<ReturnType<typeof createBrowserClient>>

const MIME_TO_EXTENSION: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/svg+xml": "svg",
    "text/plain": "txt",
    "text/csv": "csv",
    "text/html": "html",
    "application/json": "json",
    "application/xml": "xml",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
}

const EXTENSION_TO_MIME: Record<string, string> = Object.fromEntries(
    Object.entries(MIME_TO_EXTENSION).map(([mime, extension]) => [extension, mime])
)

const sanitizeFileName = (value: string): string => {
    const cleaned = value
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
    return cleaned || "arquivo"
}

const safeDecode = (value: string): string => {
    try {
        return decodeURIComponent(value)
    } catch {
        return value
    }
}

const normalizeMimeType = (value?: string | null): string | null => {
    if (!value) return null
    const normalized = value.split(";")[0]?.trim().toLowerCase()
    return normalized || null
}

const stripQueryAndHash = (value: string): string => value.split("#")[0].split("?")[0]

const getBaseNameWithoutExtension = (value: string): string => {
    const cleaned = stripQueryAndHash(value).trim()
    const lastDot = cleaned.lastIndexOf(".")
    if (lastDot <= 0) return cleaned
    return cleaned.slice(0, lastDot)
}

const isValidExtension = (value: string): boolean => /^[a-z0-9]{1,10}$/i.test(value)

export function getExtensionFromFileName(fileName?: string | null): string | null {
    if (!fileName) return null
    const cleaned = stripQueryAndHash(fileName.trim())
    const lastDot = cleaned.lastIndexOf(".")
    if (lastDot <= 0 || lastDot >= cleaned.length - 1) return null
    const extension = cleaned.slice(lastDot + 1).toLowerCase()
    if (!isValidExtension(extension)) return null
    return extension
}

export function getExtensionFromMimeType(mimeType?: string | null): string | null {
    const normalized = normalizeMimeType(mimeType)
    if (!normalized) return null
    return MIME_TO_EXTENSION[normalized] || null
}

export function getMimeTypeFromFileName(fileName?: string | null): string | null {
    const extension = getExtensionFromFileName(fileName)
    if (!extension) return null
    return EXTENSION_TO_MIME[extension] || null
}

const parseContentDispositionFileName = (headerValue?: string | null): string | null => {
    if (!headerValue) return null

    const filenameStarMatch = headerValue.match(/filename\*\s*=\s*(?:UTF-8''|)([^;]+)/i)
    if (filenameStarMatch?.[1]) {
        const raw = filenameStarMatch[1].trim().replace(/^["']|["']$/g, "")
        const decoded = safeDecode(raw)
        return decoded ? sanitizeFileName(decoded) : null
    }

    const filenameMatch = headerValue.match(/filename\s*=\s*("?)([^";]+)\1/i)
    if (filenameMatch?.[2]) {
        const raw = filenameMatch[2].trim().replace(/^["']|["']$/g, "")
        const decoded = safeDecode(raw)
        return decoded ? sanitizeFileName(decoded) : null
    }

    return null
}

export function extractFileNameFromReference(reference?: string | null): string | null {
    if (!reference) return null
    const raw = reference.trim()
    if (!raw) return null

    if (raw.startsWith("storage:")) {
        const match = raw.match(/^storage:[^/]+\/(.+)$/)
        if (match?.[1]) {
            const fileName = safeDecode(match[1].split("/").pop() || "")
            return fileName ? sanitizeFileName(fileName) : null
        }
        return null
    }

    if (/^https?:\/\//i.test(raw)) {
        try {
            const parsed = new URL(raw)

            const contentDispositionName = parseContentDispositionFileName(
                parsed.searchParams.get("response-content-disposition")
            )
            if (contentDispositionName) return contentDispositionName

            for (const key of ["filename", "fileName", "name", "download", "file"]) {
                const candidate = parsed.searchParams.get(key)
                if (!candidate) continue
                const decoded = safeDecode(candidate.trim())
                if (decoded) return sanitizeFileName(decoded)
            }

            const pathParts = parsed.pathname.split("/").filter(Boolean)
            const lastSegment = pathParts.length > 0 ? safeDecode(pathParts[pathParts.length - 1]) : ""
            if (lastSegment) return sanitizeFileName(lastSegment)
            return null
        } catch {
            return null
        }
    }

    const cleaned = stripQueryAndHash(raw)
    const pathParts = cleaned.split("/").filter(Boolean)
    const lastSegment = pathParts.length > 0 ? safeDecode(pathParts[pathParts.length - 1]) : safeDecode(cleaned)
    return lastSegment ? sanitizeFileName(lastSegment) : null
}

export function buildDownloadFileName({
    preferredName,
    sourceFileName,
    sourceUrl,
    mimeType,
    fallbackName = "arquivo",
}: {
    preferredName?: string | null
    sourceFileName?: string | null
    sourceUrl?: string | null
    mimeType?: string | null
    fallbackName?: string
}): string {
    const preferred = preferredName?.trim() || ""
    const source = sourceFileName?.trim() || ""
    const sourceFromUrl = extractFileNameFromReference(sourceUrl) || ""

    const extension =
        getExtensionFromFileName(source) ||
        getExtensionFromFileName(sourceFromUrl) ||
        getExtensionFromFileName(preferred) ||
        getExtensionFromMimeType(mimeType)

    const baseNameRaw =
        getBaseNameWithoutExtension(preferred) ||
        getBaseNameWithoutExtension(source) ||
        getBaseNameWithoutExtension(sourceFromUrl) ||
        fallbackName

    const baseName = sanitizeFileName(baseNameRaw)
    return extension ? `${baseName}.${extension}` : baseName
}

export interface DownloadFileMetadataResult {
    buffer: ArrayBuffer
    mimeType: string | null
    fileName: string | null
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
export async function downloadFileAsArrayBuffer(
    url: string,
    supabase: SupabaseBrowserClient,
    itemName: string = "arquivo"
): Promise<ArrayBuffer | null> {
    const downloaded = await downloadFileWithMetadata(url, supabase, itemName)
    return downloaded?.buffer || null
}

// Helper robusto para baixar arquivos com metadados (nome e MIME do arquivo)
export async function downloadFileWithMetadata(
    url: string,
    supabase: SupabaseBrowserClient,
    itemName: string = "arquivo"
): Promise<DownloadFileMetadataResult | null> {
    try {
        // 1. Tentar URL Storage direta
        if (url.startsWith("storage:")) {
            const match = url.match(/^storage:([^/]+)\/(.+)$/)
            if (match) {
                const [, bucket, path] = match
                const { data, error } = await supabase.storage.from(bucket).download(path)
                if (!error && data) {
                    return {
                        buffer: await data.arrayBuffer(),
                        mimeType: normalizeMimeType(data.type),
                        fileName: extractFileNameFromReference(url),
                    }
                }
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
            return {
                buffer: await response.arrayBuffer(),
                mimeType: normalizeMimeType(response.headers.get("content-type")),
                fileName:
                    parseContentDispositionFileName(response.headers.get("content-disposition")) ||
                    extractFileNameFromReference(response.url || finalUrl),
            }
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
                            if (!error && data) {
                                return {
                                    buffer: await data.arrayBuffer(),
                                    mimeType: normalizeMimeType(data.type),
                                    fileName: extractFileNameFromReference(filePath),
                                }
                            }
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
