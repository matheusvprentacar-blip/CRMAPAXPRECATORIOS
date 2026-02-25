"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Card, Chip, Spinner } from "@heroui/react"
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
  LEGAL_OPINION_STATUS_COLORS,
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
  return canEdit !== false
}

function getRoleCanCreate(canCreate?: boolean) {
  return canCreate !== false
}

async function forceDownloadByFileName(signedUrl: string, fileName: string) {
  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error("Nao foi possivel baixar o arquivo.")
  }

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

export function LegalOpinionPanel({
  precatorioId,
  initialOpinionId = null,
  title = "Parecer Juridico",
  subtitle = "Solicite, acompanhe e conclua pareceres juridicos vinculados a este precatorio.",
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

  useEffect(() => {
    if (!initialOpinionId) return
    setSelectedOpinionId(initialOpinionId)
  }, [initialOpinionId])

  const hasCreatePermission = getRoleCanCreate(canCreate)
  const hasEditPermission = getRoleCanEdit(canEdit)

  const selectedOpinionStatus = selectedOpinion?.status || "pendente"

  const statusCounters = useMemo(() => countOpinionsByStatus(opinions), [opinions])

  const checklistEntries = useMemo(() => {
    const data = selectedOpinion?.checklist || {}
    return [
      { key: "titularidade", label: "Titularidade/Cessao", checked: Boolean(data.titularidade) },
      { key: "calculos", label: "Calculos", checked: Boolean(data.calculos) },
      { key: "prioridade", label: "Prioridade", checked: Boolean(data.prioridade) },
      { key: "penhoras", label: "Penhoras/Bloqueios", checked: Boolean(data.penhoras) },
      { key: "documentos", label: "Documentos", checked: Boolean(data.documentos) },
      { key: "compliance", label: "Compliance", checked: Boolean(data.compliance) },
    ]
  }, [selectedOpinion?.checklist])

  async function loadOpinions(preferredOpinionId?: string | null) {
    setIsLoading(true)
    try {
      const [opinionsData, metadata] = await Promise.all([
        listLegalOpinionsByPrecatorio(precatorioId),
        getLegalOpinionMetadata({ precatorioLimit: 150 }),
      ])

      setOpinions(opinionsData)
      setUsers(
        metadata.users.map((user) => ({
          id: user.id,
          nome: user.nome,
          email: user.email,
        }))
      )
      setPrecatorios(
        metadata.precatorios.map((precatorio) => ({
          id: precatorio.id,
          label:
            precatorio.titulo ||
            precatorio.numero_precatorio ||
            precatorio.credor_nome ||
            "Precatorio sem identificacao",
          subtitle: [precatorio.numero_processo, precatorio.credor_nome].filter(Boolean).join(" • "),
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
      console.error("[LegalOpinionPanel] Falha ao carregar pareceres:", error)
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
      console.error("[LegalOpinionPanel] Falha ao carregar detalhe:", error)
      toast({
        title: "Erro ao carregar parecer",
        description: error instanceof Error ? error.message : "Falha inesperada.",
        variant: "destructive",
      })
    } finally {
      setIsDetailLoading(false)
    }
  }

  useEffect(() => {
    void loadOpinions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precatorioId])

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
        toast({
          title: "Parecer atualizado",
          description: `Parecer ${updated.title} atualizado com sucesso.`,
        })
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
        toast({
          title: "Parecer criado",
          description: `Parecer ${created.title} criado com sucesso.`,
        })
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
      toast({ title: "Comentario adicionado" })
    } catch (error) {
      toast({
        title: "Falha ao adicionar comentario",
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
      toast({
        title: "Tipo de arquivo nao permitido",
        description: "Use PDF, JPG, PNG ou DOCX.",
        variant: "destructive",
      })
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

  const openCreateModal = () => {
    setIsEditMode(false)
    setIsFormOpen(true)
  }

  const openEditModal = () => {
    if (!selectedOpinion) return
    setIsEditMode(true)
    setIsFormOpen(true)
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="border border-default-200/80 bg-content1 shadow-sm">
        <Card.Header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Card.Title className="flex items-center gap-2 text-lg font-semibold">
              <Scale className="h-5 w-5 text-primary" />
              {title}
            </Card.Title>
            <Card.Description>{subtitle}</Card.Description>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showOpenModuleButton ? (
              <Button
                variant="secondary"
                size="sm"
                onPress={() => {
                  router.push(`/parecer-juridico?precatorioId=${precatorioId}`)
                }}
              >
                Abrir modulo
              </Button>
            ) : null}
            {hasCreatePermission ? (
              <Button color="primary" size="sm" onPress={openCreateModal}>
                <Plus className="h-4 w-4" />
                Solicitar Parecer
              </Button>
            ) : null}
          </div>
        </Card.Header>
        <Card.Content className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {LEGAL_OPINION_STATUSES.map((status) => (
            <div
              key={status}
              className="rounded-xl border border-default-200/75 bg-default-100/45 px-3 py-2"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60">
                {LEGAL_OPINION_STATUS_LABELS[status]}
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">{statusCounters[status]}</p>
            </div>
          ))}
        </Card.Content>
      </Card>

      {isLoading ? (
        <Card className="border border-default-200/80 bg-content1">
          <Card.Content className="flex items-center justify-center py-10">
            <Spinner size="sm" />
          </Card.Content>
        </Card>
      ) : opinions.length === 0 ? (
        <Card className="border border-default-200/80 bg-content1">
          <Card.Content className="py-10 text-center text-muted-foreground">
            Nenhum parecer juridico registrado para este precatorio.
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="border border-default-200/80 bg-content1">
            <Card.Header>
              <Card.Title className="text-sm font-semibold">Pareceres vinculados</Card.Title>
            </Card.Header>
            <Card.Content className="space-y-2">
              {opinions.map((opinion) => (
                <button
                  key={opinion.id}
                  type="button"
                  onClick={() => setSelectedOpinionId(opinion.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left transition-colors",
                    selectedOpinionId === opinion.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-default-200/75 bg-default-100/40 hover:bg-default-100/70"
                  )}
                >
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">
                    {getOpinionTitle(opinion)}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{getOpinionSubtitle(opinion)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Chip size="sm" variant="flat" color={LEGAL_OPINION_STATUS_COLORS[opinion.status]}>
                      {LEGAL_OPINION_STATUS_LABELS[opinion.status]}
                    </Chip>
                    {opinion.due_date ? (
                      <Chip size="sm" variant="flat" color="default">
                        {formatDate(opinion.due_date)}
                      </Chip>
                    ) : null}
                  </div>
                </button>
              ))}
            </Card.Content>
          </Card>

          <Card className="border border-default-200/80 bg-content1">
            {isDetailLoading ? (
              <Card.Content className="flex items-center justify-center py-14">
                <Spinner size="sm" />
              </Card.Content>
            ) : !selectedOpinion ? (
              <Card.Content className="py-12 text-center text-muted-foreground">
                Selecione um parecer para visualizar os detalhes.
              </Card.Content>
            ) : (
              <>
                <Card.Header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Card.Title className="text-lg font-semibold">{selectedOpinion.title}</Card.Title>
                    <Card.Description>
                      {LEGAL_OPINION_TYPE_LABELS[selectedOpinion.type]} • Atualizado em{" "}
                      {formatDateTime(selectedOpinion.updated_at)}
                    </Card.Description>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip size="sm" variant="flat" color={LEGAL_OPINION_STATUS_COLORS[selectedOpinion.status]}>
                      {LEGAL_OPINION_STATUS_LABELS[selectedOpinion.status]}
                    </Chip>
                    {selectedOpinion.due_date ? (
                      <Chip size="sm" variant="flat" color="warning">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDate(selectedOpinion.due_date)}
                      </Chip>
                    ) : null}
                    {hasEditPermission ? (
                      <Button size="sm" variant="secondary" onPress={openEditModal}>
                        Editar
                      </Button>
                    ) : null}
                  </div>
                </Card.Header>

                <Card.Content className="space-y-5">
                  {hasEditPermission ? (
                    <div className="space-y-2">
                      <Label>Status do parecer</Label>
                      <Select
                        value={selectedOpinionStatus}
                        onValueChange={(value) => {
                          void handleStatusUpdate(value)
                        }}
                        disabled={isUpdatingStatus}
                      >
                        <SelectTrigger className="w-full max-w-xs">
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
                  ) : null}

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <section className="space-y-2 rounded-2xl border border-default-200/80 bg-default-100/35 p-4">
                      <p className="text-sm font-semibold">Resumo executivo</p>
                      <p className="whitespace-pre-line text-sm text-foreground/85">
                        {selectedOpinion.executive_summary || "Nao informado."}
                      </p>
                    </section>
                    <section className="space-y-2 rounded-2xl border border-default-200/80 bg-default-100/35 p-4">
                      <p className="text-sm font-semibold">Conclusao / recomendacao</p>
                      <p className="whitespace-pre-line text-sm text-foreground/85">
                        {selectedOpinion.conclusion || selectedOpinion.recommendation || "Nao informado."}
                      </p>
                    </section>
                  </div>

                  <section className="space-y-2 rounded-2xl border border-default-200/80 bg-default-100/35 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <ListChecks className="h-4 w-4 text-primary" />
                      Checklist analisado
                    </p>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {checklistEntries.map((item) => (
                        <div
                          key={item.key}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                            item.checked
                              ? "border-success/40 bg-success/10 text-success-foreground"
                              : "border-default-200/80 bg-content1 text-muted-foreground"
                          )}
                        >
                          {item.checked ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4" />}
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3 rounded-2xl border border-default-200/80 bg-default-100/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <Paperclip className="h-4 w-4 text-primary" />
                        Anexos
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={isUploading}
                        onPress={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Adicionar arquivo
                      </Button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        void handleUploadFile(file)
                        event.currentTarget.value = ""
                      }}
                    />

                    {attachments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum anexo registrado.</p>
                    ) : (
                      <div className="space-y-2">
                        {attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-default-200/80 bg-content1 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium">{attachment.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {attachment.mime_type} • {formatBytes(attachment.size)} • {formatDateTime(attachment.created_at)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              isLoading={isDownloadingId === attachment.id}
                              onPress={() => {
                                void handleDownload(attachment)
                              }}
                            >
                              <Download className="h-4 w-4" />
                              Baixar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3 rounded-2xl border border-default-200/80 bg-default-100/35 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Comentarios
                    </p>
                    <div className="space-y-2">
                      <Textarea
                        rows={3}
                        placeholder="Adicionar comentario..."
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          color="primary"
                          isLoading={isCommentLoading}
                          onPress={() => {
                            void handleAddComment()
                          }}
                        >
                          Enviar comentario
                        </Button>
                      </div>
                    </div>

                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum comentario registrado.</p>
                    ) : (
                      <div className="space-y-2">
                        {comments.map((comment) => (
                          <div key={comment.id} className="rounded-xl border border-default-200/80 bg-content1 px-3 py-2">
                            <p className="text-sm font-medium">{comment.author?.nome || "Usuario"}</p>
                            <p className="whitespace-pre-line text-sm text-foreground/85">{comment.content}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-2 rounded-2xl border border-default-200/80 bg-default-100/35 p-4">
                    <p className="text-sm font-semibold">Historico de alteracoes</p>
                    {events.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                    ) : (
                      <div className="space-y-2">
                        {events.slice(0, 8).map((event) => (
                          <div key={event.id} className="rounded-xl border border-default-200/80 bg-content1 px-3 py-2">
                            <p className="text-sm font-medium">{getEventLabel(event)}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.actor?.nome || "Sistema"} • {formatDateTime(event.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </Card.Content>
              </>
            )}
          </Card>
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
    </div>
  )
}
