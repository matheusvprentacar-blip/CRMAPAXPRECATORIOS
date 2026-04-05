"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { valorParaExtenso } from "@/lib/utils/numero-extenso"
import { gerarHtmlEscritura, abrirDocumentoEmNovaAba } from "@/lib/templates/documentos-html"
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
  Building2,
  User,
  MapPin,
  Scale,
  Banknote,
  CalendarDays,
  BadgeCheck,
  Save,
  ScrollText,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AbaEscriturasProps {
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

function formatarMoeda(v: unknown): string {
  const n = Number(v)
  if (!n) return ""
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function nomeMes(n: number): string {
  return [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ][n - 1] ?? ""
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
                disabled ? "cursor-default" : "cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/20",
                active
                  ? "bg-gradient-to-b from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 ring-1 ring-orange-200 dark:ring-orange-800"
                  : "",
              ].join(" ")}
            >
              <div
                className={[
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 border-2",
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900"
                    : active
                      ? "bg-gradient-to-br from-orange-400 to-amber-500 border-orange-400 text-white shadow-md shadow-orange-200 dark:shadow-orange-900 scale-110"
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
                      ? "text-orange-600 dark:text-orange-400"
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

// Rótulo de campo auto-preenchido
function AutoBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-500 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded px-1 py-0.5 ml-1.5">
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
    "focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400",
    auto
      ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-foreground"
      : "bg-background border-input hover:border-orange-300 dark:hover:border-orange-700",
    !value && required ? "border-orange-300 dark:border-orange-700" : "",
  ].join(" ")

  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="flex items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
        {auto && <AutoBadge />}
        {required && !auto && <span className="text-orange-400 ml-1">*</span>}
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
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-500 border border-orange-100 dark:border-orange-900">
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

export function AbaEscrituras({
  precatorioId,
  canEdit,
  onUpdate,
  initialStatus,
  initialObservacoes,
  precatorio,
}: AbaEscriturasProps) {
  const p = precatorio ?? {}
  const detalhes = asObject(p.detalhes)
  const detalhesEscritura = asObject(detalhes.escritura)
  const getDetalheEscritura = (chave: string) => str(detalhesEscritura[chave] ?? detalhes[chave])

  // — Status & observações —
  const [statusEscrituras, setStatusEscrituras] = useState(initialStatus || "nao_iniciado")
  const [observacoes, setObservacoes] = useState(initialObservacoes || "")
  const [saving, setSaving] = useState(false)

  // — Campos do contrato —
  const hoje = new Date()
  const [dataCessao, setDataCessao] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`
  )
  const [cidadeCartorio, setCidadeCartorio] = useState(getDetalheEscritura("cidade_cartorio"))
  const [ufCartorio, setUfCartorio] = useState(getDetalheEscritura("uf_cartorio"))

  // Cedente
  const [credorNome, setCredorNome] = useState(str(p.credor_nome))
  const [credorCpf, setCredorCpf] = useState(str(p.credor_cpf_cnpj))
  const [credorRg, setCredorRg] = useState(getDetalheEscritura("credor_rg"))
  const [credorNacionalidade, setCredorNacionalidade] = useState(
    getDetalheEscritura("credor_nacionalidade") || "brasileiro(a)"
  )
  const [credorProfissao, setCredorProfissao] = useState(str(p.credor_profissao))
  const [credorEstadoCivil, setCredorEstadoCivil] = useState(str(p.credor_estado_civil))
  const [credorDataNascimento, setCredorDataNascimento] = useState(
    str(p.credor_data_nascimento).slice(0, 10)
  )

  // Endereço
  const [credorEndereco, setCredorEndereco] = useState(str(p.credor_endereco))
  const [credorNumero, setCredorNumero] = useState(getDetalheEscritura("credor_numero"))
  const [credorBairro, setCredorBairro] = useState(getDetalheEscritura("credor_bairro"))
  const [credorCidade, setCredorCidade] = useState(str(p.credor_cidade))
  const [credorUf, setCredorUf] = useState(str(p.credor_uf))
  const [credorCep, setCredorCep] = useState(str(p.credor_cep))

  // Precatório
  const [numeroPrecatorio, setNumeroPrecatorio] = useState(str(p.numero_precatorio))
  const [numeroProcesso, setNumeroProcesso] = useState(str(p.numero_processo))
  const [numeroOficio, setNumeroOficio] = useState(str(p.numero_oficio))
  const [varaOrigem, setVaraOrigem] = useState(str(p.vara_origem ?? p.tribunal))
  const [devedor, setDevedor] = useState(str(p.devedor))
  const [valorAtualizado, setValorAtualizado] = useState(str(p.valor_atualizado))
  const [dataExpedicao, setDataExpedicao] = useState(str(p.data_expedicao).slice(0, 10))

  // Proposta / Advogado
  const [propostaMenorPercentual, setPropostaMenorPercentual] = useState(
    str(p.proposta_menor_percentual)
  )
  const [propostaMenorValor, setPropostaMenorValor] = useState(str(p.proposta_menor_valor))
  const [honorariosPercentual, setHonorariosPercentual] = useState(str(p.honorarios_percentual))
  const [advogadoNome, setAdvogadoNome] = useState(str(p.advogado_nome))
  const [advogadoCpf, setAdvogadoCpf] = useState(str(p.advogado_cpf_cnpj))

  // Bancários
  const [banco, setBanco] = useState(str(p.banco))
  const [agencia, setAgencia] = useState(str(p.agencia))
  const [conta, setConta] = useState(str(p.conta))

  const [gerando, setGerando] = useState(false)
  const [savingDadosEscritura, setSavingDadosEscritura] = useState(false)

  useEffect(() => {
    setStatusEscrituras(initialStatus || "nao_iniciado")
    setObservacoes(initialObservacoes || "")
  }, [initialStatus, initialObservacoes])

  // Sincronizar com precatorio quando mudar
  useEffect(() => {
    const pAtual = precatorio ?? {}
    const detalhesAtuais = asObject(pAtual.detalhes)
    const detalhesEscrituraAtuais = asObject(detalhesAtuais.escritura)
    const detalheEscritura = (chave: string) => str(detalhesEscrituraAtuais[chave] ?? detalhesAtuais[chave])

    const dataCessaoSalva = detalheEscritura("data_cessao").slice(0, 10)
    if (dataCessaoSalva) setDataCessao(dataCessaoSalva)

    setCidadeCartorio(detalheEscritura("cidade_cartorio"))
    setUfCartorio(detalheEscritura("uf_cartorio"))
    setCredorNome(str(pAtual.credor_nome))
    setCredorCpf(str(pAtual.credor_cpf_cnpj))
    setCredorRg(detalheEscritura("credor_rg"))
    setCredorNacionalidade(detalheEscritura("credor_nacionalidade") || "brasileiro(a)")
    setCredorProfissao(str(pAtual.credor_profissao))
    setCredorEstadoCivil(str(pAtual.credor_estado_civil))
    setCredorDataNascimento(str(pAtual.credor_data_nascimento).slice(0, 10))
    setCredorEndereco(str(pAtual.credor_endereco))
    setCredorNumero(detalheEscritura("credor_numero"))
    setCredorBairro(detalheEscritura("credor_bairro"))
    setCredorCidade(str(pAtual.credor_cidade))
    setCredorUf(str(pAtual.credor_uf))
    setCredorCep(str(pAtual.credor_cep))
    setNumeroPrecatorio(str(pAtual.numero_precatorio))
    setNumeroProcesso(str(pAtual.numero_processo))
    setNumeroOficio(str(pAtual.numero_oficio))
    setVaraOrigem(str(pAtual.vara_origem ?? pAtual.tribunal))
    setDevedor(str(pAtual.devedor))
    setValorAtualizado(str(pAtual.valor_atualizado))
    setDataExpedicao(str(pAtual.data_expedicao).slice(0, 10))
    setPropostaMenorPercentual(str(pAtual.proposta_menor_percentual))
    setPropostaMenorValor(str(pAtual.proposta_menor_valor))
    setHonorariosPercentual(str(pAtual.honorarios_percentual))
    setAdvogadoNome(str(pAtual.advogado_nome))
    setAdvogadoCpf(str(pAtual.advogado_cpf_cnpj))
    setBanco(str(pAtual.banco))
    setAgencia(str(pAtual.agencia))
    setConta(str(pAtual.conta))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precatorio])

  const salvarDadosEscritura = useCallback(async (options?: { silent?: boolean }) => {
    if (!canEdit) return true

    const silent = options?.silent ?? false
    setSavingDadosEscritura(true)

    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível.")

      const detalhesAtuais = asObject(p.detalhes)
      const detalhesEscrituraAtuais = asObject(detalhesAtuais.escritura)

      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      const detalhesEscrituraPatch = {
        ...detalhesEscrituraAtuais,
        data_cessao: limparTexto(dataCessao),
        cidade_cartorio: limparTexto(cidadeCartorio),
        uf_cartorio: limparTexto(ufCartorio.toUpperCase()),
        credor_rg: limparTexto(credorRg),
        credor_nacionalidade: limparTexto(credorNacionalidade),
        credor_numero: limparTexto(credorNumero),
        credor_bairro: limparTexto(credorBairro),
      }

      payload.detalhes = {
        ...detalhesAtuais,
        escritura: Object.fromEntries(
          Object.entries(detalhesEscrituraPatch).filter(([, value]) => value !== null)
        ),
      }

      const setTexto = (campo: string, valor: string) => {
        const normalized = limparTexto(valor)
        if (normalized !== null) {
          payload[campo] = normalized
        }
      }

      const setNumero = (campo: string, valor: string) => {
        const normalized = parseNumero(valor)
        if (normalized !== null) {
          payload[campo] = normalized
        }
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
      setTexto("data_expedicao", dataExpedicao)
      setTexto("advogado_nome", advogadoNome)
      setTexto("advogado_cpf_cnpj", advogadoCpf)
      setTexto("banco", banco)
      setTexto("agencia", agencia)
      setTexto("conta", conta)

      setNumero("valor_atualizado", valorAtualizado)
      setNumero("proposta_menor_percentual", propostaMenorPercentual)
      setNumero("proposta_menor_valor", propostaMenorValor)
      setNumero("honorarios_percentual", honorariosPercentual)

      const { error } = await supabase
        .from("precatorios")
        .update(payload)
        .eq("id", precatorioId)

      if (error) throw error

      if (!silent) {
        toast({
          title: "Dados da escritura salvos",
          description: "Campos preenchidos foram atualizados no CRM.",
        })
        onUpdate()
      }

      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar os dados da escritura."
      if (!silent) {
        toast({ title: "Erro ao salvar dados", description: msg, variant: "destructive" })
      }
      return false
    } finally {
      setSavingDadosEscritura(false)
    }
  }, [
    canEdit,
    p.detalhes,
    dataCessao,
    cidadeCartorio,
    ufCartorio,
    credorRg,
    credorNacionalidade,
    credorNumero,
    credorBairro,
    credorNome,
    credorCpf,
    credorProfissao,
    credorEstadoCivil,
    credorDataNascimento,
    credorEndereco,
    credorCidade,
    credorUf,
    credorCep,
    numeroPrecatorio,
    numeroProcesso,
    numeroOficio,
    varaOrigem,
    devedor,
    dataExpedicao,
    advogadoNome,
    advogadoCpf,
    banco,
    agencia,
    conta,
    valorAtualizado,
    propostaMenorPercentual,
    propostaMenorValor,
    honorariosPercentual,
    precatorioId,
    onUpdate,
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
          status_escrituras: statusEscrituras,
          observacoes_escrituras: observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)
      if (error) throw error
      toast({ title: "Escrituras atualizadas", description: "Status salvo com sucesso." })
      onUpdate()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar."
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleGerarEscritura = useCallback(async () => {
    setGerando(true)
    try {
      if (canEdit) {
        const salvou = await salvarDadosEscritura({ silent: true })
        if (!salvou) {
          throw new Error("Não foi possível salvar os dados da escritura antes da geração do documento.")
        }
      }

      const dataCessaoObj = new Date(dataCessao + "T00:00:00")
      const dia = String(dataCessaoObj.getDate()).padStart(2, "0")
      const mes = nomeMes(dataCessaoObj.getMonth() + 1)
      const ano = String(dataCessaoObj.getFullYear())
      const dataCessaoBr = formatarDataBR(dataCessao)

      const valorNum = parseNumero(valorAtualizado) ?? 0
      const valorExtensoBr = valorParaExtenso(valorNum)

      const propostaValorNum = parseNumero(propostaMenorValor) ?? 0
      const propostaExtensoBr = valorParaExtenso(propostaValorNum)

      const variaveis: Record<string, string> = {
        credor_nome: credorNome,
        data_cessao_dia: dia,
        data_cessao_mes: mes,
        data_cessao_ano: ano,
        data_cessao: dataCessaoBr,
        cidade_cartorio: cidadeCartorio,
        uf_cartorio: ufCartorio,
        credor_nacionalidade: credorNacionalidade,
        credor_profissao: credorProfissao,
        credor_estado_civil: credorEstadoCivil,
        credor_rg: credorRg,
        credor_cpf_cnpj: credorCpf,
        credor_data_nascimento: credorDataNascimento
          ? formatarDataBR(credorDataNascimento)
          : "",
        credor_cidade: credorCidade,
        credor_uf: credorUf,
        credor_endereco: credorEndereco,
        credor_numero: credorNumero,
        credor_bairro: credorBairro,
        credor_cep: credorCep,
        proposta_menor_percentual: propostaMenorPercentual,
        numero_oficio: numeroOficio,
        numero_precatorio: numeroPrecatorio,
        numero_processo: numeroProcesso,
        vara_origem: varaOrigem,
        devedor: devedor,
        valor_atualizado: formatarMoeda(valorNum),
        valor_atualizado_extenso: valorExtensoBr,
        data_expedicao: dataExpedicao ? formatarDataBR(dataExpedicao) : "",
        honorarios_percentual: honorariosPercentual,
        advogado_nome: advogadoNome,
        advogado_cpf_cnpj: advogadoCpf,
        proposta_menor_valor: formatarMoeda(propostaValorNum),
        proposta_menor_valor_extenso: propostaExtensoBr,
        banco: banco,
        agencia: agencia,
        conta: conta,
      }

      abrirDocumentoEmNovaAba(gerarHtmlEscritura(variaveis))

      toast({
        title: "Escritura gerada!",
        description: "O documento abriu em nova aba. Use Ctrl+P para salvar como PDF.",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível gerar a escritura."
      toast({ title: "Erro ao gerar", description: msg, variant: "destructive" })
    } finally {
      setGerando(false)
    }
  }, [
    canEdit,
    salvarDadosEscritura,
    dataCessao, cidadeCartorio, ufCartorio, credorNome, credorCpf, credorRg,
    credorNacionalidade, credorProfissao, credorEstadoCivil, credorDataNascimento,
    credorEndereco, credorNumero, credorBairro, credorCidade, credorUf, credorCep,
    numeroPrecatorio, numeroProcesso, numeroOficio, varaOrigem, devedor,
    valorAtualizado, dataExpedicao, propostaMenorPercentual, propostaMenorValor,
    honorariosPercentual, advogadoNome, advogadoCpf, banco, agencia, conta,
  ])

  const camposObrigatorios = [credorNome, credorCpf, credorRg, dataCessao, cidadeCartorio, ufCartorio, numeroPrecatorio, devedor]
  const pronto = camposObrigatorios.every((c) => c.trim() !== "")

  const currentStepLabel = STEPS.find((s) => s.id === statusEscrituras)?.label ?? statusEscrituras

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
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-sm">
              <ScrollText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">Controle de Escrituras</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Status atual: {currentStepLabel}</p>
            </div>
          </div>
          <div
            className={[
              "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border",
              statusEscrituras === "concluido"
                ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800"
                : statusEscrituras === "pendente_assinatura"
                  ? "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800"
                  : statusEscrituras === "em_andamento"
                    ? "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800"
                    : "text-muted-foreground bg-muted border-border",
            ].join(" ")}
          >
            {statusEscrituras === "concluido" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : statusEscrituras === "em_andamento" ? (
              <Clock className="w-3 h-3" />
            ) : statusEscrituras === "pendente_assinatura" ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <Circle className="w-3 h-3" />
            )}
            {currentStepLabel}
          </div>
        </div>

        {/* Stepper */}
        <div className="px-4 pb-3">
          <StatusStepper
            current={statusEscrituras}
            onChange={setStatusEscrituras}
            disabled={!canEdit || saving}
          />
        </div>

        {/* Observações */}
        <div className="px-4 pb-4 space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Observações
          </label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            disabled={!canEdit || saving}
            placeholder="Registre detalhes de assinatura, cartório, pendências e validações..."
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-none transition-all outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 disabled:opacity-60 placeholder:text-muted-foreground/60"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveStatus}
              disabled={!canEdit || saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-sm shadow-orange-200 dark:shadow-orange-950 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar status
            </button>
          </div>
        </div>
      </div>

      {/* ── Gerador de Contrato ──────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Cabeçalho do gerador */}
        <div className="relative overflow-hidden px-4 py-4 border-b border-border bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
          {/* Decoração de fundo */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, #d97706 0, #d97706 1px, transparent 0, transparent 50%)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-900/40">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-wide">Escritura Pública de Cessão</p>
                <p className="text-[10px] text-stone-400 mt-0.5 font-medium">
                  Geração automática com dados do CRM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 rounded-full px-2.5 py-1">
              <Wand2 className="w-3 h-3" />
              Template DOCX
            </div>
          </div>
        </div>

        {/* Corpo do formulário */}
        <div className="p-4 space-y-5">
          {/* Aviso de auto-preenchimento */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <BadgeCheck className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Campos marcados com <span className="font-bold">AUTO</span> são preenchidos automaticamente
              com dados do CRM. Revise e complete os campos obrigatórios antes de gerar.
            </p>
          </div>

          {/* — Seção: Dados do Cartório / Cessão — */}
          <Section
            icon={<CalendarDays className="w-3.5 h-3.5" />}
            title="Dados da Cessão e Cartório"
            subtitle="Informações sobre data e local da escritura"
          >
            <FieldRow label="Data da cessão" value={dataCessao} onChange={setDataCessao} type="date" required />
            <FieldRow label="Cidade do cartório" value={cidadeCartorio} onChange={setCidadeCartorio} placeholder="Ex: Apucarana" required />
            <FieldRow
              label="UF do cartório"
              value={ufCartorio}
              onChange={setUfCartorio}
              as="select"
              options={ufOpts}
              required
            />
          </Section>

          {/* — Seção: Dados do Cedente — */}
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

          {/* — Seção: Endereço do Cedente — */}
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

          {/* — Seção: Dados do Precatório — */}
          <Section
            icon={<Scale className="w-3.5 h-3.5" />}
            title="Dados do Precatório"
            subtitle="Informações do crédito judicial cedido"
          >
            <FieldRow label="Número do precatório" value={numeroPrecatorio} onChange={setNumeroPrecatorio} auto={!!p.numero_precatorio} required />
            <FieldRow label="Número do processo" value={numeroProcesso} onChange={setNumeroProcesso} auto={!!p.numero_processo} />
            <FieldRow label="Número do ofício" value={numeroOficio} onChange={setNumeroOficio} auto={!!p.numero_oficio} />
            <FieldRow label="Vara de origem / Tribunal" value={varaOrigem} onChange={setVaraOrigem} auto={!!(p.vara_origem ?? p.tribunal)} placeholder="Ex: 3ª Vara da Fazenda Pública" />
            <FieldRow label="Devedor" value={devedor} onChange={setDevedor} auto={!!p.devedor} required colSpan />
            <FieldRow label="Data de expedição" value={dataExpedicao} onChange={setDataExpedicao} type="date" auto={!!p.data_expedicao} />
            <FieldRow label="Valor atualizado (R$)" value={valorAtualizado} onChange={setValorAtualizado} type="number" auto={!!p.valor_atualizado} placeholder="0.00" />
          </Section>

          {/* — Seção: Proposta & Advogado — */}
          <Section
            icon={<Banknote className="w-3.5 h-3.5" />}
            title="Proposta & Honorários"
            subtitle="Valores da cessão e dados do advogado"
          >
            <FieldRow label="% proposta cedente" value={propostaMenorPercentual} onChange={setPropostaMenorPercentual} type="number" auto={!!p.proposta_menor_percentual} placeholder="Ex: 45.50" />
            <FieldRow label="Valor proposta (R$)" value={propostaMenorValor} onChange={setPropostaMenorValor} type="number" auto={!!p.proposta_menor_valor} placeholder="0.00" />
            <FieldRow label="% honorários" value={honorariosPercentual} onChange={setHonorariosPercentual} type="number" auto={!!p.honorarios_percentual} placeholder="Ex: 30" />
            <FieldRow label="Nome do advogado" value={advogadoNome} onChange={setAdvogadoNome} auto={!!p.advogado_nome} />
            <FieldRow label="CPF do advogado" value={advogadoCpf} onChange={setAdvogadoCpf} auto={!!p.advogado_cpf_cnpj} />
          </Section>

          {/* — Seção: Dados Bancários — */}
          <Section
            icon={<Building2 className="w-3.5 h-3.5" />}
            title="Dados Bancários"
            subtitle="Conta para recebimento"
          >
            <FieldRow label="Banco" value={banco} onChange={setBanco} auto={!!p.banco} placeholder="Ex: Banco do Brasil" />
            <FieldRow label="Agência" value={agencia} onChange={setAgencia} auto={!!p.agencia} placeholder="Ex: 1234-5" />
            <FieldRow label="Conta" value={conta} onChange={setConta} auto={!!p.conta} placeholder="Ex: 12345-6" />
          </Section>

          {/* — Botão Gerar — */}
          <div className="pt-2">
            {canEdit && (
              <button
                onClick={() => void salvarDadosEscritura()}
                disabled={savingDadosEscritura || gerando}
                className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition-all hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-orange-800 dark:bg-orange-950/25 dark:text-orange-300 dark:hover:bg-orange-950/40"
              >
                {savingDadosEscritura ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar dados da escritura no CRM
              </button>
            )}
            {!pronto && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Preencha todos os campos obrigatórios (<span className="font-bold">*</span>) antes de gerar.
                </p>
              </div>
            )}
            <button
              onClick={handleGerarEscritura}
              disabled={gerando || !pronto || savingDadosEscritura}
              className={[
                "group w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-300 relative overflow-hidden",
                pronto && !gerando
                  ? "bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 hover:from-orange-600 hover:via-amber-600 hover:to-orange-600 text-white shadow-lg shadow-stone-900/30 dark:shadow-stone-950/60 hover:shadow-orange-500/30 hover:scale-[1.01] active:scale-[0.99]"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-60",
              ].join(" ")}
            >
              {/* Shimmer */}
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
                  Gerando escritura...
                </>
              ) : (
                <>
                  <Download className="w-4.5 h-4.5 transition-transform group-hover:translate-y-0.5" />
                  Gerar e Visualizar Escritura
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
