"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase/client"
import CalculadoraPrecatorios from "@/components/calculador-precatorios"
import { FileText } from "lucide-react"
import { PdfUploadButton } from "@/components/pdf-upload-button"
import { getPdfViewerUrl } from "@/lib/utils/pdf-upload"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react" // Import ExternalLink

export default function CalcularPage() {
  const searchParams = useSearchParams()
  const precatorioId = searchParams.get("id")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [precatorioPdfUrl, setPrecatorioPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    if (precatorioId) {
      loadPdfUrl()
    } else {
      setLoading(false)
    }
  }, [precatorioId])

  async function loadPdfUrl() {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      console.log("[CALCULAR] Loading PDF for precatorio:", precatorioId)

      const { data, error } = await supabase.from("precatorios").select("pdf_url").eq("id", precatorioId).single()

      if (error) {
        console.error("[CALCULAR] Error loading precatorio:", error)
        return
      }

      if (data?.pdf_url) {
        console.log("[CALCULAR] PDF URL found:", data.pdf_url)
        setPrecatorioPdfUrl(data.pdf_url)
        const signedUrl = await getPdfViewerUrl(data.pdf_url)
        if (signedUrl) {
          setPdfUrl(signedUrl)
          console.log("[CALCULAR] PDF signed URL generated successfully")
        } else {
          console.error("[CALCULAR] Failed to generate signed URL")
        }
      } else {
        console.log("[CALCULAR] No PDF attached to this precatorio")
      }
    } catch (error) {
      console.error("[CALCULAR] Erro ao carregar PDF:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calculadora de Precatórios</h1>
        <p className="text-muted-foreground">
          {precatorioId
            ? "Calculando valores para o precatório selecionado"
            : "Sistema completo de cálculo com wizard de 8 etapas"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna esquerda: Formulário de cálculo */}
        <div className="lg:col-span-1">
          <CalculadoraPrecatorios precatorioId={precatorioId || undefined} />
        </div>

        {/* Coluna direita: PDF Viewer */}
        {precatorioId && (
          <div className="lg:col-span-1 sticky top-6 h-fit">
            <div className="border rounded-lg overflow-hidden bg-card">
              <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documento do Precatório
                </h3>
                {!pdfUrl && (
                  <PdfUploadButton
                    precatorioId={precatorioId}
                    currentPdfUrl={precatorioPdfUrl}
                    onUploadSuccess={loadPdfUrl}
                  />
                )}
              </div>
              <div className="bg-white">
                {pdfUrl ? (
                  <>
                    <iframe
                      src={pdfUrl}
                      className="w-full border-0"
                      style={{ height: "80vh" }}
                      title="PDF do Precatório"
                    />
                    <div className="p-2 border-t bg-muted/30 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => window.open(pdfUrl, "_blank")}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir em nova guia
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhum PDF anexado</p>
                    <p className="text-sm text-center px-4">
                      Clique no botão "Anexar PDF" acima para fazer upload do documento
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
