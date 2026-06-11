"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabase } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import type { CertidaoStatus, CertidaoTipo, PrecatorioCertidao, Precatorio } from "@/lib/types/database"
import { ClipboardList, FileText, ShieldCheck, Gavel, ExternalLink, Save, Loader2 } from "@/components/icons"

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ")

const clayInput =
  "h-11 w-full rounded-[14px] border border-black/[0.06] bg-[#f2f3f7] px-4 text-sm text-[#0b0c10] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"

const clayDate =
  "h-[36px] w-full rounded-[12px] border border-black/[0.06] bg-[#f2f3f7] px-3 text-[12.5px] text-[#0b0c10] focus:outline-none focus:ring-2 focus:ring-[#0e4d6a]/30"

const clayLabel = "mb-1.5 block text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#9ca3af]"
const microLabel = "mb-1 block text-[9px] font-bold uppercase tracking-[1px] text-[#9ca3af]"

const CERTIDAO_OPTIONS: { value: CertidaoStatus; label: string }[] = [
  { value: "negativa", label: "Negativa" },
  { value: "positiva", label: "Positiva" },
  { value: "nao_concluido", label: "Não concluído" },
  { value: "nao_solicitado", label: "Não solicitado" },
  { value: "na", label: "N/A" },
]

const CERTIDAO_TRIGGER_CLASS: Record<string, string> = {
  negativa: "border-[#9fe1cb] !bg-[#e7f6ef] text-[#0f6e56]",
  positiva: "border-[#f0999b] !bg-[#fdecec] text-[#a32d2d]",
  nao_concluido: "border-[#fac775] !bg-[#fdf2e0] text-[#854f0b]",
  nao_solicitado: "border-[#e8eaef] !bg-[#f2f3f7] text-[#6b7280]",
  na: "border-[#e8eaef] !bg-[#f2f3f7] text-[#6b7280]",
  __empty: "border-[#e8eaef] !bg-[#f2f3f7] text-[#9ca3af]",
}

const CERTIDAO_TIPOS: { tipo: CertidaoTipo; label: string }[] = [
  { tipo: "central", label: "Certidão da central" },
  { tipo: "estadual", label: "Certidão estadual" },
  { tipo: "municipal", label: "Certidão municipal" },
  { tipo: "federal", label: "Certidão federal" },
  { tipo: "distribuidor", label: "Distribuidor (civil e criminal)" },
  { tipo: "debitos_trabalhistas", label: "Débitos trabalhistas" },
  { tipo: "acoes_trabalhistas", label: "Ações trabalhistas" },
]

type TriState = "sim" | "nao" | "indefinido"

function boolToTri(v: boolean | null | undefined): TriState {
  if (v === true) return "sim"
  if (v === false) return "nao"
  return "indefinido"
}

function triToBool(v: TriState): boolean | null {
  if (v === "sim") return true
  if (v === "nao") return false
  return null
}

type Responsavel = { id: string; nome: string }

type CertidaoForm = { resultado: CertidaoStatus | undefined; solicitada_em: string; validade: string }

const emptyCertidao = (): CertidaoForm => ({ resultado: undefined, solicitada_em: "", validade: "" })

function buildCertidoes(rows: PrecatorioCertidao[] | null | undefined): Record<CertidaoTipo, CertidaoForm> {
  const base = {} as Record<CertidaoTipo, CertidaoForm>
  for (const t of CERTIDAO_TIPOS) base[t.tipo] = emptyCertidao()
  for (const r of rows || []) {
    const tipo = r.tipo as CertidaoTipo
    if (base[tipo]) {
      base[tipo] = {
        resultado: r.resultado ?? undefined,
        solicitada_em: (r.solicitada_em || "").slice(0, 10),
        validade: (r.validade || "").slice(0, 10),
      }
    }
  }
  return base
}

interface ModalPreenchimentoRapidoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  precatorio: Precatorio | null
  onSuccess?: () => void
}

type FormState = {
  dono_usuario_id: string
  numero_processo: string
  numero_processo_originario: string
  credor_nome: string
  devedor: string
  valor_principal: number | undefined
  credor_cpf_cnpj: string
  credor_data_nascimento: string
  credor_cidade: string
  honorarios_percentual: string
  previsao_pagamento: string
  possui_oficio_requisitorio: TriState
  analise_penhora: TriState
  possui_preferencial: TriState
  possui_adiantamento: TriState
  observacoes: string
}

function buildForm(p: Precatorio | null): FormState {
  return {
    dono_usuario_id: p?.dono_usuario_id || p?.responsavel || "",
    numero_processo: p?.numero_processo || "",
    numero_processo_originario: p?.numero_processo_originario || "",
    credor_nome: p?.credor_nome || "",
    devedor: p?.devedor || "",
    valor_principal: p && Number(p.valor_principal) > 0 ? Number(p.valor_principal) : undefined,
    credor_cpf_cnpj: p?.credor_cpf_cnpj || "",
    credor_data_nascimento: (p?.credor_data_nascimento || "").slice(0, 10),
    credor_cidade: p?.credor_cidade || "",
    honorarios_percentual:
      p && Number(p.honorarios_percentual) > 0 ? String(p.honorarios_percentual) : "",
    previsao_pagamento: (p?.previsao_pagamento || "").slice(0, 10),
    possui_oficio_requisitorio: boolToTri(p?.possui_oficio_requisitorio),
    analise_penhora: boolToTri(p?.analise_penhora),
    possui_preferencial: boolToTri(p?.possui_preferencial),
    possui_adiantamento: boolToTri(p?.possui_adiantamento),
    observacoes: p?.observacoes || "",
  }
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof FileText
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-black/[0.07] bg-white">
      <div className="flex items-center gap-[11px] border-b border-[#e8eaef] px-4 py-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[11px] border border-black/[0.07] bg-[#f2f3f7]">
          <Icon className="h-[17px] w-[17px] text-[#374151]" />
        </div>
        <span className="text-[13.5px] font-bold tracking-[-0.2px] text-[#0b0c10]">{title}</span>
        {subtitle ? <span className="text-[12px] font-medium text-[#9ca3af]">· {subtitle}</span> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function CertidaoField({
  label,
  value,
  onChange,
}: {
  label: string
  value: CertidaoForm
  onChange: (patch: Partial<CertidaoForm>) => void
}) {
  return (
    <div className="rounded-[14px] border border-black/[0.06] bg-white p-3">
      <div className="mb-2 text-[12px] font-semibold text-[#0b0c10]">{label}</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <span className={microLabel}>Resultado</span>
          <Select value={value.resultado} onValueChange={(v) => onChange({ resultado: v as CertidaoStatus })}>
            <SelectTrigger
              aria-label={`${label} — resultado`}
              className={cx(
                "h-[36px] rounded-[12px] text-[12.5px] font-medium",
                CERTIDAO_TRIGGER_CLASS[value.resultado ?? "__empty"]
              )}
            >
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent>
              {CERTIDAO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className={microLabel}>Solicitada em</span>
          <input
            type="date"
            aria-label={`${label} — data de solicitação`}
            className={clayDate}
            value={value.solicitada_em}
            onChange={(e) => onChange({ solicitada_em: e.target.value })}
          />
        </div>
        <div>
          <span className={microLabel}>Validade</span>
          <input
            type="date"
            aria-label={`${label} — validade`}
            className={clayDate}
            value={value.validade}
            onChange={(e) => onChange({ validade: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}

function TriField({
  label,
  value,
  onChange,
}: {
  label: string
  value: TriState
  onChange: (v: TriState) => void
}) {
  return (
    <div>
      <span className={clayLabel}>{label}</span>
      <Select value={value} onValueChange={(v) => onChange(v as TriState)}>
        <SelectTrigger
          aria-label={label}
          className={cx(
            "h-[38px] rounded-[14px] border-[#e8eaef] !bg-[#f2f3f7] text-[13px] font-medium",
            value === "sim" && "text-[#0f6e56]",
            value === "nao" && "text-[#a32d2d]",
            value === "indefinido" && "text-[#9ca3af]"
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="indefinido">Não informado</SelectItem>
          <SelectItem value="sim">Sim</SelectItem>
          <SelectItem value="nao">Não</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export function ModalPreenchimentoRapido({
  open,
  onOpenChange,
  precatorio,
  onSuccess,
}: ModalPreenchimentoRapidoProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => buildForm(precatorio))
  const [certidoes, setCertidoes] = useState<Record<CertidaoTipo, CertidaoForm>>(() => buildCertidoes(null))
  const [saving, setSaving] = useState(false)
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([])
  const responsaveisLoaded = useRef(false)

  // Recarrega o formulario sempre que o modal abre para outro precatorio.
  useEffect(() => {
    if (open) setForm(buildForm(precatorio))
  }, [open, precatorio?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega as certidoes do precatorio (tabela dedicada) ao abrir.
  useEffect(() => {
    if (!open) return
    setCertidoes(buildCertidoes(null))
    if (!precatorio?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const supabase: any = getSupabase()
        if (!supabase) return
        const { data, error } = await supabase
          .from("precatorio_certidoes")
          .select("tipo, resultado, solicitada_em, validade")
          .eq("precatorio_id", precatorio.id)
        if (error) throw error
        if (!cancelled) setCertidoes(buildCertidoes(data as PrecatorioCertidao[]))
      } catch (err) {
        console.error("Erro ao carregar certidões:", err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, precatorio?.id])

  // Carrega a lista de responsaveis ativos uma unica vez.
  useEffect(() => {
    if (!open || responsaveisLoaded.current) return
    responsaveisLoaded.current = true
    ;(async () => {
      try {
        const supabase = getSupabase()
        if (!supabase) return
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nome, ativo")
          .eq("ativo", true)
          .order("nome", { ascending: true })
        if (error) throw error
        setResponsaveis((data || []).map((u: any) => ({ id: u.id, nome: u.nome || "Sem nome" })))
      } catch (err) {
        console.error("Erro ao carregar responsaveis:", err)
      }
    })()
  }, [open])

  const headline = useMemo(
    () => precatorio?.credor_nome || precatorio?.titulo || "Precatório",
    [precatorio]
  )

  // Garante que o operador atual sempre tenha um item no select (evita flash do
  // placeholder enquanto a lista carrega e cobre operadores inativos/legados).
  const operadorOptions = useMemo(() => {
    const list = [...responsaveis]
    if (form.dono_usuario_id && !list.some((r) => r.id === form.dono_usuario_id)) {
      list.unshift({ id: form.dono_usuario_id, nome: precatorio?.responsavel_nome || "Operador atual" })
    }
    return list
  }, [responsaveis, form.dono_usuario_id, precatorio?.responsavel_nome])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const setCertidao = (tipo: CertidaoTipo, patch: Partial<CertidaoForm>) =>
    setCertidoes((prev) => ({ ...prev, [tipo]: { ...prev[tipo], ...patch } }))

  async function handleSave() {
    if (!precatorio) return
    setSaving(true)
    try {
      const supabase: any = getSupabase()
      if (!supabase) throw new Error("Supabase indisponível")

      const honorarios = parseFloat(form.honorarios_percentual.replace(",", "."))

      const payload: any = {
        dono_usuario_id: form.dono_usuario_id || null,
        responsavel: form.dono_usuario_id || null,
        numero_processo: form.numero_processo.trim() || null,
        numero_processo_originario: form.numero_processo_originario.trim() || null,
        credor_nome: form.credor_nome.trim() || null,
        devedor: form.devedor.trim() || null,
        valor_principal: form.valor_principal ?? 0,
        credor_cpf_cnpj: form.credor_cpf_cnpj.trim() || null,
        credor_data_nascimento: form.credor_data_nascimento || null,
        credor_cidade: form.credor_cidade.trim() || null,
        honorarios_percentual: Number.isFinite(honorarios) ? honorarios : 0,
        previsao_pagamento: form.previsao_pagamento || null,
        possui_oficio_requisitorio: triToBool(form.possui_oficio_requisitorio),
        analise_penhora: triToBool(form.analise_penhora),
        possui_preferencial: triToBool(form.possui_preferencial),
        possui_adiantamento: triToBool(form.possui_adiantamento),
        observacoes: form.observacoes.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("precatorios").update(payload).eq("id", precatorio.id)
      if (error) throw error

      // Certidoes: upsert das que tiverem algum dado preenchido.
      const certRows = CERTIDAO_TIPOS
        .map((t) => ({ tipo: t.tipo, c: certidoes[t.tipo] }))
        .filter(({ c }) => c.resultado || c.solicitada_em || c.validade)
        .map(({ tipo, c }) => ({
          precatorio_id: precatorio.id,
          tipo,
          resultado: c.resultado ?? null,
          solicitada_em: c.solicitada_em || null,
          validade: c.validade || null,
          updated_at: new Date().toISOString(),
        }))

      if (certRows.length > 0) {
        const { error: certErr } = await supabase
          .from("precatorio_certidoes")
          .upsert(certRows, { onConflict: "precatorio_id,tipo" })
        if (certErr) throw certErr
      }

      toast({ title: "Dados salvos", description: "O precatório foi atualizado com sucesso." })
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Erro ao salvar preenchimento rápido:", error)
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Verifique os dados e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  function abrirDetalhes() {
    if (!precatorio) return
    onOpenChange(false)
    router.push(`/precatorios/detalhes?id=${precatorio.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(96vw,44rem)] max-w-[min(96vw,44rem)] flex-col gap-0 overflow-hidden border border-black/[0.07] bg-white p-0">
        <DialogHeader className="shrink-0 border-b border-[#e8eaef] px-5 py-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#f2f3f7]">
              <ClipboardList className="h-5 w-5 text-[#0e4d6a]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-bold text-[#0b0c10]">{headline}</span>
                <span className="hidden shrink-0 rounded-full border border-[#0e4d6a]/15 bg-[#0e4d6a]/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0e4d6a] sm:inline">
                  Preenchimento rápido
                </span>
              </div>
              <div className="truncate text-[11.5px] font-medium text-[#9ca3af]">
                {precatorio?.numero_processo || "Sem número de processo"}
                {precatorio?.tribunal ? ` · ${precatorio.tribunal}` : ""}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preenchimento rápido dos dados principais do precatório.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-3.5 overflow-y-auto px-5 py-4">
          {/* Seção 1 — Dados gerais */}
          <SectionCard icon={FileText} title="Dados gerais">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className={clayLabel}>Operador (responsável)</span>
                <Select
                  value={form.dono_usuario_id || undefined}
                  onValueChange={(v) => set("dono_usuario_id", v)}
                >
                  <SelectTrigger
                    aria-label="Operador (responsável)"
                    className="h-11 rounded-[14px] border-black/[0.06] !bg-[#f2f3f7] text-sm text-[#0b0c10]"
                  >
                    <SelectValue placeholder="Selecionar responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {operadorOptions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className={clayLabel}>Nº do processo</span>
                <input
                  className={clayInput}
                  value={form.numero_processo}
                  onChange={(e) => set("numero_processo", e.target.value)}
                />
              </div>
              <div>
                <span className={clayLabel}>Nº processo originário</span>
                <input
                  className={clayInput}
                  value={form.numero_processo_originario}
                  onChange={(e) => set("numero_processo_originario", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <span className={clayLabel}>Nome do cliente</span>
                <input
                  className={clayInput}
                  value={form.credor_nome}
                  onChange={(e) => set("credor_nome", e.target.value)}
                />
              </div>
              <div>
                <span className={clayLabel}>Ente devedor</span>
                <input
                  className={clayInput}
                  value={form.devedor}
                  onChange={(e) => set("devedor", e.target.value)}
                />
              </div>
              <div>
                <span className={clayLabel}>Valor do processo</span>
                <CurrencyInput
                  value={form.valor_principal}
                  onValueChange={(v) => set("valor_principal", v)}
                  placeholder="R$ 0,00"
                  className={clayInput}
                />
              </div>
              <div>
                <span className={clayLabel}>CPF / CNPJ</span>
                <input
                  className={clayInput}
                  value={form.credor_cpf_cnpj}
                  onChange={(e) => set("credor_cpf_cnpj", e.target.value)}
                />
              </div>
              <div>
                <span className={clayLabel}>Data de nascimento</span>
                <input
                  type="date"
                  className={clayInput}
                  value={form.credor_data_nascimento}
                  onChange={(e) => set("credor_data_nascimento", e.target.value)}
                />
              </div>
              <div>
                <span className={clayLabel}>Cidade que reside</span>
                <input
                  className={clayInput}
                  value={form.credor_cidade}
                  onChange={(e) => set("credor_cidade", e.target.value)}
                />
              </div>
              <div>
                <span className={clayLabel}>% de honorários</span>
                <input
                  className={clayInput}
                  value={form.honorarios_percentual}
                  onChange={(e) => set("honorarios_percentual", e.target.value)}
                  placeholder="Ex: 30"
                  inputMode="decimal"
                />
              </div>
            </div>
          </SectionCard>

          {/* Seção 2 — Horizontal (certidões) */}
          <SectionCard icon={ShieldCheck} title="Horizontal" subtitle="Certidões">
            <div className="mb-3">
              <span className={clayLabel}>Previsão de pagamento</span>
              <input
                type="date"
                className={clayInput}
                value={form.previsao_pagamento}
                onChange={(e) => set("previsao_pagamento", e.target.value)}
              />
            </div>
            <div className="space-y-2.5">
              {CERTIDAO_TIPOS.map((t) => (
                <CertidaoField
                  key={t.tipo}
                  label={t.label}
                  value={certidoes[t.tipo]}
                  onChange={(patch) => setCertidao(t.tipo, patch)}
                />
              ))}
            </div>
          </SectionCard>

          {/* Seção 3 — Vertical */}
          <SectionCard icon={Gavel} title="Vertical" subtitle="Requisitório e gravames">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <TriField
                label="Possui ofício requisitório"
                value={form.possui_oficio_requisitorio}
                onChange={(v) => set("possui_oficio_requisitorio", v)}
              />
              <TriField
                label="Possui penhora"
                value={form.analise_penhora}
                onChange={(v) => set("analise_penhora", v)}
              />
              <TriField
                label="Possui preferencial"
                value={form.possui_preferencial}
                onChange={(v) => set("possui_preferencial", v)}
              />
              <TriField
                label="Possui adiantamentos"
                value={form.possui_adiantamento}
                onChange={(v) => set("possui_adiantamento", v)}
              />
            </div>
            <div className="mt-3">
              <span className={clayLabel}>Observações</span>
              <Textarea
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                placeholder="Nenhuma observação."
                className="min-h-[80px] resize-none rounded-[14px] border-black/[0.06] bg-[#f2f3f7] text-[13.5px] text-[#0b0c10]"
              />
            </div>
          </SectionCard>
        </div>

        <DialogFooter className="shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t border-[#e8eaef] bg-[#fafbfc] px-5 py-3.5">
          <button
            type="button"
            onClick={abrirDetalhes}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0e4d6a] transition-opacity hover:opacity-80"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir detalhes completos
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !precatorio}
              className="border-none bg-[#0e4d6a] text-white hover:bg-[#0c425c]"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ModalPreenchimentoRapido
