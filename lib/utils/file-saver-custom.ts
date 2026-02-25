import { saveAs } from "file-saver"
import { getExtensionFromMimeType, getMimeTypeFromFileName } from "@/lib/utils/file-upload"

type FilePickerOptions = {
    suggestedName: string
    types?: Array<{
        description: string
        accept: Record<string, string[]>
    }>
}

type FileWriterHandle = {
    write: (data: Blob) => Promise<void>
    close: () => Promise<void>
}

type FileHandleWithWriter = {
    createWritable: () => Promise<FileWriterHandle>
}

type WindowWithFilePicker = Window & {
    showSaveFilePicker?: (options?: FilePickerOptions) => Promise<FileHandleWithWriter>
}

const getExtensionFromName = (value: string): string | null => {
    const cleaned = value.trim()
    const lastDot = cleaned.lastIndexOf(".")
    if (lastDot <= 0 || lastDot >= cleaned.length - 1) return null
    const extension = cleaned.slice(lastDot + 1).toLowerCase()
    return /^[a-z0-9]{1,10}$/i.test(extension) ? extension : null
}

/**
 * Tries to save using showSaveFilePicker (when supported) so the user
 * can choose destination path. Falls back to file-saver.
 */
export async function saveFileWithPicker(blob: Blob, suggestedName: string) {
    const normalizedSuggestedName = (suggestedName || "arquivo").trim() || "arquivo"
    const blobMimeType = blob.type || getMimeTypeFromFileName(normalizedSuggestedName) || "application/octet-stream"
    const nameExtension = getExtensionFromName(normalizedSuggestedName) || getExtensionFromMimeType(blobMimeType)
    const finalName = nameExtension && !getExtensionFromName(normalizedSuggestedName)
        ? `${normalizedSuggestedName}.${nameExtension}`
        : normalizedSuggestedName

    const pickerWindow = window as WindowWithFilePicker
    if (typeof pickerWindow.showSaveFilePicker === "function") {
        try {
            const pickerOptions: FilePickerOptions = {
                suggestedName: finalName,
            }

            if (nameExtension) {
                pickerOptions.types = [
                    {
                        description: `Arquivo .${nameExtension}`,
                        accept: {
                            [blobMimeType]: [`.${nameExtension}`],
                        },
                    },
                ]
            }

            const handle = await pickerWindow.showSaveFilePicker(pickerOptions)
            const writable = await handle.createWritable()
            await writable.write(blob)
            await writable.close()
            return
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === "AbortError") {
                return
            }
            console.warn("Erro ao usar showSaveFilePicker, tentando fallback:", err)
        }
    }

    saveAs(blob, finalName)
}
