"use client"

import { useState, useEffect } from "react"
import { Download, ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getPdfViewerUrl } from "@/lib/utils/pdf-upload"

interface PDFViewerProps {
  pdfUrl: string
}

export function PDFViewer({ pdfUrl }: PDFViewerProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)

  useEffect(() => {
    console.log("[v0] PDFViewer - URL recebida:", pdfUrl)

    if (!pdfUrl) {
      setError(true)
      setLoading(false)
      return
    }

    // Converter storage reference para signed URL
    getPdfViewerUrl(pdfUrl)
      .then((url) => {
        if (!url) {
          console.error("[v0] PDFViewer - Não foi possível gerar URL")
          setError(true)
        } else {
          console.log("[v0] PDFViewer - URL gerada:", url)
          setViewerUrl(url)
        }
        setLoading(false)
      })
      .catch((e) => {
        console.error("[v0] PDFViewer - Erro ao gerar URL:", e)
        setError(true)
        setLoading(false)
      })
  }, [pdfUrl])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-sm text-muted-foreground">Carregando documento...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Não foi possível carregar o PDF. Verifique se o arquivo ainda está disponível no storage.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-3 min-h-[600px] h-full">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={viewerUrl || pdfUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" />
            Abrir em nova aba
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={viewerUrl || pdfUrl} download>
            <Download className="h-4 w-4 mr-1" />
            Baixar PDF
          </a>
        </Button>
      </div>

      {viewerUrl && (
        <iframe
          src={viewerUrl}
          className="flex-1 w-full rounded-md border border-border min-h-[550px]"
          scrolling="yes"
          title="Visualizador de PDF"
        />
      )}
    </div>
  )
}
