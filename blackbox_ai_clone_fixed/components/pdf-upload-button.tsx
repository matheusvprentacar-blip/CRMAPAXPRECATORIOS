"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Loader2 } from "lucide-react"
import { uploadAndAttachPdf } from "@/lib/utils/pdf-upload"
import { toast } from "sonner"

interface PdfUploadButtonProps {
  precatorioId: string
  onUploadSuccess?: () => void
  currentPdfUrl?: string | null
}

export function PdfUploadButton({ precatorioId, onUploadSuccess, currentPdfUrl }: PdfUploadButtonProps) {
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      await uploadAndAttachPdf({ precatorioId, file })

      toast.success("PDF anexado com sucesso!")

      // Resetar input
      e.target.value = ""

      // Callback para atualizar estado pai
      onUploadSuccess?.()
    } catch (error: any) {
      console.error("[v0] Upload failed:", error)
      toast.error(error.message || "Erro ao anexar PDF")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={currentPdfUrl ? "outline" : "default"}
        size="sm"
        disabled={uploading}
        onClick={() => document.getElementById(`pdf-upload-${precatorioId}`)?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : currentPdfUrl ? (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Substituir PDF
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Anexar PDF
          </>
        )}
      </Button>

      <input
        id={`pdf-upload-${precatorioId}`}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {currentPdfUrl && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <FileText className="h-3 w-3" />
          PDF anexado
        </span>
      )}
    </div>
  )
}
