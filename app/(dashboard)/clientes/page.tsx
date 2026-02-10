"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, User, MapPin, Phone, Mail, FileText, ChevronRight, Calculator, Clock, Filter, X } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { CredorView, Precatorio } from "@/lib/types/database"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { toast } from "sonner"

type PrecatorioResumo = Precatorio & {
  status_kanban?: string | null
  localizacao_kanban?: string | null
  dono_usuario_id?: string | null
  responsavel?: string | null
}

type CredorResumo = CredorView & {
  valor_total_atualizado: number
  ultimo_status: string | null
  ultimo_precatorio_valor: number
}

type ClientesAdminFilters = {
  status?: string[]
  cidade?: string
  uf?: string
  carteiraMin?: number
  carteiraMax?: number
  qtdMin?: number
  qtdMax?: number
  ultimaMovInicio?: string
  ultimaMovFim?: string
  apenasComContato?: boolean
}

type ClienteFilterChip = {
  key: string
  label: string
  value: string
}

const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

const parseDateStart = (value?: string) => {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00.000`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const parseDateEnd = (value?: string) => {
  if (!value) return null
  const parsed = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatStatusLabel = (value?: string | null) => {
  if (!value) return "N/I"
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const normalizeAdminFilters = (filters: ClientesAdminFilters): ClientesAdminFilters => {
  const next: ClientesAdminFilters = { ...filters }
  next.cidade = next.cidade?.trim() || undefined
  next.uf = next.uf?.trim().toUpperCase() || undefined
  next.status = next.status?.filter(Boolean) || undefined

  const normalizeNumber = (value?: number) =>
    value === undefined || value === null || Number.isNaN(Number(value)) ? undefined : Number(value)

  next.carteiraMin = normalizeNumber(next.carteiraMin)
  next.carteiraMax = normalizeNumber(next.carteiraMax)
  next.qtdMin = normalizeNumber(next.qtdMin)
  next.qtdMax = normalizeNumber(next.qtdMax)

  if (
    next.carteiraMin !== undefined &&
    next.carteiraMax !== undefined &&
    next.carteiraMin > next.carteiraMax
  ) {
    const temp = next.carteiraMin
    next.carteiraMin = next.carteiraMax
    next.carteiraMax = temp
  }

  if (next.qtdMin !== undefined && next.qtdMax !== undefined && next.qtdMin > next.qtdMax) {
    const temp = next.qtdMin
    next.qtdMin = next.qtdMax
    next.qtdMax = temp
  }

  const start = parseDateStart(next.ultimaMovInicio)
  const end = parseDateEnd(next.ultimaMovFim)
  if (start && end && start > end) {
    const temp = next.ultimaMovInicio
    next.ultimaMovInicio = next.ultimaMovFim
    next.ultimaMovFim = temp
  }

  next.apenasComContato = next.apenasComContato ? true : undefined

  return next
}

const matchesClientesAdvancedFilters = (credor: CredorResumo, filters: ClientesAdminFilters) => {
  if (filters.status && filters.status.length > 0) {
    const statusAtual = credor.ultimo_status || ""
    if (!filters.status.includes(statusAtual)) return false
  }

  if (filters.cidade) {
    const cidade = normalizeText(credor.cidade)
    if (!cidade.includes(normalizeText(filters.cidade))) return false
  }

  if (filters.uf) {
    if ((credor.uf || "").toUpperCase() !== filters.uf.toUpperCase()) return false
  }

  const carteira = Number(credor.valor_total_atualizado || credor.valor_total_principal || 0)
  if (filters.carteiraMin !== undefined && carteira < filters.carteiraMin) return false
  if (filters.carteiraMax !== undefined && carteira > filters.carteiraMax) return false

  const quantidade = Number(credor.total_precatorios || 0)
  if (filters.qtdMin !== undefined && quantidade < filters.qtdMin) return false
  if (filters.qtdMax !== undefined && quantidade > filters.qtdMax) return false

  if (filters.apenasComContato) {
    const hasContato = Boolean((credor.telefone || "").trim() || (credor.email || "").trim())
    if (!hasContato) return false
  }

  if (filters.ultimaMovInicio || filters.ultimaMovFim) {
    const ultimaMov = credor.ultimo_precatorio_data ? new Date(credor.ultimo_precatorio_data) : null
    if (!ultimaMov || Number.isNaN(ultimaMov.getTime())) return false

    const inicio = parseDateStart(filters.ultimaMovInicio)
    const fim = parseDateEnd(filters.ultimaMovFim)
    if (inicio && ultimaMov < inicio) return false
    if (fim && ultimaMov > fim) return false
  }

  return true
}

const getAdminFilterChips = (filters: ClientesAdminFilters): ClienteFilterChip[] => {
  const chips: ClienteFilterChip[] = []

  if (filters.status && filters.status.length > 0) {
    chips.push({
      key: "status",
      label: "Status",
      value: filters.status.map((status) => formatStatusLabel(status)).join(", "),
    })
  }

  if (filters.cidade) {
    chips.push({ key: "cidade", label: "Cidade", value: filters.cidade })
  }

  if (filters.uf) {
    chips.push({ key: "uf", label: "UF", value: filters.uf })
  }

  if (filters.carteiraMin !== undefined || filters.carteiraMax !== undefined) {
    chips.push({
      key: "carteira",
      label: "Carteira",
      value: `${filters.carteiraMin !== undefined ? `R$ ${filters.carteiraMin.toLocaleString("pt-BR")}` : "..."} até ${
        filters.carteiraMax !== undefined ? `R$ ${filters.carteiraMax.toLocaleString("pt-BR")}` : "..."
      }`,
    })
  }

  if (filters.qtdMin !== undefined || filters.qtdMax !== undefined) {
    chips.push({
      key: "qtd",
      label: "Qtd. Precatórios",
      value: `${filters.qtdMin ?? "..."} até ${filters.qtdMax ?? "..."}`,
    })
  }

  if (filters.ultimaMovInicio || filters.ultimaMovFim) {
    chips.push({
      key: "ultimaMov",
      label: "Última mov.",
      value: `${filters.ultimaMovInicio ? new Date(`${filters.ultimaMovInicio}T00:00:00`).toLocaleDateString("pt-BR") : "..."} até ${
        filters.ultimaMovFim ? new Date(`${filters.ultimaMovFim}T00:00:00`).toLocaleDateString("pt-BR") : "..."
      }`,
    })
  }

  if (filters.apenasComContato) {
    chips.push({
      key: "apenasComContato",
      label: "Contato",
      value: "Somente com contato",
    })
  }

  return chips
}

export default function ClientsPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [credores, setCredores] = useState<CredorResumo[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // role pode vir como string ou array (evita includes quebrar)
  const roles = useMemo(() => {
    const r = profile?.role as string | string[] | undefined
    return Array.isArray(r) ? r : r ? [r] : []
  }, [profile?.role])

  const isAdmin = roles.includes("admin")

  // Modal states
  const [selectedCredor, setSelectedCredor] = useState<CredorResumo | null>(null)
  const [credorForm, setCredorForm] = useState<Partial<CredorResumo>>({})
  const [credorPrecatorios, setCredorPrecatorios] = useState<Precatorio[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCredor, setEditingCredor] = useState(false)
  const [savingCredor, setSavingCredor] = useState(false)
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [adminFilters, setAdminFilters] = useState<ClientesAdminFilters>({})
  const [adminFiltersDraft, setAdminFiltersDraft] = useState<ClientesAdminFilters>({})

  useEffect(() => {
    if (!isAdmin) {
      setAdminFilters({})
      setAdminFiltersDraft({})
    }
  }, [isAdmin])

  useEffect(() => {
    if (!advancedFiltersOpen) return
    setAdminFiltersDraft(adminFilters)
  }, [advancedFiltersOpen, adminFilters])

  useEffect(() => {
    if (!profile?.id) return
    loadCredores()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, isAdmin])

  function aggregateCredores(items: PrecatorioResumo[]): CredorResumo[] {
    const map = new Map<string, CredorResumo>()

    items.forEach((precatorio) => {
      const cpf = precatorio.credor_cpf_cnpj?.trim() || null
      const nome = (precatorio.credor_nome || "Credor sem nome").trim()
      const cidade = precatorio.credor_cidade || null
      const uf = precatorio.credor_uf || null
      const telefone = precatorio.credor_telefone || null
      const email = precatorio.credor_email || null

      const key =
        cpf && !cpf.startsWith("SEM_CPF") ? `cpf:${cpf}` : `nome:${nome}|${cidade || ""}|${uf || ""}`

      const valorPrincipal = Number(precatorio.valor_principal || 0)
      const valorAtualizado = Number(precatorio.valor_atualizado || precatorio.valor_principal || 0)
      const dataUltimo = precatorio.updated_at || precatorio.created_at || null
      const statusAtual = precatorio.status_kanban || precatorio.localizacao_kanban || precatorio.status || null

      if (!map.has(key)) {
        map.set(key, {
          id_unico: key,
          credor_nome: nome,
          credor_cpf_cnpj: cpf,
          cidade,
          uf,
          telefone,
          email,
          total_precatorios: 0,
          valor_total_principal: 0,
          valor_total_atualizado: 0,
          ultimo_precatorio_data: null,
          ultimo_status: null,
          ultimo_precatorio_valor: 0,
        })
      }

      const entry = map.get(key)!
      entry.total_precatorios += 1
      entry.valor_total_principal += valorPrincipal
      entry.valor_total_atualizado += valorAtualizado

      if (!entry.telefone && telefone) entry.telefone = telefone
      if (!entry.email && email) entry.email = email
      if (!entry.cidade && cidade) entry.cidade = cidade
      if (!entry.uf && uf) entry.uf = uf

      if (!entry.ultimo_precatorio_data || (dataUltimo && new Date(dataUltimo) > new Date(entry.ultimo_precatorio_data))) {
        entry.ultimo_precatorio_data = dataUltimo
        entry.ultimo_precatorio_valor = valorAtualizado
        entry.ultimo_status = statusAtual
      }
    })

    return Array.from(map.values()).sort((a, b) => b.valor_total_atualizado - a.valor_total_atualizado)
  }

  async function loadCredores() {
    setLoading(true)
    try {
      const supabase = getSupabase()
      if (!supabase) {
        setLoading(false)
        return
      }

      let query = supabase
        .from("precatorios")
        .select(
          "id, credor_nome, credor_cpf_cnpj, credor_cidade, credor_uf, credor_telefone, credor_email, valor_principal, valor_atualizado, status, status_kanban, localizacao_kanban, created_at, updated_at, dono_usuario_id, responsavel"
        )
        .order("updated_at", { ascending: false })

      if (!isAdmin && profile?.id) {
        query = query.or(`dono_usuario_id.eq.${profile.id},responsavel.eq.${profile.id}`)
      }

      const { data, error } = await query

      if (error) {
        console.error("Erro ao carregar credores:", error)
        setCredores([])
        return
      }

      setCredores(aggregateCredores((data || []) as PrecatorioResumo[]))
    } catch (error) {
      console.error("Erro:", error)
    } finally {
      setLoading(false)
    }
  }

  async function openCredorDetails(credor: CredorResumo) {
    setSelectedCredor(credor)
    setCredorForm({
      credor_nome: credor.credor_nome,
      credor_cpf_cnpj: credor.credor_cpf_cnpj,
      telefone: credor.telefone,
      email: credor.email,
      cidade: credor.cidade,
      uf: credor.uf,
    })
    setEditingCredor(false)
    setModalOpen(true)
    setLoadingDetails(true)

    try {
      const supabase = getSupabase()
      if (!supabase) {
        setLoadingDetails(false)
        return
      }

      let query = supabase.from("precatorios").select("*").order("created_at", { ascending: false })

      if (!isAdmin && profile?.id) {
        query = query.or(`dono_usuario_id.eq.${profile.id},responsavel.eq.${profile.id}`)
      }

      if (credor.credor_cpf_cnpj && !credor.credor_cpf_cnpj.startsWith("SEM_CPF")) {
        query = query.eq("credor_cpf_cnpj", credor.credor_cpf_cnpj)
      } else {
        query = query.eq("credor_nome", credor.credor_nome)
      }

      const { data, error } = await query
      if (error) throw error

      setCredorPrecatorios(data || [])
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error)
    } finally {
      setLoadingDetails(false)
    }
  }

  async function handleSaveCredor() {
    if (!selectedCredor) return
    const nome = (credorForm.credor_nome || "").trim()
    if (!nome) {
      toast.error("Informe o nome do cliente.")
      return
    }

    const payload = {
      credor_nome: nome,
      credor_cpf_cnpj: credorForm.credor_cpf_cnpj || null,
      credor_telefone: credorForm.telefone || null,
      credor_email: credorForm.email || null,
      credor_cidade: credorForm.cidade || null,
      credor_uf: credorForm.uf || null,
      updated_at: new Date().toISOString(),
    }

    setSavingCredor(true)
    try {
      const supabase = getSupabase()
      if (!supabase) return

      let query = supabase.from("precatorios").update(payload)

      if (selectedCredor.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")) {
        query = query.eq("credor_cpf_cnpj", selectedCredor.credor_cpf_cnpj)
      } else {
        query = query.eq("credor_nome", selectedCredor.credor_nome)
        if (selectedCredor.cidade) query = query.eq("credor_cidade", selectedCredor.cidade)
        if (selectedCredor.uf) query = query.eq("credor_uf", selectedCredor.uf)
      }

      const { error } = await query
      if (error) throw error

      toast.success("Dados do cliente atualizados.")
      setEditingCredor(false)
      await loadCredores()

      const updatedCredor: CredorResumo = {
        ...selectedCredor,
        credor_nome: payload.credor_nome,
        credor_cpf_cnpj: payload.credor_cpf_cnpj,
        telefone: payload.credor_telefone,
        email: payload.credor_email,
        cidade: payload.credor_cidade,
        uf: payload.credor_uf,
      }
      await openCredorDetails(updatedCredor)
    } catch (error: unknown) {
      console.error("Erro ao atualizar cliente:", error)
      const message = error instanceof Error ? error.message : "Erro ao atualizar cliente."
      toast.error(message)
    } finally {
      setSavingCredor(false)
    }
  }

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(credores.map((credor) => credor.ultimo_status).filter(Boolean) as string[])).sort((a, b) =>
        formatStatusLabel(a).localeCompare(formatStatusLabel(b), "pt-BR")
      ),
    [credores]
  )

  const ufOptions = useMemo(
    () =>
      Array.from(new Set(credores.map((credor) => (credor.uf || "").toUpperCase()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [credores]
  )

  const searchedCredores = useMemo(() => {
    const term = normalizeText(searchTerm)
    if (!term) return credores

    return credores.filter((credor) => {
      const matchesNome = normalizeText(credor.credor_nome).includes(term)
      const matchesCpf = (credor.credor_cpf_cnpj || "").includes(searchTerm.trim())
      const matchesCidade = normalizeText(credor.cidade).includes(term)
      const matchesStatus = normalizeText(credor.ultimo_status).includes(term)
      const matchesEmail = normalizeText(credor.email).includes(term)
      const matchesTelefone = normalizeText(credor.telefone).includes(term)
      return matchesNome || matchesCpf || matchesCidade || matchesStatus || matchesEmail || matchesTelefone
    })
  }, [credores, searchTerm])

  const filteredCredores = useMemo(
    () =>
      isAdmin ? searchedCredores.filter((credor) => matchesClientesAdvancedFilters(credor, adminFilters)) : searchedCredores,
    [isAdmin, searchedCredores, adminFilters]
  )

  const adminFilterChips = useMemo(() => getAdminFilterChips(adminFilters), [adminFilters])
  const totalAdminFilters = adminFilterChips.length

  const updateDraftNumberFilter = (key: keyof ClientesAdminFilters, rawValue: string) => {
    const normalized = rawValue.replace(",", ".")
    const parsed = Number(normalized)
    setAdminFiltersDraft((prev) => ({
      ...prev,
      [key]: rawValue === "" || Number.isNaN(parsed) ? undefined : parsed,
    }))
  }

  const toggleDraftStatus = (status: string) => {
    setAdminFiltersDraft((prev) => {
      const current = prev.status || []
      const nextStatus = current.includes(status) ? current.filter((item) => item !== status) : [...current, status]
      return {
        ...prev,
        status: nextStatus.length > 0 ? nextStatus : undefined,
      }
    })
  }

  const applyAdminFilters = () => {
    setAdminFilters(normalizeAdminFilters(adminFiltersDraft))
    setAdvancedFiltersOpen(false)
  }

  const clearAdminFilters = () => {
    setAdminFilters({})
    setAdminFiltersDraft({})
    setAdvancedFiltersOpen(false)
  }

  const removeAdminFilter = (key: string) => {
    setAdminFilters((prev) => {
      const next = { ...prev }
      switch (key) {
        case "status":
          delete next.status
          break
        case "cidade":
          delete next.cidade
          break
        case "uf":
          delete next.uf
          break
        case "carteira":
          delete next.carteiraMin
          delete next.carteiraMax
          break
        case "qtd":
          delete next.qtdMin
          delete next.qtdMax
          break
        case "ultimaMov":
          delete next.ultimaMovInicio
          delete next.ultimaMovFim
          break
        case "apenasComContato":
          delete next.apenasComContato
          break
        default:
          break
      }
      return normalizeAdminFilters(next)
    })
  }

  const resumo = useMemo(() => {
    let totalCarteira = 0
    let totalPrecatorios = 0
    let ultimaAtualizacao: string | null = null

    credores.forEach((credor) => {
      totalCarteira += credor.valor_total_atualizado || credor.valor_total_principal || 0
      totalPrecatorios += credor.total_precatorios || 0
      if (credor.ultimo_precatorio_data) {
        if (!ultimaAtualizacao || new Date(credor.ultimo_precatorio_data) > new Date(ultimaAtualizacao)) {
          ultimaAtualizacao = credor.ultimo_precatorio_data
        }
      }
    })

    return { totalCarteira, totalPrecatorios, ultimaAtualizacao }
  }, [credores])

  const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })

  const formatStatus = formatStatusLabel

  const statusClass = (value?: string | null) => {
    switch (value) {
      case "proposta_negociacao":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30"
      case "proposta_aceita":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30"
      case "calculo_andamento":
      case "em_calculo":
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/30"
      case "analise_processual_inicial":
        return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-500/30"
      default:
        return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-700/25 dark:text-zinc-200 dark:border-zinc-700/40"
    }
  }

  return (
    <div className="w-full max-w-[100vw] px-4 lg:px-6 py-6 space-y-8">
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Clientes</h1>
          <p className="text-muted-foreground">Base consolidada de credores e histórico de processos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 px-4 py-3 rounded-xl dark:bg-zinc-900/70 dark:border-zinc-800/60">
            <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase">Total de Clientes</span>
              <span className="text-xl font-bold text-orange-700 dark:text-orange-300">{credores.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 px-4 py-3 rounded-xl dark:bg-zinc-900/70 dark:border-zinc-800/60">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Total de Precatórios</span>
              <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{resumo.totalPrecatorios}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl dark:bg-zinc-900/70 dark:border-zinc-800/60">
            <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Carteira Atualizada</span>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                R$ {formatCurrency(resumo.totalCarteira)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Card className="border border-zinc-200/70 dark:border-zinc-800/60 bg-white/90 dark:bg-zinc-900/70 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="w-full md:max-w-2xl flex items-center gap-2">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF/CNPJ, cidade ou status..."
                  className="pl-9 w-full bg-white/80 dark:bg-zinc-900/70"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  className="whitespace-nowrap"
                  onClick={() => setAdvancedFiltersOpen(true)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {totalAdminFilters > 0 ? `Filtros (${totalAdminFilters})` : "Filtros avançados"}
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground md:ml-auto">
              {resumo.ultimaAtualizacao ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Última atualização: {new Date(resumo.ultimaAtualizacao).toLocaleDateString("pt-BR")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Última atualização: —
                </span>
              )}
            </div>
          </div>

          {isAdmin && adminFilterChips.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Filtros:
              </span>
              {adminFilterChips.map((chip) => (
                <Badge key={chip.key} variant="secondary" className="flex items-center gap-1.5 px-2.5 py-1">
                  <span className="font-semibold">{chip.label}:</span>
                  <span>{chip.value}</span>
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive transition-colors"
                    onClick={() => removeAdminFilter(chip.key)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAdminFilters}>
                Limpar
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="border-t border-zinc-200/60 dark:border-zinc-800/60">
              {/* ✅ aqui está o “fix” principal: scroll horizontal para não cortar colunas */}
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <TableRow className="border-b border-zinc-200/60 dark:border-zinc-800/60">
                      <TableHead className="whitespace-nowrap">Credor</TableHead>
                      <TableHead className="whitespace-nowrap">Status atual</TableHead>
                      <TableHead className="hidden md:table-cell whitespace-nowrap">Contatos</TableHead>
                      <TableHead className="hidden lg:table-cell whitespace-nowrap">Última mov.</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Qtd. Precatórios</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Carteira atualizada</TableHead>
                      <TableHead className="w-[70px]" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredCredores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          Nenhum cliente encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCredores.map((credor) => (
                        <TableRow
                          key={credor.id_unico}
                          className="cursor-pointer hover:bg-muted/40 dark:hover:bg-zinc-800/30 transition-colors"
                          onClick={() => openCredorDetails(credor)}
                        >
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-0.5 max-w-[420px]">
                              <span className="font-medium truncate">{credor.credor_nome}</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {credor.credor_cpf_cnpj && !credor.credor_cpf_cnpj.startsWith("SEM_CPF")
                                  ? credor.credor_cpf_cnpj
                                  : "CPF não informado"}
                              </span>
                              {credor.cidade && (
                                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 truncate">
                                  <MapPin className="h-3 w-3" /> {credor.cidade}/{credor.uf}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className={`whitespace-nowrap ${statusClass(credor.ultimo_status)}`}>
                              {formatStatus(credor.ultimo_status)}
                            </Badge>
                          </TableCell>

                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-col gap-1 min-w-[220px]">
                              {credor.telefone ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" /> <span className="truncate">{credor.telefone}</span>
                                </div>
                              ) : null}
                              {credor.email ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3" /> <span className="truncate">{credor.email}</span>
                                </div>
                              ) : null}
                              {!credor.telefone && !credor.email ? <span className="text-muted-foreground">-</span> : null}
                            </div>
                          </TableCell>

                          <TableCell className="hidden lg:table-cell">
                            {credor.ultimo_precatorio_data ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                                <Clock className="h-3 w-3" />
                                {new Date(credor.ultimo_precatorio_data).toLocaleDateString("pt-BR")}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono whitespace-nowrap">
                              {credor.total_precatorios}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="min-w-[220px]">
                              <div className="font-semibold text-emerald-600 whitespace-nowrap">
                                {credor.valor_total_atualizado ? `R$ ${formatCurrency(credor.valor_total_atualizado)}` : "R$ 0,00"}
                              </div>
                              {credor.ultimo_precatorio_valor ? (
                                <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                                  Último: R$ {formatCurrency(credor.ultimo_precatorio_valor)}
                                </div>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                openCredorDetails(credor)
                              }}
                              aria-label="Abrir detalhes do cliente"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* dica visual de scroll (só aparece quando precisa) */}
              <div className="px-4 py-2 text-[11px] text-muted-foreground border-t border-zinc-200/60 dark:border-zinc-800/60">
                Dica: se a tabela ficar maior que a tela, role horizontalmente para ver todas as colunas.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Dialog open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Filtros avançados de clientes</DialogTitle>
              <DialogDescription>Disponível somente para administrador.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Status atual</Label>
                {statusOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem status disponíveis.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {statusOptions.map((status) => (
                      <label
                        key={status}
                        className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={adminFiltersDraft.status?.includes(status) || false}
                          onCheckedChange={() => toggleDraftStatus(status)}
                        />
                        <span>{formatStatus(status)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={adminFiltersDraft.cidade || ""}
                    onChange={(e) =>
                      setAdminFiltersDraft((prev) => ({
                        ...prev,
                        cidade: e.target.value || undefined,
                      }))
                    }
                    placeholder="Ex: Curitiba"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input
                    value={adminFiltersDraft.uf || ""}
                    onChange={(e) =>
                      setAdminFiltersDraft((prev) => ({
                        ...prev,
                        uf: e.target.value.toUpperCase() || undefined,
                      }))
                    }
                    placeholder="Ex: PR"
                    maxLength={2}
                  />
                  {ufOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ufOptions.map((uf) => {
                        const isSelected = adminFiltersDraft.uf === uf
                        return (
                          <button
                            key={uf}
                            type="button"
                            className={`rounded border px-2 py-0.5 text-xs transition ${
                              isSelected
                                ? "border-primary/40 bg-primary/10 text-foreground"
                                : "border-border/60 hover:bg-muted/50"
                            }`}
                            onClick={() =>
                              setAdminFiltersDraft((prev) => ({
                                ...prev,
                                uf: prev.uf === uf ? undefined : uf,
                              }))
                            }
                          >
                            {uf}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Carteira mínima</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adminFiltersDraft.carteiraMin ?? ""}
                    onChange={(e) => updateDraftNumberFilter("carteiraMin", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carteira máxima</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={adminFiltersDraft.carteiraMax ?? ""}
                    onChange={(e) => updateDraftNumberFilter("carteiraMax", e.target.value)}
                    placeholder="9999999,99"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Qtd. mínima de precatórios</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={adminFiltersDraft.qtdMin ?? ""}
                    onChange={(e) => updateDraftNumberFilter("qtdMin", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Qtd. máxima de precatórios</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={adminFiltersDraft.qtdMax ?? ""}
                    onChange={(e) => updateDraftNumberFilter("qtdMax", e.target.value)}
                    placeholder="999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Última movimentação (de)</Label>
                  <Input
                    type="date"
                    value={adminFiltersDraft.ultimaMovInicio || ""}
                    onChange={(e) =>
                      setAdminFiltersDraft((prev) => ({
                        ...prev,
                        ultimaMovInicio: e.target.value || undefined,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Última movimentação (até)</Label>
                  <Input
                    type="date"
                    value={adminFiltersDraft.ultimaMovFim || ""}
                    onChange={(e) =>
                      setAdminFiltersDraft((prev) => ({
                        ...prev,
                        ultimaMovFim: e.target.value || undefined,
                      }))
                    }
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={adminFiltersDraft.apenasComContato || false}
                  onCheckedChange={(checked) =>
                    setAdminFiltersDraft((prev) => ({
                      ...prev,
                      apenasComContato: checked ? true : undefined,
                    }))
                  }
                />
                <span>Mostrar somente clientes com contato (telefone ou e-mail)</span>
              </label>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={clearAdminFilters}>
                Limpar filtros
              </Button>
              <Button type="button" onClick={applyAdminFilters}>
                Aplicar filtros
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Detalhes */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setEditingCredor(false)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCredor?.credor_nome}</DialogTitle>
            <DialogDescription>
              CPF/CNPJ:{" "}
              {selectedCredor?.credor_cpf_cnpj && !selectedCredor?.credor_cpf_cnpj.startsWith("SEM_CPF")
                ? selectedCredor.credor_cpf_cnpj
                : "Não informado"}
            </DialogDescription>

            <div className="flex items-center gap-2 pt-2">
              {!editingCredor ? (
                <Button variant="outline" size="sm" onClick={() => setEditingCredor(true)}>
                  Editar dados
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditingCredor(false)} disabled={savingCredor}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveCredor} disabled={savingCredor}>
                    {savingCredor ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription>Dados do cliente</CardDescription>
                <CardTitle className="text-lg">Informações gerais</CardTitle>
              </CardHeader>

              <CardContent className="p-4 pt-0">
                {editingCredor ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Nome</Label>
                      <Input
                        value={credorForm.credor_nome || ""}
                        onChange={(e) => setCredorForm({ ...credorForm, credor_nome: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>CPF/CNPJ</Label>
                      <Input
                        value={credorForm.credor_cpf_cnpj || ""}
                        onChange={(e) => setCredorForm({ ...credorForm, credor_cpf_cnpj: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={credorForm.telefone || ""}
                        onChange={(e) => setCredorForm({ ...credorForm, telefone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={credorForm.email || ""}
                        onChange={(e) => setCredorForm({ ...credorForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Cidade</Label>
                      <Input
                        value={credorForm.cidade || ""}
                        onChange={(e) => setCredorForm({ ...credorForm, cidade: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>UF</Label>
                      <Input value={credorForm.uf || ""} onChange={(e) => setCredorForm({ ...credorForm, uf: e.target.value })} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{selectedCredor?.credor_nome || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                      <p className="font-medium">
                        {selectedCredor?.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")
                          ? selectedCredor.credor_cpf_cnpj
                          : "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{selectedCredor?.telefone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedCredor?.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cidade</p>
                      <p className="font-medium">{selectedCredor?.cidade || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">UF</p>
                      <p className="font-medium">{selectedCredor?.uf || "—"}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardDescription>Total Processos</CardDescription>
                  <CardTitle className="text-2xl">{selectedCredor?.total_precatorios}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardDescription>Carteira Atualizada</CardDescription>
                  <CardTitle className="text-2xl text-emerald-600">
                    {(selectedCredor?.valor_total_atualizado || selectedCredor?.valor_total_principal)
                      ? `R$ ${(selectedCredor!.valor_total_atualizado || selectedCredor!.valor_total_principal).toLocaleString("pt-BR", {
                          notation: "compact",
                        })}`
                      : "R$ 0"}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardDescription>Último status</CardDescription>
                  <CardTitle className="text-lg">
                    <Badge variant="outline" className={statusClass(selectedCredor?.ultimo_status)}>
                      {formatStatus(selectedCredor?.ultimo_status)}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-2">
                    {selectedCredor?.ultimo_precatorio_data
                      ? new Date(selectedCredor.ultimo_precatorio_data).toLocaleDateString("pt-BR")
                      : "Sem movimentação"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" /> Histórico de Processos
              </h3>

              {loadingDetails ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {credorPrecatorios.map((precatorio, index) => (
                    <Card
                      key={precatorio.id}
                      className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500/40 group relative overflow-hidden"
                      onClick={() => {
                        setModalOpen(false)
                        router.push(`/precatorios/detalhes?id=${precatorio.id}`)
                      }}
                    >
                      <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors" />

                      <CardContent className="p-5 relative z-10 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="flex flex-col items-center justify-center min-w-[2.5rem]">
                              <span className="text-3xl font-black text-muted-foreground/20 group-hover:text-orange-500/40 transition-colors">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Processo
                                  </span>
                                  <Badge
                                    variant={precatorio.status === "concluido" ? "default" : "outline"}
                                    className="text-[10px] h-4 px-1 rounded-sm"
                                  >
                                    {(precatorio.status || "N/I").replace("_", " ")}
                                  </Badge>
                                </div>
                                <p className="font-medium text-sm font-mono truncate" title={precatorio.numero_processo || ""}>
                                  {precatorio.numero_processo || "N/A"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{precatorio.numero_precatorio || "Prec. N/A"}</p>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                  <Calculator className="w-3 h-3" /> Valor
                                </label>
                                <span className="font-bold text-lg text-emerald-600">
                                  {precatorio.valor_atualizado || precatorio.valor_principal
                                    ? `R$ ${(precatorio.valor_atualizado || precatorio.valor_principal).toLocaleString("pt-BR", {
                                        minimumFractionDigits: 2,
                                      })}`
                                    : "R$ 0,00"}
                                </span>
                              </div>

                              <div className="md:col-span-2 flex items-center justify-between pt-2 border-t border-border/50 mt-1">
                                <div className="text-xs text-muted-foreground">
                                  Criado em: {new Date(precatorio.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-xs font-medium text-orange-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Ver detalhes <ChevronRight className="w-3 h-3" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
