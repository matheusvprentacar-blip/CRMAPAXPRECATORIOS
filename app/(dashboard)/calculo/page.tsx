"use client"
/* eslint-disable */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { User, Clock, Gavel, DollarSign, Calculator, AlertCircle, Search, Star, RefreshCcw } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { ModalAtraso } from "@/components/calculo/modal-atraso"
import { ModalEnviarJuridico } from "@/components/calculo/modal-enviar-juridico"
import { ModalCalculoManual } from "@/components/precatorios/modal-calculo-manual"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

interface PrecatorioCalculo {
  id: string
  titulo: string | null
  numero_processo: string | null
  numero_precatorio: string | null
  credor_nome: string | null
  advogado_nome: string | null
  valor_principal: number | null
  valor_atualizado: number | null
  status: string | null
  localizacao_kanban?: string | null
  created_at: string
  urgente?: boolean
  tribunal?: string | null
  criador_nome?: string | null
  responsavel_nome?: string | null
  responsavel_calculo_nome?: string | null
  motivo_atraso_calculo?: string | null
  data_atraso_calculo?: string | null
  // FASE 1: Complexidade e SLA
  score_complexidade?: number
  nivel_complexidade?: "baixa" | "media" | "alta"
  data_entrada_calculo?: string | null
  sla_horas?: number
  sla_status?: "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido"
  calculo_externo?: boolean
  saldo_liquido?: number | null
  proposta_maior_valor?: number | null
  proposta_menor_valor?: number | null
}

export default function FilaCalculoPage() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [filaCalculo, setFilaCalculo] = useState<PrecatorioCalculo[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [adminInteresseIds, setAdminInteresseIds] = useState<Set<string>>(new Set())
  const [modalAtrasoOpen, setModalAtrasoOpen] = useState(false)
  const [modalJuridicoOpen, setModalJuridicoOpen] = useState(false)
  const [modalManualOpen, setModalManualOpen] = useState(false)
  const [precatorioParaManual, setPrecatorioParaManual] = useState<PrecatorioCalculo | null>(null)
  const [precatorioSelecionado, setPrecatorioSelecionado] = useState<PrecatorioCalculo | null>(null)
  const [calculando, setCalculando] = useState<string | null>(null)
  const [recalculoPopoverId, setRecalculoPopoverId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("aguardando")

  useEffect(() => {
    loadData()
  }, [activeTab]) // Reload when tab changes

  async function loadData() {
    setLoading(true) // Ensure loading state shows during fetch
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Buscar perfil do usuário para verificar role
      const { data: profile } = await supabase
        .from("usuarios")
        .select("role")
        .eq("id", user.id)
        .single()

      // Buscar precatórios
      let query = supabase
        .from("precatorios_cards")
        .select(
          `id,
          titulo,
          numero_processo,
          numero_precatorio,
          credor_nome,
          advogado_nome,
          valor_principal,
          valor_atualizado,
          saldo_liquido,
          calculo_externo,
          status,
          localizacao_kanban,
          created_at,
          urgente,
          tribunal,
          criador_nome,
          responsavel_nome,
          responsavel_calculo_nome,
          responsavel_calculo_id,
          motivo_atraso_calculo,
          data_atraso_calculo,
          score_complexidade,
          criador_nome,
          responsavel_nome,
          responsavel_calculo_nome,
          responsavel_calculo_id,
          motivo_atraso_calculo,
          data_atraso_calculo,
          score_complexidade,
          nivel_complexidade,
          data_entrada_calculo,
          sla_horas,
          sla_status,
          proposta_maior_valor,
          proposta_menor_valor`
        )

      // Filter based on active tab
      if (activeTab === "aguardando") {
        query = query
          .or("status.in.(pronto_calculo),localizacao_kanban.in.(pronto_calculo,fila_calculo)")
          .is("motivo_atraso_calculo", null)
      } else if (activeTab === "iniciado") {
        query = query
          .or("status.in.(calculo_andamento,em_calculo),localizacao_kanban.in.(calculo_andamento,em_calculo)")
          .is("motivo_atraso_calculo", null)
      } else if (activeTab === "atrasados") {
        query = query.not("motivo_atraso_calculo", "is", null)
      } else if (activeTab === "juridico") {
        query = query.or("status.eq.juridico,localizacao_kanban.eq.juridico")
      } else {
        query = query
          .or("status.in.(calculo_concluido,calculado),localizacao_kanban.eq.calculo_concluido")
          .not("saldo_liquido", "is", null)
      }

      // Se for operador de cálculo (e não for admin/gestor), filtrar apenas os atribuídos a ele
      const roles = (Array.isArray(profile?.role) ? profile?.role : [profile?.role].filter(Boolean)) as any[]
      const isAdmin = roles.includes("admin") || roles.includes("gestor")

      if (roles.includes("operador_calculo") && !isAdmin) {
        // Filtrar: (responsavel = usuario ID) OU (responsavel IS NULL)
        query = query.or(`responsavel_calculo_id.eq.${user.id},responsavel_calculo_id.is.null`)
      }

      const { data, error } = await query
        .order("urgente", { ascending: false })
        .order("created_at", { ascending: true })

      if (error) {
        console.error("[FILA CALCULO] Erro ao carregar:", error)
        throw error
      }

      const fila = (data as PrecatorioCalculo[]) || []
      setFilaCalculo(fila)

      try {
        const { data: interestRows, error: interestError } = await supabase
          .from("notifications")
          .select("entity_id")
          .eq("user_id", user.id)
          .eq("event_type", "interesse_calculo_admin")
          .is("read_at", null)

        if (interestError) {
          console.warn("[FILA CALCULO] Erro ao buscar alertas de interesse:", interestError)
        }

        const ids = new Set(
          (interestRows || [])
            .map((row: any) => row.entity_id)
            .filter((id: string | null) => Boolean(id))
        )
        setAdminInteresseIds(ids)
      } catch (interestErr) {
        console.warn("[FILA CALCULO] Falha ao carregar alertas de interesse:", interestErr)
      }
    } catch (error) {
      console.error("[FILA CALCULO] Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalcular = async (precatorioId: string) => {
    setCalculando(precatorioId)
    try {
      const supabase = getSupabase()
      if (supabase) {
        // Auto-move to "Em Andamento" on Kanban
        const { error } = await supabase
          .from("precatorios")
          .update({
            status: "calculo_andamento",
            status_kanban: "calculo_andamento",
            localizacao_kanban: "calculo_andamento",
            updated_at: new Date().toISOString(),
          })
          .eq("id", precatorioId)

        if (!error) {
          await supabase.from("atividades").insert({
            precatorio_id: precatorioId,
            tipo: "mudanca_status",
            descricao: "Cálculo iniciado na fila de cálculo",
          })
        }
      }
    } catch (e) {
      console.error("Erro ao atualizar status para andamento:", e)
    }
    router.push(`/calcular?id=${precatorioId}`)
  }

  const handleFinalizarCalculo = async (precatorioId: string) => {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const { error } = await supabase
        .from("precatorios")
        .update({
          status: "calculado",
          status_kanban: "calculo_concluido",
          localizacao_kanban: "calculo_concluido",
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (error) throw error

      await supabase.from("atividades").insert({
        precatorio_id: precatorioId,
        tipo: "mudanca_status",
        descricao: "Cálculo finalizado na fila de cálculo",
      })

      toast.success("Cálculo finalizado.")
      loadData()
    } catch (error: any) {
      console.error("[FILA CALCULO] Erro ao finalizar cálculo:", error)
      toast.error(error?.message || "Erro ao finalizar cálculo.")
    }
  }

  const handleRetornarJuridico = async (precatorioId: string) => {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      const { error } = await supabase
        .from("precatorios")
        .update({
          status: "pronto_calculo",
          status_kanban: "pronto_calculo",
          localizacao_kanban: "pronto_calculo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)

      if (error) throw error

      await supabase.from("atividades").insert({
        precatorio_id: precatorioId,
        tipo: "mudanca_status",
        descricao: "Retorno da análise jurídica para fila de cálculo",
      })

      toast.success("Retornado para a fila de cálculo.")
      loadData()
    } catch (error: any) {
      console.error("[FILA CALCULO] Erro ao retornar do jurídico:", error)
      toast.error(error?.message || "Erro ao retornar do jurídico.")
    }
  }

  const handleReportarAtraso = (precatorio: PrecatorioCalculo) => {
    setPrecatorioSelecionado(precatorio)
    setModalAtrasoOpen(true)
  }

  const handleAtrasoSuccess = () => {
    loadData()
  }

  const handleRemoverAtraso = async (precatorioId: string) => {
    try {
      const supabase = getSupabase()
      if (!supabase) return

      // Remover atraso (limpar campos)
      const { error } = await supabase
        .from("precatorios")
        .update({
          motivo_atraso_calculo: null,
          data_atraso_calculo: null,
          tipo_atraso: null,
          impacto_atraso: null,
        })
        .eq("id", precatorioId)

      if (error) throw error

      // Registrar atividade
      await supabase.from("atividades").insert({
        precatorio_id: precatorioId,
        tipo: "atualizacao",
        descricao: "Atraso removido - precatório retomado",
      })

      // Recarregar dados
      loadData()
    } catch (error) {
      console.error("[FILA CALCULO] Erro ao remover atraso:", error)
    }
  }

  const filteredFila = searchTerm
    ? filaCalculo.filter(
      (p) =>
        p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numero_precatorio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.credor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : filaCalculo

  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case "pronto_calculo":
        return "Pronto para cálculo"
      case "calculo_andamento":
      case "em_calculo":
        return "Em cálculo"
      case "calculo_concluido":
      case "calculado":
        return "Concluído"
      case "juridico":
        return "Jurídico"
      default:
        return status ? status.replace(/_/g, " ") : "N/I"
    }
  }

  const getStatusBadgeClass = (status?: string | null) => {
    switch (status) {
      case "pronto_calculo":
        return "bg-primary/15 text-primary border-primary/40"
      case "calculo_andamento":
      case "em_calculo":
        return "bg-primary/15 text-primary border-primary/40"
      case "calculo_concluido":
      case "calculado":
        return "bg-primary/15 text-primary border-primary/40"
      case "juridico":
        return "bg-primary/15 text-primary border-primary/40"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getSlaVisual = (slaStatus?: PrecatorioCalculo["sla_status"] | null) => {
    switch (slaStatus) {
      case "concluido":
        return {
          label: "Concluído",
          progress: 100,
          barClass: "bg-primary/15",
          textClass: "text-primary dark:text-primary",
        }
      case "atrasado":
        return {
          label: "Atrasado",
          progress: 100,
          barClass: "bg-destructive/15",
          textClass: "text-destructive dark:text-destructive",
        }
      case "atencao":
        return {
          label: "Atenção",
          progress: 85,
          barClass: "bg-primary/15",
          textClass: "text-primary dark:text-primary",
        }
      case "no_prazo":
        return {
          label: "No Prazo",
          progress: 55,
          barClass: "bg-primary/15",
          textClass: "text-primary dark:text-primary",
        }
      default:
        return {
          label: "Não Iniciado",
          progress: 12,
          barClass: "bg-muted",
          textClass: "text-muted-foreground dark:text-muted-foreground",
        }
    }
  }

  const formatCurrency = (value?: number | null) =>
    `R$ ${(value ?? 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  return (
    <motion.div
      className="container mx-auto max-w-[100vw] p-6 space-y-8"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      {/* Cabeçalho */}
      <motion.div
        className="flex items-center justify-between"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut", delay: reduceMotion ? 0 : 0.04 }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Fila de Cálculo</h1>
          <p className="text-muted-foreground">Gestão de precatórios para cálculo</p>
        </div>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${activeTab}-${filteredFila.length}`}
              className="text-2xl font-bold"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 1.04, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {filteredFila.length}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm text-muted-foreground">
            {activeTab === "aguardando"
              ? "na fila"
              : activeTab === "iniciado"
                ? "em andamento"
                : activeTab === "atrasados"
                  ? "atrasados"
                  : activeTab === "juridico"
                    ? "no jurídico"
                    : "concluídos"}
          </span>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut", delay: reduceMotion ? 0 : 0.02 }}
        >
        <TabsList className="grid w-full max-w-4xl grid-cols-5">
          <TabsTrigger value="aguardando" className="data-[state=active]:text-primary">Aguardando Cálculo</TabsTrigger>
          <TabsTrigger value="iniciado" className="data-[state=active]:text-primary">Cálculo Iniciado</TabsTrigger>
          <TabsTrigger value="atrasados" className="data-[state=active]:text-primary">
            Cálculo em Atraso
          </TabsTrigger>
          <TabsTrigger value="juridico" className="data-[state=active]:text-primary">Jurídico</TabsTrigger>
          <TabsTrigger value="concluidos" className="data-[state=active]:text-primary">Cálculos Concluídos</TabsTrigger>
        </TabsList>
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            className="mt-6 space-y-6"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
          {/* Barra de Busca */}
          <motion.div
            className="relative"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut", delay: reduceMotion ? 0 : 0.03 }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, número do precatório ou credor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </motion.div>

          {loading ? (
            <motion.div
              className="flex items-center justify-center h-48"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-4"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {filteredFila.length === 0 ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Calculator className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-primary">
                      {searchTerm ? "Nenhum precatório encontrado" : "Lista vazia"}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      {searchTerm
                        ? "Tente ajustar os termos da busca"
                        : activeTab === "aguardando"
                          ? "Não há precatórios aguardando cálculo no momento"
                          : activeTab === "iniciado"
                            ? "Não há cálculos em andamento"
                            : activeTab === "atrasados"
                              ? "Nenhum cálculo registrado com atraso"
                              : activeTab === "juridico"
                                ? "Nenhum precatório em análise jurídica"
                                : "Nenhum cálculo concluído encontrado"}
                    </p>
                  </CardContent>
                </Card>
                </motion.div>
              ) : (
                <motion.div layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredFila.map((precatorio, index) => {
                      const statusAtual = precatorio.localizacao_kanban || precatorio.status || null
                      const isJuridico = statusAtual === "juridico"
                      const isEmCalculo = statusAtual === "calculo_andamento" || statusAtual === "em_calculo"
                      const isConcluido = statusAtual === "calculo_concluido" || statusAtual === "calculado"
                      const isCalculado = isConcluido || precatorio.calculo_externo
                      const titulo = precatorio.titulo || precatorio.numero_precatorio || "Precatorio sem titulo"
                      const valorPrincipal = precatorio.valor_principal ?? 0
                      const valorAtualizado = precatorio.valor_atualizado ?? valorPrincipal
                      const responsavel = precatorio.responsavel_calculo_nome || precatorio.criador_nome || "Nao atribuido"
                      const sla = getSlaVisual(precatorio.sla_status)

                      return (
                        <motion.div
                          key={`${activeTab}-${precatorio.id}`}
                          layout
                          initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.99 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
                          transition={{
                            duration: reduceMotion ? 0 : 0.2,
                            ease: "easeOut",
                            delay: reduceMotion ? 0 : Math.min(index * 0.02, 0.14),
                          }}
                          className="h-full"
                        >
                          <Card
                              onClick={() => router.push(`/precatorios/detalhes?id=${precatorio.id}`)}
                              className={cn(
                                "h-full cursor-pointer border-border/60 transition-shadow hover:shadow-lg",
                                activeTab === "atrasados" ? "border-destructive/40" : "border-primary/40"
                              )}
                            >
                              <CardContent className="flex h-full flex-col space-y-4 p-5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-semibold">#{String(index + 1).padStart(2, "0")}</span>
                                    <Badge variant="outline" className={cn("h-5 border px-2 text-[10px]", getStatusBadgeClass(statusAtual))}>
                                      {getStatusLabel(statusAtual)}
                                    </Badge>
                                    {precatorio.urgente && (
                                      <Badge variant="destructive" className="h-5 px-2 text-[10px]">
                                        Urgente
                                      </Badge>
                                    )}
                                    {adminInteresseIds.has(precatorio.id) && (
                                      <Badge variant="destructive" className="flex h-5 items-center gap-1 px-2 text-[10px]">
                                        <Star className="h-3 w-3" /> Admin
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="line-clamp-2 text-base font-semibold leading-snug text-primary">{titulo}</p>
                                  <p className="line-clamp-1 text-sm text-muted-foreground">
                                    {precatorio.credor_nome || "Credor nao informado"}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <p className="line-clamp-1 text-xs text-muted-foreground">{precatorio.advogado_nome || "Advogado N/I"}</p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{precatorio.numero_processo || "Sem processo"}</span>
                                  <span>
                                    {"\u2022"} {precatorio.numero_precatorio || "Sem precatório"}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Status atual</span>
                                  <span>{sla.progress}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/70">
                                  <div className={cn("h-full rounded-full transition-all duration-300", sla.barClass)} style={{ width: `${sla.progress}%` }} />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Valor principal</p>
                                  <p className="font-semibold tabular-nums">{formatCurrency(valorPrincipal)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Valor atualizado</p>
                                  <p className="font-semibold tabular-nums text-primary dark:text-primary">
                                    {formatCurrency(valorAtualizado)}
                                  </p>
                                </div>
                              </div>

                              {isCalculado && (
                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                  <div className="rounded-md border border-border/60 bg-muted/20 p-2">
                                    <p className="text-[11px] uppercase">Min proposta</p>
                                    <p className="font-medium tabular-nums">
                                      {precatorio.proposta_menor_valor ? formatCurrency(precatorio.proposta_menor_valor) : "-"}
                                    </p>
                                  </div>
                                  <div className="rounded-md border border-border/60 bg-muted/20 p-2">
                                    <p className="text-[11px] uppercase">Max proposta</p>
                                    <p className="font-medium tabular-nums">
                                      {precatorio.proposta_maior_valor ? formatCurrency(precatorio.proposta_maior_valor) : "-"}
                                    </p>
                                  </div>
                                </div>
                              )}

                              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    <span>Responsável cálculo</span>
                                  </div>
                                  <span className="font-medium text-foreground">{responsavel}</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                  <span>SLA</span>
                                  <span className={cn("font-medium", sla.textClass)}>{sla.label}</span>
                                </div>
                              </div>

                              {activeTab === "atrasados" && precatorio.motivo_atraso_calculo && (
                                <div className="rounded-md border border-destructive/40 bg-destructive/15 p-2 text-xs text-destructive">
                                  <div className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Em atraso: {precatorio.motivo_atraso_calculo}</span>
                                  </div>
                                </div>
                              )}

                              <div className="mt-auto space-y-2 border-t border-border/50 pt-3">
                                <div className="flex flex-wrap gap-2">
                                  {!isJuridico && activeTab !== "juridico" && activeTab !== "concluidos" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 flex-1 min-w-[120px]"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setPrecatorioSelecionado(precatorio)
                                        setModalJuridicoOpen(true)
                                      }}
                                    >
                                      <Gavel className="mr-1 h-3 w-3" /> Juridico
                                    </Button>
                                  )}

                                  {(activeTab === "aguardando" || activeTab === "iniciado") && !isJuridico && !precatorio.motivo_atraso_calculo && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 flex-1 min-w-[120px] border-destructive/40 text-destructive hover:bg-destructive/15 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleReportarAtraso(precatorio)
                                      }}
                                    >
                                      <AlertCircle className="mr-1 h-3 w-3" /> Atraso
                                    </Button>
                                  )}

                                  {activeTab === "atrasados" && precatorio.motivo_atraso_calculo && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 flex-1 min-w-[120px] border-destructive/40 text-destructive hover:bg-destructive/15 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoverAtraso(precatorio.id)
                                      }}
                                    >
                                      Resolver atraso
                                    </Button>
                                  )}

                                  {isJuridico && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 flex-1 min-w-[120px] border-primary/40 text-primary hover:bg-primary/15 hover:text-primary"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRetornarJuridico(precatorio.id)
                                      }}
                                    >
                                      Retornar juridico
                                    </Button>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {!isConcluido && !isJuridico && (
                                    <Button
                                      size="sm"
                                      className="h-8 flex-1 min-w-[140px] bg-primary/15 text-white hover:bg-primary/15"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleCalcular(precatorio.id)
                                      }}
                                      title={isEmCalculo ? "Abrir calculo" : "Iniciar calculo"}
                                    >
                                      <Calculator className="mr-1 h-3 w-3" />
                                      {isEmCalculo ? "Abrir calculo" : "Iniciar calculo"}
                                    </Button>
                                  )}

                                  {isEmCalculo && (
                                    <Button
                                      size="sm"
                                      className="h-8 flex-1 min-w-[120px] bg-primary/15 text-white hover:bg-primary/15"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleFinalizarCalculo(precatorio.id)
                                      }}
                                      title="Finalizar calculo"
                                    >
                                      <Calculator className="mr-1 h-3 w-3" /> Finalizar
                                    </Button>
                                  )}

                                  {!isJuridico && !isConcluido && (
                                    <Button
                                      size="sm"
                                      className="h-8 flex-1 min-w-[120px] bg-primary/15 text-white hover:bg-primary/15"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setPrecatorioParaManual(precatorio)
                                        setModalManualOpen(true)
                                      }}
                                      title="Inserir valores calculados externamente"
                                    >
                                      <DollarSign className="mr-1 h-3 w-3" /> Inserir Manual
                                    </Button>
                                  )}

                                  {isConcluido && !isJuridico && (
                                    <Popover
                                      open={recalculoPopoverId === precatorio.id}
                                      onOpenChange={(open) => setRecalculoPopoverId(open ? precatorio.id : null)}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => e.stopPropagation()}
                                          className="h-8 flex-1 min-w-[120px] rounded-md border-primary/40 bg-background/70 px-3 text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
                                          title="Realizar calculo novamente"
                                        >
                                          <RefreshCcw className="mr-1 h-3 w-3" />
                                          Recalcular
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-[320px] border-border/70 bg-popover/95 p-3 backdrop-blur"
                                        align="end"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="space-y-3">
                                          <p className="text-sm font-medium text-primary">
                                            Deseja mesmo realizar o calculo novamente?
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Isso ira excluir todas as informacoes atuais do calculo.
                                          </p>
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setRecalculoPopoverId(null)
                                              }}
                                            >
                                              Cancelar
                                            </Button>
                                            <Button
                                              size="sm"
                                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setRecalculoPopoverId(null)
                                                handleCalcular(precatorio.id)
                                              }}
                                            >
                                              Confirmar
                                            </Button>
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>
                              </div>
                              </CardContent>
                            </Card>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}
          </motion.div>
        </AnimatePresence>
      </Tabs>

      {precatorioSelecionado && (
        <ModalAtraso
          open={modalAtrasoOpen}
          onOpenChange={setModalAtrasoOpen}
          precatorioId={precatorioSelecionado.id}
          precatorioTitulo={
            precatorioSelecionado.titulo ||
            precatorioSelecionado.numero_precatorio ||
            "Sem título"
          }
          onSuccess={handleAtrasoSuccess}
        />
      )}

      {precatorioSelecionado && (
        <ModalEnviarJuridico
          open={modalJuridicoOpen}
          onOpenChange={setModalJuridicoOpen}
          precatorioId={precatorioSelecionado.id}
          precatorioTitulo={
            precatorioSelecionado.titulo ||
            precatorioSelecionado.numero_precatorio ||
            "Sem título"
          }
          onSuccess={handleAtrasoSuccess}
        />
      )}

      {precatorioParaManual && (
        <ModalCalculoManual
          open={modalManualOpen}
          onOpenChange={setModalManualOpen}
          precatorio={precatorioParaManual as any}
          onSuccess={() => {
            setModalManualOpen(false)
            setPrecatorioParaManual(null)
            loadData()
          }}
        />
      )}
    </motion.div>
  )
}


