"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Modal } from "@heroui/react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  addLegalOpinionComment,
  createLegalOpinion,
  getLegalOpinionAttachmentSignedUrl,
  getLegalOpinionDetail,
  getLegalOpinionMetadata,
  listLegalOpinionsByPrecatorio,
  updateLegalOpinion,
  uploadAndRegisterLegalAttachment,
} from "@/features/legal-opinion/api"
import {
  LEGAL_OPINION_STATUSES,
  LEGAL_OPINION_STATUS_LABELS,
  LEGAL_OPINION_TYPE_LABELS,
  type LegalOpinion,
  type LegalOpinionAttachment,
  type LegalOpinionComment,
  type LegalOpinionEvent,
  type LegalOpinionStatus,
} from "@/features/legal-opinion/types"
import {
  countOpinionsByStatus,
  formatBytes,
  formatDate,
  formatDateTime,
  getEventLabel,
  getOpinionSubtitle,
  getOpinionTitle,
} from "@/features/legal-opinion/format"
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
  Scale,
  Upload,
} from "@/components/icons"
import { cn } from "@/lib/utils"
import {
  LegalOpinionFormModal,
  type LegalOpinionFormPrecatorioOption,
  type LegalOpinionFormUserOption,
  type LegalOpinionFormValue,
} from "@/features/legal-opinion/components/legal-opinion-form-modal"

type LegalOpinionPanelProps = {
  precatorioId: string
  initialOpinionId?: string | null
  title?: string
  subtitle?: string
  className?: string
  canCreate?: boolean
  canEdit?: boolean
  showOpenModuleButton?: boolean
}

const allowedFileTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

function getRoleCanEdit(canEdit?: boolean) {
  return canEdit === true
}

function getRoleCanCreate(canCreate?: boolean) {
  return canCreate === true
}

const CHECKLIST_ITEMS = [
  { key: "titularidade", label: "Titularidade/Cessão" },
  { key: "calculos", label: "Cálculos" },
  { key: "prioridade", label: "Prioridade" },
  { key: "penhoras", label: "Penhoras/Bloqueios" },
  { key: "documentos", label: "Documentos" },
  { key: "compliance", label: "Compliance" },
] as const

type BaseChecklistItemKey = (typeof CHECKLIST_ITEMS)[number]["key"]
type ChecklistItemKey = BaseChecklistItemKey | `outro${string}`

type ChecklistEntry = {
  key: ChecklistItemKey
  label: string
  checked: boolean
  note: string | null
  customName: string | null
  isOther: boolean
}

async function forceDownloadByFileName(signedUrl: string, fileName: string) {
  const response = await fetch(signedUrl)
  if (!response.ok) throw new Error("Não foi possível baixar o arquivo.")
  const blob = await response.blob()
  const blobUrl = window.URL.createObjectURL(blob)
  try {
    const anchor = document.createElement("a")
    anchor.href = blobUrl
    anchor.download = fileName
    anchor.style.display = "none"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    window.URL.revokeObjectURL(blobUrl)
  }
}

function getStatusTagClass(status: LegalOpinionStatus): string {
  switch (status) {
    case "pendente":
      return "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300"
    case "em_analise":
      return "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300"
    case "concluido":
      return "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
    case "rejeitado":
      return "border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
    case "arquivado":
      return "border-slate-200 bg-slate-500/10 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
  }
}

function TagPill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.04em]",
        className
      )}
    >
      {children}
    </span>
  )
}

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
      {icon}
      {children}
    </p>
  )
}

function getInitials(name?: string | null) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

export function LegalOpinionPanel({
  precatorioId,
  initialOpinionId = null,
  title = "Parecer Jurídico",
  subtitle = "Solicite, acompanhe e conclua pareceres jurídicos vinculados a este precatório.",
  className,
  canCreate,
  canEdit,
  showOpenModuleButton = true,
}: LegalOpinionPanelProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [opinions, setOpinions] = useState<LegalOpinion[]>([])
  const [selectedOpinionId, setSelectedOpinionId] = useState<string | null>(null)
  const [selectedOpinion, setSelectedOpinion] = useState<LegalOpinion | null>(null)
  const [comments, setComments] = useState<LegalOpinionComment[]>([])
  const [events, setEvents] = useState<LegalOpinionEvent[]>([])
  const [attachments, setAttachments] = useState<LegalOpinionAttachment[]>([])
  const [users, setUsers] = useState<LegalOpinionFormUserOption[]>([])
  const [precatorios, setPrecatorios] = useState<LegalOpinionFormPrecatorioOption[]>([])
  const [commentText, setCommentText] = useState("")
  const [isCommentLoading, setIsCommentLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false)
  const [activeChecklistItem, setActiveChecklistItem] = useState<ChecklistEntry | null>(null)
  const [checklistOpinionText, setChecklistOpinionText] = useState("")
  const [isSavingChecklistOpinion, setIsSavingChecklistOpinion] = useState(false)

  useEffect(() => {
    if (!initialOpinionId) return
    setSelectedOpinionId(initialOpinionId)
  }, [initialOpinionId])

  const hasCreatePermission = getRoleCanCreate(canCreate)
  const hasEditPermission = getRoleCanEdit(canEdit)
  const selectedOpinionStatus = selectedOpinion?.status || "pendente"
  const statusCounters = useMemo(() => countOpinionsByStatus(opinions), [opinions])

  const checklistMetaByKey = useMemo(() => {
    const metaMap = new Map<string, { note: string | null; name: string | null }>()
    const pattern = /^\[CHECKLIST:([a-z0-9_]+)\](?:\[NOME:([^\]]+)\])?\s*([\s\S]*)$/i
    for (const comment of comments) {
      const content = String(comment.content || "").trim()
      const match = content.match(pattern)
      if (!match) continue
      const key = match[1].toLowerCase()
      const name = (match[2] || "").trim() || null
      const note = (match[3] || "").trim() || null
      const current = metaMap.get(key) || { note: null, name: null }
      metaMap.set(key, { note: current.note || note, name: current.name || name })
    }
    return metaMap
  }, [comments])

  const checklistEntries = useMemo(() => {
    const data = selectedOpinion?.checklist || {}
    const baseEntries: ChecklistEntry[] = CHECKLIST_ITEMS.map((item) => ({
      key: item.key,
      label: item.label,
      checked: Boolean(data[item.key]),
      note: checklistMetaByKey.get(item.key)?.note || null,
      customName: null,
      isOther: false,
    }))

    const otherKeys = Object.keys(data)
      .filter((key) => /^outro(?:_\d+)?$/i.test(key))
      .sort((a, b) => {
        const aNum = a === "outro" ? 1 : Number(a.replace("outro_", "")) || 1
        const bNum = b === "outro" ? 1 : Number(b.replace("outro_", "")) || 1
        return aNum - bNum
      })

    if (otherKeys.length === 0) otherKeys.push("outro")

    const otherEntries: ChecklistEntry[] = otherKeys.map((key, index) => {
      const meta = checklistMetaByKey.get(key)
      const customName = meta?.name || null
      return {
        key: key as ChecklistItemKey,
        label: customName || (index === 0 ? "Outro" : `Outro ${index + 1}`),
        checked: Boolean(data[key]),
        note: meta?.note || null,
        customName,
        isOther: true,
      }
    })

    return [...baseEntries, ...otherEntries]
  }, [checklistMetaByKey, selectedOpinion?.checklist])

  async function loadOpinions(preferredOpinionId?: string | null) {
    setIsLoading(true)
    try {
      const [opinionsData, metadata] = await Promise.all([
        listLegalOpinionsByPrecatorio(precatorioId),
        getLegalOpinionMetadata(),
      ])
      setOpinions(opinionsData)
      setUsers(metadata.users.map((u) => ({ id: u.id, nome: u.nome, email: u.email })))
      setPrecatorios(
        metadata.precatorios.map((p) => ({
          id: p.id,
          label: p.titulo || p.numero_precatorio || p.credor_nome || "Precatório sem identificação",
          subtitle: [p.numero_processo, p.credor_nome].filter(Boolean).join(" • "),
        }))
      )
      const nextSelected =
        opinionsData.find((item) => item.id === preferredOpinionId)?.id ||
        opinionsData.find((item) => item.id === initialOpinionId)?.id ||
        opinionsData.find((item) => item.id === selectedOpinionId)?.id ||
        opinionsData[0]?.id ||
        null
      setSelectedOpinionId(nextSelected)
    } catch (error) {
      toast({
        title: "Erro ao carregar pareceres",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function loadDetail(opinionId: string) {
    setIsDetailLoading(true)
    try {
      const detail = await getLegalOpinionDetail(opinionId)
      setSelectedOpinion(detail.data)
      setComments(detail.comments || [])
      setEvents(detail.events || [])
      setAttachments(detail.attachments || [])
    } catch (error) {
      toast({
        title: "Erro ao carregar parecer",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsDetailLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadOpinions() }, [precatorioId])

  useEffect(() => {
    if (!selectedOpinionId) {
      setSelectedOpinion(null)
      setComments([])
      setEvents([])
      setAttachments([])
      return
    }
    void loadDetail(selectedOpinionId)
  }, [selectedOpinionId])

  async function handleCreateOrUpdate(value: LegalOpinionFormValue) {
    setIsSubmittingForm(true)
    try {
      let preferredOpinionId: string | null = selectedOpinion?.id || null
      if (isEditMode && selectedOpinion) {
        const updated = await updateLegalOpinion(selectedOpinion.id, {
          title: value.title,
          type: value.type,
          status: value.status,
          priority: value.priority,
          dueDate: value.dueDate || null,
          assignedTo: value.assignedTo || null,
          executiveSummary: value.executiveSummary || null,
          analysis: value.analysis || null,
          recommendation: value.recommendation || null,
          conclusion: value.conclusion || null,
          checklist: value.checklist,
        })
        preferredOpinionId = updated.id
        setIsFormOpen(false)
        toast({ title: "Parecer atualizado", description: `"${updated.title}" atualizado com sucesso.` })
      } else {
        const created = await createLegalOpinion({
          precatorioId: value.precatorioId,
          title: value.title,
          type: value.type,
          status: value.status,
          priority: value.priority,
          dueDate: value.dueDate || null,
          assignedTo: value.assignedTo || null,
          executiveSummary: value.executiveSummary || null,
          analysis: value.analysis || null,
          recommendation: value.recommendation || null,
          conclusion: value.conclusion || null,
          checklist: value.checklist,
        })
        preferredOpinionId = created.id
        setSelectedOpinionId(created.id)
        setIsFormOpen(false)
        toast({ title: "Parecer criado", description: `"${created.title}" criado com sucesso.` })
      }
      await loadOpinions(preferredOpinionId)
    } catch (error) {
      toast({
        title: "Falha ao salvar parecer",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingForm(false)
    }
  }

  async function handleAddComment() {
    if (!selectedOpinion || !commentText.trim() || isCommentLoading) return
    setIsCommentLoading(true)
    try {
      await addLegalOpinionComment(selectedOpinion.id, commentText.trim())
      setCommentText("")
      await loadDetail(selectedOpinion.id)
      toast({ title: "Comentário adicionado" })
    } catch (error) {
      toast({
        title: "Falha ao adicionar comentário",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsCommentLoading(false)
    }
  }

  async function handleUploadFile(file: File) {
    if (!selectedOpinion || isUploading) return
    if (!allowedFileTypes.includes(file.type)) {
      toast({ title: "Tipo de arquivo não permitido", description: "Use PDF, JPG, PNG ou DOCX.", variant: "destructive" })
      return
    }
    setIsUploading(true)
    try {
      await uploadAndRegisterLegalAttachment(selectedOpinion, file)
      await loadDetail(selectedOpinion.id)
      toast({ title: "Arquivo anexado com sucesso." })
    } catch (error) {
      toast({
        title: "Falha ao anexar arquivo",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDownload(attachment: LegalOpinionAttachment) {
    if (!selectedOpinion) return
    setIsDownloadingId(attachment.id)
    try {
      const result = await getLegalOpinionAttachmentSignedUrl(selectedOpinion.id, attachment.id)
      await forceDownloadByFileName(result.signedUrl, attachment.fileName)
    } catch (error) {
      toast({
        title: "Falha ao baixar arquivo",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsDownloadingId(null)
    }
  }

  async function handleStatusUpdate(status: string) {
    const nextStatus = status as LegalOpinionStatus
    if (!selectedOpinion || !LEGAL_OPINION_STATUSES.includes(nextStatus)) return
    setIsUpdatingStatus(true)
    try {
      await updateLegalOpinion(selectedOpinion.id, { status: nextStatus })
      await loadOpinions()
      await loadDetail(selectedOpinion.id)
      toast({ title: "Status atualizado com sucesso." })
    } catch (error) {
      toast({
        title: "Falha ao atualizar status",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  function openChecklistModal(item: ChecklistEntry) {
    if (!hasEditPermission) return
    setActiveChecklistItem(item)
    setChecklistOpinionText(item.note || "")
    setIsChecklistModalOpen(true)
  }

  async function handleRenameOtherItem(item: ChecklistEntry) {
    if (!hasEditPermission || !selectedOpinion || !item.isOther) return
    const suggestedName = item.customName || item.label || "Outro"
    const nextNameRaw = window.prompt("Novo nome para este item 'Outro':", suggestedName)
    if (nextNameRaw === null) return
    const nextName = nextNameRaw.trim()
    if (!nextName) {
      toast({ title: "Nome inválido", description: "Informe um nome válido.", variant: "destructive" })
      return
    }
    if (nextName === suggestedName) return
    try {
      const noteText = item.note || "Nome do item atualizado."
      await addLegalOpinionComment(selectedOpinion.id, `[CHECKLIST:${item.key}][NOME:${nextName}] ${noteText}`)
      await loadDetail(selectedOpinion.id)
      toast({ title: "Nome atualizado", description: `Item renomeado para "${nextName}".` })
    } catch (error) {
      toast({
        title: "Falha ao renomear item",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    }
  }

  async function handleSaveChecklistOpinion() {
    if (!selectedOpinion || !activeChecklistItem) return
    const note = checklistOpinionText.trim()
    if (!note) {
      toast({ title: "Parecer obrigatório", description: "Informe o parecer para concluir este item.", variant: "destructive" })
      return
    }
    setIsSavingChecklistOpinion(true)
    try {
      const nextChecklist: Record<string, boolean> = {
        ...(selectedOpinion.checklist || {}),
        [activeChecklistItem.key]: true,
      }
      if (activeChecklistItem.isOther) {
        const hasPendingOther = Object.entries(nextChecklist).some(
          ([key, value]) => /^outro(?:_\d+)?$/i.test(key) && !value
        )
        if (!hasPendingOther) {
          const maxOtherIndex = Object.keys(nextChecklist).reduce((max, key) => {
            if (!/^outro(?:_\d+)?$/i.test(key)) return max
            const idx = key === "outro" ? 1 : Number(key.replace("outro_", "")) || 1
            return Math.max(max, idx)
          }, 1)
          nextChecklist[`outro_${maxOtherIndex + 1}`] = false
        }
      }
      await updateLegalOpinion(selectedOpinion.id, { checklist: nextChecklist })
      const prefix = activeChecklistItem.isOther
        ? activeChecklistItem.customName
          ? `[CHECKLIST:${activeChecklistItem.key}][NOME:${activeChecklistItem.customName}]`
          : `[CHECKLIST:${activeChecklistItem.key}]`
        : `[CHECKLIST:${activeChecklistItem.key}]`
      await addLegalOpinionComment(selectedOpinion.id, `${prefix} ${note}`)
      await loadDetail(selectedOpinion.id)
      setIsChecklistModalOpen(false)
      setActiveChecklistItem(null)
      setChecklistOpinionText("")
      toast({ title: "Checklist atualizado", description: `Item "${activeChecklistItem.label}" marcado como concluído.` })
    } catch (error) {
      toast({
        title: "Falha ao salvar checklist",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsSavingChecklistOpinion(false)
    }
  }

  const openCreateModal = () => { setIsEditMode(false); setIsFormOpen(true) }
  const openEditModal = () => { if (!selectedOpinion) return; setIsEditMode(true); setIsFormOpen(true) }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className={cn("space-y-4", className)}>

      {/* Cabeçalho do painel + contadores */}
      <div className="rounded-[18px] border border-slate-900/10 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#18181b]">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-5 md:px-6">
          <div>
            <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-slate-50">
              <Scale className="h-4 w-4 text-orange-500" />
              {title}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showOpenModuleButton && (
              <button
                type="button"
                onClick={() => router.push(`/parecer-juridico?precatorioId=${precatorioId}`)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-900/10 bg-white px-3 text-[13px] font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-300"
              >
                Abrir módulo
              </button>
            )}
            {hasCreatePermission && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-3 text-[13px] font-semibold text-white shadow-[0_6px_20px_-8px_rgba(249,115,22,0.70)] transition hover:from-orange-400 hover:to-amber-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Solicitar Parecer
              </button>
            )}
          </div>
        </div>

        {/* Mini contadores de status */}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-900/10 px-5 py-4 dark:border-white/10 sm:grid-cols-3 lg:grid-cols-5 md:px-6">
          <div className="rounded-[12px] border border-amber-500/25 bg-amber-500/10 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Pendente</p>
            <p className="mt-1 text-xl font-bold leading-none tabular-nums text-amber-700 dark:text-amber-300">{statusCounters.pendente}</p>
          </div>
          <div className="rounded-[12px] border border-blue-500/25 bg-blue-500/10 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">Em análise</p>
            <p className="mt-1 text-xl font-bold leading-none tabular-nums text-blue-600 dark:text-blue-300">{statusCounters.em_analise}</p>
          </div>
          <div className="rounded-[12px] border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Concluído</p>
            <p className="mt-1 text-xl font-bold leading-none tabular-nums text-emerald-700 dark:text-emerald-300">{statusCounters.concluido}</p>
          </div>
          <div className="rounded-[12px] border border-rose-500/25 bg-rose-500/10 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">Rejeitado</p>
            <p className="mt-1 text-xl font-bold leading-none tabular-nums text-rose-600 dark:text-rose-300">{statusCounters.rejeitado}</p>
          </div>
          <div className="rounded-[12px] border border-slate-200 bg-slate-500/5 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Arquivado</p>
            <p className="mt-1 text-xl font-bold leading-none tabular-nums text-slate-600 dark:text-slate-300">{statusCounters.arquivado}</p>
          </div>
        </div>
      </div>

      {/* Corpo */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-[18px] border border-slate-900/10 bg-white py-16 dark:border-white/10 dark:bg-[#18181b]">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500/20 border-t-orange-500" />
        </div>
      ) : opinions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[18px] border border-slate-900/10 bg-white py-16 dark:border-white/10 dark:bg-[#18181b]">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#f4f5f8] dark:bg-[#09090b]">
            <Scale className="h-6 w-6 text-slate-400" />
          </div>
          <p className="mt-4 text-[14px] font-semibold text-slate-900 dark:text-slate-50">Nenhum parecer registrado</p>
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Nenhum parecer jurídico vinculado a este precatório.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">

          {/* Lista de pareceres */}
          <div className="rounded-[18px] border border-slate-900/10 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#18181b]">
            <div className="border-b border-slate-900/10 px-4 py-3 dark:border-white/10">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Pareceres vinculados
              </p>
            </div>
            <div className="space-y-1.5 p-3">
              {opinions.map((opinion) => {
                const isSelected = selectedOpinionId === opinion.id
                return (
                  <button
                    key={opinion.id}
                    type="button"
                    onClick={() => setSelectedOpinionId(opinion.id)}
                    className={cn(
                      "w-full rounded-[12px] border px-3 py-2.5 text-left transition-all duration-150",
                      isSelected
                        ? "border-orange-300 bg-orange-500/8 shadow-[0_0_0_1px_rgba(249,115,22,0.15)] dark:border-orange-500/40 dark:bg-orange-500/10"
                        : "border-slate-900/8 bg-[#f4f5f8] hover:border-slate-300 hover:bg-slate-100/80 dark:border-white/8 dark:bg-[#09090b] dark:hover:border-white/15"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                        {getOpinionTitle(opinion)}
                      </p>
                      {isSelected && (
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {getOpinionSubtitle(opinion)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <TagPill className={getStatusTagClass(opinion.status)}>
                        <span className="mr-1 h-1 w-1 rounded-full bg-current" />
                        {LEGAL_OPINION_STATUS_LABELS[opinion.status]}
                      </TagPill>
                      {opinion.due_date && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                          <CalendarClock className="h-2.5 w-2.5" />
                          {formatDate(opinion.due_date)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detalhes do parecer selecionado */}
          <div className="rounded-[18px] border border-slate-900/10 bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#18181b]">
            {isDetailLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500/20 border-t-orange-500" />
              </div>
            ) : !selectedOpinion ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Scale className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-[13px] text-slate-400 dark:text-slate-500">
                  Selecione um parecer para visualizar os detalhes.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {/* Header do detalhe */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-900/10 px-5 py-4 dark:border-white/10 md:px-6">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                      {selectedOpinion.title}
                    </h3>
                    <p className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                      {LEGAL_OPINION_TYPE_LABELS[selectedOpinion.type]} &bull; Atualizado em{" "}
                      {formatDateTime(selectedOpinion.updated_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <TagPill className={getStatusTagClass(selectedOpinion.status)}>
                      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
                      {LEGAL_OPINION_STATUS_LABELS[selectedOpinion.status]}
                    </TagPill>
                    {selectedOpinion.due_date && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-500/10 px-2.5 py-1 text-[10.5px] font-bold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                        <CalendarClock className="h-3 w-3" />
                        {formatDate(selectedOpinion.due_date)}
                      </span>
                    )}
                    {hasEditPermission && (
                      <button
                        type="button"
                        onClick={openEditModal}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-900/10 bg-white px-3 text-[12px] font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-300"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 p-5 md:p-6">
                  {/* Alterar status */}
                  {hasEditPermission && (
                    <div className="space-y-1.5">
                      <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Alterar status
                      </Label>
                      <Select
                        value={selectedOpinionStatus}
                        onValueChange={(v) => void handleStatusUpdate(v)}
                        disabled={isUpdatingStatus}
                      >
                        <SelectTrigger className="w-full max-w-xs rounded-xl border-slate-900/10 bg-[#f4f5f8] dark:border-white/10 dark:bg-[#09090b]">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEGAL_OPINION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {LEGAL_OPINION_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Resumo + Conclusão */}
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-[12px] bg-[#f4f5f8] p-4 dark:bg-[#09090b]">
                      <SectionTitle>Resumo executivo</SectionTitle>
                      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                        {selectedOpinion.executive_summary || "Não informado."}
                      </p>
                    </div>
                    <div className="rounded-[12px] bg-[#f4f5f8] p-4 dark:bg-[#09090b]">
                      <SectionTitle>Conclusão / Recomendação</SectionTitle>
                      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                        {selectedOpinion.conclusion || selectedOpinion.recommendation || "Não informado."}
                      </p>
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="rounded-[12px] bg-[#f4f5f8] p-4 dark:bg-[#09090b]">
                    <SectionTitle icon={<ListChecks className="h-3.5 w-3.5 text-orange-500" />}>
                      Checklist analisado
                    </SectionTitle>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {checklistEntries.map((item) => (
                        <div key={item.key} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openChecklistModal(item)}
                            disabled={!hasEditPermission}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-[10px] border px-3 py-2 text-left text-[12px] transition-all",
                              hasEditPermission
                                ? "cursor-pointer"
                                : "cursor-default",
                              item.checked
                                ? "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : cn(
                                    "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-400",
                                    hasEditPermission && "hover:border-orange-300 hover:bg-orange-500/5"
                                  )
                            )}
                          >
                            {item.checked
                              ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              : <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            }
                            <div className="min-w-0">
                              <p className="font-medium">{item.label}</p>
                              {item.note && (
                                <p className="line-clamp-1 text-[10px] opacity-70">{item.note}</p>
                              )}
                            </div>
                          </button>
                          {item.isOther && hasEditPermission && (
                            <button
                              type="button"
                              onClick={() => void handleRenameOtherItem(item)}
                              className="inline-flex h-8 shrink-0 items-center rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-500 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-400"
                            >
                              Renomear
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Anexos */}
                  <div className="rounded-[12px] bg-[#f4f5f8] p-4 dark:bg-[#09090b]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <SectionTitle icon={<Paperclip className="h-3.5 w-3.5 text-orange-500" />}>
                        Anexos
                      </SectionTitle>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-500 disabled:opacity-50 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-300"
                      >
                        {isUploading
                          ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                          : <Upload className="h-3 w-3" />
                        }
                        Adicionar arquivo
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        void handleUploadFile(file)
                        e.currentTarget.value = ""
                      }}
                    />

                    {attachments.length === 0 ? (
                      <p className="mt-3 text-[12px] text-slate-400 dark:text-slate-500">Nenhum anexo registrado.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#18181b]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">
                                {attachment.file_name}
                              </p>
                              <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                                {attachment.mime_type} &bull; {formatBytes(attachment.size)} &bull; {formatDateTime(attachment.created_at)}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={isDownloadingId === attachment.id}
                              onClick={() => void handleDownload(attachment)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-500 disabled:opacity-50 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-300"
                            >
                              {isDownloadingId === attachment.id
                                ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                                : <Download className="h-3 w-3" />
                              }
                              Baixar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comentários */}
                  <div className="rounded-[12px] bg-[#f4f5f8] p-4 dark:bg-[#09090b]">
                    <SectionTitle icon={<MessageSquare className="h-3.5 w-3.5 text-orange-500" />}>
                      Comentários
                    </SectionTitle>
                    <div className="mt-3 space-y-2">
                      <Textarea
                        rows={3}
                        placeholder="Adicionar comentário..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="rounded-xl border-slate-200 bg-white text-[13px] dark:border-white/10 dark:bg-[#18181b]"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={isCommentLoading || !commentText.trim()}
                          onClick={() => void handleAddComment()}
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[13px] font-semibold text-white shadow-[0_4px_16px_-4px_rgba(249,115,22,0.60)] transition hover:bg-orange-400 disabled:opacity-50"
                        >
                          {isCommentLoading && (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          )}
                          Enviar comentário
                        </button>
                      </div>
                    </div>

                    {comments.length === 0 ? (
                      <p className="mt-3 text-[12px] text-slate-400 dark:text-slate-500">Nenhum comentário registrado.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="flex gap-3 rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-[#18181b]"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-bold text-white">
                              {getInitials(comment.author?.nome)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">
                                {comment.author?.nome || "Usuário"}
                              </p>
                              <p className="whitespace-pre-line text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
                                {comment.content}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                                {formatDateTime(comment.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Histórico */}
                  <div className="rounded-[12px] bg-[#f4f5f8] p-4 dark:bg-[#09090b]">
                    <SectionTitle>Histórico de alterações</SectionTitle>
                    {events.length === 0 ? (
                      <p className="mt-3 text-[12px] text-slate-400 dark:text-slate-500">Nenhum evento registrado.</p>
                    ) : (
                      <div className="mt-3 space-y-1.5">
                        {events.slice(0, 8).map((event) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-3 rounded-[10px] border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#18181b]"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                                {getEventLabel(event)}
                              </p>
                              <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                                {event.actor?.nome || "Sistema"} &bull; {formatDateTime(event.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <LegalOpinionFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mode={isEditMode ? "edit" : "create"}
        users={users}
        precatorios={precatorios}
        fixedPrecatorioId={precatorioId}
        initialValue={isEditMode ? selectedOpinion : null}
        submitting={isSubmittingForm}
        onSubmit={handleCreateOrUpdate}
      />

      {/* Modal do Checklist */}
      <Modal.Backdrop
        isOpen={isChecklistModalOpen}
        onOpenChange={setIsChecklistModalOpen}
        isDismissable={!isSavingChecklistOpinion}
        isKeyboardDismissDisabled={isSavingChecklistOpinion}
        className="bg-black/55 backdrop-blur-[3px] supports-[backdrop-filter]:bg-black/45"
      >
        <Modal.Container placement="center" size="lg" className="px-3 py-3 sm:px-6">
          <Modal.Dialog className="mx-auto w-full max-w-2xl overflow-hidden rounded-[20px] border border-slate-900/10 bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] outline-none dark:border-white/10 dark:bg-[#18181b]">
            <Modal.CloseTrigger
              className={[
                "absolute right-4 top-4 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-400",
                isSavingChecklistOpinion ? "pointer-events-none opacity-60" : "",
              ].join(" ")}
            />

            <Modal.Header className="border-b border-slate-900/10 px-5 pb-4 pt-5 dark:border-white/10 sm:px-6">
              <Modal.Heading className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                Parecer do checklist
              </Modal.Heading>
              <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                {activeChecklistItem ? `Item: ${activeChecklistItem.label}` : "Selecione um item"}
              </p>
            </Modal.Header>

            <Modal.Body className="px-5 py-4 sm:px-6">
              <div className="space-y-1.5">
                <Label className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  Parecer jurídico
                </Label>
                <Textarea
                  id="checklist-opinion"
                  rows={6}
                  placeholder="Descreva o parecer para este item..."
                  value={checklistOpinionText}
                  onChange={(e) => setChecklistOpinionText(e.target.value)}
                  className="rounded-xl border-slate-200 bg-[#f4f5f8] text-[13px] dark:border-white/10 dark:bg-[#09090b]"
                />
              </div>
            </Modal.Body>

            <Modal.Footer className="border-t border-slate-900/10 px-5 py-3 dark:border-white/10 sm:px-6">
              <div className="flex w-full justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(false)}
                  disabled={isSavingChecklistOpinion}
                  className="inline-flex h-9 items-center rounded-xl border border-slate-900/10 bg-white px-4 text-[13px] font-medium text-slate-500 transition hover:border-orange-300 hover:text-orange-500 disabled:opacity-50 dark:border-white/10 dark:bg-[#18181b] dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveChecklistOpinion()}
                  disabled={isSavingChecklistOpinion}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[13px] font-semibold text-white shadow-[0_4px_16px_-4px_rgba(249,115,22,0.60)] transition hover:bg-orange-400 disabled:opacity-50"
                >
                  {isSavingChecklistOpinion && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  Salvar e marcar como feito
                </button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  )
}
