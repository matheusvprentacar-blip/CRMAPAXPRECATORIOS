"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Chip,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Skeleton,
  Spinner,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  Tooltip,
} from "@heroui/react"
import { Search, User, MapPin, Phone, Mail, FileText, ChevronRight, Clock, Filter, X, MoreVertical, RefreshCw, Users, Edit3 } from "@/components/icons"
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
      label: "Òšltima mov.",
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

const firstMeaningfulValue = (
  values: Array<string | null | undefined>,
  validate?: (value: string) => boolean
) => {
  for (const raw of values) {
    const value = (raw || "").trim()
    if (!value) continue
    if (validate && !validate(value)) continue
    return value
  }
  return undefined
}

const extractCredorDataFromPrecatorios = (items: Precatorio[]): Partial<CredorResumo> => ({
  credor_nome: firstMeaningfulValue(items.map((item) => item.credor_nome), (value) => !/^credor sem nome$/i.test(value)),
  credor_cpf_cnpj: firstMeaningfulValue(
    items.map((item) => item.credor_cpf_cnpj),
    (value) => !value.startsWith("SEM_CPF")
  ),
  telefone: firstMeaningfulValue(items.map((item) => item.credor_telefone)),
  email: firstMeaningfulValue(items.map((item) => item.credor_email)),
  cidade: firstMeaningfulValue(items.map((item) => item.credor_cidade)),
  uf: firstMeaningfulValue(items.map((item) => (item.credor_uf || "").toUpperCase())),
})

const CREDOR_IMPORT_FIELDS = ["credor_nome", "credor_cpf_cnpj", "telefone", "email", "cidade", "uf"] as const

const mergeCredorFormWithImportedData = (
  current: Partial<CredorResumo>,
  imported: Partial<CredorResumo>,
  overwrite: boolean
) => {
  const next: Partial<CredorResumo> = { ...current }
  let updatedCount = 0

  for (const field of CREDOR_IMPORT_FIELDS) {
    const importedValue = ((imported[field] as string | null | undefined) || "").trim()
    if (!importedValue) continue

    const currentValue = ((next[field] as string | null | undefined) || "").trim()
    if (!overwrite && currentValue) continue
    if (currentValue === importedValue) continue

    ;(next as Record<string, string | undefined>)[field] = importedValue
    updatedCount += 1
  }

  return { next, updatedCount }
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
  const [detailsTab, setDetailsTab] = useState("resumo")
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [adminFilters, setAdminFilters] = useState<ClientesAdminFilters>({})
  const [adminFiltersDraft, setAdminFiltersDraft] = useState<ClientesAdminFilters>({})

  const makeCredorForm = (credor: CredorResumo | null): Partial<CredorResumo> => ({
    credor_nome: credor?.credor_nome || "",
    credor_cpf_cnpj: credor?.credor_cpf_cnpj || "",
    telefone: credor?.telefone || "",
    email: credor?.email || "",
    cidade: credor?.cidade || "",
    uf: credor?.uf || "",
  })

  const startCredorEditing = () => {
    setEditingCredor(true)
    setDetailsTab("dados")
  }

  const cancelCredorEditing = () => {
    setEditingCredor(false)
    setCredorForm(makeCredorForm(selectedCredor))
  }

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
    setCredorForm(makeCredorForm(credor))
    setEditingCredor(false)
    setDetailsTab("resumo")
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

      const fetchedPrecatorios = (data || []) as Precatorio[]
      setCredorPrecatorios(fetchedPrecatorios)

      if (fetchedPrecatorios.length > 0) {
        const importedData = extractCredorDataFromPrecatorios(fetchedPrecatorios)
        setCredorForm((prev) => mergeCredorFormWithImportedData(prev, importedData, false).next)
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const importCredorDataFromPrecatorios = (overwrite = true) => {
    if (loadingDetails) {
      toast.info("Aguarde o carregamento dos processos para importar dados.")
      return
    }

    if (credorPrecatorios.length === 0) {
      toast.info("Nenhum precatorio vinculado para importar dados.")
      return
    }

    const importedData = extractCredorDataFromPrecatorios(credorPrecatorios)
    const { next, updatedCount } = mergeCredorFormWithImportedData(credorForm, importedData, overwrite)

    if (updatedCount === 0) {
      toast.info("Nao ha novos dados para importar.")
      return
    }

    setCredorForm(next)
    toast.success(`Dados importados com sucesso (${updatedCount} campo(s)).`)
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

      const relatedIds = credorPrecatorios.map((item) => item.id).filter(Boolean)
      let query = supabase.from("precatorios").update(payload)

      if (relatedIds.length > 0) {
        query = query.in("id", relatedIds)
      } else if (selectedCredor.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")) {
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
        return "bg-primary/15 text-primary border-primary/40 dark:bg-primary/15 dark:text-primary dark:border-primary/40"
      case "proposta_aceita":
        return "bg-primary/15 text-primary border-primary/40 dark:bg-primary/15 dark:text-primary dark:border-primary/40"
      case "calculo_andamento":
      case "em_calculo":
        return "bg-primary/15 text-primary border-primary/40 dark:bg-primary/15 dark:text-primary dark:border-primary/40"
      case "analise_processual_inicial":
        return "bg-primary/15 text-primary border-primary/40 dark:bg-primary/15 dark:text-primary dark:border-primary/40"
      default:
        return "bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground dark:border-border"
    }
  }

  const clientesComContato = useMemo(
    () => credores.filter((credor) => Boolean((credor.telefone || "").trim() || (credor.email || "").trim())).length,
    [credores]
  )

  const clientesSemContato = Math.max(credores.length - clientesComContato, 0)

  const clientesComStatus = useMemo(() => credores.filter((credor) => Boolean(credor.ultimo_status)).length, [credores])

  const carteiraMedia = credores.length > 0 ? resumo.totalCarteira / credores.length : 0

  const ultimaAtualizacaoLabel = resumo.ultimaAtualizacao
    ? new Date(resumo.ultimaAtualizacao).toLocaleDateString("pt-BR")
    : "Sem movimentacao recente"

  return (
    <div className="w-full max-w-[100vw] px-4 py-6 lg:px-6">
      <div className="space-y-6">
        <Card shadow="sm" className="border border-default-200/80 bg-content1/95">
          <CardBody className="gap-5 p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Clientes</h1>
                <p className="text-sm text-foreground/70">Gerencie clientes, contatos e historico de processos.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip variant="flat" color="primary" startContent={<Users className="h-4 w-4" />}>
                    {credores.length} clientes
                  </Chip>
                  <Chip variant="flat" color="default" startContent={<FileText className="h-4 w-4" />}>
                    {resumo.totalPrecatorios} precatorios
                  </Chip>
                  <Chip variant="flat" color="success" startContent={<Clock className="h-4 w-4" />}>
                    Atualizado em {ultimaAtualizacaoLabel}
                  </Chip>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Tooltip content="Limpar busca atual">
                  <Button
                    variant="flat"
                    color="default"
                    startContent={<X className="h-4 w-4" />}
                    isDisabled={!searchTerm}
                    onPress={() => setSearchTerm("")}
                  >
                    Limpar busca
                  </Button>
                </Tooltip>
                <Tooltip content="Recarregar lista de clientes">
                  <Button
                    color="primary"
                    variant="solid"
                    startContent={<RefreshCw className="h-4 w-4" />}
                    isLoading={loading}
                    onPress={() => loadCredores()}
                  >
                    Atualizar
                  </Button>
                </Tooltip>
                {isAdmin ? (
                  <Button
                    variant="bordered"
                    color="default"
                    startContent={<Filter className="h-4 w-4" />}
                    onPress={() => setAdvancedFiltersOpen(true)}
                  >
                    {totalAdminFilters > 0 ? `Filtros (${totalAdminFilters})` : "Filtros avancados"}
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <Card key={`kpi-skeleton-${idx}`} shadow="none" className="border border-default-200/70 bg-content2/60">
                    <CardBody className="space-y-3 p-4">
                      <Skeleton className="h-3 w-24 rounded-md" />
                      <Skeleton className="h-8 w-32 rounded-md" />
                      <Skeleton className="h-3 w-20 rounded-md" />
                    </CardBody>
                  </Card>
                ))
              ) : (
                <>
                  <Card shadow="none" className="border border-default-200/70 bg-content2/60">
                    <CardBody className="space-y-1 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Total de clientes</div>
                      <div className="text-3xl font-semibold tabular-nums text-foreground">{credores.length}</div>
                      <div className="text-xs text-foreground/60">Base consolidada</div>
                    </CardBody>
                  </Card>
                  <Card shadow="none" className="border border-default-200/70 bg-content2/60">
                    <CardBody className="space-y-1 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Carteira atualizada</div>
                      <div className="text-3xl font-semibold tabular-nums text-success">R$ {formatCurrency(resumo.totalCarteira)}</div>
                      <div className="text-xs text-foreground/60">Media de R$ {formatCurrency(carteiraMedia)} por cliente</div>
                    </CardBody>
                  </Card>
                  <Card shadow="none" className="border border-default-200/70 bg-content2/60">
                    <CardBody className="space-y-1 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Clientes com contato</div>
                      <div className="text-3xl font-semibold tabular-nums text-foreground">{clientesComContato}</div>
                      <div className="text-xs text-foreground/60">{clientesSemContato} sem telefone/e-mail</div>
                    </CardBody>
                  </Card>
                  <Card shadow="none" className="border border-default-200/70 bg-content2/60">
                    <CardBody className="space-y-1 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Clientes com status</div>
                      <div className="text-3xl font-semibold tabular-nums text-foreground">{clientesComStatus}</div>
                      <div className="text-xs text-foreground/60">{statusOptions.length} status distintos</div>
                    </CardBody>
                  </Card>
                </>
              )}
            </div>
          </CardBody>
        </Card>

        <Card shadow="sm" className="border border-default-200/80 bg-content1/95">
          <CardBody className="space-y-4 p-4 lg:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="w-full xl:max-w-2xl">
                <Input
                  aria-label="Buscar clientes"
                  placeholder="Buscar por nome, CPF/CNPJ, cidade, status, email ou telefone..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  isClearable
                  onClear={() => setSearchTerm("")}
                  startContent={<Search className="h-4 w-4 text-foreground/50" />}
                  classNames={{
                    inputWrapper: "border border-default-200/80 bg-content2/60 shadow-sm",
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Chip variant="flat" color="default">
                  {filteredCredores.length} exibidos
                </Chip>
                <Chip variant="flat" color="default">
                  {resumo.totalPrecatorios} processos
                </Chip>
                {isAdmin ? (
                  <Button
                    variant="bordered"
                    color="default"
                    startContent={<Filter className="h-4 w-4" />}
                    onPress={() => setAdvancedFiltersOpen(true)}
                  >
                    Filtros avancados
                  </Button>
                ) : null}
              </div>
            </div>

            {isAdmin && adminFilterChips.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Filtros ativos:</span>
                {adminFilterChips.map((chip) => (
                  <Chip
                    key={chip.key}
                    variant="flat"
                    color="primary"
                    className="max-w-full"
                    onClose={() => removeAdminFilter(chip.key)}
                  >
                    <span className="font-semibold">{chip.label}: </span>
                    {chip.value}
                  </Chip>
                ))}
                <Button size="sm" variant="light" color="default" onPress={clearAdminFilters}>
                  Limpar tudo
                </Button>
              </div>
            ) : null}

            <Divider />

            <div className="w-full overflow-x-auto [scrollbar-gutter:stable]">
              <Table
                aria-label="Tabela de clientes"
                removeWrapper
                isHeaderSticky
                onRowAction={(key) => {
                  const credor = filteredCredores.find((item) => item.id_unico === String(key))
                  if (credor) openCredorDetails(credor)
                }}
                classNames={{
                  table: "w-full min-w-[760px] lg:min-w-0 table-fixed",
                  th: "bg-default-100/70 text-foreground/70 text-xs uppercase tracking-wide",
                  td: "align-top py-3",
                }}
              >
                <TableHeader>
                  <TableColumn className="w-[34%]">Credor</TableColumn>
                  <TableColumn className="w-[14%]">Status</TableColumn>
                  <TableColumn className="hidden 2xl:table-cell w-[16%]">Contatos</TableColumn>
                  <TableColumn className="hidden xl:table-cell w-[12%]">Ultima movimentacao</TableColumn>
                  <TableColumn className="hidden lg:table-cell w-[10%] text-center">Qtd. processos</TableColumn>
                  <TableColumn className="w-[18%] text-right">Carteira atualizada</TableColumn>
                  <TableColumn className="w-[6%] text-right">Acoes</TableColumn>
                </TableHeader>
                <TableBody
                  isLoading={loading}
                  loadingContent={<Spinner color="primary" label="Carregando clientes..." />}
                  emptyContent={
                    <div className="py-8 text-center">
                      <p className="font-medium text-foreground">Nenhum cliente encontrado</p>
                      <p className="mt-1 text-xs text-foreground/60">Ajuste a busca ou remova filtros para visualizar resultados.</p>
                    </div>
                  }
                >
                  {filteredCredores.map((credor) => (
                    <TableRow key={credor.id_unico} className="cursor-pointer">
                      <TableCell>
                        <div className="max-w-full space-y-1">
                          <Tooltip content={credor.credor_nome}>
                            <p className="truncate text-sm font-semibold text-foreground">{credor.credor_nome}</p>
                          </Tooltip>
                          <p className="truncate text-xs text-foreground/60">
                            {credor.credor_cpf_cnpj && !credor.credor_cpf_cnpj.startsWith("SEM_CPF")
                              ? credor.credor_cpf_cnpj
                              : "CPF/CNPJ nao informado"}
                          </p>
                          {credor.cidade ? (
                            <p className="inline-flex max-w-full items-center gap-1 truncate text-xs text-foreground/60">
                              <MapPin className="h-3 w-3" />
                              {credor.cidade}/{credor.uf || "--"}
                            </p>
                          ) : null}
                          <div className="flex flex-col gap-0.5 xl:hidden">
                            {credor.ultimo_precatorio_data ? (
                              <p className="inline-flex items-center gap-1 text-xs text-foreground/60">
                                <Clock className="h-3 w-3" />
                                {new Date(credor.ultimo_precatorio_data).toLocaleDateString("pt-BR")}
                              </p>
                            ) : null}
                            {credor.telefone || credor.email ? (
                              <p className="truncate text-xs text-foreground/60">
                                {[credor.telefone, credor.email].filter(Boolean).join(" | ")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" className={`border ${statusClass(credor.ultimo_status)}`}>
                          {formatStatus(credor.ultimo_status)}
                        </Chip>
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell">
                        <div className="min-w-[210px] space-y-1">
                          {credor.telefone ? (
                            <p className="flex items-center gap-1 text-xs text-foreground/70">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{credor.telefone}</span>
                            </p>
                          ) : null}
                          {credor.email ? (
                            <p className="flex items-center gap-1 text-xs text-foreground/70">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{credor.email}</span>
                            </p>
                          ) : null}
                          {!credor.telefone && !credor.email ? <span className="text-xs text-foreground/60">Sem contato</span> : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {credor.ultimo_precatorio_data ? (
                          <p className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-foreground/70">
                            <Clock className="h-3 w-3" />
                            {new Date(credor.ultimo_precatorio_data).toLocaleDateString("pt-BR")}
                          </p>
                        ) : (
                          <span className="text-xs text-foreground/60">Sem movimentacao</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        <Chip size="sm" variant="flat" color="default" className="font-mono tabular-nums">
                          {credor.total_precatorios}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <p className="truncate font-semibold tabular-nums text-success">
                            {credor.valor_total_atualizado ? `R$ ${formatCurrency(credor.valor_total_atualizado)}` : "R$ 0,00"}
                          </p>
                          {credor.ultimo_precatorio_valor ? (
                            <p className="truncate text-[11px] text-foreground/60">Ultimo: R$ {formatCurrency(credor.ultimo_precatorio_valor)}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end"
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                              <Button isIconOnly size="sm" variant="light" aria-label={`Acoes de ${credor.credor_nome}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label={`Acoes para ${credor.credor_nome}`}>
                              <DropdownItem
                                key="detalhes"
                                startContent={<ChevronRight className="h-4 w-4" />}
                                onPress={() => openCredorDetails(credor)}
                              >
                                Ver detalhes
                              </DropdownItem>
                            </DropdownMenu>
                          </Dropdown>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardBody>
        </Card>
      </div>
      {isAdmin ? (
        <Modal
          isOpen={advancedFiltersOpen}
          onOpenChange={setAdvancedFiltersOpen}
          size="3xl"
          scrollBehavior="inside"
          backdrop="opaque"
          classNames={{
            wrapper: "z-[120]",
            backdrop: "bg-black/45",
            base: "border border-default-200/80 dark:border-border bg-background dark:bg-muted shadow-2xl",
          }}
        >
          <ModalContent className="bg-background dark:bg-muted">
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold tracking-tight">Filtros avancados de clientes</h2>
                <p className="text-sm text-foreground/70">Refine a lista por status, periodo, faixa de carteira e contato.</p>
              </ModalHeader>
              <ModalBody className="pb-1">
                <Accordion selectionMode="multiple" defaultExpandedKeys={["status", "periodo", "financeiro", "outros"]}>
                  <AccordionItem key="status" aria-label="Status e segmento" title="Status e segmento">
                    <div className="space-y-4 pb-1">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Status atual</p>
                        {statusOptions.length === 0 ? (
                          <p className="text-sm text-foreground/60">Sem status disponiveis.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {statusOptions.map((status) => (
                              <Checkbox
                                key={status}
                                isSelected={adminFiltersDraft.status?.includes(status) || false}
                                onValueChange={() => toggleDraftStatus(status)}
                                size="sm"
                              >
                                {formatStatus(status)}
                              </Checkbox>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="Cidade"
                          labelPlacement="outside"
                          placeholder="Ex.: Curitiba"
                          value={adminFiltersDraft.cidade || ""}
                          onValueChange={(value) =>
                            setAdminFiltersDraft((prev) => ({
                              ...prev,
                              cidade: value || undefined,
                            }))
                          }
                        />
                        <Input
                          label="UF"
                          labelPlacement="outside"
                          placeholder="Ex.: PR"
                          maxLength={2}
                          value={adminFiltersDraft.uf || ""}
                          onValueChange={(value) =>
                            setAdminFiltersDraft((prev) => ({
                              ...prev,
                              uf: value.toUpperCase() || undefined,
                            }))
                          }
                        />
                      </div>
                      {ufOptions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {ufOptions.map((uf) => {
                            const isSelected = adminFiltersDraft.uf === uf
                            return (
                              <Button
                                key={uf}
                                size="sm"
                                variant={isSelected ? "flat" : "bordered"}
                                color={isSelected ? "primary" : "default"}
                                onPress={() =>
                                  setAdminFiltersDraft((prev) => ({
                                    ...prev,
                                    uf: prev.uf === uf ? undefined : uf,
                                  }))
                                }
                              >
                                {uf}
                              </Button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </AccordionItem>

                  <AccordionItem key="periodo" aria-label="Periodo e datas" title="Periodo e datas">
                    <div className="grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2">
                      <Input
                        type="date"
                        label="Ultima movimentacao (de)"
                        labelPlacement="outside"
                        value={adminFiltersDraft.ultimaMovInicio || ""}
                        onChange={(event) =>
                          setAdminFiltersDraft((prev) => ({
                            ...prev,
                            ultimaMovInicio: event.target.value || undefined,
                          }))
                        }
                      />
                      <Input
                        type="date"
                        label="Ultima movimentacao (ate)"
                        labelPlacement="outside"
                        value={adminFiltersDraft.ultimaMovFim || ""}
                        onChange={(event) =>
                          setAdminFiltersDraft((prev) => ({
                            ...prev,
                            ultimaMovFim: event.target.value || undefined,
                          }))
                        }
                      />
                    </div>
                  </AccordionItem>

                  <AccordionItem key="financeiro" aria-label="Financeiro" title="Financeiro">
                    <div className="grid grid-cols-1 gap-3 pb-1 sm:grid-cols-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        label="Carteira minima"
                        labelPlacement="outside"
                        placeholder="0,00"
                        value={adminFiltersDraft.carteiraMin?.toString() ?? ""}
                        onValueChange={(value) => updateDraftNumberFilter("carteiraMin", value)}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        label="Carteira maxima"
                        labelPlacement="outside"
                        placeholder="9999999,99"
                        value={adminFiltersDraft.carteiraMax?.toString() ?? ""}
                        onValueChange={(value) => updateDraftNumberFilter("carteiraMax", value)}
                      />
                    </div>
                  </AccordionItem>

                  <AccordionItem key="outros" aria-label="Outros filtros" title="Outros">
                    <div className="space-y-3 pb-1">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          label="Qtd. minima de precatorios"
                          labelPlacement="outside"
                          placeholder="0"
                          value={adminFiltersDraft.qtdMin?.toString() ?? ""}
                          onValueChange={(value) => updateDraftNumberFilter("qtdMin", value)}
                        />
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          label="Qtd. maxima de precatorios"
                          labelPlacement="outside"
                          placeholder="999"
                          value={adminFiltersDraft.qtdMax?.toString() ?? ""}
                          onValueChange={(value) => updateDraftNumberFilter("qtdMax", value)}
                        />
                      </div>
                      <Checkbox
                        isSelected={adminFiltersDraft.apenasComContato || false}
                        onValueChange={(checked) =>
                          setAdminFiltersDraft((prev) => ({
                            ...prev,
                            apenasComContato: checked ? true : undefined,
                          }))
                        }
                      >
                        Mostrar somente clientes com telefone ou e-mail
                      </Checkbox>
                    </div>
                  </AccordionItem>
                </Accordion>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" color="default" onPress={clearAdminFilters}>
                  Limpar
                </Button>
                <Button color="primary" onPress={applyAdminFilters}>
                  Aplicar filtros
                </Button>
              </ModalFooter>
            </>
          </ModalContent>
        </Modal>
      ) : null}

      <Modal
        isOpen={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setEditingCredor(false)
            setDetailsTab("resumo")
            setCredorForm(makeCredorForm(selectedCredor))
          }
        }}
        size="5xl"
        scrollBehavior="inside"
        backdrop="opaque"
        classNames={{
          wrapper: "z-[120]",
          backdrop: "bg-black/45",
          base: "border border-default-200/80 dark:border-border bg-background dark:bg-muted shadow-2xl",
        }}
      >
        <ModalContent className="bg-background dark:bg-muted">
          <>
            <ModalHeader className="border-b border-default-200/70 pb-4">
              <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      {selectedCredor?.credor_nome || "Cliente"}
                    </h2>
                    <p className="text-sm text-foreground/70">
                      {selectedCredor?.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")
                        ? selectedCredor.credor_cpf_cnpj
                        : "CPF/CNPJ nao informado"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip size="sm" variant="flat" color="primary">
                        {selectedCredor?.total_precatorios || 0} processos
                      </Chip>
                      <Chip size="sm" variant="flat" className={`border ${statusClass(selectedCredor?.ultimo_status)}`}>
                        {formatStatus(selectedCredor?.ultimo_status)}
                      </Chip>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-start">
                  {!editingCredor ? (
                    <Button color="primary" variant="flat" startContent={<Edit3 className="h-4 w-4" />} onPress={startCredorEditing}>
                      Editar dados
                    </Button>
                  ) : (
                    <>
                      <Button variant="light" color="default" isDisabled={savingCredor} onPress={cancelCredorEditing}>
                        Cancelar
                      </Button>
                      <Button color="primary" isLoading={savingCredor} onPress={handleSaveCredor}>
                        {savingCredor ? "Salvando..." : "Salvar alteracoes"}
                      </Button>
                    </>
                  )}
                  <Dropdown placement="bottom-end">
                    <DropdownTrigger>
                      <Button isIconOnly variant="light" aria-label="Mais acoes">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Acoes do cliente">
                      <DropdownItem key="editar" onPress={editingCredor ? cancelCredorEditing : startCredorEditing}>
                        {editingCredor ? "Cancelar edicao" : "Editar dados"}
                      </DropdownItem>
                      <DropdownItem key="fechar" onPress={() => setModalOpen(false)}>
                        Fechar
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="py-4">
              <Tabs
                aria-label="Detalhes do cliente"
                variant="underlined"
                selectedKey={detailsTab}
                onSelectionChange={(key) => setDetailsTab(String(key))}
                classNames={{ panel: "px-0 pb-0" }}
              >
                <Tab key="resumo" title="Resumo">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Card shadow="none" className="border border-default-200/70">
                        <CardBody className="space-y-1 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Total processos</p>
                          <p className="text-2xl font-semibold tabular-nums">{selectedCredor?.total_precatorios || 0}</p>
                        </CardBody>
                      </Card>
                      <Card shadow="none" className="border border-default-200/70">
                        <CardBody className="space-y-1 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Carteira atualizada</p>
                          <p className="text-2xl font-semibold tabular-nums text-success">
                            {selectedCredor?.valor_total_atualizado || selectedCredor?.valor_total_principal
                              ? `R$ ${formatCurrency(selectedCredor.valor_total_atualizado || selectedCredor.valor_total_principal)}`
                              : "R$ 0,00"}
                          </p>
                        </CardBody>
                      </Card>
                      <Card shadow="none" className="border border-default-200/70">
                        <CardBody className="space-y-1 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Ultimo status</p>
                          <Chip size="sm" variant="flat" className={`w-fit border ${statusClass(selectedCredor?.ultimo_status)}`}>
                            {formatStatus(selectedCredor?.ultimo_status)}
                          </Chip>
                          <p className="text-xs text-foreground/60">
                            {selectedCredor?.ultimo_precatorio_data
                              ? new Date(selectedCredor.ultimo_precatorio_data).toLocaleDateString("pt-BR")
                              : "Sem movimentacao"}
                          </p>
                        </CardBody>
                      </Card>
                    </div>

                    <Card shadow="none" className="border border-default-200/70">
                      <CardHeader className="pb-2">
                        <h3 className="text-base font-semibold tracking-tight">Contato e localizacao</h3>
                      </CardHeader>
                      <CardBody className="grid grid-cols-1 gap-3 pt-0 text-sm md:grid-cols-2">
                        <div>
                          <p className="text-xs text-foreground/60">Telefone</p>
                          <p className="font-medium">{selectedCredor?.telefone || "Nao informado"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground/60">Email</p>
                          <p className="font-medium">{selectedCredor?.email || "Nao informado"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground/60">Cidade</p>
                          <p className="font-medium">{selectedCredor?.cidade || "Nao informada"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-foreground/60">UF</p>
                          <p className="font-medium">{selectedCredor?.uf || "Nao informada"}</p>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                </Tab>

                <Tab key="dados" title="Dados">
                  <div className="space-y-4">
                    {editingCredor && (
                      <Card shadow="none" className="border border-primary/20 bg-primary/5">
                        <CardBody className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">Modo de edicao ativo</p>
                            <p className="text-xs text-foreground/70">
                              Altere os campos abaixo ou importe os dados existentes dos precatorios vinculados.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="flat"
                            color="primary"
                            onPress={() => importCredorDataFromPrecatorios(true)}
                            isDisabled={loadingDetails || credorPrecatorios.length === 0}
                          >
                            Importar do precatorio
                          </Button>
                        </CardBody>
                      </Card>
                    )}

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Card shadow="none" className="border border-default-200/70">
                        <CardHeader className="pb-2">
                          <h3 className="text-base font-semibold tracking-tight">Dados cadastrais</h3>
                        </CardHeader>
                        <CardBody className="space-y-4 pt-0">
                          {editingCredor ? (
                            <>
                              <Input
                                label="Nome"
                                labelPlacement="outside"
                                value={credorForm.credor_nome || ""}
                                onValueChange={(value) => setCredorForm({ ...credorForm, credor_nome: value })}
                              />
                              <Input
                                label="CPF/CNPJ"
                                labelPlacement="outside"
                                value={credorForm.credor_cpf_cnpj || ""}
                                onValueChange={(value) => setCredorForm({ ...credorForm, credor_cpf_cnpj: value })}
                              />
                            </>
                          ) : (
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="text-xs text-foreground/60">Nome</p>
                                <p className="font-medium">{selectedCredor?.credor_nome || "-"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/60">CPF/CNPJ</p>
                                <p className="font-medium">
                                  {selectedCredor?.credor_cpf_cnpj && !selectedCredor.credor_cpf_cnpj.startsWith("SEM_CPF")
                                    ? selectedCredor.credor_cpf_cnpj
                                    : "Nao informado"}
                                </p>
                              </div>
                            </div>
                          )}
                        </CardBody>
                      </Card>

                      <Card shadow="none" className="border border-default-200/70">
                        <CardHeader className="pb-2">
                          <h3 className="text-base font-semibold tracking-tight">Contato e localizacao</h3>
                        </CardHeader>
                        <CardBody className="space-y-4 pt-0">
                          {editingCredor ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <Input
                                label="Telefone"
                                labelPlacement="outside"
                                value={credorForm.telefone || ""}
                                onValueChange={(value) => setCredorForm({ ...credorForm, telefone: value })}
                              />
                              <Input
                                label="Email"
                                labelPlacement="outside"
                                value={credorForm.email || ""}
                                onValueChange={(value) => setCredorForm({ ...credorForm, email: value })}
                              />
                              <Input
                                label="Cidade"
                                labelPlacement="outside"
                                value={credorForm.cidade || ""}
                                onValueChange={(value) => setCredorForm({ ...credorForm, cidade: value })}
                              />
                              <Input
                                label="UF"
                                labelPlacement="outside"
                                value={credorForm.uf || ""}
                                onValueChange={(value) => setCredorForm({ ...credorForm, uf: value })}
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                              <div>
                                <p className="text-xs text-foreground/60">Telefone</p>
                                <p className="font-medium">{selectedCredor?.telefone || "Nao informado"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/60">Email</p>
                                <p className="font-medium">{selectedCredor?.email || "Nao informado"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/60">Cidade</p>
                                <p className="font-medium">{selectedCredor?.cidade || "Nao informada"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-foreground/60">UF</p>
                                <p className="font-medium">{selectedCredor?.uf || "Nao informada"}</p>
                              </div>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </div>
                  </div>
                </Tab>
                <Tab key="processos" title="Processos">
                  <Card shadow="none" className="border border-default-200/70">
                    <CardHeader className="pb-2">
                      <h3 className="text-base font-semibold tracking-tight">Historico de processos vinculados</h3>
                    </CardHeader>
                    <CardBody className="pt-0">
                      <Table
                        aria-label="Tabela de processos do cliente"
                        removeWrapper
                        isHeaderSticky
                        onRowAction={(key) => {
                          setModalOpen(false)
                          router.push(`/precatorios/detalhes?id=${String(key)}`)
                        }}
                        classNames={{
                          table: "min-w-[900px]",
                          th: "bg-default-100/70 text-xs uppercase tracking-wide text-foreground/70",
                        }}
                      >
                        <TableHeader>
                          <TableColumn>Processo</TableColumn>
                          <TableColumn>Precatório</TableColumn>
                          <TableColumn>Status</TableColumn>
                          <TableColumn>Valor</TableColumn>
                          <TableColumn className="text-right">Criado em</TableColumn>
                        </TableHeader>
                        <TableBody
                          isLoading={loadingDetails}
                          loadingContent={<Spinner color="primary" label="Carregando processos..." />}
                          emptyContent="Nenhum processo encontrado para este cliente."
                        >
                          {credorPrecatorios.map((precatorio) => (
                            <TableRow key={precatorio.id} className="cursor-pointer">
                              <TableCell>
                                <div className="max-w-[280px] truncate font-mono text-sm">{precatorio.numero_processo || "N/A"}</div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[260px] truncate text-sm">{precatorio.numero_precatorio || "N/A"}</div>
                              </TableCell>
                              <TableCell>
                                <Chip size="sm" variant="flat" className={`border ${statusClass(precatorio.status || null)}`}>
                                  {(precatorio.status || "N/I").replaceAll("_", " ")}
                                </Chip>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold tabular-nums text-success">
                                  {precatorio.valor_atualizado || precatorio.valor_principal
                                    ? `R$ ${formatCurrency(precatorio.valor_atualizado || precatorio.valor_principal)}`
                                    : "R$ 0,00"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-xs text-foreground/70">
                                {new Date(precatorio.created_at).toLocaleDateString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardBody>
                  </Card>
                </Tab>

                <Tab key="historico" title="Historico">
                  <Card shadow="none" className="border border-default-200/70">
                    <CardHeader className="pb-2">
                      <h3 className="text-base font-semibold tracking-tight">Linha do tempo de atualizacoes</h3>
                    </CardHeader>
                    <CardBody className="space-y-3 pt-0">
                      {loadingDetails ? (
                        <div className="space-y-2">
                          <Skeleton className="h-14 w-full rounded-lg" />
                          <Skeleton className="h-14 w-full rounded-lg" />
                          <Skeleton className="h-14 w-full rounded-lg" />
                        </div>
                      ) : credorPrecatorios.length === 0 ? (
                        <p className="text-sm text-foreground/70">Sem movimentacoes registradas para este cliente.</p>
                      ) : (
                        credorPrecatorios.slice(0, 8).map((precatorio) => (
                          <div
                            key={`timeline-${precatorio.id}`}
                            className="rounded-lg border border-default-200/70 bg-content2/50 px-4 py-3"
                          >
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <p className="font-mono text-xs text-foreground/80">{precatorio.numero_processo || "Processo N/A"}</p>
                              <p className="text-xs text-foreground/60">
                                Atualizado em{" "}
                                {precatorio.updated_at
                                  ? new Date(precatorio.updated_at).toLocaleDateString("pt-BR")
                                  : new Date(precatorio.created_at).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-foreground/75">
                              Status: {(precatorio.status || "N/I").replaceAll("_", " ")}
                            </p>
                          </div>
                        ))
                      )}
                    </CardBody>
                  </Card>
                </Tab>
              </Tabs>
            </ModalBody>

            <ModalFooter className="border-t border-default-200/70">
              <Button
                variant="light"
                color="default"
                onPress={() => {
                  setModalOpen(false)
                  setEditingCredor(false)
                  setDetailsTab("resumo")
                }}
              >
                Fechar
              </Button>
              {editingCredor && (
                <>
                  <Button variant="light" color="default" isDisabled={savingCredor} onPress={cancelCredorEditing}>
                    Cancelar
                  </Button>
                  <Button color="primary" isLoading={savingCredor} onPress={handleSaveCredor}>
                    {savingCredor ? "Salvando..." : "Salvar alteracoes"}
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
    </div>
  )
}
