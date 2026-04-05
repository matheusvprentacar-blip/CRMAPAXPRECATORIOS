"use client"

import { useEffect, useState, useCallback } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { valorParaExtenso } from "@/lib/utils/numero-extenso"
import { gerarHtmlContrato, abrirDocumentoEmNovaAba } from "@/lib/templates/documentos-html"
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
  FileText,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AbaContratosProps {
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
                disabled ? "cursor-default" : "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20",
                active
                  ? "bg-gradient-to-b from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/20 ring-1 ring-blue-200 dark:ring-blue-800"
                  : "",
              ].join(" ")}
            >
              <div
                className={[
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all duration-300 border-2",
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900"
                    : active
                      ? "bg-gradient-to-br from-blue-400 to-sky-500 border-blue-400 text-white shadow-md shadow-blue-200 dark:shadow-blue-900 scale-110"
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
                      ? "text-blue-600 dark:text-blue-400"
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
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-500 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded px-1 py-0.5 ml-1.5">
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
    "focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400",
    auto
      ? "bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800 text-foreground"
      : "bg-background border-input hover:border-blue-300 dark:hover:border-blue-700",
    !value && required ? "border-blue-300 dark:border-blue-700" : "",
  ].join(" ")

  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="flex items-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
        {auto && <AutoBadge />}
        {required && !auto && <span className="text-blue-400 ml-1">*</span>}
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
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 border border-blue-100 dark:border-blue-900">
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

export function AbaContratos({
  precatorioId,
  canEdit,
  onUpdate,
  initialStatus,
  initialObservacoes,
  precatorio,
}: AbaContratosProps) {
  const p = precatorio ?? {}
  const detalhes = asObject(p.detalhes)
  const detalhesContrato = asObject(detalhes.contrato)
  const getDetalheContrato = (chave: string) => str(detalhesContrato[chave] ?? detalhes[chave])

  // — Status & observações —
  const [statusContrato, setStatusContrato] = useState(initialStatus || "nao_iniciado")
  const [observacoes, setObservacoes] = useState(initialObservacoes || "")
  const [saving, setSaving] = useState(false)

  // — Campos do contrato —
  const hoje = new Date()
  const [dataCessao, setDataCessao] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`
  )
  const [cidadeCartorio, setCidadeCartorio] = useState(getDetalheContrato("cidade_cartorio"))
  const [ufCartorio, setUfCartorio] = useState(getDetalheContrato("uf_cartorio"))

  // Cedente
  const [credorNome, setCredorNome] = useState(str(p.credor_nome))
  const [credorCpf, setCredorCpf] = useState(str(p.credor_cpf_cnpj))
  const [credorRg, setCredorRg] = useState(getDetalheContrato("credor_rg"))
  const [credorNacionalidade, setCredorNacionalidade] = useState(
    getDetalheContrato("credor_nacionalidade") || "brasileiro(a)"
  )
  const [credorProfissao, setCredorProfissao] = useState(str(p.credor_profissao))
  const [credorEstadoCivil, setCredorEstadoCivil] = useState(str(p.credor_estado_civil))
  const [credorDataNascimento, setCredorDataNascimento] = useState(
    str(p.credor_data_nascimento).slice(0, 10)
  )

  // Endereço
  const [credorEndereco, setCredorEndereco] = useState(str(p.credor_endereco))
  const [credorNumero, setCredorNumero] = useState(getDetalheContrato("credor_numero"))
  const [credorBairro, setCredorBairro] = useState(getDetalheContrato("credor_bairro"))
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
  const [savingDadosContrato, setSavingDadosContrato] = useState(false)

  useEffect(() => {
    setStatusContrato(initialStatus || "nao_iniciado")
    setObservacoes(initialObservacoes || "")
  }, [initialStatus, initialObservacoes])

  useEffect(() => {
    const pAtual = precatorio ?? {}
    const detalhesAtuais = asObject(pAtual.detalhes)
    const detalhesContratoAtuais = asObject(detalhesAtuais.contrato)
    const detalheContrato = (chave: string) => str(detalhesContratoAtuais[chave] ?? detalhesAtuais[chave])

    const dataCessaoSalva = detalheContrato("data_cessao").slice(0, 10)
    if (dataCessaoSalva) setDataCessao(dataCessaoSalva)

    setCidadeCartorio(detalheContrato("cidade_cartorio"))
    setUfCartorio(detalheContrato("uf_cartorio"))
    setCredorNome(str(pAtual.credor_nome))
    setCredorCpf(str(pAtual.credor_cpf_cnpj))
    setCredorRg(detalheContrato("credor_rg"))
    setCredorNacionalidade(detalheContrato("credor_nacionalidade") || "brasileiro(a)")
    setCredorProfissao(str(pAtual.credor_profissao))
    setCredorEstadoCivil(str(pAtual.credor_estado_civil))
    setCredorDataNascimento(str(pAtual.credor_data_nascimento).slice(0, 10))
    setCredorEndereco(str(pAtual.credor_endereco))
    setCredorNumero(detalheContrato("credor_numero"))
    setCredorBairro(detalheContrato("credor_bairro"))
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

  const salvarDadosContrato = useCallback(async (options?: { silent?: boolean }) => {
    if (!canEdit) return true

    const silent = options?.silent ?? false
    setSavingDadosContrato(true)

    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não disponível.")

      const detalhesAtuais = asObject(p.detalhes)
      const detalhesContratoAtuais = asObject(detalhesAtuais.contrato)

      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      const detalhesContratoPatch = {
        ...detalhesContratoAtuais,
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
        contrato: Object.fromEntries(
          Object.entries(detalhesContratoPatch).filter(([, value]) => value !== null)
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
          title: "Dados do contrato salvos",
          description: "Campos preenchidos foram atualizados no CRM.",
        })
        onUpdate()
      }

      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar os dados do contrato."
      if (!silent) {
        toast({ title: "Erro ao salvar dados", description: msg, variant: "destructive" })
      }
      return false
    } finally {
      setSavingDadosContrato(false)
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
          status_contrato: statusContrato,
          observacoes_contrato: observacoes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", precatorioId)
      if (error) throw error
      toast({ title: "Contrato atualizado", description: "Status salvo com sucesso." })
      onUpdate()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar."
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleGerarContrato = useCallback(async () => {
    setGerando(true)
    try {
      if (canEdit) {
        const salvou = await salvarDadosContrato({ silent: true })
        if (!salvou) {
          throw new Error("Não foi possível salvar os dados do contrato antes da geração do documento.")
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

      abrirDocumentoEmNovaAba(gerarHtmlContrato(variaveis))

      toast({
        title: "Contrato gerado!",
        description: "O documento abriu em nova aba. Use Ctrl+P para salvar como PDF.",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível gerar o contrato."
      toast({ title: "Erro ao gerar", description: msg, variant: "destructive" })
    } finally {
      setGerando(false)
    }
  }, [
    canEdit,
    salvarDadosContrato,
    dataCessao, cidadeCartorio, ufCartorio, credorNome, credorCpf, credorRg,
    credorNacionalidade, credorProfissao, credorEstadoCivil, credorDataNascimento,
    credorEndereco, credorNumero, credorBairro, credorCidade, credorUf, credorCep,
    numeroPrecatorio, numeroProcesso, numeroOficio, varaOrigem, devedor,
    valorAtualizado, dataExpedicao, propostaMenorPercentual, propostaMenorValor,
    honorariosPercentual, advogadoNome, advogadoCpf, banco, agencia, conta,
  ])

  const camposObrigatorios = [credorNome, credorCpf, credorRg, dataCessao, cidadeCartorio, ufCartorio, numeroPrecatorio, devedor]
  const pronto = camposObrigatorios.every((c) => c.trim() !== "")

  const currentStepLabel = STEPS.find((s) => s.id === statusContrato)?.label ?? statusContrato

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
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-sky-500 text-white shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">Controle de Contratos</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Status atual: {currentStepLabel}</p>
            </div>
          </div>
          <div
            className={[
              "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border",
              statusContrato === "concluido"
                ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800"
                : statusContrato === "pendente_assinatura"
                  ? "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800"
                  : statusContrato === "em_andamento"
                    ? "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-800"
                    : "text-muted-foreground bg-muted border-border",
            ].join(" ")}
          >
            {statusContrato === "concluido" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : statusContrato === "em_andamento" ? (
              <Clock className="w-3 h-3" />
            ) : statusContrato === "pendente_assinatura" ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <Circle className="w-3 h-3" />
            )}
            {currentStepLabel}
          </div>
        </div>

        <div className="px-4 pb-3">
          <StatusStepper
            current={statusContrato}
            onChange={setStatusContrato}
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
            placeholder="Registre detalhes de assinatura, pendências e validações do contrato..."
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-none transition-all outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 disabled:opacity-60 placeholder:text-muted-foreground/60"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveStatus}
              disabled={!canEdit || saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold shadow-sm shadow-blue-200 dark:shadow-blue-950 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar status
            </button>
          </div>
        </div>
      </div>

      {/* ── Gerador de Contrato ──────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="relative overflow-hidden px-4 py-4 border-b border-border bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 dark:from-slate-950 dark:via-blue-950 dark:to-slate-950">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, #3b82f6 0, #3b82f6 1px, transparent 0, transparent 50%)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-sky-500 text-white shadow-lg shadow-blue-900/40">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-wide">Contrato de Cessão de Crédito</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  Geração automática com dados do CRM
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-950/40 border border-blue-800/60 rounded-full px-2.5 py-1">
              <Wand2 className="w-3 h-3" />
              Template DOCX
            </div>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              Campos marcados com <span className="font-bold">AUTO</span> são preenchidos automaticamente
              com dados do CRM. Revise e complete os campos obrigatórios antes de gerar.
            </p>
          </div>

          <Section
            icon={<CalendarDays className="w-3.5 h-3.5" />}
            title="Dados da Cessão"
            subtitle="Informações sobre data e local do contrato"
          >
            <FieldRow label="Data da cessão" value={dataCessao} onChange={setDataCessao} type="date" required />
            <FieldRow label="Cidade" value={cidadeCartorio} onChange={setCidadeCartorio} placeholder="Ex: Apucarana" required />
            <FieldRow
              label="UF"
              value={ufCartorio}
              onChange={setUfCartorio}
              as="select"
              options={ufOpts}
              required
            />
          </Section>

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
                onClick={() => void salvarDadosContrato()}
                disabled={savingDadosContrato || gerando}
                className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/25 dark:text-blue-300 dark:hover:bg-blue-950/40"
              >
                {savingDadosContrato ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar dados do contrato no CRM
              </button>
            )}
            {!pronto && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Preencha todos os campos obrigatórios (<span className="font-bold">*</span>) antes de gerar.
                </p>
              </div>
            )}
            <button
              onClick={handleGerarContrato}
              disabled={gerando || !pronto || savingDadosContrato}
              className={[
                "group w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-300 relative overflow-hidden",
                pronto && !gerando
                  ? "bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 hover:from-blue-600 hover:via-sky-600 hover:to-blue-600 text-white shadow-lg shadow-slate-900/30 dark:shadow-slate-950/60 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99]"
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
                  Gerando contrato...
                </>
              ) : (
                <>
                  <Download className="w-4.5 h-4.5 transition-transform group-hover:translate-y-0.5" />
                  Gerar e Visualizar Contrato
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
