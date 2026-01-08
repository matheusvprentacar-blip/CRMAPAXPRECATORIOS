"use client"

import { useState, useEffect } from "react"
import { Download, ExternalLink, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PDFViewerProps {
  pdfUrl: string
}

export function PDFViewer({ pdfUrl }: PDFViewerProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("[v0] PDFViewer - URL recebida:", pdfUrl)

    if (!pdfUrl) {
      setError(true)
      setLoading(false)
      return
    }

    try {
      new URL(pdfUrl)
    } catch (e) {
      console.error("[v0] PDFViewer - URL inválida:", e)
      setError(true)
      setLoading(false)
      return
    }

    setLoading(false)
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
    <div className="flex flex-col gap-3 h-[450px]">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={pdfUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4 mr-1" />
            Abrir em nova aba
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={pdfUrl} download>
            <Download className="h-4 w-4 mr-1" />
            Baixar PDF
          </a>
        </Button>
      </div>

      <iframe src={pdfUrl} className="flex-1 w-full rounded-md border border-border" title="Visualizador de PDF" />
    </div>
  )
}
