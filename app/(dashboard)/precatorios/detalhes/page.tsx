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
  FileSearch,
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
import { AbaContratos } from "@/components/kanban/aba-contratos"
import { AbaProcuracao } from "@/components/kanban/aba-procuracao"
import { TimelineViewer } from "@/components/precatorios/timeline-viewer"
import { FormParecerJuridico } from "@/components/kanban/form-parecer-juridico"
import { FormExportarCalculo } from "@/components/kanban/form-exportar-calculo"
import { HistoricoCalculos } from "@/components/kanban/historico-calculos"
import { ModalSemInteresse } from "@/components/kanban/modal-sem-interesse"
import CalculadoraPrecatorios from "@/components/calculador-precatorios"
import { ResumoCalculoDetalhado } from "@/components/precatorios/resumo-calculo-detalhado"
import { ProjecaoComparativoPanel } from "@/components/precatorios/comparativo/projecao-comparativo-panel"
import { DataJudConsultaPanel } from "@/components/precatorios/datajud-panel"

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

// ─── Clay design tokens (local — does not touch globals.css) ───────────────
const sh = {
  card: "16px 16px 36px rgba(0,0,0,.08), -8px -8px 20px rgba(255,255,255,.94), inset 1px 1px 4px rgba(255,255,255,.9), inset -1px -1px 2px rgba(0,0,0,.04)",
  inset: "inset 5px 5px 12px rgba(0,0,0,.07), inset -4px -4px 10px rgba(255,255,255,.87)",
  btnAc: "8px 8px 20px rgba(14,77,106,.42), -3px -3px 8px rgba(255,255,255,.3), inset 1px 1px 3px rgba(255,255,255,.14), inset -1px -1px 2px rgba(8,40,60,.3)",
  btnGhost: "5px 5px 12px rgba(0,0,0,.07), -3px -3px 8px rgba(255,255,255,.92), inset 1px 1px 2px rgba(255,255,255,.87), inset -1px -1px 2px rgba(0,0,0,.04)",
  sm: "7px 7px 16px rgba(0,0,0,.07), -4px -4px 10px rgba(255,255,255,.92), inset 1px 1px 2px rgba(255,255,255,.88), inset -1px -1px 2px rgba(0,0,0,.03)",
  navAc: "6px 6px 14px rgba(14,77,106,.36), -2px -2px 6px rgba(255,255,255,.28), inset 1px 1px 3px rgba(255,255,255,.14), inset -1px -1px 2px rgba(8,40,60,.22)",
  heroBlobAc: "12px 12px 28px rgba(14,77,106,.36), -5px -5px 14px rgba(255,255,255,.5), inset 1px 1px 4px rgba(255,255,255,.12), inset -1px -1px 2px rgba(8,40,60,.25)",
} as const

function ClayBtnAc({ children, onClick, disabled, className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-[7px] rounded-[13px] bg-[#0e4d6a] px-4 text-[12.5px] font-bold text-white transition hover:-translate-y-[2px] active:scale-[0.96] active:translate-y-[2px] disabled:pointer-events-none disabled:opacity-50 h-[38px] ${className ?? ""}`}
      style={{ boxShadow: sh.btnAc }}
    >
      {children}
    </button>
  )
}

function ClayBtnGhost({ children, onClick, disabled, className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-[7px] rounded-[13px] border border-black/[0.08] bg-gradient-to-br from-white to-[#f4f5f8] px-4 text-[12.5px] font-bold text-[#374151] transition hover:-translate-y-[2px] hover:text-[#0b0c10] active:scale-[0.96] active:translate-y-[2px] disabled:pointer-events-none disabled:opacity-50 h-[38px] ${className ?? ""}`}
      style={{ boxShadow: sh.btnGhost }}
    >
      {children}
    </button>
  )
}

function ClayCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-black/[0.07] bg-white transition-transform duration-200 hover:-translate-y-[2px] ${className ?? ""}`}
      style={{ boxShadow: sh.card }}
    >
      {children}
    </div>
  )
}

function ClayCardHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-[13px] border-b border-[#e8eaef] px-[22px] py-[18px] pb-[14px]">
      <div
        className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[13px] border border-black/[0.07] bg-[#f2f3f7]"
        style={{ boxShadow: sh.sm }}
      >
        <Icon className="h-[18px] w-[18px] stroke-[1.75] text-[#374151]" />
      </div>
      <span className="text-[15px] font-extrabold tracking-[-0.2px] text-[#0b0c10]">{title}</span>
    </div>
  )
}

function Field({ label, value, empty, className }: { label: string; value: ReactNode; empty?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">{label}</span>
      <span className={`text-[13.5px] font-semibold leading-snug ${empty ? "italic text-[#9ca3af] font-normal" : "text-[#0b0c10]"}`}>
        {value || (empty ? "Não informado" : value)}
      </span>
    </div>
  )
}

function ValueBlob({ label, value, variant = "default" }: { label: string; value: string; variant?: "default" | "hero" | "positive" }) {
  const blobStyle = variant === "hero"
    ? { background: "#0e4d6a", boxShadow: sh.heroBlobAc }
    : variant === "positive"
    ? { background: "#f0fdf4", border: "1.5px solid #bbf7d0" }
    : { boxShadow: sh.sm }
  const labelCls = variant === "hero" ? "text-white/55" : variant === "positive" ? "text-[#166534]/70" : "text-[#6b7280]"
  const valueCls = variant === "hero" ? "text-white" : variant === "positive" ? "text-[#15803d]" : "text-[#0b0c10]"
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-black/[0.07] p-[18px] transition hover:-translate-y-[3px]" style={blobStyle}>
      <span className={`mb-2 block text-[9.5px] font-bold uppercase tracking-[1.4px] ${labelCls}`}>{label}</span>
      <span className={`block text-[22px] font-black leading-[1.15] tracking-[-0.8px] ${valueCls}`}>{value}</span>
    </div>
  )
}

const SectionTitle = ({ icon: Icon, title }: { icon?: LucideIcon; title: string }) => (
  <div className="flex items-center gap-2.5">
    {Icon ? (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.07] bg-[#f2f3f7] text-[#0e4d6a]" style={{ boxShadow: "inset 3px 3px 7px rgba(0,0,0,.06), inset -2px -2px 5px rgba(255,255,255,.85)" }}>
        <Icon className="h-4 w-4" />
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
  <div className="min-w-0 space-y-1">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`break-all ${valueClassName}`}>{value}</p>
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

type TriagemFluxoOption = "normal" | "pausado" | "encerrado" | "nao_elegivel" | "credito_vendido"

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
  const [triagemFluxoSelection, setTriagemFluxoSelection] = useState<TriagemFluxoOption>("normal")
  const [triagemSaving, setTriagemSaving] = useState(false)
  const [semInteresseModalOpen, setSemInteresseModalOpen] = useState(false)
  const [semInteresseModalMode, setSemInteresseModalMode] = useState<"sem_interesse" | "pausa">("sem_interesse")
  const [semInteresseDestinoStatus, setSemInteresseDestinoStatus] = useState("sem_interesse")
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
  const isJuridicoOrAdmin = roles.some((role) => ["admin", "juridico"].includes(role))
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
        "border-border bg-muted text-muted-foreground",
      dotClass: "bg-muted",
    },
    CONTATO_EM_ANDAMENTO: {
      label: "Contato em andamento",
      badgeClass:
        "border-primary/40 bg-primary/15 text-primary",
      dotClass: "bg-primary/15",
    },
    PEDIR_RETORNO: {
      label: "Pedir retorno",
      badgeClass:
        "border-primary/40 bg-primary/15 text-primary",
      dotClass: "bg-primary/15",
    },
    SEM_INTERESSE: {
      label: "Sem interesse",
      badgeClass:
        "border-destructive/40 bg-destructive/15 text-destructive",
      dotClass: "bg-destructive/15",
    },
    TEM_INTERESSE: {
      label: "Tem interesse",
      badgeClass:
        "border-primary/40 bg-primary/15 text-primary",
      dotClass: "bg-primary/15",
    },
  }
  const getTriagemStatusMeta = (status?: string | null) => {
    const normalized = status?.toUpperCase()
    if (!normalized) {
      return {
        label: "Não informado",
        badgeClass:
          "border-border bg-muted text-muted-foreground",
        dotClass: "bg-muted",
      }
    }
    return (
      TRIAGEM_STATUS_META[normalized] || {
        label: normalized.replace(/_/g, " ").toLowerCase(),
        badgeClass:
          "border-border bg-muted text-muted-foreground",
        dotClass: "bg-muted",
      }
    )
  }
  const TRIAGEM_FLUXO_OPTIONS: Array<{ value: TriagemFluxoOption; label: string }> = [
    { value: "normal", label: "Fluxo normal" },
    { value: "pausado", label: "Pausado" },
    { value: "encerrado", label: "Encerrado" },
    { value: "nao_elegivel", label: "Não elegível" },
    { value: "credito_vendido", label: "Credor vendeu para outro" },
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
      "datajud",
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
    const statusResolvido = resolveStatusColumnId(precatorio?.status_kanban || precatorio?.localizacao_kanban)
    const observacaoAtual = String(precatorio?.interesse_observacao || "").toLowerCase()

    if (statusResolvido === "reprovado") {
      const isCreditoVendido = observacaoAtual.includes("vendeu o credito")
      setTriagemFluxoSelection(isCreditoVendido ? "credito_vendido" : "nao_elegivel")
      return
    }

    if (["pausado_credor", "pausado_documentos"].includes(String(statusResolvido))) {
      setTriagemFluxoSelection("pausado")
      return
    }

    if (["sem_interesse", "encerrados", "pos_fechamento"].includes(String(statusResolvido))) {
      setTriagemFluxoSelection("encerrado")
      return
    }

    setTriagemFluxoSelection("normal")
  }, [
    precatorio?.status_kanban,
    precatorio?.localizacao_kanban,
    precatorio?.interesse_observacao,
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

    const isPausa = semInteresseModalMode === "pausa"
    const destinoStatus = semInteresseDestinoStatus || (isPausa ? "pausado_credor" : "sem_interesse")

    if (isPausa && !dataRecontato) {
      throw new Error("A data de retorno é obrigatória para status pausado.")
    }

    setTriagemSaving(true)
    try {
      const supabase = requireSupabase()
      const dataRecontatoIso = dataRecontato ? dataRecontato.toISOString() : null
      const { error } = await supabase
        .from("precatorios")
        .update({
          interesse_status: isPausa ? "PEDIR_RETORNO" : "SEM_INTERESSE",
          status_kanban: destinoStatus,
          localizacao_kanban: destinoStatus,
          motivo_sem_interesse: isPausa ? precatorio?.motivo_sem_interesse || null : motivo,
          interesse_observacao: isPausa ? motivo : precatorio?.interesse_observacao || null,
          data_recontato: dataRecontatoIso,
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
            title: isPausa ? `Retorno de pausa - ${precatorioLabel}` : `Recontato agendado - ${precatorioLabel}`,
            body: isPausa ? `Retomar contato com o credor em ${dateLabel}.` : `Recontato marcado para ${dateLabel}.`,
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
        title: isPausa ? "Pausa registrada" : "Sem interesse registrado",
        description: dataRecontato
          ? "Data de retorno agendada com sucesso."
          : "Registro atualizado.",
      })

      setTriagemFluxoSelection(isPausa ? "pausado" : "encerrado")
      setSemInteresseModalMode("sem_interesse")
      setSemInteresseDestinoStatus("sem_interesse")
      await loadPrecatorio()
    } finally {
      setTriagemSaving(false)
    }
  }

  async function handleSaveTriagemStatus() {
    if (!id) return
    const fluxoSelecionado = triagemFluxoSelection
    const observacaoCreditoVendido = "Credor informou que vendeu o credito para outra pessoa ou empresa."

    if (fluxoSelecionado === "pausado") {
      setSemInteresseModalMode("pausa")
      setSemInteresseDestinoStatus("pausado_credor")
      setSemInteresseModalOpen(true)
      return
    }

    if (fluxoSelecionado === "encerrado") {
      setSemInteresseModalMode("sem_interesse")
      setSemInteresseDestinoStatus("sem_interesse")
      setSemInteresseModalOpen(true)
      return
    }

    setTriagemSaving(true)
    try {
      const supabase = requireSupabase()
      const destinoReprovacaoSelecionado = ["nao_elegivel", "credito_vendido"].includes(fluxoSelecionado)
      const nextStatusKanban = fluxoSelecionado === "normal" ? "analise_processual_inicial" : "reprovado"

      if (precatorio?.origem === "atendimento" && fluxoSelecionado === "normal") {
        if (precatorio?.status_atendimento !== "interessado") {
          throw new Error("O fluxo normal só pode ser liberado após triagem de interesse no Setor de Atendimento.")
        }

        const { data: tentativaInteressada, error: tentativaError } = await supabase
          .from("atendimento_tentativas")
          .select("id, contato_nome, contato_telefone, interesse_receber_proposta")
          .eq("precatorio_id", id)
          .eq("resultado", "interessado")
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (tentativaError) throw tentativaError
        if (!tentativaInteressada) {
          throw new Error("Registre o contato de interesse no Atendimento antes de enviar para o fluxo normal.")
        }
        if (!tentativaInteressada.contato_nome || !tentativaInteressada.contato_telefone || tentativaInteressada.interesse_receber_proposta === null) {
          throw new Error("A triagem do Atendimento está incompleta. Informe nome, telefone e interesse em proposta.")
        }
        if (tentativaInteressada.interesse_receber_proposta !== true) {
          throw new Error("No Atendimento, o credor não confirmou interesse em receber proposta. Ajuste a triagem antes de avançar.")
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: any = {
        interesse_status: fluxoSelecionado === "normal" ? "TEM_INTERESSE" : "SEM_INTERESSE",
        status_kanban: nextStatusKanban,
        localizacao_kanban: nextStatusKanban,
        updated_at: new Date().toISOString(),
      }

      if (destinoReprovacaoSelecionado) {
        updatePayload.juridico_resultado_final = "nao_elegivel"
        if (fluxoSelecionado === "credito_vendido") {
          const observacaoAtual = String(precatorio?.interesse_observacao || "").trim()
          updatePayload.interesse_observacao = observacaoAtual
            ? `${observacaoAtual}\n${observacaoCreditoVendido}`
            : observacaoCreditoVendido
        }
        updatePayload.motivo_sem_interesse = null
      } else {
        const statusResolvido = resolveStatusColumnId(precatorio?.status_kanban || precatorio?.localizacao_kanban)
        if (statusResolvido === "reprovado") {
          updatePayload.juridico_resultado_final = null
        }
        updatePayload.interesse_observacao = null
        updatePayload.motivo_sem_interesse = null
      }

      const { error } = await supabase
        .from("precatorios")
        .update(updatePayload)
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Triagem atualizada",
        description:
          fluxoSelecionado === "normal"
            ? "Crédito enviado para o fluxo normal."
            : "Registro salvo e crédito enviado para não elegível.",
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
        origem_lead: editData.origem_lead || null,
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

  const STAGES_BLOQUEADOS_OPERADOR = new Set([
    "analise_processual_inicial",
    "aguardando_oficio",
    "pronto_calculo",
    "calculo_andamento",
    "calculo_concluido",
    "juridico",
    "recalculo_pos_juridico",
    "proposta_negociacao",
    "proposta_aceita",
    "certidoes",
    "escrituras",
    "fechado",
    "pos_fechamento",
    "pausado_credor",
    "pausado_documentos",
    "sem_interesse",
    "reprovado",
    "nao_elegivel",
    "encerrados",
  ])

  const creditoBloqueadoParaOperador =
    !isJuridicoOrAdmin && STAGES_BLOQUEADOS_OPERADOR.has(currentColumnId || "")

  const canEditGestaoAnalise = isJuridicoOrAdmin

  const canAdvanceToNextColumn =
    canEdit &&
    !creditoBloqueadoParaOperador &&
    !isEditing &&
    Boolean(nextColumn) &&
    currentColumnId !== "juridico" &&
    currentColumnId !== "proposta_aceita" &&
    nextColumn?.id !== "reprovado"

  const getKanbanGlowClass = (column: (typeof KANBAN_COLUMNS)[number] | null | undefined) => {
    switch (column?.id) {
      case "entrada":
        return "shadow-[0_10px_24px_rgba(29,78,216,0.35)]"
      case "triagem_interesse":
        return "shadow-[0_10px_24px_rgba(67,56,202,0.35)]"
      case "analise_processual_inicial":
        return "shadow-[0_10px_24px_rgba(14,116,144,0.35)]"
      case "juridico":
        return "shadow-[0_10px_24px_rgba(190,24,93,0.35)]"
      case "pronto_calculo":
        return "shadow-[0_10px_24px_rgba(180,83,9,0.35)]"
      case "calculo_andamento":
        return "shadow-[0_10px_24px_rgba(180,83,9,0.35)]"
      case "calculo_concluido":
        return "shadow-[0_10px_24px_rgba(21,128,61,0.35)]"
      case "proposta_negociacao":
        return "shadow-[0_10px_24px_rgba(161,98,7,0.35)]"
      case "proposta_aceita":
        return "shadow-[0_10px_24px_rgba(4,120,87,0.35)]"
      case "certidoes":
        return "shadow-[0_10px_24px_rgba(109,40,217,0.35)]"
      case "escrituras":
        return "shadow-[0_10px_24px_rgba(162,28,175,0.35)]"
      default:
        return "shadow-[0_10px_24px_rgba(15,23,42,0.25)]"
    }
  }

  const getKanbanFillClass = (column: (typeof KANBAN_COLUMNS)[number] | null | undefined) => {
    switch (column?.id) {
      case "entrada":
        return "bg-blue-600 text-white"
      case "triagem_interesse":
        return "bg-indigo-600 text-white"
      case "analise_processual_inicial":
        return "bg-cyan-600 text-white"
      case "juridico":
        return "bg-rose-600 text-white"
      case "pronto_calculo":
        return "bg-amber-600 text-white"
      case "calculo_andamento":
        return "bg-amber-500 text-white"
      case "calculo_concluido":
        return "bg-green-600 text-white"
      case "proposta_negociacao":
        return "bg-yellow-500 text-white"
      case "proposta_aceita":
        return "bg-emerald-600 text-white"
      case "certidoes":
        return "bg-purple-600 text-white"
      case "escrituras":
        return "bg-fuchsia-600 text-white"
      case "fechado":
      case "reprovado":
        return "bg-zinc-700 text-white"
      case "encerrados":
        return "bg-slate-700 text-white"
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
      return "bg-primary text-white shadow-[8px_8px_20px_rgba(14,77,106,.42),-3px_-3px_8px_rgba(255,255,255,.3),inset_1px_1px_3px_rgba(255,255,255,.14),inset_-1px_-1px_2px_rgba(8,40,60,.3)] hover:bg-primary/90"
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
        return "border border-primary/40 bg-primary/15 text-primary"
      case "em_andamento":
        return "border border-primary/40 bg-primary/15 text-primary"
      case "concluido":
        return "border border-primary/40 bg-primary/15 text-primary"
      case "cancelado":
        return "border border-destructive/40 bg-destructive/15 text-destructive"
      default:
        return "border border-border bg-muted text-muted-foreground"
    }
  }

  const getPrioridadeColor = (prioridade: string | undefined) => {
    switch (prioridade) {
      case "urgente":
        return "border border-destructive/40 bg-destructive/15 text-destructive"
      case "alta":
        return "border border-primary/40 bg-primary/15 text-primary"
      case "media":
        return "border border-primary/40 bg-primary/15 text-primary"
      case "baixa":
        return "border border-primary/40 bg-primary/15 text-primary"
      default:
        return "border border-border bg-muted text-muted-foreground"
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
    "group relative overflow-hidden rounded-[22px] border border-black/[0.07] bg-white transition-all duration-200 hover:-translate-y-[2px] shadow-[16px_16px_36px_rgba(0,0,0,.08),-8px_-8px_20px_rgba(255,255,255,.94),inset_1px_1px_4px_rgba(255,255,255,.9),inset_-1px_-1px_2px_rgba(0,0,0,.04)]"
  const verticalTabClass =
    "relative flex w-full items-center gap-[9px] rounded-[12px] px-3 py-2 text-[12.5px] font-semibold text-[#6b7280] transition-all duration-200 hover:translate-x-[2px] hover:bg-[#f2f3f7] hover:text-[#0b0c10] data-[state=active]:translate-x-[1px] data-[state=active]:bg-[#0e4d6a] data-[state=active]:text-white data-[state=active]:font-bold"
  const navSectionLabel =
    "block select-none px-3 pb-1 pt-[9px] text-[9px] font-bold uppercase tracking-[2px] text-[#9ca3af]"

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
      <div className="relative min-h-[calc(100vh-4rem)]">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
          {/* Header skeleton */}
          <div className="rounded-3xl border border-border bg-background/90 px-5 py-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-80 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
          {/* Layout skeleton */}
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
            {/* Sidebar skeleton */}
            <div className="lg:w-[220px] lg:shrink-0">
              <div className="rounded-2xl border border-border bg-background/60 p-3 space-y-1.5">
                <div className="h-3 w-14 rounded bg-muted/70 animate-pulse mb-3" />
                {[1, 0.9, 1, 0.85, 0.95, 0.8, 1, 0.9].map((w, i) => (
                  <div key={i} className="h-8 rounded-lg bg-muted animate-pulse" style={{ width: `${w * 100}%`, animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
            </div>
            {/* Content skeleton */}
            <div className="flex-1 space-y-4">
              <div className="rounded-2xl border border-border bg-background/60 p-6 space-y-3">
                {[1, 0.75, 1, 0.6, 0.85].map((w, i) => (
                  <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${w * 100}%`, animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-6 space-y-3">
                {[1, 0.8, 0.9, 0.7].map((w, i) => (
                  <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${w * 100}%`, animationDelay: `${i * 80 + 400}ms` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
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
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#f0f1f5]">

      <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-4 sm:px-5 lg:px-6">
        {/* Header Clay */}
        <header
          className="relative z-20 overflow-hidden rounded-[28px] border border-black/[0.07] bg-[rgba(255,255,255,0.93)] px-5 py-5 backdrop-blur-[24px] lg:sticky lg:top-3"
          style={{ boxShadow: sh.card }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              {/* Botão voltar */}
              <button
                type="button"
                onClick={() => router.back()}
                className="mt-[5px] flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[15px] border border-black/[0.07] bg-gradient-to-br from-white to-[#f5f6f9] text-[#6b7280] transition hover:-translate-y-[3px] hover:-translate-x-[1px] hover:text-[#0b0c10] active:scale-[0.94] active:translate-y-[1px]"
                style={{ boxShadow: sh.sm }}
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>

              <div className="min-w-0 flex-1">
                {/* Badge row */}
                <div className="mb-[10px] flex flex-wrap items-center gap-1.5">
                  {precatorio.prioridade && (
                    <span className={`inline-flex h-6 items-center rounded-full border px-[10px] text-[10.5px] font-bold tracking-[0.3px] ${getPrioridadeColor(precatorio.prioridade)}`}>
                      {precatorio.prioridade.toUpperCase()}
                    </span>
                  )}
                  {precatorio.status && (
                    <span className={`inline-flex h-6 items-center rounded-full border px-[10px] text-[10.5px] font-bold tracking-[0.3px] ${getStatusColor(precatorio.status)}`}>
                      {precatorio.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  )}
                  {precatorio.natureza && (
                    <span className="inline-flex h-6 items-center rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-[10px] text-[10.5px] font-bold tracking-[0.3px] text-[#15803d]">
                      {precatorio.natureza}
                    </span>
                  )}
                </div>

                {/* Título dois andares */}
                <h1
                  className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.6px] md:text-[28px]"
                  style={{ color: '#6b7280', WebkitTextFillColor: '#6b7280', backgroundImage: 'none' }}
                >
                  Precatório
                  <strong
                    className="block text-[32px] font-black tracking-[-1px] md:text-[38px]"
                    style={{ color: '#0b0c10', WebkitTextFillColor: '#0b0c10', backgroundImage: 'none' }}
                  >
                    {precatorio.credor_nome || precatorio.titulo || "—"}
                  </strong>
                </h1>
                <p className="mt-[5px] text-[12px] font-medium text-[#9ca3af]">
                  Dados essenciais com visão completa do fluxo de trabalho.
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-2 pt-[6px]">
              {isAdmin && !isEditing && (
                <ClayBtnGhost onClick={() => setAdminInterestModalOpen(true)}>
                  <AlertCircle className="h-[14px] w-[14px]" />
                  Sinalizar interesse
                </ClayBtnGhost>
              )}
              {!isEditing && (
                <ClayBtnGhost onClick={() => { setActiveTab("timeline"); syncTabToUrl("timeline") }}>
                  <Clock className="h-[14px] w-[14px]" />
                  Timeline
                </ClayBtnGhost>
              )}
              {isEditing ? (
                <>
                  <ClayBtnGhost onClick={() => setIsEditing(false)} disabled={saving}>
                    <X className="h-[14px] w-[14px]" />
                    Cancelar
                  </ClayBtnGhost>
                  <ClayBtnAc onClick={handleSaveEdit} disabled={saving}>
                    <Save className="h-[14px] w-[14px]" />
                    {saving ? "Salvando..." : "Salvar"}
                  </ClayBtnAc>
                </>
              ) : (
                canEdit && !creditoBloqueadoParaOperador && (
                  <ClayBtnGhost onClick={() => setIsEditing(true)}>
                    <Edit className="h-[14px] w-[14px]" />
                    Editar
                  </ClayBtnGhost>
                )
              )}
            </div>
          </div>
        </header>

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
                    <div className="rounded-xl border border-border bg-[#f2f3f7] px-3 py-2 text-sm">
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
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-5 lg:items-start">

            {/* ── Navegação mobile: select compacto ── */}
            <div className="lg:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full rounded-[14px] border border-black/[0.08] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#0b0c10] shadow-[6px_6px_14px_rgba(0,0,0,.06),-4px_-4px_10px_rgba(255,255,255,.9)] appearance-none focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/20"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
              >
                <optgroup label="Processo">
                  <option value="detalhes">Geral</option>
                  <option value="datajud">DataJud</option>
                </optgroup>
                <optgroup label="Documentação">
                  <option value="documentos">Documentos</option>
                  <option value="oficio">Ofício</option>
                  <option value="certidoes">Certidões</option>
                  <option value="escrituras">Escrituras</option>
                  <option value="contratos">Contratos</option>
                  <option value="procuracao">Procuração</option>
                </optgroup>
                <optgroup label="Jurídico">
                  <option value="juridico">Parecer Jurídico</option>
                  {(userRole?.includes('admin') || userRole?.includes('financeiro') || userRole?.includes('juridico'))
                    ? <option value="fechamento">Fechamento</option>
                    : null}
                </optgroup>
                <optgroup label="Financeiro">
                  <option value="calculo">Cálculo</option>
                  <option value="comparativo">Projeção &amp; Comparativo</option>
                  <option value="propostas">Propostas</option>
                </optgroup>
                <optgroup label="Gestão">
                  <option value="agenda">Agenda</option>
                </optgroup>
              </select>
            </div>

            {/* ── Sidebar de navegação vertical (desktop) ── */}
            <aside className="hidden lg:block lg:w-[220px] lg:shrink-0">
              <div className="lg:sticky lg:top-20">
                <div className="rounded-[22px] border border-black/[0.07] bg-white py-2" style={{ boxShadow: "inset 5px 5px 12px rgba(0,0,0,.06), inset -4px -4px 10px rgba(255,255,255,.87)" }}>
                  <TabsList className="flex h-auto w-full flex-col items-stretch gap-0 bg-transparent p-0">

                    {/* Processo */}
                    <p className={navSectionLabel}>Processo</p>
                    <TabsTrigger value="detalhes" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <FileText className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Geral
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>
                    <TabsTrigger value="datajud" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <FileSearch className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      DataJud
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>

                    {/* Documentação */}
                    <div className="mx-3 my-2 border-t border-[#e8eaef]" />
                    <p className={navSectionLabel}>Documentação</p>
                    <TabsTrigger value="documentos" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <CheckSquare className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Documentos
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>
                    <TabsTrigger value="oficio" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <FileText className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Ofício
                      {(precatorio?.file_url || precatorio?.pdf_url) ? (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/50 data-[state=active]:bg-white/80" />
                      ) : (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="certidoes" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <CheckSquare className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Certidões
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>
                    <TabsTrigger value="escrituras" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <FileText className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Escrituras
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>
                    <TabsTrigger value="contratos" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <FileText className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Contratos
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>
                    <TabsTrigger value="procuracao" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <FileText className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Procuração
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>

                    {/* Jurídico */}
                    <div className="mx-3 my-2 border-t border-[#e8eaef]" />
                    <p className={navSectionLabel}>Jurídico</p>
                    <TabsTrigger value="juridico" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <Scale className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Parecer Jurídico
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>
                    {(userRole?.includes('admin') || userRole?.includes('financeiro') || userRole?.includes('juridico')) && (
                      <TabsTrigger value="fechamento" className={verticalTabClass}>
                        <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                          <Gavel className="h-[14px] w-[14px] stroke-[1.75]" />
                        </span>
                        Fechamento
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                      </TabsTrigger>
                    )}

                    {/* Financeiro */}
                    <div className="mx-3 my-2 border-t border-[#e8eaef]" />
                    <p className={navSectionLabel}>Financeiro</p>
                    <TabsTrigger value="calculo" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <Calculator className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Cálculo
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>
                    <TabsTrigger value="comparativo" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <DollarSign className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Projeção & Comparativo
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>
                    <TabsTrigger value="propostas" className={verticalTabClass}>
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef] transition-colors data-[state=active]:bg-white/20">
                        <Percent className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Propostas
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20 data-[state=active]:bg-white/55" />
                    </TabsTrigger>

                    {/* Gestão */}
                    <div className="mx-3 my-2 border-t border-[#e8eaef]" />
                    <p className={navSectionLabel}>Gestão</p>
                    <button
                      type="button"
                      className={verticalTabClass}
                      onClick={openAgendaForPrecatorio}
                    >
                      <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[9px] bg-[#e8eaef]">
                        <Calendar className="h-[14px] w-[14px] stroke-[1.75]" />
                      </span>
                      Agenda
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#0e4d6a]/20" />
                    </button>

                  </TabsList>
                </div>
              </div>
            </aside>

            {/* ── Área de conteúdo ── */}
            <div className="min-w-0 flex-1">
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

                {/* Barra de Status Clay */}
                <ClayCard>
                  <div className="p-5 md:p-6 space-y-5">
                    {/* Progress bar */}
                    <div>
                      <div className="mb-[7px] flex justify-between text-[10px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">
                        <span>Progresso do fluxo</span>
                        <span>Etapa {currentColumnIndex + 1} de {KANBAN_COLUMNS.length}</span>
                      </div>
                      <div className="h-[5px] overflow-hidden rounded-[10px] bg-[#e8eaef]" style={{ boxShadow: "inset 2px 2px 4px rgba(0,0,0,.06), inset -1px -1px 3px rgba(255,255,255,.8)" }}>
                        <div
                          className="h-full rounded-[10px] bg-gradient-to-r from-[#22c55e] via-[#6366f1] to-[#0e4d6a] transition-all duration-700"
                          style={{ width: `${Math.round(((currentColumnIndex + 1) / KANBAN_COLUMNS.length) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="mb-[10px] text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">
                          Status do crédito
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* chip-current */}
                          <div className="inline-flex h-[38px] items-center gap-2 rounded-[22px] bg-[#0e4d6a] px-4 text-[13px] font-extrabold text-white" style={{ boxShadow: sh.btnAc }}>
                            <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
                            {statusAtualLabel}
                          </div>
                          {/* chip-next */}
                          {nextColumn ? (
                            <div className="inline-flex h-[38px] items-center gap-[7px] rounded-[22px] border border-[#e8eaef] bg-white px-4 text-[13px] font-bold text-[#374151]" style={{ boxShadow: sh.sm }}>
                              <ArrowRight className="h-[13px] w-[13px]" />
                              {nextColumn.titulo}
                            </div>
                          ) : (
                            <div className="inline-flex h-[38px] items-center gap-[7px] rounded-[22px] border border-[#e8eaef] bg-white px-4 text-[13px] font-bold text-[#9ca3af]" style={{ boxShadow: sh.sm }}>
                              Fluxo finalizado
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {canAdvanceToNextColumn ? (
                          <ClayBtnAc onClick={handleAdvanceToNextStage} disabled={advancingStage}>
                            <ArrowRight className="h-[14px] w-[14px]" />
                            {advancingStage ? "Enviando..." : "Enviar para próxima fase"}
                          </ClayBtnAc>
                        ) : creditoBloqueadoParaOperador && nextColumn ? (
                          <div className="inline-flex items-center gap-2 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] font-semibold text-amber-700">
                            <svg className="h-[14px] w-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Apenas Admin ou Jurídico pode avançar daqui
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Pipeline scroll */}
                    <div className="rounded-2xl border border-black/[0.07] bg-[#f2f3f7] p-3" style={{ boxShadow: sh.inset }}>
                      <ScrollShadow orientation="horizontal" hideScrollBar className="w-full py-1">
                        <div className="flex min-w-max items-center gap-2 pr-2">
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

                            let pipeClass: string
                            let pipeContent: ReactNode = null

                            if (isCurrent) {
                              pipeClass = "inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[11.5px] font-extrabold text-white bg-[#0e4d6a] shadow-[5px_5px_12px_rgba(14,77,106,.34),-2px_-2px_6px_rgba(255,255,255,.5)]"
                              pipeContent = <span className="h-2 w-2 rounded-full bg-white/80 animate-pulse" />
                            } else if (isDone) {
                              pipeClass = "inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[#bbf7d0] px-3 text-[11.5px] font-semibold bg-[#f0fdf4] text-[#15803d]"
                              pipeContent = <CheckCircle2 className="h-3 w-3" />
                            } else if (isNext) {
                              pipeClass = "inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[#bfdbfe] px-3 text-[11.5px] font-semibold bg-[#eff6ff] text-[#1d4ed8]"
                              pipeContent = <ArrowRight className="h-3 w-3" />
                            } else {
                              pipeClass = "inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full border border-black/[0.06] px-3 text-[11.5px] font-medium bg-black/[0.04] text-[#9ca3af]"
                            }

                            return (
                              <div key={col.id} className={pipeClass}>
                                {pipeContent}
                                {col.titulo}
                              </div>
                            )
                          })}
                        </div>
                      </ScrollShadow>
                      <p className="px-1 pt-2 text-[10px] text-[#9ca3af]">
                        Dica: role lateralmente para ver todas as etapas.
                      </p>
                    </div>
                  </div>
                </ClayCard>

                <ModalSemInteresse
                  open={semInteresseModalOpen}
                  onOpenChange={(open) => {
                    setSemInteresseModalOpen(open)
                    if (!open) {
                      setSemInteresseModalMode("sem_interesse")
                      setSemInteresseDestinoStatus("sem_interesse")
                    }
                  }}
                  precatorioId={id}
                  mode={semInteresseModalMode}
                  onConfirm={handleConfirmSemInteresse}
                  initialMotivo={
                    semInteresseModalMode === "pausa"
                      ? precatorio?.interesse_observacao || precatorio?.motivo_sem_interesse || ""
                      : precatorio?.motivo_sem_interesse || ""
                  }
                  initialDataRecontato={
                    precatorio?.data_recontato ? new Date(precatorio.data_recontato) : null
                  }
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">

                  {/* COLUNA 1: Dados Principais */}
                  <div className="flex flex-col gap-6">
                    {/* Identificação */}
                    <ClayCard className="order-1">
                      <ClayCardHeader icon={FileText} title="Identificação" />
                      <div className="p-5 lg:px-[22px] lg:py-5">
                        {isEditing ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Título</label>
                                <input value={editData.titulo || ""} onChange={(e) => setEditData({ ...editData, titulo: e.target.value })} className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                              </div>
                              <div>
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Número do Precatório</label>
                                <input
                                  value={editData.numero_precatorio || ""}
                                  onChange={(e) => setEditData({ ...editData, numero_precatorio: maskProcesso(e.target.value) })}
                                  className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                                />
                              </div>
                              <div>
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Número do Processo</label>
                                <input value={editData.numero_processo || ""} onChange={(e) => setEditData({ ...editData, numero_processo: maskProcesso(e.target.value) })} className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                              </div>
                              <div>
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Número do Ofício</label>
                                <input value={editData.numero_oficio || ""} onChange={(e) => setEditData({ ...editData, numero_oficio: e.target.value })} className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                              </div>
                              <div>
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Origem do Lead</label>
                                <select
                                  value={editData.origem_lead || ""}
                                  onChange={(e) => setEditData({ ...editData, origem_lead: e.target.value })}
                                  className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                                >
                                  <option value="">Não informada</option>
                                  <option value="Indicação">Indicação</option>
                                  <option value="Google">Google</option>
                                  <option value="Instagram">Instagram</option>
                                  <option value="Facebook">Facebook</option>
                                  <option value="WhatsApp">WhatsApp</option>
                                  <option value="Site/Landing page">Site/Landing page</option>
                                  <option value="LinkedIn">LinkedIn</option>
                                  <option value="Evento">Evento</option>
                                  <option value="Parceiro comercial">Parceiro comercial</option>
                                  <option value="Outro">Outro</option>
                                </select>
                              </div>
                            </div>
                            <div className="my-4 h-px bg-[#e8eaef]" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Field label="Status" value={precatorio.status?.replace(/_/g, " ") || "-"} />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-2 gap-[18px] xl:grid-cols-4">
                            <Field label="Nº do Precatório" value={precatorio.numero_precatorio ? maskProcesso(precatorio.numero_precatorio) : "-"} className="col-span-2 xl:col-span-1" empty={!precatorio.numero_precatorio} />
                            <Field label="Nº do Processo" value={precatorio.numero_processo ? maskProcesso(precatorio.numero_processo) : "-"} empty={!precatorio.numero_processo} />
                            <Field label="Nº do Ofício" value={precatorio.numero_oficio || "-"} empty={!precatorio.numero_oficio} />
                            <Field label="Status" value={precatorio.status?.replace(/_/g, " ") || "-"} empty={!precatorio.status} />
                            <div className="flex flex-col gap-1">
                              <span className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Responsável</span>
                              <div className="flex items-center gap-2">
                                <User className="h-[13px] w-[13px] text-[#6b7280]" />
                                <span className="text-[13.5px] font-semibold text-[#0b0c10]">{precatorio.responsavel_dados?.nome || "-"}</span>
                              </div>
                            </div>
                            <Field label="Origem do Lead" value={precatorio.origem_lead || "-"} empty={!precatorio.origem_lead} />
                          </div>
                        )}
                      </div>
                    </ClayCard>

                    <ClayCard className="order-3">
                      <ClayCardHeader icon={FileText} title="Gestão de Análise" />
                      <div className="p-5 lg:px-[22px] lg:py-5 space-y-4">
                        {!canEditGestaoAnalise && (
                          <div className="mb-2 flex items-center gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-700">
                            <svg className="h-[13px] w-[13px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Somente Admin ou Jurídico pode editar esta seção.
                          </div>
                        )}
                        {isEditing && canEditGestaoAnalise ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Penhora</label>
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
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Cessão</label>
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
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Herdeiros habilitados</label>
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
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Viabilidade do crédito</label>
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
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">ITCMD</label>
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
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Observações da análise</label>
                              <textarea
                                value={editData.analise_observacoes || ""}
                                onChange={(e) =>
                                  setEditData({ ...editData, analise_observacoes: e.target.value })
                                }
                                rows={4}
                                className="w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 py-3 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
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
                      </div>
                    </ClayCard>

                    {/* Vara de Origem e Devedor */}
                    <ClayCard className="order-4">
                      <ClayCardHeader icon={Gavel} title="Vara de Origem e Devedor" />
                      <div className="p-5 lg:px-[22px] lg:py-5">
                        {isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {userRole?.includes("admin") && (
                              <div className="md:col-span-2">
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Vara de Origem</label>
                                <input
                                  placeholder="Ex: 2ª Vara Cível, Vara do Trabalho, etc"
                                  value={editData.tribunal || ""}
                                  onChange={(e) => setEditData({ ...editData, tribunal: e.target.value })}
                                  className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                                />
                              </div>
                            )}
                            <div>
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Devedor</label>
                              <input value={editData.devedor || ""} onChange={(e) => setEditData({ ...editData, devedor: e.target.value })} className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                            </div>
                            <div>
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Esfera do Devedor</label>
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
                            <Field label="Vara de Origem" value={precatorio.tribunal || "-"} empty={!precatorio.tribunal} />
                            <Field label="Devedor" value={precatorio.devedor || "-"} empty={!precatorio.devedor} />
                            <Field label="Esfera do Devedor" value={getEsferaDevedorLabel(precatorio.esfera_devedor)} empty={!precatorio.esfera_devedor} />
                          </div>
                        )}
                      </div>
                    </ClayCard>

                    {/* COLUNA 2: Financeiro e Datas */}
                    {/* Valores */}
                    <ClayCard className="order-2">
                      <ClayCardHeader icon={DollarSign} title="Dados Financeiros" />
                      <div className="p-5 lg:px-[22px] lg:py-5 space-y-5">
                        {isEditing && (canEditValorPrincipal || canEditValorAtualizado) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Valor Principal (R$)</label>
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
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Valor Atualizado (R$)</label>
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
                                <div className="rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 py-2 text-sm text-[#9ca3af]">
                                  {hasValue(precatorio.valor_atualizado) ? formatCurrency(Number(precatorio.valor_atualizado)) : "-"}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Value blobs */}
                        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-3">
                          <ValueBlob
                            label="Valor Principal"
                            value={(() => {
                              const v = isEditing ? editData.valor_principal : precatorio.valor_principal
                              return hasValue(v) && v !== "" ? formatCurrency(Number(v)) : "-"
                            })()}
                          />
                          <ValueBlob
                            label="Valor Atualizado"
                            value={(() => {
                              const v = isEditing ? editData.valor_atualizado : precatorio.valor_atualizado
                              return hasValue(v) && v !== "" ? formatCurrency(Number(v)) : "-"
                            })()}
                            variant="hero"
                          />
                          <ValueBlob
                            label="Saldo Líquido"
                            value={hasValue(precatorio.saldo_liquido) ? formatCurrency(precatorio.saldo_liquido) : "-"}
                            variant="positive"
                          />
                        </div>

                        <div className="h-px bg-[#e8eaef]" />

                        <div className="grid grid-cols-2 gap-[18px] xl:grid-cols-3">
                          <Field
                            label="PSS"
                            value={hasValue(precatorio.pss_valor) ? (precatorio.pss_valor === 0 ? "Isento" : formatCurrency(precatorio.pss_valor)) : "-"}
                            empty={!hasValue(precatorio.pss_valor)}
                          />
                          <Field
                            label="IRPF"
                            value={hasValue(precatorio.irpf_valor) ? formatCurrency(precatorio.irpf_valor) : precatorio.irpf_isento ? "Isento" : "-"}
                            empty={!hasValue(precatorio.irpf_valor) && !precatorio.irpf_isento}
                          />
                          <Field
                            label="Honorários"
                            value={hasValue(precatorio.honorarios_valor) ? formatCurrency(precatorio.honorarios_valor) : "-"}
                            empty={!hasValue(precatorio.honorarios_valor)}
                          />
                          <Field
                            label="Proposta Maior"
                            value={hasValue(precatorio.proposta_maior_valor) ? formatCurrency(precatorio.proposta_maior_valor) : "-"}
                            empty={!hasValue(precatorio.proposta_maior_valor)}
                          />
                          <Field
                            label="Proposta Menor"
                            value={hasValue(precatorio.proposta_menor_valor) ? formatCurrency(precatorio.proposta_menor_valor) : "-"}
                            empty={!hasValue(precatorio.proposta_menor_valor)}
                          />
                        </div>
                      </div>
                    </ClayCard>

                    {/* Datas */}
                    <ClayCard className="order-5">
                      <ClayCardHeader icon={Calendar} title="Datas Importantes" />
                      <div className="p-5 lg:px-[22px] lg:py-5">
                        {isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Data Base</label>
                              <input type="date" value={editData.data_base || ""} onChange={(e) => setEditData({ ...editData, data_base: e.target.value })} className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                            </div>
                            <div>
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Data de Expedição</label>
                              <input type="date" value={editData.data_expedicao || ""} onChange={(e) => setEditData({ ...editData, data_expedicao: e.target.value })} className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                            </div>
                            <div>
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">LOA (Lei Orcamentaria Anual)</label>
                              <input
                                value={editData.loa || ""}
                                onChange={(e) => setEditData({ ...editData, loa: e.target.value })}
                                placeholder="Ex: LOA 2026"
                                className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Ano Orcamentario</label>
                              <input
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
                                className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                              />
                            </div>
                            <div>
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Previsao de Pagamento (Ano)</label>
                              <input
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
                                className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-3">
                            <Field label="Data Base" value={precatorio.data_base ? formatDate(precatorio.data_base) : "-"} empty={!precatorio.data_base} />
                            <Field label="Data de Expedição" value={precatorio.data_expedicao ? formatDate(precatorio.data_expedicao) : "-"} empty={!precatorio.data_expedicao} />
                            <Field label="Data de Cálculo" value={precatorio.data_calculo ? formatDate(precatorio.data_calculo) : "-"} empty={!precatorio.data_calculo} />
                            <Field label="LOA" value={precatorio.loa || "-"} empty={!precatorio.loa} />
                            <Field label="Ano Orcamentario" value={hasValue(precatorio.ano_orcamentario) ? String(precatorio.ano_orcamentario) : "-"} empty={!hasValue(precatorio.ano_orcamentario)} />
                            <Field
                              label="Previsao de Pagamento"
                              value={(() => {
                                const year = precatorio.previsao_pagamento ? String(precatorio.previsao_pagamento).slice(0, 4) : ""
                                return /^\d{4}$/.test(year) ? year : "-"
                              })()}
                              empty={!precatorio.previsao_pagamento}
                            />
                          </div>
                        )}
                      </div>
                    </ClayCard>
                  </div>

                  {/* COLUNA 3: Partes e Observações */}
                  <div className="flex flex-col gap-6">
                    {/* Triagem de Interesse */}
                    <ClayCard className="order-1">
                      <ClayCardHeader icon={Users} title="Triagem de Interesse" />
                      <div className="p-5 lg:px-[22px] lg:py-5 space-y-3">
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
                            <span className="font-semibold">Fluxo da triagem</span>
                            <Select
                              value={triagemFluxoSelection}
                              onValueChange={(value) => setTriagemFluxoSelection(value as TriagemFluxoOption)}
                            >
                              <SelectTrigger className="min-w-[220px]">
                                <SelectValue placeholder="Escolha o fluxo" />
                              </SelectTrigger>
                              <SelectContent>
                                {TRIAGEM_FLUXO_OPTIONS.map((option) => (
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
                            disabled={triagemSaving}
                          >
                            {triagemSaving ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                        {interesseObservacao && (
                          <div className="space-y-1">
                            <p className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Observação da triagem</p>
                            <p className="text-[13.5px] font-semibold leading-snug text-[#0b0c10]">{interesseObservacao}</p>
                          </div>
                        )}
                      </div>
                    </ClayCard>

                    {/* Dados Bancários */}
                    <ClayCard className="order-4">
                      <ClayCardHeader icon={DollarSign} title="Dados Bancários" />
                      <div className="p-5 lg:px-[22px] lg:py-5 space-y-4">
                        {isEditing ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Banco</label>
                                <input
                                  placeholder="Ex: Banco do Brasil"
                                  value={editData.banco || ""}
                                  onChange={(e) => setEditData({ ...editData, banco: e.target.value })}
                                  className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                                />
                              </div>
                              <div>
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Tipo de Conta</label>
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
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Agência</label>
                                <input
                                  placeholder="Sem dígito"
                                  value={editData.agencia || ""}
                                  onChange={(e) => setEditData({ ...editData, agencia: e.target.value })}
                                  className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                                />
                              </div>
                              <div>
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Conta</label>
                                <input
                                  placeholder="Com dígito"
                                  value={editData.conta || ""}
                                  onChange={(e) => setEditData({ ...editData, conta: e.target.value })}
                                  className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                                />
                              </div>
                            </div>
                            <div className="my-2 h-px bg-[#e8eaef]" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Tipo Chave PIX</label>
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
                                <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Chave PIX</label>
                                <input
                                  value={editData.chave_pix || ""}
                                  onChange={(e) => setEditData({ ...editData, chave_pix: e.target.value })}
                                  className="mt-1 h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Observações Bancárias</label>
                              <textarea
                                value={editData.observacoes_bancarias || ""}
                                onChange={(e) => setEditData({ ...editData, observacoes_bancarias: e.target.value })}
                                placeholder="Ex: Pagamento somente em nome do titular..."
                                rows={3}
                                className="mt-1 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 py-3 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-[18px]">
                              <Field label="Banco" value={precatorio.banco || "-"} empty={!precatorio.banco} />
                              <Field label="Tipo" value={precatorio.tipo_conta || "-"} empty={!precatorio.tipo_conta} className="capitalize" />
                              <Field label="Agência" value={precatorio.agencia || "-"} empty={!precatorio.agencia} />
                              <Field label="Conta" value={precatorio.conta || "-"} empty={!precatorio.conta} />
                            </div>
                            {precatorio.chave_pix && (
                              <div className="mt-3 rounded-[14px] bg-[#f2f3f7] p-3" style={{ boxShadow: sh.inset }}>
                                <span className="text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af] flex items-center gap-1.5">
                                  <ExternalLink className="h-3 w-3" /> PIX ({precatorio.tipo_chave_pix || "Chave"})
                                </span>
                                <p className="mt-1 text-[13.5px] font-semibold font-mono text-[#0b0c10] select-all">{precatorio.chave_pix}</p>
                              </div>
                            )}
                            {precatorio.observacoes_bancarias && (
                              <Field label="Observações" value={precatorio.observacoes_bancarias} />
                            )}
                          </>
                        )}
                      </div>
                    </ClayCard>

                    {/* Credor e Advogado */}
                    <ClayCard className="order-2">
                      <ClayCardHeader icon={User} title="Partes (Credor / Advogado)" />
                      <div className="p-5 lg:px-[22px] lg:py-5 space-y-5">
                        {/* Credor */}
                        <div>
                          <p className="mb-3 text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Credor</p>
                          {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                <input value={editData.credor_nome || ""} onChange={(e) => setEditData({ ...editData, credor_nome: e.target.value })} placeholder="Nome do Credor" className="h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                              </div>
                              <div>
                                <input value={editData.credor_cpf_cnpj || ""} onChange={(e) => setEditData({ ...editData, credor_cpf_cnpj: e.target.value })} placeholder="CPF/CNPJ" className="h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                              </div>
                              <div>
                                <input value={editData.credor_telefone || ""} onChange={(e) => setEditData({ ...editData, credor_telefone: e.target.value })} placeholder="Telefone" className="h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[15px] font-bold text-[#0b0c10]">{precatorio.credor_nome || "-"}</p>
                              <div className="grid grid-cols-2 gap-[12px]">
                                <Field label="CPF/CNPJ" value={precatorio.credor_cpf_cnpj || "-"} empty={!precatorio.credor_cpf_cnpj} />
                                <Field label="Telefone" value={precatorio.credor_telefone || "-"} empty={!precatorio.credor_telefone} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="h-px bg-[#e8eaef]" />
                        {/* Advogado */}
                        <div>
                          <p className="mb-3 text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]">Advogado</p>
                          {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <input value={editData.advogado_nome || ""} onChange={(e) => setEditData({ ...editData, advogado_nome: e.target.value })} placeholder="Nome do Advogado" className="h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                              <input value={editData.advogado_oab || ""} onChange={(e) => setEditData({ ...editData, advogado_oab: e.target.value })} placeholder="OAB" className="h-11 w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30" />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-[12px]">
                              <Field label="Nome" value={precatorio.advogado_nome || "-"} empty={!precatorio.advogado_nome} />
                              <Field label="OAB" value={precatorio.advogado_oab || "-"} empty={!precatorio.advogado_oab} />
                            </div>
                          )}
                        </div>
                      </div>
                    </ClayCard>

                    {/* Herdeiros */}
                    <ClayCard className="order-3">
                      <div className="flex items-center justify-between border-b border-[#e8eaef] px-[22px] py-[18px] pb-[14px]">
                        <div className="flex items-center gap-[13px]">
                          <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[13px] border border-black/[0.07] bg-[#f2f3f7]" style={{ boxShadow: sh.sm }}>
                            <Users className="h-[18px] w-[18px] stroke-[1.75] text-[#374151]" />
                          </div>
                          <span className="text-[15px] font-extrabold tracking-[-0.2px] text-[#0b0c10]">Herdeiros</span>
                          {herdeiros.length > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0e4d6a] px-1.5 text-[10px] font-bold text-white">
                              {herdeiros.length}
                            </span>
                          )}
                        </div>
                        {canEdit && (
                          <ClayBtnGhost onClick={handleAddHerdeiro} disabled={herdeiroSaving} className="h-[32px] text-[11.5px]">
                            Adicionar herdeiro
                          </ClayBtnGhost>
                        )}
                      </div>
                      <div className="p-5 lg:px-[22px] lg:py-5">
                        {herdeirosLoading ? (
                          <p className="text-[13px] text-[#9ca3af]">Carregando herdeiros...</p>
                        ) : herdeiros.length === 0 ? (
                          <p className="text-[13px] italic text-[#9ca3af]">Nenhum herdeiro informado.</p>
                        ) : (
                          <div className="space-y-3">
                            {herdeiros.map((herdeiro) => (
                              <button
                                key={herdeiro.id}
                                type="button"
                                onClick={() => handleOpenHerdeiro(herdeiro)}
                                className="w-full text-left rounded-[14px] border border-black/[0.07] bg-[#f2f3f7] p-3 transition hover:bg-white hover:-translate-y-[1px]"
                                style={{ boxShadow: sh.sm }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <p className="text-[13.5px] font-bold text-[#0b0c10]">{herdeiro.nome_completo || "Herdeiro"}</p>
                                    {herdeiro.cpf && (
                                      <p className="text-[11px] text-[#6b7280]">CPF: {herdeiro.cpf}</p>
                                    )}
                                    {herdeiro.telefone && (
                                      <p className="text-[11px] text-[#6b7280]">Telefone: {herdeiro.telefone}</p>
                                    )}
                                    {herdeiro.email && (
                                      <p className="text-[11px] text-[#6b7280]">Email: {herdeiro.email}</p>
                                    )}
                                  </div>
                                  {formatPercent(herdeiro.percentual_participacao) && (
                                    <span className="inline-flex h-6 items-center rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2 text-[10.5px] font-bold text-[#1d4ed8]">
                                      {formatPercent(herdeiro.percentual_participacao)}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </ClayCard>

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
                    <ClayCard className="order-5">
                      <ClayCardHeader icon={FileText} title="Observações" />
                      <div className="p-5 lg:px-[22px] lg:py-5">
                        {isEditing ? (
                          <textarea
                            value={editData.contatos || ""}
                            onChange={(e) => setEditData({ ...editData, contatos: e.target.value })}
                            rows={4}
                            placeholder="Nenhuma observação."
                            className="w-full rounded-[16px] border border-black/[0.06] bg-[#f2f3f7] px-4 py-3 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"
                            style={{ boxShadow: sh.inset }}
                          />
                        ) : (
                          <div className="rounded-[16px] bg-[#f2f3f7] px-4 py-3 text-[13.5px] leading-relaxed text-[#374151] whitespace-pre-wrap" style={{ boxShadow: sh.inset }}>
                            {precatorio.contatos || <span className="italic text-[#9ca3af]">Nenhuma observação.</span>}
                          </div>
                        )}
                      </div>
                    </ClayCard>
                  </div>
                </div>

                {/* Footer bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-black/[0.07] bg-white px-5 py-3" style={{ boxShadow: sh.sm }}>
                  <div className="flex flex-wrap gap-4 text-[11px] text-[#9ca3af]">
                    {precatorio.created_at && (
                      <span>Criado em {new Date(precatorio.created_at).toLocaleDateString("pt-BR")}</span>
                    )}
                    {precatorio.updated_at && (
                      <span>Atualizado em {new Date(precatorio.updated_at).toLocaleDateString("pt-BR")}</span>
                    )}
                  </div>
                  {canEdit && !creditoBloqueadoParaOperador && !isEditing && (
                    <div className="flex items-center gap-2">
                      <ClayBtnGhost onClick={() => setIsEditing(true)}>
                        <Edit className="h-[14px] w-[14px]" />
                        Editar dados
                      </ClayBtnGhost>
                    </div>
                  )}
                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <ClayBtnGhost onClick={() => setIsEditing(false)} disabled={saving}>
                        <X className="h-[14px] w-[14px]" />
                        Cancelar
                      </ClayBtnGhost>
                      <ClayBtnAc onClick={handleSaveEdit} disabled={saving}>
                        <Save className="h-[14px] w-[14px]" />
                        {saving ? "Salvando..." : "Salvar alterações"}
                      </ClayBtnAc>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab: DataJud */}
              <TabsContent value="datajud" className="mt-0">
                <DataJudConsultaPanel
                  numeroProcesso={precatorio?.numero_processo || null}
                  tribunal={precatorio?.tribunal || null}
                  titulo={precatorio?.titulo || null}
                />
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
                  precatorio={precatorio}
                />
              </TabsContent>

              {/* Tab: Contratos */}
              <TabsContent value="contratos" className="mt-0">
                <AbaContratos
                  precatorioId={id}
                  canEdit={
                    userRole?.includes("admin") ||
                    userRole?.includes("gestor") ||
                    userRole?.includes("gestor_escrituras") ||
                    false
                  }
                  onUpdate={loadPrecatorio}
                  initialStatus={precatorio?.status_contrato}
                  initialObservacoes={precatorio?.observacoes_contrato}
                  precatorio={precatorio}
                />
              </TabsContent>

              {/* Tab: Procuração */}
              <TabsContent value="procuracao" className="mt-0">
                <AbaProcuracao
                  precatorioId={id}
                  canEdit={
                    userRole?.includes("admin") ||
                    userRole?.includes("gestor") ||
                    userRole?.includes("gestor_escrituras") ||
                    false
                  }
                  onUpdate={loadPrecatorio}
                  initialStatus={precatorio?.status_procuracao}
                  initialObservacoes={precatorio?.observacoes_procuracao}
                  precatorio={precatorio}
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
                    <Card className={`${dashboardCardClass} mb-4 border-[#0e4d6a]/20 bg-[#e8f4f8]`}>
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
                <ClayCard>
                  <ClayCardHeader icon={Clock} title="Linha do Tempo" />
                  <div className="p-5 lg:px-[22px] lg:py-5">
                    <Timeline precatorioId={id} />
                  </div>
                </ClayCard>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
            </div>{/* ── fim: área de conteúdo ── */}
          </div>{/* ── fim: flex container sidebar+conteúdo ── */}
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

