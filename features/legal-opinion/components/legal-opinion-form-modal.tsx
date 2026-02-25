"use client"

import { useEffect, useMemo, useState } from "react"
import { Button, Chip, Modal } from "@heroui/react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LegalOpinion, LegalOpinionPriority, LegalOpinionStatus, LegalOpinionType } from "@/features/legal-opinion/types"
import {
  LEGAL_OPINION_PRIORITIES,
  LEGAL_OPINION_PRIORITY_LABELS,
  LEGAL_OPINION_STATUSES,
  LEGAL_OPINION_STATUS_LABELS,
  LEGAL_OPINION_TYPES,
  LEGAL_OPINION_TYPE_LABELS,
} from "@/features/legal-opinion/types"
import { FileText, Scale } from "@/components/icons"

export type LegalOpinionFormValue = {
  precatorioId: string
  title: string
  type: LegalOpinionType
  status: LegalOpinionStatus
  priority: LegalOpinionPriority
  dueDate?: string | null
  assignedTo?: string | null
  executiveSummary?: string | null
  analysis?: string | null
  recommendation?: string | null
  conclusion?: string | null
  checklist: Record<string, boolean>
}

export type LegalOpinionFormUserOption = {
  id: string
  nome: string
  email?: string | null
}

export type LegalOpinionFormPrecatorioOption = {
  id: string
  label: string
  subtitle?: string | null
}

type LegalOpinionFormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  users: LegalOpinionFormUserOption[]
  precatorios?: LegalOpinionFormPrecatorioOption[]
  fixedPrecatorioId?: string
  defaultTitle?: string
  initialValue?: Partial<LegalOpinion> | null
  submitting?: boolean
  onSubmit: (value: LegalOpinionFormValue) => Promise<void> | void
}

const CHECKLIST_KEYS = [
  { key: "titularidade", label: "Titularidade/Cessao" },
  { key: "calculos", label: "Calculos e indices" },
  { key: "prioridade", label: "Prioridade/preferencia" },
  { key: "penhoras", label: "Penhoras/bloqueios" },
  { key: "documentos", label: "Pendencias documentais" },
  { key: "compliance", label: "Compliance/antifraude" },
]

function buildInitialState(
  mode: "create" | "edit",
  fixedPrecatorioId?: string,
  initialValue?: Partial<LegalOpinion> | null,
  defaultTitle?: string
): LegalOpinionFormValue {
  const checklist = { ...(initialValue?.checklist || {}) }
  return {
    precatorioId: fixedPrecatorioId || initialValue?.precatorio_id || "",
    title: initialValue?.title || defaultTitle || "",
    type: (initialValue?.type as LegalOpinionType) || "risco_processual",
    status: (initialValue?.status as LegalOpinionStatus) || "pendente",
    priority: (initialValue?.priority as LegalOpinionPriority) || "media",
    dueDate: initialValue?.due_date || null,
    assignedTo: initialValue?.assigned_to || null,
    executiveSummary: initialValue?.executive_summary || "",
    analysis: initialValue?.analysis || "",
    recommendation: initialValue?.recommendation || "",
    conclusion: initialValue?.conclusion || "",
    checklist:
      mode === "edit"
        ? checklist
        : {
            titularidade: false,
            calculos: false,
            prioridade: false,
            penhoras: false,
            documentos: false,
            compliance: false,
          },
  }
}

export function LegalOpinionFormModal({
  open,
  onOpenChange,
  mode,
  users,
  precatorios = [],
  fixedPrecatorioId,
  defaultTitle,
  initialValue,
  submitting = false,
  onSubmit,
}: LegalOpinionFormModalProps) {
  const [form, setForm] = useState<LegalOpinionFormValue>(
    buildInitialState(mode, fixedPrecatorioId, initialValue, defaultTitle)
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(buildInitialState(mode, fixedPrecatorioId, initialValue, defaultTitle))
    setError(null)
  }, [open, mode, fixedPrecatorioId, initialValue, defaultTitle])

  const selectedPrecatorio = useMemo(
    () => precatorios.find((precatorio) => precatorio.id === form.precatorioId) || null,
    [form.precatorioId, precatorios]
  )

  async function handleSubmit() {
    setError(null)

    if (!form.precatorioId) {
      setError("Selecione o precatorio.")
      return
    }

    if (!form.title.trim()) {
      setError("Informe o titulo do parecer.")
      return
    }

    await onSubmit({
      ...form,
      title: form.title.trim(),
      executiveSummary: (form.executiveSummary || "").trim() || null,
      analysis: (form.analysis || "").trim() || null,
      recommendation: (form.recommendation || "").trim() || null,
      conclusion: (form.conclusion || "").trim() || null,
    })
  }

  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={onOpenChange}
      isDismissable={!submitting}
      isKeyboardDismissDisabled={submitting}
      className="bg-black/55 backdrop-blur-[3px] supports-[backdrop-filter]:bg-black/45"
    >
      <Modal.Container placement="center" size="full" className="px-3 py-3 sm:px-6">
        <Modal.Dialog className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-default-200/70 bg-content1 shadow-[0_36px_90px_-50px_hsl(var(--primary)/0.55)] outline-none">
          <Modal.CloseTrigger
            className={[
              "absolute right-4 top-4 z-20 rounded-full border border-default-200/70 bg-content1/95 hover:bg-content2",
              submitting ? "pointer-events-none opacity-60" : "",
            ].join(" ")}
          />

          <Modal.Header className="flex flex-col gap-3 border-b border-default-200/70 px-5 pb-4 pt-5 sm:px-7">
            <Modal.Icon className="size-10 rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-sm">
              <Scale className="size-5" />
            </Modal.Icon>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Chip size="sm" color="warning" variant="flat" className="border border-warning/35 font-semibold">
                  Parecer juridico
                </Chip>
                <Chip size="sm" color="default" variant="flat" className="border border-default-200/70 font-semibold">
                  {mode === "create" ? "Novo parecer" : "Edicao de parecer"}
                </Chip>
              </div>
              <Modal.Heading className="text-xl font-bold tracking-tight">
                {mode === "create" ? "Solicitar Parecer Juridico" : "Editar Parecer Juridico"}
              </Modal.Heading>
              <p className="text-sm text-foreground/70">
                Preencha os campos essenciais para registrar a analise juridica.
              </p>
            </div>
          </Modal.Header>

          <Modal.Body className="max-h-[70vh] overflow-y-auto px-4 py-5 sm:px-7">
            <div className="space-y-5">
              {fixedPrecatorioId ? (
                <div className="rounded-2xl border border-default-200/70 bg-default-100/45 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60">
                    Precatorio vinculado
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {selectedPrecatorio?.label || initialValue?.precatorio?.titulo || "Precatorio selecionado"}
                    </span>
                  </div>
                  {selectedPrecatorio?.subtitle ? (
                    <p className="mt-1 text-xs text-muted-foreground">{selectedPrecatorio.subtitle}</p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="legal-opinion-precatorio">Precatorio</Label>
                  <Select
                    value={form.precatorioId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, precatorioId: value }))}
                  >
                    <SelectTrigger id="legal-opinion-precatorio" className="w-full">
                      <SelectValue placeholder="Selecione o precatorio" />
                    </SelectTrigger>
                    <SelectContent>
                      {precatorios.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          Nenhum precatorio disponivel
                        </SelectItem>
                      ) : (
                        precatorios.map((precatorio) => (
                          <SelectItem key={precatorio.id} value={precatorio.id}>
                            {precatorio.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedPrecatorio?.subtitle ? (
                    <p className="text-xs text-muted-foreground">{selectedPrecatorio.subtitle}</p>
                  ) : null}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="legal-opinion-title">Titulo</Label>
                  <Input
                    id="legal-opinion-title"
                    placeholder="Ex.: Analise de risco processual"
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, type: value as LegalOpinionType }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEGAL_OPINION_TYPES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {LEGAL_OPINION_TYPE_LABELS[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, status: value as LegalOpinionStatus }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEGAL_OPINION_STATUSES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {LEGAL_OPINION_STATUS_LABELS[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, priority: value as LegalOpinionPriority }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEGAL_OPINION_PRIORITIES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {LEGAL_OPINION_PRIORITY_LABELS[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="legal-opinion-due-date">Prazo (opcional)</Label>
                  <Input
                    id="legal-opinion-due-date"
                    type="date"
                    value={form.dueDate || ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        dueDate: event.target.value || null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsavel</Label>
                  <Select
                    value={form.assignedTo || "__none__"}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, assignedTo: value === "__none__" ? null : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nao atribuido" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nao atribuido</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal-opinion-summary">Resumo executivo</Label>
                <Textarea
                  id="legal-opinion-summary"
                  rows={3}
                  value={form.executiveSummary || ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, executiveSummary: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal-opinion-analysis">Analise tecnica</Label>
                <Textarea
                  id="legal-opinion-analysis"
                  rows={6}
                  value={form.analysis || ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, analysis: event.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="legal-opinion-recommendation">Recomendacao</Label>
                  <Textarea
                    id="legal-opinion-recommendation"
                    rows={4}
                    value={form.recommendation || ""}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, recommendation: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal-opinion-conclusion">Conclusao</Label>
                  <Textarea
                    id="legal-opinion-conclusion"
                    rows={4}
                    value={form.conclusion || ""}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, conclusion: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-default-200/75 bg-default-100/45 p-4">
                <p className="text-sm font-semibold">Checklist de itens analisados</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {CHECKLIST_KEYS.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 rounded-xl border border-default-200/75 bg-content1/75 px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={Boolean(form.checklist[item.key])}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({
                            ...prev,
                            checklist: {
                              ...prev.checklist,
                              [item.key]: Boolean(checked),
                            },
                          }))
                        }
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              ) : null}
            </div>
          </Modal.Body>

          <Modal.Footer className="border-t border-default-200/70 px-4 py-3 sm:px-7">
            <div className="flex w-full justify-end gap-2">
              <Button variant="secondary" onPress={() => onOpenChange(false)} isDisabled={submitting}>
                Cancelar
              </Button>
              <Button color="primary" onPress={handleSubmit} isLoading={submitting}>
                {mode === "create" ? "Criar parecer" : "Salvar alteracoes"}
              </Button>
            </div>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
