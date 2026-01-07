"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { getPdfViewerUrl } from "@/lib/utils/pdf-upload"

interface PdfViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfUrl: string | null
  titulo?: string
}

export function PdfViewerModal({ open, onOpenChange, pdfUrl, titulo }: PdfViewerModalProps) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !pdfUrl) {
      setViewerUrl(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    getPdfViewerUrl(pdfUrl)
      .then((url) => {
        if (url) {
          setViewerUrl(url)
        } else {
          setError("Não foi possível gerar URL do PDF")
        }
      })
      .catch((err) => {
        console.error("[v0] Error loading PDF:", err)
        setError("Erro ao carregar PDF")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, pdfUrl])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{titulo || "Visualizar PDF"}</span>
            {viewerUrl && (
              <Button variant="outline" size="sm" onClick={() => window.open(viewerUrl, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em nova guia
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {!loading && !error && viewerUrl && (
            <iframe src={viewerUrl} className="w-full h-full border rounded" title="Visualizador de PDF" />
          )}

          {!loading && !error && !pdfUrl && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Nenhum PDF anexado</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
