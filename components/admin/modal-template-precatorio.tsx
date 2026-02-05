"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type TemplateItem = Record<string, any>

interface ModalTemplatePrecatorioProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  createdById?: string | null
}

const DEFAULT_TEMPLATE = `[
  {
    "titulo": "Precatorio Exemplo",
    "credor_nome": "Nome do Credor",
    "numero_precatorio": "0000000-00.0000.0.00.0000",
    "numero_processo": "0000000-00.0000.0.00.0000",
    "tribunal": "TJSP",
    "valor_principal": 1000000,
    "file_url": "https://.../oficio.pdf"
  }
]`

type OperatorInfo = {
  id: string
  nome: string
  role: string[]
}

type TemplateItemInfo = {
  key: string
  data: TemplateItem
  value: number
  label: string
}

const ALLOWED_COLUMNS = new Set([
  "titulo",
  "numero_precatorio",
  "numero_processo",
  "numero_oficio",
  "tribunal",
  "devedor",
  "esfera_devedor",
  "credor_nome",
  "credor_cpf_cnpj",
  "credor_telefone",
  "credor_email",
  "credor_endereco",
  "credor_cidade",
  "credor_uf",
  "credor_cep",
  "advogado_nome",
  "advogado_cpf_cnpj",
  "advogado_oab",
  "advogado_telefone",
  "natureza",
  "valor_principal",
  "valor_atualizado",
  "valor_juros",
  "valor_selic",
  "saldo_liquido",
  "pss_percentual",
  "pss_valor",
  "irpf_valor",
  "honorarios_percentual",
  "honorarios_valor",
  "adiantamento_percentual",
  "adiantamento_valor",
  "proposta_menor_percentual",
  "proposta_maior_percentual",
  "proposta_menor_valor",
  "proposta_maior_valor",
  "data_base",
  "data_expedicao",
  "data_calculo",
  "file_url",
  "pdf_url",
  "status",
  "status_kanban",
  "localizacao_kanban",
  "prioridade",
  "observacoes",
  "raw_text",
  "dono_usuario_id",
  "responsavel_calculo_id",
  "responsavel",
  "criado_por",
])

const NUMERIC_FIELDS = new Set([
  "valor_principal",
  "valor_atualizado",
  "valor_juros",
  "valor_selic",
  "saldo_liquido",
  "pss_percentual",
  "pss_valor",
  "irpf_valor",
  "honorarios_percentual",
  "honorarios_valor",
  "adiantamento_percentual",
  "adiantamento_valor",
  "proposta_menor_percentual",
  "proposta_maior_percentual",
  "proposta_menor_valor",
  "proposta_maior_valor",
])

function normalizeTemplate(raw: string): TemplateItem[] {
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) return parsed
  if (parsed?.precatorios && Array.isArray(parsed.precatorios)) return parsed.precatorios
  if (parsed?.items && Array.isArray(parsed.items)) return parsed.items
  if (parsed && typeof parsed === "object") return [parsed]
  throw new Error("Template invalido. Envie um array ou um objeto JSON.")
}

function coerceNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "number") return value
  if (typeof value !== "string") return undefined
  const cleaned = value
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}

function buildTitulo(item: TemplateItem, index: number) {
  const numero = item.numero_precatorio || item.numero || ""
  const credor = item.credor_nome || item.credor || ""
  if (item.titulo && String(item.titulo).trim()) return String(item.titulo)
  if (numero && credor) return `Precatorio ${numero} - ${credor}`
  if (numero) return `Precatorio ${numero}`
  if (credor) return `Precatorio - ${credor}`
  return `Precatorio sem dados #${index + 1}`
}

function getTemplateValue(item: TemplateItem): number {
  const valorAtualizado = coerceNumber(item.valor_atualizado) ?? 0
  const valorPrincipal = coerceNumber(item.valor_principal) ?? 0
  return valorAtualizado > 0 ? valorAtualizado : valorPrincipal
}

function buildTemplateLabel(item: TemplateItem, index: number) {
  return (
    item.titulo ||
    item.numero_precatorio ||
    item.credor_nome ||
    `Precatorio #${index + 1}`
  )
}

function shuffleArray<T>(items: T[]) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildDistribution(
  items: TemplateItemInfo[],
  operatorIds: string[],
  outlierMultiplier: number,
  outlierAssignments: Record<string, string | undefined>
) {
  if (operatorIds.length === 0) {
    return {
      assignments: {} as Record<string, string[]>,
      sums: {} as Record<string, number>,
      outliers: items,
      eligible: [] as TemplateItemInfo[],
      total: 0,
      target: 0,
    }
  }

  const total = items.reduce((acc, item) => acc + (item.value || 0), 0)
  const target = operatorIds.length > 0 ? total / operatorIds.length : 0
  const limit = target > 0 ? target * Math.max(outlierMultiplier, 1) : Number.POSITIVE_INFINITY

  const outliers = items.filter((item) => item.value > limit)
  const outlierKeys = new Set(outliers.map((item) => item.key))
  const eligible = items.filter((item) => !outlierKeys.has(item.key))

  const sorted = shuffleArray(eligible).sort((a, b) => {
    const diff = (b.value || 0) - (a.value || 0)
    if (Math.abs(diff) < 0.01) return Math.random() - 0.5
    return diff
  })

  const sums: Record<string, number> = {}
  const assignments: Record<string, string[]> = {}
  operatorIds.forEach((id) => {
    sums[id] = 0
    assignments[id] = []
  })

  sorted.forEach((item) => {
    const minSum = Math.min(...operatorIds.map((id) => sums[id]))
    const candidates = operatorIds.filter((id) => Math.abs(sums[id] - minSum) < 0.01)
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    assignments[pick].push(item.key)
    sums[pick] += item.value || 0
  })

  outliers.forEach((item) => {
    const assigned = outlierAssignments[item.key]
    if (assigned && assignments[assigned]) {
      assignments[assigned].push(item.key)
      sums[assigned] += item.value || 0
    }
  })

  const pendingOutliers = outliers.filter((item) => !outlierAssignments[item.key])

  return {
    assignments,
    sums,
    outliers: pendingOutliers,
    eligible,
    total,
    target,
  }
}

function sanitizePayload(item: TemplateItem, index: number, createdById?: string | null) {
  const payload: Record<string, any> = {}
  Object.keys(item || {}).forEach((key) => {
    if (!ALLOWED_COLUMNS.has(key)) return
    if (NUMERIC_FIELDS.has(key)) {
      const coerced = coerceNumber(item[key])
      if (coerced !== undefined) payload[key] = coerced
      return
    }
    if (item[key] !== undefined) payload[key] = item[key]
  })

  if (!payload.tribunal && item?.vara_origem) {
    payload.tribunal = item.vara_origem
  }

  if (!payload.file_url && item?.pdf_url) {
    payload.file_url = item.pdf_url
  }

  payload.titulo = buildTitulo({ ...item, titulo: payload.titulo }, index)
  payload.criado_por = payload.criado_por || createdById || null
  payload.status = payload.status || "novo"
  payload.status_kanban = payload.status_kanban || "entrada"

  return payload
}

export function ModalTemplatePrecatorio({ open, onOpenChange, onSuccess, createdById }: ModalTemplatePrecatorioProps) {
  const [rawJson, setRawJson] = useState(DEFAULT_TEMPLATE)
  const [parseError, setParseError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastResult, setLastResult] = useState<{ ok: number; fail: number; errors: string[] } | null>(null)
  const [step, setStep] = useState<"edit" | "distribute">("edit")
  const [operators, setOperators] = useState<OperatorInfo[]>([])
  const [operatorsInitialized, setOperatorsInitialized] = useState(false)
  const [selectedOperatorIds, setSelectedOperatorIds] = useState<string[]>([])
  const [approvedOperators, setApprovedOperators] = useState<Record<string, boolean>>({})
  const [outlierMultiplier, setOutlierMultiplier] = useState(1.6)
  const [outlierAssignments, setOutlierAssignments] = useState<Record<string, string | undefined>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => {
    try {
      return { items: normalizeTemplate(rawJson), error: null as string | null }
    } catch (error: any) {
      return { items: [] as TemplateItem[], error: error?.message || "Template invalido" }
    }
  }, [rawJson])

  const parsedItems = parsed.items

  useEffect(() => {
    setParseError(parsed.error)
  }, [parsed.error])

  useEffect(() => {
    if (selectedOperatorIds.length === 0) {
      setApprovedOperators({})
      setOutlierAssignments({})
      return
    }
    setApprovedOperators((prev) => {
      const next: Record<string, boolean> = {}
      selectedOperatorIds.forEach((id) => {
        if (prev[id]) next[id] = prev[id]
      })
      return next
    })
    setOutlierAssignments((prev) => {
      const next: Record<string, string | undefined> = {}
      Object.entries(prev).forEach(([key, value]) => {
        if (value && selectedOperatorIds.includes(value)) {
          next[key] = value
        }
      })
      return next
    })
  }, [selectedOperatorIds])

  const templateItems: TemplateItemInfo[] = useMemo(
    () =>
      parsedItems.map((item, index) => ({
        key: `item-${index}`,
        data: item,
        value: getTemplateValue(item),
        label: buildTemplateLabel(item, index),
      })),
    [parsedItems]
  )

  const distributionPreview = useMemo(
    () => buildDistribution(templateItems, selectedOperatorIds, outlierMultiplier, outlierAssignments),
    [templateItems, selectedOperatorIds, outlierMultiplier, outlierAssignments]
  )

  const allOperatorsApproved = selectedOperatorIds.every((id) => approvedOperators[id])
  const pendingOutliers = distributionPreview.outliers || []
  const canConfirm =
    selectedOperatorIds.length > 0 &&
    templateItems.length > 0 &&
    pendingOutliers.length === 0 &&
    allOperatorsApproved

  useEffect(() => {
    if (!open) {
      setLastResult(null)
      setStep("edit")
      setOutlierAssignments({})
      setApprovedOperators({})
      setOperatorsInitialized(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (operatorsInitialized) return
    const loadOperators = async () => {
      const supabase = createBrowserClient()
      if (!supabase) return
      const { data } = await supabase.from("usuarios").select("id, nome, role").eq("ativo", true)
      const list = (data || []).filter((u) => Array.isArray(u.role) && u.role.includes("operador_comercial"))
      setOperators(list)
      if (selectedOperatorIds.length === 0 && list.length > 0) {
        setSelectedOperatorIds(list.map((op) => op.id))
      }
      setOperatorsInitialized(true)
    }
    loadOperators()
  }, [open, operatorsInitialized, selectedOperatorIds.length])

  const handleFileLoad = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result || "")
      setRawJson(content.trim() || DEFAULT_TEMPLATE)
    }
    reader.readAsText(file)
  }

  const handleSave = async () => {
    if (parseError) return
    if (templateItems.length === 0) {
      toast.error("Nenhum item para importar")
      return
    }
    if (!canConfirm) {
      toast.error("Finalize a distribuicao antes de importar")
      return
    }

    setSaving(true)
    setLastResult(null)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase nao disponivel")

      let userId = createdById
      if (!userId) {
        const { data } = await supabase.auth.getUser()
        userId = data.user?.id || null
      }

      const assignmentMap = new Map<string, string>()
      Object.entries(distributionPreview.assignments).forEach(([operatorId, keys]) => {
        keys.forEach((key) => assignmentMap.set(key, operatorId))
      })

      const payloads = templateItems.map((item, idx) => {
        const operatorId = assignmentMap.get(item.key)
        const payload = sanitizePayload(item.data, idx, userId)
        payload.dono_usuario_id = operatorId
        payload.responsavel = operatorId
        return payload
      })

      let ok = 0
      let fail = 0
      const errors: string[] = []

      for (let i = 0; i < payloads.length; i += 1) {
        const payload = payloads[i]
        if (!payload.dono_usuario_id) {
          fail += 1
          errors.push(`Item ${i + 1}: sem operador definido`)
          continue
        }
        const { error } = await supabase.from("precatorios").insert(payload)
        if (error) {
          fail += 1
          errors.push(`Item ${i + 1}: ${error.message}`)
        } else {
          ok += 1
        }
      }

      setLastResult({ ok, fail, errors })

      if (ok > 0) {
        toast.success(`${ok} precatorios criados${fail ? ` (${fail} falharam)` : ""}`)
        onSuccess?.()
      }

      if (fail === 0) {
        onOpenChange(false)
      }
    } catch (error: any) {
      toast.error(error?.message || "Erro ao importar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar por Template (JSON)</DialogTitle>
          <DialogDescription>
            Primeiro carregue o JSON, depois distribua para operadores antes de importar.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex-1 min-h-0 overflow-y-auto pr-1">
          {step === "edit" ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setRawJson(DEFAULT_TEMPLATE)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exemplo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileLoad(file)
                  }}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Carregar JSON
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Template JSON</Label>
                <Textarea
                  value={rawJson}
                  onChange={(e) => setRawJson(e.target.value)}
                  rows={12}
                  className="font-mono text-xs"
                />
                {parseError ? (
                  <p className="text-xs text-destructive">{parseError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {templateItems.length} item(ns) pronto(s) para distribuir.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs space-y-2">
                <p className="font-medium">Resumo rapido</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Itens: {templateItems.length}</Badge>
                  <Badge variant="outline">Campos faltantes sao aceitos</Badge>
                </div>
              </div>

              {lastResult && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs space-y-2">
                  <p className="font-medium">Resultado</p>
                  <p>
                    {lastResult.ok} criados, {lastResult.fail} falharam.
                  </p>
                  {lastResult.errors.length > 0 && (
                    <ul className="list-disc pl-4 space-y-1">
                      {lastResult.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Itens</p>
                    <p className="font-semibold">{templateItems.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor total</p>
                    <p className="font-semibold">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        templateItems.reduce((acc, item) => acc + (item.value || 0), 0)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Alvo por operador</p>
                    <p className="font-semibold">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        distributionPreview.target
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Operadores (comercial)</Label>
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-border/60 p-3 space-y-2">
                    {operators.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhum operador comercial cadastrado.</p>
                    )}
                    {operators.map((op) => (
                      <label key={op.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedOperatorIds.includes(op.id)}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setSelectedOperatorIds((prev) => {
                              if (checked) return Array.from(new Set([...prev, op.id]))
                              return prev.filter((id) => id !== op.id)
                            })
                            setApprovedOperators((prev) => {
                              const next = { ...prev }
                              if (!checked) delete next[op.id]
                              return next
                            })
                          }}
                        />
                        <span>{op.nome}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione quem recebera a distribuicao. Sem operadores nao e possivel importar.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Limite de disparidade (x do alvo)</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      value={outlierMultiplier}
                      onChange={(e) => setOutlierMultiplier(Number(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Distribuicao por operador</Label>
                    <div className="space-y-2">
                      {selectedOperatorIds.map((id) => {
                        const op = operators.find((o) => o.id === id)
                        const count = distributionPreview.assignments[id]?.length || 0
                        const sum = distributionPreview.sums[id] || 0
                        const approved = approvedOperators[id]
                        return (
                          <div key={id} className="rounded-md border border-border/60 bg-background/60 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">{op?.nome || "Operador"}</p>
                                <p className="text-sm font-medium">{count} credito(s)</p>
                              </div>
                              <p className="text-sm font-semibold">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sum)}
                              </p>
                            </div>
                            <label className="mt-2 flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={approved || false}
                                onChange={(e) =>
                                  setApprovedOperators((prev) => ({
                                    ...prev,
                                    [id]: e.target.checked,
                                  }))
                                }
                              />
                              Aprovar distribuicao para este operador
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {pendingOutliers.length > 0 && (
                <div className="rounded-lg border border-amber-300/40 bg-amber-50/40 p-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-medium">Creditos destoantes precisam de atribuicao manual</p>
                  <div className="mt-2 space-y-2 text-xs">
                    {pendingOutliers.map((item) => (
                      <div key={item.key} className="flex flex-col gap-2 rounded-md border border-amber-400/30 bg-background/50 p-2">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{item.label}</span>
                          <span>
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.value || 0)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={outlierAssignments[item.key] || ""}
                            onChange={(e) =>
                              setOutlierAssignments((prev) => ({
                                ...prev,
                                [item.key]: e.target.value || undefined,
                              }))
                            }
                            className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                          >
                            <option value="">Selecionar operador</option>
                            {selectedOperatorIds.map((id) => {
                              const op = operators.find((o) => o.id === id)
                              return (
                                <option key={id} value={id}>
                                  {op?.nome || "Operador"}
                                </option>
                              )
                            })}
                          </select>
                          <span className="text-xs text-muted-foreground">Obrigatorio para importar.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          {step === "edit" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={() => setStep("distribute")}
                disabled={saving || !!parseError || templateItems.length === 0}
              >
                Continuar para distribuicao
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("edit")} disabled={saving}>
                Voltar
              </Button>
              <Button onClick={handleSave} disabled={saving || !canConfirm}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Importar distribuidos
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
