"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase/client"
import CalculadoraPrecatorios from "@/components/calculador-precatorios"
import { FileText, RefreshCw, ExternalLink } from "lucide-react"
import { PdfUploadButton } from "@/components/pdf-upload-button"
import { getPdfViewerUrl } from "@/lib/utils/pdf-upload"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"

export default function CalcularPage() {
  const searchParams = useSearchParams()
  const precatorioId = searchParams.get("id")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [precatorioPdfUrl, setPrecatorioPdfUrl] = useState<string | null>(null)
  const [hasCalculation, setHasCalculation] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [resetting, setResetting] = useState(false)

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

  async function handleRefazerCalculo() {
    setShowConfirmDialog(true)
  }

  async function confirmarRefazerCalculo() {
    if (!precatorioId) return

    setResetting(true)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        throw new Error("Supabase não disponível")
      }

      console.log("🔄 [REFAZER] Iniciando reset do cálculo para:", precatorioId)

      // 1. Resetar valores no banco (apenas colunas que existem)
      const { error: updateError } = await supabase
        .from("precatorios")
        .update({
          // Valores calculados
          valor_atualizado: null,
          valor_juros: null,
          valor_selic: null,
          saldo_liquido: null,

          // Descontos
          pss_valor: null,
          irpf_valor: null,
          honorarios_valor: null,

          // Propostas
          proposta_menor_valor: null,
          proposta_menor_percentual: null,
          proposta_maior_valor: null,
          proposta_maior_percentual: null,

          // PDF do visualizador (gerado pelo cálculo)
          pdf_url: null,

          // Dados de cálculo
          data_calculo: null,
          dados_calculo: null,

          // Status
          status: "em_calculo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (updateError) {
        console.error("❌ [REFAZER] Erro ao resetar cálculo:", updateError)
        throw updateError
      }

      console.log("✅ [REFAZER] Valores resetados com sucesso")

      // 2. Registrar atividade
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        const { error: atividadeError } = await supabase.from("atividades").insert({
          precatorio_id: precatorioId,
          usuario_id: userData.user.id,
          tipo: "refazer_calculo",
          descricao: "Cálculo resetado para ser refeito",
        })

        if (atividadeError) {
          console.warn("⚠️ [REFAZER] Erro ao registrar atividade:", atividadeError)
        } else {
          console.log("✅ [REFAZER] Atividade registrada")
        }
      }

      // 3. Mostrar sucesso
      toast({
        title: "✅ Cálculo Resetado",
        description: "Você pode realizar um novo cálculo agora",
      })

      // 4. Recarregar página
      console.log("🔄 [REFAZER] Recarregando página...")
      window.location.reload()
    } catch (error) {
      console.error("❌ [REFAZER] Erro ao refazer cálculo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível resetar o cálculo. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setResetting(false)
      setShowConfirmDialog(false)
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
