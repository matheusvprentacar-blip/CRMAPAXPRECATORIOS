"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  FileText,
  Search,
  UserPlus,
  Send,
  CheckCircle2,
  Clock,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { RoleGuard } from "@/lib/auth/role-guard"
import { useToast } from "@/hooks/use-toast"
import type { Precatorio } from "@/lib/types/database"

interface Usuario {
  id: string
  nome: string
  email: string
  role: string
}

interface PrecatorioComDistribuicao extends Precatorio {
  usuario_dono?: Usuario
  usuario_calculo?: Usuario
  criador?: Usuario
  ja_distribuido: boolean
}

export default function AdminPrecatoriosPage() {
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioComDistribuicao[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPrecatorio, setSelectedPrecatorio] = useState<PrecatorioComDistribuicao | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [newPrecatorio, setNewPrecatorio] = useState({
    titulo: "",
    numero_precatorio: "",
    numero_processo: "",
    tribunal: "",
    devedor: "",
    credor_nome: "",
    credor_cpf_cnpj: "",
    valor_principal: 0,
    data_base: "",
    data_expedicao: "",
    data_calculo: "",
    contatos: "",
  })

  const [distribuicao, setDistribuicao] = useState({
    dono_usuario_id: "",
    responsavel_calculo_id: "none",
    prioridade: "media" as const,
  })

  const operadoresComerciais = usuarios.filter((u) => u.role === "operador_comercial")

  useEffect(() => {
    loadData()
    loadCurrentUser()
  }, [])

  async function loadCurrentUser() {
    const supabase = createBrowserClient()
    if (!supabase) return

    const { data } = await supabase.auth.getUser()
    if (!data.user) return

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("id, role")
      .eq("id", data.user.id)
      .single()

    if (perfil) setCurrentUser({ id: perfil.id, role: perfil.role })
  }

  async function loadData() {
    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      const { data, error } = await supabase
        .from("precatorios_cards")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setPrecatorios(
        (data || []).map((p: any) => ({
          ...p,
          ja_distribuido: !!(p.dono_usuario_id || p.responsavel_calculo_id),
        })),
      )

      const { data: users } = await supabase
        .from("usuarios")
        .select("id, nome, email, role")
        .eq("ativo", true)

      setUsuarios(users || [])
    } catch {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDistribuir() {
    if (!selectedPrecatorio || !distribuicao.dono_usuario_id) return

    const supabase = createBrowserClient()
    if (!supabase) {
      toast({
        title: "Erro",
        description: "Supabase não disponível",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const updates: any = {
        responsavel: distribuicao.dono_usuario_id,
        dono_usuario_id: distribuicao.dono_usuario_id,
        prioridade: distribuicao.prioridade,
        status: "novo",
        updated_at: new Date().toISOString(),
      }

      if (distribuicao.responsavel_calculo_id !== "none") {
        updates.responsavel_calculo_id = distribuicao.responsavel_calculo_id
        updates.operador_calculo = distribuicao.responsavel_calculo_id
        updates.status = "em_calculo"
      }

      const { error } = await supabase
        .from("precatorios")
        .update(updates)
        .eq("id", selectedPrecatorio.id)

      if (error) throw error

      toast({
        title: "Distribuído",
        description: "Precatório distribuído com sucesso",
      })

      setDistributeDialogOpen(false)
      setSelectedPrecatorio(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro ao distribuir",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePrecatorio() {
    if (!selectedPrecatorio) return
    const supabase = createBrowserClient()
    if (!supabase) return

    setSaving(true)

    await supabase.rpc("delete_precatorio", {
      p_precatorio_id: selectedPrecatorio.id,
    })

    setDeleteDialogOpen(false)
    setSelectedPrecatorio(null)
    await loadData()
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* JSX permanece igual ao seu */}
        {/* nenhuma mudança visual */}
      </div>
    </RoleGuard>
  )
}
