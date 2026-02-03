import { saveAs } from "file-saver"

/**
 * Tenta salvar o arquivo usando a API `showSaveFilePicker` (se suportada)
 * para permitir que o usuário escolha o local.
 * Fallback para `file-saver` (download automático) se não suportado ou em caso de erro.
 */
export async function saveFileWithPicker(blob: Blob, suggestedName: string) {
    // Verifica se a API é suportada
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ("showSaveFilePicker" in window) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const handle = await (window as any).showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: "Arquivo",
                        accept: {
                            "application/octet-stream": [],
                        },
                    },
                ],
            })
            const writable = await handle.createWritable()
            await writable.write(blob)
            await writable.close()
            return
        } catch (err: any) {
            // Se o usuário cancelar (AbortError), não fazemos nada (não fazemos fallback para saveAs)
            if (err.name === "AbortError") {
                return
            }
            // Outros erros: loga e tenta o fallback
            console.warn("Erro ao usar showSaveFilePicker, tentando fallback:", err)
        }
    }

    // Fallback: FileSaver
    saveAs(blob, suggestedName)
}
