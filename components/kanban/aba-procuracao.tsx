"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { percentualParaExtenso } from "@/lib/utils/numero-extenso"
import { gerarHtmlProcuracao, abrirDocumentoEmNovaAba } from "@/lib/templates/documentos-html"
import {
  FileSignature,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  ChevronRight,
  Sparkles,
  Wand2,
  User,
  MapPin,
  Scale,
  Banknote,
  BadgeCheck,
  Save,
  ScrollText,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AbaProcuracaoProps {
  precatorioId: string
  canEdit: boolean
  onUpdate: () => void
  initialStatus?: string | null
  initialObservacoes?: string | null
  precatorio?: Record<string, unknown>
}

const STEPS = [
  { id: "nao_iniciado", label: "Não iniciado", short: "Aguardando" },
  { id: "em_andamento", label: "Em andamento", short: "Em curso" },
  { id: "pendente_assinatura", label: "Pend. assinatura", short: "Assinatura" },
  { id: "concluido", label: "Concluído", short: "Concluído" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v === null || v === undefined) return ""
  return String(v)
}

function formatarDataBR(iso: string): string {
  if (!iso) return ""
  try {
    const d = new Date(iso + (iso.includes("T") ? "" : "T00:00:00"))
    return d.toLocaleDateString("pt-BR")
  } catch {
    return iso
  }
}

function asObject(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {}
  return v as Record<string, unknown>
}

function limparTexto(v: string): string | null {
  const normalized = v.trim()
  return normalized ? normalized : null
}

function parseNumero(v: string): number | null {
  const normalized = v.trim()
  if (!normalized) return null

  let prepared = normalized.replace(/\s+/g, "")

  if (prepared.includes(",") && prepared.includes(".")) {
    prepared = prepared.replace(/\./g, "").replace(",", ".")
  } else if (prepared.includes(",")) {
    prepared = prepared.replace(",", ".")
  }

  const parsed = Number(prepared)
  return Number.isFinite(parsed) ? parsed : null
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusStepper({
  current,
  onChange,
  disabled,
}: {
  current: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === current)

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        const clickable = !disabled

        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <button
              onClick={() => clickable && onChange(step.id)}
              disabled={disabled}
              className={[
                "group flex flex-col items-center gap-1.5 flex-1 px-2 py-2.5 rounded-xl transition-all duration-300 min-w-0",
                disabled ? "cursor-default" : "cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-950/20",
                active
                  ? "bg-gradient-to-b from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 ring-1 ring-violet-200 dark:ring-violet-800"
                  : "",
              ].join(" ")}
            >
              <div
                className={[
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 border-2",
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900"
                    : active
                      ? "bg-gradient-to-br from-violet-400 to-purple-500 border-violet-400 text-white shadow-md shadow-violet-200 dark:shadow-violet-900 scale-110"
                      : "bg-background border-border text-muted-foreground",
                ].join(" ")}
              >
                {done ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : active ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-[10px]">{i + 1}</span>
                )}
              </div>
              <span
                className={[
                  "text-[10px] font-semibold text-center leading-tight truncate w-full px-1 transition-colors",
                  done
                    ? "text-emerald-600 dark:text-emerald-400"
                    : active
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground",
                ].join(" ")}
              >
                {step.short}
              </span>
            </button>

            {i < STEPS.length - 1 && (
              <div
                className={[
                  "h-[2px] w-5 flex-shrink-0 rounded-full transition-colors duration-500 mx-0.5",
                  done ? "bg-emerald-400" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function AutoBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-500 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded px-1 py-0.5 ml-1.5">
      <Sparkles className="w-2 h-2" /> auto
    </span>
  )
}

interface FieldRowProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  auto?: boolean
  type?: string
  required?: boolean
  colSpan?: boolean
  as?: "input" | "select"
  options?: { value: string; label: string }[]
}

function FieldRow({
  label,
  value,
  onChange,
  placeholder,
  auto,
  type = "text",
  required,
  colSpan,
  as = "input",
  options,
}: FieldRowProps) {
  const baseInput = [
    "w-full rounded-lg border px-3 py-2 text-sm transition-all duration-200 outline-none",
    "focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400",
    auto
      ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-foreground"
      : "bg-background border-input hover:border-violet-300 dark:hover:border-violet-700",
    !value && required ? "border-violet-300 dark:border-violet-700" : "",
  ].join(" ")

  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="flex items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
        {auto && <AutoBadge />}
        {required && !auto && <span className="text-violet-400 ml-1">*</span>}
      </label>
      {as === "select" && options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
        >
          <option value="">Selecione...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseInput}
        />
      )}
    </div>
  )
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}

function Section({ icon, title, subtitle, children }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/60">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-500 border border-violet-100 dark:border-violet-900">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-none">{title}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function AbaProcuracao({
  precatorioId,
  canEdit,
  onUpdate,
  initialStatus,
  initialObservacoes,
  precatorio,
}: AbaProcuracaoProps) {
  const p = precatorio ?? {}
  const detalhes = asObject(p.detalhes)
  const detalhesProcuracao = asObject(detalhes.procuracao)
  const getDetalheProcuracao = (chave: string) => str(detalhesProcuracao[chave] ?? detalhes[chave])

  // — Status & observações —
  const [statusProcuracao, setStatusProcuracao] = useState(initialStatus || "nao_iniciado")
  const [observacoes, setObservacoes] = useState(initialObservacoes || "")
  const [saving, setSaving] = useState(false)

  // Cedente
  const [credorNome, setCredorNome] = useState(str(p.credor_nome))
  const [credorCpf, setCredorCpf] = useState(str(p.credor_cpf_cnpj))
  const [credorRg, setCredorRg] = useState(getDetalheProcuracao("credor_rg"))
  const [credorNacionalidade, setCredorNacionalidade] = useState(
    getDetalheProcuracao("credor_nacionalidade") || "brasileiro(a)"
  )
  const [credorProfissao, setCredorProfissao] = useState(str(p.credor_profissao))
  const [credorEstadoCivil, setCredorEstadoCivil] = useState(str(p.credor_estado_civil))
  const [credorDataNascimento, setCredorDataNascimento] = useState(
    str(p.credor_data_nascimento).slice(0, 10)
  )

  // Endereço
  const [credorEndereco, setCredorEndereco] = useState(str(p.credor_endereco))
  const [credorNumero, setCredorNumero] = useState(getDetalheProcuracao("credor_numero"))
  const [credorBairro, setCredorBairro] = useState(getDetalheProcuracao("credor_bairro"))
  const [credorCidade, setCredorCidade] = useState(str(p.credor_cidade))
  const [credorUf, setCredorUf] = useState(str(p.credor_uf))
  const [credorCep, setCredorCep] = useState(str(p.credor_cep))

  // Precatório
  const [numeroPrecatorio, setNumeroPrecatorio] = useState(str(p.numero_precatorio))
  const [numeroProcesso, setNumeroProcesso] = useState(str(p.numero_processo))
  const [numeroOficio, setNumeroOficio] = useState(str(p.numero_oficio))
  const [varaOrigem, setVaraOrigem] = useState(str(p.vara_origem ?? p.tribunal))
  const [devedor, setDevedor] = useState(str(p.devedor))

  // Proposta
  const [propostaMenorPercentual, setPropostaMenorPercentual] = useState(
    str(p.proposta_menor_percentual)
  )

  const [gerando, setGerando] = useState(false)
  const [savingDados, setSavingDados] = useState(false)

  useEffect(() => {
    setStatusProcuracao(initialStatus || "nao_iniciado")
    setObservacoes(initialObservacoes || "")
  }, [initialStatus, initialObservacoes])

  useEffect(() => {
    const pAtual = precatorio ?? {}
    const detalhesAtuais = asObject(pAtual.detalhes)
    const detalhesProcuracaoAtuais = asObject(detalhesAtuais.procuracao)
    const getDetalhe = (chave: string) => str(detalhesProcuracaoAtuais[chave] ?? detalhesAtuais[chave])

    setCredorNome(str(pAtual.credor_nome))
    setCredorCpf(str(pAtual.credor_cpf_cnpj))
    setCredorRg(getDetalhe("credor_rg"))
    setCredorNacionalidade(getDetalhe("credor_nacionalidade") || "brasileiro(a)")
    setCredorProfissao(str(pAtual.credor_profissao))
    setCredorEstadoCivil(str(pAtual.credor_estado_civil))
    setCredorDataNascimento(str(pAtual.credor_data_nascimento).slice(0, 10))
    setCredorEndereco(str(pAtual.credor_endereco))
    setCredorNumero(getDetalhe("credor_numero"))
    setCredorBairro(getDetalhe("credor_bairro"))
    setCredorCidade(str(pAtual.credor_cidade))
    setCredorUf(str(pAtual.credor_uf))
    setCredorCep(str(pAtual.credor_cep))
    setNumeroPrecatorio(str(pAtual.numero_precatorio))
    setNumeroProcesso(str(pAtual.numero_processo))
    setNumeroOficio(str(pAtual.numero_oficio))
    setVaraOrigem(str(pAtual.vara_origem ?? pAtual.tribunal))
    setDevedor(str(pAtual.devedor))
    setPropostaMenorPercentual(str(pAtual.proposta_menor_percentual))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precatorio])

  const salvarDados = useCallback(async (options?: { silent?: boolean }) => {
    if (!canEdit) return true

    const silent = options?.silent ?? false
    setSavingDados(true)

    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível.")

      const detalhesAtuais = asObject(p.detalhes)
      const detalhesProcuracaoAtuais = asObject(detalhesAtuais.procuracao)

      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      const detalhesPatch = {
        ...detalhesProcuracaoAtuais,
        credor_rg: limparTexto(credorRg),
        credor_nacionalidade: limparTexto(credorNacionalidade),
        credor_numero: limparTexto(credorNumero),
        credor_bairro: limparTexto(credorBairro),
      }

      payload.detalhes = {
        ...detalhesAtuais,
        procuracao: Object.fromEntries(
          Object.entries(detalhesPatch).filter(([, value]) => value !== null)
        ),
      }

      const setTexto = (campo: string, valor: string) => {
        const normalized = limparTexto(valor)
        if (normalized !== null) payload[campo] = normalized
      }

      const setNumero = (campo: string, valor: string) => {
        const normalized = parseNumero(valor)
        if (normalized !== null) payload[campo] = normalized
      }

      setTexto("credor_nome", credorNome)
      setTexto("credor_cpf_cnpj", credorCpf)
      setTexto("credor_profissao", credorProfissao)
      setTexto("credor_estado_civil", credorEstadoCivil)
      setTexto("credor_data_nascimento", credorDataNascimento)
      setTexto("credor_endereco", credorEndereco)
      setTexto("credor_cidade", credorCidade)
      setTexto("credor_uf", credorUf.toUpperCase())
      setTexto("credor_cep", credorCep)
      setTexto("numero_precatorio", numeroPrecatorio)
      setTexto("numero_processo", numeroProcesso)
      setTexto("numero_oficio", numeroOficio)
      setTexto("tribunal", varaOrigem)
      setTexto("devedor", devedor)
      setNumero("proposta_menor_percentual", propostaMenorPercentual)

      const { error } = await supabase
        .from("precatorios")
        .update(payload)
        .eq("id", precatorioId)

      if (error) throw error

      if (!silent) {
        toast({
          title: "Dados da procuração salvos",
          description: "Campos preenchidos foram atualizados no CRM.",
        })
        onUpdate()
      }

      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar os dados da procuração."
      if (!silent) {
        toast({ title: "Erro ao salvar dados", description: msg, variant: "destructive" })
      }
      return false
    } finally {
      setSavingDados(false)
    }
  }, [
    canEdit, p.detalhes,
    credorRg, credorNacionalidade, credorNumero, credorBairro,
    credorNome, credorCpf, credorProfissao, credorEstadoCivil, credorDataNascimento,
    credorEndereco, credorCidade, credorUf, credorCep,
    numeroPrecatorio, numeroProcesso, numeroOficio, varaOrigem, devedor,
    propostaMenorPercentual, precatorioId, onUpdate,
  ])

  async function handleSaveStatus() {
    if (!canEdit) return
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) return
      const { error } = await supabase
        .from("precatorios")
        .update({
          status_procuracao: statusProcuracao,
          observacoes_procuracao: observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)
      if (error) throw error
      toast({ title: "Procuração atualizada", description: "Status salvo com sucesso." })
      onUpdate()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar."
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleGerarProcuracao = useCallback(async () => {
    setGerando(true)
    try {
      if (canEdit) {
        const salvou = await salvarDados({ silent: true })
        if (!salvou) {
          throw new Error("Não foi possível salvar os dados antes da geração do documento.")
        }
      }

      const percentualNum = parseNumero(propostaMenorPercentual) ?? 0
      const percentualExtenso = percentualParaExtenso(percentualNum)

      const variaveis: Record<string, string> = {
        credor_nome: credorNome,
        credor_cpf_cnpj: credorCpf,
        credor_rg: credorRg,
        credor_nacionalidade: credorNacionalidade,
        credor_estado_civil: credorEstadoCivil,
        credor_profissao: credorProfissao,
        credor_data_nascimento: credorDataNascimento ? formatarDataBR(credorDataNascimento) : "",
        credor_endereco: credorEndereco,
        credor_numero: credorNumero,
        credor_bairro: credorBairro,
        credor_cidade: credorCidade,
        credor_uf: credorUf,
        credor_cep: credorCep,
        numero_precatorio: numeroPrecatorio,
        numero_processo: numeroProcesso,
        numero_oficio: numeroOficio,
        vara_origem: varaOrigem,
        devedor: devedor,
        proposta_menor_percentual: propostaMenorPercentual,
        proposta_menor_percentual_extenso: percentualExtenso,
      }

      abrirDocumentoEmNovaAba(gerarHtmlProcuracao(variaveis))

      toast({
        title: "Procuração gerada!",
        description: "O documento abriu em nova aba. Use Ctrl+P para salvar como PDF.",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível gerar a procuração."
      toast({ title: "Erro ao gerar", description: msg, variant: "destructive" })
    } finally {
      setGerando(false)
    }
  }, [
    canEdit, salvarDados,
    credorNome, credorCpf, credorRg, credorNacionalidade, credorEstadoCivil,
    credorProfissao, credorDataNascimento, credorEndereco, credorNumero, credorBairro,
    credorCidade, credorUf, credorCep,
    numeroPrecatorio, numeroProcesso, numeroOficio, varaOrigem, devedor,
    propostaMenorPercentual,
  ])

  const camposObrigatorios = [credorNome, credorCpf, credorRg, numeroPrecatorio, devedor]
  const pronto = camposObrigatorios.every((c) => c.trim() !== "")

  const currentStepLabel = STEPS.find((s) => s.id === statusProcuracao)?.label ?? statusProcuracao

  const estadoCivilOpts = [
    { value: "solteiro(a)", label: "Solteiro(a)" },
    { value: "casado(a)", label: "Casado(a)" },
    { value: "divorciado(a)", label: "Divorciado(a)" },
    { value: "viúvo(a)", label: "Viúvo(a)" },
    { value: "separado(a)", label: "Separado(a)" },
    { value: "união estável", label: "União estável" },
  ]

  const ufOpts = [
    "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
    "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
  ].map((uf) => ({ value: uf, label: uf }))

  return (
    <div className="space-y-5">
      {/* ── Controle de Status ───────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-sm">
              <ScrollText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">Controle de Procuração</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Status atual: {currentStepLabel}</p>
            </div>
          </div>
          <div
            className={[
              "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border",
              statusProcuracao === "concluido"
                ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800"
                : statusProcuracao === "pendente_assinatura"
                  ? "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800"
                  : statusProcuracao === "em_andamento"
                    ? "text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-800"
                    : "text-muted-foreground bg-muted border-border",
            ].join(" ")}
          >
            {statusProcuracao === "concluido" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : statusProcuracao === "em_andamento" ? (
              <Clock className="w-3 h-3" />
            ) : statusProcuracao === "pendente_assinatura" ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <Circle className="w-3 h-3" />
            )}
            {currentStepLabel}
          </div>
        </div>

        <div className="px-4 pb-3">
          <StatusStepper
            current={statusProcuracao}
            onChange={setStatusProcuracao}
            disabled={!canEdit || saving}
          />
        </div>

        <div className="px-4 pb-4 space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Observações
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            disabled={!canEdit || saving}
            placeholder="Registre detalhes de assinatura, pendências e validações da procuração..."
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-none transition-all outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 disabled:opacity-60 placeholder:text-muted-foreground/60"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveStatus}
              disabled={!canEdit || saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold shadow-sm shadow-violet-200 dark:shadow-violet-950 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar status
            </button>
          </div>
        </div>
      </div>

      {/* ── Gerador de Procuração ──────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="relative overflow-hidden px-4 py-4 border-b border-border bg-gradient-to-r from-slate-950 via-violet-950 to-slate-950">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, #8b5cf6 0, #8b5cf6 1px, transparent 0, transparent 50%)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-lg shadow-violet-900/40">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-wide">Procuração de Cessão de Crédito</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  Geração automática com dados do CRM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-400 bg-violet-950/40 border border-violet-800/60 rounded-full px-2.5 py-1">
              <Wand2 className="w-3 h-3" />
              Template DOCX
            </div>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
            <BadgeCheck className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-violet-700 dark:text-violet-400 leading-relaxed">
              Campos marcados com <span className="font-bold">AUTO</span> são preenchidos automaticamente
              com dados do CRM. Revise e complete os campos obrigatórios antes de gerar.
            </p>
          </div>

          <Section
            icon={<User className="w-3.5 h-3.5" />}
            title="Dados do Cedente (Credor)"
            subtitle="Informações pessoais do titular do precatório"
          >
            <FieldRow label="Nome completo" value={credorNome} onChange={setCredorNome} auto={!!p.credor_nome} required />
            <FieldRow label="CPF / CNPJ" value={credorCpf} onChange={setCredorCpf} auto={!!p.credor_cpf_cnpj} required />
            <FieldRow label="RG" value={credorRg} onChange={setCredorRg} placeholder="Ex: 5.195.508-0" required />
            <FieldRow label="Nacionalidade" value={credorNacionalidade} onChange={setCredorNacionalidade} placeholder="brasileiro(a)" />
            <FieldRow
              label="Estado civil"
              value={credorEstadoCivil}
              onChange={setCredorEstadoCivil}
              as="select"
              options={estadoCivilOpts}
              auto={!!p.credor_estado_civil}
            />
            <FieldRow label="Profissão" value={credorProfissao} onChange={setCredorProfissao} placeholder="Ex: Servidor público" auto={!!p.credor_profissao} />
            <FieldRow label="Data de nascimento" value={credorDataNascimento} onChange={setCredorDataNascimento} type="date" auto={!!p.credor_data_nascimento} />
          </Section>

          <Section
            icon={<MapPin className="w-3.5 h-3.5" />}
            title="Endereço do Cedente"
            subtitle="Domicílio legal do credor"
          >
            <FieldRow label="Endereço (logradouro)" value={credorEndereco} onChange={setCredorEndereco} auto={!!p.credor_endereco} placeholder="Rua, Av..." />
            <FieldRow label="Número" value={credorNumero} onChange={setCredorNumero} placeholder="Ex: 443" />
            <FieldRow label="Bairro" value={credorBairro} onChange={setCredorBairro} placeholder="Ex: Jardim São Pedro" />
            <FieldRow label="CEP" value={credorCep} onChange={setCredorCep} auto={!!p.credor_cep} placeholder="Ex: 86800-000" />
            <FieldRow label="Cidade" value={credorCidade} onChange={setCredorCidade} auto={!!p.credor_cidade} />
            <FieldRow
              label="UF"
              value={credorUf}
              onChange={setCredorUf}
              as="select"
              options={ufOpts}
              auto={!!p.credor_uf}
            />
          </Section>

          <Section
            icon={<Scale className="w-3.5 h-3.5" />}
            title="Dados do Precatório"
            subtitle="Informações do crédito judicial"
          >
            <FieldRow label="Número do precatório" value={numeroPrecatorio} onChange={setNumeroPrecatorio} auto={!!p.numero_precatorio} required />
            <FieldRow label="Número do processo" value={numeroProcesso} onChange={setNumeroProcesso} auto={!!p.numero_processo} />
            <FieldRow label="Número do ofício" value={numeroOficio} onChange={setNumeroOficio} auto={!!p.numero_oficio} />
            <FieldRow label="Vara de origem / Tribunal" value={varaOrigem} onChange={setVaraOrigem} auto={!!(p.vara_origem ?? p.tribunal)} placeholder="Ex: 3ª Vara da Fazenda Pública" />
            <FieldRow label="Devedor" value={devedor} onChange={setDevedor} auto={!!p.devedor} required colSpan />
          </Section>

          <Section
            icon={<Banknote className="w-3.5 h-3.5" />}
            title="Proposta"
            subtitle="Percentual da cessão (gerado por extenso automaticamente)"
          >
            <FieldRow
              label="% proposta cedente"
              value={propostaMenorPercentual}
              onChange={setPropostaMenorPercentual}
              type="number"
              auto={!!p.proposta_menor_percentual}
              placeholder="Ex: 45.50"
              colSpan
            />
            {propostaMenorPercentual && (
              <div className="col-span-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500 mb-0.5">Extenso gerado</p>
                <p className="text-sm text-foreground">
                  {percentualParaExtenso(parseNumero(propostaMenorPercentual) ?? 0)}
                </p>
              </div>
            )}
          </Section>

          {/* — Botão Gerar — */}
          <div className="pt-2">
            {canEdit && (
              <button
                onClick={() => void salvarDados()}
                disabled={savingDados || gerando}
                className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-800 dark:bg-violet-950/25 dark:text-violet-300 dark:hover:bg-violet-950/40"
              >
                {savingDados ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar dados da procuração no CRM
              </button>
            )}
            {!pronto && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                <AlertCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <p className="text-xs text-violet-700 dark:text-violet-400">
                  Preencha todos os campos obrigatórios (<span className="font-bold">*</span>) antes de gerar.
                </p>
              </div>
            )}
            <button
              onClick={handleGerarProcuracao}
              disabled={gerando || !pronto || savingDados}
              className={[
                "group w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-300 relative overflow-hidden",
                pronto && !gerando
                  ? "bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 hover:from-violet-600 hover:via-purple-600 hover:to-violet-600 text-white shadow-lg shadow-slate-900/30 dark:shadow-slate-950/60 hover:shadow-violet-500/30 hover:scale-[1.01] active:scale-[0.99]"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-60",
              ].join(" ")}
            >
              {pronto && !gerando && (
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s infinite",
                  }}
                />
              )}
              {gerando ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  Gerando procuração...
                </>
              ) : (
                <>
                  <Download className="w-4.5 h-4.5 transition-transform group-hover:translate-y-0.5" />
                  Gerar e Visualizar Procuração
                  <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
