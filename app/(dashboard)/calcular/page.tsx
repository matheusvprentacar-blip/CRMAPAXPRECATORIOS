"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase/client"
import CalculadoraPrecatorios from "@/components/calculador-precatorios"
import { FileText } from "@/components/icons"
import { getPdfViewerUrl } from "@/lib/utils/pdf-upload"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export default function CalcularPage() {
  const searchParams = useSearchParams()
  const precatorioId = searchParams.get("id")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [precatorioPdfUrl, setPrecatorioPdfUrl] = useState<string | null>(null)
  const [hasCalculation, setHasCalculation] = useState(false)

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

      const { data, error } = await supabase
        .from("precatorios")
        .select("pdf_url, valor_atualizado, saldo_liquido")
        .eq("id", precatorioId)
        .single()

      if (error) {
        console.error("[CALCULAR] Error loading precatorio:", error)
        return
      }

      // Verificar se há cálculo
      const temCalculo = !!(data?.valor_atualizado || data?.saldo_liquido || data?.pdf_url)
      setHasCalculation(temCalculo)
      console.log("[CALCULAR] 🔍 Verificando se há cálculo:")
      console.log("[CALCULAR] - valor_atualizado:", data?.valor_atualizado)
      console.log("[CALCULAR] - saldo_liquido:", data?.saldo_liquido)
      console.log("[CALCULAR] - pdf_url:", data?.pdf_url)
      console.log("[CALCULAR] - hasCalculation:", temCalculo)

      if (data?.pdf_url) {
        console.log("[CALCULAR] 📄 PDF URL found:", data.pdf_url)
        setPrecatorioPdfUrl(data.pdf_url)

        console.log("[CALCULAR] 🔄 Generating signed URL...")
        const signedUrl = await getPdfViewerUrl(data.pdf_url)

        console.log("[CALCULAR] 📊 Signed URL result:", signedUrl)

        if (signedUrl) {
          setPdfUrl(signedUrl)
          console.log("[CALCULAR] ✅ PDF signed URL generated successfully")
          console.log("[CALCULAR] 🔗 Signed URL:", signedUrl.substring(0, 100) + "...")
        } else {
          console.error("[CALCULAR] ❌ Failed to generate signed URL")
          console.error("[CALCULAR] ❌ getPdfViewerUrl returned:", signedUrl)
        }
      } else {
        console.log("[CALCULAR] ℹ️ No PDF attached to this precatorio")
      }
    } catch (error) {
      console.error("[CALCULAR] Erro ao carregar PDF:", error)
    } finally {
      setLoading(false)
    }
  }



  const handleUpdate = () => {
    // Redirecionar removido para debug
    console.log("Cálculo finalizado/atualizado com sucesso")
    // window.location.href = "/kanban"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      {/* 
        O componente CalculadoraPrecatorios já possui:
        1. Layout de 2 colunas (Calculadora + PDF)
        2. Botões de ação (Salvar, Finalizar, Resetar)
        3. Header com título
        Portanto, não precisamos duplicar isso aqui.
      */}
      <CalculadoraPrecatorios
        precatorioId={precatorioId || undefined}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
