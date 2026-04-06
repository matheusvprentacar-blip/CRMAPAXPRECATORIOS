"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase/client"
import CalculadoraPrecatorios from "@/components/calculador-precatorios"
import { getPdfViewerUrl } from "@/lib/utils/pdf-upload"

export default function CalcularPage() {
  const searchParams = useSearchParams()
  const precatorioId = searchParams.get("id")
  const [_pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [_precatorioPdfUrl, setPrecatorioPdfUrl] = useState<string | null>(null)
  const [_hasCalculation, setHasCalculation] = useState(false)

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
      const { data, error } = await supabase
        .from("precatorios")
        .select("pdf_url, valor_atualizado, saldo_liquido")
        .eq("id", precatorioId)
        .single()
      if (error) return
      const temCalculo = !!(data?.valor_atualizado || data?.saldo_liquido || data?.pdf_url)
      setHasCalculation(temCalculo)
      if (data?.pdf_url) {
        setPrecatorioPdfUrl(data.pdf_url)
        const signedUrl = await getPdfViewerUrl(data.pdf_url)
        if (signedUrl) setPdfUrl(signedUrl)
      }
    } catch {}
    finally { setLoading(false) }
  }

  const handleUpdate = () => {
    console.log("Cálculo finalizado/atualizado com sucesso")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 rounded-full border-[3px] border-[#0e4d6a]/20 border-t-[#0e4d6a] animate-spin" />
      </div>
    )
  }

  return (
    // Negative margin para sair do p-6 do layout pai e ocupar toda a largura
    <div className="-mx-6 -my-6">
      <CalculadoraPrecatorios
        precatorioId={precatorioId || undefined}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
