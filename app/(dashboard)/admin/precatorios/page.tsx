"use client"
/* eslint-disable */

import { useEffect, useMemo, useState } from "react"

import { ModalCriarPrecatorio } from "@/components/admin/modal-criar-precatorio"
import { ModalTemplatePrecatorio } from "@/components/admin/modal-template-precatorio"

// Tipo de dados extraídos via OCR
interface PrecatorioData {
  credor_nome?: string
  valor_principal?: number
  numero_precatorio?: string
  tribunal?: string
  file_url?: string
  raw_text?: string
  // outros campos podem ser adicionados conforme necessidade
}

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  FileText,
  Search,
  Send,
  Bell,
  CheckCircle2,
  Clock,
  Plus,
  Loader2,
  Trash2,
  User,
  Shuffle,
  AlertTriangle,
  TrendingUp,
  Star,
  X,
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { RoleGuard } from "@/lib/auth/role-guard"
import { toast } from "sonner"
import { UploadOficiosModal } from "@/components/admin/upload-oficios-modal"
import { ModalImportarPrecatorio } from "@/components/admin/modal-importar-precatorio"
import { trackSupabaseError, trackError } from "@/lib/utils/error-tracker"
import { Checkbox } from "@/components/ui/checkbox"
import { AdvancedFilters } from "@/components/precatorios/advanced-filters"
import { getFiltrosAtivos, type FiltrosPrecatorios } from "@/lib/types/filtros"

interface Usuario {
  id: string
  nome: string
  email: string
  role: string[] // Array de roles
}

interface PrecatorioAdmin {
  id: string
  titulo: string
  numero_precatorio: string
  numero_processo: string
  numero_oficio?: string
  credor_nome: string
  credor_cpf_cnpj?: string
  tribunal: string
  devedor?: string
  advogado_nome?: string
  advogado_cpf_cnpj?: string
  valor_principal: number
  valor_atualizado: number
  status_kanban: string
  prioridade: string
  status?: string
  dono_usuario_id: string
  responsavel?: string
  responsavel_calculo_id: string
  urgente?: boolean
  titular_falecido?: boolean
  nivel_complexidade?: "baixa" | "media" | "alta" | null
  sla_status?: "nao_iniciado" | "no_prazo" | "atencao" | "atrasado" | "concluido" | null
  tipo_atraso?: "titular_falecido" | "penhora" | "cessao_parcial" | "doc_incompleta" | "duvida_juridica" | "aguardando_cliente" | "outro" | null
  impacto_atraso?: "baixo" | "medio" | "alto" | null
  data_entrada_calculo?: string
  created_at?: string
  file_url?: string
  usuario_dono?: Usuario
  usuario_calculo?: Usuario
}

const RELATED_ADV_FILTER_KEYS: Record<string, Array<keyof FiltrosPrecatorios>> = {
  data_criacao: ["data_criacao_inicio", "data_criacao_fim"],
  data_entrada_calculo: ["data_entrada_calculo_inicio", "data_entrada_calculo_fim"],
  valor: ["valor_min", "valor_max"],
  valor_atualizado: ["valor_atualizado_min", "valor_atualizado_max"],
  valor_sem_atualizacao: ["valor_sem_atualizacao_min", "valor_sem_atualizacao_max"],
}

const normalizeSearchText = (value: string) => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const onlyDigits = (value: string) => value.replace(/\D/g, "")

const matchesPrecatorioSearch = (prec: PrecatorioAdmin, term: string) => {
  const normalizedTerm = normalizeSearchText(term)
  if (!normalizedTerm) return true

  const tokens = normalizedTerm.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true

  const textHaystack = normalizeSearchText(
    [
      prec.titulo,
      prec.credor_nome,
      prec.numero_precatorio,
      prec.numero_processo,
      prec.numero_oficio,
      prec.tribunal,
      prec.devedor,
      prec.credor_cpf_cnpj,
      prec.advogado_nome,
      prec.advogado_cpf_cnpj,
    ]
      .filter(Boolean)
      .join(" ")
  )

  const digitsHaystack = [
    prec.numero_precatorio,
    prec.numero_processo,
    prec.numero_oficio,
    prec.credor_cpf_cnpj,
    prec.advogado_cpf_cnpj,
  ]
    .filter(Boolean)
    .map((value) => onlyDigits(String(value)))
    .join(" ")

  return tokens.every((token) => {
    if (/^\d+$/.test(token)) {
      return digitsHaystack.includes(token)
    }
    return textHaystack.includes(token)
  })
}

const STATUS_EXPANSION_MAP: Record<string, string[]> = {
  encerrados: ["encerrados", "pos_fechamento", "pausado_credor", "pausado_documentos", "sem_interesse"],
  em_calculo: ["em_calculo", "calculo_andamento"],
  calculo_andamento: ["calculo_andamento", "em_calculo"],
  calculado: ["calculado", "calculo_concluido"],
  calculo_concluido: ["calculo_concluido", "calculado"],
  novo: ["novo", "entrada"],
  entrada: ["entrada", "novo"],
  em_contato: ["em_contato", "triagem_interesse"],
  triagem_interesse: ["triagem_interesse", "em_contato"],
  aguardando_documentos: ["aguardando_documentos", "docs_credor"],
  docs_credor: ["docs_credor", "aguardando_documentos"],
  em_negociacao: ["em_negociacao", "proposta_negociacao"],
  proposta_negociacao: ["proposta_negociacao", "em_negociacao"],
  concluido: ["concluido", "fechado", "finalizado"],
  fechado: ["fechado", "concluido", "finalizado"],
  finalizado: ["finalizado", "fechado", "concluido"],
}

const CALCULO_ANDAMENTO_STATUSES = new Set(["calculo_andamento", "em_calculo", "pronto_calculo", "juridico"])
const CALCULO_FINALIZADO_STATUSES = new Set([
  "calculo_concluido",
  "calculado",
  "concluido",
  "finalizado",
  "fechado",
  "pos_fechamento",
  "proposta_negociacao",
  "proposta_aceita",
  "certidoes",
])

const normalizeStatus = (status?: string | null) => (status || "").trim().toLowerCase()

const expandStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status)
  if (!normalized) return []
  return STATUS_EXPANSION_MAP[normalized] || [normalized]
}

const parseDateBoundary = (value: string | undefined, endOfDay: boolean) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const hasTime = trimmed.includes("T")
  const normalized = hasTime
    ? trimmed
    : `${trimmed}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const parseRecordDate = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const matchNumberRange = (value: number, min?: number, max?: number) => {
  if (min !== undefined && value < min) return false
  if (max !== undefined && value > max) return false
  return true
}

const matchesAdvancedFilters = (prec: PrecatorioAdmin, filtros: FiltrosPrecatorios) => {
  const statusTokens = new Set<string>()
  ;[prec.status_kanban, prec.status].forEach((status) => {
    const normalized = normalizeStatus(status)
    if (!normalized) return
    statusTokens.add(normalized)
    expandStatus(normalized).forEach((expanded) => statusTokens.add(expanded))
  })

  if (filtros.status && filtros.status.length > 0) {
    const selectedStatuses = new Set<string>()
    filtros.status.forEach((status) => {
      expandStatus(status).forEach((expanded) => selectedStatuses.add(expanded))
    })

    const hasStatusMatch = Array.from(selectedStatuses).some((status) => statusTokens.has(status))
    if (!hasStatusMatch) return false
  }

  if (filtros.tribunal) {
    const filtroTribunal = normalizeSearchText(filtros.tribunal)
    const tribunal = normalizeSearchText(prec.tribunal || "")
    if (!tribunal.includes(filtroTribunal)) return false
  }

  if (filtros.responsavel_id) {
    const hasResponsavel = [prec.dono_usuario_id, prec.responsavel_calculo_id, prec.responsavel]
      .filter(Boolean)
      .some((id) => id === filtros.responsavel_id)
    if (!hasResponsavel) return false
  }

  if (filtros.complexidade && filtros.complexidade.length > 0) {
    if (!prec.nivel_complexidade || !filtros.complexidade.includes(prec.nivel_complexidade)) return false
  }

  if (filtros.sla_status && filtros.sla_status.length > 0) {
    if (!prec.sla_status || !filtros.sla_status.includes(prec.sla_status)) return false
  }

  if (filtros.tipo_atraso && filtros.tipo_atraso.length > 0) {
    if (!prec.tipo_atraso || !filtros.tipo_atraso.includes(prec.tipo_atraso)) return false
  }

  if (filtros.impacto_atraso && filtros.impacto_atraso.length > 0) {
    if (!prec.impacto_atraso || !filtros.impacto_atraso.includes(prec.impacto_atraso)) return false
  }

  const createdAtStart = parseDateBoundary(filtros.data_criacao_inicio, false)
  const createdAtEnd = parseDateBoundary(filtros.data_criacao_fim, true)
  if (createdAtStart || createdAtEnd) {
    const createdAt = parseRecordDate(prec.created_at)
    if (!createdAt) return false
    if (createdAtStart && createdAt < createdAtStart) return false
    if (createdAtEnd && createdAt > createdAtEnd) return false
  }

  const entradaCalculoStart = parseDateBoundary(filtros.data_entrada_calculo_inicio, false)
  const entradaCalculoEnd = parseDateBoundary(filtros.data_entrada_calculo_fim, true)
  if (entradaCalculoStart || entradaCalculoEnd) {
    const entradaCalculo = parseRecordDate(prec.data_entrada_calculo)
    if (!entradaCalculo) return false
    if (entradaCalculoStart && entradaCalculo < entradaCalculoStart) return false
    if (entradaCalculoEnd && entradaCalculo > entradaCalculoEnd) return false
  }

  const valorBase = Number(getPrecatorioValue(prec))
  if (!matchNumberRange(valorBase, filtros.valor_min, filtros.valor_max)) return false

  const valorAtualizado = Number(prec.valor_atualizado || 0)
  if (!matchNumberRange(valorAtualizado, filtros.valor_atualizado_min, filtros.valor_atualizado_max)) return false

  const valorSemAtualizacao = Number(prec.valor_principal || 0)
  if (
    !matchNumberRange(
      valorSemAtualizacao,
      filtros.valor_sem_atualizacao_min,
      filtros.valor_sem_atualizacao_max
    )
  ) {
    return false
  }

  if (filtros.urgente && !prec.urgente) return false
  if (filtros.titular_falecido && !prec.titular_falecido) return false

  if (filtros.valor_calculado && !(valorAtualizado > 0)) return false

  if (filtros.calculo_em_andamento) {
    const inProgress = Array.from(statusTokens).some((status) => CALCULO_ANDAMENTO_STATUSES.has(status))
    if (!inProgress) return false
  }

  if (filtros.calculo_finalizado) {
    const finalized = Array.from(statusTokens).some((status) => CALCULO_FINALIZADO_STATUSES.has(status))
    if (!finalized) return false
  }

  return true
}

const KANBAN_PROGRESS: Record<string, number> = {
  entrada: 5,
  triagem_interesse: 15,
  analise_processual_inicial: 25,
  docs_credor: 35,
  pronto_calculo: 45,
  calculo_andamento: 55,
  juridico: 65,
  calculo_concluido: 75,
  proposta_negociacao: 85,
  proposta_aceita: 90,
  certidoes: 95,
  fechado: 100,
  pos_fechamento: 100,
  pausado_credor: 20,
  pausado_documentos: 30,
  sem_interesse: 100,
  reprovado: 100,
}

const KANBAN_LABELS: Record<string, string> = {
  entrada: "Entrada",
  triagem_interesse: "Triagem",
  analise_processual_inicial: "Análise Processual Inicial",
  docs_credor: "Documentos do credor",
  pronto_calculo: "Pronto para cálculo",
  calculo_andamento: "Cálculo em andamento",
  juridico: "Jurídico",
  calculo_concluido: "Cálculo concluído",
  proposta_negociacao: "Proposta / Negociação",
  proposta_aceita: "Proposta aceita",
  certidoes: "Certidões",
  fechado: "Fechado",
  pos_fechamento: "Pós-fechamento",
  pausado_credor: "Pausado (credor)",
  pausado_documentos: "Pausado (documentos)",
  sem_interesse: "Sem interesse",
  reprovado: "Reprovado / não elegível",
}

const STATUS_TONES: Record<string, string> = {
  entrada: "border-slate-200 text-slate-600 bg-slate-50/60 dark:border-slate-800 dark:text-slate-300 dark:bg-slate-900/40",
  triagem_interesse: "border-blue-200 text-blue-700 bg-blue-50/60 dark:border-blue-900/50 dark:text-blue-200 dark:bg-blue-950/40",
  analise_processual_inicial: "border-amber-200 text-amber-700 bg-amber-50/60 dark:border-amber-900/50 dark:text-amber-200 dark:bg-amber-950/40",
  docs_credor: "border-indigo-200 text-indigo-700 bg-indigo-50/60 dark:border-indigo-900/50 dark:text-indigo-200 dark:bg-indigo-950/40",
  pronto_calculo: "border-cyan-200 text-cyan-700 bg-cyan-50/60 dark:border-cyan-900/50 dark:text-cyan-200 dark:bg-cyan-950/40",
  calculo_andamento: "border-orange-200 text-orange-700 bg-orange-50/60 dark:border-orange-900/50 dark:text-orange-200 dark:bg-orange-950/40",
  juridico: "border-purple-200 text-purple-700 bg-purple-50/60 dark:border-purple-900/50 dark:text-purple-200 dark:bg-purple-950/40",
  calculo_concluido: "border-emerald-200 text-emerald-700 bg-emerald-50/60 dark:border-emerald-900/50 dark:text-emerald-200 dark:bg-emerald-950/40",
  proposta_negociacao: "border-yellow-200 text-yellow-700 bg-yellow-50/60 dark:border-yellow-900/50 dark:text-yellow-200 dark:bg-yellow-950/40",
  proposta_aceita: "border-green-200 text-green-700 bg-green-50/60 dark:border-green-900/50 dark:text-green-200 dark:bg-green-950/40",
  certidoes: "border-teal-200 text-teal-700 bg-teal-50/60 dark:border-teal-900/50 dark:text-teal-200 dark:bg-teal-950/40",
  fechado: "border-emerald-200 text-emerald-800 bg-emerald-50/70 dark:border-emerald-900/60 dark:text-emerald-100 dark:bg-emerald-950/50",
  pos_fechamento: "border-emerald-200 text-emerald-800 bg-emerald-50/70 dark:border-emerald-900/60 dark:text-emerald-100 dark:bg-emerald-950/50",
  pausado_credor: "border-orange-200 text-orange-700 bg-orange-50/60 dark:border-orange-900/50 dark:text-orange-200 dark:bg-orange-950/40",
  pausado_documentos: "border-orange-200 text-orange-700 bg-orange-50/60 dark:border-orange-900/50 dark:text-orange-200 dark:bg-orange-950/40",
  sem_interesse: "border-slate-200 text-slate-600 bg-slate-50/60 dark:border-slate-800 dark:text-slate-300 dark:bg-slate-900/40",
  reprovado: "border-red-200 text-red-700 bg-red-50/60 dark:border-red-900/50 dark:text-red-200 dark:bg-red-950/40",
}

type AutoDistribResult = {
  assignments: Record<string, string[]>
  sums: Record<string, number>
  outliers: PrecatorioAdmin[]
  eligible: PrecatorioAdmin[]
  total: number
  target: number
}

function getPrecatorioValue(prec: PrecatorioAdmin) {
  const valorAtualizado = prec.valor_atualizado ?? 0
  const base = valorAtualizado > 0 ? valorAtualizado : prec.valor_principal ?? 0
  return Number(base) || 0
}

function shuffleArray<T>(items: T[]) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildAutoDistribution(
  precatorios: PrecatorioAdmin[],
  operatorIds: string[],
  outlierMultiplier: number
): AutoDistribResult | null {
  if (operatorIds.length === 0) return null
  if (precatorios.length === 0) {
    return {
      assignments: Object.fromEntries(operatorIds.map((id) => [id, []])),
      sums: Object.fromEntries(operatorIds.map((id) => [id, 0])),
      outliers: [],
      eligible: [],
      total: 0,
      target: 0,
    }
  }

  const total = precatorios.reduce((acc, p) => acc + getPrecatorioValue(p), 0)
  const target = operatorIds.length > 0 ? total / operatorIds.length : 0
  const limit = target > 0 ? target * Math.max(outlierMultiplier, 1) : Number.POSITIVE_INFINITY

  const outliers = precatorios.filter((p) => getPrecatorioValue(p) > limit)
  const outlierIds = new Set(outliers.map((p) => p.id))
  const eligible = precatorios.filter((p) => !outlierIds.has(p.id))

  const sorted = shuffleArray(eligible).sort((a, b) => {
    const diff = getPrecatorioValue(b) - getPrecatorioValue(a)
    if (Math.abs(diff) < 0.01) return Math.random() - 0.5
    return diff
  })

  const sums: Record<string, number> = {}
  const assignments: Record<string, string[]> = {}
  operatorIds.forEach((id) => {
    sums[id] = 0
    assignments[id] = []
  })

  sorted.forEach((prec) => {
    const minSum = Math.min(...operatorIds.map((id) => sums[id]))
    const candidates = operatorIds.filter((id) => Math.abs(sums[id] - minSum) < 0.01)
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    assignments[pick].push(prec.id)
    sums[pick] += getPrecatorioValue(prec)
  })

  return {
    assignments,
    sums,
    outliers,
    eligible,
    total,
    target,
  }
}

export default function AdminPrecatoriosPage() {
  const router = useRouter()
  const [precatorios, setPrecatorios] = useState<PrecatorioAdmin[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTab, setFiltroTab] = useState<"todos" | "distribuidos" | "pendentes">("todos")
  const [filtrosAvancados, setFiltrosAvancados] = useState<FiltrosPrecatorios>({})

  const [uploadOficiosOpen, setUploadOficiosOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [distributeDialogOpen, setDistributeDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPrecatorio, setSelectedPrecatorio] = useState<PrecatorioAdmin | null>(null)
  const [ocrData, setOcrData] = useState<PrecatorioData | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false)
  const [notifyMessage, setNotifyMessage] = useState("")
  const [notifyRecipients, setNotifyRecipients] = useState<string[]>([])
  const [sendingNotice, setSendingNotice] = useState(false)
  const [sendingInterest, setSendingInterest] = useState<string | null>(null)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  // Bulk Deletion State
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [autoDistribDialogOpen, setAutoDistribDialogOpen] = useState(false)
  const [autoDistribOperatorIds, setAutoDistribOperatorIds] = useState<string[]>([])
  const [autoDistribPrioridade, setAutoDistribPrioridade] = useState<"baixa" | "media" | "alta" | "urgente">("media")
  const [autoDistribOutlierMultiplier, setAutoDistribOutlierMultiplier] = useState(1.6)
  const [autoDistribSaving, setAutoDistribSaving] = useState(false)

  const [distribuicao, setDistribuicao] = useState({
    dono_usuario_id: "",
    responsavel_calculo_id: "none",
    prioridade: "media" as "baixa" | "media" | "alta" | "urgente",
  })

  const operadoresComerciais = useMemo(
    () => usuarios.filter((u) => u.role.includes("operador_comercial")),
    [usuarios]
  )
  const operadoresCalculo = useMemo(
    () => usuarios.filter((u) => u.role.includes("operador_calculo")),
    [usuarios]
  )
  const responsaveisFiltro = useMemo(
    () =>
      operadoresComerciais.map((operador) => ({
        id: operador.id,
        nome: operador.nome || "Sem nome",
      })),
    [operadoresComerciais]
  )
  const filtrosAvancadosAtivos = useMemo(
    () => getFiltrosAtivos(filtrosAvancados),
    [filtrosAvancados]
  )
  const responsavelAtivo = useMemo(() => {
    if (!filtrosAvancados.responsavel_id) return null
    const responsavel = responsaveisFiltro.find((item) => item.id === filtrosAvancados.responsavel_id)
    return responsavel?.nome || filtrosAvancados.responsavel_id
  }, [filtrosAvancados.responsavel_id, responsaveisFiltro])
  const totalFiltrosAtivos = filtrosAvancadosAtivos.length + (filtrosAvancados.responsavel_id ? 1 : 0)
  const temFiltrosAvancados = totalFiltrosAtivos > 0

  const recipientOptions = selectedPrecatorio
    ? ([
        selectedPrecatorio.dono_usuario_id
          ? {
              id: selectedPrecatorio.dono_usuario_id,
              label: `Comercial: ${selectedPrecatorio.usuario_dono?.nome ?? "Operador"}`,
            }
          : null,
        selectedPrecatorio.responsavel_calculo_id
          ? {
              id: selectedPrecatorio.responsavel_calculo_id,
              label: `C\u00e1lculo: ${selectedPrecatorio.usuario_calculo?.nome ?? "Operador"}`,
            }
          : null,
      ].filter(Boolean) as { id: string; label: string }[])
    : []
  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) loadData()
  }, [currentUser])

  useEffect(() => {
    if (!autoDistribDialogOpen) return
    if (autoDistribOperatorIds.length > 0) return
    if (operadoresComerciais.length === 0) return
    setAutoDistribOperatorIds(operadoresComerciais.map((op) => op.id))
  }, [autoDistribDialogOpen, autoDistribOperatorIds.length, operadoresComerciais])

  function getPrecatorioRecipients(prec: PrecatorioAdmin) {
    return [prec.dono_usuario_id, prec.responsavel_calculo_id].filter(Boolean)
  }

  function openNotifyDialog(prec: PrecatorioAdmin) {
    setSelectedPrecatorio(prec)
    const recipients = Array.from(new Set(getPrecatorioRecipients(prec)))
    setNotifyRecipients(recipients)
    setNotifyMessage("")
    setNotifyDialogOpen(true)
  }

  async function handleSendNotification() {
    if (!selectedPrecatorio) return
    const mensagem = notifyMessage.trim()
    if (!mensagem || notifyRecipients.length === 0) return

    const supabase = createBrowserClient()
    if (!supabase) return

    try {
      setSendingNotice(true)
      const uniqueRecipients = Array.from(new Set(notifyRecipients)).filter(Boolean)
      const precatorioNome =
        selectedPrecatorio.titulo ||
        selectedPrecatorio.numero_precatorio ||
        selectedPrecatorio.credor_nome ||
        "Precatorio"
      const precatorioStatus = selectedPrecatorio.status_kanban || null
      const payload = uniqueRecipients.map((usuarioId) => ({
        usuario_id: usuarioId,
        precatorio_id: selectedPrecatorio.id,
        tipo: "admin_aviso",
        mensagem,
        lida: false,
        precatorio_nome: precatorioNome,
        precatorio_status: precatorioStatus,
      }))

      const { error } = await supabase.from("notificacoes").insert(payload)
      if (error) throw error

      toast.success("Aviso enviado com sucesso.")
      setNotifyDialogOpen(false)
      setNotifyMessage("")
    } catch (error: any) {
      console.error("Erro ao enviar aviso:", error)
      toast.error(error?.message || "Erro ao enviar aviso")
    } finally {
      setSendingNotice(false)
    }
  }

  async function handleSendCalculoInteresse(prec: PrecatorioAdmin) {
    if (!prec.responsavel_calculo_id) {
      toast.error("Defina um operador de calculo para enviar o alerta.")
      return
    }

    const supabase = createBrowserClient()
    if (!supabase) return

    try {
      setSendingInterest(prec.id)

      const precatorioLabel =
        prec.titulo ||
        prec.numero_precatorio ||
        prec.credor_nome ||
        "Precatório"

      const { error } = await supabase
        .from("notifications")
        .insert({
          user_id: prec.responsavel_calculo_id,
          title: `Admin quer prioridade no calculo - ${precatorioLabel}`,
          body: "O administrador sinalizou interesse no calculo deste precatorio. Priorize quando possivel.",
          kind: "critical",
          link_url: `/precatorios/detalhes?id=${prec.id}`,
          entity_type: "precatorio",
          entity_id: prec.id,
          event_type: "interesse_calculo_admin",
        })

      if (error) throw error

      toast.success("Alerta enviado ao operador de calculo.")
    } catch (error: any) {
      console.error("Erro ao enviar alerta de calculo:", error)
      toast.error(error?.message || "Erro ao enviar alerta")
    } finally {
      setSendingInterest(null)
    }
  }

  async function loadCurrentUser() {
    const supabase = createBrowserClient()
    if (!supabase) return

    const { data } = await supabase.auth.getUser()
    if (data.user) setCurrentUser({ id: data.user.id })
  }

  async function loadData() {
    if (!currentUser) return

    try {
      const supabase = createBrowserClient()
      if (!supabase) return

      console.log('[Admin] Carregando precatórios do admin:', currentUser.id)

      const { data, error } = await supabase
        .from("precatorios")
        .select("*")
        .eq("criado_por", currentUser.id)
        .order("created_at", { ascending: false })

      if (error) {
        trackSupabaseError('select precatorios admin', error, {
          userId: currentUser.id
        })
        throw error
      }

      console.log('[Admin] Precatórios carregados:', data?.length || 0)

      // Carregar dados dos usuários separadamente
      const precatoriosComUsuarios = await Promise.all(
        (data || []).map(async (prec: any) => {
          let usuario_dono = null
          let usuario_calculo = null

          if (prec.dono_usuario_id) {
            const { data: dono } = await supabase
              .from("usuarios")
              .select("id, nome, email, role")
              .eq("id", prec.dono_usuario_id)
              .single()
            usuario_dono = dono
          }

          if (prec.responsavel_calculo_id) {
            const { data: calculo } = await supabase
              .from("usuarios")
              .select("id, nome, email, role")
              .eq("id", prec.responsavel_calculo_id)
              .single()
            usuario_calculo = calculo
          }

          return { ...prec, usuario_dono, usuario_calculo }
        })
      )

      setPrecatorios(precatoriosComUsuarios)
      const { data: users } = await supabase
        .from("usuarios")
        .select("id, nome, email, role")
        .eq("ativo", true)

      // Filtrar em memória é mais seguro para arrays e evita erros 400 do PostgREST
      // com queries complexas de OR/contains

      const filteredUsers = (users || []).filter(u =>
        u.role && (
          u.role.includes("operador_comercial") ||
          u.role.includes("operador_calculo")
        )
      )

      setUsuarios(filteredUsers)
    } catch (error: any) {
      console.error('[Admin] Erro ao carregar dados:', error)
      trackError('Erro ao carregar dados admin', {
        error,
        userId: currentUser?.id
      }, 'high')
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
      // Reset selections on reload
      setSelectedIds([])
    }
  }

  async function handleDistribuir() {
    if (!selectedPrecatorio || !distribuicao.dono_usuario_id) return


    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      const updates: any = {
        responsavel: distribuicao.dono_usuario_id,
        dono_usuario_id: distribuicao.dono_usuario_id,
        prioridade: distribuicao.prioridade,
        // status: "distribuido", // Removido pois viola check constraint constraint 'precatorios_status_check'
      }

      if (distribuicao.responsavel_calculo_id !== "none") {
        updates.responsavel_calculo_id = distribuicao.responsavel_calculo_id
      }

      const { error } = await supabase
        .from("precatorios")
        .update(updates)
        .eq("id", selectedPrecatorio.id)

      if (error) {
        trackSupabaseError('distribuir precatorio', error, {
          precatorioId: selectedPrecatorio.id,
          distribuicao
        })
        throw error
      }

      const precatorioLabel =
        selectedPrecatorio.titulo ||
        selectedPrecatorio.numero_precatorio ||
        selectedPrecatorio.credor_nome ||
        "Precatório"

      try {
        if (distribuicao.dono_usuario_id) {
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: distribuicao.dono_usuario_id,
              title: `Precatório distribuído - ${precatorioLabel}`,
              body: "Um precatório foi atribuído a você pelo administrador.",
              kind: "info",
              link_url: `/precatorios/detalhes?id=${selectedPrecatorio.id}`,
              entity_type: "precatorio",
              entity_id: selectedPrecatorio.id,
              event_type: "distribuicao",
            })

          if (notificationError) {
            console.warn("Erro ao criar notificação de distribuição:", notificationError)
          }
        }
      } catch (notificationErr) {
        console.warn("Falha ao enviar notificação de distribuição:", notificationErr)
      }

      console.log('[Admin] Precatório distribuído com sucesso')
      toast.success("Distribuído com sucesso!")
      setDistributeDialogOpen(false)
      setSelectedPrecatorio(null)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "Erro ao distribuir")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedPrecatorio) return

    if (!selectedPrecatorio) return

    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      const { error } = await supabase.rpc("delete_precatorio", {
        p_precatorio_id: selectedPrecatorio.id,
      })

      if (error) {
        trackSupabaseError('delete precatorio', error, {
          precatorioId: selectedPrecatorio.id
        })
        throw error
      }

      console.log('[Admin] Precatório excluído com sucesso')
      toast.success("Excluído com sucesso!")
      setDeleteDialogOpen(false)
      setSelectedPrecatorio(null)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir")
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return

    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível")

      // Use the bulk delete RPC
      const { error } = await supabase.rpc("delete_precatorios_bulk", {
        p_ids: selectedIds,
      })

      if (error) throw error

      toast.success(`${selectedIds.length} precatórios excluídos com sucesso!`)
      setBulkDeleteDialogOpen(false)
      setSelectedIds([])
      await loadData()
    } catch (error: any) {
      console.error("Bulk delete error:", error)
      toast.error(error.message || "Erro ao excluir em lote")
    } finally {
      setSaving(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const clearFiltrosAvancados = () => {
    setFiltrosAvancados({})
  }

  const removeFiltroAvancado = (key: string) => {
    setFiltrosAvancados((prev) => {
      const next = { ...prev }
      const relatedKeys = RELATED_ADV_FILTER_KEYS[key]

      if (relatedKeys && relatedKeys.length > 0) {
        relatedKeys.forEach((relatedKey) => {
          delete next[relatedKey]
        })
      } else {
        delete next[key as keyof FiltrosPrecatorios]
      }

      return next
    })
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "R$ 0,00"
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
  }

  const getPrioridadeVariant = (p: string): "destructive" | "default" | "secondary" | "outline" => {
    if (p === "urgente") return "destructive"
    if (p === "alta") return "default"
    if (p === "baixa") return "outline"
    return "secondary"
  }

  const selectedPrecatorios = useMemo(
    () => precatorios.filter((p) => selectedIds.includes(p.id)),
    [precatorios, selectedIds]
  )

  const autoDistribPreview = useMemo(
    () => buildAutoDistribution(selectedPrecatorios, autoDistribOperatorIds, autoDistribOutlierMultiplier),
    [selectedPrecatorios, autoDistribOperatorIds, autoDistribOutlierMultiplier]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const precatoriosDistribuidos = precatorios.filter((p) => p.dono_usuario_id)
  const precatoriosPendentes = precatorios.filter((p) => !p.dono_usuario_id)

  let precatoriosFiltrados = precatorios
  if (filtroTab === "distribuidos") precatoriosFiltrados = precatoriosDistribuidos
  if (filtroTab === "pendentes") precatoriosFiltrados = precatoriosPendentes

  const trimmedSearch = searchTerm.trim()
  if (trimmedSearch) {
    precatoriosFiltrados = precatoriosFiltrados.filter((p) => matchesPrecatorioSearch(p, trimmedSearch))
  }

  if (temFiltrosAvancados) {
    precatoriosFiltrados = precatoriosFiltrados.filter((p) => matchesAdvancedFilters(p, filtrosAvancados))
  }

  const filteredIds = new Set(precatoriosFiltrados.map((p) => p.id))
  const selectedInFilteredCount = selectedIds.reduce(
    (count, id) => (filteredIds.has(id) ? count + 1 : count),
    0
  )
  const isAllSelected = precatoriosFiltrados.length > 0 && selectedInFilteredCount === precatoriosFiltrados.length

  const toggleSelectAll = () => {
    const idsDaLista = precatoriosFiltrados.map((p) => p.id)
    setSelectedIds((prev) => {
      const selectedSet = new Set(prev)
      const allSelected = idsDaLista.every((id) => selectedSet.has(id))

      if (allSelected) {
        idsDaLista.forEach((id) => selectedSet.delete(id))
      } else {
        idsDaLista.forEach((id) => selectedSet.add(id))
      }

      return Array.from(selectedSet)
    })
  }

  async function handleAutoDistribuir() {
    if (!autoDistribPreview) return
    const { assignments, outliers } = autoDistribPreview

    const updates: Array<{ id: string; userId: string }> = []
    Object.entries(assignments).forEach(([userId, precIds]) => {
      precIds.forEach((id) => updates.push({ id, userId }))
    })

    const assignmentMap = new Map(updates.map((u) => [u.id, u.userId]))

    if (updates.length === 0) {
      toast.error("Nenhum precatorio elegivel para distribuicao")
      return
    }

    setAutoDistribSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase nao disponivel")

      const precatorioMap = new Map(precatorios.map((p) => [p.id, p]))
      const now = new Date().toISOString()
      let ok = 0
      let fail = 0
      const successIds: string[] = []

      for (const update of updates) {
        const { error } = await supabase
          .from("precatorios")
          .update({
            responsavel: update.userId,
            dono_usuario_id: update.userId,
            prioridade: autoDistribPrioridade,
            updated_at: now,
          })
          .eq("id", update.id)

        if (error) {
          fail += 1
        } else {
          ok += 1
          successIds.push(update.id)
        }
      }

      if (successIds.length > 0) {
        const notificationsPayload = successIds.map((precId) => {
          const prec = precatorioMap.get(precId)
          const precatorioLabel =
            prec?.titulo || prec?.numero_precatorio || prec?.credor_nome || "Precatorio"
          const assignedTo = assignmentMap.get(precId)
          return {
            user_id: assignedTo,
            title: `Precatorio distribuido - ${precatorioLabel}`,
            body: "Distribuicao automatica realizada pelo administrador.",
            kind: "info",
            link_url: `/precatorios/detalhes?id=${precId}`,
            entity_type: "precatorio",
            entity_id: precId,
            event_type: "distribuicao_auto",
          }
        })

        try {
          await supabase.from("notifications").insert(notificationsPayload)
        } catch (notifyError) {
          console.warn("Erro ao enviar notificacoes de distribuicao:", notifyError)
        }
      }

      toast.success(
        `Distribuicao concluida: ${ok} distribuido(s)${fail ? `, ${fail} falharam` : ""}${
          outliers.length ? `, ${outliers.length} com valor destoante` : ""
        }`
      )

      setAutoDistribDialogOpen(false)
      setSelectedIds(outliers.map((p) => p.id))
      await loadData()
    } catch (error: any) {
      toast.error(error?.message || "Erro ao distribuir automaticamente")
    } finally {
      setAutoDistribSaving(false)
    }
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6 p-6 pb-24 relative">
        {/* Bulk Actions Floating Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-popover border shadow-2xl rounded-lg px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
            <span className="text-sm font-medium">{selectedIds.length} selecionado(s)</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Selecionados
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAutoDistribDialogOpen(true)}
              disabled={saving || operadoresComerciais.length === 0}
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Distribuir Automatico
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Cancelar
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Precatórios</h1>
            <p className="text-muted-foreground">Gerencie seus precatórios e distribua para operadores</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Importar (OCR)
            </Button>
            <Button variant="outline" onClick={() => setTemplateModalOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Template JSON
            </Button>
            <Button onClick={() => setUploadOficiosOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload de Ofícios
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{precatorios.length}</div>
              <p className="text-xs text-muted-foreground">Criados por você</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distribuídos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{precatoriosDistribuidos.length}</div>
              <p className="text-xs text-muted-foreground">Atribuídos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{precatoriosPendentes.length}</div>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(precatorios.reduce((s, p) => s + (p.valor_atualizado || p.valor_principal || 0), 0))}
              </div>
              <p className="text-xs text-muted-foreground">Soma total</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Meus Precatórios</CardTitle>
                <CardDescription>Precatórios criados e gerenciados por você</CardDescription>
              </div>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, número ou credor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <AdvancedFilters
                  filtros={filtrosAvancados}
                  onFilterChange={setFiltrosAvancados}
                  onClearFilters={clearFiltrosAvancados}
                  totalFiltrosAtivos={totalFiltrosAtivos}
                  responsaveis={responsaveisFiltro}
                  showResponsavelFilter={responsaveisFiltro.length > 0}
                />
              </div>
            </div>

            {temFiltrosAvancados && (
              <div className="mt-4 flex items-center gap-2 flex-wrap border-t pt-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
                  Filtros:
                </span>
                {responsavelAtivo && (
                  <Badge variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1">
                    <span className="font-semibold">Responsável:</span>
                    <span>{responsavelAtivo}</span>
                    <button
                      type="button"
                      className="ml-1 hover:text-destructive transition-colors"
                      onClick={() => removeFiltroAvancado("responsavel_id")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filtrosAvancadosAtivos.map((filtro, index) => (
                  <Badge
                    key={`${filtro.key}-${index}`}
                    variant="secondary"
                    className="flex items-center gap-1.5 px-2.5 py-1"
                  >
                    <span className="font-semibold">{filtro.label}:</span>
                    <span>{filtro.displayValue}</span>
                    <button
                      type="button"
                      className="ml-1 hover:text-destructive transition-colors"
                      onClick={() => removeFiltroAvancado(filtro.key)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={clearFiltrosAvancados}
                >
                  Limpar
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <Tabs value={filtroTab} onValueChange={(v: any) => setFiltroTab(v)}>
              <div className="flex flex-col gap-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="todos">Todos ({precatorios.length})</TabsTrigger>
                  <TabsTrigger value="distribuidos">Distribuídos ({precatoriosDistribuidos.length})</TabsTrigger>
                  <TabsTrigger value="pendentes">Pendentes ({precatoriosPendentes.length})</TabsTrigger>
                </TabsList>

                {precatoriosFiltrados.length > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <Checkbox
                      id="select-all"
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                    <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium">
                      Selecionar Todos ({precatoriosFiltrados.length})
                    </Label>
                  </div>
                )}
              </div>

              <TabsContent value={filtroTab} className="mt-6">
                {precatoriosFiltrados.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum precatório encontrado</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {filtroTab === "todos" && "Faça upload dos ofícios requisitórios"}
                    </p>
                    {filtroTab === "todos" && (
                      <Button onClick={() => setUploadOficiosOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Upload de Ofícios
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {precatoriosFiltrados.map((prec) => {
                      const statusKey = prec.status_kanban || "entrada"
                      const statusLabel = KANBAN_LABELS[statusKey] || prec.status_kanban
                      const statusTone = STATUS_TONES[statusKey] || "border-slate-200 text-slate-600 bg-slate-50/60 dark:border-slate-800 dark:text-slate-300 dark:bg-slate-900/40"
                      const progress = KANBAN_PROGRESS[statusKey] || 0
                      const isSelected = selectedIds.includes(prec.id)
                      const responsavelNome = prec.usuario_dono?.nome || "Não distribuído"
                      const valorPrincipal = prec.valor_principal || 0
                      const valorAtualizado = prec.valor_atualizado || prec.valor_principal || 0
                      const titulo = prec.titulo || prec.numero_precatorio || "Precatório sem título"
                      const showNumeroPrecatorio = Boolean(prec.titulo && prec.numero_precatorio)

                      return (
                        <Card
                          key={prec.id}
                          className={`border-border/60 transition-shadow ${isSelected ? "ring-2 ring-primary/30 shadow-lg" : "hover:shadow-lg"}`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(prec.id)}
                                aria-label={`Selecionar ${prec.numero_precatorio || prec.titulo || "precatório"}`}
                                className="mt-1"
                              />
                              <div className="flex-1 space-y-1">
                                <CardTitle className="text-base leading-snug line-clamp-2">{titulo}</CardTitle>
                                <CardDescription className="line-clamp-1">
                                  {prec.credor_nome || "Credor não informado"}
                                </CardDescription>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{prec.numero_processo || "Sem processo"}</span>
                                  {showNumeroPrecatorio && <span>• {prec.numero_precatorio}</span>}
                                  {prec.file_url && (
                                    <Badge variant="secondary" className="h-4 px-1 gap-1 text-[9px] pointer-events-none">
                                      <FileText className="h-2 w-2" />
                                      PDF
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge variant="outline" className={`text-xs whitespace-nowrap ${statusTone}`}>
                                  {statusLabel || "Status não definido"}
                                </Badge>
                                <Badge variant={getPrioridadeVariant(prec.prioridade)} className="text-xs capitalize">
                                  {prec.prioridade || "média"}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Status atual</span>
                                <span>{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Valor principal</p>
                                <p className="font-semibold">{formatCurrency(valorPrincipal)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Valor atualizado</p>
                                <p className="font-semibold text-emerald-700">{formatCurrency(valorAtualizado)}</p>
                              </div>
                            </div>

                            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span>Responsável distribuído</span>
                                </div>
                                <span className="font-medium text-foreground">{responsavelNome}</span>
                              </div>
                              {prec.responsavel_calculo_id && (
                                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Cálculo</span>
                                  <span className="font-medium text-foreground">{prec.usuario_calculo?.nome || "—"}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 min-w-[140px]"
                                title={prec.dono_usuario_id ? "Redistribuir" : "Distribuir"}
                                onClick={() => {
                                  setSelectedPrecatorio(prec)
                                  setDistribuicao({
                                    dono_usuario_id: prec.dono_usuario_id || "",
                                    responsavel_calculo_id: prec.responsavel_calculo_id || "none",
                                    prioridade: (prec.prioridade as any) || "media",
                                  })
                                  setDistributeDialogOpen(true)
                                }}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                {prec.dono_usuario_id ? "Redistribuir" : "Distribuir"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 min-w-[120px]"
                                title="Enviar aviso"
                                onClick={() => openNotifyDialog(prec)}
                              >
                                <Bell className="h-3 w-3 mr-1" />
                                Aviso
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 min-w-[150px]"
                                title={
                                  prec.responsavel_calculo_id
                                    ? "Alertar operador de calculo"
                                    : "Defina um operador de calculo primeiro"
                                }
                                disabled={!prec.responsavel_calculo_id || sendingInterest === prec.id}
                                onClick={() => handleSendCalculoInteresse(prec)}
                              >
                                {sendingInterest === prec.id ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Star className="h-3 w-3 mr-1" />
                                )}
                                Interesse no calculo
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                title="Ver detalhes"
                                onClick={() => router.push(`/precatorios/detalhes?id=${prec.id}`)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                title="Excluir"
                                onClick={() => {
                                  setSelectedPrecatorio(prec)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Modal de Upload de Ofícios */}
        <UploadOficiosModal
          open={uploadOficiosOpen}
          onOpenChange={setUploadOficiosOpen}
          onSuccess={() => loadData()}
        />

        <ModalImportarPrecatorio
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onSuccess={() => loadData()}
          onExtracted={(data) => {
            setOcrData(data);
            setImportModalOpen(false);
            setCreateModalOpen(true);
          }}
        />

        <ModalCriarPrecatorio
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          data={ocrData ?? {}}
          onSuccess={() => {
            loadData();
            setOcrData(null);
          }}
        />

        {/* Dialog de Distribuicao Automatica */}
        <Dialog open={autoDistribDialogOpen} onOpenChange={setAutoDistribDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Distribuicao automatica</DialogTitle>
              <DialogDescription>
                Balanceie valores entre operadores e deixe valores destoantes para distribuicao manual.
              </DialogDescription>
            </DialogHeader>

            {selectedPrecatorios.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                Selecione precatorios para distribuir automaticamente.
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Selecionados</p>
                      <p className="font-semibold">{selectedPrecatorios.length} precatorio(s)</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor total</p>
                      <p className="font-semibold">
                        {formatCurrency(selectedPrecatorios.reduce((acc, p) => acc + getPrecatorioValue(p), 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Alvo por operador</p>
                      <p className="font-semibold">
                        {autoDistribPreview ? formatCurrency(autoDistribPreview.target) : "R$ 0,00"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Operadores (comercial)</Label>
                    <div className="max-h-52 overflow-y-auto rounded-lg border border-border/60 p-3 space-y-2">
                      {operadoresComerciais.length === 0 && (
                        <p className="text-xs text-muted-foreground">Nenhum operador comercial cadastrado.</p>
                      )}
                      {operadoresComerciais.map((op) => (
                        <label key={op.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={autoDistribOperatorIds.includes(op.id)}
                            onCheckedChange={(checked) => {
                              setAutoDistribOperatorIds((prev) => {
                                if (checked) return Array.from(new Set([...prev, op.id]))
                                return prev.filter((id) => id !== op.id)
                              })
                            }}
                          />
                          <span>{op.nome}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecione quem recebera a distribuicao automatica.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Prioridade aplicada</Label>
                      <Select
                        value={autoDistribPrioridade}
                        onValueChange={(v: any) => setAutoDistribPrioridade(v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Limite de disparidade (x do alvo)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.1"
                        value={autoDistribOutlierMultiplier}
                        onChange={(e) => setAutoDistribOutlierMultiplier(Number(e.target.value) || 1)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Creditos acima de {autoDistribOutlierMultiplier}x do alvo ficam fora da distribuicao.
                      </p>
                    </div>
                  </div>
                </div>

                {autoDistribPreview && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Previa por operador</p>
                      <p className="text-xs text-muted-foreground">
                        Elegiveis: {autoDistribPreview.eligible.length} | Destoantes: {autoDistribPreview.outliers.length}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {autoDistribOperatorIds.map((id) => {
                        const op = operadoresComerciais.find((o) => o.id === id)
                        const count = autoDistribPreview.assignments[id]?.length || 0
                        const sum = autoDistribPreview.sums[id] || 0
                        return (
                          <div key={id} className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-3 py-2">
                            <div>
                              <p className="text-xs text-muted-foreground">{op?.nome || "Operador"}</p>
                              <p className="text-sm font-medium">{count} credito(s)</p>
                            </div>
                            <p className="text-sm font-semibold">{formatCurrency(sum)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {autoDistribPreview && autoDistribPreview.outliers.length > 0 && (
                  <div className="rounded-lg border border-amber-300/40 bg-amber-50/40 p-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Valores destoantes nao serao distribuidos automaticamente.
                    </div>
                    <div className="mt-2 grid gap-1 text-xs">
                      {autoDistribPreview.outliers.slice(0, 6).map((prec) => (
                        <div key={prec.id} className="flex items-center justify-between">
                          <span className="truncate">{prec.titulo || prec.numero_precatorio || "Precatorio"}</span>
                          <span>{formatCurrency(getPrecatorioValue(prec))}</span>
                        </div>
                      ))}
                      {autoDistribPreview.outliers.length > 6 && (
                        <span className="text-xs text-muted-foreground">
                          +{autoDistribPreview.outliers.length - 6} outros
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setAutoDistribDialogOpen(false)} disabled={autoDistribSaving}>
                Cancelar
              </Button>
              <Button
                onClick={handleAutoDistribuir}
                disabled={
                  autoDistribSaving ||
                  !autoDistribPreview ||
                  autoDistribOperatorIds.length === 0 ||
                  (autoDistribPreview?.eligible.length ?? 0) === 0
                }
              >
                {autoDistribSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shuffle className="h-4 w-4 mr-2" />}
                Aplicar distribuicao
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Distribuição */}
        <Dialog open={distributeDialogOpen} onOpenChange={setDistributeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Distribuir Precatório</DialogTitle>
              <DialogDescription>Atribua a um operador comercial</DialogDescription>
            </DialogHeader>
            {selectedPrecatorio && (
              <div className="bg-muted p-4 rounded-lg mb-4">
                <p className="font-semibold">{selectedPrecatorio.titulo || selectedPrecatorio.numero_precatorio}</p>
                <p className="text-sm text-muted-foreground">Credor: {selectedPrecatorio.credor_nome}</p>
                <p className="text-sm text-muted-foreground">
                  Valor: {formatCurrency(selectedPrecatorio.valor_atualizado || selectedPrecatorio.valor_principal)}
                </p>
              </div>
            )}
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Operador Comercial *</Label>
                <Select
                  value={distribuicao.dono_usuario_id}
                  onValueChange={(v) => setDistribuicao({ ...distribuicao, dono_usuario_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {operadoresComerciais.map((op) => (
                      <SelectItem key={op.id} value={op.id}>{op.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Responsável pela negociação e acompanhamento comercial</p>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={distribuicao.prioridade}
                  onValueChange={(v: any) => setDistribuicao({ ...distribuicao, prioridade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Define a ordem de prioridade no processamento</p>
              </div>
              <div className="space-y-2">
                <Label>Operador de Cálculo (Opcional)</Label>
                <Select
                  value={distribuicao.responsavel_calculo_id}
                  onValueChange={(v) => setDistribuicao({ ...distribuicao, responsavel_calculo_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {operadoresCalculo.map((op) => (
                      <SelectItem key={op.id} value={op.id}>{op.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Responsável técnico pelos cálculos e atualização dos valores</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDistributeDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleDistribuir} disabled={saving || !distribuicao.dono_usuario_id}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Distribuir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Aviso (Notificacao) */}
        <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar aviso</DialogTitle>
              <DialogDescription>
                Notifique os respons\u00e1veis vinculados a este precat\u00f3rio.
              </DialogDescription>
            </DialogHeader>
            {selectedPrecatorio && (
              <div className="bg-muted p-4 rounded-lg mb-4">
                <p className="font-semibold">{selectedPrecatorio.titulo || selectedPrecatorio.numero_precatorio}</p>
                <p className="text-sm text-muted-foreground">Credor: {selectedPrecatorio.credor_nome}</p>
                <p className="text-sm text-muted-foreground">
                  Valor: {formatCurrency(selectedPrecatorio.valor_atualizado || selectedPrecatorio.valor_principal)}
                </p>
              </div>
            )}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Destinat\u00e1rios</Label>
                {recipientOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum destinat\u00e1rio vinculado.
                  </p>
                )}
                <div className="space-y-2">
                  {recipientOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={notifyRecipients.includes(option.id)}
                        onCheckedChange={(checked) => {
                          setNotifyRecipients((prev) => {
                            if (checked) return Array.from(new Set([...prev, option.id]))
                            return prev.filter((id) => id !== option.id)
                          })
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  placeholder="Digite o aviso..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotifyDialogOpen(false)} disabled={sendingNotice}>
                Cancelar
              </Button>
              <Button
                onClick={handleSendNotification}
                disabled={sendingNotice || notifyRecipients.length === 0 || !notifyMessage.trim()}
              >
                {sendingNotice ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
                Enviar aviso
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AlertDialog de Exclusão Individual */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir &quot;{selectedPrecatorio?.titulo}&quot;? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={saving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* AlertDialog de Exclusão em Lote */}
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão em Lote</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <b>{selectedIds.length}</b> precatórios? Esta ação é irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                disabled={saving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Excluir {selectedIds.length} Itens
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>



        <ModalImportarPrecatorio
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onExtracted={(data) => {
            setOcrData(data)
            setImportModalOpen(false)
            // Delay opening the creation modal to allow the import modal to close/animate out completely
            setTimeout(() => {
              setCreateModalOpen(true)
            }, 300)
          }}
        />

        <ModalTemplatePrecatorio
          open={templateModalOpen}
          onOpenChange={setTemplateModalOpen}
          createdById={currentUser?.id}
          onSuccess={() => loadData()}
        />

        <ModalCriarPrecatorio
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          data={ocrData as any}
          onSuccess={() => {
            setCreateModalOpen(false)
            setOcrData(null)
            loadData()
          }}
        />

        <UploadOficiosModal
          open={uploadOficiosOpen}
          onOpenChange={setUploadOficiosOpen}
          onSuccess={() => loadData()}
        />
      </div >
    </RoleGuard >
  )
}

