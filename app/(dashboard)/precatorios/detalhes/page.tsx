"use client"
/* eslint-disable */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Chip, ScrollShadow } from "@/lib/heroui/compat"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
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
} from "@/components/icons"
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
import { AbaEscrituras } from "@/components/kanban/aba-escrituras"
import { TimelineViewer } from "@/components/precatorios/timeline-viewer"
import { FormParecerJuridico } from "@/components/kanban/form-parecer-juridico"
import { FormExportarCalculo } from "@/components/kanban/form-exportar-calculo"
import { HistoricoCalculos } from "@/components/kanban/historico-calculos"
import { ModalSemInteresse } from "@/components/kanban/modal-sem-interesse"
import CalculadoraPrecatorios from "@/components/calculador-precatorios"
import { ResumoCalculoDetalhado } from "@/components/precatorios/resumo-calculo-detalhado"
import { ProjecaoComparativoPanel } from "@/components/precatorios/comparativo/projecao-comparativo-panel"

import { AbaProposta } from "@/components/kanban/aba-proposta"
import { OficioViewer } from "@/components/kanban/oficio-viewer"
import { LegalOpinionPanel } from "@/features/legal-opinion/components/legal-opinion-panel"
import { buscarCEP, formatarCEP } from "@/lib/utils/cep"
import { sendAdminNotification } from "@/lib/utils/admin-notifications"
import { KANBAN_COLUMNS } from "../../kanban/columns"
import { MOTION } from "@/lib/motion"
import { DetailSection } from "@/components/motion/DetailSection"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hasValue = (v: any): boolean => v !== null && v !== undefined

function normalizeRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean)
        }
      } catch {
        // fallback below
      }
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((item) => item.replace(/^"+|"+$/g, "").trim())
        .filter(Boolean)
    }

    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    }

    return [trimmed]
  }

  return []
}

function formatStructuredText(value: unknown): string {
  if (value === null || value === undefined) return ""

  if (typeof value === "string") {
    return value.trim()
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatStructuredText(item))
      .filter(Boolean)
      .join("\n")
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entryValue]) => {
        const formattedValue = formatStructuredText(entryValue)
        return formattedValue ? `${key}: ${formattedValue}` : ""
      })
      .filter(Boolean)
      .join("\n")
  }

  return String(value)
}

const SectionTitle = ({ icon: Icon, title }: { icon?: LucideIcon; title: string }) => (
  <div className="flex items-center gap-2.5">
    {Icon ? (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner dark:border-primary/30 dark:from-primary/30 dark:to-primary/10">
        <Icon className="h-4.5 w-4.5" />
      </span>
    ) : null}
    <span className="text-[1.65rem] font-semibold tracking-tight">{title}</span>
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
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
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

type TriagemDestinoReprovacao = "none" | "reprovado" | "nao_elegivel" | "credito_vendido"

type AdminAlertRecipientOption = {
  id: string
  label: string
}

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
 * -œ… Versão compatível com `output: "export"`:
 * - Remove rota din-mica `/precatorios/[id]`
 * - Usa querystring: `/precatorios/detalhes?id=<UUID>`
 */
export default function PrecatorioDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile, user } = useAuth()

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
    if (!value) return "-"
    const normalized = normalizeEsferaDevedor(value)
    const option = ESFERA_DEVEDOR_OPTIONS.find((opt) => opt.value === normalized)
    return option?.label || value
  }
  const [saving, setSaving] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editData, setEditData] = useState<any>({})
  const [userRole, setUserRole] = useState<string[]>([])
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState("detalhes")
  const reduceMotion = useReducedMotion()
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
  const [adminRecipients, setAdminRecipients] = useState<AdminAlertRecipientOption[]>([])
  const [adminTargetUserId, setAdminTargetUserId] = useState("")
  const [adminInterestMessage, setAdminInterestMessage] = useState("")
  const [adminInterestSending, setAdminInterestSending] = useState(false)
  const [adminInterestModalOpen, setAdminInterestModalOpen] = useState(false)
  const [advancingStage, setAdvancingStage] = useState(false)



  const roles = userRole
  const isAdmin = roles.includes("admin")
  const isOperadorCalculo = roles.includes("operador_calculo")
  const canEdit = roles.some((role) =>
    [
      "admin",
      "operador_comercial",
      "operador_calculo",
      "gestor",
      "gestor_oficio",
      "gestor_certidoes",
      "gestor_escrituras",
    ].includes(role)
  )
  const canEditValorPrincipal = roles.some((role) =>
    ["admin", "operador_comercial", "operador", "gestor"].includes(role)
  )
  const canEditValorAtualizado = roles.some((role) =>
    ["admin", "gestor"].includes(role)
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
      "gestor_escrituras",
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
    statusAtualColumn?.titulo || (statusAtual ? statusAtual.replace(/_/g, " ") : "-")

  const hasCalculoSalvo = (() => {
    if (!precatorio) return false
    const dadosCalculo = precatorio.dados_calculo
    const hasDadosCalculo =
      !!dadosCalculo && typeof dadosCalculo === "object" && Object.keys(dadosCalculo).length > 0
    const valorAtualizado = Number(precatorio.valor_atualizado || 0)
    const saldoLiquido = Number(precatorio.saldo_liquido || 0)
    return hasDadosCalculo || valorAtualizado > 0 || saldoLiquido > 0 || !!precatorio.calculo_ultima_versao
  })()
  const defaultComparativoPrecoCompra = (() => {
    if (!precatorio) return null
    const candidates = [
      precatorio.proposta_menor_valor,
      precatorio.saldo_liquido,
      precatorio.valor_atualizado,
      precatorio.valor_principal,
    ]

    for (const candidate of candidates) {
      const parsed = Number(candidate)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }

    return null
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
    escrituras: "escrituras",
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
        "border-border bg-muted text-muted-foreground dark:border-border dark:bg-muted dark:text-muted-foreground",
      dotClass: "bg-muted",
    },
    CONTATO_EM_ANDAMENTO: {
      label: "Contato em andamento",
      badgeClass:
        "border-primary/40 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary",
      dotClass: "bg-primary/15",
    },
    PEDIR_RETORNO: {
      label: "Pedir retorno",
      badgeClass:
        "border-primary/40 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary",
      dotClass: "bg-primary/15",
    },
    SEM_INTERESSE: {
      label: "Sem interesse",
      badgeClass:
        "border-destructive/40 bg-destructive/15 text-destructive dark:border-destructive/40 dark:bg-destructive/15 dark:text-destructive",
      dotClass: "bg-destructive/15",
    },
    TEM_INTERESSE: {
      label: "Tem interesse",
      badgeClass:
        "border-primary/40 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary",
      dotClass: "bg-primary/15",
    },
  }
  const getTriagemStatusMeta = (status?: string | null) => {
    const normalized = status?.toUpperCase()
    if (!normalized) {
      return {
        label: "Não informado",
        badgeClass:
          "border-border bg-muted text-muted-foreground dark:border-border dark:bg-muted dark:text-muted-foreground",
        dotClass: "bg-muted",
      }
    }
    return (
      TRIAGEM_STATUS_META[normalized] || {
        label: normalized.replace(/_/g, " ").toLowerCase(),
        badgeClass:
          "border-border bg-muted text-muted-foreground dark:border-border dark:bg-muted dark:text-muted-foreground",
        dotClass: "bg-muted",
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
    { value: "credito_vendido", label: "Credor vendeu o crédito (Reprovado / não elegível)" },
  ]
  const triagemStatusMeta = getTriagemStatusMeta(precatorio?.interesse_status)
  const interesseObservacao = precatorio?.interesse_observacao?.trim()
  const semInteresseMotivo = precatorio?.motivo_sem_interesse?.trim()
  const precatorioAdminLabel =
    precatorio?.titulo ||
    precatorio?.numero_precatorio ||
    precatorio?.credor_nome ||
    "Credito sem identificacao"
  const resolveStatusColumnId = (status?: string | null) => {
    if (!status) return null
    const column = KANBAN_COLUMNS.find((col) => col.id === status || col.statusIds?.includes(status))
    return column?.id || status
  }
  const getTabForStatus = (status?: string | null) => {
    const normalized = resolveStatusColumnId(status)
    if (!normalized) return null
    if (normalized === "proposta_aceita") {
      return canEditFechamento ? "fechamento" : "propostas"
    }
    return STATUS_TAB_MAP[normalized] || null
  }
  const syncTabToUrl = (tab: string) => {
    if (!id) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("id", id)
    params.set("tab", tab)
    router.replace(`/precatorios/detalhes?${params.toString()}`)
  }
  const openAgendaForPrecatorio = () => {
    if (!id) return
    const agendaParams = new URLSearchParams()
    agendaParams.set("novo", "1")
    agendaParams.set("precatorioId", id)
    router.push(`/agenda?${agendaParams.toString()}`)
  }
  useEffect(() => {
    if (!id) return
    const key = `precatorio-tab:${id}:page`
    const allowedTabs = new Set([
      "detalhes",
      "oficio",
      "documentos",
      "certidoes",
      "escrituras",
      "juridico",
      "fechamento",
      "calculo",
      "comparativo",
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
        console.log("ðŸ”’ [Acesso Controlado] Tentando acesso forçado via RPC...")
        const { data: rpcData, error: rpcError } = await supabase.rpc("buscar_precatorio_por_id_acesso_controlado", {
          p_id: id,
        })

        if (rpcError) {
          console.error("-Œ [Acesso Controlado] Erro na RPC:", rpcError)
        } else if (rpcData && rpcData.length > 0) {
          console.log("-œ… [Acesso Controlado] Dados recuperados via RPC")
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

      const normalizedFinalData = {
        ...finalData,
        contatos: formatStructuredText(finalData?.contatos),
      }

      setPrecatorio(normalizedFinalData)
      const previsaoPagamentoRaw = finalData?.previsao_pagamento
        ? String(finalData.previsao_pagamento).slice(0, 4)
        : ""
      const previsaoPagamentoAno = /^\d{4}$/.test(previsaoPagamentoRaw) ? previsaoPagamentoRaw : ""
      setEditData({
        ...normalizedFinalData,
        esfera_devedor: normalizeEsferaDevedor(finalData?.esfera_devedor) || "",
        previsao_pagamento: previsaoPagamentoAno,
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
      const profileRoles = normalizeRoles(profile?.role)
      const metadataRoles = normalizeRoles(user?.app_metadata?.role)
      setUserRole(profileRoles.length ? profileRoles : metadataRoles)

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
    const profileRoles = normalizeRoles(profile?.role)
    const metadataRoles = normalizeRoles(user?.app_metadata?.role)
    setUserRole(profileRoles.length ? profileRoles : metadataRoles)
  }, [profile, user])

  useEffect(() => {
    if (!precatorio) return
    setFechamentoData({
      pendencias: precatorio.pendencias_fechamento || "",
      liberado: !!precatorio.juridico_liberou_fechamento,
      resultadoFinal: precatorio.juridico_resultado_final || "reprovado",
    })
  }, [precatorio?.pendencias_fechamento, precatorio?.juridico_liberou_fechamento, precatorio?.juridico_resultado_final])

  const loadAdminRecipients = useCallback(async () => {
    if (!isAdmin || !precatorio) {
      setAdminRecipients([])
      setAdminTargetUserId("")
      return
    }

    const candidates = [
      { id: String(precatorio?.responsavel_calculo_id || ""), roleLabel: "Operador de calculo" },
      { id: String(precatorio?.responsavel || ""), roleLabel: "Responsavel comercial" },
      { id: String(precatorio?.dono_usuario_id || ""), roleLabel: "Dono do credito" },
      { id: String(precatorio?.responsavel_oficio_id || ""), roleLabel: "Responsavel de oficio" },
      { id: String(precatorio?.responsavel_certidoes_id || ""), roleLabel: "Responsavel de certidoes" },
      { id: String(precatorio?.responsavel_escrituras_id || ""), roleLabel: "Responsavel de escrituras" },
      { id: String(precatorio?.responsavel_juridico_id || ""), roleLabel: "Responsavel juridico" },
    ].filter((item) => item.id.length > 0)

    const uniqueCandidates = Array.from(
      new Map(candidates.map((item) => [item.id, item])).values()
    )

    if (uniqueCandidates.length === 0) {
      setAdminRecipients([])
      setAdminTargetUserId("")
      return
    }

    try {
      const supabase = requireSupabase()
      const ids = uniqueCandidates.map((item) => item.id)
      const { data: usersData, error } = await supabase
        .from("usuarios")
        .select("id, nome, email")
        .in("id", ids)

      if (error) throw error

      const userMap = new Map(
        (usersData || []).map((user: any) => [String(user.id), user])
      )

      const options = uniqueCandidates.map((item) => {
        const user = userMap.get(item.id)
        const name = String(user?.nome || "").trim()
        const email = String(user?.email || "").trim()
        const mainLabel = name || `Usuario ${item.id.slice(0, 8)}`
        const detail = email ? ` (${email})` : ""
        return {
          id: item.id,
          label: `${item.roleLabel}: ${mainLabel}${detail}`,
        }
      })

      setAdminRecipients(options)
      setAdminTargetUserId((prev) => {
        if (options.some((item) => item.id === prev)) return prev
        return options[0]?.id || ""
      })
    } catch (error) {
      console.error("Erro ao carregar destinatarios do admin:", error)
      const fallback = uniqueCandidates.map((item) => ({
        id: item.id,
        label: `${item.roleLabel}: ${item.id.slice(0, 8)}`,
      }))
      setAdminRecipients(fallback)
      setAdminTargetUserId((prev) => {
        if (fallback.some((item) => item.id === prev)) return prev
        return fallback[0]?.id || ""
      })
    }
  }, [
    isAdmin,
    precatorio,
    precatorio?.dono_usuario_id,
    precatorio?.responsavel,
    precatorio?.responsavel_calculo_id,
    precatorio?.responsavel_certidoes_id,
    precatorio?.responsavel_escrituras_id,
    precatorio?.responsavel_juridico_id,
    precatorio?.responsavel_oficio_id,
  ])

  useEffect(() => {
    void loadAdminRecipients()
  }, [loadAdminRecipients])

  const sendAdminDirectNotification = useCallback(
    async (params: {
      title: string
      body: string
      kind: "critical" | "warn" | "info"
      eventType: string
    }) => {
      if (!id) throw new Error("ID do precatorio nao encontrado.")
      if (!adminTargetUserId) throw new Error("Selecione um destinatario.")
      await sendAdminNotification({
        userId: adminTargetUserId,
        title: params.title,
        body: params.body,
        kind: params.kind,
        eventType: params.eventType,
        entityType: "precatorio",
        entityId: id,
        linkUrl: `/precatorios/detalhes?id=${id}&tab=detalhes`,
        payload: {
          source: "precatorio_detalhes_admin_alert",
          actor_user_id: profile?.id || null,
        },
      })
    },
    [adminTargetUserId, id, profile?.id]
  )

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
    const resultadoFinalTriagem =
      triagemDestinoReprovacao === "credito_vendido"
        ? "nao_elegivel"
        : triagemDestinoReprovacao
    const observacaoCreditoVendido = "Credor informou que vendeu o credito para outra pessoa ou empresa."

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
        updatePayload.juridico_resultado_final = resultadoFinalTriagem
        if (triagemDestinoReprovacao === "credito_vendido") {
          const observacaoAtual = String(precatorio?.interesse_observacao || "").trim()
          updatePayload.interesse_observacao = observacaoAtual
            ? `${observacaoAtual}\n${observacaoCreditoVendido}`
            : observacaoCreditoVendido
        }
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

  async function handleSignalAdminInterest() {
    if (!isAdmin) return

    setAdminInterestSending(true)
    try {
      const message = adminInterestMessage.trim()
      const body = message
        ? `${message}\n\nCredito relacionado: ${precatorioAdminLabel}`
        : `O administrador sinalizou interesse neste credito e solicitou prioridade no andamento.\n\nCredito relacionado: ${precatorioAdminLabel}`

      await sendAdminDirectNotification({
        title: `Interesse do admin no credito - ${precatorioAdminLabel}`,
        body,
        kind: "critical",
        eventType: "interesse_calculo_admin",
      })

      toast({
        title: "Interesse enviado",
        description: "O operador selecionado recebeu o alerta de interesse no credito.",
      })
      setAdminInterestMessage("")
      setAdminInterestModalOpen(false)
    } catch (error: any) {
      toast({
        title: "Erro ao enviar interesse",
        description: error?.message || "Nao foi possivel enviar o interesse ao operador.",
        variant: "destructive",
      })
    } finally {
      setAdminInterestSending(false)
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
      const normalizeYearToDate = (value: any) => {
        const raw = String(value ?? "").trim()
        if (!raw) return null
        if (!/^\d{4}$/.test(raw)) return null
        const year = Number(raw)
        if (!Number.isInteger(year) || year < 1900 || year > 2999) return null
        return `${year}-01-01`
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
        loa: editData.loa || null,
        ano_orcamentario: toNumberOrNull(editData.ano_orcamentario),
        previsao_pagamento: normalizeYearToDate(editData.previsao_pagamento),
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
        contatos: formatStructuredText(editData.contatos) || null,
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

      if (canEditValorPrincipal) {
        updateData.valor_principal = toNumberOrNull(editData.valor_principal)
      }
      if (canEditValorAtualizado) {
        updateData.valor_atualizado = toNumberOrNull(editData.valor_atualizado)
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
  const currentStatusKanban = String(statusAtual || "")
  const juridicoFoiAcionado = Boolean(
    String(precatorio?.juridico_motivo || "").trim() ||
    String(precatorio?.juridico_descricao_bloqueio || "").trim() ||
    String(precatorio?.juridico_parecer_status || "").trim() ||
    String(precatorio?.juridico_parecer_texto || "").trim() ||
    currentStatusKanban === "juridico"
  )

  const currentColumnIndex = KANBAN_COLUMNS.findIndex(
    (col) => col.id === currentStatusKanban || col.statusIds?.includes(currentStatusKanban)
  )

  const currentColumn = currentColumnIndex >= 0 ? KANBAN_COLUMNS[currentColumnIndex] : null
  const currentColumnId = currentColumnIndex >= 0 ? KANBAN_COLUMNS[currentColumnIndex]?.id || null : null
  const nextColumn =
    currentColumnId === "analise_processual_inicial" && !juridicoFoiAcionado
      ? (KANBAN_COLUMNS.find((col) => col.id === "pronto_calculo") ?? null)
      : currentColumnIndex >= 0 && currentColumnIndex < KANBAN_COLUMNS.length - 1
        ? KANBAN_COLUMNS[currentColumnIndex + 1]
        : null
  const nextColumnIndex = nextColumn ? KANBAN_COLUMNS.findIndex((col) => col.id === nextColumn.id) : -1
  const shouldSkipOptionalJuridico = !juridicoFoiAcionado && currentColumnId !== "juridico"

  const canAdvanceToNextColumn =
    canEdit &&
    !isEditing &&
    Boolean(nextColumn) &&
    currentColumnId !== "juridico" &&
    currentColumnId !== "proposta_aceita" &&
    nextColumn?.id !== "reprovado"

  const getKanbanGlowClass = (column: (typeof KANBAN_COLUMNS)[number] | null | undefined) => {
    switch (column?.id) {
      case "entrada":
        return "shadow-[0_10px_24px_rgba(29,78,216,0.35)] dark:shadow-[0_10px_24px_rgba(96,165,250,0.35)]"
      case "triagem_interesse":
        return "shadow-[0_10px_24px_rgba(67,56,202,0.35)] dark:shadow-[0_10px_24px_rgba(129,140,248,0.35)]"
      case "docs_credor":
        return "shadow-[0_10px_24px_rgba(3,105,161,0.35)] dark:shadow-[0_10px_24px_rgba(56,189,248,0.35)]"
      case "analise_processual_inicial":
        return "shadow-[0_10px_24px_rgba(14,116,144,0.35)] dark:shadow-[0_10px_24px_rgba(34,211,238,0.35)]"
      case "juridico":
        return "shadow-[0_10px_24px_rgba(190,24,93,0.35)] dark:shadow-[0_10px_24px_rgba(251,113,133,0.35)]"
      case "pronto_calculo":
        return "shadow-[0_10px_24px_rgba(194,65,12,0.35)] dark:shadow-[0_10px_24px_rgba(251,146,60,0.35)]"
      case "calculo_andamento":
        return "shadow-[0_10px_24px_rgba(180,83,9,0.35)] dark:shadow-[0_10px_24px_rgba(251,191,36,0.35)]"
      case "calculo_concluido":
        return "shadow-[0_10px_24px_rgba(21,128,61,0.35)] dark:shadow-[0_10px_24px_rgba(74,222,128,0.35)]"
      case "proposta_negociacao":
        return "shadow-[0_10px_24px_rgba(161,98,7,0.35)] dark:shadow-[0_10px_24px_rgba(250,204,21,0.35)]"
      case "proposta_aceita":
        return "shadow-[0_10px_24px_rgba(4,120,87,0.35)] dark:shadow-[0_10px_24px_rgba(52,211,153,0.35)]"
      case "certidoes":
        return "shadow-[0_10px_24px_rgba(109,40,217,0.35)] dark:shadow-[0_10px_24px_rgba(167,139,250,0.35)]"
      case "escrituras":
        return "shadow-[0_10px_24px_rgba(162,28,175,0.35)] dark:shadow-[0_10px_24px_rgba(232,121,249,0.35)]"
      default:
        return "shadow-[0_10px_24px_rgba(15,23,42,0.25)]"
    }
  }

  const getKanbanFillClass = (column: (typeof KANBAN_COLUMNS)[number] | null | undefined) => {
    switch (column?.id) {
      case "entrada":
        return "bg-blue-600 dark:bg-blue-500 text-white"
      case "triagem_interesse":
        return "bg-indigo-600 dark:bg-indigo-500 text-white"
      case "docs_credor":
        return "bg-sky-600 dark:bg-sky-500 text-white"
      case "analise_processual_inicial":
        return "bg-cyan-600 dark:bg-cyan-500 text-white"
      case "juridico":
        return "bg-rose-600 dark:bg-rose-500 text-white"
      case "pronto_calculo":
        return "bg-orange-600 dark:bg-orange-500 text-white"
      case "calculo_andamento":
        return "bg-amber-500 dark:bg-amber-400 text-zinc-900"
      case "calculo_concluido":
        return "bg-green-600 dark:bg-green-500 text-white"
      case "proposta_negociacao":
        return "bg-yellow-500 dark:bg-yellow-400 text-zinc-900"
      case "proposta_aceita":
        return "bg-emerald-600 dark:bg-emerald-500 text-white"
      case "certidoes":
        return "bg-purple-600 dark:bg-purple-500 text-white"
      case "escrituras":
        return "bg-fuchsia-600 dark:bg-fuchsia-500 text-white"
      case "fechado":
      case "reprovado":
        return "bg-zinc-700 dark:bg-zinc-600 text-white"
      case "encerrados":
        return "bg-slate-700 dark:bg-slate-600 text-white"
      default:
        return "bg-primary text-primary-foreground"
    }
  }

  const getKanbanToneChipClass = (
    column: (typeof KANBAN_COLUMNS)[number] | null | undefined,
    options?: { emphasized?: boolean; glow?: boolean }
  ) => {
    if (!column) return ""
    if (options?.emphasized) {
      return `${getKanbanFillClass(column)} ring-1 ${column.color.ring} ${options?.glow ? getKanbanGlowClass(column) : "shadow-sm"}`
    }
    return `${column.color.bg} ${column.color.text} ring-1 ${column.color.ring}`
  }

  const getKanbanToneButtonClass = (column: (typeof KANBAN_COLUMNS)[number] | null | undefined) => {
    if (!column) {
      return "bg-gradient-to-r from-primary to-orange-500 text-white shadow-[0_10px_24px_rgba(251,146,60,0.35)] hover:from-primary/90 hover:to-orange-500/90"
    }
    return `${getKanbanFillClass(column)} ring-1 ${column.color.ring} shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:opacity-90`
  }

  async function handleAdvanceToNextStage() {
    if (!id || !nextColumn || !canEdit) return
    if (currentColumnId === "juridico" || currentColumnId === "proposta_aceita") {
      toast({
        title: "Etapa bloqueada",
        description: "Finalize o parecer jurídico antes de avançar para a próxima fase.",
        variant: "destructive",
      })
      return
    }
    if (nextColumn.id === "reprovado") {
      toast({
        title: "Fluxo inválido",
        description: "Use a ação de reprovação para enviar o crédito para não elegível.",
        variant: "destructive",
      })
      return
    }

    setAdvancingStage(true)
    try {
      const supabase = requireSupabase()
      const nextColumnId = nextColumn.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: any = {
        status_kanban: nextColumnId,
        localizacao_kanban: nextColumnId,
        updated_at: new Date().toISOString(),
      }

      if (nextColumnId === "certidoes" && !precatorio?.status_certidoes) {
        updatePayload.status_certidoes = "nao_iniciado"
      }
      if (nextColumnId === "escrituras" && !precatorio?.status_escrituras) {
        updatePayload.status_escrituras = "nao_iniciado"
      }

      const { error } = await supabase
        .from("precatorios")
        .update(updatePayload)
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Etapa atualizada",
        description: `Crédito enviado para ${nextColumn.titulo}.`,
      })
      await loadPrecatorio()
    } catch (err: any) {
      toast({
        title: "Erro ao avançar etapa",
        description: err?.message || "Não foi possível enviar para a próxima fase.",
        variant: "destructive",
      })
    } finally {
      setAdvancingStage(false)
    }
  }

  // Prevent auto-advancing to "Reprovado" or "Encerrados" unless explicit? 
  // User said "sempre que a etapa for concluida". 
  // Let's assume linear flow is safe, but maybe skip 'reprovado' if it's next in array (it's last, so it might be safe if the flow leads there, but typically one doesn't "advance" to rejected without a decision).
  // Checking array: ... 'fechado' -> 'encerrados' -> 'reprovado'.
  // Moving to 'encerrados' might be okay. Moving to 'reprovado' is usually a decision.

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

  const maskCurrency = (value: number | null | undefined) => {
    if (!hasValue(value)) return ""
    return value!.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const parseCurrencyParams = (value: string) => {
    const numericClean = value.replace(/[^\d]/g, "")
    if (!numericClean) return 0
    return parseFloat(numericClean) / 100
  }

  const renderAnaliseNumberField = (label: string, field: string, value: number | null | undefined) => {
    const isCurrency = label.toLowerCase().includes("valor")
    const displayValue = isCurrency
      ? maskCurrency(value)
      : (value != null && !isNaN(value) ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "")

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let numericVal = parseCurrencyParams(e.target.value)

      if (!isCurrency && numericVal > 100) {
        numericVal = 100
      }

      setEditData((prev: any) => ({ ...prev, [field]: numericVal }))
    }

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Input
          value={displayValue}
          onChange={handleChange}
          placeholder={isCurrency ? "R$ 0,00" : "0,00"}
          className="h-10 px-3 w-full bg-transparent text-left font-mono"
        />
      </div>
    )
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (!hasValue(value)) return "R$ 0,00"
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value!)
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "-"
    const [y, m, d] = String(date).split("-")
    if (!y || !m || !d) return "-"
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
        return <Clock className="h-3.5 w-3.5 shrink-0" />
      case "em_andamento":
        return <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      case "concluido":
        return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      case "cancelado":
        return <XCircle className="h-3.5 w-3.5 shrink-0" />
      default:
        return <Clock className="h-3.5 w-3.5 shrink-0" />
    }
  }

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "novo":
        return "border border-primary/40 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary"
      case "em_andamento":
        return "border border-primary/40 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary"
      case "concluido":
        return "border border-primary/40 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary"
      case "cancelado":
        return "border border-destructive/40 bg-destructive/15 text-destructive dark:border-destructive/40 dark:bg-destructive/15 dark:text-destructive"
      default:
        return "border border-border bg-muted text-muted-foreground dark:border-border dark:bg-muted dark:text-muted-foreground"
    }
  }

  const getPrioridadeColor = (prioridade: string | undefined) => {
    switch (prioridade) {
      case "urgente":
        return "border border-destructive/40 bg-destructive/15 text-destructive dark:border-destructive/40 dark:bg-destructive/15 dark:text-destructive"
      case "alta":
        return "border border-primary/40 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary"
      case "media":
        return "border border-primary/40 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary"
      case "baixa":
        return "border border-primary/40 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary"
      default:
        return "border border-border bg-muted text-muted-foreground dark:border-border dark:bg-muted dark:text-muted-foreground"
    }
  }

  const handleDeleteHerdeiro = async (herdeiroId: string, herdeiroNome?: string | null) => {
    const nomeLabel = (herdeiroNome || "este herdeiro").trim()
    const confirmed = window.confirm(`Tem certeza que deseja excluir ${nomeLabel}? Esta ação não pode ser desfeita.`)
    if (!confirmed) return

    setHerdeiroSaving(true)
    try {
      const supabase = requireSupabase()
      const { error } = await supabase
        .from("precatorio_herdeiros")
        .delete()
        .eq("id", herdeiroId)

      if (error) throw error

      setHerdeiros((prev) => prev.filter((h) => h.id !== herdeiroId))
      setSelectedHerdeiro((prev) => (prev?.id === herdeiroId ? null : prev))
      setHerdeiroEdit((prev) => (prev?.id === herdeiroId ? null : prev))
      setHerdeiroEditMode(false)
      setHerdeiroModalOpen(false)

      toast({
        title: "Herdeiro excluído",
        description: "O herdeiro foi removido com sucesso.",
      })
    } catch (err: any) {
      toast({
        title: "Erro ao excluir herdeiro",
        description: err?.message || "Não foi possível excluir o herdeiro.",
        variant: "destructive",
      })
    } finally {
      setHerdeiroSaving(false)
    }
  }

  const dashboardCardClass =
    "group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white/85 via-white/70 to-zinc-50/60 backdrop-blur-xl shadow-[0_8px_26px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_14px_40px_rgba(15,23,42,0.16)] dark:border-border dark:bg-gradient-to-br dark:from-zinc-950/75 dark:via-zinc-950/55 dark:to-zinc-900/45 dark:hover:border-primary/45 dark:hover:shadow-[0_18px_44px_rgba(0,0,0,0.38)]"
  const dashboardTabsListClass =
    "h-auto w-full justify-start gap-1.5 rounded-2xl border border-border bg-gradient-to-r from-white/85 via-zinc-50/80 to-white/85 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl flex-nowrap overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-border dark:bg-gradient-to-r dark:from-zinc-950/75 dark:via-zinc-900/65 dark:to-zinc-950/75 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
  const dashboardTabsTriggerClass =
    "shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-muted hover:text-muted-foreground data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/25 data-[state=active]:to-amber-300/20 data-[state=active]:text-muted-foreground data-[state=active]:shadow-sm dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white dark:data-[state=active]:from-primary/35 dark:data-[state=active]:to-amber-400/15 dark:data-[state=active]:text-white dark:data-[state=active]:shadow-[0_8px_20px_rgba(0,0,0,0.3)]"

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
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-zinc-50 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black" />
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/20 via-sky-200/10 to-emerald-200/10 blur-3xl dark:from-primary/20 dark:via-orange-400/10 dark:to-sky-400/10" />
      <div className="pointer-events-none absolute top-28 right-[-9rem] -z-10 h-72 w-72 rounded-full bg-gradient-to-br from-amber-300/15 via-orange-300/10 to-cyan-300/10 blur-3xl dark:from-amber-500/18 dark:via-primary/14 dark:to-cyan-500/12" />
      <div className="pointer-events-none absolute bottom-10 left-[-8rem] -z-10 h-64 w-64 rounded-full bg-gradient-to-br from-primary/10 via-rose-200/10 to-amber-200/10 blur-3xl dark:from-primary/12 dark:via-rose-400/8 dark:to-amber-400/10" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Header */}
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: MOTION.dur.ui, ease: MOTION.ease }}
          className="relative z-20 overflow-hidden rounded-3xl border border-border bg-white/90 px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:sticky lg:top-4 dark:border-border dark:bg-zinc-950/80 dark:shadow-[0_16px_42px_rgba(0,0,0,0.42)]"
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-primary/15 blur-2xl dark:bg-primary/20" />
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="mt-1 -ml-2 rounded-xl border border-border bg-background/75 hover:bg-background dark:border-border dark:bg-muted dark:hover:bg-muted"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="no-route-shiny text-[2.25rem] font-semibold leading-[1.08] tracking-tight text-foreground md:text-[3rem]">
                    {precatorio.titulo}
                  </h1>
                  <span
                    className={`${getPrioridadeColor(precatorio.prioridade)} inline-flex h-[2.1rem] items-center justify-center whitespace-nowrap rounded-full px-3 py-0 text-[13px] font-semibold leading-none shadow-sm`}
                  >
                    {precatorio.prioridade?.toUpperCase() || "M?DIA"}
                  </span>
                  <span
                    className={`${getStatusColor(precatorio.status)} inline-flex h-[2.1rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-0 text-[13px] font-semibold leading-none shadow-sm`}
                  >
                    <span className="inline-flex items-center justify-center">
                      {getStatusIcon(precatorio.status)}
                    </span>
                    <span className="inline-flex items-center font-semibold leading-none">
                      {precatorio.status?.replace("_", " ").toUpperCase() || "NOVO"}
                    </span>
                  </span>
                </div>
                <p className="mt-1.5 text-[1.05rem] text-muted-foreground">Dados essenciais do precatório com visão completa do fluxo.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && !isEditing && (
                <Button
                  onClick={() => setAdminInterestModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl border-border bg-background/80 px-4 shadow-sm hover:bg-background dark:border-border dark:bg-muted dark:hover:bg-muted"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Sinalizar interesse
                </Button>
              )}
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl border-border bg-background/85 px-4 shadow-sm hover:bg-background dark:border-border dark:bg-muted dark:hover:bg-muted"
                  onClick={() => {
                    setActiveTab("timeline")
                    syncTabToUrl("timeline")
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Timeline
                </Button>
              )}
              {canEdit && !isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl border-border bg-background/85 px-4 shadow-sm hover:bg-background dark:border-border dark:bg-muted dark:hover:bg-muted"
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
                    className="h-10 rounded-xl bg-gradient-to-r from-primary to-orange-500 px-4 text-white shadow-[0_10px_24px_rgba(251,146,60,0.35)] hover:from-primary/90 hover:to-orange-500/90"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {isAdmin && (
          <Dialog open={adminInterestModalOpen} onOpenChange={setAdminInterestModalOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  Interesse do Admin no Crédito
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Operador destinatário</Label>
                    <Select
                      value={adminTargetUserId || "__none__"}
                      onValueChange={(value) =>
                        setAdminTargetUserId(value === "__none__" ? "" : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o operador" />
                      </SelectTrigger>
                      <SelectContent>
                        {adminRecipients.length === 0 ? (
                          <SelectItem value="__none__">Nenhum operador vinculado</SelectItem>
                        ) : (
                          adminRecipients.map((recipient) => (
                            <SelectItem key={recipient.id} value={recipient.id}>
                              {recipient.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Alertas individuais devem ser enviados na aba Comunicados, usando o escopo Individual.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Crédito em foco</Label>
                    <div className="rounded-xl border border-border bg-background/70 px-3 py-2 text-sm backdrop-blur-xl dark:border-border dark:bg-muted">
                      {precatorioAdminLabel}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-interest-message">Mensagem de interesse (opcional)</Label>
                  <Textarea
                    id="admin-interest-message"
                    rows={4}
                    value={adminInterestMessage}
                    onChange={(e) => setAdminInterestMessage(e.target.value)}
                    placeholder="Ex.: Preciso priorizar este crédito nesta semana."
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setAdminInterestModalOpen(false)}
                    disabled={adminInterestSending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSignalAdminInterest}
                    disabled={adminInterestSending || !adminTargetUserId}
                  >
                    {adminInterestSending ? "Enviando interesse..." : "Sinalizar interesse no crédito"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Tabs Layout Consolidado */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-6 rounded-2xl border border-border bg-background/45 p-1.5 backdrop-blur-xl dark:border-border dark:bg-muted">
            <div className="relative">
              <TabsList className={dashboardTabsListClass}>
                <TabsTrigger
                  value="detalhes"
                  className={dashboardTabsTriggerClass}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Geral
                </TabsTrigger>
                <TabsTrigger
                  value="documentos"
                  className={dashboardTabsTriggerClass}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Documentos
                </TabsTrigger>
                <TabsTrigger
                  value="oficio"
                  className={dashboardTabsTriggerClass}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ofício
                  {(precatorio?.file_url || precatorio?.pdf_url) && <span className="ml-1.5 w-2 h-2 rounded-full bg-primary/15" />}
                </TabsTrigger>
                <TabsTrigger
                  value="certidoes"
                  className={dashboardTabsTriggerClass}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Certidões
                </TabsTrigger>
                <TabsTrigger
                  value="escrituras"
                  className={dashboardTabsTriggerClass}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Escrituras
                </TabsTrigger>
                <TabsTrigger
                  value="juridico"
                  className={dashboardTabsTriggerClass}
                >
                  <Scale className="h-4 w-4 mr-2" />
                  Parecer Jurídico
                </TabsTrigger>
                {(userRole?.includes('admin') || userRole?.includes('financeiro') || userRole?.includes('juridico')) && (
                  <TabsTrigger
                    value="fechamento"
                    className={dashboardTabsTriggerClass}
                  >
                    <Gavel className="h-4 w-4 mr-2" />
                    Fechamento
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="calculo"
                  className={dashboardTabsTriggerClass}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Cálculo
                </TabsTrigger>
                <TabsTrigger
                  value="comparativo"
                  className={dashboardTabsTriggerClass}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {"Proje\u00e7\u00e3o & Comparativo"}
                </TabsTrigger>
                <TabsTrigger
                  value="propostas"
                  className={dashboardTabsTriggerClass}
                >
                  <Percent className="h-4 w-4 mr-2" />
                  Propostas
                </TabsTrigger>
                <button
                  type="button"
                  className={`${dashboardTabsTriggerClass} inline-flex items-center whitespace-nowrap`}
                  onClick={openAgendaForPrecatorio}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Agenda
                </button>
              </TabsList>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              transition={{ duration: MOTION.dur.ui, ease: MOTION.ease }}
            >
              {/* Tab: Detalhes */}
              <TabsContent value="detalhes" className="space-y-6">

                {/* Barra de Status */}
                <DetailSection className="relative overflow-hidden border-border bg-gradient-to-br from-white/85 via-white/72 to-zinc-50/60 p-5 md:p-6 shadow-[0_8px_24px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-border dark:bg-gradient-to-br dark:from-zinc-950/75 dark:via-zinc-950/58 dark:to-zinc-900/45 dark:shadow-[0_14px_32px_rgba(0,0,0,0.4)]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_50%)]" />
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-muted-foreground">
                        Status do crédito
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2.5">
                        <Chip
                          size="md"
                          variant="flat"
                          radius="full"
                          className={`font-semibold ${getKanbanToneChipClass(currentColumn, { emphasized: true, glow: true })}`}
                        >
                          Atual: {statusAtualLabel}
                        </Chip>
                        {nextColumn ? (
                          <Chip
                            size="md"
                            variant="flat"
                            radius="full"
                            className={`font-semibold ${getKanbanToneChipClass(nextColumn)}`}
                          >
                            Próxima: {nextColumn.titulo}
                          </Chip>
                        ) : (
                          <Chip size="md" variant="flat" radius="full">
                            Fluxo finalizado
                          </Chip>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canAdvanceToNextColumn ? (
                        <Button
                          size="sm"
                          className={`h-10 rounded-xl px-4 ${getKanbanToneButtonClass(nextColumn)}`}
                          onClick={handleAdvanceToNextStage}
                          disabled={advancingStage}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          {advancingStage ? "Enviando..." : "Enviar para próxima fase"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border bg-gradient-to-r from-zinc-50/85 via-white/70 to-zinc-100/70 p-3 shadow-inner dark:border-border dark:bg-gradient-to-r dark:from-zinc-900/65 dark:via-zinc-900/50 dark:to-zinc-800/55">
                    <ScrollShadow orientation="horizontal" hideScrollBar className="w-full py-1">
                      <div className="flex min-w-max items-center gap-2.5 pr-2">
                        {KANBAN_COLUMNS.map((col, index) => {
                          const hasCurrent = currentColumnIndex >= 0
                          const isCurrent = hasCurrent && index === currentColumnIndex
                          const isDoneBase = hasCurrent && index < currentColumnIndex
                          const isSkippedJuridico =
                            shouldSkipOptionalJuridico &&
                            col.id === "juridico" &&
                            currentColumnIndex > index
                          const isDone = isDoneBase && !isSkippedJuridico
                          const isNext = hasCurrent && nextColumnIndex >= 0 && index === nextColumnIndex

                          let chipStartContent: ReactNode = null
                          let toneClass = getKanbanToneChipClass(col)

                          if (isCurrent) {
                            toneClass = getKanbanToneChipClass(col, { emphasized: true, glow: true })
                            chipStartContent = <span className="h-2 w-2 rounded-full bg-white/85 dark:bg-white/75" />
                          } else if (isDone) {
                            toneClass = getKanbanToneChipClass(col)
                            chipStartContent = <CheckCircle2 className="h-3.5 w-3.5" />
                          } else if (isNext) {
                            toneClass = getKanbanToneChipClass(col)
                            chipStartContent = <ArrowRight className="h-3.5 w-3.5" />
                          }

                          return (
                            <Chip
                              key={col.id}
                              size="lg"
                              radius="full"
                              variant="flat"
                              startContent={chipStartContent}
                              className={`whitespace-nowrap min-h-10 border-transparent ${toneClass} ${isCurrent ? "font-semibold" : "font-medium"}`}
                            >
                              {col.titulo}
                            </Chip>
                          )
                        })}
                      </div>
                    </ScrollShadow>

                    <p className="px-1 pt-2 text-xs text-muted-foreground">
                      Dica: role lateralmente para ver todas as etapas.
                    </p>
                  </div>
                </DetailSection>

                <ModalSemInteresse
                  open={semInteresseModalOpen}
                  onOpenChange={setSemInteresseModalOpen}
                  precatorioId={id}
                  onConfirm={handleConfirmSemInteresse}
                  initialMotivo={precatorio?.motivo_sem_interesse || ""}
                  initialDataRecontato={
                    precatorio?.data_recontato ? new Date(precatorio.data_recontato) : null
                  }
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">

                  {/* COLUNA 1: Dados Principais */}
                  <div className="flex flex-col gap-6">
                    {/* Identificação */}
                    <Card className={`${dashboardCardClass} order-1`}>
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
                                <p className="text-base">{precatorio.status?.replace(/_/g, " ") || "-"}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <InfoRow
                              label="Número do Precatório"
                              value={precatorio.numero_precatorio ? maskProcesso(precatorio.numero_precatorio) : "-"}
                              valueClassName="text-base font-semibold"
                            />
                            <InfoRow
                              label="Número do Processo"
                              value={precatorio.numero_processo ? maskProcesso(precatorio.numero_processo) : "-"}
                            />
                            <InfoRow
                              label="Número do Ofício"
                              value={precatorio.numero_oficio || "-"}
                            />
                            <InfoRow
                              label="Status"
                              value={precatorio.status?.replace(/_/g, " ") || "-"}
                            />
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Responsável</label>
                              <div className="flex items-center gap-2 mt-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-base font-semibold">{precatorio.responsavel_dados?.nome || "-"}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className={`${dashboardCardClass} order-3`}>
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
                                  {renderAnaliseNumberField("Penhora valor (R$)", "analise_penhora_valor", editData.analise_penhora_valor)}
                                  {renderAnaliseNumberField("Penhora percentual (%)", "analise_penhora_percentual", editData.analise_penhora_percentual)}
                                </>
                              )}
                              {editData.analise_cessao === true && (
                                <>
                                  {renderAnaliseNumberField("Cessão valor (R$)", "analise_cessao_valor", editData.analise_cessao_valor)}
                                  {renderAnaliseNumberField("Cessão percentual (%)", "analise_cessao_percentual", editData.analise_cessao_percentual)}
                                </>
                              )}
                              {editData.analise_itcmd === true && (
                                <>
                                  {renderAnaliseNumberField("ITCMD valor (R$)", "analise_itcmd_valor", editData.analise_itcmd_valor)}
                                  {renderAnaliseNumberField("ITCMD percentual (%)", "analise_itcmd_percentual", editData.analise_itcmd_percentual)}
                                </>
                              )}
                              {renderAnaliseNumberField("Adiantamento recebido valor (R$)", "analise_adiantamento_valor", editData.analise_adiantamento_valor)}
                              {renderAnaliseNumberField("Adiantamento recebido percentual (%)", "analise_adiantamento_percentual", editData.analise_adiantamento_percentual)}
                              {renderAnaliseNumberField("Honorários contratuais valor (R$)", "analise_honorarios_valor", editData.analise_honorarios_valor)}
                              {renderAnaliseNumberField("Honorários contratuais percentual (%)", "analise_honorarios_percentual", editData.analise_honorarios_percentual)}
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
                                  className={`text-sm font-semibold ${precatorio.analise_viavel === true
                                    ? "text-primary"
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
                                        : "-"}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Penhora percentual (%)</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {formatPercent(precatorio.analise_penhora_percentual) || "-"}
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
                                        : "-"}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Cessão percentual (%)</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {formatPercent(precatorio.analise_cessao_percentual) || "-"}
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
                                        : "-"}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">ITCMD percentual (%)</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {formatPercent(precatorio.analise_itcmd_percentual) || "-"}
                                    </p>
                                  </div>
                                </>
                              )}
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Adiantamento recebido valor (R$)</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {hasValue(precatorio.analise_adiantamento_valor)
                                    ? formatCurrency(precatorio.analise_adiantamento_valor)
                                    : "-"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Adiantamento recebido percentual (%)</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {formatPercent(precatorio.analise_adiantamento_percentual) || "-"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Honorários contratuais valor (R$)</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {hasValue(precatorio.analise_honorarios_valor)
                                    ? formatCurrency(precatorio.analise_honorarios_valor)
                                    : "-"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Honorários contratuais percentual (%)</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {formatPercent(precatorio.analise_honorarios_percentual) || "-"}
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
                    <Card className={`${dashboardCardClass} order-4`}>
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
                              value={precatorio.tribunal || "-"}
                              valueClassName="text-base font-semibold"
                            />
                            <InfoRow label="Devedor" value={precatorio.devedor || "-"} />
                            <InfoRow label="Esfera do Devedor" value={getEsferaDevedorLabel(precatorio.esfera_devedor)} />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* COLUNA 2: Financeiro e Datas */}
                    {/* Valores */}
                    <Card className={`${dashboardCardClass} order-2`}>
                      <CardHeader className="pb-3">
                        <CardTitle>
                          <SectionTitle icon={DollarSign} title="Valores" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {isEditing && (canEditValorPrincipal || canEditValorAtualizado) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="space-y-2">
                              <Label>Valor Principal (R$)</Label>
                              <CurrencyInput
                                value={
                                  hasValue(editData.valor_principal) && editData.valor_principal !== ""
                                    ? Number(editData.valor_principal)
                                    : undefined
                                }
                                onValueChange={(value) => setEditData({ ...editData, valor_principal: value })}
                                disabled={!canEditValorPrincipal}
                                placeholder="R$ 0,00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Valor Atualizado (R$)</Label>
                              {canEditValorAtualizado ? (
                                <CurrencyInput
                                  value={
                                    hasValue(editData.valor_atualizado) && editData.valor_atualizado !== ""
                                      ? Number(editData.valor_atualizado)
                                      : undefined
                                  }
                                  onValueChange={(value) => setEditData({ ...editData, valor_atualizado: value })}
                                  placeholder="R$ 0,00"
                                />
                              ) : (
                                <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                  {hasValue(precatorio.valor_atualizado) ? formatCurrency(Number(precatorio.valor_atualizado)) : "-"}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Valor Principal</label>
                            <p className="text-lg font-semibold text-foreground">
                              {(() => {
                                const valorPrincipal = isEditing ? editData.valor_principal : precatorio.valor_principal
                                return hasValue(valorPrincipal) && valorPrincipal !== ""
                                  ? formatCurrency(Number(valorPrincipal))
                                  : "-"
                              })()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Valor Atualizado</label>
                            <p className="text-2xl font-bold text-foreground">
                              {(() => {
                                const valorAtualizado = isEditing ? editData.valor_atualizado : precatorio.valor_atualizado
                                return hasValue(valorAtualizado) && valorAtualizado !== ""
                                  ? formatCurrency(Number(valorAtualizado))
                                  : "-"
                              })()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Saldo Líquido</label>
                            <p className="text-xl font-bold text-foreground">
                              {hasValue(precatorio.saldo_liquido) ? formatCurrency(precatorio.saldo_liquido) : "-"}
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
                                : "-"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">IRPF</label>
                            <p className="text-base text-foreground">
                              {hasValue(precatorio.irpf_valor)
                                ? formatCurrency(precatorio.irpf_valor)
                                : precatorio.irpf_isento
                                  ? "Isento"
                                  : "-"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Honorários</label>
                            <p className="text-base text-foreground">
                              {hasValue(precatorio.honorarios_valor)
                                ? formatCurrency(precatorio.honorarios_valor)
                                : "-"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Proposta Maior</label>
                            <p className="text-xl font-bold text-destructive dark:text-destructive">
                              {hasValue(precatorio.proposta_maior_valor) ? formatCurrency(precatorio.proposta_maior_valor) : "-"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Proposta Menor</label>
                            <p className="text-xl font-bold text-primary dark:text-primary">
                              {hasValue(precatorio.proposta_menor_valor) ? formatCurrency(precatorio.proposta_menor_valor) : "-"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Datas */}
                    <Card className={`${dashboardCardClass} order-5`}>
                      <CardHeader className="pb-3">
                        <CardTitle>
                          <SectionTitle icon={Calendar} title="Datas Importantes" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <Label>Data Base</Label>
                              <Input type="date" value={editData.data_base || ""} onChange={(e) => setEditData({ ...editData, data_base: e.target.value })} />
                            </div>
                            <div>
                              <Label>Data de Expedição</Label>
                              <Input type="date" value={editData.data_expedicao || ""} onChange={(e) => setEditData({ ...editData, data_expedicao: e.target.value })} />
                            </div>
                            <div>
                              <Label>LOA (Lei Orcamentaria Anual)</Label>
                              <Input
                                value={editData.loa || ""}
                                onChange={(e) => setEditData({ ...editData, loa: e.target.value })}
                                placeholder="Ex: LOA 2026"
                              />
                            </div>
                            <div>
                              <Label>Ano Orcamentario</Label>
                              <Input
                                type="number"
                                min={1900}
                                max={2999}
                                value={
                                  hasValue(editData.ano_orcamentario) && editData.ano_orcamentario !== ""
                                    ? String(editData.ano_orcamentario)
                                    : ""
                                }
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    ano_orcamentario: e.target.value === "" ? "" : Number(e.target.value),
                                  })
                                }
                                placeholder="Ex: 2026"
                              />
                            </div>
                            <div>
                              <Label>Previsao de Pagamento (Ano)</Label>
                              <Input
                                type="number"
                                min={1900}
                                max={2999}
                                step={1}
                                inputMode="numeric"
                                value={editData.previsao_pagamento || ""}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    previsao_pagamento: e.target.value.replace(/[^\d]/g, "").slice(0, 4),
                                  })
                                }
                                placeholder="Ex: 2027"
                              />
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
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">LOA (Lei Orcamentaria Anual)</label>
                              <p className="text-base">{precatorio.loa || "Nao informada"}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Ano Orcamentario</label>
                              <p className="text-base">
                                {hasValue(precatorio.ano_orcamentario) ? String(precatorio.ano_orcamentario) : "Nao informado"}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Previsao de Pagamento (Ano)</label>
                              <p className="text-base">
                                {(() => {
                                  const year = precatorio.previsao_pagamento
                                    ? String(precatorio.previsao_pagamento).slice(0, 4)
                                    : ""
                                  return /^\d{4}$/.test(year) ? year : "Nao informada"
                                })()}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* COLUNA 3: Partes e Observações */}
                  <div className="flex flex-col gap-6">
                    {/* Triagem de Interesse */}
                    <Card className={`${dashboardCardClass} order-1`}>
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

                    {/* Dados Bancários */}
                    <Card className={`${dashboardCardClass} order-4`}>
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
                                <p className="text-base">{precatorio.banco || "-"}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                                <p className="text-base capitalize">{precatorio.tipo_conta || "-"}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Agência</label>
                                <p className="text-base">{precatorio.agencia || "-"}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Conta</label>
                                <p className="text-base">{precatorio.conta || "-"}</p>
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
                    <Card className={`${dashboardCardClass} order-2`}>
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
                              <p className="font-medium text-base">{precatorio.credor_nome || "-"}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <p className="text-sm text-muted-foreground">{precatorio.credor_cpf_cnpj || "-"}</p>
                                <p className="text-sm text-muted-foreground">{precatorio.credor_telefone || "-"}</p>
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
                              <p className="font-medium text-base">{precatorio.advogado_nome || "-"}</p>
                              <p className="text-sm text-muted-foreground">{precatorio.advogado_oab || "-"}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>


                    <Card className={`${dashboardCardClass} order-3`}>
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
                                  <p className="text-base">{selectedHerdeiro.nome_completo || "-"}</p>
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
                                  <p className="text-base">{selectedHerdeiro.cpf || "-"}</p>
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
                                  <p className="text-base">{selectedHerdeiro.telefone || "-"}</p>
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
                                  <p className="text-base">{selectedHerdeiro.email || "-"}</p>
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
                                  <p className="text-base">{formatPercent(selectedHerdeiro.percentual_participacao) || "-"}</p>
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
                                  <p className="text-base">{selectedHerdeiro.endereco || "-"}</p>
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
                                    <p className="text-base">{selectedHerdeiro.banco || "-"}</p>
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
                                    <p className="text-base capitalize">{selectedHerdeiro.tipo_conta || "-"}</p>
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
                                    <p className="text-base">{selectedHerdeiro.agencia || "-"}</p>
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
                                    <p className="text-base">{selectedHerdeiro.conta || "-"}</p>
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
                                    <p className="text-base">{selectedHerdeiro.chave_pix || "-"}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  void handleDeleteHerdeiro(
                                    selectedHerdeiro.id,
                                    selectedHerdeiro.nome_completo
                                  )
                                }
                                disabled={herdeiroSaving}
                              >
                                {herdeiroSaving ? "Excluindo..." : "Excluir herdeiro"}
                              </Button>
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
                    <Card className={`${dashboardCardClass} order-5`}>
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
                  pdfUrl={precatorio?.file_url || precatorio?.pdf_url} // Passando URL do Ofício para permitir visualização
                />
              </TabsContent>

              {/* Tab: Ofício */}
              <TabsContent value="oficio" className="space-y-6">
                <OficioViewer
                  precatorioId={precatorio.id}
                  fileUrl={precatorio.file_url || precatorio.pdf_url}
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

              {/* Tab: Escrituras */}
              <TabsContent value="escrituras" className="mt-0">
                <AbaEscrituras
                  precatorioId={id}
                  canEdit={
                    userRole?.includes("admin") ||
                    userRole?.includes("gestor") ||
                    userRole?.includes("gestor_escrituras") ||
                    false
                  }
                  onUpdate={loadPrecatorio}
                  initialStatus={precatorio?.status_escrituras}
                  initialObservacoes={precatorio?.observacoes_escrituras}
                />
              </TabsContent>

              {/* Tab: Jurídico */}
              <TabsContent value="juridico" className="mt-0 space-y-6">
                <LegalOpinionPanel
                  precatorioId={id}
                  title="Parecer Juridico"
                  subtitle="Modulo estruturado com status, checklist, anexos, comentarios e historico."
                  canCreate={roles.some((role) =>
                    ["admin", "juridico", "gestor", "operador_comercial", "operador_calculo"].includes(role)
                  )}
                  canEdit={roles.some((role) => ["admin", "juridico", "gestor"].includes(role))}
                  showOpenModuleButton={false}
                />
                <div className="w-full">
                  {precatorio.status_kanban === "proposta_aceita" && (
                    <Card className={`${dashboardCardClass} mb-4 border-primary/40 bg-primary/15 dark:border-primary/40 dark:bg-primary/15`}>
                      <CardContent className="py-4 flex items-start gap-3 text-primary">
                        <CheckCircle2 className="h-5 w-5 mt-0.5" />
                        <div>
                          <p className="font-semibold">Aceite confirmado</p>
                          <p className="text-sm text-primary">
                            Este precatório entrou em jurídico de fechamento e aguarda parecer do jurídico.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {precatorio.status_kanban === "proposta_aceita" ? (
                    <Card className={`${dashboardCardClass} order-5`}>
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
                      <Card className={dashboardCardClass}>
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
                        <Card className={dashboardCardClass}>
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
                                ? ` -€¢ ${precatorio.juridico_resultado_final === "nao_elegivel" ? "Não elegível" : "Reprovado"}`
                                : ""}
                            </p>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                              {precatorio.pendencias_fechamento || "Sem observações registradas."}
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {precatorio.juridico_parecer_status && (
                        <Card className={dashboardCardClass}>
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
                          <Card className={dashboardCardClass}>
                            <CardContent className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                              <CheckSquare className="h-12 w-12 mb-4 opacity-50" />
                              <p className="font-medium">Sem pendências jurídicas</p>
                              <p className="text-sm mt-1">Nenhuma solicitação de análise em aberto para este precatório.</p>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className={dashboardCardClass}>
                            <CardContent className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                              <CheckSquare className="h-12 w-12 mb-4 opacity-50" />
                              <p className="font-medium">Solicitacao juridica centralizada</p>
                              <p className="text-sm mt-1">
                                Use o modulo "Parecer Juridico" acima para abrir uma nova solicitacao.
                              </p>
                            </CardContent>
                          </Card>
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

              {/* Tab: Projecao & Comparativo */}
              <TabsContent value="comparativo" className="mt-0">
                <ProjecaoComparativoPanel
                  precatorioId={id}
                  defaultPrevisaoPagamento={precatorio?.previsao_pagamento || null}
                  defaultPrecoCompra={defaultComparativoPrecoCompra}
                />
              </TabsContent>

              {/* Tab: Propostas */}
              <TabsContent value="propostas" className="mt-0">
                <AbaProposta
                  precatorioId={id}
                  precatorio={precatorio}
                  onUpdate={loadPrecatorio}
                  userRole={userRole}
                  currentUserId={profile?.id || null}
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
                <Card className={dashboardCardClass}>
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
            </motion.div>
          </AnimatePresence>
        </Tabs>

        {/* Modal de PDF */}
        <PdfViewerModal
          open={showPdfModal}
          onOpenChange={setShowPdfModal}
          pdfUrl={precatorio?.pdf_url}
          titulo={precatorio?.titulo}
          precatorioId={id}
          canCalculate={userRole ? !userRole.includes("operador_comercial") : false}
        />
      </div>
    </div>
  )
}

