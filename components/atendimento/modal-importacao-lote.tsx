"use client"
/* eslint-disable */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  FileSpreadsheet,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
} from "@/components/icons"
import { createBrowserClient } from "@/lib/supabase/client"
import { ModalDuplicata, type DuplicataInfo } from "./modal-duplicata"
import { toast } from "sonner"
import type { RegistroExtraido } from "@/lib/server/nova-pipeline-ocr"
import { useUsuariosCache } from "@/hooks/use-usuarios-cache"
import { buildDistribuicaoCreditosPreview } from "@/lib/atendimento/distribuicao-creditos"
import { OPERATOR_TAG_OPTIONS, isAtendimentoOperatorRole, normalizeOperatorTag, type OperatorTag } from "@/lib/users/operator-tag"

type Etapa = "upload" | "processando" | "revisao"
type Modo = "pdf" | "excel"

interface RegistroRevisao extends Omit<RegistroExtraido, "arquivo"> {
  arquivo: string
  _status: "valido" | "incompleto" | "duplicata" | "pulado"
  _duplicataInfo?: DuplicataInfo
  _id: number
}

interface MapeamentoExcel {
  [colunaOriginal: string]: string | null
}

const CAMPOS_SISTEMA: Record<string, string> = {
  credor_nome: "Nome do Credor",
  credor_cpf_cnpj: "CPF/CNPJ",
  numero_precatorio: "Nº Precatório",
  numero_processo: "Nº Processo",
  numero_oficio: "Nº Ofício",
  tribunal: "Tribunal",
  devedor: "Devedor",
  valor_principal: "Valor Principal",
  natureza: "Natureza",
  data_expedicao: "Data Expedição",
  advogado_nome: "Advogado",
}

const PAGE_SIZE = 50
const DUPLICATAS_CHUNK_SIZE = 40
const DUPLICATAS_SELECT =
  "id, credor_nome, numero_precatorio, numero_processo, status_kanban, dono_usuario_id, updated_at, usuarios!precatorios_dono_usuario_id_fkey(nome)"

interface DuplicataBancoRow {
  id: string
  credor_nome: string | null
  numero_precatorio: string | null
  numero_processo: string | null
  status_kanban: string | null
  dono_usuario_id: string | null
  updated_at: string | null
  usuarios?: { nome?: string | null } | null
}

function calcularStatus(r: RegistroRevisao): "valido" | "incompleto" | "duplicata" | "pulado" {
  if (r._status === "pulado") return "pulado"
  if (r._status === "duplicata") return "duplicata"
  if (!r.credor_nome) return "incompleto"
  return "valido"
}

function normalizarNumeroDocumento(valor: string | null | undefined): string | null {
  if (!valor) return null
  const limpo = valor.trim().replace(/^\+/, "")
  return limpo || null
}

interface ModalImportacaoLoteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ModalImportacaoLote({ open, onOpenChange, onSuccess }: ModalImportacaoLoteProps) {
  const [etapa, setEtapa] = useState<Etapa>("upload")
  const [modo, setModo] = useState<Modo | null>(null)
  const [arquivos, setArquivos] = useState<File[]>([])
  const [progresso, setProgresso] = useState({ concluidos: 0, total: 0 })
  const [errosProcessamento, setErrosProcessamento] = useState<string[]>([])
  const [registros, setRegistros] = useState<RegistroRevisao[]>([])
  const [mapeamento, setMapeamento] = useState<MapeamentoExcel>({})
  const [headersExcel, setHeadersExcel] = useState<string[]>([])
  const [linhasBrutas, setLinhasBrutas] = useState<Record<string, string>[]>([])
  const [mostrarMapeamento, setMostrarMapeamento] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const [operatorTagFilter, setOperatorTagFilter] = useState<OperatorTag | "todos">("todos")
  const [selectedOperatorIds, setSelectedOperatorIds] = useState<string[]>([])
  const [modalDuplicata, setModalDuplicata] = useState<{ aberto: boolean; registro: RegistroRevisao | null }>({ aberto: false, registro: null })
  const inputRef = useRef<HTMLInputElement>(null)
  const idCounter = useRef(0)
  const { usuarios, loading: loadingUsuarios } = useUsuariosCache()

  const operadoresElegiveis = useMemo(
    () =>
      usuarios.filter((usuario) => {
        if (!isAtendimentoOperatorRole(usuario.role)) return false
        if (operatorTagFilter === "todos") return true
        return normalizeOperatorTag(usuario.operator_tag) === operatorTagFilter
      }),
    [operatorTagFilter, usuarios]
  )

  const registrosSelecionados = useMemo(
    () => registros.filter((registro) => selecionados.has(registro._id) && registro._status !== "pulado"),
    [registros, selecionados]
  )

  const distribuicaoPreview = useMemo(
    () =>
      buildDistribuicaoCreditosPreview(
        registrosSelecionados.map((registro) => ({
          id: String(registro._id),
          valor_principal: registro.valor_principal ?? 0,
          valor_atualizado: null,
        })),
        selectedOperatorIds
      ),
    [registrosSelecionados, selectedOperatorIds]
  )

  const reset = () => {
    setEtapa("upload")
    setModo(null)
    setArquivos([])
    setProgresso({ concluidos: 0, total: 0 })
    setErrosProcessamento([])
    setRegistros([])
    setMapeamento({})
    setHeadersExcel([])
    setLinhasBrutas([])
    setMostrarMapeamento(false)
    setPaginaAtual(1)
    setSelecionados(new Set())
    setSalvando(false)
    setOperatorTagFilter("todos")
    setSelectedOperatorIds([])
    idCounter.current = 0
  }

  useEffect(() => {
    setSelectedOperatorIds((prev) =>
      prev.filter((operatorId) => operadoresElegiveis.some((operador) => operador.id === operatorId))
    )
  }, [operadoresElegiveis])

  const toggleOperatorSelection = (operatorId: string) => {
    setSelectedOperatorIds((prev) =>
      prev.includes(operatorId) ? prev.filter((id) => id !== operatorId) : [...prev, operatorId]
    )
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const modoDetectado: Modo = files[0].name.match(/\.(xlsx|xls|csv)$/i) ? "excel" : "pdf"
    setModo(modoDetectado)
    setArquivos(files)
  }

  const removerArquivo = (index: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index))
  }

  async function buscarDuplicatasPorColuna(
    supabase: NonNullable<ReturnType<typeof createBrowserClient>>,
    coluna: "numero_precatorio" | "numero_processo",
    numeros: string[]
  ): Promise<DuplicataBancoRow[]> {
    const resultados: DuplicataBancoRow[] = []

    for (let i = 0; i < numeros.length; i += DUPLICATAS_CHUNK_SIZE) {
      const lote = numeros.slice(i, i + DUPLICATAS_CHUNK_SIZE)
      const { data, error } = await supabase
        .from("precatorios")
        .select(DUPLICATAS_SELECT)
        .in(coluna, lote)

      if (error) {
        console.error(`[importacao-lote] Falha ao verificar duplicatas por ${coluna}:`, error.message)
        continue
      }

      if (data?.length) {
        resultados.push(...(data as DuplicataBancoRow[]))
      }
    }

    return resultados
  }

  async function verificarDuplicatas(regs: RegistroRevisao[]): Promise<RegistroRevisao[]> {
    const supabase = createBrowserClient()
    if (!supabase) return regs

    const numerosUnicos = Array.from(
      new Set(
        regs.flatMap((r) => {
          const numeroPrecatorio = normalizarNumeroDocumento(r.numero_precatorio)
          const numeroProcesso = normalizarNumeroDocumento(r.numero_processo)
          return [numeroPrecatorio, numeroProcesso].filter((v): v is string => Boolean(v))
        })
      )
    )

    if (numerosUnicos.length === 0) return regs

    const [duplicatasPorNumeroPrecatorio, duplicatasPorNumeroProcesso] = await Promise.all([
      buscarDuplicatasPorColuna(supabase, "numero_precatorio", numerosUnicos),
      buscarDuplicatasPorColuna(supabase, "numero_processo", numerosUnicos),
    ])

    const mapaDuplicatasPorId = new Map<string, DuplicataBancoRow>()
    for (const duplicata of [...duplicatasPorNumeroPrecatorio, ...duplicatasPorNumeroProcesso]) {
      mapaDuplicatasPorId.set(duplicata.id, duplicata)
    }

    if (mapaDuplicatasPorId.size === 0) return regs

    const mapaPorNumeroPrecatorio = new Map<string, DuplicataBancoRow>()
    const mapaPorNumeroProcesso = new Map<string, DuplicataBancoRow>()

    for (const duplicata of mapaDuplicatasPorId.values()) {
      const numeroPrecatorio = normalizarNumeroDocumento(duplicata.numero_precatorio)
      const numeroProcesso = normalizarNumeroDocumento(duplicata.numero_processo)
      if (numeroPrecatorio) mapaPorNumeroPrecatorio.set(numeroPrecatorio, duplicata)
      if (numeroProcesso) mapaPorNumeroProcesso.set(numeroProcesso, duplicata)
    }

    return regs.map((reg) => {
      const numeroPrecatorio = normalizarNumeroDocumento(reg.numero_precatorio)
      const numeroProcesso = normalizarNumeroDocumento(reg.numero_processo)
      const dup =
        (numeroPrecatorio && mapaPorNumeroPrecatorio.get(numeroPrecatorio)) ||
        (numeroProcesso && mapaPorNumeroProcesso.get(numeroProcesso))

      if (!dup) return reg

      const registroDuplicado: RegistroRevisao = {
        ...reg,
        _status: "duplicata" as const,
        _duplicataInfo: {
          id: dup.id,
          numero_precatorio: dup.numero_precatorio,
          numero_processo: dup.numero_processo,
          credor_nome: dup.credor_nome ?? reg.credor_nome ?? "Credor não identificado",
          status_kanban: dup.status_kanban,
          dono_usuario_id: dup.dono_usuario_id,
          responsavel_nome: dup.usuarios?.nome ?? null,
          updated_at: dup.updated_at,
        },
      }
      return registroDuplicado
    })
  }

  function parseBRL(valor: string): number | null {
    if (!valor) return null
    let limpo = valor.replace(/R\$\s*/i, "").trim()
    if (!limpo) return null
    // BRL format: "55.130.133,34" → dots are thousand separators, comma is decimal
    if (limpo.includes(",")) {
      limpo = limpo.replace(/\./g, "").replace(",", ".")
    }
    const num = parseFloat(limpo)
    return isNaN(num) ? null : num
  }

  // Converte valores de data vindos da planilha para ISO (YYYY-MM-DD).
  // Qualquer valor que não seja uma data reconhecível vira null, evitando que
  // texto livre (ex.: "Apresentação") quebre o insert na coluna DATE do banco.
  function parseDataParaISO(valor: string | null | undefined): string | null {
    if (valor == null) return null
    const txt = String(valor).trim()
    if (!txt) return null

    // Já em ISO: YYYY-MM-DD (com hora opcional)
    const iso = txt.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) {
      const ano = Number(iso[1]); const mes = Number(iso[2]); const dia = Number(iso[3])
      if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) return `${iso[1]}-${iso[2]}-${iso[3]}`
      return null
    }

    // Formato BR: DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA (ano com 2 ou 4 dígitos)
    const br = txt.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/)
    if (br) {
      const dia = Number(br[1]); const mes = Number(br[2])
      let ano = br[3]
      if (ano.length === 2) ano = `20${ano}`
      if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null
      return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
    }

    // Serial de data do Excel (dias desde 1899-12-30)
    if (/^\d{4,5}$/.test(txt)) {
      const serial = Number(txt)
      const ms = Date.UTC(1899, 11, 30) + serial * 86400000
      const dt = new Date(ms)
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
    }

    return null
  }

  function aplicarMapeamentoClientSide(
    linhas: Record<string, string>[],
    map: MapeamentoExcel,
    nomeArquivo: string
  ): RegistroRevisao[] {
    // Inverte o mapeamento: campo_sistema → coluna_original
    const colPorCampo: Record<string, string> = {}
    for (const [col, campo] of Object.entries(map)) {
      if (campo) colPorCampo[campo] = col
    }

    const get = (linha: Record<string, string>, campo: string) => {
      const col = colPorCampo[campo]
      return col ? (linha[col] ?? "") : ""
    }

    return linhas.map((linha) => {
      const reg: RegistroRevisao = {
        credor_nome: get(linha, "credor_nome") || null,
        credor_cpf_cnpj: get(linha, "credor_cpf_cnpj") || null,
        numero_precatorio: get(linha, "numero_precatorio") || null,
        numero_processo: get(linha, "numero_processo") || null,
        numero_oficio: get(linha, "numero_oficio") || null,
        tribunal: get(linha, "tribunal") || null,
        devedor: get(linha, "devedor") || null,
        valor_principal: parseBRL(get(linha, "valor_principal")),
        natureza: get(linha, "natureza") || null,
        data_expedicao: get(linha, "data_expedicao") || null,
        advogado_nome: get(linha, "advogado_nome") || null,
        arquivo: nomeArquivo,
        _qualidade: "boa" as const,
        _id: ++idCounter.current,
        _status: "valido",
      }
      reg._status = calcularStatus(reg)
      return reg
    })
  }

  const reaplicarMapeamento = async () => {
    if (linhasBrutas.length === 0) return
    idCounter.current = 0
    const regs = aplicarMapeamentoClientSide(linhasBrutas, mapeamento, arquivos[0]?.name ?? "")
    const comDuplicatas = await verificarDuplicatas(regs)
    setRegistros(comDuplicatas)
    setSelecionados(new Set(comDuplicatas.filter((r) => r._status === "valido").map((r) => r._id)))
    setPaginaAtual(1)
  }

  const processarPDFs = async () => {
    setEtapa("processando")
    setProgresso({ concluidos: 0, total: arquivos.length })
    const erros: string[] = []
    const todosRegistros: RegistroRevisao[] = []

    for (const arquivo of arquivos) {
      const formData = new FormData()
      formData.append("file", arquivo)
      try {
        const res = await fetch("/api/atendimento/ocr-lote", { method: "POST", body: formData })
        const json = await res.json()
        if (!res.ok || json.error) {
          erros.push(`${arquivo.name}: ${json.error ?? "Erro desconhecido"}`)
        } else {
          const regs: RegistroRevisao[] = (json.resultado?.registros ?? []).map((r: RegistroExtraido) => ({
            ...r,
            _id: ++idCounter.current,
            _status: r.credor_nome ? "valido" : "incompleto",
          }))
          todosRegistros.push(...regs)
        }
      } catch (err) {
        erros.push(`${arquivo.name}: ${err instanceof Error ? err.message : "Erro de rede"}`)
      }
      setProgresso((p) => ({ ...p, concluidos: p.concluidos + 1 }))
    }

    const comDuplicatas = await verificarDuplicatas(todosRegistros)
    setErrosProcessamento(erros)
    setRegistros(comDuplicatas)
    setSelecionados(new Set(comDuplicatas.filter((r) => r._status === "valido").map((r) => r._id)))
    setEtapa("revisao")
  }

  const processarExcel = async () => {
    if (arquivos.length === 0) return
    setEtapa("processando")
    setProgresso({ concluidos: 0, total: 1 })
    const formData = new FormData()
    formData.append("file", arquivos[0])
    try {
      const res = await fetch("/api/atendimento/importar-excel", { method: "POST", body: formData })
      const json = await res.json()
      if (!res.ok || json.error) {
        setErrosProcessamento([json.error ?? "Erro desconhecido"])
        setProgresso({ concluidos: 1, total: 1 })
        setEtapa("revisao")
        return
      }
      const mapeamentoRecebido: MapeamentoExcel = json.mapeamento ?? {}
      const headers: string[] = json.headers ?? []
      const linhas: Record<string, string>[] = json.linhas ?? []
      setMapeamento(mapeamentoRecebido)
      setHeadersExcel(headers)
      setLinhasBrutas(linhas)
      const regs = aplicarMapeamentoClientSide(linhas, mapeamentoRecebido, arquivos[0].name)
      const comDuplicatas = await verificarDuplicatas(regs)
      setRegistros(comDuplicatas)
      setSelecionados(new Set(comDuplicatas.filter((r) => r._status === "valido").map((r) => r._id)))
      setMostrarMapeamento(true)
    } catch (err) {
      setErrosProcessamento([err instanceof Error ? err.message : "Erro de rede"])
    }
    setProgresso({ concluidos: 1, total: 1 })
    setEtapa("revisao")
  }

  const iniciarProcessamento = () => {
    if (modo === "pdf") processarPDFs()
    else processarExcel()
  }

  const toggleSelecao = (id: number) => {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    const visiveis = registrosPagina.filter((r) => r._status !== "pulado")
    const todosSelected = visiveis.every((r) => selecionados.has(r._id))
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (todosSelected) visiveis.forEach((r) => next.delete(r._id))
      else visiveis.forEach((r) => { if (r._status !== "duplicata") next.add(r._id) })
      return next
    })
  }

  const atualizarCampo = (id: number, campo: string, valor: string) => {
    setRegistros((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r
        const atualizado = { ...r, [campo]: campo === "valor_principal" ? parseFloat(valor) || null : valor || null }
        return { ...atualizado, _status: calcularStatus(atualizado) }
      })
    )
  }

  const pularRegistro = (id: number) => {
    setRegistros((prev) => prev.map((r) => (r._id === id ? { ...r, _status: "pulado" } : r)))
    setSelecionados((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  const totalPaginas = Math.ceil(registros.length / PAGE_SIZE)
  const registrosPagina = registros.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE)

  const salvarImportacao = async () => {
    const paraImportar = registros.filter((r) => selecionados.has(r._id))
    if (paraImportar.length === 0) {
      toast.error("Selecione pelo menos um registro para importar.")
      return
    }
    if (selectedOperatorIds.length === 0 || !distribuicaoPreview) {
      toast.error("Selecione ao menos um operador para distribuir os créditos deste lote.")
      return
    }
    setSalvando(true)
    try {
      const supabase = createBrowserClient()
      if (!supabase) throw new Error("Supabase não inicializado")
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")
      const distribuicaoMap = new Map<string, string>()
      Object.entries(distribuicaoPreview.assignments).forEach(([operatorId, registroIds]) => {
        registroIds.forEach((registroId) => distribuicaoMap.set(registroId, operatorId))
      })

      const registrosSemOperador = paraImportar.filter((registro) => !distribuicaoMap.has(String(registro._id)))
      if (registrosSemOperador.length > 0) {
        throw new Error("Todos os registros selecionados precisam estar distribuídos antes da importação.")
      }

      const nowIso = new Date().toISOString()

      const payloads = paraImportar.map((r) => {
        const responsavelId = distribuicaoMap.get(String(r._id))
        if (!responsavelId) {
          throw new Error(`Não foi possível definir o operador do registro ${r.credor_nome ?? r._id}.`)
        }

        return {
          criado_por: user.id,
          credor_nome: r.credor_nome ?? "Credor não identificado",
          credor_cpf_cnpj: r.credor_cpf_cnpj ?? null,
          numero_precatorio: r.numero_precatorio ?? null,
          numero_processo: r.numero_processo ?? null,
          numero_oficio: r.numero_oficio ?? null,
          tribunal: r.tribunal ?? null,
          devedor: r.devedor ?? null,
          advogado_nome: r.advogado_nome ?? null,
          valor_principal: r.valor_principal ?? 0,
          natureza: r.natureza ?? null,
          data_expedicao: parseDataParaISO(r.data_expedicao),
          status: "novo",
          status_kanban: "triagem_interesse",
          localizacao_kanban: "triagem_interesse",
          titulo: r.numero_precatorio
            ? `Precatório ${r.numero_precatorio} - ${r.credor_nome ?? "Credor"}`
            : `Lead - ${r.credor_nome ?? "Credor"}`,
          origem: "atendimento",
          status_atendimento: "na_fila",
          responsavel: responsavelId,
          dono_usuario_id: responsavelId,
          distribuido_por_admin: true,
          distribuido_por_admin_id: user.id,
          distribuido_por_admin_em: nowIso,
        }
      })

      // Inserir em lotes de 50
      for (let i = 0; i < payloads.length; i += 50) {
        const lote = payloads.slice(i, i + 50)
        const { error } = await supabase.from("precatorios").insert(lote as never)
        if (error) throw new Error(`Erro no lote ${i / 50 + 1}: ${error.message}`)
      }

      toast.success(`${paraImportar.length} créditos importados para a fila de atendimento.`)
      onSuccess()
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSalvando(false)
    }
  }

  const contadores = {
    validos: registros.filter((r) => r._status === "valido").length,
    incompletos: registros.filter((r) => r._status === "incompleto").length,
    duplicatas: registros.filter((r) => r._status === "duplicata").length,
    pulados: registros.filter((r) => r._status === "pulado").length,
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Importação em Lote — Setor de Atendimento</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Envie arquivos, revise os dados extraidos e confirme os registros antes da importacao.
            </DialogDescription>
            <div className="flex gap-2 mt-2">
              {(["upload", "processando", "revisao"] as Etapa[]).map((e, i) => (
                <div key={e} className="flex items-center gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${etapa === e ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}. {e === "upload" ? "Upload" : e === "processando" ? "Processando" : "Revisão"}
                  </span>
                  {i < 2 && <span className="text-muted-foreground text-xs">→</span>}
                </div>
              ))}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* ── ETAPA 1: UPLOAD ── */}
            {etapa === "upload" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {(["pdf", "excel"] as Modo[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setModo(m); setArquivos([]); if (inputRef.current) inputRef.current.value = "" }}
                      className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all ${modo === m ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      {m === "pdf" ? <FileText className="h-10 w-10 text-red-500" /> : <FileSpreadsheet className="h-10 w-10 text-green-600" />}
                      <div className="text-center">
                        <p className="font-semibold">{m === "pdf" ? "Ofícios Requisitórios (PDF)" : "Planilha Excel / CSV"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {m === "pdf" ? "Um ou múltiplos PDFs — extração via GPT-4o" : "Mapeamento automático de colunas via GPT-4o"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {modo && (
                  <div className="space-y-3">
                    <div
                      className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-10 cursor-pointer hover:border-primary/60 transition-colors"
                      onClick={() => inputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {modo === "pdf"
                          ? "Clique para selecionar PDFs (múltiplos permitidos)"
                          : "Clique para selecionar a planilha (.xlsx, .xls, .csv)"}
                      </p>
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      className="hidden"
                      multiple={modo === "pdf"}
                      accept={modo === "pdf" ? ".pdf" : ".xlsx,.xls,.csv"}
                      onChange={handleFileSelect}
                    />

                    {arquivos.length > 0 && (
                      <div className="space-y-2">
                        {arquivos.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate">{f.name}</span>
                            <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                            <button type="button" onClick={() => removerArquivo(i)} className="text-muted-foreground hover:text-destructive">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── ETAPA 2: PROCESSANDO ── */}
            {etapa === "processando" && (
              <div className="flex flex-col items-center justify-center gap-6 py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="w-full max-w-sm space-y-2 text-center">
                  <p className="font-medium">Processando com GPT-4o...</p>
                  <p className="text-sm text-muted-foreground">
                    {progresso.concluidos} de {progresso.total} arquivo(s)
                  </p>
                  <Progress value={(progresso.concluidos / Math.max(progresso.total, 1)) * 100} className="h-2" />
                </div>
              </div>
            )}

            {/* ── ETAPA 3: REVISÃO ── */}
            {etapa === "revisao" && (
              <div className="space-y-4">
                {/* Mapeamento Excel */}
                {mostrarMapeamento && headersExcel.length > 0 && (
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Mapeamento de Colunas (Excel)</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={reaplicarMapeamento}>
                          Reaplicar Mapeamento
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setMostrarMapeamento(false)}>Ocultar</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {headersExcel.map((header) => (
                        <div key={header} className="flex items-center gap-2 text-sm">
                          <span className="truncate font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{header}</span>
                          <span className="text-muted-foreground">→</span>
                          <Select
                            value={mapeamento[header] ?? "_ignorar"}
                            onValueChange={(v) => setMapeamento((prev) => ({ ...prev, [header]: v === "_ignorar" ? null : v }))}
                          >
                            <SelectTrigger className="h-7 text-xs flex-1">
                              <SelectValue placeholder="(ignorar)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_ignorar">— ignorar —</SelectItem>
                              {Object.entries(CAMPOS_SISTEMA).map(([k, label]) => (
                                <SelectItem key={k} value={k}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumo */}
                <div className="flex flex-wrap gap-3 text-sm">
                  <Badge className="bg-green-100 text-green-800">{contadores.validos} válidos</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">{contadores.incompletos} incompletos</Badge>
                  <Badge className="bg-red-100 text-red-800">{contadores.duplicatas} duplicatas</Badge>
                  {contadores.pulados > 0 && <Badge variant="secondary">{contadores.pulados} pulados</Badge>}
                  {errosProcessamento.length > 0 && (
                    <Badge variant="destructive">{errosProcessamento.length} erros de extração</Badge>
                  )}
                  <span className="text-muted-foreground ml-auto">{selecionados.size} selecionados</span>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Distribuição automática do lote</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Escolha a tag e os operadores que receberão os créditos ainda durante a importação.
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {registrosSelecionados.length} registro(s) na rodada
                    </Badge>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label>Tag Operacional</Label>
                        <select
                          value={operatorTagFilter}
                          onChange={(e) => {
                            setOperatorTagFilter(e.target.value as OperatorTag | "todos")
                            setSelectedOperatorIds([])
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="todos">Todos os operadores</option>
                          {OPERATOR_TAG_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOperatorIds(operadoresElegiveis.map((operador) => operador.id))}
                          disabled={operadoresElegiveis.length === 0}
                        >
                          Selecionar visíveis
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedOperatorIds([])}
                          disabled={selectedOperatorIds.length === 0}
                        >
                          Limpar
                        </Button>
                      </div>

                      <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border bg-background p-3">
                        {loadingUsuarios ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : operadoresElegiveis.length === 0 ? (
                          <p className="py-4 text-center text-xs text-muted-foreground">
                            Nenhum operador comercial encontrado para essa tag.
                          </p>
                        ) : (
                          operadoresElegiveis.map((operador) => (
                            <label key={operador.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={selectedOperatorIds.includes(operador.id)}
                                onChange={() => toggleOperatorSelection(operador.id)}
                                className="cursor-pointer"
                              />
                              <span className="flex-1 truncate">{operador.nome}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedOperatorIds.length === 0 ? (
                          <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2">
                            Selecione pelo menos um operador para montar a distribuição.
                          </div>
                        ) : (
                          selectedOperatorIds.map((operatorId) => {
                            const operador = operadoresElegiveis.find((item) => item.id === operatorId) ?? usuarios.find((item) => item.id === operatorId)
                            const count = distribuicaoPreview?.counts[operatorId] ?? 0
                            const sum = distribuicaoPreview?.sums[operatorId] ?? 0

                            return (
                              <div key={operatorId} className="rounded-lg border bg-background px-4 py-3">
                                <p className="text-sm font-semibold">{operador?.nome || "Operador"}</p>
                                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{count} crédito(s)</span>
                                  <span>R$ {sum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>

                      <div className="rounded-lg border bg-background px-4 py-3 text-xs text-muted-foreground">
                        {distribuicaoPreview ? (
                          <span>
                            Total desta rodada: R$ {distribuicaoPreview.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
                            A distribuição é balanceada automaticamente pelo valor principal informado em cada registro.
                          </span>
                        ) : (
                          <span>
                            O lote só poderá ser importado depois que pelo menos um operador estiver selecionado.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {errosProcessamento.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                    {errosProcessamento.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">{e}</p>
                    ))}
                  </div>
                )}

                {/* Tabela */}
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="p-2 w-8">
                          <input type="checkbox" onChange={toggleTodos} className="cursor-pointer" />
                        </th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-left min-w-[160px]">Credor</th>
                        <th className="p-2 text-left min-w-[120px]">CPF/CNPJ</th>
                        <th className="p-2 text-left min-w-[140px]">Nº Precatório</th>
                        <th className="p-2 text-left min-w-[140px]">Nº Processo</th>
                        <th className="p-2 text-left min-w-[80px]">Tribunal</th>
                        <th className="p-2 text-left min-w-[100px]">Valor Principal</th>
                        <th className="p-2 text-left min-w-[80px]">Arquivo</th>
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrosPagina.map((reg) => (
                        <tr
                          key={reg._id}
                          className={`border-b transition-colors ${
                            reg._status === "pulado"
                              ? "opacity-40 bg-muted/20"
                              : reg._status === "duplicata"
                              ? "bg-amber-50 dark:bg-amber-900/10"
                              : reg._status === "incompleto"
                              ? "bg-yellow-50/50 dark:bg-yellow-900/5"
                              : ""
                          }`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={selecionados.has(reg._id)}
                              onChange={() => toggleSelecao(reg._id)}
                              disabled={reg._status === "pulado"}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="p-2">
                            {reg._status === "valido" && <span className="text-green-600">✓</span>}
                            {reg._status === "incompleto" && <span title="Campos obrigatórios faltando" className="text-yellow-600">⚠</span>}
                            {reg._status === "duplicata" && (
                              <button
                                type="button"
                                onClick={() => setModalDuplicata({ aberto: true, registro: reg })}
                                className="text-red-600 hover:underline"
                                title="Ver detalhes da duplicata"
                              >
                                dup.
                              </button>
                            )}
                            {reg._status === "pulado" && <span className="text-muted-foreground">—</span>}
                            {reg._qualidade === "pobre" && (
                              <span title="Qualidade de extração baixa">
                                <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-500" />
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-6 text-xs px-1"
                              value={reg.credor_nome ?? ""}
                              onChange={(e) => atualizarCampo(reg._id, "credor_nome", e.target.value)}
                              disabled={reg._status === "pulado"}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-6 text-xs px-1"
                              value={reg.credor_cpf_cnpj ?? ""}
                              onChange={(e) => atualizarCampo(reg._id, "credor_cpf_cnpj", e.target.value)}
                              disabled={reg._status === "pulado"}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-6 text-xs px-1"
                              value={reg.numero_precatorio ?? ""}
                              onChange={(e) => atualizarCampo(reg._id, "numero_precatorio", e.target.value)}
                              disabled={reg._status === "pulado"}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-6 text-xs px-1"
                              value={reg.numero_processo ?? ""}
                              onChange={(e) => atualizarCampo(reg._id, "numero_processo", e.target.value)}
                              disabled={reg._status === "pulado"}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-6 text-xs px-1 w-20"
                              value={reg.tribunal ?? ""}
                              onChange={(e) => atualizarCampo(reg._id, "tribunal", e.target.value)}
                              disabled={reg._status === "pulado"}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-6 text-xs px-1"
                              type="number"
                              value={reg.valor_principal ?? ""}
                              onChange={(e) => atualizarCampo(reg._id, "valor_principal", e.target.value)}
                              disabled={reg._status === "pulado"}
                            />
                          </td>
                          <td className="p-2 text-muted-foreground truncate max-w-[80px]" title={reg.arquivo}>
                            {reg.arquivo.split("/").pop()}
                          </td>
                          <td className="p-2">
                            {reg._status !== "pulado" && (
                              <button
                                type="button"
                                onClick={() => pularRegistro(reg._id)}
                                className="text-muted-foreground hover:text-destructive"
                                title="Pular este registro"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <Button variant="outline" size="sm" onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))} disabled={paginaAtual === 1}>
                      Anterior
                    </Button>
                    <span className="text-muted-foreground">Página {paginaAtual} de {totalPaginas}</span>
                    <Button variant="outline" size="sm" onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas}>
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="shrink-0 border-t px-6 py-4 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={handleClose} disabled={salvando}>
              Cancelar
            </Button>
            <div className="flex gap-2">
              {etapa === "upload" && (
                <Button onClick={iniciarProcessamento} disabled={arquivos.length === 0 || !modo}>
                  <Upload className="mr-2 h-4 w-4" />
                  Processar
                </Button>
              )}
              {etapa === "revisao" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const validos = registros.filter((r) => r._status === "valido")
                      setSelecionados(new Set(validos.map((r) => r._id)))
                    }}
                  >
                    Selecionar Válidos
                  </Button>
                  <Button
                    onClick={salvarImportacao}
                    disabled={salvando || selecionados.size === 0 || selectedOperatorIds.length === 0}
                  >
                    {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Importar {selecionados.size > 0 ? `(${selecionados.size})` : ""}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {modalDuplicata.registro && (
        <ModalDuplicata
          open={modalDuplicata.aberto}
          onOpenChange={(v) => setModalDuplicata((prev) => ({ ...prev, aberto: v }))}
          duplicata={modalDuplicata.registro._duplicataInfo!}
          onPular={() => {
            pularRegistro(modalDuplicata.registro!._id)
            setModalDuplicata({ aberto: false, registro: null })
          }}
          onImportarMesmo={() => {
            setSelecionados((prev) => new Set([...prev, modalDuplicata.registro!._id]))
            setModalDuplicata({ aberto: false, registro: null })
          }}
        />
      )}
    </>
  )
}
