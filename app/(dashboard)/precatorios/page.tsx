"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Send, AlertCircle, Trash2, X, FileJson } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import type { Precatorio } from "@/lib/types/database"
import { useToast } from "@/hooks/use-toast"
import { ImportJsonModal } from "@/components/import/import-json-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchBar } from "@/components/precatorios/search-bar"
import { AdvancedFilters } from "@/components/precatorios/advanced-filters"
import { usePrecatoriosSearch } from "@/hooks/use-precatorios-search"

/**
 * Garante que o Supabase client existe.
 * Se não existir, lança erro (e o TS entende que a partir daqui não é null).
 */
function getSupabaseOrThrow() {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error("Supabase não disponível")
  }
  return supabase
}

export default function PrecatoriosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  // Usar hook de busca avançada
  const {
    filtros,
    updateFiltros,
    clearFiltros,
    removeFiltro,
    setTermo,
    loading,
    resultados: precatorios,
    total: totalResultados,
    filtrosAtivos,
    refetch,
  } = usePrecatoriosSearch()

  const [sendToCalculoOpen, setSendToCalculoOpen] = useState(false)
  const [selectedPrecatorio, setSelectedPrecatorio] = useState<Precatorio | null>(null)
  const [selectedCalculoOperador, setSelectedCalculoOperador] = useState("")
  const [operadoresCalculo, setOperadoresCalculo] = useState<any[]>([])
  const [sending, setSending] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [precatorioToDelete, setPrecatorioToDelete] = useState<Precatorio | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importJsonOpen, setImportJsonOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    loadUserInfo()
    loadOperadoresCalculo()
  }, [])

  async function loadUserInfo() {
    try {
      // aqui não precisa lançar erro, só não carrega se não tiver supabase
      const supabase = getSupabase()
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        setAuthUserId(user.id)

        const { data: perfil } = await supabase.from("usuarios").select("role").eq("id", user.id).single()
        setUserRole(perfil?.role || null)
      }
    } catch (error) {
      console.error("[Precatorios] Erro ao carregar usuário:", error)
    }
  }

  async function loadOperadoresCalculo() {
    try {
      const supabase = getSupabase()
      if (supabase) {
        const { data } = await supabase
          .from("usuarios")
          .select("id, nome")
          .eq("role", "operador_calculo")
          .eq("ativo", true)

        if (data) setOperadoresCalculo(data)
      }
    } catch (error) {
      console.error("Erro ao carregar operadores de cálculo:", error)
    }
  }

  const temFiltrosAtivos = filtrosAtivos.length > 0
  const searchTerm = filtros.termo || ""

  async function handleEnviarParaCalculo() {
    if (!selectedPrecatorio || !selectedCalculoOperador) {
      toast({
        title: "Operador de cálculo obrigatório",
        description: "Você deve selecionar um operador de cálculo",
        variant: "destructive",
      })
      return
    }

    setSending(true)
    try {
      const supabase = getSupabaseOrThrow()

      const { error } = await supabase
        .from("precatorios")
        .update({
          responsavel_calculo_id: selectedCalculoOperador,
          operador_calculo: selectedCalculoOperador,
          status: "em_calculo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPrecatorio.id)

      if (error) throw error

      const operador = operadoresCalculo.find((o) => o.id === selectedCalculoOperador)

      await supabase.from("atividades").insert([
        {
          precatorio_id: selectedPrecatorio.id,
          tipo: "mudanca_status",
          descricao: `Precatório enviado para cálculo - Operador: ${operador?.nome || "usuário"}`,
        },
      ])

      toast({
        title: "Enviado para cálculo!",
        description: `Atribuído para ${operador?.nome}`,
      })

      await refetch()
      setSendToCalculoOpen(false)
      setSelectedPrecatorio(null)
      setSelectedCalculoOperador("")
    } catch (error: any) {
      toast({
        title: "Erro ao enviar para cálculo",
        description: error?.message ?? "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  async function handleDeletePrecatorio() {
    if (!precatorioToDelete) return

    setDeleting(true)
    try {
      const supabase = getSupabaseOrThrow()

      const { error } = await supabase.rpc("delete_precatorio", { p_precatorio_id: precatorioToDelete.id })
      if (error) throw error

      toast({
        title: "Precatório excluído",
        description: "O precatório foi excluído com sucesso",
      })

      await refetch()
      setDeleteDialogOpen(false)
      setPrecatorioToDelete(null)
    } catch (error: any) {
      toast({
        title: "Erro ao excluir precatório",
        description: error?.message ?? "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return

    setBulkDeleting(true)
    try {
      const supabase = getSupabaseOrThrow()

      let sucessos = 0
      let erros = 0

      for (const id of selectedIds) {
        try {
          const { error } = await supabase.rpc("delete_precatorio", { p_precatorio_id: id })
          if (error) throw error
          sucessos++
        } catch {
          erros++
        }
      }

      toast({
        title: "Exclusão em lote concluída",
        description: `${sucessos} excluídos, ${erros} com erro`,
      })

      await refetch()
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
    } catch (error: any) {
      toast({
        title: "Erro ao excluir precatórios",
        description: error?.message ?? "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelection(id: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  function toggleSelectAll() {
    if (selectedIds.size === precatorios.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(precatorios.map((p) => p.id)))
    }
  }

  const canDelete = (precatorio: Precatorio) => {
    if (userRole === "admin") return true
    if (userRole === "operador_comercial" || userRole === "operador_calculo") {
      return precatorio.criado_por === authUserId || precatorio.responsavel === authUserId
    }
    return false
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
      {/* ... resto do seu JSX exatamente como está ... */}

      <ImportJsonModal
        open={importJsonOpen}
        onOpenChange={setImportJsonOpen}
        onSuccess={() => {
          refetch()
          setImportJsonOpen(false)
        }}
      />
    </div>
  )
}
