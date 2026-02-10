"use client"
/* eslint-disable */

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Gavel,
  User,
  Users,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Check,
  Edit,
  Save,
  X,
  ArrowRight,
  RotateCcw,
  Calculator,
  Scale,
  CheckSquare,
  Percent,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth/auth-context"
import { maskProcesso } from "@/lib/masks"
import { PdfUploadButton } from "@/components/pdf-upload-button"
import { PdfViewerModal } from "@/components/pdf-viewer-modal"
import { Timeline } from "@/components/precatorios/timeline"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChecklistDocumentos } from "@/components/kanban/checklist-documentos"
import { ChecklistCertidoes } from "@/components/kanban/checklist-certidoes"
import { AbaFechamento } from "@/components/kanban/aba-fechamento"
import { TimelineViewer } from "@/components/precatorios/timeline-viewer"
import { FormSolicitarJuridico } from "@/components/kanban/form-solicitar-juridico"
import { FormParecerJuridico } from "@/components/kanban/form-parecer-juridico"
import { FormExportarCalculo } from "@/components/kanban/form-exportar-calculo"
import { HistoricoCalculos } from "@/components/kanban/historico-calculos"
import { ModalSemInteresse } from "@/components/kanban/modal-sem-interesse"
import CalculadoraPrecatorios from "@/components/calculador-precatorios"
import { ResumoCalculoDetalhado } from "@/components/precatorios/resumo-calculo-detalhado"

import { AbaProposta } from "@/components/kanban/aba-proposta"
import { OficioViewer } from "@/components/kanban/oficio-viewer"
import { buscarCEP, formatarCEP } from "@/lib/utils/cep"
import { KANBAN_COLUMNS } from "../../kanban/columns"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hasValue = (v: any): boolean => v !== null && v !== undefined

const SectionTitle = ({ icon: Icon, title }: { icon?: LucideIcon; title: string }) => (
  <div className="flex items-center gap-2">
    {Icon ? <Icon className="h-5 w-5 text-muted-foreground" /> : null}
    <span>{title}</span>
  </div>
)

const InfoRow = ({
  label,
  value,
  valueClassName = "text-base",
}: {
  label: string
  value: ReactNode
  valueClassName?: string
}) => (
  <div className="space-y-1">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className={valueClassName}>{value}</p>
  </div>
)

type Herdeiro = {
  id: string
  nome_completo: string | null
  cpf: string | null
  telefone: string | null
  endereco: string | null
  email: string | null
  banco: string | null
  agencia: string | null
  conta: string | null
  tipo_conta: string | null
  chave_pix: string | null
  percentual_participacao: number | null
}

type TriagemDestinoReprovacao = "none" | "reprovado" | "nao_elegivel"

/* ======================================================
   SUPABASE SAFE HELPER (resolve "supabase is possibly null")
====================================================== */
type SupabaseClientType = NonNullable<ReturnType<typeof createClient>>

function requireSupabase(): SupabaseClientType {
  const supabase = createClient()
  if (!supabase) {
    throw new Error("Supabase não disponível. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }
  return supabase
}

/**
 * ✅ Versão compatível com `output: "export"`:
 * - Remove rota dinâmica `/precatorios/[id]`
 * - Usa querystring: `/precatorios/detalhes?id=<UUID>`
 */
export default function PrecatorioDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()

  const id = searchParams.get("id") || ""
  const tabParam = searchParams.get("tab")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [precatorio, setPrecatorio] = useState<any>(null)
  const [herdeiros, setHerdeiros] = useState<Herdeiro[]>([])
  const [herdeirosLoading, setHerdeirosLoading] = useState(false)
  const [selectedHerdeiro, setSelectedHerdeiro] = useState<Herdeiro | null>(null)
  const [herdeiroModalOpen, setHerdeiroModalOpen] = useState(false)
  const [herdeiroEdit, setHerdeiroEdit] = useState<Herdeiro | null>(null)
  const [herdeiroEditMode, setHerdeiroEditMode] = useState(false)
  const [herdeiroSaving, setHerdeiroSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const ESFERA_DEVEDOR_OPTIONS = [
    { value: "UNIAO", label: "União" },
    { value: "ESTADO", label: "Estado" },
    { value: "MUNICIPIO", label: "Município" },
    { value: "DF", label: "DF" },
    { value: "INDEFINIDO", label: "Indefinido" },
  ]

  const normalizeEsferaDevedor = (value?: string | null) => {
    if (!value) return null
    const normalized = value
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()

    if (!normalized) return null
    if (normalized === "UNIAO" || normalized === "FEDERAL" || normalized === "UNIAO FEDERAL") return "UNIAO"
    if (normalized === "ESTADO" || normalized === "ESTADUAL") return "ESTADO"
    if (normalized === "MUNICIPIO" || normalized === "MUNICIPAL") return "MUNICIPIO"
    if (normalized === "DF" || normalized === "DISTRITO FEDERAL") return "DF"
    if (normalized === "INDEFINIDO" || normalized === "INDEFINIDA" || normalized === "NAO DEFINIDO") return "INDEFINIDO"

    return ESFERA_DEVEDOR_OPTIONS.some((opt) => opt.value === normalized) ? normalized : null
  }

  const getEsferaDevedorLabel = (value?: string | null) => {
    if (!value) return "—"
    const normalized = normalizeEsferaDevedor(value)
    const option = ESFERA_DEVEDOR_OPTIONS.find((opt) => opt.value === normalized)
    return option?.label || value
  }
  const [saving, setSaving] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editData, setEditData] = useState<any>({})
  const [userRole, setUserRole] = useState<string[] | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState("detalhes")
  const [triagemStatusSelection, setTriagemStatusSelection] = useState<string>("")
  const [triagemDestinoReprovacao, setTriagemDestinoReprovacao] = useState<TriagemDestinoReprovacao>("none")
  const [triagemSaving, setTriagemSaving] = useState(false)
  const [semInteresseModalOpen, setSemInteresseModalOpen] = useState(false)
  const lastStatusRef = useRef<string | null>(null)
  const [fechamentoData, setFechamentoData] = useState({
    pendencias: "",
    liberado: false,
    resultadoFinal: "reprovado",
  })
  const [fechamentoSaving, setFechamentoSaving] = useState(false)
  const [adminRecalcular, setAdminRecalcular] = useState(false)
  const [sendingToCalculo, setSendingToCalculo] = useState(false)

 

  const roles = Array.isArray(userRole) ? userRole : userRole ? [userRole] : []
  const isAdmin = roles.includes("admin")
  const isOperadorCalculo = roles.includes("operador_calculo")
  const canEdit = roles.some((role) =>
    ["admin", "operador_comercial", "operador_calculo", "gestor", "gestor_oficio", "gestor_certidoes"].includes(role)
  )
  const canManageOficio = roles.some((role) =>
    [
      "admin",
      "operador_comercial",
      "operador_calculo",
      "operador",
      "gestor",
      "gestor_oficio",
      "gestor_certidoes",
    ].includes(role)
  )
  const canEditFechamento = roles.some((role) => ["juridico", "admin"].includes(role))
  const hasFechamentoParecer =
    (!!precatorio?.pendencias_fechamento && String(precatorio.pendencias_fechamento).trim().length > 0) ||
    precatorio?.juridico_liberou_fechamento === true ||
    !!precatorio?.juridico_resultado_final
  const statusAtual =
    precatorio?.status_kanban ||
    precatorio?.localizacao_kanban ||
    precatorio?.status ||
    ""
  const statusAtualColumn = KANBAN_COLUMNS.find(
    (col) => col.id === statusAtual || col.statusIds?.includes(statusAtual)
  )
  const statusAtualLabel =
    statusAtualColumn?.titulo || (statusAtual ? statusAtual.replace(/_/g, " ") : "—")

  const hasCalculoSalvo = (() => {
    if (!precatorio) return false
    const dadosCalculo = precatorio.dados_calculo
    const hasDadosCalculo =
      !!dadosCalculo && typeof dadosCalculo === "object" && Object.keys(dadosCalculo).length > 0
    const valorAtualizado = Number(precatorio.valor_atualizado ?? 0)
    const saldoLiquido = Number(precatorio.saldo_liquido ?? 0)
    return hasDadosCalculo || valorAtualizado > 0 || saldoLiquido > 0 || !!precatorio.calculo_ultima_versao
  })()

  const STATUS_TAB_MAP: Record<string, string> = {
    entrada: "detalhes",
    triagem_interesse: "detalhes",
    docs_credor: "documentos",
    analise_processual_inicial: "documentos",
    pronto_calculo: "calculo",
    calculo_andamento: "calculo",
    calculo_concluido: "calculo",
    em_calculo: "calculo",
    calculado: "calculo",
    fila_calculo: "calculo",
    juridico: "juridico",
    proposta_negociacao: "propostas",
    certidoes: "certidoes",
    fechado: "timeline",
    encerrados: "timeline",
    reprovado: "timeline",
    aguardando_cliente: "propostas",
    concluido: "timeline",
    cancelado: "timeline",
  }
  const TRIAGEM_STATUS_META: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
    SEM_CONTATO: {
      label: "Sem contato",
      badgeClass:
        "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200",
      dotClass: "bg-zinc-500",
    },
    CONTATO_EM_ANDAMENTO: {
      label: "Contato em andamento",
      badgeClass:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200",
      dotClass: "bg-blue-500",
    },
    PEDIR_RETORNO: {
      label: "Pedir retorno",
      badgeClass:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
      dotClass: "bg-amber-500",
    },
    SEM_INTERESSE: {
      label: "Sem interesse",
      badgeClass:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
      dotClass: "bg-red-500",
    },
    TEM_INTERESSE: {
      label: "Tem interesse",
      badgeClass:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-900/40 dark:text-emerald-200",
      dotClass: "bg-emerald-500",
    },
  }
  const getTriagemStatusMeta = (status?: string | null) => {
    const normalized = status?.toUpperCase()
    if (!normalized) {
      return {
        label: "Não informado",
        badgeClass:
          "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200",
        dotClass: "bg-zinc-500",
      }
    }
    return (
      TRIAGEM_STATUS_META[normalized] ?? {
        label: normalized.replace(/_/g, " ").toLowerCase(),
        badgeClass:
          "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-200",
        dotClass: "bg-zinc-500",
      }
    )
  }
  const TRIAGEM_STATUS_OPTIONS = Object.entries(TRIAGEM_STATUS_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  }))
  const TRIAGEM_DESTINO_OPTIONS: Array<{ value: TriagemDestinoReprovacao; label: string }> = [
    { value: "none", label: "Fluxo normal" },
    { value: "reprovado", label: "Reprovado" },
    { value: "nao_elegivel", label: "Não elegível" },
  ]
  const triagemStatusMeta = getTriagemStatusMeta(precatorio?.interesse_status)
  const interesseObservacao = precatorio?.interesse_observacao?.trim()
  const semInteresseMotivo = precatorio?.motivo_sem_interesse?.trim()
  const resolveStatusColumnId = (status?: string | null) => {
    if (!status) return null
    const column = KANBAN_COLUMNS.find((col) => col.id === status || col.statusIds?.includes(status))
    return column?.id ?? status
  }
  const getTabForStatus = (status?: string | null) => {
    const normalized = resolveStatusColumnId(status)
    if (!normalized) return null
    if (normalized === "proposta_aceita") {
      return canEditFechamento ? "fechamento" : "propostas"
    }
    return STATUS_TAB_MAP[normalized] ?? null
  }
  const syncTabToUrl = (tab: string) => {
    if (!id) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("id", id)
    params.set("tab", tab)
    router.replace(`/precatorios/detalhes?${params.toString()}`)
  }
  useEffect(() => {
    if (!id) return
    const key = `precatorio-tab:${id}:page`
    const allowedTabs = new Set([
      "detalhes",
      "oficio",
      "documentos",
      "certidoes",
      "juridico",
      "fechamento",
      "calculo",
      "propostas",
      "timeline",
    ])

    if (tabParam && allowedTabs.has(tabParam)) {
      setActiveTab(tabParam)
      sessionStorage.setItem(key, tabParam)
      return
    }

    const saved = sessionStorage.getItem(key)
    if (saved && allowedTabs.has(saved)) setActiveTab(saved)
  }, [id, tabParam])

  useEffect(() => {
    if (!id) return
    const key = `precatorio-tab:${id}:page`
    sessionStorage.setItem(key, activeTab)
  }, [activeTab, id])

  useEffect(() => {
    if (!id) return
    const normalized = resolveStatusColumnId(statusAtual)
    if (!normalized) return

    const statusKey = `precatorio-status:${id}`
    const tabKey = `precatorio-tab:${id}:page`
    const storedStatus = sessionStorage.getItem(statusKey)
    const savedTab = sessionStorage.getItem(tabKey)
    const hasStatusChanged = !!storedStatus && storedStatus !== normalized
    const canAutoInitial = !tabParam && (hasStatusChanged || !savedTab)

    if (!lastStatusRef.current) {
      lastStatusRef.current = normalized
      sessionStorage.setItem(statusKey, normalized)
      if (!canAutoInitial) return
      const firstTab = getTabForStatus(normalized)
      if (!firstTab) return
      setActiveTab(firstTab)
      if (tabParam !== firstTab) {
        syncTabToUrl(firstTab)
      }
      return
    }

    if (normalized === lastStatusRef.current) return
    lastStatusRef.current = normalized
    sessionStorage.setItem(statusKey, normalized)

    const nextTab = getTabForStatus(normalized)
    if (!nextTab) return

    setActiveTab(nextTab)
    if (tabParam !== nextTab) {
      syncTabToUrl(nextTab)
    }
  }, [id, statusAtual, canEditFechamento, tabParam])

  const loadPrecatorio = async () => {
    if (!id) return

    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const supabase = requireSupabase()

      const { data, error } = await supabase
        .from("precatorios")
        .select(
          `
          *,
          criado_por,
          responsavel,
          responsavel_calculo_id,
          operador_calculo,
          saldo_liquido,
          data_base,
          calculo_ultima_versao,
          dados_calculo,
          data_expedicao,
          responsavel_dados:responsavel(nome),
          pss_oficio_valor,
          pss_valor,
          irpf_valor,
          honorarios_valor,
          adiantamento_valor,
          proposta_menor_valor,
          proposta_menor_percentual,
          proposta_maior_valor,
          proposta_maior_percentual
        `,
        )
        .eq("id", id)
        .maybeSingle()

      // [CONTROLLED ACCESS] Check for forced access
      const isForced = searchParams.get("forced") === "1"
      let forcedData = null

      if (isForced && !data) {
        // Only try privileged RPC if normal fetch failed or if we want to ensure access regardless
        // Logic: if normal fetch worked, use it. If not (likely RLS), try privileged.
        // Actually, if RLS blocks, 'data' is null and error is likely null (with maybeSingle) or error is thrown?
        // maybeSingle returns empty array -> null with maybeSingle.
      }

      if (isForced) {
        // Try the privileged RPC
        console.log("🔒 [Acesso Controlado] Tentando acesso forçado via RPC...")
        const { data: rpcData, error: rpcError } = await supabase.rpc("buscar_precatorio_por_id_acesso_controlado", {
          p_id: id,
        })

        if (rpcError) {
          console.error("❌ [Acesso Controlado] Erro na RPC:", rpcError)
        } else if (rpcData && rpcData.length > 0) {
          console.log("✅ [Acesso Controlado] Dados recuperados via RPC")
          forcedData = rpcData[0]
          // [CONTROLLED ACCESS] Fetch responsible name manually since RPC returns raw table
          if (forcedData.responsavel) {
            const { data: userData } = await supabase.from('usuarios').select('nome').eq('id', forcedData.responsavel).single()
            forcedData.responsavel_dados = userData
          }
        }
      }

      // Use forcedData if available, otherwise fallback to data (normal flow)
      // Note: standard 'data' comes from .select('*'). RPC 'forcedData' comes from 'select *'. They should be compatible.
      const finalData = forcedData || data

      if (error && !forcedData) {
        // Se quiser tratar "não encontrado" especificamente:
        // if ((error as any)?.code === "PGRST116") setNotFound(true)
        throw error
      }

      if (!finalData) {
        setNotFound(true)
        setError("Precatório não encontrado")
        return
      }

      setPrecatorio(finalData)
      setEditData({
        ...finalData,
        esfera_devedor: normalizeEsferaDevedor(finalData?.esfera_devedor) || "",
      })

      setHerdeirosLoading(true)
      const { data: herdeirosData, error: herdeirosError } = await supabase
        .from("precatorio_herdeiros")
        .select("id, nome_completo, cpf, telefone, endereco, email, banco, agencia, conta, tipo_conta, chave_pix, percentual_participacao")
        .eq("precatorio_id", id)
        .order("created_at", { ascending: true })

      if (herdeirosError) {
        console.error("[v0] Erro ao carregar herdeiros:", herdeirosError)
        setHerdeiros([])
      } else {
        setHerdeiros(herdeirosData || [])
      }
      setHerdeirosLoading(false)
      // define userRole a partir do profile (evita ficar null)
      setUserRole(profile?.role ?? null)

      setNotFound(false)
      setError(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const normalizedError = {
        message: err?.message || (typeof err === "string" ? err : "Erro ao carregar precatório"),
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        status: err?.status || err?.statusCode,
      }
      console.error("[v0] Erro ao carregar precatório:", normalizedError)
      setError(normalizedError.message || "Erro ao carregar precatório")

      toast({
        title: "Erro ao carregar precatório",
        description: normalizedError.message || "Não foi possível carregar",
        variant: "destructive",
      })
    } finally {
      setHerdeirosLoading(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    setTriagemStatusSelection(precatorio?.interesse_status || "SEM_CONTATO")
    const statusResolvido = resolveStatusColumnId(precatorio?.status_kanban || precatorio?.localizacao_kanban)
    const resultadoFinal = precatorio?.juridico_resultado_final
    const destinoAtual =
      statusResolvido === "reprovado" && (resultadoFinal === "reprovado" || resultadoFinal === "nao_elegivel")
        ? (resultadoFinal as TriagemDestinoReprovacao)
        : "none"
    setTriagemDestinoReprovacao(destinoAtual)
  }, [
    precatorio?.interesse_status,
    precatorio?.status_kanban,
    precatorio?.localizacao_kanban,
    precatorio?.juridico_resultado_final,
  ])

  useEffect(() => {
    // Se não veio id na URL, não tem o que carregar.
    if (!id) {
      // Em alguns casos o searchParams pode vir vazio no 1º render.
      // Não marque erro aqui para não bloquear a renderização quando o id aparecer.
      setHerdeirosLoading(false)
      setLoading(false)
      setNotFound(false)
      return
    }

    loadPrecatorio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    setAdminRecalcular(false)
  }, [id])

  useEffect(() => {
    // mantém userRole sincronizado com profile (caso o profile carregue depois)
    setUserRole(profile?.role ?? null)
  }, [profile])

  useEffect(() => {
    if (!precatorio) return
    setFechamentoData({
      pendencias: precatorio.pendencias_fechamento || "",
      liberado: !!precatorio.juridico_liberou_fechamento,
      resultadoFinal: precatorio.juridico_resultado_final || "reprovado",
    })
  }, [precatorio?.pendencias_fechamento, precatorio?.juridico_liberou_fechamento, precatorio?.juridico_resultado_final])

  async function handleConfirmSemInteresse(motivo: string, dataRecontato: Date | undefined) {
    if (!id) return

    setTriagemSaving(true)
    try {
      const supabase = requireSupabase()
      const { error } = await supabase
        .from("precatorios")
        .update({
          interesse_status: "SEM_INTERESSE",
          status_kanban: "sem_interesse",
          localizacao_kanban: "sem_interesse",
          motivo_sem_interesse: motivo,
          data_recontato: dataRecontato ? dataRecontato.toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      if (dataRecontato && profile?.id) {
        const precatorioLabel =
          precatorio?.titulo ||
          precatorio?.numero_precatorio ||
          precatorio?.credor_nome ||
          "Precatório"
        const dateLabel = dataRecontato.toLocaleDateString("pt-BR")
        const { error: notificationError } = await supabase
          .from("notifications")
          .insert({
            user_id: profile.id,
            title: `Recontato agendado - ${precatorioLabel}`,
            body: `Recontato marcado para ${dateLabel}.`,
            kind: "warn",
            link_url: `/precatorios/detalhes?id=${id}&tab=detalhes`,
            entity_type: "precatorio",
            entity_id: id,
            event_type: "recontato",
          })

        if (notificationError) {
          console.warn("Erro ao criar notificação de recontato:", notificationError)
        }
      }

      toast({
        title: "Sem interesse registrado",
        description: dataRecontato ? "Recontato agendado com sucesso." : "Registro atualizado.",
      })

      setTriagemStatusSelection("SEM_INTERESSE")
      setTriagemDestinoReprovacao("none")
      await loadPrecatorio()
    } finally {
      setTriagemSaving(false)
    }
  }

  async function handleSaveTriagemStatus() {
    if (!id) return
    if (!triagemStatusSelection) return

    const destinoReprovacaoSelecionado = triagemDestinoReprovacao !== "none"

    if (triagemStatusSelection === "SEM_INTERESSE" && !destinoReprovacaoSelecionado) {
      setSemInteresseModalOpen(true)
      return
    }

    setTriagemSaving(true)
    try {
      const supabase = requireSupabase()
      const nextStatusKanban =
        destinoReprovacaoSelecionado
          ? "reprovado"
          : triagemStatusSelection === "TEM_INTERESSE"
          ? "docs_credor"
          : triagemStatusSelection === "SEM_INTERESSE"
          ? "sem_interesse"
          : "triagem_interesse"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: any = {
        interesse_status: triagemStatusSelection,
        status_kanban: nextStatusKanban,
        localizacao_kanban: nextStatusKanban,
        updated_at: new Date().toISOString(),
      }

      if (destinoReprovacaoSelecionado) {
        updatePayload.juridico_resultado_final = triagemDestinoReprovacao
      } else {
        const statusResolvido = resolveStatusColumnId(precatorio?.status_kanban || precatorio?.localizacao_kanban)
        if (statusResolvido === "reprovado") {
          updatePayload.juridico_resultado_final = null
        }
      }

      const { error } = await supabase
        .from("precatorios")
        .update(updatePayload)
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Triagem atualizada",
        description: destinoReprovacaoSelecionado
          ? "Registro salvo e crédito enviado para Reprovado / não elegível."
          : "O interesse do credor foi registrado com sucesso.",
      })

      await loadPrecatorio()
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível salvar a triagem.",
        variant: "destructive",
      })
    } finally {
      setTriagemSaving(false)
    }
  }

  async function handleSaveEdit() {
    if (!precatorio || !id) return

    setSaving(true)
    try {
      const supabase = requireSupabase()
      const toNumberOrNull = (value: any) => {
        if (value === "" || value === null || value === undefined) return null
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        titulo: editData.titulo,
        numero_precatorio: editData.numero_precatorio,
        numero_processo: editData.numero_processo,
        numero_oficio: editData.numero_oficio,
        devedor: editData.devedor,
        esfera_devedor: normalizeEsferaDevedor(editData.esfera_devedor),
        credor_nome: editData.credor_nome,
        credor_cpf_cnpj: editData.credor_cpf_cnpj,
        credor_cep: editData.credor_cep, // Added
        credor_cidade: editData.credor_cidade, // Added
        credor_uf: editData.credor_uf, // Added
        credor_endereco: editData.credor_endereco, // Added
        credor_telefone: editData.credor_telefone, // Added
        credor_email: editData.credor_email, // Added
        data_base: editData.data_base,
        data_expedicao: editData.data_expedicao,
        advogado_nome: editData.advogado_nome,
        advogado_cpf_cnpj: editData.advogado_cpf_cnpj,
        advogado_oab: editData.advogado_oab,
        advogado_telefone: editData.advogado_telefone,
        titular_falecido: editData.titular_falecido,
        herdeiro: editData.herdeiro,
        herdeiro_cpf: editData.herdeiro_cpf,
        herdeiro_telefone: editData.herdeiro_telefone,
        herdeiro_endereco: editData.herdeiro_endereco,
        cessionario: editData.cessionario,
        contatos: editData.contatos,
        observacoes: editData.observacoes,
        banco: editData.banco,
        agencia: editData.agencia,
        conta: editData.conta,
        tipo_conta: editData.tipo_conta,
        chave_pix: editData.chave_pix,
        tipo_chave_pix: editData.tipo_chave_pix,
        observacoes_bancarias: editData.observacoes_bancarias,
        analise_penhora: editData.analise_penhora,
        analise_cessao: editData.analise_cessao,
        analise_herdeiros: editData.analise_herdeiros,
        analise_viavel: editData.analise_viavel,
        analise_observacoes: editData.analise_observacoes,
        analise_penhora_valor: toNumberOrNull(editData.analise_penhora_valor),
        analise_penhora_percentual: toNumberOrNull(editData.analise_penhora_percentual),
        analise_cessao_valor: toNumberOrNull(editData.analise_cessao_valor),
        analise_cessao_percentual: toNumberOrNull(editData.analise_cessao_percentual),
        analise_adiantamento_valor: toNumberOrNull(editData.analise_adiantamento_valor),
        analise_adiantamento_percentual: toNumberOrNull(editData.analise_adiantamento_percentual),
        analise_honorarios_valor: toNumberOrNull(editData.analise_honorarios_valor),
        analise_honorarios_percentual: toNumberOrNull(editData.analise_honorarios_percentual),
        analise_itcmd: editData.analise_itcmd,
        analise_itcmd_valor: toNumberOrNull(editData.analise_itcmd_valor),
        analise_itcmd_percentual: toNumberOrNull(editData.analise_itcmd_percentual),
        updated_at: new Date().toISOString(),
      }

      if (userRole && userRole.includes("admin") && editData.tribunal) {
        updateData.tribunal = editData.tribunal
      }

      let { error: updateError } = await supabase.from("precatorios").update(updateData).eq("id", id)

      if (updateError?.message?.includes("esfera_devedor_check")) {
        const fallbackValue = "INDEFINIDO"
        const retry = await supabase
          .from("precatorios")
          .update({ ...updateData, esfera_devedor: fallbackValue })
          .eq("id", id)
        if (!retry.error) {
          updateError = null
          setEditData((prev: any) => ({ ...prev, esfera_devedor: fallbackValue }))
        } else {
          updateError = retry.error
        }
      }

      if (updateError) {
        setError(updateError.message)
        toast({
          title: "Erro ao salvar",
          description: updateError.message,
          variant: "destructive",
        })
      } else {
        setError(null)
        setIsEditing(false)
        await loadPrecatorio()
        toast({
          title: "Salvo com sucesso",
          description: "Alterações atualizadas no precatório",
        })
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Erro ao salvar:", err)
      setError(err?.message || "Erro ao salvar alterações")
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Erro ao salvar alterações",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveFechamento() {
    if (!precatorio || !id) return
    if (!canEditFechamento) {
      toast({
        title: "Sem permissão",
        description: "Apenas o Jurídico ou Admin pode registrar o parecer.",
        variant: "destructive",
      })
      return
    }
    if (!fechamentoData.pendencias.trim()) {
      toast({
        title: "Observações obrigatórias",
        description: "Informe o parecer/observações do jurídico antes de salvar.",
        variant: "destructive",
      })
      return
    }
    setFechamentoSaving(true)
    try {
      const supabase = requireSupabase()
      const reprovado = !fechamentoData.liberado

      const updatePayload: any = {
        pendencias_fechamento: fechamentoData.pendencias,
        juridico_liberou_fechamento: fechamentoData.liberado,
        juridico_resultado_final: reprovado ? fechamentoData.resultadoFinal : null,
        updated_at: new Date().toISOString(),
      }

      if (reprovado) {
        updatePayload.status_kanban = "reprovado"
        updatePayload.localizacao_kanban = "reprovado"
      } else {
        updatePayload.status_kanban = "certidoes"
        updatePayload.localizacao_kanban = "certidoes"
        if (!precatorio.status_certidoes) {
          updatePayload.status_certidoes = "nao_iniciado"
        }
      }

      const { error: updateError } = await supabase
        .from("precatorios")
        .update(updatePayload)
        .eq("id", id)

      if (updateError) throw updateError

      toast({
        title: "Parecer jurídico atualizado",
        description: fechamentoData.liberado
          ? "Crédito aprovado pelo jurídico."
          : "Crédito reprovado pelo jurídico.",
      })

      await loadPrecatorio()
    } catch (err: any) {
      console.error("[Fechamento] Erro ao salvar:", err)
      toast({
        title: "Erro ao salvar fechamento",
        description: err?.message || "Não foi possível salvar o fechamento.",
        variant: "destructive",
      })
    } finally {
      setFechamentoSaving(false)
    }
  }

  // --- Logic to Advance Stage ---
  const currentColumnIndex = KANBAN_COLUMNS.findIndex(col =>
    col.id === precatorio?.status_kanban || col.statusIds?.includes(precatorio?.status_kanban)
  )

  const nextColumn = currentColumnIndex >= 0 && currentColumnIndex < KANBAN_COLUMNS.length - 1
    ? KANBAN_COLUMNS[currentColumnIndex + 1]
    : null

  // Prevent auto-advancing to "Reprovado" or "Encerrados" unless explicit? 
  // User said "sempre que a etapa for concluida". 
  // Let's assume linear flow is safe, but maybe skip 'reprovado' if it's next in array (it's last, so it might be safe if the flow leads there, but typically one doesn't "advance" to rejected without a decision).
  // Checking array: ... 'fechado' -> 'encerrados' -> 'reprovado'.
  // Moving to 'encerrados' might be okay. Moving to 'reprovado' is usually a decision.
  const currentColumnId = currentColumnIndex >= 0 ? KANBAN_COLUMNS[currentColumnIndex].id : precatorio?.status_kanban
  const requiresAnalisePermission =
    currentColumnId === "analise_processual_inicial" && nextColumn?.id === "pronto_calculo"
  const canAdvanceByRole = !requiresAnalisePermission || roles.some((role) =>
    ["admin", "juridico", "analista", "analista_processual"].includes(role)
  )
  const canAdvance = !!nextColumn && nextColumn.id !== "reprovado" && canAdvanceByRole

  const handleAdvanceStage = async () => {
    if (!precatorio || !nextColumn) return
    if (!canAdvanceByRole) {
      toast({
        title: "Ação não permitida",
        description: "Somente jurídico, admin ou analista processual podem enviar para cálculo.",
        variant: "destructive",
      })
      return
    }

    // Optional: Add confirmation?
    // User: "para que o operador clique... e possa movimentar"
    // Let's just do it.

    setLoading(true) // Reusing loading state or create a specific one? 
    // Using global loading might hide everything. Let's make a local state if needed, or just toast.
    const toastId = toast({ title: "Movimentando...", description: `Avançando para ${nextColumn.titulo}` })

    try {
      const supabase = requireSupabase()

      const { error } = await supabase
        .from("precatorios")
        .update({
          status_kanban: nextColumn.id,
          localizacao_kanban: nextColumn.id, // Usually synced
          updated_at: new Date().toISOString()
        })
        .eq("id", id)

      if (error) {
        console.error("Supabase Update Error:", JSON.stringify(error, null, 2))
        throw error
      }

      await loadPrecatorio()
      toast({ title: "Sucesso", description: `Movido para ${nextColumn.titulo}` })

    } catch (err: any) {
      console.error("Erro ao avançar - Detalhes:", JSON.stringify(err, null, 2))
      console.error("Tentativa de mover para:", nextColumn)
      toast({
        title: "Erro",
        description: err?.message || "Falha ao mover etapa. Verifique o console.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarFilaCalculo = async () => {
    if (!precatorio || !id) return
    try {
      setSendingToCalculo(true)
      const supabase = requireSupabase()
      const { error } = await supabase
        .from("precatorios")
        .update({
          status: "pronto_calculo",
          status_kanban: "pronto_calculo",
          localizacao_kanban: "fila_calculo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Enviado para fila de cálculo",
        description: "O precatório voltou para a fila aguardando novo cálculo.",
      })
      await loadPrecatorio()
    } catch (err: any) {
      console.error("[Calculo] Erro ao enviar para fila:", err)
      toast({
        title: "Erro ao enviar",
        description: err?.message || "Não foi possível enviar para a fila de cálculo.",
        variant: "destructive",
      })
    } finally {
      setSendingToCalculo(false)
    }
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const formattedValue = formatarCEP(rawValue)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEditData((prev: any) => ({ ...prev, credor_cep: formattedValue }))

    const cleanCep = rawValue.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      toast({
        title: "Buscando CEP...",
        description: "Aguarde um momento",
      })

      try {
        const data = await buscarCEP(cleanCep)
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setEditData((prev: any) => ({
            ...prev,
            credor_endereco: `${data.logradouro}${data.bairro ? ', ' + data.bairro : ''}`,
            credor_cidade: data.localidade,
            credor_uf: data.uf,
          }))
          toast({
            title: "Endereço encontrado!",
            description: `${data.localidade} - ${data.uf}`,
          })
        } else {
          toast({
            title: "CEP não encontrado",
            description: "Verifique o número digitado",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error(error)
        toast({
          title: "Erro na busca",
          description: "Não foi possível consultar o CEP",
          variant: "destructive"
        })
      }
    }
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (!hasValue(value)) return "R$ 0,00"
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value!)
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "—"
    const [y, m, d] = String(date).split("-")
    if (!y || !m || !d) return "—"
    return `${d}/${m}/${y}`
  }
  const formatPercent = (value: number | null | undefined) => {
    if (!hasValue(value)) return null
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return null
    return parsed.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%"
  }
  const formatBoolean = (value: boolean | null | undefined) => {
    if (value === true) return "Sim"
    if (value === false) return "Não"
    return "Não informado"
  }
  const formatHerdeiros = (value: any) => {
    if (typeof value === "string" && value.trim()) return value
    return formatBoolean(value)
  }
  const booleanSelectValue = (value: boolean | null | undefined) => {
    if (value === true) return "true"
    if (value === false) return "false"
    return "indefinido"
  }
  const selectValueToBoolean = (value: string) => {
    if (value === "true") return true
    if (value === "false") return false
    return null
  }

  const handleOpenHerdeiro = (herdeiro: Herdeiro) => {
    setSelectedHerdeiro(herdeiro)
    setHerdeiroEdit({ ...herdeiro })
    setHerdeiroEditMode(false)
    setHerdeiroModalOpen(true)
  }

  const updateHerdeiroEdit = (field: keyof Herdeiro, value: string | number | null) => {
    setHerdeiroEdit((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleSaveHerdeiro = async () => {
    if (!herdeiroEdit) return
    setHerdeiroSaving(true)
    try {
      const supabase = requireSupabase()
      const { error } = await supabase
        .from("precatorio_herdeiros")
        .update({
          nome_completo: herdeiroEdit.nome_completo,
          cpf: herdeiroEdit.cpf,
          telefone: herdeiroEdit.telefone,
          email: herdeiroEdit.email,
          endereco: herdeiroEdit.endereco,
          banco: herdeiroEdit.banco,
          agencia: herdeiroEdit.agencia,
          conta: herdeiroEdit.conta,
          tipo_conta: herdeiroEdit.tipo_conta,
          chave_pix: herdeiroEdit.chave_pix,
          percentual_participacao: herdeiroEdit.percentual_participacao,
          updated_at: new Date().toISOString(),
        })
        .eq("id", herdeiroEdit.id)

      if (error) throw error

      setHerdeiros((prev) => prev.map((h) => (h.id === herdeiroEdit.id ? { ...h, ...herdeiroEdit } : h)))
      setSelectedHerdeiro(herdeiroEdit)
      setHerdeiroEdit(herdeiroEdit)
      setHerdeiroEditMode(false)
      toast({
        title: "Herdeiro atualizado",
        description: "Dados do herdeiro salvos com sucesso.",
      })
    } catch (err: any) {
      toast({
        title: "Erro ao salvar herdeiro",
        description: err?.message || "Não foi possível salvar.",
        variant: "destructive",
      })
    } finally {
      setHerdeiroSaving(false)
    }
  }

  const handleAddHerdeiro = async () => {
    if (!id) return
    setHerdeiroSaving(true)
    try {
      const supabase = requireSupabase()
      const payload = {
        precatorio_id: id,
        nome_completo: "Herdeiro pendente",
        cpf: null,
        telefone: null,
        email: null,
        endereco: null,
        banco: null,
        agencia: null,
        conta: null,
        tipo_conta: null,
        chave_pix: null,
        percentual_participacao: 0,
      }

      const { data, error } = await supabase
        .from("precatorio_herdeiros")
        .insert(payload)
        .select("*")
        .single()

      if (error) throw error

      if (data) {
        setHerdeiros((prev) => [data as Herdeiro, ...prev])
        setSelectedHerdeiro(data as Herdeiro)
        setHerdeiroEdit({ ...(data as Herdeiro) })
        setHerdeiroEditMode(true)
        setHerdeiroModalOpen(true)
      }
    } catch (err: any) {
      toast({
        title: "Erro ao adicionar herdeiro",
        description: err?.message || "Não foi possível adicionar.",
        variant: "destructive",
      })
    } finally {
      setHerdeiroSaving(false)
    }
  }

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case "novo":
        return <Clock className="h-4 w-4" />
      case "em_andamento":
        return <AlertCircle className="h-4 w-4" />
      case "concluido":
        return <CheckCircle2 className="h-4 w-4" />
      case "cancelado":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "novo":
        return "bg-blue-100 text-blue-800"
      case "em_andamento":
        return "bg-yellow-100 text-yellow-800"
      case "concluido":
        return "bg-green-100 text-green-800"
      case "cancelado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPrioridadeColor = (prioridade: string | undefined) => {
    switch (prioridade) {
      case "urgente":
        return "bg-red-100 text-red-800"
      case "alta":
        return "bg-orange-100 text-orange-800"
      case "media":
        return "bg-yellow-100 text-yellow-800"
      case "baixa":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] space-y-2 px-4">
        <p className="text-sm text-muted-foreground">Nenhum ID informado na URL.</p>
        <p className="text-xs text-muted-foreground">Abra pela lista ou use: /precatorios/detalhes?id=&lt;UUID&gt;</p>
        <button
          type="button"
          onClick={() => router.push("/precatorios")}
          className="mt-2 px-4 py-2 rounded bg-primary text-primary-foreground"
        >
          Voltar para lista
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if ((error || notFound) && !precatorio) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-2xl font-bold">Erro ao carregar precatório</h2>
        <p className="text-muted-foreground">{error || "Precatório não encontrado"}</p>
        <Button onClick={() => router.push("/precatorios")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Lista
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border/60 bg-background/80 backdrop-blur px-4 py-4 lg:sticky lg:top-4 z-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-1 -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {precatorio.titulo}
                </h1>
                <Badge variant="outline">
                  {precatorio.prioridade?.toUpperCase() || "MÉDIA"}
                </Badge>
                <Badge className={getStatusColor(precatorio.status)}>
                  {getStatusIcon(precatorio.status)}
                  <span className="ml-1 font-semibold">
                    {precatorio.status?.replace("_", " ").toUpperCase() || "NOVO"}
                  </span>
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Dados essenciais do precatório</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-4"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="h-10 rounded-xl px-4"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  size="sm"
                  className="h-10 rounded-xl px-4"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Layout Consolidado */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b mb-6">
          <div className="relative">
            <TabsList className="bg-transparent h-auto w-full p-0 gap-6 flex-nowrap overflow-x-auto pb-1 pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger
              value="detalhes"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-primary transition-all hover:text-foreground"
            >
              <FileText className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger
              value="documentos"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Documentos
            </TabsTrigger>
            <TabsTrigger
              value="oficio"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-cyan-600 transition-all hover:text-foreground"
            >
              <FileText className="h-4 w-4 mr-2" />
              Ofício
              {precatorio?.file_url && <span className="ml-1.5 w-2 h-2 rounded-full bg-cyan-500" />}
            </TabsTrigger>
            <TabsTrigger
              value="certidoes"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Certidões
            </TabsTrigger>
            <TabsTrigger
              value="juridico"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
            >
              <Scale className="h-4 w-4 mr-2" />
              Jurídico
            </TabsTrigger>
            {(userRole?.includes('admin') || userRole?.includes('financeiro') || userRole?.includes('juridico')) && (
              <TabsTrigger
                value="fechamento"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
              >
                <Gavel className="h-4 w-4 mr-2" />
                Fechamento
              </TabsTrigger>
            )}
            <TabsTrigger
              value="calculo"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Cálculo
            </TabsTrigger>
            <TabsTrigger
              value="propostas"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
            >
              <Percent className="h-4 w-4 mr-2" />
              Propostas
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 text-muted-foreground data-[state=active]:text-foreground transition-all hover:text-foreground"
            >
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
            </TabsList>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent" />
          </div>
        </div>

        {/* Tab: Detalhes */}
          <TabsContent value="detalhes" className="space-y-6">

            {/* Barra de Status */}
            <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/60 bg-zinc-50/80 dark:bg-zinc-900/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Status do crédito</p>

                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-sm text-muted-foreground">Atual:</p>
                  <p className="text-base font-semibold text-foreground truncate">{statusAtualLabel}</p>

                  {nextColumn ? (
                    <>
                      <span className="hidden sm:inline text-muted-foreground">•</span>
                      <p className="text-sm text-muted-foreground">Próxima:</p>
                      <p className="text-sm font-medium text-foreground/90 truncate">{nextColumn.titulo}</p>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="h-10 rounded-xl px-4"
                  onClick={handleAdvanceStage}
                  disabled={!canAdvance}
                  title={
                    !canAdvanceByRole && requiresAnalisePermission
                      ? "Somente jurídico, admin ou analista processual podem enviar para cálculo."
                      : nextColumn
                        ? `Avançar para ${nextColumn.titulo}`
                        : "Sem próxima etapa"
                  }
                >
                  Avançar{nextColumn ? ` para: ${nextColumn.titulo}` : ""} <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-10 rounded-xl px-4"
                  onClick={() => {
                    setActiveTab("timeline")
                    syncTabToUrl("timeline")
                  }}
                >
                  Ver timeline
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {KANBAN_COLUMNS.map((col, index) => {
                  const hasCurrent = currentColumnIndex >= 0
                  const isCurrent = hasCurrent && index === currentColumnIndex
                  const isDone = hasCurrent && index < currentColumnIndex
                  const isNext = hasCurrent && index === currentColumnIndex + 1
                  const base = "shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition"
                  const styles = isCurrent
                    ? "border-primary/40 bg-primary/10 text-foreground shadow-[0_0_0_3px_rgba(59,130,246,0.12)] dark:shadow-[0_0_0_3px_rgba(59,130,246,0.25)]"
                    : isDone
                    ? "border-border bg-muted text-muted-foreground"
                    : isNext
                    ? "border-primary/25 bg-background text-foreground"
                    : "border-border bg-background text-muted-foreground opacity-70"

                  return (
                    <div key={col.id} className={`${base} ${styles}`}>
                      {isDone ? <Check className="h-4 w-4" /> : null}
                      <span className="whitespace-nowrap">{col.titulo}</span>
                    </div>
                  )
                })}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Dica: role lateralmente para ver todas as etapas.
              </p>
            </div>
          </div>

          {/* Triagem de Interesse */}
          <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>
                <SectionTitle icon={Users} title="Triagem de Interesse" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${triagemStatusMeta.badgeClass}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${triagemStatusMeta.dotClass}`} />
                  {triagemStatusMeta.label}
                </span>
                {semInteresseMotivo && (
                  <p className="text-xs text-muted-foreground">{`Motivo: ${semInteresseMotivo}`}</p>
                )}
                {precatorio?.data_recontato && (
                  <p className="text-xs text-muted-foreground">
                    {`Recontato: ${new Date(precatorio.data_recontato).toLocaleDateString("pt-BR")}`}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold">Atualizar interesse</span>
                  <Select
                    value={triagemStatusSelection || "SEM_CONTATO"}
                    onValueChange={(value) => setTriagemStatusSelection(value)}
                  >
                    <SelectTrigger className="min-w-[200px]">
                      <SelectValue placeholder="Escolha o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIAGEM_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold">Encaminhar para</span>
                  <Select
                    value={triagemDestinoReprovacao}
                    onValueChange={(value) => setTriagemDestinoReprovacao(value as TriagemDestinoReprovacao)}
                  >
                    <SelectTrigger className="min-w-[220px]">
                      <SelectValue placeholder="Escolha o destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIAGEM_DESTINO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveTriagemStatus}
                  disabled={triagemSaving || !triagemStatusSelection}
                >
                  {triagemSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
              {interesseObservacao && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Observação da triagem</p>
                  <p className="text-sm leading-relaxed text-foreground">{interesseObservacao}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <ModalSemInteresse
            open={semInteresseModalOpen}
            onOpenChange={setSemInteresseModalOpen}
            precatorioId={id}
            onConfirm={handleConfirmSemInteresse}
            initialMotivo={precatorio?.motivo_sem_interesse ?? ""}
            initialDataRecontato={
              precatorio?.data_recontato ? new Date(precatorio.data_recontato) : null
            }
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">

            {/* COLUNA 1: Dados Principais */}
            <div className="space-y-6">
              {/* Identificação */}
              <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>
                  <SectionTitle icon={FileText} title="Identificação" />
                </CardTitle>
              </CardHeader>
                <CardContent className="pt-0">
                  {isEditing ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label>Título</Label>
                          <Input value={editData.titulo || ""} onChange={(e) => setEditData({ ...editData, titulo: e.target.value })} />
                        </div>
                        <div>
                          <Label>Número do Precatório</Label>
                          <Input
                            value={editData.numero_precatorio || ""}
                            onChange={(e) => setEditData({ ...editData, numero_precatorio: maskProcesso(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label>Número do Processo</Label>
                          <Input value={editData.numero_processo || ""} onChange={(e) => setEditData({ ...editData, numero_processo: maskProcesso(e.target.value) })} />
                        </div>
                        <div>
                          <Label>Número do Ofício</Label>
                          <Input value={editData.numero_oficio || ""} onChange={(e) => setEditData({ ...editData, numero_oficio: e.target.value })} />
                        </div>
                      </div>
                      <Separator className="my-4" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Status</label>
                          <p className="text-base">{precatorio.status?.replace(/_/g, " ") || "—"}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <InfoRow
                        label="Número do Precatório"
                        value={precatorio.numero_precatorio ? maskProcesso(precatorio.numero_precatorio) : "—"}
                        valueClassName="text-base font-semibold"
                      />
                      <InfoRow
                        label="Número do Processo"
                        value={precatorio.numero_processo ? maskProcesso(precatorio.numero_processo) : "—"}
                      />
                      <InfoRow
                        label="Número do Ofício"
                        value={precatorio.numero_oficio || "—"}
                      />
                      <InfoRow
                        label="Status"
                        value={precatorio.status?.replace(/_/g, " ") || "—"}
                      />
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Responsável</label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-base font-semibold">{precatorio.responsavel_dados?.nome || "—"}</span>
                        </div>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>
                  <SectionTitle icon={FileText} title="Gestão de Análise" />
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Penhora</Label>
                        <Select
                          value={booleanSelectValue(editData.analise_penhora)}
                          onValueChange={(value) =>
                            setEditData({ ...editData, analise_penhora: selectValueToBoolean(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="indefinido">Não informado</SelectItem>
                            <SelectItem value="true">Sim</SelectItem>
                            <SelectItem value="false">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cessão</Label>
                        <Select
                          value={booleanSelectValue(editData.analise_cessao)}
                          onValueChange={(value) =>
                            setEditData({ ...editData, analise_cessao: selectValueToBoolean(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="indefinido">Não informado</SelectItem>
                            <SelectItem value="true">Sim</SelectItem>
                            <SelectItem value="false">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Herdeiros habilitados</Label>
                        <Select
                          value={
                            editData.analise_herdeiros === true
                              ? "Sim"
                              : editData.analise_herdeiros === false
                                ? "Não"
                                : editData.analise_herdeiros || "indefinido"
                          }
                          onValueChange={(value) =>
                            setEditData({
                              ...editData,
                              analise_herdeiros: value === "indefinido" ? null : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="indefinido">Não informado</SelectItem>
                            <SelectItem value="Sim">Sim</SelectItem>
                            <SelectItem value="Não">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Viabilidade do crédito</Label>
                        <Select
                          value={booleanSelectValue(editData.analise_viavel)}
                          onValueChange={(value) =>
                            setEditData({ ...editData, analise_viavel: selectValueToBoolean(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="indefinido">Não informado</SelectItem>
                            <SelectItem value="true">Viável</SelectItem>
                            <SelectItem value="false">Não viável</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>ITCMD</Label>
                        <Select
                          value={booleanSelectValue(editData.analise_itcmd)}
                          onValueChange={(value) =>
                            setEditData({ ...editData, analise_itcmd: selectValueToBoolean(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="indefinido">Não informado</SelectItem>
                            <SelectItem value="true">Sim</SelectItem>
                            <SelectItem value="false">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {editData.analise_penhora === true && (
                        <>
                          <div className="space-y-2">
                            <Label>Penhora valor (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editData.analise_penhora_valor ?? ""}
                              onChange={(e) =>
                                setEditData({ ...editData, analise_penhora_valor: e.target.value })
                              }
                              placeholder="0,00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Penhora percentual (%)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editData.analise_penhora_percentual ?? ""}
                              onChange={(e) =>
                                setEditData({ ...editData, analise_penhora_percentual: e.target.value })
                              }
                              placeholder="0,00"
                            />
                          </div>
                        </>
                      )}
                      {editData.analise_cessao === true && (
                        <>
                          <div className="space-y-2">
                            <Label>Cessão valor (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editData.analise_cessao_valor ?? ""}
                              onChange={(e) =>
                                setEditData({ ...editData, analise_cessao_valor: e.target.value })
                              }
                              placeholder="0,00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Cessão percentual (%)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editData.analise_cessao_percentual ?? ""}
                              onChange={(e) =>
                                setEditData({ ...editData, analise_cessao_percentual: e.target.value })
                              }
                              placeholder="0,00"
                            />
                          </div>
                        </>
                      )}
                      {editData.analise_itcmd === true && (
                        <>
                          <div className="space-y-2">
                            <Label>ITCMD valor (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editData.analise_itcmd_valor ?? ""}
                              onChange={(e) =>
                                setEditData({ ...editData, analise_itcmd_valor: e.target.value })
                              }
                              placeholder="0,00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>ITCMD percentual (%)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editData.analise_itcmd_percentual ?? ""}
                              onChange={(e) =>
                                setEditData({ ...editData, analise_itcmd_percentual: e.target.value })
                              }
                              placeholder="0,00"
                            />
                          </div>
                        </>
                      )}
                      <div className="space-y-2">
                        <Label>Adiantamento recebido valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.analise_adiantamento_valor ?? ""}
                          onChange={(e) =>
                            setEditData({ ...editData, analise_adiantamento_valor: e.target.value })
                          }
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Adiantamento recebido percentual (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.analise_adiantamento_percentual ?? ""}
                          onChange={(e) =>
                            setEditData({ ...editData, analise_adiantamento_percentual: e.target.value })
                          }
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Honorários contratuais valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.analise_honorarios_valor ?? ""}
                          onChange={(e) =>
                            setEditData({ ...editData, analise_honorarios_valor: e.target.value })
                          }
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Honorários contratuais percentual (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editData.analise_honorarios_percentual ?? ""}
                          onChange={(e) =>
                            setEditData({ ...editData, analise_honorarios_percentual: e.target.value })
                          }
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Observações da análise</Label>
                      <Textarea
                        value={editData.analise_observacoes || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, analise_observacoes: e.target.value })
                        }
                        rows={4}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Penhora</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatBoolean(precatorio.analise_penhora)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Cessão</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatBoolean(precatorio.analise_cessao)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Herdeiros habilitados</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatHerdeiros(precatorio.analise_herdeiros)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Viabilidade do crédito</p>
                        <p
                          className={`text-sm font-semibold ${
                            precatorio.analise_viavel === true
                              ? "text-emerald-600"
                              : precatorio.analise_viavel === false
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {precatorio.analise_viavel === true
                            ? "Viável"
                            : precatorio.analise_viavel === false
                              ? "Não viável"
                              : "Não informado"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">ITCMD</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatBoolean(precatorio.analise_itcmd)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {precatorio.analise_penhora === true && (
                        <>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Penhora valor (R$)</p>
                            <p className="text-sm font-semibold text-foreground">
                              {hasValue(precatorio.analise_penhora_valor)
                                ? formatCurrency(precatorio.analise_penhora_valor)
                                : "—"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Penhora percentual (%)</p>
                            <p className="text-sm font-semibold text-foreground">
                              {formatPercent(precatorio.analise_penhora_percentual) || "—"}
                            </p>
                          </div>
                        </>
                      )}
                      {precatorio.analise_cessao === true && (
                        <>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Cessão valor (R$)</p>
                            <p className="text-sm font-semibold text-foreground">
                              {hasValue(precatorio.analise_cessao_valor)
                                ? formatCurrency(precatorio.analise_cessao_valor)
                                : "—"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Cessão percentual (%)</p>
                            <p className="text-sm font-semibold text-foreground">
                              {formatPercent(precatorio.analise_cessao_percentual) || "—"}
                            </p>
                          </div>
                        </>
                      )}
                      {precatorio.analise_itcmd === true && (
                        <>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">ITCMD valor (R$)</p>
                            <p className="text-sm font-semibold text-foreground">
                              {hasValue(precatorio.analise_itcmd_valor)
                                ? formatCurrency(precatorio.analise_itcmd_valor)
                                : "—"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">ITCMD percentual (%)</p>
                            <p className="text-sm font-semibold text-foreground">
                              {formatPercent(precatorio.analise_itcmd_percentual) || "—"}
                            </p>
                          </div>
                        </>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Adiantamento recebido valor (R$)</p>
                        <p className="text-sm font-semibold text-foreground">
                          {hasValue(precatorio.analise_adiantamento_valor)
                            ? formatCurrency(precatorio.analise_adiantamento_valor)
                            : "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Adiantamento recebido percentual (%)</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatPercent(precatorio.analise_adiantamento_percentual) || "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Honorários contratuais valor (R$)</p>
                        <p className="text-sm font-semibold text-foreground">
                          {hasValue(precatorio.analise_honorarios_valor)
                            ? formatCurrency(precatorio.analise_honorarios_valor)
                            : "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Honorários contratuais percentual (%)</p>
                        <p className="text-sm font-semibold text-foreground">
                          {formatPercent(precatorio.analise_honorarios_percentual) || "—"}
                        </p>
                      </div>
                    </div>

                    {precatorio.analise_observacoes && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Observações da análise</p>
                        <p className="text-sm text-foreground whitespace-pre-line">
                          {precatorio.analise_observacoes}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Vara de Origem e Devedor */}
            <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>
                  <SectionTitle icon={Gavel} title="Vara de Origem e Devedor" />
                </CardTitle>
              </CardHeader>
                <CardContent className="pt-0">
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userRole?.includes("admin") && (
                        <div className="md:col-span-2">
                          <Label>Vara de Origem</Label>
                          <Input
                            placeholder="Ex: 2ª Vara Cível, Vara do Trabalho, etc"
                            value={editData.tribunal || ""}
                            onChange={(e) => setEditData({ ...editData, tribunal: e.target.value })}
                          />
                        </div>
                      )}
                      <div>
                        <Label>Devedor</Label>
                        <Input value={editData.devedor || ""} onChange={(e) => setEditData({ ...editData, devedor: e.target.value })} />
                      </div>
                      <div>
                        <Label>Esfera do Devedor</Label>
                        <Select
                          value={editData.esfera_devedor || ""}
                          onValueChange={(value) => setEditData({ ...editData, esfera_devedor: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ESFERA_DEVEDOR_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <InfoRow
                        label="Vara de Origem"
                        value={precatorio.tribunal || "—"}
                        valueClassName="text-base font-semibold"
                      />
                      <InfoRow label="Devedor" value={precatorio.devedor || "—"} />
                      <InfoRow label="Esfera do Devedor" value={getEsferaDevedorLabel(precatorio.esfera_devedor)} />
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* COLUNA 2: Financeiro e Datas */}
              {/* Valores */}
              <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>
                  <SectionTitle icon={DollarSign} title="Valores" />
                </CardTitle>
              </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">Valor Principal</label>
                      <p className="text-lg font-semibold text-foreground">
                        {hasValue(precatorio.valor_principal) ? formatCurrency(precatorio.valor_principal) : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">Valor Atualizado</label>
                      <p className="text-2xl font-bold text-foreground">
                        {hasValue(precatorio.valor_atualizado) ? formatCurrency(precatorio.valor_atualizado) : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">Saldo Líquido</label>
                      <p className="text-xl font-bold text-foreground">
                        {hasValue(precatorio.saldo_liquido) ? formatCurrency(precatorio.saldo_liquido) : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">PSS</label>
                      <p className="text-base text-foreground">
                        {hasValue(precatorio.pss_valor)
                          ? precatorio.pss_valor === 0
                            ? "Isento"
                            : formatCurrency(precatorio.pss_valor)
                          : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">IRPF</label>
                      <p className="text-base text-foreground">
                        {hasValue(precatorio.irpf_valor)
                          ? formatCurrency(precatorio.irpf_valor)
                          : precatorio.irpf_isento
                            ? "Isento"
                            : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">Honorários</label>
                      <p className="text-base text-foreground">
                        {hasValue(precatorio.honorarios_valor)
                          ? formatCurrency(precatorio.honorarios_valor)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">Proposta Maior</label>
                      <p className="text-xl font-bold text-red-500 dark:text-red-400">
                        {hasValue(precatorio.proposta_maior_valor) ? formatCurrency(precatorio.proposta_maior_valor) : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase">Proposta Menor</label>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {hasValue(precatorio.proposta_menor_valor) ? formatCurrency(precatorio.proposta_menor_valor) : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Datas */}
              <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>
                  <SectionTitle icon={Calendar} title="Datas Importantes" />
                </CardTitle>
              </CardHeader>
                <CardContent className="pt-0">
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Data Base</Label>
                        <Input type="date" value={editData.data_base || ""} onChange={(e) => setEditData({ ...editData, data_base: e.target.value })} />
                      </div>
                      <div>
                        <Label>Data de Expedição</Label>
                        <Input type="date" value={editData.data_expedicao || ""} onChange={(e) => setEditData({ ...editData, data_expedicao: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data Base</label>
                        <p className="text-base">{precatorio.data_base ? formatDate(precatorio.data_base) : "Não informada"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Expedição</label>
                        <p className="text-base">{precatorio.data_expedicao ? formatDate(precatorio.data_expedicao) : "Não informada"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Cálculo</label>
                        <p className="text-base">{precatorio.data_calculo ? formatDate(precatorio.data_calculo) : "Não realizado"}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* COLUNA 3: Partes e Observações */}
            <div className="space-y-6">
              {/* Dados Bancários */}
              <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>
                  <SectionTitle icon={DollarSign} title="Dados Bancários" />
                </CardTitle>
              </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {isEditing ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Banco</Label>
                          <Input
                            placeholder="Ex: Banco do Brasil"
                            value={editData.banco || ""}
                            onChange={(e) => setEditData({ ...editData, banco: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Tipo de Conta</Label>
                          <Select
                            value={editData.tipo_conta || "corrente"}
                            onValueChange={(value) => setEditData({ ...editData, tipo_conta: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="corrente">Conta Corrente</SelectItem>
                              <SelectItem value="poupanca">Conta Poupança</SelectItem>
                              <SelectItem value="pagamento">Conta de Pagamento</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Agência</Label>
                          <Input
                            placeholder="Sem dígito"
                            value={editData.agencia || ""}
                            onChange={(e) => setEditData({ ...editData, agencia: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Conta</Label>
                          <Input
                            placeholder="Com dígito"
                            value={editData.conta || ""}
                            onChange={(e) => setEditData({ ...editData, conta: e.target.value })}
                          />
                        </div>
                      </div>
                      <Separator className="my-2" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Tipo Chave PIX</Label>
                          <Select
                            value={editData.tipo_chave_pix || "cpf"}
                            onValueChange={(value) => setEditData({ ...editData, tipo_chave_pix: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cpf">CPF/CNPJ</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="telefone">Telefone</SelectItem>
                              <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Chave PIX</Label>
                          <Input
                            value={editData.chave_pix || ""}
                            onChange={(e) => setEditData({ ...editData, chave_pix: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Observações Bancárias</Label>
                        <Textarea
                          value={editData.observacoes_bancarias || ""}
                          onChange={(e) => setEditData({ ...editData, observacoes_bancarias: e.target.value })}
                          placeholder="Ex: Pagamento somente em nome do titular..."
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Banco</label>
                          <p className="text-base">{precatorio.banco || "—"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                          <p className="text-base capitalize">{precatorio.tipo_conta || "—"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Agência</label>
                          <p className="text-base">{precatorio.agencia || "—"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Conta</label>
                          <p className="text-base">{precatorio.conta || "—"}</p>
                        </div>
                      </div>
                      {precatorio.chave_pix && (
                        <div className="bg-muted/30 p-3 rounded-md border mt-2">
                          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <ExternalLink className="h-3 w-3" /> PIX ({precatorio.tipo_chave_pix || "Chave"})
                          </label>
                          <p className="text-base font-mono mt-1 select-all">{precatorio.chave_pix}</p>
                        </div>
                      )}
                      {precatorio.observacoes_bancarias && (
                        <div className="mt-2">
                          <label className="text-sm font-medium text-muted-foreground">Observações</label>
                          <p className="text-sm mt-1">{precatorio.observacoes_bancarias}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Credor e Advogado - Compactados ou em Abas? Vou deixar em cards um abaixo do outro por enquanto */}
              <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>
                  <SectionTitle icon={User} title="Partes (Credor/Adv)" />
                </CardTitle>
              </CardHeader>
                <CardContent className="pt-0 space-y-6">
                  {/* Renderiza Credor Form/View */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">Credor</h4>
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Input value={editData.credor_nome || ""} onChange={(e) => setEditData({ ...editData, credor_nome: e.target.value })} placeholder="Nome do Credor" />
                        </div>
                        <div>
                          <Input value={editData.credor_cpf_cnpj || ""} onChange={(e) => setEditData({ ...editData, credor_cpf_cnpj: e.target.value })} placeholder="CPF/CNPJ" />
                        </div>
                        <div>
                          <Input value={editData.credor_telefone || ""} onChange={(e) => setEditData({ ...editData, credor_telefone: e.target.value })} placeholder="Telefone" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-medium text-base">{precatorio.credor_nome || "—"}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <p className="text-sm text-muted-foreground">{precatorio.credor_cpf_cnpj || "—"}</p>
                          <p className="text-sm text-muted-foreground">{precatorio.credor_telefone || "—"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">Advogado</h4>
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input value={editData.advogado_nome || ""} onChange={(e) => setEditData({ ...editData, advogado_nome: e.target.value })} placeholder="Nome do Advogado" />
                        <Input value={editData.advogado_oab || ""} onChange={(e) => setEditData({ ...editData, advogado_oab: e.target.value })} placeholder="OAB" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <p className="font-medium text-base">{precatorio.advogado_nome || "—"}</p>
                        <p className="text-sm text-muted-foreground">{precatorio.advogado_oab || "—"}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>


              <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <SectionTitle icon={Users} title="Herdeiros" />
                    {herdeiros.length > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {herdeiros.length}
                      </Badge>
                    )}
                  </CardTitle>
                  {canEdit && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddHerdeiro}
                        disabled={herdeiroSaving}
                      >
                        Adicionar herdeiro
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {herdeirosLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando herdeiros...</p>
                  ) : herdeiros.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum herdeiro informado.</p>
                  ) : (
                    <div className="space-y-3">
                      {herdeiros.map((herdeiro) => (
                        <button
                          key={herdeiro.id}
                          type="button"
                          onClick={() => handleOpenHerdeiro(herdeiro)}
                          className="w-full text-left rounded-md border bg-muted/20 p-3 transition hover:border-primary/50 hover:bg-muted/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-medium">{herdeiro.nome_completo || "Herdeiro"}</p>
                              {herdeiro.cpf && (
                                <p className="text-xs text-muted-foreground">CPF: {herdeiro.cpf}</p>
                              )}
                              {herdeiro.telefone && (
                                <p className="text-xs text-muted-foreground">Telefone: {herdeiro.telefone}</p>
                              )}
                              {herdeiro.endereco && (
                                <p className="text-xs text-muted-foreground">Endereço: {herdeiro.endereco}</p>
                              )}
                              {herdeiro.email && (
                                <p className="text-xs text-muted-foreground">Email: {herdeiro.email}</p>
                              )}
                            </div>
                            {formatPercent(herdeiro.percentual_participacao) && (
                              <Badge variant="outline" className="text-xs">
                                {formatPercent(herdeiro.percentual_participacao)}
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Dialog
                open={herdeiroModalOpen}
                onOpenChange={(open) => {
                  setHerdeiroModalOpen(open)
                  if (!open) {
                    setSelectedHerdeiro(null)
                    setHerdeiroEdit(null)
                    setHerdeiroEditMode(false)
                  }
                }}
              >
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedHerdeiro?.nome_completo || "Detalhes do Herdeiro"}
                    </DialogTitle>
                  </DialogHeader>
                  {selectedHerdeiro ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase">Nome</label>
                          {herdeiroEditMode ? (
                            <Input
                              value={herdeiroEdit?.nome_completo || ""}
                              onChange={(e) => updateHerdeiroEdit("nome_completo", e.target.value)}
                            />
                          ) : (
                            <p className="text-base">{selectedHerdeiro.nome_completo || "—"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase">CPF</label>
                          {herdeiroEditMode ? (
                            <Input
                              value={herdeiroEdit?.cpf || ""}
                              onChange={(e) => updateHerdeiroEdit("cpf", e.target.value)}
                            />
                          ) : (
                            <p className="text-base">{selectedHerdeiro.cpf || "—"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase">Telefone</label>
                          {herdeiroEditMode ? (
                            <Input
                              value={herdeiroEdit?.telefone || ""}
                              onChange={(e) => updateHerdeiroEdit("telefone", e.target.value)}
                            />
                          ) : (
                            <p className="text-base">{selectedHerdeiro.telefone || "—"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase">Email</label>
                          {herdeiroEditMode ? (
                            <Input
                              value={herdeiroEdit?.email || ""}
                              onChange={(e) => updateHerdeiroEdit("email", e.target.value)}
                            />
                          ) : (
                            <p className="text-base">{selectedHerdeiro.email || "—"}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase">Participação</label>
                          {herdeiroEditMode ? (
                            <Input
                              value={herdeiroEdit?.percentual_participacao?.toString() || ""}
                              onChange={(e) => {
                                const value = e.target.value.replace(",", ".")
                                const parsed = value === "" ? null : Number(value)
                                updateHerdeiroEdit("percentual_participacao", Number.isNaN(parsed) ? null : parsed)
                              }}
                            />
                          ) : (
                            <p className="text-base">{formatPercent(selectedHerdeiro.percentual_participacao) || "—"}</p>
                          )}
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase">Endereço</label>
                          {herdeiroEditMode ? (
                            <Input
                              value={herdeiroEdit?.endereco || ""}
                              onChange={(e) => updateHerdeiroEdit("endereco", e.target.value)}
                            />
                          ) : (
                            <p className="text-base">{selectedHerdeiro.endereco || "—"}</p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase text-muted-foreground">Dados Bancários</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Banco</label>
                            {herdeiroEditMode ? (
                              <Input
                                value={herdeiroEdit?.banco || ""}
                                onChange={(e) => updateHerdeiroEdit("banco", e.target.value)}
                              />
                            ) : (
                              <p className="text-base">{selectedHerdeiro.banco || "—"}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Tipo de Conta</label>
                            {herdeiroEditMode ? (
                              <Input
                                value={herdeiroEdit?.tipo_conta || ""}
                                onChange={(e) => updateHerdeiroEdit("tipo_conta", e.target.value)}
                              />
                            ) : (
                              <p className="text-base capitalize">{selectedHerdeiro.tipo_conta || "—"}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Agência</label>
                            {herdeiroEditMode ? (
                              <Input
                                value={herdeiroEdit?.agencia || ""}
                                onChange={(e) => updateHerdeiroEdit("agencia", e.target.value)}
                              />
                            ) : (
                              <p className="text-base">{selectedHerdeiro.agencia || "—"}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Conta</label>
                            {herdeiroEditMode ? (
                              <Input
                                value={herdeiroEdit?.conta || ""}
                                onChange={(e) => updateHerdeiroEdit("conta", e.target.value)}
                              />
                            ) : (
                              <p className="text-base">{selectedHerdeiro.conta || "—"}</p>
                            )}
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Chave PIX</label>
                            {herdeiroEditMode ? (
                              <Input
                                value={herdeiroEdit?.chave_pix || ""}
                                onChange={(e) => updateHerdeiroEdit("chave_pix", e.target.value)}
                              />
                            ) : (
                              <p className="text-base">{selectedHerdeiro.chave_pix || "—"}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        {herdeiroEditMode ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setHerdeiroEdit(selectedHerdeiro)
                                setHerdeiroEditMode(false)
                              }}
                              disabled={herdeiroSaving}
                            >
                              Cancelar
                            </Button>
                            <Button onClick={handleSaveHerdeiro} disabled={herdeiroSaving}>
                              {herdeiroSaving ? "Salvando..." : "Salvar"}
                            </Button>
                          </>
                        ) : (
                          <Button onClick={() => setHerdeiroEditMode(true)}>Editar</Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum herdeiro selecionado.</p>
                  )}
                </DialogContent>
              </Dialog>

              {/* Observações */}
              <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle>
                    <SectionTitle title="Observações" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {isEditing ? (
                    <Textarea value={editData.contatos || ""} onChange={(e) => setEditData({ ...editData, contatos: e.target.value })} rows={4} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{precatorio.contatos || "Nenhuma observação."}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documentos" className="mt-0">
          <ChecklistDocumentos
            precatorioId={id}
            canEdit={canEdit}
            onUpdate={loadPrecatorio}
            pdfUrl={precatorio?.file_url} // Passando URL do Ofício para permitir visualização
          />
        </TabsContent>

        {/* Tab: Ofício */}
        <TabsContent value="oficio" className="space-y-6">
          <OficioViewer
            precatorioId={precatorio.id}
            fileUrl={precatorio.file_url}
            onFileUpdate={loadPrecatorio}
            readonly={!canManageOficio}
            currentStatus={precatorio.status_kanban || precatorio.localizacao_kanban || precatorio.status}
          />
        </TabsContent>

        {/* Tab: Certidões */}
        <TabsContent value="certidoes" className="mt-0">
          <ChecklistCertidoes
            precatorioId={id}
            canEdit={canEdit}
            onUpdate={loadPrecatorio}
            initialStatus={precatorio?.status_certidoes}
          />
        </TabsContent>

        {/* Tab: Jurídico */}
        <TabsContent value="juridico" className="mt-0 space-y-6">
          <div className="max-w-4xl">
            {precatorio.status_kanban === "proposta_aceita" && (
              <Card className="mb-4 border-emerald-200 bg-emerald-50/70">
                <CardContent className="py-4 flex items-start gap-3 text-emerald-900">
                  <CheckCircle2 className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-semibold">Aceite confirmado</p>
                    <p className="text-sm text-emerald-700">
                      Este precatório entrou em jurídico de fechamento e aguarda parecer do jurídico.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {precatorio.status_kanban === "proposta_aceita" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gavel className="h-5 w-5" />
                    Parecer Jurídico (Fechamento)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Decisão do Jurídico</Label>
                      <Select
                        value={fechamentoData.liberado ? "aprovado" : "reprovado"}
                        onValueChange={(value) =>
                          setFechamentoData((prev) => ({
                            ...prev,
                            liberado: value === "aprovado",
                          }))
                        }
                        disabled={!canEditFechamento}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a decisão" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aprovado">Aprovar crédito</SelectItem>
                          <SelectItem value="reprovado">Reprovar crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {!fechamentoData.liberado && (
                      <div className="space-y-2">
                        <Label>Resultado final</Label>
                        <Select
                          value={fechamentoData.resultadoFinal}
                          onValueChange={(value) =>
                            setFechamentoData((prev) => ({
                              ...prev,
                              resultadoFinal: value,
                            }))
                          }
                          disabled={!canEditFechamento}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o resultado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reprovado">Reprovado</SelectItem>
                            <SelectItem value="nao_elegivel">Não elegível</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Observações do Jurídico</Label>
                    <Textarea
                      value={fechamentoData.pendencias}
                      onChange={(e) =>
                        setFechamentoData((prev) => ({
                          ...prev,
                          pendencias: e.target.value,
                        }))
                      }
                      placeholder="Descreva o parecer e as observações do jurídico..."
                      rows={6}
                      disabled={!canEditFechamento}
                    />
                    <p className="text-xs text-muted-foreground">
                      Esse parecer ficará registrado como observação do fechamento jurídico.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveFechamento}
                      disabled={fechamentoSaving || !canEditFechamento}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {fechamentoSaving ? "Salvando..." : "Salvar Parecer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : precatorio.status_kanban === "juridico" ? (
              // Se está em análise: Jurídico/Admin vê formulário de parecer, Outros veem aviso
              (userRole?.includes('admin') || userRole?.includes('juridico')) ? (
                <FormParecerJuridico
                  precatorioId={id}
                  precatorio={precatorio}
                  onUpdate={loadPrecatorio}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <Scale className="h-12 w-12 mb-4 opacity-50" />
                    <p className="font-medium">Precatório em Jurídico</p>
                    <p className="text-sm mt-1">Aguardando emissão de parecer pelo setor responsável.</p>
                  </CardContent>
                </Card>
              )
            ) : (
              <div className="space-y-4">
                {hasFechamentoParecer && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Gavel className="h-5 w-5" />
                        Parecer Jurídico (Fechamento)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm font-semibold">
                        {precatorio.juridico_liberou_fechamento ? "Crédito aprovado" : "Crédito reprovado"}
                        {precatorio.juridico_resultado_final
                          ? ` • ${precatorio.juridico_resultado_final === "nao_elegivel" ? "Não elegível" : "Reprovado"}`
                          : ""}
                      </p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {precatorio.pendencias_fechamento || "Sem observações registradas."}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {precatorio.juridico_parecer_status && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Parecer Jurídico
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm font-semibold">Status: {precatorio.juridico_parecer_status}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {precatorio.juridico_parecer_texto || "Sem observações registradas."}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!precatorio.juridico_parecer_status && !precatorio.pendencias_fechamento && (
                  (userRole?.includes('juridico') && !userRole?.includes('admin')) ? (
                    <Card>
                      <CardContent className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                        <CheckSquare className="h-12 w-12 mb-4 opacity-50" />
                        <p className="font-medium">Sem pendências jurídicas</p>
                        <p className="text-sm mt-1">Nenhuma solicitação de análise em aberto para este precatório.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <FormSolicitarJuridico
                      precatorioId={id}
                      onUpdate={loadPrecatorio}
                    />
                  )
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Cálculo */}
        <TabsContent value="calculo" className="mt-0 space-y-6">
          {isAdmin && hasCalculoSalvo && !adminRecalcular ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold mb-0 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Detalhamento do Cálculo
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl px-4"
                    onClick={handleEnviarFilaCalculo}
                    disabled={sendingToCalculo}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Enviar para fila
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-9 rounded-xl px-4"
                    onClick={() => setAdminRecalcular(true)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Realizar novo cálculo
                  </Button>
                </div>
              </div>
              <ResumoCalculoDetalhado precatorio={precatorio} />

              <div className="mt-8 border-t pt-8">
                <h3 className="text-lg font-semibold mb-4">Histórico de Versões</h3>
                <HistoricoCalculos precatorioId={id} />
              </div>
            </div>
          ) : isAdmin || isOperadorCalculo ? (
            <div className="space-y-6">
              <CalculadoraPrecatorios precatorioId={id} onUpdate={loadPrecatorio} />
              <div className="mt-8 border-t pt-8">
                <h3 className="text-lg font-semibold mb-4">Histórico de Versões</h3>
                <HistoricoCalculos precatorioId={id} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Detalhamento do Cálculo
              </h3>
              <ResumoCalculoDetalhado precatorio={precatorio} />

              <div className="mt-8 border-t pt-8">
                <h3 className="text-lg font-semibold mb-4">Histórico de Versões</h3>
                <HistoricoCalculos precatorioId={id} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Propostas */}
        <TabsContent value="propostas" className="mt-0">
          <AbaProposta
            precatorioId={id}
            precatorio={precatorio}
            onUpdate={loadPrecatorio}
            userRole={userRole}
            currentUserId={profile?.id ?? null}
          />
        </TabsContent>

        {/* Tab: Fechamento */}
        <TabsContent value="fechamento" className="mt-0">
          <AbaFechamento
            precatorioId={id}
            precatorio={precatorio}
            onUpdate={loadPrecatorio}
            userRole={roles}
          />
        </TabsContent>

        {/* Tab: Timeline */}
        <TabsContent value="timeline" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Linha do Tempo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline precatorioId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs >

      {/* Modal de PDF */}
      < PdfViewerModal
        open={showPdfModal}
        onOpenChange={setShowPdfModal}
        pdfUrl={precatorio?.pdf_url}
        titulo={precatorio?.titulo}
        precatorioId={id}
        canCalculate={userRole ? !userRole.includes("operador_comercial") : false}
      />
    </div >
  )
}
